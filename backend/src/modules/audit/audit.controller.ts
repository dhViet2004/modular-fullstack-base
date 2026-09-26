import type { RequestHandler } from "express";

import { successResponse } from "../../core/http/api-response.js";
import type { ListAuditLogsQuery } from "./audit.schema.js";
import { listAuditLogs } from "./audit.service.js";

// Chuyển query đã validate thành response phân trang cho màn hình quản trị.
export const listAuditLogsController: RequestHandler = async (
  _request,
  response,
) => {
  const query = response.locals.validatedQuery as ListAuditLogsQuery;
  response.json(successResponse(await listAuditLogs(query)));
};
