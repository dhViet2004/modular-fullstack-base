// Run from frontend: node src/components/ui/tests/primitives.browser-check.mjs [http://127.0.0.1:3001]
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import tailwind from "@tailwindcss/postcss";
import { checkPublicAuth } from "../../../features/auth/tests/public-auth.browser-check.mjs";
import { checkMember } from "../../../features/auth/tests/member.browser-check.mjs";
import { checkAdmin } from "../../../features/users/tests/admin.browser-check.mjs";
import { checkSuperAdmin } from "../../../features/system/tests/super-admin.browser-check.mjs";

const frontend = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const require = createRequire(import.meta.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(require.resolve("vite")));
const profile = await mkdtemp(join(tmpdir(), "corebase-phase-a2-"));
const app = process.argv[2];
if (app) assert(["localhost", "127.0.0.1"].includes(new URL(app).hostname));

const server = await createServer({
  root: frontend,
  configFile: false,
  resolve: { alias: { "@": join(frontend, "src") } },
  oxc: { jsx: { runtime: "automatic" } },
  css: { postcss: { plugins: [tailwind()] } },
  optimizeDeps: { entries: ["src/components/ui/tests/browser-fixture.tsx"] },
  server: { host: "127.0.0.1", port: 0 },
  plugins: [
    {
      name: "ui-test-page",
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          if (request.url !== "/") return next();
          response.setHeader("Content-Type", "text/html");
          response.end(
            '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>UI tests</title></head><body><div id="root"></div><script type="module" src="/src/components/ui/tests/browser-fixture.tsx"></script></body></html>',
          );
        });
      },
    },
  ],
});
await server.listen();
const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
);
let socket;
let sequence = 0;
const pending = new Map();
const browserErrors = [];

async function until(check, message) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((done) => setTimeout(done, 40));
  }
  throw new Error(`Timed out: ${message}`);
}

function send(method, params = {}) {
  return new Promise((done, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 15_000);
    pending.set(id, { done, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text,
    );
  return result.result.value;
}

async function key(keyName, shift = false) {
  const code = {
    Tab: 9,
    Escape: 27,
    " ": 32,
    Enter: 13,
    Home: 36,
    End: 35,
    ArrowLeft: 37,
    ArrowRight: 39,
    ArrowDown: 40,
  }[keyName];
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: keyName,
    code: keyName === " " ? "Space" : keyName,
    text: keyName === "Enter" ? "\r" : keyName === " " ? " " : undefined,
    windowsVirtualKeyCode: code,
    modifiers: shift ? 8 : 0,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: keyName,
    windowsVirtualKeyCode: code,
    modifiers: shift ? 8 : 0,
  });
}

async function click(selector) {
  const point = await evaluate(`(async () => {
    const element = document.querySelector(${JSON.stringify(selector)});
    element.scrollIntoView({ block: 'center' });
    // Native popover anchors settle after scrolling; measure the final hit target.
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    const rect = element.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    ...point,
    button: "left",
    clickCount: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    ...point,
    button: "left",
    clickCount: 1,
  });
}

async function viewport(width) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate("new Promise(requestAnimationFrame)");
  assert(
    await evaluate(`document.documentElement.scrollWidth <= ${width}`),
    `overflow at ${width}px`,
  );
}

async function navigate(url, expected = url) {
  await send("Page.navigate", { url });
  await until(
    () =>
      evaluate(
        `location.href === ${JSON.stringify(expected)} && document.readyState === 'complete'`,
      ),
    `navigate ${url}`,
  );
}

try {
  let port;
  await until(async () => {
    try {
      port = Number(
        (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split(
          "\n",
        )[0],
      );
      return !!port;
    } catch {
      return false;
    }
  }, "Chrome startup");
  const target = await (
    await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
      method: "PUT",
    })
  ).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, reject) => {
    socket.onopen = done;
    socket.onerror = reject;
  });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const response = pending.get(message.id);
    if (response) {
      pending.delete(message.id);
      clearTimeout(response.timer);
      if (message.error)
        response.reject(new Error(JSON.stringify(message.error)));
      else response.done(message.result);
    }
    if (message.method === "Runtime.exceptionThrown")
      browserErrors.push(message.params.exceptionDetails.text);
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await navigate(server.resolvedUrls.local[0]);
  await until(
    () => evaluate('document.documentElement.dataset.ready === "true"'),
    "fixture and native refs",
  );

  for (const width of [320, 390, 768, 1280, 1600]) {
    await viewport(width);
    assert(
      await evaluate(
        "[...document.querySelectorAll('.ui-button')].filter(button => button.checkVisibility()).every(button => button.getBoundingClientRect().height >= 40)",
      ),
    );
    await click("#dialog-trigger");
    await until(
      () => evaluate("document.querySelector('dialog').open"),
      "dialog open",
    );
    assert(
      await evaluate(
        "document.activeElement.hasAttribute('data-dialog-cancel')",
      ),
      "initial focus on cancel",
    );
    assert(
      await evaluate(
        "document.querySelector('dialog').scrollWidth <= document.querySelector('dialog').clientWidth",
      ),
      "dialog overflow",
    );
    await key("Tab", true);
    assert(
      await evaluate("document.activeElement.textContent === 'Confirm'"),
      "reverse focus trap",
    );
    await key("Tab");
    assert(
      await evaluate(
        "document.activeElement.hasAttribute('data-dialog-cancel')",
      ),
      "forward focus trap",
    );
    if (width === 390) {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      await writeFile(
        join(profile, "dialog-390.png"),
        Buffer.from(data, "base64"),
      );
    }
    await key("Escape");
    await until(
      () => evaluate("!document.querySelector('dialog').open"),
      "Escape closes dialog",
    );
    assert(
      await evaluate("document.activeElement.id === 'dialog-trigger'"),
      "restore trigger focus",
    );
  }

  await evaluate(
    "document.querySelectorAll('.ui-button:disabled').forEach(button => button.click())",
  );
  assert.equal(
    await evaluate("document.querySelector('#actions').textContent"),
    "0",
  );
  await key("Tab");
  for (const variant of [
    "primary",
    "secondary",
    "tertiary",
    "danger",
    "ghost",
    "icon",
  ]) {
    await evaluate(`document.querySelector('#button-${variant}').focus()`);
    const focus = await evaluate(
      `getComputedStyle(document.querySelector('#button-${variant}')).outlineStyle`,
    );
    assert.equal(focus, "solid", `${variant} focus outline`);
    await key("Enter");
  }
  assert.equal(
    await evaluate("document.querySelector('#actions').textContent"),
    "6",
  );

  const primary = await evaluate(
    "(() => { const button = document.querySelector('#button-primary'); button.scrollIntoView(); const rect = button.getBoundingClientRect(); return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }; })()",
  );
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...primary });
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('#button-primary')).backgroundColor",
    ),
    "rgb(29, 78, 216)",
  );

  await click("#password + button");
  await until(
    () => evaluate("document.querySelector('#password').type === 'text'"),
    "reveal password",
  );
  assert.equal(
    await evaluate("document.querySelector('#password').value"),
    "example-password",
  );
  assert.equal(
    await evaluate("document.querySelector('#submits').textContent"),
    "0",
  );
  await key("Tab");
  await click("#password + button");
  assert.equal(
    await evaluate("document.querySelector('#password').type"),
    "password",
  );

  for (const id of ["checkbox", "switch"]) {
    await evaluate(`document.querySelector('#${id}').focus()`);
    await key(" ");
    assert(
      await evaluate(`document.querySelector('#${id}').checked`),
      `${id} toggles with Space`,
    );
  }
  await evaluate(
    "document.querySelector('#disabled-checkbox').closest('label').click(); document.querySelector('#disabled-switch').closest('label').click()",
  );
  assert.equal(
    await evaluate("document.querySelector('#disabled-checkbox').checked"),
    false,
  );
  assert.equal(
    await evaluate("document.querySelector('#disabled-switch').checked"),
    true,
  );
  await evaluate("document.querySelector('#select').focus()");
  await key("ArrowDown");
  await key("Enter");
  assert.equal(
    await evaluate("document.querySelector('#select').value"),
    "admin",
  );

  await click("#submit");
  await until(
    () => evaluate("document.querySelector('#submit').disabled"),
    "pending submit",
  );
  await click("#submit");
  assert.equal(
    await evaluate("document.querySelector('#submits').textContent"),
    "1",
  );
  await click('[aria-label="Dismiss notification"]');
  assert(
    await evaluate("!document.querySelector('.ui-toast')"),
    "toast dismiss",
  );
  await click("#dialog-trigger");
  await until(
    () => evaluate("document.querySelector('dialog').open"),
    "reopen dialog",
  );
  await click("dialog .ui-button[data-variant='danger']");
  await until(
    () =>
      evaluate(
        "document.querySelector('dialog .ui-button[data-variant=\"danger\"]').disabled",
      ),
    "pending confirmation",
  );
  assert(
    await evaluate("document.activeElement.hasAttribute('data-dialog-cancel')"),
    "pending confirmation keeps focus on cancel",
  );
  await key("Tab");
  assert(
    await evaluate("document.activeElement.hasAttribute('data-dialog-cancel')"),
    "disabled confirmation is skipped by focus trap",
  );
  await click("dialog .ui-button[data-variant='danger']");
  assert.equal(
    await evaluate("document.querySelector('#confirmations').textContent"),
    "1",
  );
  await click("[data-dialog-cancel]");
  await until(
    () => evaluate("!document.querySelector('dialog').open"),
    "cancel closes dialog",
  );
  assert.equal(await evaluate("document.activeElement.id"), "dialog-trigger");

  const ax = await send("Accessibility.getFullAXTree");
  assert(
    ax.nodes.some(
      (node) => node.role?.value === "switch" && node.name?.value === "Enabled",
    ),
  );
  assert(
    ax.nodes.some(
      (node) =>
        node.role?.value === "progressbar" &&
        node.name?.value === "Loading files" &&
        !node.value,
    ),
  );
  assert(
    ax.nodes.some(
      (node) =>
        node.role?.value === "textbox" &&
        node.name?.value === "Email" &&
        node.properties?.some(
          (property) =>
            property.name === "invalid" && property.value.value === "true",
        ),
    ),
  );
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('#skeleton')).animationName",
    ),
    "none",
  );
  await send("Emulation.setEmulatedMedia", { features: [] });
  assert.deepEqual(browserErrors, []);
  console.log(
    "PASS: primitive states, keyboard, modal focus, ARIA tree and five responsive widths.",
  );

  if (app) {
    if (
      !process.argv.includes("--member-only") &&
      !process.argv.includes("--admin-only") &&
      !process.argv.includes("--super-admin-only")
    ) {
      await checkApp(app);
      await send("Fetch.disable");
      await checkPublicAuth({
        origin: app,
        profile,
        socket,
        send,
        evaluate,
        key,
        click,
        navigate,
        until,
      });
    }
    if (
      !process.argv.includes("--admin-only") &&
      !process.argv.includes("--super-admin-only")
    )
      await checkMember({
        origin: app,
        profile,
        socket,
        send,
        evaluate,
        key,
        click,
        navigate,
        until,
      });
    if (
      !process.argv.includes("--member-only") &&
      !process.argv.includes("--super-admin-only")
    )
      await checkAdmin({
        origin: app,
        profile,
        socket,
        send,
        evaluate,
        key,
        click,
        navigate,
        until,
      });
    if (
      !process.argv.includes("--member-only") &&
      !process.argv.includes("--admin-only")
    )
      await checkSuperAdmin({
        origin: app,
        profile,
        socket,
        send,
        evaluate,
        key,
        click,
        navigate,
        until,
      });
    assert.deepEqual(browserErrors, [], "production runtime exceptions");
    await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    }).then(({ data }) =>
      writeFile(join(profile, "login-390.png"), Buffer.from(data, "base64")),
    );
    console.log(`Screenshots: ${profile}/login-390.png`);
  }
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    await send("Browser.close").catch(() => {});
  }
  socket?.close();
  chrome.kill();
  await server.close();
  // Keep screenshots for inspection; remove only the profile created by this check otherwise.
  if (!app) {
    assert(profile.startsWith(join(tmpdir(), "corebase-phase-a2-")));
    await rm(profile, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
}

async function checkApp(origin) {
  let role = null;
  let permissions = [];
  let holdRefresh = false;
  let holdMe = false;
  const authRequests = [];
  const refreshRequests = [];
  const meRequests = [];
  const logoutRequests = [];
  const sessionRequests = [];
  const responseHeaders = [
    { name: "Content-Type", value: "application/json" },
    { name: "Access-Control-Allow-Origin", value: new URL(origin).origin },
    { name: "Access-Control-Allow-Credentials", value: "true" },
    { name: "Access-Control-Allow-Methods", value: "GET,POST,DELETE,OPTIONS" },
    {
      name: "Access-Control-Allow-Headers",
      value: "content-type,authorization",
    },
  ];
  const user = {
    id: "ui-test-user",
    email: `${"long-address".repeat(12)}@example.com`,
    displayName: "U".repeat(180),
    status: "ACTIVE",
    hasPassword: true,
    emailVerifiedAt: "2026-10-08T00:00:00Z",
    createdAt: "2026-10-08T00:00:00Z",
    updatedAt: "2026-10-08T00:00:00Z",
  };
  const intercept = async ({ data }) => {
    const message = JSON.parse(data);
    if (message.method !== "Fetch.requestPaused") return;
    const { requestId, request } = message.params;
    const url = new URL(request.url);
    if (request.method !== "OPTIONS") {
      sessionRequests.push({
        path: url.pathname,
        method: request.method,
        headers: request.headers,
      });
      if (url.pathname.endsWith("/auth/refresh") && holdRefresh) {
        refreshRequests.push(requestId);
        return;
      }
      if (url.pathname.endsWith("/auth/me") && holdMe) {
        meRequests.push(requestId);
        return;
      }
      if (url.pathname.endsWith("/auth/logout")) {
        logoutRequests.push(requestId);
        return;
      }
    }
    if (
      request.method === "POST" &&
      /\/auth\/(login|register)$/.test(url.pathname)
    ) {
      authRequests.push(requestId);
      return;
    }
    if (!url.pathname.startsWith("/api/v1/")) {
      await send("Fetch.failRequest", {
        requestId,
        errorReason: "BlockedByClient",
      });
      return;
    }
    let status = 200;
    let payload = {};
    if (url.pathname.endsWith("/auth/refresh")) {
      status = role ? 200 : 401;
      payload = role
        ? { accessToken: "ui-fixture-token", accessTokenExpiresInSeconds: 900 }
        : {};
    } else if (url.pathname.endsWith("/auth/me")) {
      payload = { user, access: { roles: [role], permissions } };
    } else if (url.pathname.endsWith("/auth/sessions"))
      payload = { sessions: [] };
    else if (url.pathname.endsWith("/files")) payload = [];
    else if (
      url.pathname.endsWith("/users") &&
      permissions.includes("users:read")
    )
      payload = { users: [] };
    else if (
      url.pathname.endsWith("/audit-logs") &&
      permissions.includes("audit:read")
    )
      payload = { auditLogs: [], nextCursor: null };
    else if (
      url.pathname.endsWith("/system/email-verification") &&
      role === "SUPER_ADMIN"
    )
      payload = { enabled: true };
    else status = 403;
    await send("Fetch.fulfillRequest", {
      requestId,
      responseCode: request.method === "OPTIONS" ? 204 : status,
      responseHeaders,
      body: Buffer.from(
        JSON.stringify({
          success: status === 200,
          data: payload,
          ...(status === 401
            ? { error: { code: "INVALID_REFRESH_TOKEN" } }
            : {}),
        }),
      ).toString("base64"),
    });
  };
  socket.addEventListener("message", intercept);
  await send("Fetch.enable", {
    patterns: [{ urlPattern: "*/api/v1/*", requestStage: "Request" }],
  });

  for (const [route, currentRole] of [
    ["/login", null],
    ["/register", null],
    ["/account", "MEMBER"],
    ["/admin", "ADMIN"],
    ["/super-admin", "SUPER_ADMIN"],
  ]) {
    role = currentRole;
    permissions =
      role === "ADMIN" || role === "SUPER_ADMIN"
        ? ["users:read", "audit:read"]
        : [];
    for (const width of [320, 390, 768, 1280, 1600]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await navigate(`${origin}${route}`);
      await until(
        () => evaluate("!!document.querySelector('.app-content h1')"),
        `hydrate ${route}`,
      );
      if (role)
        await until(
          () => evaluate("!!document.querySelector('.ui-role-badge')"),
          `role navigation ${role}`,
        );
      else
        await until(
          () => evaluate("!!document.querySelector('input[name=email]')"),
          "auth inputs",
        );
      await viewport(width);
      if (role) {
        assert.equal(
          await evaluate(
            "document.querySelector('.ui-role-badge').textContent",
          ),
          role.replace("_", " "),
        );
        await checkShell(width, route, origin);
      } else {
        assert(await evaluate("!document.querySelector('.role-app-shell')"));
        assert(
          await evaluate(
            "getComputedStyle(document.querySelector('.ui-input')).borderRadius === '8px'",
          ),
        );
      }
      if (
        (route === "/register" && width === 390) ||
        (route === "/admin" && width === 1280)
      ) {
        const { data } = await send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: true,
        });
        await writeFile(
          join(profile, `${route.slice(1)}-${width}.png`),
          Buffer.from(data, "base64"),
        );
      }
    }
  }

  const memberLinks = ["/account", "/account/files"];
  for (const [currentRole, granted, expected] of [
    ["MEMBER", [], memberLinks],
    ["ADMIN", [], ["/admin", ...memberLinks]],
    ["ADMIN", ["users:read"], ["/admin", "/admin/users", ...memberLinks]],
    ["ADMIN", ["audit:read"], ["/admin", "/admin/audit-logs", ...memberLinks]],
    [
      "SUPER_ADMIN",
      [],
      [
        "/super-admin",
        "/super-admin?tab=email-verification",
        "/super-admin?tab=rbac",
        ...memberLinks,
      ],
    ],
    [
      "SUPER_ADMIN",
      ["users:read", "audit:read"],
      [
        "/super-admin",
        "/admin/users",
        "/admin/audit-logs",
        "/super-admin?tab=email-verification",
        "/super-admin?tab=rbac",
        ...memberLinks,
      ],
    ],
  ]) {
    role = currentRole;
    permissions = granted;
    for (const width of [390, 1280]) {
      await viewport(width);
      await navigate(`${origin}/account`);
      await until(
        () => evaluate("!!document.querySelector('.role-app-shell')"),
        "role shell",
      );
      if (width < 768) await click(".shell-drawer-trigger");
      const selector = width < 768 ? ".shell-drawer[open]" : ".shell-sidebar";
      await until(
        () => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`),
        "visible role navigation",
      );
      assert.deepEqual(
        await evaluate(
          `[...document.querySelectorAll('${selector} nav a')].map(link => link.getAttribute('href'))`,
        ),
        expected,
      );
      if (width < 768) await key("Escape");
    }
  }

  role = "ADMIN";
  permissions = ["users:read", "audit:read"];
  await viewport(390);
  await navigate(`${origin}/admin`);
  await until(
    () => evaluate("!!document.querySelector('.role-app-shell')"),
    "navigation shell",
  );
  await click(".shell-drawer-trigger");
  await click('.shell-drawer a[href="/account/files"]');
  await until(
    () =>
      evaluate(
        "location.pathname === '/account/files' && !document.querySelector('.shell-drawer').open",
      ),
    "drawer route closes",
  );
  assert.deepEqual(
    await evaluate(
      "[...document.querySelectorAll('.shell-sidebar [aria-current=page]')].map(link => link.getAttribute('href'))",
    ),
    ["/account/files"],
  );
  await click(".shell-drawer-trigger");
  await viewport(768);
  await until(
    () =>
      evaluate(
        "!document.querySelector('.shell-drawer').open && !document.querySelector('.shell-drawer-trigger').getAttribute('aria-expanded').includes('true')",
      ),
    "resize releases modal",
  );
  for (const route of ["/admin/users", "/admin/audit-logs"]) {
    await navigate(`${origin}${route}`);
    await until(
      () =>
        evaluate(
          `!!document.querySelector('.shell-sidebar a[aria-current=page][href="${route}"]')`,
        ),
      "active admin route",
    );
    await viewport(768);
  }

  for (const route of ["/account", "/admin", "/super-admin"]) {
    role =
      route === "/account"
        ? "MEMBER"
        : route === "/admin"
          ? "ADMIN"
          : "SUPER_ADMIN";
    permissions = role === "MEMBER" ? [] : ["users:read", "audit:read"];
    holdRefresh = true;
    refreshRequests.length = 0;
    sessionRequests.length = 0;
    await navigate(`${origin}${route}`);
    await until(
      () => refreshRequests.length === 1,
      "restore starts with refresh",
    );
    assert(
      await evaluate("!document.querySelector('.role-app-shell')"),
      "no shell before session restoration",
    );
    assert(
      !sessionRequests.some((request) => request.path.endsWith("/auth/me")),
      "me waits for refresh",
    );
    holdRefresh = false;
    await send("Fetch.fulfillRequest", {
      requestId: refreshRequests[0],
      responseCode: 200,
      responseHeaders,
      body: Buffer.from(
        JSON.stringify({
          success: true,
          data: {
            accessToken: "ui-fixture-token",
            accessTokenExpiresInSeconds: 900,
          },
        }),
      ).toString("base64"),
    });
    await until(
      () => evaluate("!!document.querySelector('.role-app-shell')"),
      "session restores shell",
    );
    assert.equal(
      sessionRequests.filter((request) => request.path.endsWith("/auth/me"))
        .length,
      1,
    );
    assert(
      Object.entries(
        sessionRequests.find((request) => request.path.endsWith("/auth/me"))
          .headers,
      ).some(
        ([name, value]) =>
          name.toLowerCase() === "authorization" &&
          value === "Bearer ui-fixture-token",
      ),
    );
    await click(".shell-account-trigger");
    await click(".shell-account-menu button");
    await until(
      () =>
        evaluate(
          "document.querySelector('.shell-account-menu button').disabled",
        ),
      "logout pending",
    );
    await until(() => logoutRequests.length === 1, "one logout request");
    await click(".shell-account-menu button");
    assert.equal(
      logoutRequests.length,
      1,
      "pending logout blocks repeated clicks",
    );
    role = null;
    await send("Fetch.fulfillRequest", {
      requestId: logoutRequests.pop(),
      responseCode: 200,
      responseHeaders,
      body: Buffer.from(JSON.stringify({ success: true, data: {} })).toString(
        "base64",
      ),
    });
    await until(
      () =>
        evaluate(
          "location.pathname === '/login' && !document.querySelector('.role-app-shell')",
        ),
      "logout clears shell and redirects",
    );
    await navigate(`${origin}${route}`);
    await until(
      () =>
        sessionRequests.filter((request) =>
          request.path.endsWith("/auth/refresh"),
        ).length === 2,
      "expired refresh request",
    );
    await until(
      () =>
        evaluate(
          "document.querySelector('.app-content').textContent.includes('ch\u01b0a')",
        ),
      "expired refresh shows guest",
    );
    assert(await evaluate("!document.querySelector('.role-app-shell')"));
    assert.equal(
      sessionRequests.filter((request) => request.path.endsWith("/auth/me"))
        .length,
      1,
      "failed refresh does not request me",
    );
  }
  console.log(
    "PASS: shell dimensions/states, role-permission matrix, drawer/dropdown keyboard, active routes, session restoration and logout (API fixtures).",
  );

  for (const currentRole of [null, "MEMBER", "ADMIN", "SUPER_ADMIN"]) {
    role = currentRole;
    permissions = ["users:read", "audit:read", "roles:manage"];
    for (const width of [390, 1280]) {
      await viewport(width);
      holdRefresh = holdMe = true;
      refreshRequests.length = meRequests.length = sessionRequests.length = 0;
      await navigate(`${origin}/super-admin`);
      await until(() => refreshRequests.length === 1, "guard pending refresh");
      await until(
        () =>
          evaluate("!!document.querySelector('.app-content [role=status]')"),
        "permission loading state",
      );
      const settingsRequests = () =>
        sessionRequests.filter((request) =>
          request.path.endsWith("/system/email-verification"),
        );
      assert.equal(
        settingsRequests().length,
        0,
        "loading does not fetch protected settings",
      );
      assert(
        await evaluate(
          "!document.querySelector('.app-content').textContent.includes('Cài đặt xác thực email')",
        ),
      );
      holdRefresh = false;
      await send("Fetch.fulfillRequest", {
        requestId: refreshRequests[0],
        responseCode: role ? 200 : 401,
        responseHeaders,
        body: Buffer.from(
          JSON.stringify({
            success: !!role,
            ...(!role ? { error: { code: "INVALID_REFRESH_TOKEN" } } : {}),
            data: role
              ? {
                  accessToken: "ui-fixture-token",
                  accessTokenExpiresInSeconds: 900,
                }
              : {},
          }),
        ).toString("base64"),
      });
      if (role) {
        await until(() => meRequests.length === 1, "guard pending me");
        assert(
          await evaluate(
            "!!document.querySelector('.app-content [role=status]')",
          ),
        );
        assert.equal(
          settingsRequests().length,
          0,
          "token alone does not authorize settings",
        );
        holdMe = false;
        await send("Fetch.fulfillRequest", {
          requestId: meRequests[0],
          responseCode: 200,
          responseHeaders,
          body: Buffer.from(
            JSON.stringify({
              success: true,
              data: { user, access: { roles: [role], permissions } },
            }),
          ).toString("base64"),
        });
      } else holdMe = false;
      if (role === "SUPER_ADMIN") {
        await until(
          () =>
            evaluate(
              "document.querySelector('.app-content').textContent.includes('Cài đặt xác thực email')",
            ),
          "authorized settings mount",
        );
        await until(
          () => settingsRequests().length === 1,
          "authorized dashboard setting read",
        );
        assert.equal(settingsRequests().length, 1);
        assert.equal(settingsRequests()[0].method, "GET");
      } else {
        const code = role ? "403" : "401";
        await until(
          () =>
            evaluate(
              `document.querySelector('.app-content [role=alert]')?.textContent.includes('${code}')`,
            ),
          `${currentRole ?? "guest"} guard state`,
        );
        assert.equal(
          settingsRequests().length,
          0,
          `${currentRole ?? "guest"} never calls protected settings API`,
        );
        assert(
          await evaluate(
            "!document.querySelector('.app-content').textContent.includes('Cài đặt xác thực email')",
          ),
        );
        if (!role)
          assert(
            await evaluate(
              "!!document.querySelector('.app-content a[href=\"/login\"]')",
            ),
          );
      }
      await viewport(width);
    }
  }
  console.log(
    "PASS: super-admin guard loading/401/403/allowed states at mobile/desktop; settings requests only after verified SUPER_ADMIN (API fixtures).",
  );

  role = null;
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  for (const route of ["/login", "/register"]) {
    authRequests.length = 0;
    await navigate(`${origin}${route}`);
    await until(
      () => evaluate("!!document.querySelector('input[name=email]')"),
      `pending form ${route}`,
    );
    for (const [name, text] of [
      ["email", "ui@example.com"],
      ["password", "example-password"],
      ["confirmPassword", "example-password"],
      ["displayName", "UI Test"],
    ]) {
      if (!(await evaluate(`!!document.querySelector('input[name=${name}]')`)))
        continue;
      await evaluate(`document.querySelector('input[name=${name}]').focus()`);
      await send("Input.insertText", { text });
    }
    await click('button[type="submit"]');
    await until(
      () => authRequests.length === 1,
      `one pending ${route} request`,
    );
    await until(
      () => evaluate("document.querySelector('button[type=submit]').disabled"),
      `${route} loading`,
    );
    await click('button[type="submit"]');
    await evaluate("document.querySelector('input[name=password]').focus()");
    await key("Enter");
    assert.equal(
      authRequests.length,
      1,
      `${route} blocks repeated click and implicit Enter submit`,
    );
    await send("Fetch.fulfillRequest", {
      requestId: authRequests[0],
      responseCode: 400,
      responseHeaders,
      body: Buffer.from(
        JSON.stringify({ success: false, error: { code: "UI_TEST_FAILURE" } }),
      ).toString("base64"),
    });
    await until(
      () => evaluate("!document.querySelector('button[type=submit]').disabled"),
      `${route} releases loading after error`,
    );
    assert(
      await evaluate("!!document.querySelector('[role=alert]')"),
      `${route} announces server error`,
    );
  }
  await navigate(`${origin}/login`);
  await until(
    () => evaluate("!!document.querySelector('input[name=email]')"),
    "login for screenshot",
  );
  await click('button[type="submit"]');
  await until(
    () =>
      evaluate("document.querySelectorAll('[aria-invalid=true]').length === 2"),
    "RHF validation through Input refs",
  );
  await evaluate(
    "new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))",
  );
  assert.equal(await evaluate("document.activeElement.name"), "email");
  await evaluate("document.querySelector('input[name=password]').focus()");
  await key("Tab");
  assert.equal(
    await evaluate("document.activeElement.getAttribute('aria-label')"),
    "Show password",
  );
  await key("Enter");
  assert.equal(
    await evaluate("document.querySelector('input[name=password]').type"),
    "text",
  );
  console.log(
    "PASS: production auth forms including double-submit/error recovery, role navigation and 25 responsive cases (API fixtures).",
  );
  socket.removeEventListener("message", intercept);
}

async function checkShell(width, route, origin) {
  const sidebarWidth = await evaluate(
    "document.querySelector('.shell-sidebar').getBoundingClientRect().width",
  );
  assert.equal(sidebarWidth, width < 768 ? 0 : width < 1200 ? 72 : 248);
  assert.equal(
    await evaluate(
      "document.querySelector('.shell-topbar').getBoundingClientRect().height",
    ),
    64,
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.shell-avatar').getBoundingClientRect().width",
    ),
    32,
  );
  assert.deepEqual(
    await evaluate(
      "[...document.querySelectorAll('.shell-sidebar [aria-current=page]')].map(link => link.getAttribute('href'))",
    ),
    [route],
  );
  assert(
    await evaluate(
      "[...document.querySelectorAll('.shell-sidebar nav a')].every(link => link.getAttribute('aria-label') && link.title)",
    ),
  );
  await evaluate("document.querySelector('.skip-link').focus()");
  await key("Enter");
  assert.equal(
    await evaluate("document.activeElement.id"),
    "main-content",
    "skip link targets content",
  );

  if (width < 768) {
    await click(".shell-drawer-trigger");
    await until(
      () => evaluate("document.querySelector('.shell-drawer').open"),
      "drawer opens",
    );
    assert.equal(
      await evaluate("document.activeElement.getAttribute('aria-label')"),
      "Close navigation",
    );
    assert(
      await evaluate(
        "document.querySelector('.shell-drawer').scrollWidth <= document.querySelector('.shell-drawer').clientWidth",
      ),
    );
    await key("Tab", true);
    assert.equal(
      await evaluate("document.activeElement.getAttribute('href')"),
      "/account/files",
    );
    await key("Tab");
    assert.equal(
      await evaluate("document.activeElement.getAttribute('aria-label')"),
      "Close navigation",
    );
    await key("Tab");
    assert(
      await evaluate(
        "!!document.activeElement.closest('.shell-drawer nav') && getComputedStyle(document.activeElement).outlineStyle === 'solid'",
      ),
    );
    const ax = await send("Accessibility.getFullAXTree");
    assert(
      ax.nodes.some(
        (node) =>
          node.role?.value === "dialog" &&
          node.name?.value === "Main navigation",
      ),
    );
    await key("Escape");
    await until(
      () => evaluate("!document.querySelector('.shell-drawer').open"),
      "Escape closes drawer",
    );
    assert(
      await evaluate("document.activeElement.matches('.shell-drawer-trigger')"),
    );
    await click(".shell-drawer-trigger");
    await click('.shell-drawer [aria-label="Close navigation"]');
    await until(
      () => evaluate("document.activeElement.matches('.shell-drawer-trigger')"),
      "Close restores trigger",
    );
    if (route === "/admin" && width === 390) {
      await click(".shell-drawer-trigger");
      const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      await writeFile(
        join(profile, "drawer-390.png"),
        Buffer.from(data, "base64"),
      );
      await key("Escape");
    }
  } else {
    await evaluate("document.querySelector('.shell-sidebar nav a').focus()");
    await key("Tab");
    assert(
      await evaluate(
        "!!document.activeElement.closest('.shell-sidebar nav') && getComputedStyle(document.activeElement).outlineStyle === 'solid'",
      ),
    );
    const point = await evaluate(
      "(() => { const r = document.querySelector('.shell-sidebar nav a:not([aria-current])').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()",
    );
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    assert.equal(
      await evaluate(
        "getComputedStyle(document.querySelector('.shell-sidebar nav a:not([aria-current])')).backgroundColor",
      ),
      "rgb(241, 245, 249)",
    );
  }

  await evaluate("document.querySelector('.shell-account-trigger').focus()");
  await key("Enter");
  assert(
    await evaluate(
      "document.querySelector('.shell-account-menu').matches(':popover-open')",
    ),
  );
  const accountAx = await send("Accessibility.getFullAXTree");
  assert(
    accountAx.nodes.some(
      (node) =>
        node.role?.value === "group" && node.name?.value === "Account options",
    ),
  );
  await viewport(width);
  await key("Tab");
  assert(
    await evaluate("document.activeElement.matches('.shell-account-menu a')"),
  );
  await key("Escape");
  assert(
    await evaluate(
      "!document.querySelector('.shell-account-menu').matches(':popover-open') && document.activeElement.matches('.shell-account-trigger')",
    ),
  );
  await click(".shell-account-trigger");
  await click(".shell-topbar");
  assert(
    await evaluate(
      "!document.querySelector('.shell-account-menu').matches(':popover-open')",
    ),
    "account popover light dismiss",
  );
  await click(".shell-account-trigger");
  if (route === "/admin" && width === 768) {
    const { data } = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    await writeFile(
      join(profile, "account-768.png"),
      Buffer.from(data, "base64"),
    );
  }
  await click('.shell-account-menu a[href="/account"]');
  await until(
    () =>
      evaluate(
        "location.pathname === '/account' && !document.querySelector('.shell-account-menu').matches(':popover-open')",
      ),
    "account link closes popover",
  );
  if (route !== "/account") {
    await navigate(`${origin}${route}`);
    await until(
      () => evaluate("!!document.querySelector('.role-app-shell')"),
      "restore route after account link",
    );
  }
}
