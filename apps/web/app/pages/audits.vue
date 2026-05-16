<script setup lang="ts">
import { computed, onMounted } from "vue";

import { useAuditsPage } from "~/composables/useAuditsPage";
import { formatDateTime } from "~/utils/format";

useHead({
  title: "审计 - 服务器探针"
});

const {
  filters,
  page,
  pageSize,
  loading,
  errorMessage,
  total,
  pageCount,
  items,
  hasData,
  canPrev,
  canNext,
  querySnapshot,
  load,
  applyFilters,
  resetFilters,
  goPrev,
  goNext
} = useAuditsPage();

const showingFrom = computed(() => {
  if (total.value === 0) {
    return 0;
  }
  return (page.value - 1) * pageSize.value + 1;
});

const showingTo = computed(() => {
  if (total.value === 0) {
    return 0;
  }
  return Math.min(page.value * pageSize.value, total.value);
});

const activeFiltersText = computed(() => {
  const query = querySnapshot.value;
  if (!query) {
    return "尚未查询";
  }

  const parts: string[] = [];
  if (query.username) {
    parts.push(`用户：${query.username}`);
  }
  if (query.action) {
    parts.push(`动作：${query.action}`);
  }
  if (query.result) {
    parts.push(`结果：${query.result === "success" ? "成功" : "失败"}`);
  }
  if (query.targetId) {
    parts.push(`目标：${query.targetId}`);
  }
  if (query.from || query.to) {
    parts.push(`时间：${query.from ?? "--"} ~ ${query.to ?? "--"}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "全部记录";
});

onMounted(async () => {
  await load();
});

async function handleApplyFilters(): Promise<void> {
  await applyFilters();
}

async function handleResetFilters(): Promise<void> {
  await resetFilters();
}
</script>

<template>
  <section class="audits-page">
    <header class="panel page-head">
      <div>
        <p class="section-kicker">Audits</p>
        <h1 class="section-title">操作审计</h1>
      </div>
      <div class="head-right">
        <span class="badge">共 {{ total }} 条</span>
        <button class="ghost-btn" type="button" :disabled="loading" @click="load">
          {{ loading ? "刷新中…" : "刷新" }}
        </button>
      </div>
    </header>

    <section class="panel filters-panel">
      <div class="filters-grid">
        <label class="field">
          <span class="field-label">用户名</span>
          <input
            v-model="filters.username"
            class="field-input"
            placeholder="admin"
            type="text"
          >
        </label>

        <label class="field">
          <span class="field-label">动作</span>
          <input
            v-model="filters.action"
            class="field-input"
            placeholder="project.restart / auth.login"
            type="text"
          >
        </label>

        <label class="field">
          <span class="field-label">结果</span>
          <select v-model="filters.result" class="field-input">
            <option value="all">全部</option>
            <option value="success">成功</option>
            <option value="failure">失败</option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">目标 ID</span>
          <input
            v-model="filters.targetId"
            class="field-input"
            placeholder="my-api"
            type="text"
          >
        </label>

        <label class="field">
          <span class="field-label">开始时间</span>
          <input
            v-model="filters.from"
            class="field-input"
            type="datetime-local"
          >
        </label>

        <label class="field">
          <span class="field-label">结束时间</span>
          <input
            v-model="filters.to"
            class="field-input"
            type="datetime-local"
          >
        </label>
      </div>

      <div class="filters-actions">
        <button class="primary-btn" type="button" :disabled="loading" @click="handleApplyFilters">
          {{ loading ? "查询中…" : "查询" }}
        </button>
        <button class="ghost-btn" type="button" :disabled="loading" @click="handleResetFilters">
          重置
        </button>
      </div>
    </section>

    <section v-if="errorMessage" class="panel alert-panel" role="alert">
      <p class="alert-title">审计列表加载失败</p>
      <p class="alert-desc">{{ errorMessage }}</p>
    </section>

    <section class="panel list-panel">
      <div class="section-header">
        <div>
          <p class="section-kicker">Records</p>
          <h2 class="section-title list-title">审计记录</h2>
        </div>
        <span class="badge">第 {{ page }} / {{ pageCount }} 页</span>
      </div>

      <p class="query-tip">当前筛选：{{ activeFiltersText }}</p>

      <div class="table-wrap">
        <table class="audit-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>用户</th>
              <th>动作</th>
              <th>目标</th>
              <th>结果</th>
              <th>错误</th>
              <th>IP</th>
              <th>TraceId</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td class="mono-cell">{{ formatDateTime(item.createdAt) }}</td>
              <td>{{ item.username ?? "--" }}</td>
              <td class="mono-cell">{{ item.action }}</td>
              <td>
                <span class="mono-cell">{{ item.targetType }}</span>
                <span v-if="item.targetId"> · {{ item.targetId }}</span>
              </td>
              <td>
                <span class="result-pill" :class="item.result === 'success' ? 'ok' : 'down'">
                  {{ item.result === "success" ? "成功" : "失败" }}
                </span>
              </td>
              <td :title="item.errorMessage ?? ''">{{ item.errorMessage ?? "--" }}</td>
              <td class="mono-cell">{{ item.ip ?? "--" }}</td>
              <td class="mono-cell">{{ item.traceId ?? "--" }}</td>
            </tr>
            <tr v-if="!hasData">
              <td class="empty-cell" colspan="8">暂无审计记录</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="pager">
        <p class="pager-info">
          显示 {{ showingFrom }}-{{ showingTo }} / {{ total }}
        </p>
        <div class="pager-actions">
          <button class="ghost-btn" type="button" :disabled="!canPrev" @click="goPrev">
            上一页
          </button>
          <button class="ghost-btn" type="button" :disabled="!canNext" @click="goNext">
            下一页
          </button>
        </div>
      </footer>
    </section>
  </section>
</template>

<style scoped>
.audits-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-head {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
}

.head-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ghost-btn,
.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.ghost-btn {
  color: var(--accent-blue);
  background: rgba(88, 166, 255, .1);
  border: 1px solid rgba(88, 166, 255, .32);
}

.primary-btn {
  color: var(--text-primary);
  background: rgba(88, 166, 255, .22);
  border: 1px solid rgba(88, 166, 255, .44);
}

.ghost-btn:disabled,
.primary-btn:disabled {
  cursor: not-allowed;
  opacity: .64;
}

.filters-panel {
  display: flex;
  gap: 14px;
  align-items: flex-end;
  justify-content: space-between;
}

.filters-grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.field {
  display: grid;
  gap: 6px;
}

.field-label {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.field-input {
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
}

.field-input:focus {
  border-color: rgba(88, 166, 255, .8);
  box-shadow: 0 0 0 3px rgba(88, 166, 255, .12);
}

.filters-actions {
  display: flex;
  gap: 8px;
}

.list-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-title {
  font-size: 18px;
}

.query-tip,
.alert-desc,
.pager-info {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.table-wrap {
  overflow: auto;
}

.audit-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.audit-table th,
.audit-table td {
  padding: 10px 8px;
  font-size: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-muted);
  vertical-align: top;
}

.audit-table th {
  color: var(--text-secondary);
  font-weight: 700;
}

.mono-cell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
}

.result-pill {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  font-size: 11px;
  border-radius: 99px;
  border: 1px solid transparent;
}

.result-pill.ok {
  color: var(--accent-green);
  background: rgba(63, 185, 80, .1);
  border-color: rgba(63, 185, 80, .32);
}

.result-pill.down {
  color: var(--accent-red);
  background: rgba(248, 81, 73, .1);
  border-color: rgba(248, 81, 73, .32);
}

.empty-cell {
  color: var(--text-secondary);
  text-align: center;
}

.pager {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.pager-actions {
  display: flex;
  gap: 8px;
}

.alert-panel {
  border-color: rgba(248, 81, 73, .4);
}

.alert-title {
  margin: 0 0 8px;
  font-size: 14px;
}

@media (max-width: 980px) {
  .filters-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 780px) {
  .page-head,
  .filters-panel,
  .pager {
    flex-direction: column;
    align-items: flex-start;
  }

  .head-right,
  .filters-actions,
  .pager-actions {
    flex-wrap: wrap;
  }

  .filters-grid {
    width: 100%;
    grid-template-columns: 1fr;
  }
}
</style>
