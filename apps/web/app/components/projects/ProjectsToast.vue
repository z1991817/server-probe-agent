<script setup lang="ts">
interface ToastMessage {
  type: "success" | "error";
  text: string;
}

interface Props {
  message: ToastMessage | null;
}

interface Emits {
  close: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function closeToast(): void {
  emit("close");
}
</script>

<template>
  <section
    v-if="props.message"
    class="toast"
    :class="props.message.type"
    role="status"
  >
    <p class="toast-text">{{ props.message.text }}</p>
    <button class="toast-close" type="button" @click="closeToast">关闭</button>
  </section>
</template>

<style scoped>
.toast {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.toast.success {
  background: rgba(63, 185, 80, .1);
  border-color: rgba(63, 185, 80, .35);
}

.toast.error {
  background: rgba(248, 81, 73, .1);
  border-color: rgba(248, 81, 73, .35);
}

.toast-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.toast-close {
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  background: transparent;
  border: 0;
}
</style>
