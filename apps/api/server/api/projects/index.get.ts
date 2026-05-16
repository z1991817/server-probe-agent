import type {
  ProjectListItemData,
  ProjectsListData
} from "@server-probe/shared";
import { defineEventHandler } from "h3";

import { loadProjectsConfig } from "../../modules/projects/config";
import {
  getProjectsConfigMeta,
  inspectProjectStatus
} from "../../modules/projects/status";
import { ok } from "../../utils/response";

export default defineEventHandler(async (event) => {
  const configStatus = await loadProjectsConfig(event);
  const projects: ProjectListItemData[] = await Promise.all(
    configStatus.projects.map(async (project) => ({
      project,
      status: await inspectProjectStatus(project, {
        configLoaded: configStatus.loaded
      })
    }))
  );
  const data: ProjectsListData = {
    config: getProjectsConfigMeta(configStatus),
    projects
  };

  return ok(event, data);
});
