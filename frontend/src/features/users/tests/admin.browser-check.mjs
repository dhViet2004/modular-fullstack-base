// Production Chrome/CDP checks; HTTP fixtures do not replace live RBAC/DB integration.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function checkAdmin({
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
  const names = [
    "Nguyễn Minh Anh",
    "Trần Quốc Bảo",
    "Lê Thu Hà",
    "Phạm Hải Nam",
    "Đặng Ngọc Linh",
    "Võ Thanh Tùng",
    "Bùi Khánh Vy",
    "Hoàng Gia Huy",
    "Nguyễn Thị Hoàng Phương Anh",
    "Đỗ Hồng Nhung",
    "Lý Đức Long",
  ];
  const originalUsers = names.map((name, i) => ({
    id: uuid(i + 1),
    email:
      [
        "minhanh",
        "baotq",
        "halth",
        "namph",
        "linhdn",
        "tungvt",
        "vykb",
        "huyhg",
        "phuonganh",
        "nhungdh",
        "longld",
      ][i] + "@example.com",
    displayName: name,
    status: i === 3 ? "SUSPENDED" : "ACTIVE",
    roles:
      i === 1 || i === 7
        ? ["MEMBER", "ADMIN"]
        : i === 2
          ? ["MEMBER", "SUPER_ADMIN"]
          : ["MEMBER"],
    emailVerifiedAt: i % 3 ? "2026-10-01T08:00:00Z" : null,
    createdAt: new Date(Date.UTC(2026, 9, 1 - i, 8)).toISOString(),
    updatedAt: "2026-10-09T08:00:00Z",
  }));
  let users = [...originalUsers];
  let user = { ...originalUsers[1], id: uuid(100), hasPassword: true };
  let roles = ["ADMIN"];
  let permissions = ["users:read", "audit:read", "roles:manage"];
  const originalPermissions = [...permissions];
  let authMode = "ok";
  let usersMode = "ok";
  let auditMode = "ok";
  const log = (n, action = "AUTH_LOGIN_SUCCEEDED", actor = uuid(1)) => ({
    id: uuid(200 + n),
    action,
    outcome: "SUCCESS",
    actorUserId: actor,
    subjectType: "SESSION",
    subjectId: uuid(300 + n),
    sessionId: uuid(300 + n),
    ipAddress: n === 2 ? null : "192.0.2.10",
    userAgent: n === 2 ? null : "Mozilla/5.0 fixture",
    metadata:
      n === 1
        ? {
            note: "<img src=x onerror=window.adminXss=true>",
            description: "long-text-".repeat(80),
          }
        : null,
    createdAt: new Date(Date.UTC(2026, 9, 8, 14, 5 - n)).toISOString(),
  });
  const originalLogs = [
    log(1),
    log(2, "AUTH_LOGOUT_SUCCEEDED", uuid(2)),
    log(3),
  ];
  let logs = [...originalLogs];
  const held = new Set();
  const paused = [];
  const calls = [];
  const frames = [];
  const checks = [];
  const evidence = [];
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
  const count = (path, method) =>
    calls.filter(
      (call) => call.path === path && (!method || call.method === method),
    ).length;
  const check = (name, value) => {
    assert(value, name);
    checks.push(name);
  };
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
                data,
                ...(code ? { error: { code } } : {}),
              }),
            ).toString("base64"),
          }),
    });
  }
  const me = () => ({ user, access: { roles, permissions } });
  function auditPage(params) {
    const filtered = logs.filter(
      (item) =>
        (!params.action || item.action === params.action) &&
        (!params.actorUserId || item.actorUserId === params.actorUserId),
    );
    // Deliberately small pages exercise UI cursor states; backend ordering is tested separately.
    return params.cursor
      ? {
          auditLogs: [
            log(
              4,
              params.action || "AUTH_LOGIN_SUCCEEDED",
              params.actorUserId || uuid(1),
            ),
          ],
          nextCursor: null,
        }
      : {
          auditLogs: filtered,
          nextCursor: filtered.length
            ? "opaque-next-" + (params.action || "all")
            : null,
        };
  }
  const intercept = async ({ data }) => {
    const event = JSON.parse(data);
    if (event.method !== "Fetch.requestPaused") return;
    const { requestId, request } = event.params;
    if (request.method === "OPTIONS") return fulfill(requestId, 204);
    const url = new URL(request.url);
    const path = url.pathname.slice("/api/v1".length);
    const call = {
      requestId,
      path,
      method: request.method,
      params: Object.fromEntries(url.searchParams),
      body: request.postData,
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
      if (authMode === "offline")
        return send("Fetch.failRequest", {
          requestId,
          errorReason: "ConnectionReset",
        });
      return fulfill(requestId, 200, {
        accessToken: "b3-memory-only-token",
        accessTokenExpiresInSeconds: 900,
      });
    }
    if (path === "/auth/me") return fulfill(requestId, 200, me());
    if (path === "/users") {
      if (usersMode === "once401") {
        usersMode = "ok";
        return fulfill(requestId, 401, {}, "UNAUTHENTICATED");
      }
      return fulfill(
        requestId,
        usersMode === "ok" ? 200 : Number(usersMode),
        usersMode === "ok" ? { users } : {},
        usersMode === "403" ? "FORBIDDEN" : undefined,
      );
    }
    if (path === "/audit-logs")
      return fulfill(
        requestId,
        auditMode === "ok" ? 200 : Number(auditMode),
        auditMode === "ok" ? auditPage(call.params) : {},
        auditMode === "403" ? "FORBIDDEN" : undefined,
      );
    if (path === "/auth/sessions")
      return fulfill(requestId, 200, { sessions: [] });
    if (path === "/files") return fulfill(requestId, 200, []);
    if (path === "/system/email-verification")
      return fulfill(requestId, 200, { enabled: false });
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
  async function go(route, width = 1440, height = 1000) {
    await resize(width, height);
    await navigate(origin + route);
    await until(
      () => evaluate("!!document.querySelector('.role-app-shell')"),
      "admin shell " + route,
    );
    await evaluate("document.fonts.ready");
  }
  async function input(selector, value) {
    await evaluate(
      "(() => { const el = document.querySelector(" +
        JSON.stringify(selector) +
        "); el.focus(); el.select(); })()",
    );
    await send("Input.insertText", { text: value });
  }
  async function select(selector, value) {
    await evaluate(
      "(() => { const el = document.querySelector(" +
        JSON.stringify(selector) +
        "); el.value = " +
        JSON.stringify(value) +
        "; el.dispatchEvent(new Event('change', { bubbles: true })); })()",
    );
  }
  async function take(path, method = "GET") {
    await until(
      () => paused.some((item) => item.path === path && item.method === method),
      "held " + method + " " + path,
    );
    return paused.splice(
      paused.findIndex((item) => item.path === path && item.method === method),
      1,
    )[0];
  }
  async function refetch() {
    await evaluate(
      "window.dispatchEvent(new Event('offline')); window.dispatchEvent(new Event('online'))",
    );
  }
  const tableIds = (kind) =>
    evaluate(
      "[...document.querySelectorAll('.admin-table tbody [data-" +
        kind +
        "-id]')].map(el => el.dataset." +
        kind +
        "Id)",
    );
  async function capture(id, name, width, height) {
    const original = await evaluate(
      "({width: innerWidth, height: innerHeight})",
    );
    const captures = [];
    for (const size of [
      { width, height },
      ...[
        { width: 1440, height: 1000 },
        { width: 390, height: 844 },
      ].filter((item) => item.width !== width),
    ]) {
      await resize(size.width, size.height);
      await evaluate("scrollTo(0, 0)");
      check(
        "responsive " + name + " " + size.width,
        await evaluate(
          "document.documentElement.scrollWidth <= innerWidth + 1 && [...document.querySelectorAll('dialog[open]')].every(el => el.scrollWidth <= el.clientWidth + 1)",
        ),
      );
      const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: !(await evaluate(
          "!!document.querySelector('dialog[open]')",
        )),
      });
      const filename =
        "b3-" + id.replace(":", "-") + "-" + name + "-" + size.width + ".png";
      await writeFile(join(profile, filename), Buffer.from(data, "base64"));
      captures.push({ filename, viewport: size });
    }
    await resize(original.width, original.height);
    frames.push({
      id,
      name,
      ...captures[0],
      responsive: captures.slice(1),
      status: "FUNCTIONAL_DONE / VISUAL_PARTIAL",
    });
  }
  async function extra(name) {
    const filename = "b3-" + name + ".png";
    const { data } = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(join(profile, filename), Buffer.from(data, "base64"));
    evidence.push({
      filename,
      viewport: await evaluate("({width:innerWidth,height:innerHeight})"),
    });
  }
  async function drawer(title, hasCopy = false) {
    await until(
      () => evaluate("!!document.querySelector('.admin-details[open]')"),
      "details drawer",
    );
    check(
      title + " initial focus",
      await evaluate("document.activeElement.matches('[data-details-close]')"),
    );
    const ax = await send("Accessibility.getFullAXTree");
    check(
      title + " accessible name",
      ax.nodes.some(
        (node) => node.role?.value === "dialog" && node.name?.value === title,
      ),
    );
    await key("Tab", true);
    check(
      title + " Shift+Tab wrap",
      await evaluate(
        hasCopy
          ? "document.activeElement.textContent.includes('Sao chép ID')"
          : "document.activeElement.matches('[data-details-close]')",
      ),
    );
    await key("Tab");
    check(
      title + " Tab wrap",
      await evaluate("document.activeElement.matches('[data-details-close]')"),
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
    authMode = "guest";
    await fulfill(call.requestId, 204);
    await until(
      () =>
        evaluate(
          "location.pathname === '/login' && !document.querySelector('.role-app-shell')",
        ),
      "logout",
    );
    check(
      "explicit logout does not show expired",
      await evaluate(
        "!document.body.textContent.includes('Phiên đăng nhập đã hết hạn')",
      ),
    );
  }
  async function login(nextId) {
    user = {
      ...user,
      id: uuid(nextId),
      displayName: "New Account " + nextId,
      email: "account" + nextId + "@example.com",
    };
    await input("input[name=email]", user.email);
    await input("input[name=password]", "example-password");
    await click('button[type="submit"]');
    const call = await take("/auth/login", "POST");
    authMode = "ok";
    await fulfill(call.requestId, 200, {
      accessToken: "b3-next-account-token",
      accessTokenExpiresInSeconds: 900,
    });
    await until(
      () => evaluate("!!document.querySelector('.role-app-shell')"),
      "next account",
    );
  }
  async function restoreWithHeldMe() {
    held.add("GET /auth/me");
    await evaluate(
      "window.dispatchEvent(new CustomEvent('auth:refresh-failed', {detail:{isAxiosError:true,config:{url:'/auth/refresh'},response:{status:503}}}))",
    );
    await until(
      () =>
        evaluate("!!document.querySelector('.shell-main > .ui-alert button')"),
      "session recovery control",
    );
    // Drive a concurrent restore even while the native modal makes the shell inert.
    await evaluate(
      "document.querySelector('.shell-main > .ui-alert button').click()",
    );
    return take("/auth/me");
  }

  try {
    await go("/admin");
    await text("Tổng quan quản trị");
    check(
      "dashboard uses existing four capability routes without aggregation calls",
      count("/users") === 0 &&
        count("/audit-logs") === 0 &&
        count("/system/email-verification") === 0 &&
        (await evaluate(
          "document.querySelectorAll('.admin-dashboard-grid a').length === 4",
        )),
    );
    await capture("4:41375", "dashboard-desktop", 1440, 1000);
    await capture("4:41431", "dashboard-mobile", 390, 1300);

    await go("/admin/users");
    await text(names[0]);
    check(
      "ADMIN never mounts role actions or system configuration",
      await evaluate(
        "![...document.querySelectorAll('.admin-view button')].some(el => /Cấp ADMIN|Thu hồi ADMIN/.test(el.textContent))",
      ),
    );
    assert.deepEqual(
      calls.filter((call) => call.path === "/users").at(-1).params,
      {},
    );
    await capture("4:41469", "users-populated", 1440, 1299);
    await capture("4:41670", "users-mobile", 390, 1459);
    const listCount = count("/users");
    await input("#users-search", "no-match");
    await text("Không tìm thấy người dùng");
    await capture("4:41607", "users-empty-search", 720, 571);
    await evaluate(
      "[...document.querySelectorAll('.admin-view button')].find(el => el.textContent === 'Xóa bộ lọc').click()",
    );
    await text(names[0]);
    await select("#users-role", "ADMIN");
    assert.deepEqual((await tableIds("user")).sort(), [uuid(2), uuid(8)]);
    check("role filter checks all roles rather than only the first", true);
    await select("#users-status", "SUSPENDED");
    await text("Không tìm thấy người dùng");
    await select("#users-role", "");
    await text(names[3]);
    check(
      "combined role/status filters are local",
      count("/users") === listCount && (await tableIds("user")).length === 1,
    );
    await select("#users-status", "");
    await input("#users-search", " BAOTQ@EXAMPLE.COM ");
    await text("1 / 11 tài khoản");
    check(
      "name/email search trims and ignores case",
      count("/users") === listCount && (await tableIds("user"))[0] === uuid(2),
    );
    await input("#users-search", "");
    const sorted = await tableIds("user");
    await click(".admin-table th:first-child button");
    assert.deepEqual(await tableIds("user"), [...sorted].reverse());
    check(
      "sort reverses locally without mutating list requests",
      count("/users") === listCount,
    );
    await click(".admin-table th:first-child button");
    const userTrigger =
      '.admin-table [data-user-id="' + uuid(1) + '"] .admin-user-name';
    await click(userTrigger);
    await drawer("Thông tin người dùng");
    await capture("4:41626", "users-details", 720, 652);
    await key("Escape");
    check(
      "user drawer restores trigger focus",
      await evaluate(
        "document.activeElement.matches(" + JSON.stringify(userTrigger) + ")",
      ),
    );
    await click(userTrigger);
    users = originalUsers.filter((item) => item.id !== uuid(1));
    await refetch();
    await until(
      () => evaluate("!document.querySelector('.admin-details')"),
      "removed user closes drawer",
    );
    check(
      "missing trigger returns focus to the users heading",
      await evaluate("document.activeElement.id === 'users-title'"),
    );
    users = [...originalUsers];

    held.add("GET /users");
    await go("/admin/users");
    const loadingUsers = await take("/users");
    await text("Đang tải dữ liệu");
    await capture("4:41641", "users-loading", 720, 459);
    held.delete("GET /users");
    await fulfill(loadingUsers.requestId, 200, { users });
    await text(names[0]);
    usersMode = "503";
    await go("/admin/users");
    await text("Không thể tải danh sách");
    await extra("users-error");
    usersMode = "ok";
    await click(".ui-alert button");
    await text(names[0]);
    check("users initial error is retryable", true);
    users = [];
    await go("/admin/users");
    await text("Chưa có người dùng");
    check(
      "empty dataset differs from empty search",
      await evaluate(
        "!document.body.textContent.includes('Không tìm thấy người dùng')",
      ),
    );
    await extra("users-empty-dataset");
    users = [...originalUsers];
    usersMode = "403";
    await go("/admin/users");
    await text("403");
    check(
      "users API 403 shows no protected table or drawer",
      await evaluate(
        "!document.querySelector('.admin-table') && !document.querySelector('.admin-details')",
      ),
    );
    await capture("4:41658", "users-forbidden", 720, 434);
    usersMode = "once401";
    const refreshBefore = count("/auth/refresh");
    await go("/admin/users");
    await text(names[0]);
    check(
      "expired access token refreshes and retries normally",
      count("/auth/refresh") === refreshBefore + 2,
    );
    check(
      "ADMIN never calls email policy",
      count("/system/email-verification") === 0,
    );

    roles = ["SUPER_ADMIN"];
    await go("/admin/users");
    await text(names[0]);
    const grant =
      '.admin-table [data-user-id="' + uuid(1) + '"] td:last-child button';
    const rolePath = "/users/" + uuid(1) + "/roles/admin";
    const mutations = count(rolePath, "PATCH");
    await click(grant);
    await until(
      () => evaluate("!!document.querySelector('.ui-dialog[open]')"),
      "grant confirmation",
    );
    await click(".ui-dialog .ui-dialog-actions button:last-child");
    await evaluate(
      "document.querySelector('.ui-dialog .ui-dialog-actions button:last-child').click()",
    );
    const assigned = await take(rolePath, "PATCH");
    check(
      "role grant blocks double-submit and preserves payload",
      count(rolePath, "PATCH") === mutations + 1 &&
        JSON.parse(assigned.body).enabled === true,
    );
    users = users.map((item) =>
      item.id === uuid(1) ? { ...item, roles: ["MEMBER", "ADMIN"] } : item,
    );
    await fulfill(assigned.requestId, 200, { enabled: true });
    await text("Đã cập nhật vai trò ADMIN.");
    await until(
      () =>
        evaluate(
          "document.querySelector(" +
            JSON.stringify(grant) +
            ").textContent.includes('Thu hồi')",
        ),
      "role list refreshed",
    );
    await click(grant);
    await until(
      () => evaluate("!!document.querySelector('.ui-dialog[open]')"),
      "revoke confirmation",
    );
    await click(".ui-dialog .ui-dialog-actions button:last-child");
    const removed = await take(rolePath, "PATCH");
    check(
      "SUPER_ADMIN can still revoke ADMIN",
      JSON.parse(removed.body).enabled === false,
    );
    users = [...originalUsers];
    await fulfill(removed.requestId, 200, { enabled: false });
    permissions = ["users:read", "audit:read"];
    await go("/admin/users");
    await text(names[0]);
    check(
      "SUPER_ADMIN without roles:manage has no role controls",
      await evaluate(
        "![...document.querySelectorAll('.admin-view button')].some(el => /Cấp ADMIN|Thu hồi ADMIN/.test(el.textContent))",
      ),
    );
    roles = ["ADMIN"];
    permissions = [...originalPermissions];

    await go("/admin/audit-logs");
    await text("AUTH_LOGIN_SUCCEEDED");
    assert.deepEqual(
      calls.filter((call) => call.path === "/audit-logs").at(-1).params,
      { limit: "50" },
    );
    await capture("4:41729", "audit-populated", 1440, 1000);
    await capture("4:41883", "audit-mobile", 390, 1730);
    await select("#audit-action", "AUTH_LOGIN_SUCCEEDED");
    await input("#audit-actor", uuid(1));
    await input("#audit-limit", "10");
    await click('.admin-filters button[type="submit"]');
    await until(
      () =>
        calls.filter((call) => call.path === "/audit-logs").at(-1).params
          .action === "AUTH_LOGIN_SUCCEEDED",
      "applied audit filters",
    );
    await text("AUTH_LOGIN_SUCCEEDED");
    assert.deepEqual(
      calls.filter((call) => call.path === "/audit-logs").at(-1).params,
      { limit: "10", action: "AUTH_LOGIN_SUCCEEDED", actorUserId: uuid(1) },
    );
    await until(
      async () => (await tableIds("audit")).length === 2,
      "filtered audit rows",
    );
    check(
      "audit filters use supported params and reset the first cursor",
      true,
    );
    await capture("4:41813", "audit-filtered", 720, 595);
    const auditCount = count("/audit-logs");
    await input("#audit-actor", "friendly-name");
    await input("#audit-limit", "101");
    await click('.admin-filters button[type="submit"]');
    await text("Nhập UUID hợp lệ.");
    await text("Tối đa 100 bản ghi.");
    check(
      "invalid actor/limit never sends a request",
      count("/audit-logs") === auditCount,
    );
    await input("#audit-actor", "");
    await input("#audit-limit", "1.5");
    await click('.admin-filters button[type="submit"]');
    await text("Nhập số nguyên");
    check(
      "decimal limits never reach the endpoint",
      count("/audit-logs") === auditCount,
    );
    for (const value of ["1", "100"]) {
      await input("#audit-limit", value);
      await click('.admin-filters button[type="submit"]');
      await until(
        () =>
          calls.filter((call) => call.path === "/audit-logs").at(-1).params
            .limit === value,
        "audit limit boundary",
      );
      check("valid audit limit boundary " + value, true);
    }

    await go("/admin/audit-logs");
    await text("AUTH_LOGIN_SUCCEEDED");
    const auditTrigger =
      '.admin-audit-table [data-audit-id="' + uuid(201) + '"] button';
    await click(auditTrigger);
    await drawer("Chi tiết sự kiện", true);
    check(
      "details use escaped API metadata and actual full identifiers",
      await evaluate(
        "!document.querySelector('.admin-details img') && !window.adminXss && document.querySelector('.admin-details pre').textContent.includes('<img src=x') && document.querySelector('.admin-details').textContent.includes(" +
          JSON.stringify(uuid(301)) +
          ")",
      ),
    );
    await capture("4:41832", "audit-details", 720, 969);
    await send("Browser.grantPermissions", {
      origin,
      permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"],
    });
    await click(".admin-details button:not([data-details-close])");
    await text("Đã sao chép ID.");
    check(
      "copy ID writes the API ID",
      (await evaluate("navigator.clipboard.readText()")) === uuid(201),
    );
    await key("Escape");
    check(
      "audit drawer restores trigger focus",
      await evaluate(
        "document.activeElement.matches(" + JSON.stringify(auditTrigger) + ")",
      ),
    );

    held.add("GET /audit-logs");
    await evaluate(
      "[...document.querySelectorAll('.admin-view button')].find(el => el.textContent === 'Tải thêm').click()",
    );
    const next = await take("/audit-logs");
    const pageCount = count("/audit-logs");
    await evaluate(
      "[...document.querySelectorAll('.admin-view button')].find(el => el.textContent.includes('Đang tải thêm')).click()",
    );
    check(
      "load more blocks duplicate requests",
      count("/audit-logs") === pageCount && !!next.params.cursor,
    );
    await capture("4:41853", "audit-load-more", 720, 595);
    await fulfill(next.requestId, 503);
    await text("Không thể tải thêm");
    check(
      "next-page error retains already loaded data",
      (await tableIds("audit")).length === 3,
    );
    await extra("audit-load-more-error");
    await evaluate(
      "[...document.querySelectorAll('.admin-view button')].find(el => el.textContent === 'Thử tải thêm').click()",
    );
    const retry = await take("/audit-logs");
    assert.deepEqual(retry.params, next.params);
    await fulfill(retry.requestId, 200, auditPage(retry.params));
    held.delete("GET /audit-logs");
    await until(
      async () => (await tableIds("audit")).length === 4,
      "next page appended",
    );
    check(
      "retry reuses cursor and stops when nextCursor is null",
      await evaluate(
        "![...document.querySelectorAll('.admin-view button')].some(el => el.textContent === 'Tải thêm')",
      ),
    );
    logs = [];
    await go("/admin/audit-logs");
    await text("Chưa có sự kiện");
    await capture("4:41873", "audit-empty", 720, 377);
    await select("#audit-action", "AUTH_LOGIN_SUCCEEDED");
    await click('.admin-filters button[type="submit"]');
    await text("Không có sự kiện phù hợp");
    await extra("audit-empty-filtered");
    logs = [...originalLogs];
    auditMode = "503";
    await go("/admin/audit-logs");
    await text("Không thể tải nhật ký");
    await extra("audit-error");
    auditMode = "ok";
    await click(".ui-alert button");
    await text("AUTH_LOGIN_SUCCEEDED");
    check("audit initial errors have an independent retry", true);
    auditMode = "403";
    await go("/admin/audit-logs");
    await text("403");
    check(
      "audit API 403 hides protected records",
      await evaluate("!document.querySelector('.admin-table')"),
    );
    await extra("audit-forbidden");
    auditMode = "ok";

    await go("/admin/audit-logs");
    await text("AUTH_LOGIN_SUCCEEDED");
    held.add("GET /audit-logs");
    await evaluate(
      "[...document.querySelectorAll('.admin-view button')].find(el => el.textContent === 'Tải thêm').click()",
    );
    const oldPage = await take("/audit-logs");
    await select("#audit-action", "AUTH_LOGOUT_SUCCEEDED");
    await click('.admin-filters button[type="submit"]');
    const newFilter = await take("/audit-logs");
    check(
      "filter change starts without the old cursor",
      newFilter.params.action === "AUTH_LOGOUT_SUCCEEDED" &&
        !newFilter.params.cursor,
    );
    await fulfill(newFilter.requestId, 200, {
      auditLogs: [originalLogs[1]],
      nextCursor: null,
    });
    await fulfill(oldPage.requestId, 200, {
      auditLogs: [log(9)],
      nextCursor: null,
    }).catch(() => {});
    await until(
      async () => (await tableIds("audit")).length === 1,
      "only the new filter set",
    );
    check(
      "late old page cannot mix into new filters",
      (await tableIds("audit"))[0] === uuid(202),
    );
    await select("#audit-action", "");
    await click('.admin-filters button[type="submit"]');
    const revisited = await take("/audit-logs");
    check(
      "revisiting filters also resets previous pages",
      !revisited.params.cursor,
    );
    await fulfill(revisited.requestId, 200, auditPage(revisited.params));
    held.delete("GET /audit-logs");
    await text("AUTH_LOGIN_SUCCEEDED");

    await go("/admin/users");
    await text(names[0]);
    await click(userTrigger);
    held.add("GET /users");
    await refetch();
    const revokedRequest = await take("/users");
    const heldMe = await restoreWithHeldMe();
    check(
      "session verification hides cached data and closes the drawer",
      await evaluate(
        "!document.querySelector('.admin-details') && !document.querySelector('.admin-table')",
      ),
    );
    permissions = ["audit:read"];
    await fulfill(heldMe.requestId, 200, me());
    held.delete("GET /auth/me");
    await text("403");
    await fulfill(revokedRequest.requestId, 200, {
      users: originalUsers,
    }).catch(() => {});
    held.delete("GET /users");
    check(
      "revoked permission ignores late data",
      await evaluate(
        "!document.querySelector('.admin-table') && !document.querySelector('.admin-details')",
      ),
    );
    permissions = [...originalPermissions];

    held.add("GET /users");
    await go("/admin/users");
    const oldUsers = await take("/users");
    await logout();
    users = [
      { ...originalUsers[0], id: uuid(501), displayName: "New Protected User" },
    ];
    await login(101);
    await click('.shell-sidebar a[href="/admin/users"]');
    const accountUsers = await take("/users");
    await fulfill(accountUsers.requestId, 200, { users });
    held.delete("GET /users");
    await text("New Protected User");
    await fulfill(oldUsers.requestId, 200, { users: originalUsers }).catch(
      () => {},
    );
    check(
      "late user response after logout cannot populate the next account",
      (await tableIds("user")).length === 1 &&
        (await tableIds("user"))[0] === uuid(501),
    );
    held.add("GET /audit-logs");
    await click('.shell-sidebar a[href="/admin/audit-logs"]');
    const oldAudit = await take("/audit-logs");
    await logout();
    logs = [log(50, "USER_ROLE_ASSIGNED", uuid(502))];
    await login(102);
    await click('.shell-sidebar a[href="/admin/audit-logs"]');
    const accountAudit = await take("/audit-logs");
    await fulfill(accountAudit.requestId, 200, {
      auditLogs: logs,
      nextCursor: null,
    });
    held.delete("GET /audit-logs");
    await text("USER_ROLE_ASSIGNED");
    await fulfill(oldAudit.requestId, 200, {
      auditLogs: originalLogs,
      nextCursor: null,
    }).catch(() => {});
    check(
      "late audit response after logout cannot populate the next account",
      (await tableIds("audit")).length === 1 &&
        (await tableIds("audit"))[0] === uuid(250),
    );

    roles = ["SUPER_ADMIN"];
    await go("/admin/users");
    await text("New Protected User");
    const lateRolePath = "/users/" + uuid(501) + "/roles/admin";
    await click(".admin-table tbody td:last-child button");
    await until(
      () => evaluate("!!document.querySelector('.ui-dialog[open]')"),
      "late role confirmation",
    );
    await click(".ui-dialog .ui-dialog-actions button:last-child");
    const lateRole = await take(lateRolePath, "PATCH");
    await logout();
    roles = ["ADMIN"];
    users = [
      {
        ...originalUsers[0],
        id: uuid(503),
        displayName: "Third Protected User",
      },
    ];
    await login(103);
    await click('.shell-sidebar a[href="/admin/users"]');
    await text("Third Protected User");
    const beforeLateRole = count("/users");
    await fulfill(lateRole.requestId, 200, { enabled: true }).catch(() => {});
    await evaluate(
      "new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))",
    );
    check(
      "late role mutation cannot invalidate or announce success in the next account",
      count("/users") === beforeLateRole &&
        (await evaluate(
          "!document.querySelector('.admin-view').textContent.includes('Đã cập nhật vai trò ADMIN.')",
        )),
    );

    held.add("GET /users");
    await refetch();
    const oldAccountQuery = await take("/users");
    const switchMe = await restoreWithHeldMe();
    check(
      "account verification never displays the old protected list",
      await evaluate("!document.querySelector('.admin-table')"),
    );
    user = {
      ...user,
      id: uuid(104),
      email: "switch@example.com",
      displayName: "Switch Account",
    };
    users = [
      {
        ...originalUsers[0],
        id: uuid(504),
        displayName: "Switched Protected User",
      },
    ];
    await fulfill(switchMe.requestId, 200, me());
    held.delete("GET /auth/me");
    const switchedQuery = await take("/users");
    await fulfill(switchedQuery.requestId, 200, { users });
    held.delete("GET /users");
    await text("Switched Protected User");
    await fulfill(oldAccountQuery.requestId, 200, {
      users: originalUsers,
    }).catch(() => {});
    check(
      "account switch without logout isolates query data",
      (await tableIds("user")).length === 1 &&
        (await tableIds("user"))[0] === uuid(504),
    );

    await go("/admin/audit-logs");
    await text("USER_ROLE_ASSIGNED");
    await click(".admin-audit-table tbody button");
    held.add("GET /audit-logs");
    await refetch();
    const revokedAudit = await take("/audit-logs");
    const auditMe = await restoreWithHeldMe();
    permissions = [];
    await fulfill(auditMe.requestId, 200, me());
    held.delete("GET /auth/me");
    await text("403");
    await fulfill(revokedAudit.requestId, 200, {
      auditLogs: originalLogs,
      nextCursor: null,
    }).catch(() => {});
    held.delete("GET /audit-logs");
    check(
      "audit permission revocation closes details and rejects late pages",
      await evaluate(
        "!document.querySelector('.admin-table') && !document.querySelector('.admin-details')",
      ),
    );

    roles = ["MEMBER"];
    permissions = [];
    const beforeDenied = count("/users") + count("/audit-logs");
    await go("/admin/users");
    await text("403");
    await go("/admin/audit-logs");
    await text("403");
    await go("/admin");
    await text("403");
    check(
      "MEMBER deep links do not mount protected queries",
      count("/users") + count("/audit-logs") === beforeDenied,
    );
    roles = ["ADMIN"];
    permissions = [...originalPermissions];
    authMode = "guest";
    await evaluate(
      "sessionStorage.removeItem('corestack.session-established')",
    );
    await navigate(origin + "/admin/users");
    await text("401");
    check(
      "guest 401 does not become expired",
      await evaluate(
        "!document.body.textContent.includes('Phiên đăng nhập đã hết hạn')",
      ),
    );
    await evaluate(
      "sessionStorage.setItem('corestack.session-established','true')",
    );
    await navigate(origin + "/admin/audit-logs");
    await text("Phiên đăng nhập đã hết hạn");
    check(
      "expired session requires rejected refresh and previous evidence",
      true,
    );
    for (const mode of ["503", "offline"]) {
      authMode = mode;
      await navigate(origin + "/admin/users");
      await text("Không thể khôi phục phiên");
      check(
        mode + " restoration error does not become guest/expired",
        await evaluate(
          "!document.body.textContent.includes('Phiên đăng nhập đã hết hạn') && !document.body.textContent.includes('401')",
        ),
      );
    }
    authMode = "ok";
    users = [...originalUsers];
    logs = [...originalLogs];
    await go("/admin/users");
    await text(names[0]);
    const retryMe = await restoreWithHeldMe();
    await fulfill(retryMe.requestId, 503);
    held.delete("GET /auth/me");
    await text("Kết nối bị gián đoạn");
    check(
      "restore 5xx preserves the known account and shell",
      await evaluate(
        "!!document.querySelector('.role-app-shell') && !document.body.textContent.includes('Phiên đăng nhập đã hết hạn')",
      ),
    );
    await click(".shell-main > .ui-alert button");
    await text(names[0]);
    for (const width of [320, 390, 768, 1280, 1600]) {
      await resize(width);
      check(
        "extra responsive users " + width,
        await evaluate(
          "document.documentElement.scrollWidth <= innerWidth + 1",
        ),
      );
      await go("/admin/audit-logs", width);
      await text("AUTH_LOGIN_SUCCEEDED");
      check(
        "extra responsive audit " + width,
        await evaluate(
          "document.documentElement.scrollWidth <= innerWidth + 1",
        ),
      );
      await go("/admin/users", width);
      await text(names[0]);
    }
    assert.equal(frames.length, 14);
    assert.equal(new Set(frames.map((item) => item.id)).size, 14);
    check(
      "credentials stay outside Web Storage",
      await evaluate(
        "!JSON.stringify({...localStorage,...sessionStorage}).includes('token')",
      ),
    );
    await writeFile(
      join(profile, "b3-frames.json"),
      JSON.stringify(frames, null, 2),
    );
    await writeFile(
      join(profile, "b3-regressions.json"),
      JSON.stringify(
        {
          checks,
          count: checks.length,
          evidence,
          source: "Chrome production app with API fixtures",
          limits:
            "Synthetic HTTP pages; no live PostgreSQL, JWT, RBAC or external providers.",
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: 14 B.3 frames; " +
        checks.length +
        " Chrome assertions (API fixtures; VISUAL_PARTIAL). Artifacts: " +
        profile,
    );
  } catch (error) {
    console.error(
      "B.3 browser failure",
      await evaluate(
        "({url:location.href,ui:document.querySelector('.app-content')?.innerText,focus:document.activeElement?.outerHTML})",
      ),
      calls.slice(-5),
    );
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(
      join(profile, "b3-failure.png"),
      Buffer.from(data, "base64"),
    );
    throw error;
  } finally {
    await send("Fetch.disable");
    socket.removeEventListener("message", intercept);
  }
}
