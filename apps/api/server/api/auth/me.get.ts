import type { CurrentUserResponseData } from "@server-probe/shared";
import { defineEventHandler } from "h3";

import { getCurrentUser } from "../../utils/auth";
import { ok } from "../../utils/response";

export default defineEventHandler((event) => {
  const data: CurrentUserResponseData = {
    user: getCurrentUser(event)
  };

  return ok(event, data);
});
