import type { SystemCpuData } from "@server-probe/shared";
import { defineEventHandler } from "h3";

import { collectCpuData } from "../../modules/system/collector";
import { ok } from "../../utils/response";

export default defineEventHandler(async (event) => {
  const data: SystemCpuData = await collectCpuData();

  return ok(event, data);
});
