import nodemailer from "nodemailer";

import { env } from "../../config/env.js";

export type SendEmailVerificationInput = {
  to: string;
  verificationUrl: string;
};

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  ...(env.SMTP_USER && env.SMTP_PASSWORD
    ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
    : {}),
});

// Gửi link xác minh dạng text qua SMTP; không log URL vì URL chứa raw token.
export async function sendEmailVerification(
  input: SendEmailVerificationInput,
): Promise<void> {
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: input.to,
    subject: "Xác minh địa chỉ email",
    text: `Mở liên kết sau để xác minh email của bạn:\n\n${input.verificationUrl}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
  });
}
