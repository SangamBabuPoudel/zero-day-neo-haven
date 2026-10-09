import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { io, type Socket } from "socket.io-client";
test(
  "live server: 3 clients, isolation, role privacy, actions, voting, replay, reconnect",
  { timeout: 30000 },
  async () => {
    const proc = spawn(
      process.execPath,
      ["--import", "tsx", "server/index.ts"],
      { env: { ...process.env, PORT: "3199" }, stdio: "pipe" },
    );
    const clients: Socket[] = [];
    try {
      await new Promise<void>((resolve, reject) => {
        proc.stdout.on("data", () => resolve());
        proc.on("error", reject);
        proc.on("exit", (c) => reject(Error("server exited " + c)));
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
        const s = io("http://localhost:3199", {
          forceNew: true,
          reconnection: false,
        });
        clients.push(s);
        await new Promise<void>((res) => s.once("connect", () => res()));
        const box: { state: any } = { state: null };
        s.on("state", (v) => (box.state = v));
        return { s, box };
      }
      async function send(c: any, kind: string, extra: any = {}) {
        await new Promise((res) => setTimeout(res, 120));
        return await new Promise<any>((res, rej) =>
          c.s
            .timeout(3000)
            .emit("command", { kind, ...extra }, (e: any, v: any) =>
              e ? rej(e) : res(v),
            ),
        );
      }
      async function settle() {
        await new Promise((res) => setTimeout(res, 60));
      }
      const a = await client(),
        b = await client(),
        c = await client(),
        d = await client();
      const session = await send(a, "create", { name: "Alpha" });
      await settle();
      const code = a.box.state.code;
      assert((await send(a, "start")).error);
      await send(b, "join", { name: "Beta", code });
      await send(c, "join", { name: "Gamma", code });
      await send(d, "create", { name: "Other" });
      assert((await send(b, "start")).error);
      await send(a, "start");
      await settle();
      const all = [a, b, c];
      assert.equal(all.filter((v) => v.box.state.me.mole).length, 1);
      assert(
        all.every((v) => v.box.state.players.every((p: any) => !("mole" in p))),
      );
      assert.equal(d.box.state.phase, "lobby");
      assert.deepEqual(a.box.state.nodes, b.box.state.nodes);
      await new Promise((res) => setTimeout(res, 8000));
      assert(a.box.state.core < 100);
      assert.deepEqual(a.box.state.nodes, b.box.state.nodes);
      assert.equal(a.box.state.core, c.box.state.core);
      assert((await send(a, "repair", { node: 2 })).ok);
      await settle();
      assert(all.every((v) => !v.box.state.nodes[2].infected));
      assert((await send(a, "repair", { node: 8 })).error);
      assert((await send(a, "meeting")).ok);
      await settle();
      const mole = all.find((v) => v.box.state.me.mole)!;
      for (const v of all)
        assert((await send(v, "vote", { target: mole.box.state.me.id })).ok);
      await settle();
      assert(all.every((v) => v.box.state.winner === "DEFENDERS"));
      assert(
        all.every(
          (v) => v.box.state.players.filter((p: any) => p.mole).length === 1,
        ),
      );
      assert((await send(a, "replay")).ok);
      assert((await send(a, "start")).ok);
      await settle();
      assert.equal(a.box.state.phase, "playing");
      a.s.disconnect();
      await settle();
      const fresh = await client();
      assert((await send(fresh, "resume", { token: session.token })).ok);
      await settle();
      assert.equal(fresh.box.state.me.name, "Alpha");
      assert.equal(fresh.box.state.phase, "playing");
    } finally {
      clients.forEach((s) => s.disconnect());
      proc.kill();
    }
  },
);
