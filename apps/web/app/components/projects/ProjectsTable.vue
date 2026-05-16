<script setup lang="ts">
import type {
  ProjectListItemData,
  ProjectOperationAction,
  ProjectOperationResultData,
  ProjectRuntimeState
} from "@server-probe/shared";
import { formatDateTime } from "~/utils/format";

interface Props {
  projects: ProjectListItemData[];
  loading: boolean;
  actionLoadingMap: Record<string, ProjectOperationAction | null>;
  operationResultMap: Record<string, ProjectOperationResultData>;
  writeEnabled: boolean;
}

interface Emits {
  operate: [payload: { projectId: string; action: ProjectOperationAction }];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function triggerOperation(projectId: string, action: ProjectOperationAction): void {
  emit("operate", { projectId, action });
}

function getProjectStateLabel(state: ProjectRuntimeState): string {
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

function getOperationSummary(projectId: string): string {
  const result = props.operationResultMap[projectId];
  if (!result) {
    return "暂无操作";
  }

  const actionLabel = getActionLabel(result.action);
  const timeLabel = formatDateTime(result.finishedAt);

  if (result.status === "succeeded") {
    return `${actionLabel}成功 · ${timeLabel}`;
  }

  if (result.status === "timed_out") {
    return `${actionLabel}超时 · ${timeLabel}`;
  }

  return `${actionLabel}失败 · ${timeLabel}`;
}

function isOperating(projectId: string, action: ProjectOperationAction): boolean {
  return props.actionLoadingMap[projectId] === action;
}

function isActionDisabled(projectId: string): boolean {
  return !props.writeEnabled || props.loading || Boolean(props.actionLoadingMap[projectId]);
}

function getActionLabel(action: ProjectOperationAction): string {
  switch (action) {
    case "start":
      return "启动";
    case "stop":
      return "停止";
    case "restart":
      return "重启";
    default:
      return action;
  }
}
</script>

<template>
  <section class="panel table-panel">
    <div class="table-head">
      <div>
        <p class="section-kicker">Projects</p>
        <h2 class="section-title">项目列表</h2>
      </div>
      <span class="table-head-note">危险操作需要二次确认</span>
    </div>

    <div class="table-wrap" role="region" aria-label="项目表格">
      <table class="project-table">
        <thead>
          <tr>
            <th>项目</th>
            <th>状态</th>
            <th>端口</th>
            <th>进程管理器</th>
            <th>最近反馈</th>
            <th class="actions-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.projects.length === 0">
            <td class="empty-cell" colspan="6">
              {{ props.loading ? "加载项目中…" : "暂无匹配项目" }}
            </td>
          </tr>

          <tr v-for="item in props.projects" :key="item.project.id">
            <td>
              <div class="project-main">
                <span class="project-name">{{ item.project.name }}</span>
                <span class="project-id">{{ item.project.id }}</span>
              </div>
              <p class="project-path">{{ item.project.deployPath }}</p>
            </td>

            <td>
              <span class="state-pill" :class="item.status.state">
                {{ getProjectStateLabel(item.status.state) }}
              </span>
            </td>

            <td>{{ item.project.port ?? "--" }}</td>
            <td>{{ item.project.processManager }}</td>
            <td class="op-summary">{{ getOperationSummary(item.project.id) }}</td>
            <td class="actions-col">
              <div class="action-row">
                <button
                  class="op-btn start"
                  :disabled="isActionDisabled(item.project.id)"
                  type="button"
                  @click="triggerOperation(item.project.id, 'start')"
                >
                  {{ isOperating(item.project.id, "start") ? "启动中…" : "启动" }}
                </button>
                <button
                  class="op-btn stop"
                  :disabled="isActionDisabled(item.project.id)"
                  type="button"
                  @click="triggerOperation(item.project.id, 'stop')"
                >
                  {{ isOperating(item.project.id, "stop") ? "停止中…" : "停止" }}
                </button>
                <button
                  class="op-btn restart"
                  :disabled="isActionDisabled(item.project.id)"
                  type="button"
                  @click="triggerOperation(item.project.id, 'restart')"
                >
                  {{ isOperating(item.project.id, "restart") ? "重启中…" : "重启" }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.table-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.table-head {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.table-head-note {
  color: var(--text-secondary);
  font-size: 12px;
}

.table-wrap {
  width: 100%;
  overflow: auto;
}

.project-table {
  width: 100%;
  min-width: 940px;
  border-collapse: collapse;
}

.project-table th,
.project-table td {
  padding: 12px;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--border-muted);
}

.project-table th {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .01em;
}

.project-table td {
  font-size: 13px;
}

.project-main {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.project-name {
  font-weight: 700;
}

.project-id {
  color: var(--text-secondary);
  font-size: 12px;
}

.project-path {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  word-break: break-all;
}

.state-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
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

.op-summary {
  color: var(--text-secondary);
  font-size: 12px;
}

.actions-col {
  min-width: 240px;
}

.action-row {
  display: flex;
  gap: 8px;
}

.op-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 10px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.op-btn.start {
  color: var(--accent-green);
  border-color: rgba(63, 185, 80, .4);
}

.op-btn.stop {
  color: var(--accent-yellow);
  border-color: rgba(210, 153, 34, .4);
}

.op-btn.restart {
  color: var(--accent-blue);
  border-color: rgba(88, 166, 255, .45);
}

.op-btn:disabled {
  cursor: not-allowed;
  opacity: .58;
}

.empty-cell {
  color: var(--text-secondary);
  text-align: center;
}
</style>
