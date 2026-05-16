import type { LogoutResponseData } from "@server-probe/shared";
import { defineEventHandler } from "h3";

import { writeAuditLog } from "../../utils/audit";
import { clearSessionCookie, getCurrentUser } from "../../utils/auth";
import { ok } from "../../utils/response";

export default defineEventHandler(async (event) => {
  const user = getCurrentUser(event);
  clearSessionCookie(event);
  await writeAuditLog({
    event,
    user,
    action: "auth.logout",
    targetType: "auth_session",
    targetId: user?.id ?? null,
    targetName: user?.username ?? null,
    requestPayload: {
      authenticated: user !== null
    },
    result: "success"
  });

  const data: LogoutResponseData = {
    loggedOut: true
  };

  return ok(event, data);
});
