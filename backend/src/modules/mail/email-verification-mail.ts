import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

export type SendEmailVerificationInput = {
  to: string;
  name: string | null;
  verificationUrl: string;
  expiresInMinutes: number;
};

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  ...(env.SMTP_USER && env.SMTP_PASSWORD
    ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
    : {}),
});

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );
}

function emailHtml(
  heading: string,
  greeting: string,
  body: string,
  action: string,
  url: string,
  note = "",
) {
  const safeUrl = escapeHtml(url);
  return `<!doctype html><html lang="vi"><body style="margin:0;padding:32px 12px;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b"><main style="max-width:480px;margin:auto;padding:32px;background:#fff;border:1px solid #e4e4e7;border-radius:8px"><p style="color:#71717a">CoreStack</p><h1 style="font-size:22px">${heading}</h1><p>${greeting}</p><p>${body}</p><p style="margin:28px 0"><a href="${safeUrl}" style="background:#18181b;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">${action}</a></p><p style="font-size:13px;color:#71717a">Nếu nút không hoạt động, mở liên kết: <a href="${safeUrl}">${safeUrl}</a></p><p style="font-size:13px;color:#71717a">${note}</p><hr style="border:0;border-top:1px solid #e4e4e7"><p style="font-size:13px;color:#71717a">Email tự động từ CoreStack. Vui lòng không trả lời email này.</p></main></body></html>`;
}

export async function sendEmailVerification(
  input: SendEmailVerificationInput,
): Promise<void> {
  const greeting = input.name ? `Xin chào ${input.name},` : "Xin chào,";
  const duration =
    input.expiresInMinutes % 60 === 0
      ? `${input.expiresInMinutes / 60} giờ`
      : `${input.expiresInMinutes} phút`;
  const note = `Liên kết có hiệu lực trong ${duration}. Nếu bạn không đăng ký, hãy bỏ qua email này.`;
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: input.to,
    subject: "Kích hoạt tài khoản",
    text: `${greeting}\n\nCảm ơn bạn đã đăng ký. Mở liên kết sau để xác minh email và kích hoạt tài khoản:\n${input.verificationUrl}\n\n${note}`,
    html: emailHtml(
      "Kích hoạt tài khoản",
      escapeHtml(greeting),
      "Cảm ơn bạn đã đăng ký. Nhấn nút bên dưới để xác minh email và kích hoạt tài khoản.",
      "Kích hoạt tài khoản",
      input.verificationUrl,
      note,
    ),
  });
}

export async function sendWelcomeEmail(input: {
  to: string;
  name: string | null;
}): Promise<void> {
  const greeting = input.name ? `Xin chào ${input.name},` : "Xin chào,";
  const loginUrl = new URL("/login", env.PUBLIC_WEB_URL).toString();
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: input.to,
    subject: "Chào mừng bạn đến với CoreStack",
    text: `${greeting}\n\nTài khoản của bạn đã được kích hoạt và sẵn sàng sử dụng.\nĐăng nhập: ${loginUrl}`,
    html: emailHtml(
      "Chào mừng bạn!",
      escapeHtml(greeting),
      "Tài khoản của bạn đã được kích hoạt và sẵn sàng sử dụng.",
      "Đăng nhập",
      loginUrl,
    ),
  });
}
