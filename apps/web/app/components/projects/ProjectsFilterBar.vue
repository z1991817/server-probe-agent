<script setup lang="ts">
import type { ProjectsStateFilter } from "~/composables/useProjectsPage";

interface Props {
  keyword: string;
  stateFilter: ProjectsStateFilter;
  loading: boolean;
  totalCount: number;
}

interface Emits {
  "update:keyword": [value: string];
  "update:state-filter": [value: ProjectsStateFilter];
  reload: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const stateOptions: Array<{ label: string; value: ProjectsStateFilter }> = [
  { label: "全部状态", value: "all" },
  { label: "运行中", value: "running" },
  { label: "已停止", value: "stopped" },
  { label: "异常", value: "error" },
  { label: "未知", value: "unknown" }
];

function handleKeywordInput(event: Event): void {
  const target = event.target as HTMLInputElement | null;
  emit("update:keyword", target?.value ?? "");
}

function handleStateChange(event: Event): void {
  const target = event.target as HTMLSelectElement | null;
  const selected = target?.value as ProjectsStateFilter | undefined;
  emit("update:state-filter", selected ?? "all");
}

function handleReload(): void {
  emit("reload");
}
</script>

<template>
  <section class="panel filter-panel" aria-label="项目筛选">
    <div class="filter-left">
      <label class="filter-field">
        <span class="filter-label">关键词</span>
        <input
          :value="props.keyword"
          class="filter-input"
          placeholder="项目名 / ID / 端口 / 路径"
          type="text"
          @input="handleKeywordInput"
        >
      </label>

      <label class="filter-field">
        <span class="filter-label">状态</span>
        <select :value="props.stateFilter" class="filter-select" @change="handleStateChange">
          <option
            v-for="option in stateOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <div class="filter-right">
      <p class="filter-summary">当前展示 {{ props.totalCount }} 个项目</p>
      <button class="filter-reload-btn" :disabled="props.loading" type="button" @click="handleReload">
        {{ props.loading ? "刷新中…" : "刷新" }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.filter-panel {
  display: flex;
  gap: 14px;
  align-items: flex-end;
  justify-content: space-between;
}

.filter-left {
  display: flex;
  flex: 1;
  gap: 12px;
  align-items: flex-end;
}

.filter-field {
  display: grid;
  gap: 6px;
  width: min(320px, 100%);
}

.filter-label {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.filter-input,
.filter-select {
  width: 100%;
  min-height: 36px;
  padding: 0 10px;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
}

.filter-input:focus,
.filter-select:focus {
  border-color: rgba(88, 166, 255, .8);
  box-shadow: 0 0 0 3px rgba(88, 166, 255, .12);
}

.filter-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.filter-summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.filter-reload-btn {
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
}

.filter-reload-btn:disabled {
  cursor: not-allowed;
  opacity: .65;
}

@media (max-width: 920px) {
  .filter-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-left {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-field {
    width: 100%;
  }

  .filter-right {
    justify-content: space-between;
  }
}
</style>
