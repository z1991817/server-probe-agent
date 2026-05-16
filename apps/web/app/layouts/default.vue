<template>
  <div class="app-shell">
    <aside class="sidebar" aria-label="主导航">
      <div class="sidebar-logo">
        <span class="logo-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 7.5h16M7 12h10M9 16.5h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </span>
        <span>
          <span class="logo-text">服务器探针</span>
          <span class="logo-sub">Server Probe</span>
        </span>
      </div>

      <nav class="sidebar-section">
        <p class="sidebar-section-label">Overview</p>
        <NuxtLink class="nav-item" to="/">总览</NuxtLink>
        <NuxtLink class="nav-item" to="/projects">项目</NuxtLink>
        <NuxtLink class="nav-item" to="/logs">日志</NuxtLink>
        <NuxtLink class="nav-item" to="/audits">审计</NuxtLink>
      </nav>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <p class="topbar-title">本机控制台</p>
          <p class="topbar-subtitle">Web 5100 · API 5000</p>
        </div>
        <div class="topbar-right">
          <NuxtLink class="topbar-audit-link" to="/audits">最近审计</NuxtLink>
          <span class="status-pill">
            <span class="status-dot" aria-hidden="true" />
            Probe Online
          </span>
        </div>
      </header>

      <div class="content">
        <slot />
      </div>
    </main>
  </div>
</template>
