import type { SystemDisksData } from "@server-probe/shared";
import { defineEventHandler } from "h3";

import { collectDisksData } from "../../modules/system/collector";
import { ok } from "../../utils/response";

export default defineEventHandler(async (event) => {
  const data: SystemDisksData = await collectDisksData();

  return ok(event, data);
});
