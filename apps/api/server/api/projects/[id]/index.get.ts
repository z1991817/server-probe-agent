import type { ProjectDetailData } from "@server-probe/shared";
import type { H3Event } from "h3";
import { defineEventHandler, getRouterParam } from "h3";

import { loadProjectsConfig } from "../../../modules/projects/config";
import {
  getProjectsConfigMeta,
  inspectProjectStatus
} from "../../../modules/projects/status";
import { ok, raise } from "../../../utils/response";

export default defineEventHandler(async (event) => {
  const projectId = getProjectId(event);
  const configStatus = await loadProjectsConfig(event);
  const project = configStatus.projects.find((item) => item.id === projectId);

  if (project === undefined) {
    raise({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND",
      message: "项目不存在"
    });
  }

  const data: ProjectDetailData = {
    config: getProjectsConfigMeta(configStatus),
    project,
    status: await inspectProjectStatus(project, {
      configLoaded: configStatus.loaded
    })
  };

  return ok(event, data);
});

function getProjectId(event: H3Event): string {
  const projectId = getRouterParam(event, "id");

  if (typeof projectId !== "string" || projectId.length === 0) {
    raise({
      statusCode: 400,
      code: "PROJECT_ID_REQUIRED",
      message: "项目 id 不能为空"
    });
  }

  return projectId;
}
