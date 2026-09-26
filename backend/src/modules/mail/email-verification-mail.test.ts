import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMailMock = vi.hoisted(() => vi.fn());
const createTransportMock = vi.hoisted(() =>
  vi.fn(() => ({ sendMail: sendMailMock })),
);

vi.mock("nodemailer", () => ({
  default: { createTransport: createTransportMock },
}));

import { env } from "../../config/env.js";
import { sendEmailVerification } from "./email-verification-mail.js";

describe("email verification SMTP delivery", () => {
  beforeEach(() => {
    sendMailMock.mockReset();
  });

  it("sends the verification URL to the requested email", async () => {
    sendMailMock.mockResolvedValue({ messageId: "message-id" });

    await sendEmailVerification({
      to: "user@example.com",
      verificationUrl: "http://localhost:3000/verify-email?token=raw-token",
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: env.MAIL_FROM,
      to: "user@example.com",
      subject: "Xác minh địa chỉ email",
      text: "Mở liên kết sau để xác minh email của bạn:\n\nhttp://localhost:3000/verify-email?token=raw-token\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.",
    });
  });
});
