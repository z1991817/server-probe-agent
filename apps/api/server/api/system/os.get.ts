import type { SystemOsData } from "@server-probe/shared";
import { defineEventHandler } from "h3";

import { collectOsData } from "../../modules/system/collector";
import { ok } from "../../utils/response";

export default defineEventHandler((event) => {
  const data: SystemOsData = collectOsData();

  return ok(event, data);
});
