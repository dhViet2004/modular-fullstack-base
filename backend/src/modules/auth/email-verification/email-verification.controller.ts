import type { RequestHandler } from "express";

import { successResponse } from "../../../core/http/api-response.js";
import type { VerifyEmailInput } from "./email-verification.schema.js";
import { verifyEmail } from "./email-verification.service.js";
import { enqueueEmailVerification } from "../../jobs/email-verification.job.js";

function auditContext(request: Parameters<RequestHandler>[0]) {
  return {
    ipAddress: request.ip ?? null,
    userAgent: request.get("user-agent") ?? null,
  };
}

// Yêu cầu gửi mail cho chính user đã được authenticate; không nhận email từ body.
export const requestEmailVerificationController: RequestHandler = async (
  request,
  response,
) => {
  const result = await enqueueEmailVerification(request.auth.user.id);

  response.status(202).json(successResponse(result));
};

// Nhận raw token đã validate, gọi service và không ghi token vào log hoặc response.
export const verifyEmailController: RequestHandler = async (
  request,
  response,
) => {
  const input = request.body as VerifyEmailInput;
  const user = await verifyEmail(input.token, auditContext(request));

  response.json(successResponse({ user }));
};
