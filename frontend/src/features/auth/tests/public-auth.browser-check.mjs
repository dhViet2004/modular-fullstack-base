// Executed by: node src/components/ui/tests/primitives.browser-check.mjs http://127.0.0.1:3002
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function checkPublicAuth({
  origin,
  profile,
  socket,
  send,
  evaluate,
  key,
  click,
  navigate,
  until,
}) {
  const marker = "corestack.session-established";
  const user = {
    id: "b1-user",
    email: "minhanh@example.com",
    displayName: "Nguyễn Minh Anh",
    hasPassword: true,
    status: "ACTIVE",
    emailVerifiedAt: null,
    createdAt: "2026-10-09T00:00:00Z",
    updatedAt: "2026-10-09T00:00:00Z",
  };
  const headers = [
    { name: "Content-Type", value: "application/json" },
    { name: "Access-Control-Allow-Origin", value: new URL(origin).origin },
    { name: "Access-Control-Allow-Credentials", value: "true" },
    { name: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
    {
      name: "Access-Control-Allow-Headers",
      value: "content-type,authorization",
    },
  ];
  const calls = [];
  const paused = [];
  const destinations = [];
  const frames = [];
  let mode = "guest";
  let fileMode = "ok";
  let meFails = false;
  let holdDestination = false;
  const refreshData = {
    accessToken: "b1-memory-only-token",
    accessTokenExpiresInSeconds: 900,
  };
  const heldPaths = new Set([
    "/auth/login",
    "/auth/register",
    "/auth/logout",
    "/auth/email-verification/verify",
    "/auth/email-verification/request",
  ]);
  const count = (path) => calls.filter((call) => call.path === path).length;

  async function fulfill(requestId, status, data = {}, code) {
    await send("Fetch.fulfillRequest", {
      requestId,
      responseCode: status,
      responseHeaders: headers,
      ...(status === 204
        ? {}
        : {
            body: Buffer.from(
              JSON.stringify({
                success: status < 400,
                data,
                ...(code ? { error: { code } } : {}),
              }),
            ).toString("base64"),
          }),
    });
  }

  const intercept = async ({ data }) => {
    const event = JSON.parse(data);
    if (event.method !== "Fetch.requestPaused") return;
    const { requestId, request } = event.params;
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/v1/")) {
      if (holdDestination && url.pathname === "/account")
        destinations.push(requestId);
      else await send("Fetch.continueRequest", { requestId });
      return;
    }
    if (request.method === "OPTIONS") return fulfill(requestId, 204);
    const path = url.pathname.slice("/api/v1".length);
    const call = {
      requestId,
      path,
      method: request.method,
      body: request.postData,
      authorization: request.headers.Authorization,
    };
    calls.push(call);
    if (heldPaths.has(path) || (path === "/auth/refresh" && mode === "hold")) {
      paused.push(call);
      return;
    }
    if (path === "/auth/refresh") {
      if (mode === "offline")
        return send("Fetch.failRequest", {
          requestId,
          errorReason: "ConnectionReset",
        });
      if (mode === "503") return fulfill(requestId, 503);
      if (mode === "unknown401") return fulfill(requestId, 401);
      return mode === "authenticated"
        ? fulfill(requestId, 200, refreshData)
        : fulfill(requestId, 401, {}, "INVALID_REFRESH_TOKEN");
    }
    if (path === "/auth/me")
      return meFails
        ? fulfill(requestId, 503)
        : fulfill(requestId, 200, {
            user,
            access: { roles: ["MEMBER"], permissions: [] },
          });
    if (path === "/auth/sessions")
      return fulfill(requestId, 200, { sessions: [] });
    if (path === "/files") {
      if (fileMode !== "ok") {
        if (fileMode === "once") fileMode = "ok";
        return fulfill(requestId, 401, {}, "UNAUTHENTICATED");
      }
      return fulfill(requestId, 200, []);
    }
    return fulfill(requestId, 403, {}, "FORBIDDEN");
  };
  socket.addEventListener("message", intercept);
  await send("Fetch.enable", {
    patterns: [
      { urlPattern: "*/api/v1/*", requestStage: "Request" },
      { urlPattern: `${origin}/account*`, requestStage: "Request" },
    ],
  });

  async function resize(width, height = width === 390 ? 844 : 1000) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }
  async function go(
    route,
    nextMode = "guest",
    known = false,
    width = 620,
    height = 600,
  ) {
    mode = nextMode;
    const before = count("/auth/refresh");
    await evaluate(
      `sessionStorage.${known ? "setItem" : "removeItem"}(${JSON.stringify(marker)}${known ? ', "true"' : ""})`,
    );
    await resize(width, height);
    await navigate(`${origin}${route}`);
    await until(
      () => count("/auth/refresh") === before + 1,
      `restore ${route}`,
    );
    await evaluate(
      "document.fonts.ready.then(() => new Promise(done => requestAnimationFrame(done)))",
    );
  }
  async function text(content) {
    await until(
      () =>
        evaluate(
          `(document.querySelector('.shell-main') ?? document.querySelector('.app-content'))?.textContent.includes(${JSON.stringify(content)})`,
        ),
      content,
    );
  }
  async function field(name, value) {
    await evaluate(`(() => {
      const input = document.querySelector('input[name=${name}]');
      input.focus();
      input.select();
    })()`);
    await send("Input.insertText", { text: value });
  }
  async function take(path) {
    await until(
      () => paused.some((call) => call.path === path),
      `pending ${path}`,
    );
    return paused.splice(
      paused.findIndex((call) => call.path === path),
      1,
    )[0];
  }
  async function screenshot(id, name) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
    const original = await evaluate(
      "({ width: innerWidth, height: innerHeight })",
    );
    const captures = [];
    for (const viewport of [
      original,
      ...[
        { width: 390, height: 844 },
        { width: 1440, height: 1000 },
      ].filter(({ width }) => width !== original.width),
    ]) {
      await resize(viewport.width, viewport.height);
      await evaluate(
        "new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))",
      );
      assert(
        await evaluate(
          "document.documentElement.scrollWidth <= innerWidth + 1",
        ),
        `overflow: ${name} at ${viewport.width}`,
      );
      const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      const filename = `b1-${id.replace(":", "-")}-${name}${captures.length ? `-${viewport.width}` : ""}.png`;
      await writeFile(join(profile, filename), Buffer.from(data, "base64"));
      captures.push({ filename, viewport });
    }
    await resize(original.width, original.height);
    frames.push({
      id,
      name,
      ...captures[0],
      responsive: captures.slice(1),
      status: "FUNCTIONAL_VERIFIED / VISUAL_PARTIAL",
    });
  }

  try {
    await go("/login", "guest", false, 1440, 1000);
    await text("Chào mừng trở lại");
    await screenshot("4:40414", "login-desktop");
    await field("email", "minhanh@example.com");
    await field("password", "example-password");
    await click('button[type="submit"]');
    const login = await take("/auth/login");
    await until(
      () => evaluate("document.querySelector('button[type=submit]').disabled"),
      "login pending",
    );
    await resize(620, 684);
    await screenshot("4:40497", "login-loading");
    await click('button[type="submit"]');
    await key("Enter");
    assert.equal(
      count("/auth/login"),
      1,
      "pending login prevents repeated submit",
    );
    await fulfill(login.requestId, 401, {}, "INVALID_CREDENTIALS");
    await text("Email hoặc mật khẩu không đúng");
    assert(
      await evaluate("!document.querySelector('button[type=submit]').disabled"),
    );
    await resize(620, 782);
    await screenshot("4:40463", "login-error");
    await go("/login", "guest", false, 390, 844);
    await screenshot("4:40530", "login-mobile");

    await go("/register", "guest", false, 1440, 1000);
    await screenshot("4:40564", "register-desktop");
    await resize(620, 849);
    await field("email", "invalid-email");
    await field("password", "short");
    await field("confirmPassword", "mismatch");
    await click('button[type="submit"]');
    await until(
      () =>
        evaluate(
          "document.querySelectorAll('[aria-invalid=true]').length === 3",
        ),
      "registration validation",
    );
    assert.equal(
      count("/auth/register"),
      0,
      "invalid registration never reaches API",
    );
    await screenshot("4:40619", "register-validation");
    await field("email", "new@example.com");
    await field("displayName", "Nguyễn Minh Anh");
    await field("password", "example-password");
    await field("confirmPassword", "example-password");
    await click('button[type="submit"]');
    const registration = await take("/auth/register");
    assert.deepEqual(Object.keys(JSON.parse(registration.body)).sort(), [
      "displayName",
      "email",
      "password",
    ]);
    await click('button[type="submit"]');
    await key("Enter");
    assert.equal(count("/auth/register"), 1);
    await fulfill(registration.requestId, 201, { user });
    await text("Tạo tài khoản thành công");
    await resize(620, 436);
    await screenshot("4:40658", "register-success");
    await go("/register", "guest", false, 390, 844);
    await screenshot("4:40673", "register-mobile");

    await go("/verify-email?token=fixture-verification-token");
    await text("Xác nhận để hoàn tất");
    assert.equal(
      count("/auth/email-verification/verify"),
      0,
      "opening the link does not consume the token",
    );
    await click(".auth-state-card button");
    const verify = await take("/auth/email-verification/verify");
    assert.deepEqual(JSON.parse(verify.body), {
      token: "fixture-verification-token",
    });
    await text("Đang xác minh email");
    await screenshot("4:40713", "verify-pending");
    await fulfill(verify.requestId, 200, {
      user: { ...user, emailVerifiedAt: "2026-10-09T00:00:00Z" },
    });
    await text("Email đã được xác minh");
    await screenshot("4:40726", "verify-success");

    await go("/verify-email?token=invalid-token");
    await click(".auth-state-card button");
    await fulfill(
      (await take("/auth/email-verification/verify")).requestId,
      400,
      {},
      "INVALID_EMAIL_VERIFICATION_TOKEN",
    );
    await text("Liên kết không hợp lệ hoặc hết hạn");
    await screenshot("4:40741", "verify-invalid");
    await go("/verify-email?token=retry-token");
    await click(".auth-state-card button");
    await fulfill(
      (await take("/auth/email-verification/verify")).requestId,
      503,
    );
    await text("Không thể xác minh email");
    assert(
      !(await evaluate(
        "document.body.textContent.includes('Liên kết không hợp lệ')",
      )),
    );
    await click(".auth-state-card button");
    await fulfill(
      (await take("/auth/email-verification/verify")).requestId,
      200,
      { user },
    );
    await text("Email đã được xác minh");

    await go("/verify-email?token=metadata-token", "authenticated");
    await text("Xác nhận để hoàn tất");
    await click(".auth-state-card button");
    const metadataVerification = await take("/auth/email-verification/verify");
    await evaluate(`window.dispatchEvent(new CustomEvent('auth:refresh-failed', { detail: {
      isAxiosError: true, config: { url: '/auth/refresh' }, response: { status: 503 }
    } }))`);
    user.emailVerifiedAt = "2026-10-09T00:00:00Z";
    await fulfill(metadataVerification.requestId, 200, { user });
    await text("Email đã được xác minh");
    await click('.auth-state-card a[href="/account"]');
    await text("Kết nối bị gián đoạn");
    assert(
      await evaluate(
        "!!document.querySelector('.role-app-shell') && document.querySelector('.app-content').textContent.includes('Đã xác minh')",
      ),
      "public verification updates metadata while preserving restore-error",
    );
    user.emailVerifiedAt = null;

    await go("/verify-email", "authenticated", false, 620, 616);
    await text("Email chưa được xác minh");
    await click(".auth-email-notice button");
    await fulfill(
      (await take("/auth/email-verification/request")).requestId,
      429,
      {},
      "EMAIL_VERIFICATION_RATE_LIMITED",
    );
    await text("Vui lòng chờ trước khi gửi lại");
    assert(
      await evaluate(
        "!document.querySelector('.auth-email-notice button').disabled",
      ),
    );
    assert(
      !(await evaluate(
        "document.querySelector('.auth-email-notice').textContent.includes('45')",
      )),
    );
    await screenshot("4:40756", "resend-server-cooldown");
    await click(".auth-email-notice button");
    await fulfill(
      (await take("/auth/email-verification/request")).requestId,
      202,
      { accepted: true },
    );
    await text("Đã nhận yêu cầu gửi email xác minh");

    await go("/oauth/google/callback", "hold");
    const oauthRefresh = await take("/auth/refresh");
    await text("Đang hoàn tất đăng nhập");
    await screenshot("4:40774", "oauth-loading");
    const meBefore = count("/auth/me");
    holdDestination = true;
    mode = "authenticated";
    await fulfill(oauthRefresh.requestId, 200, refreshData);
    await text("Đăng nhập thành công");
    await until(
      () => destinations.length > 0,
      "OAuth requests the destination immediately",
    );
    assert.equal(
      count("/auth/me"),
      meBefore + 1,
      "OAuth uses the provider's single restore",
    );
    await screenshot("4:40787", "oauth-success-transient");
    holdDestination = false;
    for (const requestId of destinations.splice(0))
      await send("Fetch.continueRequest", { requestId });
    await until(
      () =>
        evaluate(
          "location.pathname === '/account' && !!document.querySelector('.role-app-shell')",
        ),
      "OAuth redirects to account",
    );
    await go("/oauth/google/callback");
    await text("Không thể đăng nhập bằng Google");
    await screenshot("4:40800", "oauth-failure");
    await go("/login?error=google_login_failed");
    await text("Đăng nhập Google thất bại");

    await go("/account", "guest", true, 1440, 900);
    await text("Phiên đăng nhập đã hết hạn");
    await screenshot("4:40817", "session-expired-desktop");
    await go("/account", "guest", true, 390, 844);
    await text("Phiên đăng nhập đã hết hạn");
    await screenshot("4:40832", "session-expired-mobile");
    await go("/account", "guest", false, 390, 844);
    await text("Bạn chưa đăng nhập");
    assert(
      !(await evaluate(
        "document.body.textContent.includes('Phiên đăng nhập đã hết hạn')",
      )),
    );

    for (const nextMode of ["offline", "503", "unknown401"]) {
      await go("/account", nextMode, true, 390, 844);
      await text("Không thể khôi phục phiên");
      assert(
        !(await evaluate(
          "document.body.textContent.includes('Phiên đăng nhập đã hết hạn') || document.body.textContent.includes('Bạn chưa đăng nhập')",
        )),
      );
      mode = "authenticated";
      await click(".auth-state-card button");
      await until(
        () => evaluate("!!document.querySelector('.role-app-shell')"),
        "manual restoration recovers",
      );
    }
    meFails = true;
    await go("/account", "authenticated", false);
    await text("Không thể khôi phục phiên");
    meFails = false;

    for (const nextMode of ["authenticated", "503", "offline", "guest"]) {
      fileMode = "ok";
      await go("/account", "authenticated", false, 1280, 900);
      await until(
        () => evaluate("!!document.querySelector('.role-app-shell')"),
        "established session",
      );
      mode = nextMode;
      fileMode = "once";
      const before = count("/auth/refresh");
      await click('.shell-navigation a[href="/account/files"]');
      await until(
        () => count("/auth/refresh") === before + 1,
        "interceptor attempts refresh",
      );
      if (nextMode === "guest") {
        await text("Phiên đăng nhập đã hết hạn");
        assert(
          !(await evaluate("!!document.querySelector('.role-app-shell')")),
        );
      } else if (nextMode !== "authenticated") {
        await text("Kết nối bị gián đoạn");
        assert(
          await evaluate(
            "!!document.querySelector('.role-app-shell') && document.body.textContent.includes('Tệp của tôi')",
          ),
          "temporary failures retain shell and content",
        );
        mode = "authenticated";
        await click('.role-app-shell [role="alert"] button');
        await until(
          () =>
            evaluate("!document.querySelector('.shell-main > [role=alert]')"),
          "session retry resolves without guest",
        );
      } else {
        await text("Tệp của tôi");
        assert(
          !(await evaluate(
            "document.body.textContent.includes('Phiên đăng nhập đã hết hạn')",
          )),
        );
      }
    }

    fileMode = "ok";
    await go("/account", "authenticated", false, 1280, 900);
    await until(
      () => evaluate("!!document.querySelector('.role-app-shell')"),
      "logout race session",
    );
    mode = "hold";
    fileMode = "once";
    await click('.shell-navigation a[href="/account/files"]');
    const lateRefresh = await take("/auth/refresh");
    await click(".shell-account-trigger");
    await click(".shell-account-menu button");
    const logout = await take("/auth/logout");
    await until(
      () =>
        evaluate(
          "document.querySelector('.shell-account-menu button').disabled",
        ),
      "logout pending disables repeated clicks",
    );
    assert.equal(
      await evaluate(`sessionStorage.getItem(${JSON.stringify(marker)})`),
      null,
    );
    mode = "guest";
    await fulfill(logout.requestId, 204);
    await until(
      () =>
        evaluate(
          "location.pathname === '/login' && !document.querySelector('.role-app-shell')",
        ),
      "explicit logout",
    );
    await fulfill(lateRefresh.requestId, 200, refreshData).catch(() => {});
    await go("/account", "guest", false, 390, 844);
    await text("Bạn chưa đăng nhập");
    assert(
      !(await evaluate(
        "document.body.textContent.includes('Phiên đăng nhập đã hết hạn')",
      )),
    );
    assert(
      await evaluate(
        "!JSON.stringify({ ...localStorage, ...sessionStorage }).includes('token')",
      ),
    );

    assert.equal(frames.length, 17);
    assert.equal(new Set(frames.map(({ id }) => id)).size, 17);
    await writeFile(
      join(profile, "b1-frames.json"),
      JSON.stringify(frames, null, 2),
    );
    console.log(
      `PASS: 17 B.1 frames; manual verification, server cooldown, transient OAuth success, guest/expired/network/5xx, refresh/retry and logout race. Screenshots: ${profile}/b1-frames.json (API fixtures; VISUAL_PARTIAL).`,
    );
  } catch (error) {
    const diagnostic = await evaluate(
      `({ url: location.href, ui: document.querySelector('.app-content')?.innerText ?? document.body.innerText, knownSession: sessionStorage.getItem(${JSON.stringify(marker)}) })`,
    );
    console.error(
      "B.1 browser failure:",
      diagnostic,
      calls.slice(-5).map(({ path, method }) => ({ path, method })),
    );
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(
      join(profile, "b1-failure.png"),
      Buffer.from(data, "base64"),
    );
    throw error;
  } finally {
    await send("Fetch.disable");
    socket.removeEventListener("message", intercept);
  }
}
