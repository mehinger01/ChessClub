const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const { createServer } = await import(
    process.cwd() + "/artifacts/owls-chess/node_modules/vite/dist/node/index.js"
  );
  const server = await createServer({
    configFile: process.cwd() + "/artifacts/owls-chess/vite.config.ts",
    server: { host: "127.0.0.1", port: 5191 },
  });
  await server.listen();
  const browser = await chromium.launch({
    ...(process.env.CHESS_BROWSER_EXECUTABLE
      ? { executablePath: process.env.CHESS_BROWSER_EXECUTABLE }
      : {}),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-zygote",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const checks = [];
  const errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5191/");
    await page.waitForSelector("header");
    await page.evaluate(async () => {
      const { useStudentStore } = await import("/src/stores/studentStore.ts");
      useStudentStore.getState().addStudent("Alpha", "A");
      useStudentStore.getState().addStudent("Beta", "B");
    });
    await page
      .getByRole("link", { name: /Free Play/ })
      .first()
      .click();
    await page.getByTestId("pregame-start").click();
    await page.evaluate(async () => {
      const { useGameStore } = await import("/src/stores/gameStore.ts");
      const { useStudentStore } = await import("/src/stores/studentStore.ts");
      const s = useStudentStore.getState();
      useGameStore.getState().tryMove("e2", "e4");
      s.setActiveStudent(s.students[1].id);
      useGameStore.getState().resign("b");
    });
    await page.getByTestId("record-result").waitFor();
    assert.match(await page.getByTestId("record-result").innerText(), /win/);
    assert.match(
      await page.locator("body").innerText(),
      /Record this result for Alpha A/,
    );
    await page.getByTestId("record-result").click();
    await page
      .getByRole("link", { name: /Roster/ })
      .first()
      .click();
    await page
      .getByRole("link", { name: /Free Play/ })
      .first()
      .click();
    await page.getByText("Recorded for Alpha A.").waitFor();
    const state = await page.evaluate(() => ({
      students: JSON.parse(localStorage.getItem("owls_students_v2")),
      games: JSON.parse(localStorage.getItem("owls_game_records_v1")),
    }));
    assert.equal(state.students[0].wins, 1);
    assert.equal(state.students[1].gamesPlayed, 0);
    assert.equal(Object.values(state.games)[0].length, 1);
    checks.push(
      "game result stays bound and route remount does not duplicate history",
    );
    await page.getByRole("link", { name: /Admin/ }).first().click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export full backup/ }).click();
    const file = await download;
    const backup = JSON.parse(fs.readFileSync(await file.path(), "utf8"));
    assert.equal(backup.version, 3);
    assert.equal(backup.gameArchive.length, 1);
    assert.equal(Object.values(backup.gameRecords)[0].length, 1);
    checks.push("Admin backup download includes both game histories");
    await page
      .locator('input[type=file][accept="application/json"]')
      .first()
      .setInputFiles({
        name: "invalid.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({ version: 3, students: [] })),
      });
    await page.getByText(/Import failed:/).waitFor();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("owls_students_v2"))[0].wins,
      ),
      1,
    );
    checks.push("Admin rejects invalid restore without changing records");
    await page.close();
    await server.close();
    process.env.VITE_CHESS_ACCOUNTS_ENABLED = "true";
    process.env.VITE_SUPABASE_URL = "https://chess-test.supabase.co";
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    const hosted = await createServer({
      configFile: process.cwd() + "/artifacts/owls-chess/vite.config.ts",
      server: { host: "127.0.0.1", port: 5192 },
      cacheDir: "/tmp/chess-hosted-vite-cache",
    });
    await hosted.listen();
    try {
      const p = await browser.newPage();
      p.on("pageerror", (e) => errors.push(e.message));
      let nickname = "Player A";
      const id = "00000000-0000-4000-8000-000000000001";
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token =
        [
          { alg: "HS256", typ: "JWT" },
          { sub: id, exp, aud: "authenticated", role: "authenticated" },
        ]
          .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url"))
          .join(".") + ".test";
      const user = {
        id,
        aud: "authenticated",
        role: "authenticated",
        email: "student@example.test",
        app_metadata: { provider: "email" },
        user_metadata: { display_name: "Player A" },
        created_at: new Date().toISOString(),
      };
      await p.route("https://chess-test.supabase.co/**", async (route) => {
        const req = route.request(),
          url = new URL(req.url());
        let data = null,
          status = 200;
        if (req.method() === "OPTIONS") status = 204;
        else if (url.pathname === "/auth/v1/token")
          data = {
            access_token: token,
            refresh_token: "test-refresh",
            expires_in: 3600,
            expires_at: exp,
            token_type: "bearer",
            user,
          };
        else if (url.pathname === "/auth/v1/user") data = user;
        else if (url.pathname === "/auth/v1/logout") status = 204;
        else if (url.pathname === "/auth/v1/recover") data = {};
        else if (url.pathname === "/auth/v1/signup")
          data = { user, session: null };
        else if (url.pathname === "/rest/v1/chess_profiles") {
          if (req.method() === "GET")
            data = { user_id: id, display_name: nickname };
          else if (req.method() === "PATCH") {
            nickname = req.postDataJSON().display_name;
            status = 204;
          } else status = 201;
        } else if (url.pathname === "/rest/v1/chess_memberships")
          data = [
            {
              club_id: "00000000-0000-4000-8000-000000000011",
              role: "student",
              chess_clubs: { name: "Falcons Chess Club" },
            },
          ];
        else
          throw new Error(
            "Unexpected API " + req.method() + " " + url.pathname,
          );
        await route.fulfill({
          status,
          contentType: "application/json",
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "*",
          },
          body: status === 204 ? "" : JSON.stringify(data),
        });
      });
      await p.goto("http://127.0.0.1:5192/admin");
      await p.getByLabel("Email", { exact: true }).fill("student@example.test");
      await p.getByLabel("Password", { exact: true }).fill("test-password-123");
      await p.getByRole("button", { name: "Sign in", exact: true }).click();
      await p.getByRole("heading", { name: "Welcome, Player A" }).waitFor();
      assert.equal(
        await p.getByRole("button", { name: /Export full backup/ }).count(),
        0,
      );
      checks.push(
        "hosted sign-in loads profile and blocks legacy admin screen (mock Supabase API)",
      );
      await p.getByLabel("Change display name").fill("Knight Learner");
      await p.getByRole("button", { name: "Save display name" }).click();
      await p
        .getByRole("heading", { name: "Welcome, Knight Learner" })
        .waitFor();
      await p.reload();
      await p
        .getByRole("heading", { name: "Welcome, Knight Learner" })
        .waitFor();
      checks.push("hosted profile update and session restoration (mock API)");
      await p.getByRole("button", { name: "Sign out", exact: true }).click();
      await p.getByRole("heading", { name: "Welcome back" }).waitFor();
      checks.push("sign-out removes account view");
      await p.getByRole("button", { name: "Forgot password?" }).click();
      await p.getByLabel("Email", { exact: true }).fill("student@example.test");
      await p.getByRole("button", { name: "Send reset link" }).click();
      await p
        .getByText(
          "If that email has an account, a reset link will arrive shortly.",
        )
        .waitFor();
      checks.push("password reset feedback (mock API; no email sent)");
      await p.close();
    } finally {
      await hosted.close();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ checks, pageErrors: errors }, null, 2));
  } finally {
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
