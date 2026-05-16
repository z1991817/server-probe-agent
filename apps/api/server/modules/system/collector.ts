import type {
  DiskUsageData,
  ServiceStatus,
  SystemCpuData,
  SystemDisksData,
  SystemMemoryData,
  SystemOsData,
  SystemProbeError,
  SystemSummaryData
} from "@server-probe/shared";
import { execFile } from "node:child_process";
import {
  arch,
  cpus,
  freemem,
  hostname,
  loadavg,
  platform,
  release,
  totalmem,
  type,
  uptime
} from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CPU_SAMPLE_MS = 120;
const DISK_COMMAND_TIMEOUT_MS = 1500;
const DISK_COMMAND_MAX_BUFFER = 128 * 1024;
const BYTES_PER_KIB = 1024;

interface CpuTimesSnapshot {
  idle: number;
  total: number;
}

interface SystemSnapshot {
  collectedAt: string;
  cpu: SystemCpuData | null;
  memory: SystemMemoryData | null;
  disks: SystemDisksData;
  os: SystemOsData | null;
  errors: SystemProbeError[];
}

interface WindowsDiskRow {
  DeviceID?: unknown;
  VolumeName?: unknown;
  Size?: unknown;
  FreeSpace?: unknown;
}

export async function collectSystemSummary(): Promise<SystemSummaryData> {
  const snapshot = await collectSystemSnapshot();
  const diskUsagePercent = getMaxDiskUsage(snapshot.disks.disks);
  const notes = createSummaryNotes(snapshot, diskUsagePercent);

  return {
    status: deriveStatus(snapshot.errors),
    collectedAt: snapshot.collectedAt,
    metrics: {
      cpuUsagePercent: snapshot.cpu?.usagePercent ?? null,
      memoryUsagePercent: snapshot.memory?.usagePercent ?? null,
      diskUsagePercent,
      loadAverage: snapshot.cpu?.loadAverage ?? [],
      uptimeSeconds: snapshot.os?.uptimeSeconds ?? null
    },
    cpu: snapshot.cpu,
    memory: snapshot.memory,
    disks: snapshot.disks.disks,
    os: snapshot.os,
    errors: snapshot.errors,
    notes
  };
}

export async function collectSystemSnapshot(): Promise<SystemSnapshot> {
  const collectedAt = new Date().toISOString();
  const [cpuResult, memoryResult, disks, osResult] = await Promise.all([
    captureProbe("cpu", collectCpuData),
    captureProbe("memory", async () => collectMemoryData()),
    collectDisksData(),
    captureProbe("os", async () => collectOsData())
  ]);
  const errors = [
    ...cpuResult.errors,
    ...memoryResult.errors,
    ...disks.errors,
    ...osResult.errors
  ];

  return {
    collectedAt,
    cpu: cpuResult.data,
    memory: memoryResult.data,
    disks,
    os: osResult.data,
    errors
  };
}

export async function collectCpuData(): Promise<SystemCpuData> {
  const before = readCpuTimes();
  await wait(CPU_SAMPLE_MS);
  const after = readCpuTimes();
  const totalDelta = after.total - before.total;
  const idleDelta = after.idle - before.idle;
  const usagePercent =
    totalDelta > 0 ? clampPercent((1 - idleDelta / totalDelta) * 100) : 0;
  const cpuList = cpus();
  const firstCpu = cpuList[0];

  return {
    collectedAt: new Date().toISOString(),
    usagePercent,
    coreCount: cpuList.length,
    model: firstCpu?.model ?? "unknown",
    speedMHz: firstCpu?.speed ?? null,
    loadAverage: loadavg().map((value) => round(value, 2))
  };
}

export function collectMemoryData(): SystemMemoryData {
  const totalBytes = totalmem();
  const freeBytes = freemem();
  const usedBytes = Math.max(0, totalBytes - freeBytes);

  return {
    collectedAt: new Date().toISOString(),
    totalBytes,
    usedBytes,
    freeBytes,
    usagePercent: totalBytes > 0 ? clampPercent((usedBytes / totalBytes) * 100) : 0
  };
}

export async function collectDisksData(): Promise<SystemDisksData> {
  try {
    const disks =
      platform() === "win32" ? await collectWindowsDisks() : await collectUnixDisks();

    return {
      collectedAt: new Date().toISOString(),
      disks,
      errors: disks.length === 0
        ? [
            {
              source: "disk",
              message: "未采集到本地磁盘分区"
            }
          ]
        : []
    };
  } catch (error) {
    return {
      collectedAt: new Date().toISOString(),
      disks: [],
      errors: [toProbeError("disk", error)]
    };
  }
}

export function collectOsData(): SystemOsData {
  const cpuList = cpus();

  return {
    collectedAt: new Date().toISOString(),
    platform: platform(),
    type: type(),
    release: release(),
    arch: arch(),
    hostname: hostname(),
    uptimeSeconds: Math.floor(uptime()),
    nodeVersion: process.version,
    cpuModel: cpuList[0]?.model ?? "unknown",
    cpuCount: cpuList.length
  };
}

async function collectWindowsDisks(): Promise<DiskUsageData[]> {
  const script = [
    "Get-CimInstance Win32_LogicalDisk -Filter \"DriveType=3\"",
    "Select-Object DeviceID,VolumeName,Size,FreeSpace",
    "ConvertTo-Json -Compress"
  ].join(" | ");
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script
    ],
    {
      encoding: "utf8",
      timeout: DISK_COMMAND_TIMEOUT_MS,
      maxBuffer: DISK_COMMAND_MAX_BUFFER,
      windowsHide: true
    }
  );
  const trimmedOutput = stdout.trim();

  if (!trimmedOutput) {
    return [];
  }

  const parsed = JSON.parse(trimmedOutput) as unknown;
  const rows = Array.isArray(parsed) ? parsed : [parsed];

  return rows.flatMap((row) => parseWindowsDiskRow(row));
}

async function collectUnixDisks(): Promise<DiskUsageData[]> {
  const args = platform() === "darwin" ? ["-kP"] : ["-kP", "-T"];
  const { stdout } = await execFileAsync("df", args, {
    encoding: "utf8",
    timeout: DISK_COMMAND_TIMEOUT_MS,
    maxBuffer: DISK_COMMAND_MAX_BUFFER,
    windowsHide: true
  });
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.slice(1).flatMap((line) => parseUnixDiskLine(line, args.includes("-T")));
}

function parseWindowsDiskRow(row: unknown): DiskUsageData[] {
  if (!isWindowsDiskRow(row)) {
    return [];
  }

  const mount = toOptionalString(row.DeviceID);
  const totalBytes = toFiniteNumber(row.Size);
  const availableBytes = toFiniteNumber(row.FreeSpace);

  if (!mount || totalBytes === null || availableBytes === null || totalBytes <= 0) {
    return [];
  }

  const volumeName = toOptionalString(row.VolumeName);
  const usedBytes = Math.max(0, totalBytes - availableBytes);

  return [
    {
      filesystem: volumeName ? `${mount} ${volumeName}` : mount,
      type: "fixed",
      mount,
      totalBytes,
      usedBytes,
      availableBytes,
      usagePercent: clampPercent((usedBytes / totalBytes) * 100)
    }
  ];
}

function parseUnixDiskLine(line: string, hasTypeColumn: boolean): DiskUsageData[] {
  const parts = line.split(/\s+/);
  const minimumLength = hasTypeColumn ? 7 : 6;

  if (parts.length < minimumLength) {
    return [];
  }

  const filesystem = parts[0];
  const diskType = hasTypeColumn ? parts[1] ?? null : null;
  const totalKib = toFiniteNumber(parts[hasTypeColumn ? 2 : 1]);
  const usedKib = toFiniteNumber(parts[hasTypeColumn ? 3 : 2]);
  const availableKib = toFiniteNumber(parts[hasTypeColumn ? 4 : 3]);
  const mount = parts.slice(hasTypeColumn ? 6 : 5).join(" ");

  if (
    !filesystem ||
    !mount ||
    totalKib === null ||
    usedKib === null ||
    availableKib === null ||
    totalKib <= 0
  ) {
    return [];
  }

  const totalBytes = totalKib * BYTES_PER_KIB;
  const usedBytes = usedKib * BYTES_PER_KIB;
  const availableBytes = availableKib * BYTES_PER_KIB;

  return [
    {
      filesystem,
      type: diskType,
      mount,
      totalBytes,
      usedBytes,
      availableBytes,
      usagePercent: clampPercent((usedBytes / totalBytes) * 100)
    }
  ];
}

async function captureProbe<TData>(
  source: string,
  collect: () => Promise<TData>
): Promise<{ data: TData | null; errors: SystemProbeError[] }> {
  try {
    return {
      data: await collect(),
      errors: []
    };
  } catch (error) {
    return {
      data: null,
      errors: [toProbeError(source, error)]
    };
  }
}

function readCpuTimes(): CpuTimesSnapshot {
  return cpus().reduce<CpuTimesSnapshot>(
    (snapshot, cpu) => {
      const total =
        cpu.times.user +
        cpu.times.nice +
        cpu.times.sys +
        cpu.times.irq +
        cpu.times.idle;

      return {
        idle: snapshot.idle + cpu.times.idle,
        total: snapshot.total + total
      };
    },
    { idle: 0, total: 0 }
  );
}

function createSummaryNotes(
  snapshot: SystemSnapshot,
  diskUsagePercent: number | null
): string[] {
  const notes = snapshot.errors.map(
    (error) => `${error.source}: ${error.message}`
  );

  if (snapshot.memory && snapshot.memory.usagePercent >= 90) {
    notes.push(`内存使用率较高：${snapshot.memory.usagePercent}%`);
  }

  if (diskUsagePercent !== null && diskUsagePercent >= 90) {
    notes.push(`磁盘使用率较高：${diskUsagePercent}%`);
  }

  return notes.length > 0 ? notes : ["系统状态采集正常"];
}

function deriveStatus(errors: SystemProbeError[]): ServiceStatus {
  return errors.length > 0 ? "degraded" : "ok";
}

function getMaxDiskUsage(disks: DiskUsageData[]): number | null {
  if (disks.length === 0) {
    return null;
  }

  return Math.max(...disks.map((disk) => disk.usagePercent));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, round(value, 2)));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function toFiniteNumber(value: unknown): number | null {
  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(numberValue) ? numberValue : null;
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function isWindowsDiskRow(value: unknown): value is WindowsDiskRow {
  return typeof value === "object" && value !== null;
}

function toProbeError(source: string, error: unknown): SystemProbeError {
  const message = error instanceof Error ? error.message : String(error);

  return {
    source,
    message: message.slice(0, 500)
  };
}
