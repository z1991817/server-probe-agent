<script setup lang="ts">
import { computed } from "vue";

import OverviewHighlights from "~/components/overview/OverviewHighlights.vue";
import ProjectSummaryCard from "~/components/overview/ProjectSummaryCard.vue";
import RecentAuditsCard from "~/components/overview/RecentAuditsCard.vue";
import SystemMetricsGrid from "~/components/overview/SystemMetricsGrid.vue";
import { useOverviewDashboard } from "~/composables/useOverviewDashboard";
import { formatDateTime } from "~/utils/format";

useHead({
  title: "总览 - 服务器探针"
});

const {
  loading,
  warnings,
  systemSummary,
  projectSummary,
  projectHighlights,
  refreshedAt,
  overviewStatus,
  hardErrorMessage,
  reload
} = useOverviewDashboard();

const statusText = computed(() => {
  switch (overviewStatus.value) {
    case "ok":
      return "系统运行正常";
    case "degraded":
      return "系统存在降级项";
    case "down":
      return "系统状态不可用";
    default:
      return "状态未知";
  }
});

const statusClass = computed(() => {
  switch (overviewStatus.value) {
    case "ok":
      return "status-pill ok";
    case "degraded":
      return "status-pill degraded";
    case "down":
      return "status-pill down";
    default:
      return "status-pill";
  }
});

const loadWarnings = computed(() => warnings.value.slice(0, 3));
</script>

<template>
  <section class="dashboard">
    <header class="dashboard-header panel">
      <div>
        <p class="section-kicker">Overview</p>
        <h1 class="section-title">服务器探针总览</h1>
        <p class="dashboard-meta">
          最近刷新：{{ formatDateTime(refreshedAt) }}
        </p>
      </div>

      <div class="dashboard-header-right">
        <span :class="statusClass">
          <span class="status-dot" aria-hidden="true" />
          {{ statusText }}
        </span>
        <button class="refresh-btn" :disabled="loading" type="button" @click="reload">
          {{ loading ? "刷新中…" : "刷新数据" }}
        </button>
      </div>
    </header>

    <section v-if="hardErrorMessage" class="panel alert-panel" role="alert">
      <p class="alert-title">总览数据加载失败</p>
      <p class="alert-desc">{{ hardErrorMessage }}</p>
    </section>

    <section
      v-else-if="loadWarnings.length > 0"
      class="panel warning-panel"
      aria-label="总览告警"
    >
      <p class="alert-title">部分数据加载异常</p>
      <ul class="warning-list">
        <li v-for="message in loadWarnings" :key="message">{{ message }}</li>
      </ul>
    </section>

    <SystemMetricsGrid :loading="loading" :summary="systemSummary" />
    <ProjectSummaryCard :loading="loading" :summary="projectSummary" />

    <div class="dashboard-columns">
      <OverviewHighlights :projects="projectHighlights" :refreshed-at="refreshedAt" />
      <RecentAuditsCard :refreshed-at="refreshedAt" />
    </div>
  </section>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.dashboard-meta {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.dashboard-header-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  color: var(--accent-blue);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(88, 166, 255, .1);
  border: 1px solid rgba(88, 166, 255, .34);
  border-radius: var(--radius-sm);
  transition: background 150ms ease-out, border-color 150ms ease-out, opacity 150ms ease-out;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(88, 166, 255, .16);
  border-color: rgba(121, 192, 255, .5);
}

.refresh-btn:disabled {
  cursor: not-allowed;
  opacity: .65;
}

.status-pill.degraded {
  color: var(--accent-yellow);
  background: rgba(210, 153, 34, .1);
  border-color: rgba(210, 153, 34, .3);
}

.status-pill.degraded .status-dot {
  background: var(--accent-yellow);
}

.status-pill.down {
  color: var(--accent-red);
  background: rgba(248, 81, 73, .1);
  border-color: rgba(248, 81, 73, .3);
}

.status-pill.down .status-dot {
  background: var(--accent-red);
}

.alert-panel,
.warning-panel {
  border-color: rgba(248, 81, 73, .4);
}

.warning-panel {
  border-color: rgba(210, 153, 34, .4);
}

.alert-title,
.alert-desc {
  margin: 0;
}

.alert-title {
  font-size: 14px;
  font-weight: 600;
}

.alert-desc,
.warning-list {
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.warning-list {
  margin-bottom: 0;
  padding-left: 18px;
}

.dashboard-columns {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 16px;
}

@media (max-width: 1180px) {
  .dashboard-columns {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-header-right {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 520px) {
  .dashboard-header-right {
    flex-direction: column;
    align-items: flex-start;
  }

  .refresh-btn {
    width: 100%;
  }
}
</style>
