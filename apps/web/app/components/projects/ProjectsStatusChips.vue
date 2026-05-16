<script setup lang="ts">
interface Props {
  total: number;
  running: number;
  stopped: number;
  error: number;
  unknown: number;
}

const props = defineProps<Props>();
</script>

<template>
  <section class="status-chip-row" aria-label="项目状态摘要">
    <article class="status-chip">
      <p class="status-label">总项目</p>
      <p class="status-value">{{ props.total }}</p>
    </article>
    <article class="status-chip running">
      <p class="status-label">运行中</p>
      <p class="status-value">{{ props.running }}</p>
    </article>
    <article class="status-chip stopped">
      <p class="status-label">已停止</p>
      <p class="status-value">{{ props.stopped }}</p>
    </article>
    <article class="status-chip error">
      <p class="status-label">异常</p>
      <p class="status-value">{{ props.error }}</p>
    </article>
    <article class="status-chip unknown">
      <p class="status-label">未知</p>
      <p class="status-value">{{ props.unknown }}</p>
    </article>
  </section>
</template>

<style scoped>
.status-chip-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.status-chip {
  padding: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-muted);
  border-radius: var(--radius-md);
}

.status-label,
.status-value {
  margin: 0;
}

.status-label {
  color: var(--text-secondary);
  font-size: 12px;
}

.status-value {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
}

.status-chip.running .status-value {
  color: var(--accent-green);
}

.status-chip.stopped .status-value {
  color: var(--text-secondary);
}

.status-chip.error .status-value {
  color: var(--accent-red);
}

.status-chip.unknown .status-value {
  color: var(--accent-yellow);
}

@media (max-width: 1120px) {
  .status-chip-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .status-chip-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .status-chip-row {
    grid-template-columns: 1fr;
  }
}
</style>
