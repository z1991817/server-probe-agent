<script setup lang="ts">
import type { SystemSummaryData } from "@server-probe/shared";
import { computed } from "vue";

import { clampPercent, formatBytes, formatLoad, formatPercent } from "~/utils/format";

interface Props {
  summary: SystemSummaryData | null;
  loading: boolean;
}

const props = defineProps<Props>();

const cpuPercent = computed<number | null>(() => props.summary?.metrics.cpuUsagePercent ?? null);
const memoryPercent = computed<number | null>(() => props.summary?.metrics.memoryUsagePercent ?? null);
const diskPercent = computed<number | null>(() => props.summary?.metrics.diskUsagePercent ?? null);
const loadOneMinute = computed<number | null>(() => props.summary?.metrics.loadAverage[0] ?? null);

const totalDiskBytes = computed<number | null>(() => {
  const disks = props.summary?.disks ?? [];
  if (disks.length === 0) {
    return null;
  }

  const total = disks.reduce((sum, disk) => sum + disk.totalBytes, 0);
  return total > 0 ? total : null;
});

const usedDiskBytes = computed<number | null>(() => {
  const disks = props.summary?.disks ?? [];
  if (disks.length === 0) {
    return null;
  }

  const used = disks.reduce((sum, disk) => sum + disk.usedBytes, 0);
  return used >= 0 ? used : null;
});

const availableDiskBytes = computed<number | null>(() => {
  if (totalDiskBytes.value === null || usedDiskBytes.value === null) {
    return null;
  }
  return Math.max(totalDiskBytes.value - usedDiskBytes.value, 0);
});

const loadPercent = computed<number | null>(() => {
  if (loadOneMinute.value === null) {
    return null;
  }

  const coreCount = props.summary?.cpu?.coreCount ?? 0;
  if (coreCount <= 0) {
    return null;
  }

  return clampPercent((loadOneMinute.value / coreCount) * 100);
});

const loadFooter = computed<string>(() => {
  const loadAverage = props.summary?.metrics.loadAverage ?? [];
  if (loadAverage.length < 3) {
    return "最近 1/5/15 分钟";
  }

  return `1/5/15 分钟：${formatLoad(loadAverage[0] ?? null)} / ${formatLoad(loadAverage[1] ?? null)} / ${formatLoad(loadAverage[2] ?? null)}`;
});

const osLabel = computed<string>(() => {
  const os = props.summary?.os;
  return os ? `${os.platform} · ${os.arch}` : "等待采集";
});

const cpuInfoLabel = computed<string>(() => {
  const cpu = props.summary?.cpu;
  if (!cpu) {
    return "等待采集";
  }

  return cpu.speedMHz === null
    ? `${cpu.coreCount} 核心`
    : `${cpu.coreCount} 核心 · ${Math.round(cpu.speedMHz)} MHz`;
});

const memoryDetailLabel = computed<string>(() => {
  const memory = props.summary?.memory;
  if (!memory) {
    return "等待采集";
  }

  return `总计 ${formatBytes(memory.totalBytes)} · 空闲 ${formatBytes(memory.freeBytes)}`;
});

const diskDetailLabel = computed<string>(() => {
  if (totalDiskBytes.value === null || availableDiskBytes.value === null) {
    return "等待采集";
  }

  return `总计 ${formatBytes(totalDiskBytes.value)} · 可用 ${formatBytes(availableDiskBytes.value)}`;
});

function toProgressWidth(value: number | null): number {
  return clampPercent(value);
}
</script>

<template>
  <section class="overview-section">
    <div class="section-header">
      <div>
        <p class="section-kicker">System</p>
        <h2 class="section-title">服务器状态总览</h2>
      </div>
      <span class="section-meta">{{ props.loading ? "刷新中…" : "实时采样" }}</span>
    </div>

    <div class="overview-metric-grid">
      <article class="metric-card blue">
        <div class="metric-head">
          <span class="metric-label">CPU 使用率</span>
          <span class="metric-icon blue">CPU</span>
        </div>
        <p class="metric-value">{{ formatPercent(cpuPercent) }}</p>
        <div class="progress-bar">
          <span class="progress-fill blue" :style="{ width: `${toProgressWidth(cpuPercent)}%` }" />
        </div>
        <p class="metric-desc">{{ cpuInfoLabel }}</p>
      </article>

      <article class="metric-card green">
        <div class="metric-head">
          <span class="metric-label">内存使用</span>
          <span class="metric-icon green">MEM</span>
        </div>
        <p class="metric-value">{{ formatBytes(props.summary?.memory?.usedBytes ?? null) }}</p>
        <div class="progress-bar">
          <span class="progress-fill green" :style="{ width: `${toProgressWidth(memoryPercent)}%` }" />
        </div>
        <p class="metric-desc">{{ memoryDetailLabel }}</p>
      </article>

      <article class="metric-card yellow">
        <div class="metric-head">
          <span class="metric-label">磁盘使用</span>
          <span class="metric-icon yellow">DISK</span>
        </div>
        <p class="metric-value">{{ formatBytes(usedDiskBytes) }}</p>
        <div class="progress-bar">
          <span class="progress-fill yellow" :style="{ width: `${toProgressWidth(diskPercent)}%` }" />
        </div>
        <p class="metric-desc">{{ diskDetailLabel }}</p>
      </article>

      <article class="metric-card purple">
        <div class="metric-head">
          <span class="metric-label">系统负载</span>
          <span class="metric-icon purple">LOAD</span>
        </div>
        <p class="metric-value">{{ formatLoad(loadOneMinute) }}</p>
        <div class="progress-bar">
          <span class="progress-fill purple" :style="{ width: `${toProgressWidth(loadPercent)}%` }" />
        </div>
        <p class="metric-desc">{{ loadFooter }} · {{ osLabel }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.overview-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-meta {
  color: var(--text-secondary);
  font-size: 12px;
}

.overview-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.metric-head {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 24px;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .04em;
  border-radius: 999px;
}

.metric-icon.blue {
  color: var(--accent-blue);
  background: rgba(88, 166, 255, .12);
}

.metric-icon.green {
  color: var(--accent-green);
  background: rgba(63, 185, 80, .12);
}

.metric-icon.yellow {
  color: var(--accent-yellow);
  background: rgba(210, 153, 34, .12);
}

.metric-icon.purple {
  color: var(--accent-purple);
  background: rgba(188, 140, 255, .12);
}

.progress-bar {
  width: 100%;
  height: 7px;
  margin-top: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, .06);
  border-radius: 999px;
}

.progress-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
}

.progress-fill.blue {
  background: linear-gradient(90deg, var(--accent-blue), #79c0ff);
}

.progress-fill.green {
  background: linear-gradient(90deg, var(--accent-green), #56d364);
}

.progress-fill.yellow {
  background: linear-gradient(90deg, var(--accent-yellow), #e3b341);
}

.progress-fill.purple {
  background: linear-gradient(90deg, var(--accent-purple), #d2a8ff);
}

.metric-desc {
  margin-top: 10px;
  line-height: 1.45;
}

@media (max-width: 1200px) {
  .overview-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .overview-metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
