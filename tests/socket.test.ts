import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { io, type Socket } from "socket.io-client";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
test(
  "live gameplay: private roles, road travel, terminal repair, chat, spectators, meeting, replay and credential reconnect",
  { timeout: 60000 },
  async () => {
    const proc = spawn(
        process.execPath,
        ["--import", "tsx", "server/index.ts"],
        { env: { ...process.env, PORT: "3199" }, stdio: "pipe" },
      ),
      clients: Socket[] = [];
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d));
    try {
      await new Promise<void>((resolve, reject) => {
        proc.stdout.once("data", () => resolve());
        proc.on("error", reject);
        proc.on("exit", (c) => reject(Error(`server exited ${c}: ${stderr}`)));
        setTimeout(() => reject(Error("startup timeout")), 10000).unref();
      });
      assert.deepEqual(
        await (await fetch("http://127.0.0.1:3199/health")).json(),
        { ok: true },
      );
      const page = await fetch("http://127.0.0.1:3199/");
      assert.equal(page.status, 200);
      assert.match(await page.text(), /ZERO DAY/);
      async function client() {
        const s = io("http://127.0.0.1:3199", {
          forceNew: true,
          reconnection: false,
        });
        clients.push(s);
        const box: { state: any } = { state: null };
        s.on("state", (v) => (box.state = v));
        await new Promise<void>((resolve) =>
          s.once("connect", () => resolve()),
        );
        return { s, box };
      }
      async function send(c: any, kind: string, extra: any = {}) {
        await delay(130);
        return await new Promise<any>((resolve, reject) =>
          c.s
            .timeout(3000)
            .emit("command", { kind, ...extra }, (e: any, v: any) =>
              e ? reject(e) : resolve(v),
            ),
        );
      }
      async function waitFor(check: () => boolean, ms = 8000) {
        const end = Date.now() + ms;
        while (!check()) {
          if (Date.now() > end) throw Error("state wait timed out");
          await delay(40);
        }
      }
      const a = await client(),
        b = await client(),
        c = await client(),
        d = await client();
      const session = await send(a, "create", { name: "Alpha" });
      await waitFor(() => !!a.box.state);
      const code = a.box.state.code;
      assert((await send(a, "start")).error);
      assert((await send(b, "join", { name: "Beta", code })).ok);
      assert((await send(c, "join", { name: "Gamma", code })).ok);
      assert((await send(d, "create", { name: "Other" })).ok);
      assert((await send(b, "start")).error);
      assert((await send(a, "start")).ok);
      await waitFor(() => c.box.state?.phase === "playing");
      const all = [a, b, c];
      assert.equal(all.filter((v) => v.box.state.me.mole).length, 1);
      assert(
        all.every((v) =>
          v.box.state.players.every(
            (p: any) => !("mole" in p) && !("role" in p),
          ),
        ),
      );
      assert.equal(d.box.state.phase, "lobby");
      assert((await send(a, "repair", { node: 0 })).error);
      assert((await send(a, "travel", { node: 0 })).ok);
      await waitFor(
        () =>
          !!b.box.state.players.find((p: any) => p.id === a.box.state.me.id)
            .travel,
      );
      assert((await send(a, "begin", { ability: "repair", node: 0 })).error);
      await waitFor(
        () => a.box.state.me.location === 0 && !a.box.state.me.travel,
      );
      assert((await send(a, "begin", { ability: "repair", node: 0 })).ok);
      await waitFor(() => !!a.box.state.me.task);
      const t = a.box.state.me.task;
      for (const cell of t.sequence)
        assert((await send(a, "step", { task: t.id, cell })).ok);
      await delay(1300);
      assert((await send(a, "repair", { node: 0 })).ok);
      await waitFor(() => !c.box.state.nodes[0].infected);
      assert.equal(a.box.state.core, b.box.state.core);
      assert(
        (await send(b, "chat", { text: "Alpha just arrived at Data Center." }))
          .ok,
      );
      await waitFor(() => a.box.state.chat.length > 0);
      assert.equal(d.box.state.chat.length, 0);
      const spectator = await client();
      assert((await send(spectator, "join", { name: "Observer", code })).ok);
      await waitFor(() => !!spectator.box.state);
      assert(spectator.box.state.me.spectator);
      assert((await send(spectator, "meeting")).error);
      assert((await send(spectator, "travel", { node: 0 })).error);
      assert((await send(a, "meeting")).ok);
      await waitFor(() => b.box.state.phase === "meeting");
      await delay(1000);
      assert(
        (await send(b, "chat", { text: "Compare access logs before voting." }))
          .ok,
      );
      const mole = all.find((v) => v.box.state.me.mole)!;
      for (const v of all)
        assert((await send(v, "vote", { target: mole.box.state.me.id })).ok);
      await waitFor(() => all.every((v) => v.box.state.winner === "DEFENDERS"));
      assert(
        all.every(
          (v) => v.box.state.players.filter((p: any) => p.mole).length === 1,
        ),
      );
      assert((await send(a, "replay")).ok);
      assert((await send(a, "start")).ok);
      await waitFor(() => a.box.state.phase === "playing");
      a.s.disconnect();
      await delay(200);
      const fresh = await client();
      assert((await send(fresh, "resume", { token: "not-a-session" })).error);
      assert((await send(fresh, "resume", { token: session.token })).ok);
      await waitFor(() => !!fresh.box.state);
      assert.equal(fresh.box.state.me.name, "Alpha");
      assert.equal(fresh.box.state.phase, "playing");
      const thief = await client();
      assert((await send(thief, "resume", { token: session.token })).error);
    } finally {
      clients.forEach((s) => s.disconnect());
      proc.kill();
    }
  },
);
