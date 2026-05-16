<script setup lang="ts">
import { computed } from "vue";

import ProjectOperationDialog from "~/components/projects/ProjectOperationDialog.vue";
import ProjectsFilterBar from "~/components/projects/ProjectsFilterBar.vue";
import ProjectsStatusChips from "~/components/projects/ProjectsStatusChips.vue";
import ProjectsTable from "~/components/projects/ProjectsTable.vue";
import ProjectsToast from "~/components/projects/ProjectsToast.vue";
import { useProjectsPage } from "~/composables/useProjectsPage";

useHead({
  title: "项目 - 服务器探针"
});

const {
  keyword,
  stateFilter,
  loading,
  requestErrorMessage,
  stateCount,
  filteredProjects,
  configLoaded,
  writeEnabled,
  configIssues,
  submittingOperation,
  actionLoadingMap,
  operationResultMap,
  currentPendingOperation,
  currentToastMessage,
  openOperation,
  cancelOperation,
  confirmOperation,
  dismissToast,
  reloadProjects
} = useProjectsPage();

function handleOperate(payload: { projectId: string; action: "start" | "stop" | "restart" }): void {
  openOperation(payload.projectId, payload.action);
}

const dialogOperation = computed(() => {
  const operation = currentPendingOperation.value;
  if (!operation) {
    return null;
  }

  return {
    project: {
      id: operation.projectId,
      name: operation.projectName
    },
    action: operation.action
  };
});
</script>

<template>
  <section class="projects-page">
    <header class="panel page-head">
      <div>
        <p class="section-kicker">Projects</p>
        <h1 class="section-title">项目运维</h1>
      </div>
      <div class="head-badges">
        <span class="status-pill" :class="configLoaded ? 'ok' : 'down'">
          <span class="status-dot" aria-hidden="true" />
          {{ configLoaded ? "配置已加载" : "配置异常" }}
        </span>
        <span class="status-pill" :class="writeEnabled ? 'ok' : 'degraded'">
          <span class="status-dot" aria-hidden="true" />
          {{ writeEnabled ? "写操作可用" : "写操作禁用" }}
        </span>
      </div>
    </header>

    <ProjectsToast :message="currentToastMessage" @close="dismissToast" />

    <section v-if="requestErrorMessage" class="panel alert-panel" role="alert">
      <p class="alert-title">项目列表加载失败</p>
      <p class="alert-desc">{{ requestErrorMessage }}</p>
    </section>

    <section
      v-if="configIssues.length > 0"
      class="panel warning-panel"
      aria-label="项目配置问题"
    >
      <p class="alert-title">项目配置问题（{{ configIssues.length }}）</p>
      <ul class="issues-list">
        <li v-for="issue in configIssues" :key="`${issue.path}-${issue.code}`">
          {{ issue.code }} · {{ issue.path }} · {{ issue.message }}
        </li>
      </ul>
    </section>

    <ProjectsStatusChips
      :error="stateCount.error"
      :running="stateCount.running"
      :stopped="stateCount.stopped"
      :total="stateCount.total"
      :unknown="stateCount.unknown"
    />

    <ProjectsFilterBar
      v-model:keyword="keyword"
      v-model:state-filter="stateFilter"
      :loading="loading"
      :total-count="filteredProjects.length"
      @reload="reloadProjects"
    />

    <ProjectsTable
      :action-loading-map="actionLoadingMap"
      :loading="loading"
      :operation-result-map="operationResultMap"
      :projects="filteredProjects"
      :write-enabled="writeEnabled"
      @operate="handleOperate"
    />

    <ProjectOperationDialog
      :operation="dialogOperation"
      :submitting="submittingOperation"
      @cancel="cancelOperation"
      @confirm="confirmOperation"
    />
  </section>
</template>

<style scoped>
.projects-page {
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

.head-badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.status-pill.ok {
  color: var(--accent-green);
  background: rgba(63, 185, 80, .1);
  border-color: rgba(63, 185, 80, .32);
}

.status-pill.degraded {
  color: var(--accent-yellow);
  background: rgba(210, 153, 34, .1);
  border-color: rgba(210, 153, 34, .32);
}

.status-pill.down {
  color: var(--accent-red);
  background: rgba(248, 81, 73, .1);
  border-color: rgba(248, 81, 73, .32);
}

.status-pill.ok .status-dot {
  background: var(--accent-green);
}

.status-pill.degraded .status-dot {
  background: var(--accent-yellow);
}

.status-pill.down .status-dot {
  background: var(--accent-red);
}

.alert-panel,
.warning-panel {
  border-color: rgba(248, 81, 73, .4);
}

.warning-panel {
  border-color: rgba(210, 153, 34, .42);
}

.alert-title,
.alert-desc {
  margin: 0;
}

.alert-title {
  font-size: 14px;
  font-weight: 700;
}

.alert-desc,
.issues-list {
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.issues-list {
  margin-bottom: 0;
  padding-left: 18px;
}

@media (max-width: 860px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .head-badges {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
