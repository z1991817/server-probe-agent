import type { LogsSearchData } from "@server-probe/shared";
import { defineEventHandler, getQuery } from "h3";

import { searchHistoricalLogs } from "../modules/logs/search";
import { ok } from "../utils/response";

export default defineEventHandler(async (event) => {
  const data: LogsSearchData = await searchHistoricalLogs(
    event,
    getQuery(event)
  );

  return ok(event, data);
});
