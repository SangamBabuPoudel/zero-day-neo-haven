import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { io, type Socket } from "socket.io-client";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
test(
  "live reactor: private delivery, synchronized movement, reconnect, correct and wrong outcomes, real forensic records",
  { timeout: 85000 },
  async () => {
    const proc = spawn(
      process.execPath,
      ["--import", "tsx", "server/index.ts"],
      { env: { ...process.env, PORT: "3201" }, stdio: "pipe" },
    );
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d));
    const clients: Socket[] = [];
    try {
      await new Promise<void>((resolve, reject) => {
        proc.stdout.once("data", () => resolve());
        proc.on("error", reject);
        proc.on("exit", () => reject(Error(stderr)));
        setTimeout(() => reject(Error("startup timeout")), 10000).unref();
      });
      async function client() {
        const s = io("http://127.0.0.1:3201", {
          forceNew: true,
          reconnection: false,
        });
        clients.push(s);
        const box: { state: any } = { state: null };
        s.on("state", (v) => (box.state = v));
        await new Promise<void>((r) => s.once("connect", () => r()));
        return { s, box };
      }
      async function send(c: any, kind: string, extra: any = {}) {
        await sleep(130);
        const result = await new Promise<any>((resolve, reject) =>
          c.s
            .timeout(3000)
            .emit("command", { kind, ...extra }, (e: any, v: any) =>
              e ? reject(e) : resolve(v),
            ),
        );
        return result;
      }
      async function wait(check: () => boolean, ms = 22000) {
        const deadline = Date.now() + ms;
        while (!check()) {
          if (Date.now() > deadline) throw Error("state timeout");
          await sleep(40);
        }
      }
      const a = await client(),
        initialB = await client(),
        c = await client(),
        other = await client();
      let b = initialB;
      await send(a, "create", { name: "FIELD" });
      await wait(() => !!a.box.state);
      const code = a.box.state.code;
      const session = await send(b, "join", { name: "REMOTE", code });
      await send(c, "join", { name: "AUDITOR", code });
      await send(other, "create", { name: "ISOLATED" });
      await send(a, "start");
      async function prepare() {
        assert((await send(a, "travel", { node: 1 })).ok);
        assert((await send(b, "travel", { node: 4 })).ok);
        await wait(
          () =>
            a.box.state.me.location === 1 &&
            !a.box.state.me.travel &&
            b.box.state.me.location === 4 &&
            !b.box.state.me.travel,
        );
        await wait(() => a.box.state.reactor?.status === "active");
        const id = a.box.state.reactor.id;
        assert((await send(a, "reactor-access", { crisis: id })).ok);
        assert((await send(b, "reactor-access", { crisis: id })).ok);
        await wait(() => !!b.box.state.reactor.instructions);
        return id;
      }
      let id = await prepare();
      assert(!("instructions" in a.box.state.reactor));
      assert(!("instructions" in c.box.state.reactor));
      assert.equal(other.box.state.reactor, null);
      assert.equal(a.box.state.reactor.ends, c.box.state.reactor.ends);
      assert(
        a.box.state.players.find((p: any) => p.id === b.box.state.me.id)
          .working,
      );
      const originalId = b.box.state.me.id;
      b.s.disconnect();
      await sleep(180);
      b = await client();
      assert((await send(b, "resume", { token: session.token })).ok);
      await wait(() => !!b.box.state?.reactor?.instructions);
      assert.equal(b.box.state.me.id, originalId);
      assert.equal(
        b.box.state.players.filter((p: any) => p.id === originalId).length,
        1,
      );
      const seq = [...b.box.state.reactor.instructions];
      assert(
        (await send(b, "chat", { text: `Shutdown: ${seq.join(" → ")}` })).ok,
      );
      for (let i = 0; i < 3; i++)
        assert(
          (
            await send(a, "reactor-input", {
              crisis: id,
              index: i,
              value: seq[i],
            })
          ).ok,
        );
      await wait(() =>
        [a, b, c].every((v) => v.box.state.reactor.status === "stabilized"),
      );
      assert(
        (
          await send(a, "reactor-input", {
            crisis: id,
            index: 2,
            value: seq[2],
          })
        ).error,
      );
      await send(a, "meeting");
      await wait(() => c.box.state.phase === "meeting");
      assert((await send(a, "vote", { target: "skip" })).error);
      await sleep(8100);
      const mole = [a, b, c].find((v) => v.box.state.me.mole)!;
      for (const p of [a, b, c])
        assert((await send(p, "vote", { target: mole.box.state.me.id })).ok);
      await wait(() => a.box.state.phase === "ended");
      await send(a, "replay");
      await send(a, "start");
      id = await prepare();
      const wrong = (b.box.state.reactor.instructions[0] % 4) + 1;
      for (const [index, value] of [wrong, 1, 2].entries())
        assert(
          (await send(a, "reactor-input", { crisis: id, index, value })).ok,
        );
      await wait(() =>
        [a, b, c].every((v) => v.box.state.reactor.status === "overload"),
      );
      assert(a.box.state.nodes[1].infected);
      await send(c, "travel", { node: 1 });
      await wait(() => c.box.state.me.location === 1 && !c.box.state.me.travel);
      await send(c, "begin", { ability: "scan", node: 1 });
      await wait(() => !!c.box.state.me.task);
      const task = c.box.state.me.task;
      for (const cell of task.sequence)
        await send(c, "step", { task: task.id, cell });
      await sleep(1250);
      assert((await send(c, "scan", { node: 1 })).ok);
      await wait(() => !!c.box.state.me.evidence);
      assert(
        c.box.state.me.evidence.entries.some(
          (e: any) =>
            e.player === "FIELD" && e.kind.includes("submitted reactor switch"),
        ),
      );
      assert.equal(a.box.state.me.evidence, undefined);
      assert.equal(other.box.state.phase, "lobby");
    } finally {
      clients.forEach((s) => s.disconnect());
      proc.kill();
    }
  },
);
