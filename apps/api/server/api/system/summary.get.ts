import type { SystemSummaryData } from "@server-probe/shared";
import { defineEventHandler } from "h3";

import { collectSystemSummary } from "../../modules/system/collector";
import { ok } from "../../utils/response";

export default defineEventHandler(async (event) => {
  const data: SystemSummaryData = await collectSystemSummary();

  return ok(event, data);
});
