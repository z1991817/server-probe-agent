import type { ProjectsConfigStatusData } from "@server-probe/shared";
import { defineEventHandler } from "h3";

import { loadProjectsConfig } from "../../../modules/projects/config";
import { ok } from "../../../utils/response";

export default defineEventHandler(async (event) => {
  const data: ProjectsConfigStatusData = await loadProjectsConfig(event);

  return ok(event, data);
});
