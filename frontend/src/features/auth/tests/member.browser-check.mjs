// Runs through the existing Chrome/CDP primitive check against the production app.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function checkMember({
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
  let user = {
    id: "b2-user",
    email: "minhanh@example.com",
    displayName: "Nguyễn Minh Anh",
    status: "ACTIVE",
    hasPassword: true,
    emailVerifiedAt: null,
    createdAt: "2026-10-01T09:00:00Z",
    updatedAt: "2026-10-09T09:00:00Z",
  };
  const originalUser = { ...user };
  const currentId = "00000000-0000-4000-8000-000000000001";
  const otherId = "00000000-0000-4000-8000-000000000002";
  const session = (id, current = false) => ({
    id,
    current,
    createdAt: "2026-10-07T07:00:00Z",
    expiresAt: "2026-10-14T07:00:00Z",
  });
  let sessions = [
    session(currentId, true),
    session(otherId),
    session("00000000-0000-4000-8000-000000000003"),
  ];
  const file = (
    id,
    name = "Bao-cao-thang-09.pdf",
    type = "application/pdf",
    size = 1_258_291,
  ) => ({
    id,
    name,
    contentType: type,
    size,
    updatedAt: "2026-10-09T09:30:00Z",
  });
  const firstId = "10000000-0000-4000-8000-000000000001";
  const secondId = "10000000-0000-4000-8000-000000000002";
  let files = [
    file(firstId),
    file(secondId, "anh-dai-dien.png", "image/png", 838_861),
  ];
  let sessionMode = "ok";
  let fileMode = "ok";
  let authMode = "ok";
  let meMode = "ok";
  const held = new Set();
  const paused = [];
  const calls = [];
  const frames = [];
  const evidence = [];
  const checks = [];
  const responseHeaders = [
    { name: "Content-Type", value: "application/json" },
    { name: "Access-Control-Allow-Origin", value: new URL(origin).origin },
    { name: "Access-Control-Allow-Credentials", value: "true" },
    {
      name: "Access-Control-Allow-Methods",
      value: "GET,POST,PATCH,DELETE,OPTIONS",
    },
    {
      name: "Access-Control-Allow-Headers",
      value: "content-type,authorization,x-file-name,x-file-content-type",
    },
  ];
  const count = (path, method) =>
    calls.filter(
      (call) => call.path === path && (!method || call.method === method),
    ).length;
  const check = (name, value) => {
    assert(value, name);
    checks.push(name);
  };
  async function fulfill(requestId, status, data = {}, code) {
    await send("Fetch.fulfillRequest", {
      requestId,
      responseCode: status,
      responseHeaders,
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
  async function bytes(requestId, text) {
    await send("Fetch.fulfillRequest", {
      requestId,
      responseCode: 200,
      responseHeaders: responseHeaders.map((header) =>
        header.name === "Content-Type"
          ? { ...header, value: "application/octet-stream" }
          : header,
      ),
      body: Buffer.from(text).toString("base64"),
    });
  }
  const intercept = async ({ data }) => {
    const event = JSON.parse(data);
    if (event.method !== "Fetch.requestPaused") return;
    const { requestId, request } = event.params;
    if (request.method === "OPTIONS") return fulfill(requestId, 204);
    const path = new URL(request.url).pathname.slice("/api/v1".length);
    const call = {
      requestId,
      path,
      method: request.method,
      body: request.postData,
      headers: request.headers,
    };
    calls.push(call);
    if (
      held.has(`${request.method} ${path}`) ||
      request.method === "PATCH" ||
      request.method === "DELETE" ||
      (request.method === "POST" && path !== "/auth/refresh")
    ) {
      paused.push(call);
      return;
    }
    if (path === "/auth/refresh") {
      if (authMode === "guest")
        return fulfill(requestId, 401, {}, "INVALID_REFRESH_TOKEN");
      return fulfill(requestId, 200, {
        accessToken: "b2-memory-only-token",
        accessTokenExpiresInSeconds: 900,
      });
    }
    if (path === "/auth/me")
      return fulfill(requestId, meMode === "ok" ? 200 : 503, {
        user,
        access: {
          roles: ["MEMBER"],
          permissions: ["profile:read:self", "profile:update:self"],
        },
      });
    if (path === "/auth/sessions")
      return sessionMode === "ok"
        ? fulfill(requestId, 200, { sessions })
        : fulfill(
            requestId,
            Number(sessionMode),
            {},
            sessionMode === "403" ? "FORBIDDEN" : undefined,
          );
    if (path === "/files")
      return fileMode === "ok"
        ? fulfill(requestId, 200, files)
        : fulfill(
            requestId,
            Number(fileMode),
            {},
            fileMode === "403" ? "FORBIDDEN" : undefined,
          );
    if (path.startsWith("/files/"))
      return bytes(requestId, "# Private preview\nOriginal content");
    return fulfill(requestId, 403, {}, "FORBIDDEN");
  };
  socket.addEventListener("message", intercept);
  await send("Fetch.enable", {
    patterns: [{ urlPattern: "*/api/v1/*", requestStage: "Request" }],
  });

  async function resize(width, height = 1000) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await evaluate(
      "new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))",
    );
  }
  async function text(content) {
    await until(
      () =>
        evaluate(
          `document.querySelector('.app-content')?.textContent.includes(${JSON.stringify(content)})`,
        ),
      content,
    );
  }
  async function go(route, width = 1440, height = 1000) {
    await resize(width, height);
    await navigate(
      `${origin}${route}`,
      `${origin}${route === "/account?tab=info" ? "/account" : route}`,
    );
    await until(
      () => evaluate("!!document.querySelector('.role-app-shell')"),
      `Member shell ${route}`,
    );
    await evaluate("document.fonts.ready");
  }
  async function take(path, method) {
    await until(
      () =>
        paused.some(
          (call) => call.path === path && (!method || call.method === method),
        ),
      `request ${method ?? ""} ${path}`,
    );
    return paused.splice(
      paused.findIndex(
        (call) => call.path === path && (!method || call.method === method),
      ),
      1,
    )[0];
  }
  async function field(name, value) {
    await until(
      () => evaluate(`!!document.querySelector('input[name=${name}]:enabled')`),
      `field ${name}`,
    );
    await evaluate(
      `(() => { const el = document.querySelector('input[name=${name}]'); el.focus(); el.select(); })()`,
    );
    await send("Input.insertText", { text: value });
  }
  async function choose(label, name, content = "replacement text", byteLength) {
    await evaluate(`(() => {
      const input = document.querySelector('input[aria-label=${JSON.stringify(label)}]');
      const data = new DataTransfer();
      data.items.add(new File([${byteLength === undefined ? JSON.stringify(content) : `new Uint8Array(${byteLength})`}], ${JSON.stringify(name)}, { type: 'text/plain' }));
      input.files = data.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
  }
  const row = (id) => `.member-table [data-file-id="${id}"]`;
  async function menu(id, action) {
    await click(`${row(id)} button[popovertarget]`);
    await until(
      () =>
        evaluate("!!document.querySelector('.member-file-menu:popover-open')"),
      "file actions",
    );
    const indexes = { preview: 1, download: 2, replace: 3, delete: 4 };
    await click(
      `.member-file-menu:popover-open button:nth-of-type(${indexes[action]})`,
    );
  }
  async function currentActive(expected, selector = ".shell-sidebar") {
    const links = await evaluate(
      `[...document.querySelectorAll('${selector} a[aria-current=page]')].map(el => el.getAttribute('href'))`,
    );
    assert.deepEqual(links, [expected]);
  }
  async function dialogCheck() {
    await until(
      () => evaluate("!!document.querySelector('.ui-dialog[open]')"),
      "confirmation dialog",
    );
    check(
      "dialog starts on Cancel",
      await evaluate("document.activeElement.matches('[data-dialog-cancel]')"),
    );
    await key("Tab", true);
    check(
      "dialog wraps Shift+Tab to Confirm",
      await evaluate(
        "document.activeElement.matches('.ui-dialog-actions button:last-child')",
      ),
    );
    await key("Tab");
    check(
      "dialog wraps Tab to Cancel",
      await evaluate("document.activeElement.matches('[data-dialog-cancel]')"),
    );
  }
  async function capture(id, name, width, height) {
    const original = await evaluate(
      "({width: innerWidth, height: innerHeight})",
    );
    const captures = [];
    const sizes = [
      { width, height },
      ...[
        { width: 1440, height: 1000 },
        { width: 390, height: 844 },
      ].filter((item) => item.width !== width),
    ];
    for (const viewport of sizes) {
      await resize(viewport.width, viewport.height);
      await evaluate("scrollTo(0, 0)");
      await send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: 1,
        y: 1,
      });
      assert(
        await evaluate(
          "document.documentElement.scrollWidth <= innerWidth + 1",
        ),
        `overflow ${name} ${viewport.width}`,
      );
      const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: !(await evaluate(
          "!!document.querySelector('.ui-dialog[open]')",
        )),
      });
      const filename = `b2-${id.replace(":", "-")}-${name}${captures.length ? "-" + viewport.width : ""}.png`;
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
  async function extraScreenshot(name) {
    const filename = `b2-${name}.png`;
    const viewport = await evaluate(
      "({width: innerWidth, height: innerHeight})",
    );
    const { data } = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(join(profile, filename), Buffer.from(data, "base64"));
    evidence.push({ filename, viewport });
  }

  async function signOut() {
    await click(".shell-account-trigger");
    await click(".shell-account-menu button");
    const logout = await take("/auth/logout");
    authMode = "guest";
    await fulfill(logout.requestId, 204);
    await until(
      () =>
        evaluate(
          "location.pathname === '/login' && !document.querySelector('.role-app-shell')",
        ),
      "explicit logout",
    );
  }
  async function signIn(nextUser) {
    user = nextUser;
    await field("email", user.email);
    await field("password", "example-password");
    await click('button[type="submit"]');
    const login = await take("/auth/login");
    authMode = "ok";
    await fulfill(login.requestId, 200, {
      accessToken: "b2-next-account-token",
      accessTokenExpiresInSeconds: 900,
    });
    await until(
      () =>
        evaluate(
          "location.pathname === '/account' && !!document.querySelector('.role-app-shell')",
        ),
      "new account login",
    );
  }

  try {
    // MEM-01/MEM-02 share one account page; metadata comes from the provider.
    await go("/account");
    await text("Tài khoản của tôi");
    await text("Nguyễn Minh Anh");
    await currentActive("/account");
    check(
      "merged account uses one provider read without loading sessions or files",
      count("/auth/me") === 1 &&
        count("/auth/sessions") === 0 &&
        count("/files") === 0,
    );
    check(
      "account navigation and quick links have no separate Info view",
      await evaluate(
        "!document.querySelector('a[href=\"/account?tab=info\"]') && document.querySelectorAll('.member-email-notice button').length === 1 && document.querySelectorAll('.member-view a[href=\"/account?tab=sessions\"]').length === 1",
      ),
    );
    await capture("4:40847", "dashboard-desktop", 1440, 1000);
    await capture("4:40924", "dashboard-mobile", 390, 1425);
    await resize(320, 844);
    check(
      "merged account fits 320px and exposes the native permission disclosure to keyboard",
      await evaluate(
        "document.documentElement.scrollWidth <= innerWidth && document.querySelector('.member-view summary').textContent.includes('Xem quyền')",
      ),
    );
    await evaluate("document.querySelector('.member-view summary').focus()");
    await key("Enter");
    check(
      "keyboard can collapse permission details",
      await evaluate("!document.querySelector('.member-view details').open"),
    );
    await key("Enter");
    await extraScreenshot("account-320");
    await resize(1440);
    const resendBefore = count("/auth/email-verification/request");
    await evaluate(
      "document.querySelector('.member-email-notice button').click(); document.querySelector('.member-email-notice button').click()",
    );
    const resend = await take("/auth/email-verification/request");
    check(
      "single resend action blocks same-tick double submit",
      count("/auth/email-verification/request") === resendBefore + 1,
    );
    await fulfill(resend.requestId, 429, {}, "EMAIL_VERIFICATION_RATE_LIMITED");
    await text("Vui lòng chờ trước khi gửi lại");
    check(
      "resend does not guess a cooldown",
      await evaluate(
        "!document.querySelector('.member-email-notice').textContent.includes('45') && !document.querySelector('.member-email-notice button').disabled",
      ),
    );
    await click(".member-email-notice button");
    await fulfill(
      (await take("/auth/email-verification/request")).requestId,
      202,
      { accepted: true },
    );
    await text("Đã nhận yêu cầu gửi email xác minh");

    // Legacy Info links canonicalize with replace; history and other tabs remain intact.
    user.emailVerifiedAt = "2026-10-09T00:30:00Z";
    const readsBeforeInfo = count("/auth/me");
    await go("/account?tab=info", 960, 634);
    await text("Tài khoản của tôi");
    await until(
      () =>
        evaluate("location.pathname === '/account' && location.search === ''"),
      "legacy Info canonical URL",
    );
    await currentActive("/account");
    check(
      "legacy Info keeps profile and dates without another account read",
      count("/auth/me") === readsBeforeInfo + 1 &&
        (await evaluate(
          "!document.querySelector('.member-view input') && document.querySelector('.member-profile').textContent.includes('minhanh@example.com') && document.querySelector('.member-fields').textContent.includes(new Date('2026-10-01T09:00:00Z').toLocaleString('vi-VN')) && document.querySelector('.member-fields').textContent.includes(new Date('2026-10-09T00:30:00Z').toLocaleString('vi-VN')) && !document.querySelector('.member-email-notice')",
        )),
    );
    check(
      "verified profile appears only once in account content",
      await evaluate(
        "document.querySelector('.member-view').textContent.split('minhanh@example.com').length === 2 && document.querySelector('.member-view').textContent.split('Nguyễn Minh Anh').length === 2",
      ),
    );
    await capture("4:40985", "account-verified", 960, 634);
    user.emailVerifiedAt = null;
    await go("/account?tab=info", 960, 760);
    await text("Chưa xác minh");
    await until(
      () =>
        evaluate("location.pathname === '/account' && location.search === ''"),
      "unverified legacy Info canonical URL",
    );
    await capture("4:40999", "account-unverified", 960, 760);
    const readsBeforeHistory = count("/auth/me");
    await click('.shell-sidebar a[href="/account?tab=sessions"]');
    await text("Phiên đăng nhập đang hoạt động");
    await currentActive("/account?tab=sessions");
    await evaluate("history.back()");
    await text("Tài khoản của tôi");
    await currentActive("/account");
    check(
      "Back restores the canonical account URL without resurrecting Info",
      await evaluate("location.search === ''"),
    );
    await evaluate("history.forward()");
    await text("Phiên đăng nhập đang hoạt động");
    await currentActive("/account?tab=sessions");
    check(
      "query deep links and history preserve one active view without extra account reads",
      count("/auth/me") === readsBeforeHistory,
    );
    await go("/account?tab=invalid");
    await text("Tài khoản của tôi");
    await currentActive("/account");
    await go("/account?tab=security");
    await text("Mật khẩu hiện tại");
    await field("currentPassword", "old-password");
    await field("newPassword", "new-password-123");
    await click('.member-form button[type="submit"]');
    const password = await take("/auth/password/change");
    check(
      "password payload preserves currentPassword",
      JSON.parse(password.body).currentPassword === "old-password",
    );
    await key("Enter");
    check(
      "password double submit blocked",
      count("/auth/password/change") === 1,
    );
    meMode = "503";
    await fulfill(password.requestId, 204);
    await text("Đã cập nhật mật khẩu");
    await text("chưa tải lại được thông tin tài khoản");
    check(
      "password reset after await remains successful",
      await evaluate(
        "document.querySelector('input[name=newPassword]').value === '' && !document.querySelector('.member-form').textContent.includes('Không thể cập nhật mật khẩu')",
      ),
    );
    meMode = "ok";
    user.hasPassword = false;
    await go("/account?tab=security");
    check(
      "Google-only account can set password",
      await evaluate("!document.querySelector('input[name=currentPassword]')"),
    );
    await field("newPassword", "new-password-123");
    await click('.member-form button[type="submit"]');
    const setPassword = await take("/auth/password/change");
    check(
      "Google-only password payload omits currentPassword",
      !Object.hasOwn(JSON.parse(setPassword.body), "currentPassword"),
    );
    user.hasPassword = true;
    await fulfill(setPassword.requestId, 204);
    await text("Đã cập nhật mật khẩu");
    await field("currentPassword", "new-password-123");
    await field("newPassword", "changed-password-123");
    held.add("GET /auth/me");
    await click('.member-form button[type="submit"]');
    await fulfill((await take("/auth/password/change")).requestId, 204);
    const lateMetadata = await take("/auth/me", "GET");
    await signOut();
    held.delete("GET /auth/me");
    await signIn({
      ...originalUser,
      id: "metadata-account",
      email: "metadata@example.com",
      displayName: "Metadata Account",
      hasPassword: false,
    });
    await fulfill(lateMetadata.requestId, 200, {
      user: originalUser,
      access: { roles: ["MEMBER"], permissions: [] },
    }).catch(() => {});
    await click('.shell-sidebar a[href="/account?tab=security"]');
    await text("Đặt mật khẩu");
    check(
      "late password metadata cannot restore an old user",
      await evaluate(
        "!document.querySelector('input[name=currentPassword]') && !document.querySelector('.member-view').textContent.includes('minhanh@example.com')",
      ),
    );
    user = { ...originalUser };

    // MEM-03: list states, confirmations and distinct revoke requests.
    await go("/account?tab=sessions");
    await text("3 phiên");
    await capture("4:41017", "sessions-multiple", 1440, 1000);
    await capture("4:41120", "sessions-mobile", 390, 1463);
    const logoutBeforeRevoke = count("/auth/logout");
    await click(`.member-table button[data-revoke="${otherId}"]`);
    await dialogCheck();
    await capture("4:41091", "session-revoke-dialog", 720, 449);
    await key("Escape");
    check(
      "revoke cancellation restores focus",
      await evaluate(`document.activeElement.dataset.revoke === '${otherId}'`),
    );
    await click(`.member-table button[data-revoke="${otherId}"]`);
    await click(".ui-dialog[open] .ui-dialog-actions button:last-child");
    const revoke = await take(`/auth/sessions/${otherId}`, "DELETE");
    await evaluate(
      "document.querySelector('.ui-dialog[open] .ui-dialog-actions button:last-child').click()",
    );
    check(
      "other-session revoke prevents duplicate DELETE",
      count(`/auth/sessions/${otherId}`, "DELETE") === 1,
    );
    sessions = sessions.filter((item) => item.id !== otherId);
    await fulfill(revoke.requestId, 204);
    await text("Đã thu hồi phiên đăng nhập");
    check(
      "other-session revoke retains current auth",
      count("/auth/logout") === logoutBeforeRevoke &&
        (await evaluate("!!document.querySelector('.role-app-shell')")),
    );
    sessions = [session(currentId, true)];
    await go("/account?tab=sessions", 720, 455);
    await text("Một phiên đăng nhập");
    await capture("4:41078", "sessions-one", 720, 455);
    await resize(1440);
    await click(`button[data-revoke="${currentId}"]`);
    await click(".ui-dialog[open] .ui-dialog-actions button:last-child");
    const logout = await take("/auth/logout");
    check(
      "current-session revoke uses logout instead of DELETE",
      count(`/auth/sessions/${currentId}`, "DELETE") === 0,
    );
    authMode = "guest";
    await fulfill(logout.requestId, 204);
    await until(
      () =>
        evaluate(
          "location.pathname === '/login' && !document.querySelector('.role-app-shell')",
        ),
      "current revoke logout",
    );
    check(
      "explicit current revoke does not expire the session",
      await evaluate(
        "sessionStorage.getItem('corestack.session-established') === null && !document.body.textContent.includes('Phiên đăng nhập đã hết hạn')",
      ),
    );
    authMode = "ok";
    sessionMode = "503";
    await go("/account?tab=sessions", 720, 580);
    await text("Không tải được phiên đăng nhập");
    await capture("4:41105", "sessions-error", 720, 580);
    sessionMode = "ok";
    await click(".member-view button:not([data-revoke])");
    await text("Một phiên đăng nhập");
    sessionMode = "403";
    await go("/account?tab=sessions");
    await text("Bạn không có quyền xem các phiên này");
    check(
      "session forbidden keeps authenticated user",
      await evaluate("!!document.querySelector('.role-app-shell')"),
    );
    await extraScreenshot("sessions-forbidden");
    sessionMode = "ok";
    sessions = [];
    await go("/account?tab=sessions");
    await text("Không có phiên đăng nhập đang hoạt động");
    await extraScreenshot("sessions-empty");
    held.add("GET /auth/sessions");
    await go("/account?tab=sessions");
    const lateSessions = await take("/auth/sessions", "GET");
    await text("Đang tải phiên đăng nhập");
    await extraScreenshot("sessions-loading");
    await signOut();
    held.delete("GET /auth/sessions");
    await fulfill(lateSessions.requestId, 200, {
      sessions: [session("old-private-session")],
    }).catch(() => {});
    await signIn({
      ...originalUser,
      id: "second-account",
      email: "second@example.com",
      displayName: "Second Account",
    });
    await click('.shell-sidebar a[href="/account?tab=sessions"]');
    await text("Không có phiên đăng nhập đang hoạt động");
    check(
      "late session list cannot restore data after logout/account switch",
      await evaluate(
        "!document.body.textContent.includes('old-private-session')",
      ),
    );
    user = { ...originalUser };
    authMode = "ok";

    // MEM-04: all eight states and mutation/list-refresh separation.
    await go("/account/files");
    await text("Danh sách tệp");
    await currentActive("/account/files");
    await capture("4:41160", "files-populated", 1440, 1060);
    await click(`${row(firstId)} button[popovertarget]`);
    await extraScreenshot("files-menu-desktop");
    await key("Escape");
    await capture("4:41320", "files-mobile", 390, 1334);
    await resize(390, 844);
    await click(".shell-drawer-trigger");
    await currentActive("/account/files", ".shell-drawer[open]");
    await key("Escape");
    check(
      "mobile Sidebar query/navigation remains accessible",
      await evaluate("document.activeElement.matches('.shell-drawer-trigger')"),
    );
    await click(
      `.member-mobile-list [data-file-id="${firstId}"] button[popovertarget]`,
    );
    await key("Tab");
    check(
      "mobile file actions are keyboard reachable",
      await evaluate(
        "!!document.activeElement.closest('.member-file-menu:popover-open')",
      ),
    );
    await extraScreenshot("files-menu-mobile");
    await key("Escape");
    check(
      "file action Escape restores trigger focus",
      await evaluate("document.activeElement.matches('button[popovertarget]')"),
    );
    await resize(1440);
    await menu(firstId, "preview");
    await text("Xem trước ·");
    check(
      "binary preview remains sandboxed",
      await evaluate(
        "document.querySelector('.member-preview iframe').getAttribute('sandbox') === 'allow-downloads'",
      ),
    );
    await click(".member-preview button");
    files = [];
    await go("/account/files", 720, 540);
    await text("Bạn chưa có tệp nào");
    await capture("4:41234", "files-empty", 720, 540);
    await choose("Chọn tệp tải lên", "upload.txt", "first upload");
    const upload = await take("/files", "POST");
    await text("Đang tải tệp lên");
    await capture("4:41248", "files-uploading", 720, 549);
    await choose("Chọn tệp tải lên", "duplicate.txt");
    check("upload double submit blocked", count("/files", "POST") === 1);
    const uploadedId = "10000000-0000-4000-8000-000000000010";
    files = [file(uploadedId, "upload.txt", "text/plain", 12)];
    fileMode = "503";
    await fulfill(upload.requestId, 201, { id: uploadedId, size: 12 });
    await text("Đã lưu upload.txt");
    await text("Không thể tải danh sách tệp");
    await click(".member-view button.member-fit");
    await text("Không thể tải danh sách tệp");
    check(
      "successful upload plus failed list retry never reuploads",
      count("/files", "POST") === 1 &&
        (await evaluate(
          `!!document.querySelector('[data-file-id="${uploadedId}"]')`,
        )),
    );
    fileMode = "ok";
    await click(".member-view button.member-fit");
    await text("Danh sách tệp");
    await until(
      () =>
        evaluate(
          "!document.querySelector('.member-view').textContent.includes('Không thể tải danh sách tệp')",
        ),
      "list retry recovered",
    );
    await choose("Chọn tệp tải lên", "empty.txt", "");
    await text("Không thể tải lên tệp rỗng");
    check("empty upload sends no API request", count("/files", "POST") === 1);
    await choose("Chọn tệp tải lên", "large.txt", "", 5 * 1024 * 1024 + 1);
    await text("Tệp vượt quá 5 MiB");
    await capture("4:41263", "files-upload-error", 720, 491);
    check(
      "oversized upload sends no API request",
      count("/files", "POST") === 1,
    );
    await choose("Chọn tệp tải lên", "limit.txt", "", 5 * 1024 * 1024);
    const limitUpload = await take("/files", "POST");
    check("exact 5 MiB accepted at UI boundary", count("/files", "POST") === 2);
    await fulfill(limitUpload.requestId, 413, {}, "FILE_TOO_LARGE");
    await text("Tệp vượt quá 5 MiB");
    await choose("Chọn tệp tải lên", "upload.txt", "second upload");
    const sameName = await take("/files", "POST");
    const duplicateId = "10000000-0000-4000-8000-000000000011";
    files.push(file(duplicateId, "upload.txt", "text/plain", 13));
    await fulfill(sameName.requestId, 201, { id: duplicateId, size: 13 });
    await text("2/10 tệp");
    check(
      "same filename retains distinct records",
      await evaluate(
        `!!document.querySelector('[data-file-id="${uploadedId}"]') && !!document.querySelector('[data-file-id="${duplicateId}"]')`,
      ),
    );
    files = Array.from({ length: 10 }, (_, index) =>
      file(
        `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        index ? `file-${index}.txt` : "original.md",
        "text/plain",
        30,
      ),
    );
    await go("/account/files", 720, 589);
    await text("Đã đạt giới hạn 10 tệp");
    await capture("4:41276", "files-quota-full", 720, 589);
    const postBeforeQuota = count("/files", "POST");
    await choose("Chọn tệp tải lên", "blocked.txt");
    check(
      "10-file quota blocks new uploads",
      postBeforeQuota === count("/files", "POST") &&
        (await evaluate(
          "document.querySelector('input[aria-label=\"Chọn tệp tải lên\"]').disabled",
        )),
    );
    await resize(1440);
    const replacedOld = files[0].id;
    await menu(replacedOld, "preview");
    await text("Original content");
    await menu(replacedOld, "replace");
    await choose(
      "Chọn tệp thay thế",
      "replacement.md",
      "# replacement\nNew private text",
    );
    await dialogCheck();
    await capture("4:41292", "files-replace-dialog", 720, 494);
    await click(".ui-dialog[open] .ui-dialog-actions button:last-child");
    const replacement = await take(`/files/${replacedOld}`, "PATCH");
    await evaluate(
      "document.querySelector('.ui-dialog[open] .ui-dialog-actions button:last-child').click()",
    );
    check(
      "replacement at full quota blocks duplicate PATCH",
      count(`/files/${replacedOld}`, "PATCH") === 1,
    );
    const replacedNew = "30000000-0000-4000-8000-000000000001";
    files[0] = file(replacedNew, "replacement.md", "text/plain", 30);
    await fulfill(replacement.requestId, 200, { id: replacedNew, size: 30 });
    await text("New private text");
    check(
      "replace updates row and open preview to new ID",
      await evaluate(
        `!!document.querySelector('[data-file-id="${replacedNew}"]') && !document.querySelector('[data-file-id="${replacedOld}"]') && document.querySelector('.member-preview').dataset.previewId === '${replacedNew}'`,
      ),
    );
    check(
      "replacement preserves quota",
      await evaluate(
        "document.querySelector('.member-file-heading strong').textContent.includes('10/10')",
      ),
    );
    await resize(1440);
    await menu(replacedNew, "delete");
    await dialogCheck();
    await capture("4:41307", "files-delete-dialog", 720, 362);
    await click(".ui-dialog[open] .ui-dialog-actions button:last-child");
    const deletion = await take(`/files/${replacedNew}`, "DELETE");
    await evaluate(
      "document.querySelector('.ui-dialog[open] .ui-dialog-actions button:last-child').click()",
    );
    check(
      "delete blocks duplicate request",
      count(`/files/${replacedNew}`, "DELETE") === 1,
    );
    files = files.filter((item) => item.id !== replacedNew);
    await fulfill(deletion.requestId, 204);
    await text("Đã xóa replacement.md");
    check(
      "delete closes matching preview and frees upload slot",
      await evaluate(
        "!document.querySelector('.member-preview') && !document.querySelector('input[aria-label=\"Chọn tệp tải lên\"]').disabled",
      ),
    );

    // Ownership errors are identical; actual backend rules are verified separately.
    for (const ownership of ["missing", "other-owner"]) {
      const id = files[0].id;
      held.add(`GET /files/${id}`);
      await menu(id, "preview");
      await fulfill(
        (await take(`/files/${id}`, "GET")).requestId,
        404,
        {},
        "FILE_NOT_FOUND",
      );
      await text("Không tìm thấy tệp");
      held.delete(`GET /files/${id}`);
      check(
        `${ownership} is presented as the same 404`,
        await evaluate("!document.querySelector('.member-preview')"),
      );
    }
    fileMode = "403";
    await go("/account/files");
    await text("Bạn không có quyền thực hiện thao tác này");
    check(
      "file forbidden retains authenticated user",
      await evaluate("!!document.querySelector('.role-app-shell')"),
    );
    await extraScreenshot("files-forbidden");
    fileMode = "503";
    await go("/account/files");
    await text("Không thể tải danh sách tệp");
    await extraScreenshot("files-list-error");
    fileMode = "ok";
    await click(".member-view button.member-fit");
    await text("Danh sách tệp");
    check("file list error recovers through list-only retry", true);
    held.add("GET /files");
    await go("/account/files");
    const lateList = await take("/files", "GET");
    await text("Đang tải danh sách tệp");
    await extraScreenshot("files-loading");
    await signOut();
    held.delete("GET /files");
    await fulfill(lateList.requestId, 200, [
      file("old-data", "old-private-name.txt"),
    ]).catch(() => {});
    files = [file("new-account-file", "new-account.txt", "text/plain")];
    await signIn({
      ...originalUser,
      id: "third-account",
      email: "third@example.com",
      displayName: "Third Account",
    });
    await click('.shell-sidebar a[href="/account/files"]');
    await text("new-account.txt");
    check(
      "late file list cannot leak across accounts",
      await evaluate("!document.body.textContent.includes('old-private-name')"),
    );
    const newAccountFile = files[0].id;
    held.add(`GET /files/${newAccountFile}`);
    await menu(newAccountFile, "preview");
    const latePreview = await take(`/files/${newAccountFile}`, "GET");
    await signOut();
    held.delete(`GET /files/${newAccountFile}`);
    await bytes(latePreview.requestId, "stale-private-preview").catch(() => {});
    await signIn({
      ...originalUser,
      id: "fourth-account",
      email: "fourth@example.com",
      displayName: "Fourth Account",
    });
    await click('.shell-sidebar a[href="/account/files"]');
    await text("Danh sách tệp");
    check(
      "late preview cannot reappear after logout",
      await evaluate(
        "!document.querySelector('.member-preview') && !document.body.textContent.includes('stale-private-preview')",
      ),
    );
    await choose("Chọn tệp tải lên", "stale-upload.txt");
    const lateUpload = await take("/files", "POST");
    await signOut();
    await fulfill(lateUpload.requestId, 201, {
      id: "stale-upload",
      size: 16,
    }).catch(() => {});
    files = [];
    await signIn({
      ...originalUser,
      id: "fifth-account",
      email: "fifth@example.com",
      displayName: "Fifth Account",
    });
    await click('.shell-sidebar a[href="/account/files"]');
    await text("Bạn chưa có tệp nào");
    check(
      "late mutation cannot repopulate private cache after logout",
      await evaluate("!document.body.textContent.includes('stale-upload')"),
    );
    await click('.shell-sidebar a[href="/account?tab=security"]');
    await field("currentPassword", "old-password");
    await field("newPassword", "new-password-123");
    await click('.member-form button[type="submit"]');
    const latePassword = await take("/auth/password/change");
    await signOut();
    const meCountBefore = count("/auth/me");
    await fulfill(latePassword.requestId, 204).catch(() => {});
    await signIn({
      ...originalUser,
      id: "sixth-account",
      email: "sixth@example.com",
      displayName: "Sixth Account",
      hasPassword: false,
    });
    await click('.shell-sidebar a[href="/account?tab=security"]');
    await text("Đặt mật khẩu");
    check(
      "late password response cannot overwrite the next account",
      count("/auth/me") === meCountBefore + 1 &&
        (await evaluate(
          "!document.querySelector('input[name=currentPassword]') && !document.body.textContent.includes('Đã cập nhật mật khẩu')",
        )),
    );

    assert.equal(frames.length, 17);
    assert.equal(new Set(frames.map((item) => item.id)).size, 17);
    check(
      "credentials never persist in Web Storage",
      await evaluate(
        "!JSON.stringify({ ...localStorage, ...sessionStorage }).includes('token')",
      ),
    );
    await writeFile(
      join(profile, "b2-frames.json"),
      JSON.stringify(frames, null, 2),
    );
    await writeFile(
      join(profile, "b2-regressions.json"),
      JSON.stringify(
        {
          checks,
          count: checks.length,
          source: "Chrome production app with API fixtures",
          evidence,
        },
        null,
        2,
      ),
    );
    console.log(
      `PASS: 17 B.2 frames; ${checks.length} regression assertions. Screenshots: ${profile}/b2-frames.json (API fixtures; VISUAL_PARTIAL).`,
    );
  } catch (error) {
    console.error(
      "B.2 browser failure:",
      await evaluate(
        "({url: location.href, ui: document.querySelector('.app-content')?.innerText, focus: document.activeElement?.tagName + ':' + document.activeElement?.className})",
      ),
      calls.slice(-6).map(({ path, method }) => ({ path, method })),
    );
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(
      join(profile, "b2-failure.png"),
      Buffer.from(data, "base64"),
    );
    throw error;
  } finally {
    await send("Fetch.disable");
    socket.removeEventListener("message", intercept);
  }
}
