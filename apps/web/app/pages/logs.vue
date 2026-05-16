<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";

import { useLogViewer } from "~/composables/useLogViewer";
import { formatDateTime } from "~/utils/format";

useHead({
  title: "日志 - 服务器探针"
});

const {
  projects,
  loadingProjects,
  selectedProjectId,
  searchForm,
  searching,
  searchError,
  searchEntries,
  searchFiles,
  searchWarnings,
  streamEntries,
  streamErrors,
  streamPaused,
  streamState,
  streamErrorMessage,
  initialize,
  searchHistory,
  changeProject,
  togglePauseStream,
  clearStreamEntries,
  cleanup
} = useLogViewer();

const streamContainerRef = useTemplateRef<HTMLElement>("streamContainer");

const highlightedEntries = computed(() => {
  const keyword = searchForm.value.keyword.trim().toLowerCase();
  return searchEntries.value.map((entry) => ({
    ...entry,
    highlightedMessage: keyword.length === 0
      ? escapeHtml(entry.message)
      : highlightKeyword(entry.message, keyword)
  }));
});

const streamStatusText = computed(() => {
  if (streamState.value.connected) {
    return "实时流已连接";
  }
  if (streamState.value.reconnecting) {
    return "实时流重连中";
  }
  return "实时流未连接";
});

watch(
  () => streamEntries.value.length,
  async () => {
    if (streamPaused.value) {
      return;
    }

    await nextTick();
    streamContainerRef.value?.scrollTo({ top: 0, behavior: "smooth" });
  }
);

onMounted(async () => {
  await initialize();
});

onBeforeUnmount(() => {
  cleanup();
});

async function handleProjectChange(event: Event): Promise<void> {
  const target = event.target as HTMLSelectElement | null;
  const nextProjectId = target?.value ?? "";
  if (!nextProjectId) {
    return;
  }
  await changeProject(nextProjectId);
}

async function handleSearch(): Promise<void> {
  await searchHistory();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightKeyword(message: string, keyword: string): string {
  const safeMessage = escapeHtml(message);
  if (keyword.length === 0) {
    return safeMessage;
  }

  const escapedKeyword = escapeRegExp(keyword);
  const pattern = new RegExp(`(${escapedKeyword})`, "ig");

  return safeMessage.replace(pattern, "<mark class=\"kw-hit\">$1</mark>");
}
</script>

<template>
  <section class="logs-page">
    <header class="panel page-head">
      <div>
        <p class="section-kicker">Logs</p>
        <h1 class="section-title">日志中心</h1>
      </div>
      <div class="head-right">
        <span class="status-pill" :class="streamState.connected ? 'ok' : (streamState.reconnecting ? 'degraded' : 'down')">
          <span class="status-dot" aria-hidden="true" />
          {{ streamStatusText }}
        </span>
        <button class="ghost-btn" type="button" :disabled="loadingProjects || searching" @click="handleSearch">
          {{ searching ? "查询中…" : "刷新历史日志" }}
        </button>
      </div>
    </header>

    <section class="panel filters-panel">
      <div class="filters-grid">
        <label class="field">
          <span class="field-label">项目</span>
          <select
            :value="selectedProjectId"
            class="field-input"
            :disabled="loadingProjects"
            @change="handleProjectChange"
          >
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }} ({{ project.id }})
            </option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">关键词</span>
          <input
            v-model="searchForm.keyword"
            class="field-input"
            placeholder="error / timeout / keyword"
            type="text"
          >
        </label>

        <label class="field">
          <span class="field-label">开始时间</span>
          <input
            v-model="searchForm.from"
            class="field-input"
            type="datetime-local"
          >
        </label>

        <label class="field">
          <span class="field-label">结束时间</span>
          <input
            v-model="searchForm.to"
            class="field-input"
            type="datetime-local"
          >
        </label>

        <label class="field field-limit">
          <span class="field-label">Limit</span>
          <input
            v-model.number="searchForm.limit"
            class="field-input"
            max="1000"
            min="1"
            type="number"
          >
        </label>
      </div>

      <div class="filters-actions">
        <button class="primary-btn" type="button" :disabled="searching" @click="handleSearch">
          {{ searching ? "查询中…" : "查询历史日志" }}
        </button>
      </div>
    </section>

    <section v-if="searchError" class="panel alert-panel" role="alert">
      <p class="alert-title">日志查询失败</p>
      <p class="alert-desc">{{ searchError }}</p>
    </section>

    <section v-if="searchWarnings.length > 0" class="panel warning-panel">
      <p class="alert-title">查询提示</p>
      <ul class="warning-list">
        <li v-for="warning in searchWarnings" :key="warning">{{ warning }}</li>
      </ul>
    </section>

    <div class="logs-grid">
      <section class="panel history-panel">
        <div class="section-header">
          <div>
            <p class="section-kicker">History</p>
            <h2 class="section-title history-title">历史日志</h2>
          </div>
          <span class="badge">共 {{ highlightedEntries.length }} 条</span>
        </div>

        <div class="history-list">
          <article
            v-for="entry in highlightedEntries"
            :key="`${entry.filePath}-${entry.lineNumber ?? 'x'}-${entry.timestamp ?? 't'}-${entry.message.slice(0, 24)}`"
            class="log-item"
          >
            <header class="log-item-head">
              <span class="log-time">{{ formatDateTime(entry.timestamp) }}</span>
              <span class="log-file">{{ entry.filePath }}</span>
              <span class="log-line">#{{ entry.lineNumber ?? "--" }}</span>
            </header>
            <p class="log-message" v-html="entry.highlightedMessage" />
          </article>

          <p v-if="highlightedEntries.length === 0" class="empty-tip">当前条件下没有历史日志</p>
        </div>

        <details class="files-summary">
          <summary>文件读取摘要（{{ searchFiles.length }}）</summary>
          <ul>
            <li v-for="file in searchFiles" :key="file.filePath">
              {{ file.filePath }} · scanned {{ file.scannedLines }} · matched {{ file.matchedLines }} · returned {{ file.returnedLines }} ·
              {{ file.error ? `error: ${file.error}` : "ok" }}
            </li>
          </ul>
        </details>
      </section>

      <section class="panel stream-panel">
        <div class="section-header">
          <div>
            <p class="section-kicker">Realtime</p>
            <h2 class="section-title history-title">实时日志</h2>
          </div>
          <div class="stream-actions">
            <button class="ghost-btn" type="button" @click="togglePauseStream">
              {{ streamPaused ? "继续滚动" : "暂停滚动" }}
            </button>
            <button class="ghost-btn" type="button" @click="clearStreamEntries">
              清空
            </button>
          </div>
        </div>

        <p v-if="streamErrorMessage" class="stream-tip">{{ streamErrorMessage }}</p>

        <div ref="streamContainer" class="stream-list">
          <article
            v-for="entry in streamEntries"
            :key="entry.id"
            class="log-item stream-item"
          >
            <header class="log-item-head">
              <span class="log-time">{{ formatDateTime(entry.timestamp) }}</span>
              <span class="log-file">{{ entry.filePath }}</span>
              <span class="log-line">{{ entry.truncated ? "truncated" : "line" }}</span>
            </header>
            <p class="log-message">{{ entry.message }}</p>
          </article>

          <p v-if="streamEntries.length === 0" class="empty-tip">暂无实时日志，等待新日志写入…</p>
        </div>

        <details v-if="streamErrors.length > 0" class="files-summary">
          <summary>SSE 错误事件（{{ streamErrors.length }}）</summary>
          <ul>
            <li v-for="item in streamErrors" :key="item.id">
              {{ item.code }} · {{ item.filePath ?? "project" }} · {{ item.message }} · {{ formatDateTime(item.emittedAt) }}
            </li>
          </ul>
        </details>
      </section>
    </div>
  </section>
</template>

<style scoped>
.logs-page {
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

.status-pill.ok {
  color: var(--accent-green);
}

.status-pill.degraded {
  color: var(--accent-yellow);
  background: rgba(210, 153, 34, .1);
  border-color: rgba(210, 153, 34, .3);
}

.status-pill.down {
  color: var(--accent-red);
  background: rgba(248, 81, 73, .1);
  border-color: rgba(248, 81, 73, .3);
}

.status-pill.degraded .status-dot {
  background: var(--accent-yellow);
}

.status-pill.down .status-dot {
  background: var(--accent-red);
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
  grid-template-columns: repeat(5, minmax(0, 1fr));
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

.field-limit {
  max-width: 140px;
}

.logs-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

.history-panel,
.stream-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-title {
  font-size: 18px;
}

.history-list,
.stream-list {
  display: grid;
  gap: 10px;
  max-height: 540px;
  padding-right: 2px;
  overflow: auto;
}

.stream-list {
  align-content: start;
}

.log-item {
  padding: 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-muted);
  border-radius: var(--radius-sm);
}

.stream-item {
  background: rgba(28, 33, 40, .9);
}

.log-item-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.log-time,
.log-file,
.log-line {
  color: var(--text-secondary);
  font-size: 11px;
}

.log-file {
  max-width: 52%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-message {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.kw-hit) {
  padding: 1px 2px;
  color: #0d1117;
  background: #e3b341;
  border-radius: 3px;
}

.files-summary {
  color: var(--text-secondary);
  font-size: 12px;
}

.files-summary summary {
  cursor: pointer;
}

.files-summary ul {
  margin: 8px 0 0;
  padding-left: 16px;
}

.empty-tip,
.stream-tip,
.alert-desc,
.warning-list {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.warning-list {
  margin-top: 8px;
  padding-left: 16px;
}

.alert-title {
  margin: 0 0 8px;
  font-size: 14px;
}

.alert-panel,
.warning-panel {
  border-color: rgba(248, 81, 73, .4);
}

.warning-panel {
  border-color: rgba(210, 153, 34, .38);
}

.stream-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 1180px) {
  .filters-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field-limit {
    max-width: none;
  }
}

@media (max-width: 980px) {
  .logs-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .page-head,
  .filters-panel {
    flex-direction: column;
    align-items: flex-start;
  }

  .head-right {
    flex-wrap: wrap;
  }

  .filters-grid {
    width: 100%;
    grid-template-columns: 1fr;
  }
}
</style>
