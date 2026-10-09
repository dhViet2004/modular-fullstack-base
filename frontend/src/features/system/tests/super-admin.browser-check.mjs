// Production Chrome/CDP with HTTP fixtures; live JWT, DB and provider integration is not exercised.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function checkSuperAdmin({
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
  const uuid = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
  const originalUsers = ["Nguyễn Minh Anh", "Trần Quốc Bảo", "Lê Thu Hà"].map(
    (displayName, i) => ({
      id: uuid(i + 1),
      displayName,
      email: ["minhanh", "baotq", "halth"][i] + "@example.com",
      status: "ACTIVE",
      roles:
        i === 1
          ? ["MEMBER", "ADMIN"]
          : i === 2
            ? ["MEMBER", "SUPER_ADMIN"]
            : ["MEMBER"],
      emailVerifiedAt: i ? "2026-10-01T08:00:00Z" : null,
      createdAt: "2026-10-01T08:00:00Z",
      updatedAt: "2026-10-09T08:00:00Z",
    }),
  );
  let users = structuredClone(originalUsers);
  let user = { ...originalUsers[2], id: uuid(100), hasPassword: true };
  let roles = ["SUPER_ADMIN"];
  let permissions = ["users:read", "audit:read", "roles:manage"];
  let authMode = "ok",
    usersMode = "ok",
    readMode = "ok",
    enabled = true;
  const settingPath = "/system/email-verification";
  const rolePath = "/users/" + uuid(1) + "/roles/admin";
  const calls = [],
    paused = [],
    frames = [],
    checks = [],
    evidence = [];
  const held = new Set();
  const headers = [
    { name: "Content-Type", value: "application/json" },
    { name: "Access-Control-Allow-Origin", value: new URL(origin).origin },
    { name: "Access-Control-Allow-Credentials", value: "true" },
    {
      name: "Access-Control-Allow-Methods",
      value: "GET,POST,PATCH,DELETE,OPTIONS",
    },
    {
      name: "Access-Control-Allow-Headers",
      value: "content-type,authorization",
    },
  ];
  const check = (name, value) => {
    assert(value, name);
    checks.push(name);
  };
  const count = (path, method) =>
    calls.filter((c) => c.path === path && (!method || c.method === method))
      .length;
  const me = () => ({ user, access: { roles, permissions } });
  async function fulfill(id, status, data = {}, code) {
    await send("Fetch.fulfillRequest", {
      requestId: id,
      responseCode: status,
      responseHeaders: headers,
      ...(status === 204
        ? {}
        : {
            body: Buffer.from(
              JSON.stringify({
                success: status < 400,
                ...(code ? { error: { code } } : {}),
                data,
              }),
            ).toString("base64"),
          }),
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
      authorization:
        request.headers.Authorization ?? request.headers.authorization,
    };
    calls.push(call);
    if (
      held.has(request.method + " " + path) ||
      request.method === "PATCH" ||
      path === "/auth/logout" ||
      path === "/auth/login"
    ) {
      paused.push(call);
      return;
    }
    if (path === "/auth/refresh") {
      if (authMode === "guest")
        return fulfill(requestId, 401, {}, "INVALID_REFRESH_TOKEN");
      if (authMode === "503") return fulfill(requestId, 503);
      return fulfill(requestId, 200, {
        accessToken: "b4-token-" + user.id,
        accessTokenExpiresInSeconds: 900,
      });
    }
    if (path === "/auth/me") return fulfill(requestId, 200, me());
    if (path === "/users")
      return fulfill(
        requestId,
        usersMode === "ok" ? 200 : Number(usersMode),
        usersMode === "ok" ? { users } : {},
        usersMode === "403" ? "FORBIDDEN" : undefined,
      );
    if (path === settingPath)
      return fulfill(
        requestId,
        readMode === "ok" ? 200 : Number(readMode),
        readMode === "ok" ? { enabled } : {},
        readMode === "403" ? "FORBIDDEN" : undefined,
      );
    if (path === "/auth/sessions")
      return fulfill(requestId, 200, { sessions: [] });
    if (path === "/files") return fulfill(requestId, 200, []);
    return fulfill(requestId, 403, {}, "FORBIDDEN");
  };
  socket.addEventListener("message", intercept);
  await send("Fetch.enable", {
    patterns: [{ urlPattern: "*/api/v1/*", requestStage: "Request" }],
  });
  const text = (content) =>
    until(
      () =>
        evaluate(
          "document.body.textContent.includes(" + JSON.stringify(content) + ")",
        ),
      content,
    );
  const settle = () =>
    evaluate(
      "new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))",
    );
  async function resize(width, height = 1000) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await settle();
  }
  async function go(route, width = 1440, height = 1000) {
    await resize(width, height);
    await navigate(origin + route);
    await until(
      () => evaluate("!!document.querySelector('.role-app-shell')"),
      route + " shell",
    );
    await evaluate("document.fonts.ready");
  }
  async function take(path, method = "GET") {
    await until(
      () => paused.some((c) => c.path === path && c.method === method),
      "held " + method + " " + path,
    );
    return paused.splice(
      paused.findIndex((c) => c.path === path && c.method === method),
      1,
    )[0];
  }
  const dialog = () =>
    until(
      () => evaluate("!!document.querySelector('.ui-dialog[open]')"),
      "confirmation",
    );
  const confirm = async () => {
    await dialog();
    await click(".ui-dialog-actions button:last-child");
  };
  async function capture(id, name, width, height) {
    const previous = await evaluate("({width:innerWidth,height:innerHeight})");
    const captures = [];
    for (const size of [
      { width, height },
      ...[
        { width: 1440, height: 1000 },
        { width: 390, height: 844 },
      ].filter((s) => s.width !== width),
    ]) {
      await resize(size.width, size.height);
      await evaluate("scrollTo(0,0)");
      check(
        "responsive " + name + " " + size.width,
        await evaluate(
          "document.documentElement.scrollWidth<=innerWidth+1 && [...document.querySelectorAll('dialog[open]')].every(el=>el.scrollWidth<=el.clientWidth+1)",
        ),
      );
      const filename =
        "b4-" + id.replace(":", "-") + "-" + name + "-" + size.width + ".png";
      const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: !(await evaluate(
          "!!document.querySelector('dialog[open]')",
        )),
      });
      await writeFile(join(profile, filename), Buffer.from(data, "base64"));
      captures.push({ filename, viewport: size });
    }
    await resize(previous.width, previous.height);
    frames.push({
      id,
      name,
      ...captures[0],
      responsive: captures.slice(1),
      status: "FUNCTIONAL_DONE / VISUAL_PARTIAL",
    });
  }
  async function extra(name) {
    const filename = "b4-" + name + ".png";
    const { data } = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(join(profile, filename), Buffer.from(data, "base64"));
    evidence.push({ filename });
  }
  async function keyboard(title) {
    await dialog();
    check(
      title + " initial cancel focus",
      await evaluate("document.activeElement.matches('[data-dialog-cancel]')"),
    );
    const ax = await send("Accessibility.getFullAXTree");
    check(
      title + " accessible name",
      ax.nodes.some(
        (n) => n.role?.value === "alertdialog" && n.name?.value === title,
      ),
    );
    await key("Tab", true);
    check(
      title + " Shift+Tab wraps",
      await evaluate(
        "document.activeElement===document.querySelector('.ui-dialog-actions button:last-child')",
      ),
    );
    await key("Tab");
    check(
      title + " Tab wraps",
      await evaluate("document.activeElement.matches('[data-dialog-cancel]')"),
    );
  }
  async function restore() {
    await evaluate(
      "window.dispatchEvent(new CustomEvent('auth:refresh-failed',{detail:{isAxiosError:true,config:{url:'/auth/refresh'},response:{status:503}}}))",
    );
    await until(
      () =>
        evaluate("!!document.querySelector('.shell-main > .ui-alert button')"),
      "session recovery control",
    );
    await evaluate(
      "document.querySelector('.shell-main > .ui-alert button').click()",
    );
  }
  async function logout() {
    if (await evaluate("!!document.querySelector('.ui-dialog[open]')"))
      await evaluate(
        "document.querySelector('.shell-account-menu button').click()",
      );
    else {
      await click(".shell-account-trigger");
      await click(".shell-account-menu button");
    }
    const call = await take("/auth/logout", "POST");
    check(
      "logout closes confirmation before response",
      await evaluate("!document.querySelector('.ui-dialog[open]')"),
    );
    authMode = "guest";
    await fulfill(call.requestId, 204);
    await until(
      () =>
        evaluate(
          "location.pathname==='/login' && !document.querySelector('.role-app-shell')",
        ),
      "logout guest",
    );
    check(
      "intentional logout never renders expired",
      await evaluate(
        "!document.body.textContent.includes('Phiên đăng nhập đã hết hạn')",
      ),
    );
  }
  async function login(n) {
    user = {
      ...user,
      id: uuid(n),
      email: "account" + n + "@example.com",
      displayName: "Super Account " + n,
    };
    await evaluate("document.querySelector('input[name=email]').focus()");
    await send("Input.insertText", { text: user.email });
    await evaluate("document.querySelector('input[name=password]').focus()");
    await send("Input.insertText", { text: "example-password" });
    await click('button[type="submit"]');
    const call = await take("/auth/login", "POST");
    authMode = "ok";
    await fulfill(call.requestId, 200, {
      accessToken: "b4-login-" + n,
      accessTokenExpiresInSeconds: 900,
    });
    await until(
      () => evaluate("!!document.querySelector('.role-app-shell')"),
      "new account login",
    );
  }
  const action =
    '.admin-table [data-user-id="' + uuid(1) + '"] td:last-child button';
  const settingRoute = "/super-admin?tab=email-verification";
  const switchSelector = 'input[role="switch"]';
  try {
    // SUP-01: live boolean, permission-filtered links and unchanged shell.
    await go("/super-admin");
    await text("Trạng thái hiện tại: Đang bật.");
    check(
      "dashboard has five permitted cards",
      await evaluate(
        "document.querySelectorAll('.admin-dashboard-grid > .ui-card').length===5",
      ),
    );
    check(
      "dashboard consumes one scoped setting GET",
      count(settingPath, "GET") === 1,
    );
    await capture("4:41945", "dashboard-desktop", 1440, 1023);
    await capture("4:42007", "dashboard-mobile", 390, 1511);
    await go("/super-admin?tab=unknown");
    await text("Tổng quan siêu quản trị");
    check(
      "unknown tab selects dashboard",
      await evaluate(
        "document.querySelector('.shell-sidebar [aria-current=page]').getAttribute('href')==='/super-admin'",
      ),
    );

    // SUP-02: snapshot confirmation, exact payload, success separate from list reads.
    await go("/admin/users");
    await text(originalUsers[0].displayName);
    const before = count(rolePath, "PATCH");
    await click(action);
    await keyboard("Cấp quyền ADMIN?");
    check(
      "opening role confirmation sends no mutation",
      count(rolePath, "PATCH") === before,
    );
    await capture("4:42050", "role-grant-confirm", 720, 547);
    await key("Escape");
    await settle();
    check(
      "role confirmation Escape returns focus",
      await evaluate(
        "document.activeElement===document.querySelector(" +
          JSON.stringify(action) +
          ")",
      ),
    );
    await click(action);
    await confirm();
    const grant = await take(rolePath, "PATCH");
    await evaluate(
      "document.querySelector('.ui-dialog-actions button:last-child').click()",
    );
    check(
      "role pending locks double submit",
      count(rolePath, "PATCH") === before + 1 &&
        JSON.parse(grant.body).enabled === true,
    );
    await capture("4:42082", "role-pending", 720, 547);
    users = users.map((u) =>
      u.id === uuid(1) ? { ...u, roles: ["MEMBER", "ADMIN"] } : u,
    );
    await fulfill(grant.requestId, 200, { enabled: true });
    await text("Người dùng sau cập nhật");
    check(
      "role success displays the list record",
      await evaluate(
        "document.querySelector('.admin-updated-user').textContent.includes('Quản trị viên')",
      ),
    );
    await capture("4:42099", "role-success", 1440, 1032);
    await click(action);
    await keyboard("Thu hồi quyền ADMIN?");
    await capture("4:42066", "role-revoke-confirm", 720, 547);
    await confirm();
    const revoke = await take(rolePath, "PATCH");
    check(
      "role revoke sends enabled false",
      JSON.parse(revoke.body).enabled === false,
    );
    users = structuredClone(originalUsers);
    await fulfill(revoke.requestId, 200, { enabled: false });
    await text("Người dùng sau cập nhật");
    await until(
      () =>
        evaluate(
          "document.querySelector(" +
            JSON.stringify(action) +
            ").textContent.includes('Cấp ADMIN')",
        ),
      "revoke refetched",
    );

    // Do not infer roles from enabled, and never repeat PATCH after failed refetch.
    usersMode = "503";
    await click(action);
    await confirm();
    const successNoList = await take(rolePath, "PATCH");
    await fulfill(successNoList.requestId, 200, { enabled: true });
    await text("Không thể tải danh sách người dùng.");
    check(
      "PATCH success survives refetch failure",
      await evaluate(
        "document.querySelector('.admin-view').textContent.includes('Đã cập nhật vai trò ADMIN.') && !document.querySelector('.admin-updated-user')",
      ),
    );
    const successCount = count(rolePath, "PATCH");
    usersMode = "ok";
    users = users.map((u) =>
      u.id === uuid(1) ? { ...u, roles: ["MEMBER", "ADMIN"] } : u,
    );
    await click(".admin-view .ui-alert button");
    await text("Thu hồi ADMIN");
    check(
      "GET retry never resends a successful PATCH",
      count(rolePath, "PATCH") === successCount,
    );
    await extra("role-success-list-error-recovered");

    await click(action);
    await confirm();
    const forbidden = await take(rolePath, "PATCH");
    await fulfill(forbidden.requestId, 403, {}, "FORBIDDEN");
    await text("Bạn không có quyền thực hiện thao tác này");
    check(
      "role 403 removes mutation controls",
      await evaluate(
        "!document.querySelector('.ui-dialog[open]') && ![...document.querySelectorAll('.admin-table button')].some(b=>/Cấp ADMIN|Thu hồi ADMIN/.test(b.textContent))",
      ),
    );
    await capture("4:42169", "role-forbidden", 720, 503);

    // Refetch removes the trigger while dialog is open: safe focus fallback and no stale target PATCH.
    await go("/admin/users");
    await text("Thu hồi ADMIN");
    await click(action);
    await dialog();
    users = [];
    await evaluate(
      "window.dispatchEvent(new Event('offline'));window.dispatchEvent(new Event('online'))",
    );
    await text("Chưa có người dùng");
    await key("Escape");
    await settle();
    check(
      "unmounted confirmation trigger returns to heading",
      await evaluate("document.activeElement.id==='users-title'"),
    );
    users = structuredClone(originalUsers);

    await go("/admin/users");
    await text(originalUsers[0].displayName);
    await click(action);
    await confirm();
    const roleFailure = await take(rolePath, "PATCH");
    const roleFailureCount = count(rolePath, "PATCH");
    await fulfill(roleFailure.requestId, 500);
    await text("Không thể cập nhật vai trò. Vui lòng thử lại.");
    await click(action);
    await dialog();
    check(
      "role mutation error requires a new confirmation before retry",
      count(rolePath, "PATCH") === roleFailureCount,
    );
    await key("Escape");
    await extra("role-mutation-error");

    // SUP-03: reads, controlled switch, native confirmation, saving and ambiguity reconciliation.
    held.add("GET " + settingPath);
    await go(settingRoute);
    const pendingSetting = await take(settingPath);
    check(
      "setting loading has status and no switch",
      await evaluate(
        "!!document.querySelector('.admin-view [role=status]') && !document.querySelector('input[role=switch]')",
      ),
    );
    await extra("email-loading");
    held.delete("GET " + settingPath);
    await fulfill(pendingSetting.requestId, 200, { enabled });
    await text("Giá trị cuối đã xác minh");
    check(
      "On state reflects GET",
      await evaluate(
        "document.querySelector(" +
          JSON.stringify(switchSelector) +
          ").checked",
      ),
    );
    await capture("4:42182", "email-on", 1440, 1000);
    await capture("4:42315", "email-mobile", 390, 844);
    await click(switchSelector);
    await keyboard("Tắt yêu cầu xác thực email?");
    const initialWrites = count(settingPath, "PATCH");
    check(
      "switch requires confirmation and keeps verified value",
      count(settingPath, "PATCH") === initialWrites &&
        (await evaluate(
          "document.querySelector('input[role=switch]').checked",
        )),
    );
    await capture("4:42246", "email-confirm", 720, 861);
    await key("Escape");
    await settle();
    check(
      "email confirmation returns focus to switch",
      await evaluate("document.activeElement.matches('input[role=switch]')"),
    );
    await click(switchSelector);
    await confirm();
    const save = await take(settingPath, "PATCH");
    await evaluate(
      "document.querySelector('.ui-dialog-actions button:last-child').click()",
    );
    check(
      "email pending locks double submit",
      count(settingPath, "PATCH") === initialWrites + 1 &&
        JSON.parse(save.body).enabled === false,
    );
    await capture("4:42274", "email-saving", 720, 553);
    enabled = false;
    await fulfill(save.requestId, 200, { enabled });
    await text("Đã xác nhận cài đặt: Đang tắt.");
    check(
      "email success uses server value",
      !(await evaluate("document.querySelector('input[role=switch]').checked")),
    );
    await capture("4:42228", "email-off", 720, 496);

    // 5xx and a successful GET of the previous value enable an explicit confirmed retry.
    await click(switchSelector);
    await confirm();
    const rejectedSave = await take(settingPath, "PATCH");
    await fulfill(rejectedSave.requestId, 503);
    await text("Chưa lưu được thay đổi mong muốn.");
    check(
      "failed PATCH performs GET reconciliation",
      calls.at(-1).method === "GET" && calls.at(-1).path === settingPath,
    );
    await capture("4:42295", "email-error", 720, 615);
    await click(".admin-view .ui-alert button");
    await dialog();
    check(
      "retry requires another confirmation",
      count(settingPath, "PATCH") === initialWrites + 2,
    );
    await confirm();
    const retry = await take(settingPath, "PATCH");
    enabled = true;
    await fulfill(retry.requestId, 200, { enabled });
    await text("Đã xác nhận cài đặt: Đang bật.");

    // 5xx may happen after commit: reconciliation success, no rollback assumption/no duplicate.
    await click(switchSelector);
    await confirm();
    const committed = await take(settingPath, "PATCH");
    const committedCount = count(settingPath, "PATCH");
    enabled = false;
    await fulfill(committed.requestId, 500);
    await text("Đã xác nhận cài đặt: Đang tắt.");
    check(
      "5xx after commit reconciles to success without another PATCH",
      count(settingPath, "PATCH") === committedCount,
    );

    // Failed reconcile keeps the last verified value but blocks all writes until GET succeeds.
    readMode = "503";
    await click(switchSelector);
    await confirm();
    const unknown = await take(settingPath, "PATCH");
    await send("Fetch.failRequest", {
      requestId: unknown.requestId,
      errorReason: "ConnectionReset",
    });
    await text("Chưa xác định được trạng thái sau khi lưu.");
    check(
      "network plus read failure blocks blind retry",
      await evaluate(
        "document.querySelector('input[role=switch]').disabled && !document.querySelector('input[role=switch]').checked",
      ),
    );
    const unknownCount = count(settingPath, "PATCH");
    await click(".admin-view .ui-alert button");
    await text("Chưa xác định được trạng thái sau khi lưu.");
    await settle();
    check(
      "unknown retry only reads",
      count(settingPath, "PATCH") === unknownCount,
    );
    await extra("email-unknown");
    readMode = "ok";
    enabled = true;
    await click(".admin-view .ui-alert button");
    await text("Đã xác nhận cài đặt: Đang bật.");
    check(
      "successful recheck resolves ambiguity without writing",
      count(settingPath, "PATCH") === unknownCount,
    );

    // Real Axios timeout (10 seconds), not an assumed failed commit.
    await click(switchSelector);
    await confirm();
    const timeout = await take(settingPath, "PATCH");
    const timeoutCount = count(settingPath, "PATCH");
    enabled = false;
    await text("Đã xác nhận cài đặt: Đang tắt.");
    await fulfill(timeout.requestId, 200, { enabled: true }).catch(() => {});
    check(
      "timeout GET reconciles server state and no late overwrite",
      count(settingPath, "PATCH") === timeoutCount &&
        !(await evaluate(
          "document.querySelector('input[role=switch]').checked",
        )),
    );

    await click(switchSelector);
    await confirm();
    const denied = await take(settingPath, "PATCH");
    await fulfill(denied.requestId, 403, {}, "FORBIDDEN");
    await text("Bạn không có quyền thay đổi cài đặt");
    check(
      "setting mutation 403 hides cached setting and confirmation",
      await evaluate(
        "!document.querySelector('input[role=switch]') && !document.querySelector('.ui-dialog[open]')",
      ),
    );
    await extra("email-forbidden");

    readMode = "503";
    await go(settingRoute);
    await text("Không thể tải cấu hình email.");
    check(
      "setting read error has independent retry",
      await evaluate(
        "!document.querySelector('input[role=switch]') && document.querySelector('.admin-view .ui-alert button').textContent.includes('Thử tải lại')",
      ),
    );
    readMode = "ok";
    await click(".admin-view .ui-alert button");
    await text("Giá trị cuối đã xác minh");
    await extra("email-read-error-recovered");

    readMode = "403";
    await go(settingRoute);
    await text("Bạn không có quyền thay đổi cài đặt");
    check(
      "setting GET 403 hides protected value",
      await evaluate(
        "!document.querySelector('input[role=switch]') && document.querySelector('.admin-view').textContent.includes('403')",
      ),
    );
    await extra("email-read-forbidden");
    readMode = "ok";
    await go(settingRoute);
    await text("Giá trị cuối đã xác minh");
    await click(switchSelector);
    await confirm();
    const invalidWrite = await take(settingPath, "PATCH");
    await fulfill(invalidWrite.requestId, 400, {}, "VALIDATION_ERROR");
    await text("Chưa lưu được thay đổi mong muốn.");
    check(
      "definite mutation rejection has an independent confirmed retry",
      await evaluate(
        "!document.querySelector('input[role=switch]').disabled && document.querySelector('.ui-alert button').textContent.includes('Thử lại thay đổi')",
      ),
    );

    // SUP-04 and SPA tab/history navigation.
    await click('.shell-sidebar a[href="/super-admin?tab=rbac"]');
    await text("Catalog mặc định");
    check(
      "RBAC static matrix has seven catalog rows and no editor or reads",
      await evaluate(
        "document.querySelectorAll('.system-matrix tbody tr').length===7 && !document.querySelector('.admin-view input,.admin-view button')",
      ),
    );
    await capture("4:42342", "rbac-reference", 1440, 900);
    check(
      "RBAC correctly describes ADMIN roles:manage gate",
      await evaluate(
        "document.querySelector('.admin-view').textContent.includes('ADMIN có roles:manage')",
      ),
    );
    const beforeHistory = count(settingPath, "GET");
    await evaluate("history.back()");
    await text("Yêu cầu xác thực email");
    check(
      "Back selects email sidebar",
      await evaluate(
        "document.querySelector('.shell-sidebar [aria-current=page]').getAttribute('href')==='/super-admin?tab=email-verification'",
      ),
    );
    await evaluate("history.forward()");
    await text("Catalog mặc định");
    check(
      "Forward selects RBAC without a setting fetch",
      (await evaluate(
        "document.querySelector('.shell-sidebar [aria-current=page]').getAttribute('href')==='/super-admin?tab=rbac'",
      )) && count(settingPath, "GET") === beforeHistory + 1,
    );
    await resize(390, 844);
    check(
      "RBAC mobile confines horizontal scrolling to table",
      await evaluate(
        "document.documentElement.scrollWidth<=innerWidth+1 && document.querySelector('.system-matrix-wrap').scrollWidth>document.querySelector('.system-matrix-wrap').clientWidth",
      ),
    );
    await extra("rbac-mobile");

    // Role and setting access enforcement is the server's responsibility; UI never mounts excluded controls.
    for (const role of ["ADMIN", "MEMBER"]) {
      roles = [role];
      const settingBefore = count(settingPath),
        roleBefore = count(rolePath, "PATCH");
      await go(settingRoute);
      await text("403 · Bạn không có quyền truy cập trang này.");
      check(
        role + " never mounts setting controls or GET/PATCH",
        count(settingPath) === settingBefore &&
          (await evaluate("!document.querySelector('input[role=switch]')")),
      );
      await go("/admin/users");
      await text(originalUsers[0].displayName);
      check(
        role + " with roles:manage never mounts role controls",
        count(rolePath, "PATCH") === roleBefore &&
          (await evaluate(
            "![...document.querySelectorAll('.admin-view button')].some(b=>/Cấp ADMIN|Thu hồi ADMIN/.test(b.textContent))",
          )),
      );
    }
    roles = ["SUPER_ADMIN"];
    permissions = ["users:read", "audit:read"];
    await go("/admin/users");
    await text(originalUsers[0].displayName);
    check(
      "SUPER_ADMIN without roles:manage never mounts role controls",
      await evaluate(
        "![...document.querySelectorAll('.admin-view button')].some(b=>/Cấp ADMIN|Thu hồi ADMIN/.test(b.textContent))",
      ),
    );
    await go(settingRoute);
    await text("Yêu cầu xác thực email");
    check(
      "email setting requires SUPER_ADMIN only",
      await evaluate("!!document.querySelector('input[role=switch]')"),
    );
    permissions.push("roles:manage");

    // Delayed direct mutations and 401-triggered refresh must not cross a session/account boundary.
    await click(switchSelector);
    await confirm();
    const lateSetting = await take(settingPath, "PATCH");
    await logout();
    await login(101);
    await click('.shell-sidebar a[href="/super-admin?tab=email-verification"]');
    await text("Giá trị cuối đã xác minh");
    const afterSwitchReads = count(settingPath, "GET");
    enabled = false;
    await fulfill(lateSetting.requestId, 200, { enabled: true }).catch(
      () => {},
    );
    await settle();
    check(
      "late setting mutation cannot update or refetch another account",
      count(settingPath, "GET") === afterSwitchReads &&
        !(await evaluate(
          "document.querySelector('input[role=switch]').checked",
        )),
    );

    await go("/admin/users");
    await text(originalUsers[0].displayName);
    await click(action);
    await confirm();
    const lateRole = await take(rolePath, "PATCH");
    await logout();
    await login(102);
    await click('.shell-sidebar a[href="/admin/users"]');
    await text(originalUsers[0].displayName);
    const afterRoleReads = count("/users");
    await fulfill(lateRole.requestId, 200, { enabled: true }).catch(() => {});
    await settle();
    check(
      "late role mutation cannot publish success into another account",
      count("/users") === afterRoleReads &&
        (await evaluate("!document.querySelector('.admin-updated-user')")),
    );

    for (const mutationPath of [rolePath, settingPath]) {
      await go(mutationPath === rolePath ? "/admin/users" : settingRoute);
      await text(
        mutationPath === rolePath
          ? originalUsers[0].displayName
          : "Giá trị cuối đã xác minh",
      );
      await click(mutationPath === rolePath ? action : switchSelector);
      await confirm();
      const mutation = await take(mutationPath, "PATCH");
      held.add("POST /auth/refresh");
      await fulfill(mutation.requestId, 401, {}, "UNAUTHENTICATED");
      const oldRefresh = await take("/auth/refresh", "POST");
      const patches = count(mutationPath, "PATCH");
      await restore();
      check(
        "restore hides protected data and closes " + mutationPath,
        await evaluate(
          "!document.querySelector('.ui-dialog[open],.admin-table,input[role=switch]')",
        ),
      );
      const newRefresh = await take("/auth/refresh", "POST");
      user = {
        ...user,
        id: uuid(mutationPath === rolePath ? 103 : 104),
        email: "switched@example.com",
      };
      await fulfill(newRefresh.requestId, 200, {
        accessToken: "b4-switched-token",
        accessTokenExpiresInSeconds: 900,
      });
      held.delete("POST /auth/refresh");
      await text(
        mutationPath === rolePath
          ? originalUsers[0].displayName
          : "Giá trị cuối đã xác minh",
      );
      await fulfill(oldRefresh.requestId, 200, {
        accessToken: "b4-old-token",
      }).catch(() => {});
      await settle();
      check(
        "401 mutation never replays under switched account " + mutationPath,
        count(mutationPath, "PATCH") === patches,
      );
    }

    // Logout during interceptor refresh: no resurrection and no mutation replay.
    await click(switchSelector);
    await confirm();
    const waitLogout = await take(settingPath, "PATCH");
    held.add("POST /auth/refresh");
    await fulfill(waitLogout.requestId, 401, {}, "UNAUTHENTICATED");
    const logoutRefresh = await take("/auth/refresh", "POST");
    const logoutCount = count(settingPath, "PATCH");
    await key("Escape");
    await logout();
    await fulfill(logoutRefresh.requestId, 200, {
      accessToken: "must-not-restore",
    }).catch(() => {});
    held.delete("POST /auth/refresh");
    await settle();
    check(
      "logout pending refresh cannot replay or resurrect",
      count(settingPath, "PATCH") === logoutCount &&
        (await evaluate("!document.querySelector('.role-app-shell')")),
    );

    // Permission revocation closes native dialog, cancels protected UI and ignores late result.
    roles = ["SUPER_ADMIN"];
    await login(105);
    await click('.shell-sidebar a[href="/admin/users"]');
    await text(originalUsers[0].displayName);
    await click(action);
    await confirm();
    const lostRole = await take(rolePath, "PATCH");
    roles = ["ADMIN"];
    permissions = ["users:read", "audit:read", "roles:manage"];
    await restore();
    await text(originalUsers[0].displayName);
    await fulfill(lostRole.requestId, 200, { enabled: true }).catch(() => {});
    await settle();
    check(
      "lost SUPER_ADMIN closes role modal and hides mutation success",
      await evaluate(
        "!document.querySelector('.ui-dialog[open],.admin-updated-user') && ![...document.querySelectorAll('.admin-view button')].some(b=>/Cấp ADMIN|Thu hồi ADMIN/.test(b.textContent))",
      ),
    );

    check(
      "all fourteen SUPER_ADMIN frames have evidence",
      frames.length === 14 && new Set(frames.map((f) => f.id)).size === 14,
    );
    await writeFile(
      join(profile, "b4-frames.json"),
      JSON.stringify(frames, null, 2),
    );
    await writeFile(
      join(profile, "b4-regressions.json"),
      JSON.stringify(
        {
          checks,
          count: checks.length,
          evidence,
          source: "Production Chrome with API fixtures",
          limits:
            "HTTP fixtures cannot verify live JWT/RBAC/PostgreSQL, server rollback or external providers.",
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: 14 B.4 frames; " +
        checks.length +
        " Chrome assertions (API fixtures; VISUAL_PARTIAL). Artifacts: " +
        profile,
    );
  } catch (error) {
    console.error(
      "B.4 browser failure",
      await evaluate(
        "({url:location.href,ui:document.querySelector('.app-content')?.innerText,focus:document.activeElement?.outerHTML})",
      ),
      calls.slice(-7),
    );
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(
      join(profile, "b4-failure.png"),
      Buffer.from(data, "base64"),
    );
    throw error;
  } finally {
    await send("Fetch.disable");
    socket.removeEventListener("message", intercept);
  }
}
