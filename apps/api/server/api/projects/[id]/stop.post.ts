import type { ProjectOperationResponseData } from "@server-probe/shared";
import { defineEventHandler } from "h3";

import {
  executeProjectOperation,
  readProjectIdParam
} from "../../../modules/projects/operations";
import { ok } from "../../../utils/response";

export default defineEventHandler(async (event) => {
  const data: ProjectOperationResponseData = await executeProjectOperation(
    event,
    readProjectIdParam(event),
    "stop"
  );

  return ok(event, data);
});
