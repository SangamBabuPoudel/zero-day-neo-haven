import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const baseURL = process.env.GAME_URL || "http://127.0.0.1:3000";
const output = resolve(process.env.SCREENSHOT_DIR || "test-results/browser");
await mkdir(output, { recursive: true });
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const pages = [],
  errors = [];
try {
  for (const name of ["Alpha", "Beta", "Gamma"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    pages.push(page);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(baseURL);
    await page.waitForTimeout(1700);
    await page.getByLabel("OPERATOR CALLSIGN").fill(name);
  }
  const [a, b, c] = pages;
  await a.getByRole("button", { name: /CREATE OPERATION/ }).click();
  await a.locator(".room-code").waitFor();
  const code = await a.locator(".room-code").innerText();
  for (const p of [b, c]) {
    await p.getByLabel("ROOM CODE", { exact: true }).fill(code);
    await p.getByRole("button", { name: /JOIN OPERATION/ }).click();
    await p.locator(".room-code").waitFor();
  }
  await a.getByRole("button", { name: /START OPERATION/ }).click();
  await Promise.all(
    pages.map((p) => p.locator(".city .agent").first().waitFor()),
  );
  assert.equal(await a.locator(".city .district").count(), 6);
  assert.equal(await a.locator(".city .agent").count(), 3);
  await a.getByRole("button", { name: /DATA CENTER\. Infected/ }).click();
  await a.locator(".travel-notice").filter({ hasText: "IN TRANSIT" }).waitFor();
  await a.getByRole("button", { name: /REPAIR SYSTEM/ }).waitFor();
  await a.waitForFunction(
    () => !document.querySelector(".interior .primary").disabled,
  );
  await a.getByRole("button", { name: /REPAIR SYSTEM/ }).click();
  await a.locator(".bad-cell").first().waitFor();
  for (let i = 0; i < 3; i++) {
    await a.locator(".bad-cell:not(.done-cell)").first().click();
    await a.waitForTimeout(180);
  }
  await a.waitForTimeout(900);
  await a.getByRole("button", { name: /COMMIT REPAIR/ }).click();
  await b.getByRole("button", { name: /DATA CENTER\. Secure/ }).waitFor();
  await a.getByRole("button", { name: /POWER PLANT\./ }).click();
  await b.getByRole("button", { name: /SURVEILLANCE HUB\./ }).click();
  await a
    .getByRole("button", { name: /TAKE FIELD SWITCH PANEL/ })
    .waitFor({ timeout: 25000 });
  await a.getByRole("button", { name: /TAKE FIELD SWITCH PANEL/ }).click();
  await b
    .getByRole("button", { name: /ACCESS PRIVATE SHUTDOWN SEQUENCE/ })
    .click();
  await b.locator(".shutdown-sequence").waitFor();
  assert.equal(await a.locator(".shutdown-sequence").count(), 0);
  assert.equal(await c.locator(".shutdown-sequence").count(), 0);
  const sequence = (await b.locator(".shutdown-sequence").innerText())
    .split(" → ")
    .map(Number);
  await b
    .getByLabel("Message your team")
    .fill(`Shutdown sequence: ${sequence.join(" → ")}`);
  await b.getByRole("button", { name: "SEND ↗", exact: true }).click();
  await a.getByText(`Shutdown sequence: ${sequence.join(" → ")}`).waitFor();
  await a.screenshot({ path: output + "/reactor-field.png", fullPage: true });
  await b.screenshot({
    path: output + "/reactor-intelligence.png",
    fullPage: true,
  });
  for (const value of sequence) {
    await a
      .getByRole("button", { name: `Reactor switch ${value}`, exact: true })
      .click();
    await a.waitForTimeout(180);
  }
  await Promise.all(
    pages.map((p) =>
      p.getByRole("heading", { name: "REACTOR STABILIZED" }).waitFor(),
    ),
  );
  await a.screenshot({ path: output + "/city-desktop.png", fullPage: true });
  await b
    .getByLabel("Message your team")
    .fill("Alpha repaired Data Center. Check logs if it fails.");
  await b.getByRole("button", { name: "SEND ↗" }).click();
  await c
    .getByText("Alpha repaired Data Center. Check logs if it fails.")
    .waitFor();
  await c.setViewportSize({ width: 390, height: 844 });
  await c.screenshot({ path: output + "/city-mobile.png", fullPage: true });
  assert(
    await c.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  const assignments = await Promise.all(
    pages.map((p) => p.locator(".identity h2").innerText()),
  );
  const mole = ["Alpha", "Beta", "Gamma"][assignments.indexOf("THE MOLE")];
  assert(mole);
  await a.getByRole("button", { name: /EMERGENCY MEETING/ }).click();
  await Promise.all(
    pages.map((p) => p.locator(".modal .vote-clock").waitFor()),
  );
  await a.screenshot({ path: output + "/meeting.png", fullPage: true });
  for (const p of pages) {
    await p.locator(".modal button").filter({ hasText: mole }).click();
  }
  await Promise.all(
    pages.map((p) => p.getByRole("heading", { name: "THREAT ZERO" }).waitFor()),
  );
  await a.screenshot({ path: output + "/victory.png", fullPage: true });
  await a.getByRole("button", { name: /PLAY AGAIN/ }).click();
  await a.locator(".room-code").waitFor();
  assert.equal(await a.locator(".roster strong").count(), 3);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: three Chrome contexts; travel and repair; private reactor intelligence communicated through chat; field switches stabilize reactor for all clients; mobile overflow; discussion, voting, reveal and replay. No page errors.",
  );
} catch (e) {
  for (let i = 0; i < pages.length; i++) {
    console.log(
      "Browser diagnostics",
      i,
      await pages[i].locator(".status").innerText(),
      await pages[i].locator(".toast").allTextContents(),
    );
    await pages[i].screenshot({
      path: `${output}/failure-${i}.png`,
      fullPage: true,
    });
  }
  throw e;
} finally {
  await browser.close();
}
