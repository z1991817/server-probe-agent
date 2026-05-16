import type { AuditListData } from "@server-probe/shared";
import { defineEventHandler, getQuery } from "h3";

import { requireAuth } from "../utils/auth";
import { ok } from "../utils/response";
import { listAuditLogs } from "../modules/audit/list";

export default defineEventHandler(async (event) => {
  requireAuth(event);

  const data: AuditListData = await listAuditLogs(event, getQuery(event));

  return ok(event, data);
});
