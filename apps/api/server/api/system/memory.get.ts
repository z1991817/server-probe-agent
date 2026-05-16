import type { SystemMemoryData } from "@server-probe/shared";
import { defineEventHandler } from "h3";

import { collectMemoryData } from "../../modules/system/collector";
import { ok } from "../../utils/response";

export default defineEventHandler((event) => {
  const data: SystemMemoryData = collectMemoryData();

  return ok(event, data);
});
