<script setup lang="ts">
import type { OverviewProjectSummary } from "~/composables/useOverviewDashboard";

interface Props {
  summary: OverviewProjectSummary;
  loading: boolean;
}

const props = defineProps<Props>();
</script>

<template>
  <section class="overview-section">
    <div class="section-header">
      <div>
        <p class="section-kicker">Projects</p>
        <h2 class="section-title">项目健康摘要</h2>
      </div>
      <span class="section-meta">{{ props.loading ? "刷新中…" : "配置已同步" }}</span>
    </div>

    <div class="project-summary-grid">
      <article class="summary-card blue">
        <p class="summary-label">项目总数</p>
        <p class="summary-value">{{ props.summary.total }}</p>
        <p class="summary-desc">纳管配置中的项目数量</p>
      </article>

      <article class="summary-card green">
        <p class="summary-label">运行中</p>
        <p class="summary-value">{{ props.summary.running }}</p>
        <p class="summary-desc">端口与进程状态正常</p>
      </article>

      <article class="summary-card yellow">
        <p class="summary-label">异常 / 停止</p>
        <p class="summary-value">{{ props.summary.error + props.summary.stopped }}</p>
        <p class="summary-desc">需要进一步检查</p>
      </article>

      <article class="summary-card purple">
        <p class="summary-label">配置状态</p>
        <p class="summary-value">{{ props.summary.writeEnabled ? "可写" : "只读" }}</p>
        <p class="summary-desc">
          {{ props.summary.configLoaded ? "配置已加载" : "配置未就绪" }} ·
          {{ props.summary.issuesCount }} 个问题
        </p>
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

.project-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  position: relative;
  min-height: 132px;
  padding: 18px;
  overflow: hidden;
  background: var(--bg-elevated);
  border: 1px solid var(--border-muted);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.summary-card::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  content: "";
}

.summary-card.blue::before {
  background: linear-gradient(90deg, var(--accent-blue), #79c0ff);
}

.summary-card.green::before {
  background: linear-gradient(90deg, var(--accent-green), #56d364);
}

.summary-card.yellow::before {
  background: linear-gradient(90deg, var(--accent-yellow), #e3b341);
}

.summary-card.purple::before {
  background: linear-gradient(90deg, var(--accent-purple), #d2a8ff);
}

.summary-label,
.summary-value,
.summary-desc {
  margin: 0;
}

.summary-label {
  color: var(--text-secondary);
  font-size: 12px;
}

.summary-value {
  margin-top: 12px;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.05;
}

.summary-desc {
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.45;
}

@media (max-width: 1200px) {
  .project-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .project-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
