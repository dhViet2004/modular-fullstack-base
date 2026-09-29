import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.hoisted(() => vi.fn());
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

import {
  sendEmailVerification,
  sendWelcomeEmail,
} from "./email-verification-mail.js";

describe("account email templates", () => {
  beforeEach(() => sendMail.mockReset());

  it("sends verification HTML and text with an escaped name and a fallback link", async () => {
    await sendEmailVerification({
      to: "user@example.com",
      name: "<Admin>",
      verificationUrl: "http://localhost:3000/verify-email?token=raw-token",
      expiresInMinutes: 60,
    });
    const message = sendMail.mock.calls[0]?.[0] as {
      subject: string;
      html: string;
      text: string;
    };
    expect(message.subject).toBe("Kích hoạt tài khoản");
    expect(message.html).toContain("Xin chào &lt;Admin&gt;");
    expect(message.html).toContain("verify-email?token=raw-token");
    expect(message.text).toContain("1 giờ");
    expect(message.html).not.toContain("Xin chào <Admin>");
  });

  it("sends a welcome message with the login link", async () => {
    await sendWelcomeEmail({ to: "user@example.com", name: null });
    const message = sendMail.mock.calls[0]?.[0] as {
      subject: string;
      html: string;
      text: string;
    };
    expect(message.subject).toContain("Chào mừng");
    expect(message.html).toContain("/login");
    expect(message.text).toContain("/login");
  });
});
