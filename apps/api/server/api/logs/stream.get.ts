import { defineEventHandler, getQuery } from "h3";

import {
  prepareLogStream,
  streamProjectLogs
} from "../../modules/logs/stream";
import { requireAuth } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  requireAuth(event);

  const stream = await prepareLogStream(event, getQuery(event));

  return streamProjectLogs(event, stream);
});
