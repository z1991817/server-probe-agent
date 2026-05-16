<script setup lang="ts">
import { computed } from "vue";

interface Props {
  loading: boolean;
  errorMessage: string | null;
  apiBase: string;
}

interface Emits {
  submit: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const username = defineModel<string>("username", { required: true });
const password = defineModel<string>("password", { required: true });

const canSubmit = computed(
  () => username.value.trim().length > 0 && password.value.length > 0 && !props.loading
);

function handleSubmit(): void {
  if (canSubmit.value) {
    emit("submit");
  }
}
</script>

<template>
  <form class="login-panel" @submit.prevent="handleSubmit">
    <div class="login-head">
      <span class="login-mark" aria-hidden="true">
        <span class="login-mark-line" />
        <span class="login-mark-line short" />
      </span>
      <div class="login-title-group">
        <p class="login-kicker">Server Probe</p>
        <h1 class="login-title">服务器探针</h1>
      </div>
    </div>

    <div class="field-stack">
      <label class="field">
        <span class="field-label">用户名</span>
        <input
          v-model="username"
          class="field-input"
          autocomplete="username"
          name="username"
          placeholder="admin"
          type="text"
        >
      </label>

      <label class="field">
        <span class="field-label">密码</span>
        <input
          v-model="password"
          class="field-input"
          autocomplete="current-password"
          name="password"
          placeholder="请输入密码"
          type="password"
        >
      </label>
    </div>

    <p v-if="props.errorMessage" class="login-error" role="alert">
      {{ props.errorMessage }}
    </p>

    <button class="login-submit" :disabled="!canSubmit" type="submit">
      <span>{{ props.loading ? "登录中" : "登录" }}</span>
    </button>

    <div class="login-meta">
      <span class="meta-dot" aria-hidden="true" />
      <span class="meta-text">{{ props.apiBase }}</span>
    </div>
  </form>
</template>

<style scoped>
.login-panel {
  width: min(100%, 420px);
  padding: 28px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.login-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 28px;
}

.login-mark {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  color: var(--text-primary);
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  border-radius: var(--radius-sm);
}

.login-mark-line {
  display: block;
  width: 18px;
  height: 2px;
  background: currentColor;
  border-radius: 99px;
  box-shadow: 0 7px 0 currentColor;
}

.login-mark-line.short {
  width: 12px;
  margin-top: -10px;
  margin-left: 6px;
  box-shadow: none;
}

.login-title-group {
  min-width: 0;
}

.login-kicker,
.login-title {
  margin: 0;
}

.login-kicker {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.2;
}

.login-title {
  margin-top: 3px;
  font-size: 22px;
  line-height: 1.2;
}

.field-stack {
  display: grid;
  gap: 16px;
}

.field {
  display: grid;
  gap: 7px;
}

.field-label {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.field-input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  color: var(--text-primary);
  font: inherit;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
}

.field-input::placeholder {
  color: var(--text-muted);
}

.field-input:focus {
  border-color: rgba(88, 166, 255, .8);
  box-shadow: 0 0 0 3px rgba(88, 166, 255, .12);
}

.login-error {
  min-height: 34px;
  margin: 16px 0 0;
  padding: 8px 10px;
  color: var(--accent-red);
  font-size: 13px;
  line-height: 1.35;
  background: rgba(248, 81, 73, .1);
  border: 1px solid rgba(248, 81, 73, .28);
  border-radius: var(--radius-sm);
}

.login-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 42px;
  margin-top: 18px;
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  background: var(--accent-blue);
  border: 1px solid rgba(88, 166, 255, .7);
  border-radius: var(--radius-sm);
  transition: background 150ms ease-out, border-color 150ms ease-out, opacity 150ms ease-out;
}

.login-submit:hover:not(:disabled) {
  background: #79c0ff;
  border-color: #79c0ff;
}

.login-submit:disabled {
  cursor: not-allowed;
  opacity: .58;
}

.login-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  margin-top: 18px;
  color: var(--text-muted);
  font-size: 12px;
}

.meta-dot {
  width: 7px;
  height: 7px;
  background: var(--accent-green);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(63, 185, 80, .45);
}

.meta-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 520px) {
  .login-panel {
    padding: 22px;
  }
}
</style>
