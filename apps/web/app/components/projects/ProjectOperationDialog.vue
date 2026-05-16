<script setup lang="ts">
import type { ProjectOperationAction } from "@server-probe/shared";

interface PendingOperationProject {
  id: string;
  name: string;
}

interface PendingOperation {
  project: PendingOperationProject;
  action: ProjectOperationAction;
}

interface Props {
  operation: PendingOperation | null;
  submitting: boolean;
}

interface Emits {
  cancel: [];
  confirm: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const actionCopy: Record<ProjectOperationAction, { title: string; desc: string; confirm: string }> = {
  start: {
    title: "确认启动项目",
    desc: "将按项目纳管配置执行启动命令。",
    confirm: "确认启动"
  },
  stop: {
    title: "确认停止项目",
    desc: "将按项目纳管配置执行停止命令，服务会中断。",
    confirm: "确认停止"
  },
  restart: {
    title: "确认重启项目",
    desc: "将按项目纳管配置执行重启命令，服务将短暂中断。",
    confirm: "确认重启"
  }
};

function handleCancel(): void {
  if (props.submitting) {
    return;
  }
  emit("cancel");
}

function handleConfirm(): void {
  if (props.submitting) {
    return;
  }
  emit("confirm");
}
</script>

<template>
  <div v-if="props.operation" class="dialog-backdrop" role="presentation">
    <section
      class="dialog"
      aria-labelledby="project-operation-title"
      aria-modal="true"
      role="dialog"
    >
      <header class="dialog-head">
        <h3 id="project-operation-title" class="dialog-title">
          {{ actionCopy[props.operation.action].title }}
        </h3>
        <p class="dialog-subtitle">
          {{ actionCopy[props.operation.action].desc }}
        </p>
      </header>

      <div class="dialog-body">
        <p class="dialog-line">
          目标项目：
          <strong>{{ props.operation.project.name }}</strong>
          <span class="dialog-id">({{ props.operation.project.id }})</span>
        </p>
      </div>

      <footer class="dialog-actions">
        <button class="dialog-btn ghost" :disabled="props.submitting" type="button" @click="handleCancel">
          取消
        </button>
        <button class="dialog-btn danger" :disabled="props.submitting" type="button" @click="handleConfirm">
          {{ props.submitting ? "执行中…" : actionCopy[props.operation.action].confirm }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: grid;
  padding: 16px;
  background: rgba(13, 17, 23, .7);
  backdrop-filter: blur(2px);
  place-items: center;
}

.dialog {
  width: min(100%, 440px);
  padding: 18px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.dialog-head {
  display: grid;
  gap: 6px;
}

.dialog-title,
.dialog-subtitle,
.dialog-line {
  margin: 0;
}

.dialog-title {
  font-size: 18px;
  font-weight: 700;
}

.dialog-subtitle {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.dialog-body {
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-muted);
  border-radius: var(--radius-sm);
}

.dialog-line {
  font-size: 13px;
}

.dialog-id {
  color: var(--text-secondary);
  font-size: 12px;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.dialog-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.dialog-btn.ghost {
  color: var(--text-secondary);
}

.dialog-btn.danger {
  color: var(--accent-red);
  border-color: rgba(248, 81, 73, .45);
  background: rgba(248, 81, 73, .08);
}

.dialog-btn:disabled {
  cursor: not-allowed;
  opacity: .6;
}

@media (max-width: 520px) {
  .dialog-actions {
    flex-direction: column;
  }

  .dialog-btn {
    width: 100%;
  }
}
</style>
