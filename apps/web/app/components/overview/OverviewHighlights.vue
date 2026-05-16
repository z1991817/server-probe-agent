<script setup lang="ts">
import type { ProjectListItemData, ProjectRuntimeState } from "@server-probe/shared";
import { computed } from "vue";

import { formatDateTime } from "~/utils/format";

interface Props {
  projects: ProjectListItemData[];
  refreshedAt: string | null;
}

const props = defineProps<Props>();

const visibleProjects = computed(() => props.projects.slice(0, 4));

const projectDigest = computed(() => {
  const list = visibleProjects.value;
  if (list.length === 0) {
    return "暂无纳管项目";
  }

  return list.map((item) => `${item.project.name} · ${projectStateLabel(item.status.state)}`).join(" / ");
});

function projectStateLabel(state: ProjectRuntimeState): string {
  switch (state) {
    case "running":
      return "运行中";
    case "stopped":
      return "已停止";
    case "error":
      return "异常";
    case "unknown":
      return "未知";
    default:
      return state;
  }
}

function formatProjectNote(item: ProjectListItemData): string {
  const reason = item.status.reasons[0];
  if (reason) {
    return reason;
  }

  return `状态检查于 ${formatDateTime(item.status.checkedAt)}`;
}
</script>

<template>
  <section class="overview-section">
    <div class="section-header">
      <div>
        <p class="section-kicker">Snapshot</p>
        <h2 class="section-title">最近项目状态</h2>
      </div>
      <span class="section-meta">更新于 {{ formatDateTime(props.refreshedAt) }}</span>
    </div>

    <div class="project-list">
      <article
        v-for="item in visibleProjects"
        :key="item.project.id"
        class="project-row"
      >
        <div class="project-main">
          <div class="project-name-row">
            <span class="project-dot" :class="item.status.state" aria-hidden="true" />
            <strong class="project-name">{{ item.project.name }}</strong>
            <span class="project-id">{{ item.project.id }}</span>
          </div>
          <p class="project-meta">
            {{ item.project.processManager }} · 端口 {{ item.project.port ?? "未配置" }}
          </p>
        </div>

        <div class="project-state-group">
          <span class="state-pill" :class="item.status.state">
            {{ projectStateLabel(item.status.state) }}
          </span>
          <p class="project-state-note">{{ formatProjectNote(item) }}</p>
        </div>
      </article>
    </div>

    <div class="digest-row">
      <span class="digest-label">摘要</span>
      <span class="digest-value">{{ projectDigest }}</span>
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

.project-list {
  display: grid;
  gap: 12px;
}

.project-row {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-muted);
  border-radius: var(--radius-md);
}

.project-main {
  min-width: 0;
}

.project-name-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.project-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.project-dot.running {
  background: var(--accent-green);
  box-shadow: 0 0 0 4px rgba(63, 185, 80, .12);
}

.project-dot.stopped {
  background: var(--text-muted);
}

.project-dot.error {
  background: var(--accent-red);
  box-shadow: 0 0 0 4px rgba(248, 81, 73, .12);
}

.project-dot.unknown {
  background: var(--accent-yellow);
  box-shadow: 0 0 0 4px rgba(210, 153, 34, .12);
}

.project-name {
  font-size: 14px;
}

.project-id,
.project-meta,
.project-state-note,
.digest-label,
.digest-value {
  color: var(--text-secondary);
  font-size: 12px;
}

.project-meta,
.project-state-note {
  margin: 6px 0 0;
}

.project-state-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 0;
}

.state-pill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
}

.state-pill.running {
  color: var(--accent-green);
  background: rgba(63, 185, 80, .12);
}

.state-pill.stopped {
  color: var(--text-secondary);
  background: rgba(139, 148, 158, .12);
}

.state-pill.error {
  color: var(--accent-red);
  background: rgba(248, 81, 73, .12);
}

.state-pill.unknown {
  color: var(--accent-yellow);
  background: rgba(210, 153, 34, .12);
}

.digest-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, .02);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
}

.digest-value {
  color: var(--text-primary);
  line-height: 1.5;
}

@media (max-width: 860px) {
  .project-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .project-state-group {
    align-items: flex-start;
  }
}
</style>
