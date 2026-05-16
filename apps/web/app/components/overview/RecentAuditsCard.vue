<script setup lang="ts">
import { formatDateTime } from "~/utils/format";

interface Props {
  refreshedAt: string | null;
}

const props = defineProps<Props>();

const auditPreview = [
  {
    id: "audit-preview-login",
    action: "登录成功",
    actor: "admin",
    status: "success",
    target: "auth.login"
  },
  {
    id: "audit-preview-restart",
    action: "项目重启",
    actor: "admin",
    status: "success",
    target: "project.restart"
  },
  {
    id: "audit-preview-stop",
    action: "项目停止",
    actor: "operator",
    status: "failure",
    target: "project.stop"
  }
] as const;
</script>

<template>
  <section class="overview-section panel">
    <div class="section-header">
      <div>
        <p class="section-kicker">Audit</p>
        <h2 class="section-title">最近操作记录入口</h2>
      </div>
      <NuxtLink class="audit-link" to="/audits">进入审计页</NuxtLink>
    </div>

    <p class="audit-note">
      F0.12 阶段先提供审计入口与占位摘要；完整审计列表与筛选在 `F0.15` 实现。
    </p>

    <ul class="audit-preview-list" aria-label="最近审计预览">
      <li v-for="item in auditPreview" :key="item.id" class="audit-preview-item">
        <span class="status-pill" :class="item.status">{{ item.status === "success" ? "成功" : "失败" }}</span>
        <span class="audit-action">{{ item.action }}</span>
        <span class="audit-target">{{ item.target }}</span>
        <span class="audit-actor">{{ item.actor }}</span>
      </li>
    </ul>

    <p class="audit-time">总览刷新时间：{{ formatDateTime(props.refreshedAt) }}</p>
  </section>
</template>

<style scoped>
.overview-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.audit-link {
  color: var(--accent-blue);
  font-size: 12px;
  font-weight: 600;
}

.audit-link:hover {
  color: #79c0ff;
}

.audit-note,
.audit-time {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.audit-preview-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.audit-preview-item {
  display: grid;
  grid-template-columns: auto minmax(80px, auto) minmax(120px, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 40px;
  padding: 8px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-muted);
  border-radius: var(--radius-sm);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
}

.status-pill.success {
  color: var(--accent-green);
  background: rgba(63, 185, 80, .12);
}

.status-pill.failure {
  color: var(--accent-red);
  background: rgba(248, 81, 73, .12);
}

.audit-action {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
}

.audit-target,
.audit-actor {
  color: var(--text-secondary);
  font-size: 12px;
}

@media (max-width: 860px) {
  .audit-preview-item {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 6px;
  }
}
</style>
