import type { LoginResponseData } from "@server-probe/shared";
import { defineEventHandler } from "h3";

import { writeAuditLog } from "../../utils/audit";
import { ok, raise } from "../../utils/response";
import {
  readLoginBody,
  setSessionCookie,
  verifyBuiltInUser
} from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const credentials = await readLoginBody(event);
  const user = verifyBuiltInUser(event, credentials);

  if (!user) {
    await writeAuditLog({
      event,
      action: "auth.login",
      targetType: "auth_user",
      targetId: credentials.username,
      targetName: credentials.username,
      requestPayload: {
        username: credentials.username
      },
      result: "failure",
      errorMessage: "INVALID_CREDENTIALS"
    });

    raise({
      code: "INVALID_CREDENTIALS",
      message: "用户名或密码错误",
      statusCode: 401,
      statusMessage: "Unauthorized"
    });
  }

  const expiresAt = setSessionCookie(event, user);
  await writeAuditLog({
    event,
    user,
    action: "auth.login",
    targetType: "auth_user",
    targetId: user.id,
    targetName: user.username,
    requestPayload: {
      username: credentials.username
    },
    result: "success"
  });

  const data: LoginResponseData = {
    user,
    expiresAt
  };

  return ok(event, data);
});
