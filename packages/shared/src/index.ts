export const WEB_PORT = 5100;
export const API_PORT = 5000;
export const DEFAULT_API_BASE = `http://localhost:${API_PORT}`;

export interface AppInfo {
  name: string;
  version: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
  traceId: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  traceId: string;
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

export type ServiceStatus = "ok" | "degraded" | "down";

export interface HealthCheckData {
  service: "server-probe-api";
  status: ServiceStatus;
  timestamp: string;
  uptimeSeconds: number;
}

export interface SystemSummaryData {
  status: ServiceStatus;
  collectedAt: string;
  metrics: {
    cpuUsagePercent: number | null;
    memoryUsagePercent: number | null;
    diskUsagePercent: number | null;
    loadAverage: number[];
    uptimeSeconds: number | null;
  };
  cpu: SystemCpuData | null;
  memory: SystemMemoryData | null;
  disks: DiskUsageData[];
  os: SystemOsData | null;
  errors: SystemProbeError[];
  notes: string[];
}

export interface SystemProbeError {
  source: string;
  message: string;
}

export interface SystemCpuData {
  collectedAt: string;
  usagePercent: number;
  coreCount: number;
  model: string;
  speedMHz: number | null;
  loadAverage: number[];
}

export interface SystemMemoryData {
  collectedAt: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
}

export interface DiskUsageData {
  filesystem: string;
  type: string | null;
  mount: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usagePercent: number;
}

export interface SystemDisksData {
  collectedAt: string;
  disks: DiskUsageData[];
  errors: SystemProbeError[];
}

export interface SystemOsData {
  collectedAt: string;
  platform: string;
  type: string;
  release: string;
  arch: string;
  hostname: string;
  uptimeSeconds: number;
  nodeVersion: string;
  cpuModel: string;
  cpuCount: number;
}

export type ProjectProcessManager =
  | "pm2"
  | "systemd"
  | "supervisor"
  | "docker"
  | "docker-compose"
  | "custom";

export type ProjectHealthCheck =
  | {
      type: "http";
      url: string;
    }
  | {
      type: "tcp";
      host: string;
      port: number;
    }
  | {
      type: "none";
    };

export interface ManagedProjectConfig {
  id: string;
  name: string;
  deployPath: string;
  port: number | null;
  processManager: ProjectProcessManager;
  startCommand: string | null;
  stopCommand: string | null;
  restartCommand: string | null;
  statusCommand: string | null;
  logFiles: string[];
  healthCheck: ProjectHealthCheck | null;
}

export interface ProjectConfigIssue {
  path: string;
  code: string;
  message: string;
}

export interface ProjectsConfigStatusData {
  loaded: boolean;
  writeEnabled: boolean;
  configPath: string;
  loadedAt: string;
  version: number | null;
  projectCount: number;
  projects: ManagedProjectConfig[];
  issues: ProjectConfigIssue[];
}

export type ProjectsConfigMeta = Omit<ProjectsConfigStatusData, "projects">;

export type ProjectRuntimeState = "running" | "stopped" | "error" | "unknown";

export type ProjectPortState = "listening" | "closed" | "unknown";

export interface ProjectPortStatusData {
  port: number;
  host: string;
  state: ProjectPortState;
  listening: boolean | null;
  checkedAt: string;
  latencyMs: number | null;
  error: string | null;
}

export interface ProjectProcessStatusData {
  pid: number;
  name: string | null;
  command: string | null;
  source: string;
}

export type ProjectHealthState =
  | "healthy"
  | "unhealthy"
  | "disabled"
  | "unknown";

export interface ProjectHealthStatusData {
  type: ProjectHealthCheck["type"] | "none";
  state: ProjectHealthState;
  checkedAt: string;
  latencyMs: number | null;
  httpStatus: number | null;
  message: string | null;
}

export interface ProjectStatusData {
  id: string;
  state: ProjectRuntimeState;
  checkedAt: string;
  portStatus: ProjectPortStatusData | null;
  processStatus: ProjectProcessStatusData | null;
  healthStatus: ProjectHealthStatusData | null;
  reasons: string[];
}

export interface ProjectListItemData {
  project: ManagedProjectConfig;
  status: ProjectStatusData;
}

export interface ProjectsListData {
  config: ProjectsConfigMeta;
  projects: ProjectListItemData[];
}

export interface ProjectDetailData {
  config: ProjectsConfigMeta;
  project: ManagedProjectConfig;
  status: ProjectStatusData;
}

export interface ProjectStatusResponseData {
  config: ProjectsConfigMeta;
  project: ManagedProjectConfig;
  status: ProjectStatusData;
}

export type ProjectOperationAction = "start" | "stop" | "restart";

export type ProjectOperationExecutionStatus =
  | "succeeded"
  | "failed"
  | "timed_out";

export interface ProjectOperationConfirmation {
  projectId: string;
  projectName: string;
}

export interface ProjectOperationRequestBody {
  confirmation: ProjectOperationConfirmation;
  reason?: string;
}

export interface ProjectOperationResultData {
  action: ProjectOperationAction;
  status: ProjectOperationExecutionStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
}

export interface ProjectOperationResponseData {
  config: ProjectsConfigMeta;
  project: ManagedProjectConfig;
  operation: ProjectOperationResultData;
}

export interface LogSearchQueryData {
  projectId: string | null;
  keyword: string | null;
  from: string | null;
  to: string | null;
  limit: number;
}

export interface LogEntryData {
  projectId: string;
  projectName: string;
  filePath: string;
  lineNumber: number | null;
  timestamp: string | null;
  message: string;
  truncated: boolean;
}

export interface LogFileReadSummary {
  projectId: string;
  projectName: string;
  filePath: string;
  exists: boolean;
  sizeBytes: number | null;
  readBytes: number;
  readFromByte: number;
  scannedLines: number;
  matchedLines: number;
  returnedLines: number;
  truncatedBySize: boolean;
  error: string | null;
}

export interface LogsSearchData {
  query: LogSearchQueryData;
  entries: LogEntryData[];
  files: LogFileReadSummary[];
  scannedLineCount: number;
  matchedLineCount: number;
  returnedCount: number;
  truncated: boolean;
  warnings: string[];
}

export type LogStreamEventType = "log" | "heartbeat" | "error";

export interface LogStreamLogEventData {
  projectId: string;
  projectName: string;
  filePath: string;
  timestamp: string | null;
  message: string;
  truncated: boolean;
  emittedAt: string;
}

export interface LogStreamHeartbeatEventData {
  projectId: string;
  projectName: string;
  emittedAt: string;
}

export interface LogStreamErrorEventData {
  projectId: string;
  projectName: string;
  filePath: string | null;
  code: string;
  message: string;
  emittedAt: string;
}

export type UserRole = "admin" | "operator" | "readonly";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface LoginRequestBody {
  username: string;
  password: string;
}

export interface LoginResponseData {
  user: AuthUser;
  expiresAt: string;
}

export interface CurrentUserResponseData {
  user: AuthUser | null;
}

export interface LogoutResponseData {
  loggedOut: true;
}

export interface AuditLogItemData {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  requestPayload: string | null;
  result: "success" | "failure";
  errorMessage: string | null;
  ip: string | null;
  userAgent: string | null;
  traceId: string | null;
  createdAt: string;
}

export interface AuditListQueryData {
  username: string | null;
  action: string | null;
  result: "success" | "failure" | null;
  targetId: string | null;
  from: string | null;
  to: string | null;
  page: number;
  pageSize: number;
}

export interface AuditListData {
  query: AuditListQueryData;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  items: AuditLogItemData[];
}
