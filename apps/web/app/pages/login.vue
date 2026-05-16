<script setup lang="ts">
import LoginPanel from "~/components/auth/LoginPanel.vue";

definePageMeta({
  layout: false
});

useHead({
  title: "登录 - 服务器探针"
});

const {
  username,
  password,
  loading,
  errorMessage,
  apiBase,
  submit
} = useLoginForm();
</script>

<template>
  <main class="login-page">
    <section class="login-shell" aria-label="登录">
      <div class="login-copy">
        <p class="copy-kicker">Local Ops Console</p>
        <h2 class="copy-title">本机服务器运维入口</h2>
        <div class="signal-grid" aria-label="服务状态">
          <span class="signal-item">
            <span class="signal-dot ok" aria-hidden="true" />
            Web 5100
          </span>
          <span class="signal-item">
            <span class="signal-dot api" aria-hidden="true" />
            API 5000
          </span>
          <span class="signal-item">
            <span class="signal-dot audit" aria-hidden="true" />
            Audit Ready
          </span>
        </div>
      </div>

      <LoginPanel
        v-model:password="password"
        v-model:username="username"
        :api-base="apiBase"
        :error-message="errorMessage"
        :loading="loading"
        @submit="submit"
      />
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  min-height: 100dvh;
  padding: 24px;
  overflow: auto;
  background:
    linear-gradient(180deg, rgba(88, 166, 255, .08), transparent 34%),
    var(--bg-base);
  place-items: center;
}

.login-shell {
  display: grid;
  grid-template-columns: minmax(260px, 380px) minmax(320px, 420px);
  gap: 28px;
  align-items: stretch;
  width: min(100%, 920px);
}

.login-copy {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 360px;
  padding: 28px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.copy-kicker,
.copy-title {
  margin: 0;
}

.copy-kicker {
  color: var(--accent-blue);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.copy-title {
  max-width: 9em;
  margin-top: 12px;
  font-size: 34px;
  line-height: 1.12;
}

.signal-grid {
  display: grid;
  gap: 10px;
}

.signal-item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-height: 34px;
  padding: 7px 10px;
  color: var(--text-secondary);
  font-size: 13px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-muted);
  border-radius: var(--radius-sm);
}

.signal-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.signal-dot.ok {
  background: var(--accent-green);
}

.signal-dot.api {
  background: var(--accent-blue);
}

.signal-dot.audit {
  background: var(--accent-purple);
}

@media (max-width: 820px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .login-copy {
    min-height: auto;
  }

  .copy-title {
    max-width: 100%;
    font-size: 28px;
  }
}

@media (max-width: 520px) {
  .login-page {
    padding: 16px;
  }
}
</style>
