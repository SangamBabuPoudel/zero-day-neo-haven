import { test } from "node:test";
import assert from "node:assert/strict";
import {
  create,
  finish,
  resetLobby,
  player,
  start,
  view,
  travel,
  begin,
  taskStep,
  action,
  meeting,
  vote,
  tick,
} from "../server/game.js";
import {
  startReactor,
  reactorAccess,
  reactorInput,
  reactorOverride,
} from "../server/reactor.js";
function setup() {
  const r = create("REACTR", "a", "Alpha");
  r.players.push(player("b", "Beta"), player("c", "Gamma"));
  start(r, 1000);
  r.spreadAt = Infinity;
  startReactor(r, 2000);
  r.players[0].location = 1;
  r.players[1].location = 4;
  return r;
}
test("reactor solution is only sent to authorized remote player at a healthy intelligence terminal", () => {
  const r = setup(),
    [a, b, c] = r.players,
    id = r.reactor!.id;
  assert(!("instructions" in view(r, a.id, 2000).reactor!));
  assert(!("instructions" in view(r, b.id, 2000).reactor!));
  reactorAccess(r, a, id, 2100);
  reactorAccess(r, b, id, 2100);
  assert.deepEqual(
    view(r, b.id, 2200).reactor!.instructions,
    r.reactor!.sequence,
  );
  assert(!("instructions" in view(r, a.id, 2200).reactor!));
  assert(!("instructions" in view(r, c.id, 2200).reactor!));
  assert(!("sequence" in view(r, a.id, 2200).reactor!));
  assert(
    view(r, c.id, 2200).players.every((p) => !("task" in p) && !("role" in p)),
  );
  r.nodes[4].infected = true;
  assert(!("instructions" in view(r, b.id, 2300).reactor!));
  r.nodes[4].infected = false;
  travel(r, b, 1, 2400);
  assert(!("instructions" in view(r, b.id, 2400).reactor!));
});
test("public working status exposes presence without task or allegiance; replay clears private task state", () => {
  const r = setup(),
    p = r.players[2];
  begin(r, p, "repair", 5, 2100);
  const v = view(r, "a", 2200).players.find((x) => x.id === p.id)!;
  assert(v.working);
  assert(!("task" in v));
  assert(!("mole" in v));
  travel(r, p, 0, 2400);
  assert(!view(r, "a", 2400).players.find((x) => x.id === p.id)!.working);
  r.phase = "lobby";
  start(r, 9000);
  assert(!p.travel && !p.task && !p.scan && !p.evidence);
  assert(!r.reactor);
});
test("field cannot become remote reader; readers cannot operate switches after travelling to Power", () => {
  const r = setup(),
    [a, b] = r.players,
    id = r.reactor!.id;
  reactorAccess(r, a, id, 2100);
  a.location = 4;
  assert.throws(() => reactorAccess(r, a, id, 2200));
  a.location = 1;
  reactorAccess(r, b, id, 2200);
  b.location = 1;
  assert.throws(() => reactorAccess(r, b, id, 2300));
  assert.throws(() => reactorInput(r, b, id, 0, 1, 2400));
});
test("correct three switches stabilize reactor and synchronized outcome; stale and duplicate inputs rejected", () => {
  const r = setup(),
    [a, b] = r.players,
    id = r.reactor!.id;
  r.core = 80;
  reactorAccess(r, a, id, 2100);
  reactorAccess(r, b, id, 2100);
  const seq = [...r.reactor!.sequence];
  reactorInput(r, a, id, 0, seq[0], 2200);
  assert.throws(() => reactorInput(r, a, id, 0, seq[0], 2300));
  assert.throws(() => reactorInput(r, b, id, 1, seq[1], 2400));
  assert.throws(() => reactorInput(r, a, id, 1, 9, 2400));
  reactorInput(r, a, id, 1, seq[1], 2500);
  reactorInput(r, a, id, 2, seq[2], 2600);
  assert.equal(r.reactor!.status, "stabilized");
  assert.equal(r.core, 84);
  assert(!r.nodes[1].infected);
  assert(a.feedback && b.feedback);
  assert.throws(() => reactorInput(r, a, id, 3, 1, 2700));
  assert(
    r.players.every(
      (p) => view(r, p.id, 2800).reactor!.status === "stabilized",
    ),
  );
});
test("wrong input sequence causes overload, extra threat and actual forensic inputs without guessing communication", () => {
  const r = setup(),
    a = r.players[0],
    id = r.reactor!.id;
  reactorAccess(r, a, id, 2100);
  const wrong = (r.reactor!.sequence[0] % 4) + 1;
  [wrong, 1, 2].forEach((v, i) => reactorInput(r, a, id, i, v, 2200 + i * 200));
  assert.equal(r.reactor!.status, "overload");
  assert.equal(r.core, 88);
  assert(r.nodes[1].infected);
  assert.equal(r.threats.length, 1);
  assert(
    r.history.some(
      (e) =>
        e.player === "Alpha" &&
        e.kind === `submitted reactor switch ${wrong} (input 1/3)`,
    ),
  );
  assert(!r.history.some((e) => /lied|mole|claimed/i.test(e.kind)));
  const sniffer = r.players[2];
  sniffer.location = 1;
  begin(r, sniffer, "scan", 1, 3000);
  for (const cell of sniffer.task!.sequence)
    taskStep(r, sniffer, sniffer.task!.id, cell, 3500);
  action(r, sniffer, "scan", 1, 4500);
  assert(
    sniffer.evidence!.entries.some((e) =>
      e.kind.includes("submitted reactor switch"),
    ),
  );
  assert.equal(view(r, "a", 4500).me?.evidence, undefined);
});
test("costly solo override works when Mole refuses to release field panel; holding position is required", () => {
  const r = setup(),
    [m, defender] = r.players,
    id = r.reactor!.id;
  m.mole = true;
  defender.mole = false;
  reactorAccess(r, m, id, 2100);
  defender.location = 1;
  reactorOverride(r, defender, id, 3000);
  assert.throws(() => reactorOverride(r, m, id, 3200));
  tick(r, 12999);
  assert.equal(r.reactor!.status, "active");
  tick(r, 13000);
  assert.equal(r.reactor!.status, "override");
  assert.equal(r.core, 92);
  assert(!r.nodes[1].infected);
  const other = setup(),
    a = other.players[0];
  reactorOverride(other, a, other.reactor!.id, 3000);
  travel(other, a, 0, 4000);
  tick(other, 13000);
  assert.equal(other.reactor!.status, "active");
  assert(!other.reactor!.overrideEnds);
});
test("reactor timeout, expired actions and remote-location validation are enforced", () => {
  const r = setup(),
    [a, b, c] = r.players,
    id = r.reactor!.id;
  assert.throws(() => reactorAccess(r, c, id, 2100));
  assert.throws(() => reactorOverride(r, b, id, 2100));
  assert.throws(() => reactorOverride(r, a, id, 17000));
  assert.throws(() => reactorAccess(r, a, id, 27000));
  tick(r, 27000);
  assert.equal(r.reactor!.status, "overload");
  assert.equal(r.core, 88);
  assert.throws(() => reactorAccess(r, a, id, 28000));
});
test("meetings pause crisis and solo override; eight-second discussion blocks early votes", () => {
  const r = setup(),
    a = r.players[0],
    id = r.reactor!.id;
  reactorOverride(r, a, id, 2500);
  meeting(r, a, 3000);
  assert.throws(() => vote(r, a, "skip", 4000));
  assert.throws(() => reactorInput(r, a, id, 0, 1, 4000));
  assert.equal(view(r, "a", 8000).reactor!.ends, 32000);
  assert.equal(view(r, "a", 8000).reactor!.overrideEnds, 17500);
  tick(r, 38000);
  assert.equal(r.reactor!.ends, 62000);
  assert.equal(r.reactor!.overrideEnds, 47500);
  tick(r, 47500);
  assert.equal(r.reactor!.status, "override");
});
test("disconnect releases remote access; reconnect preserves one identity and private instructions only while authorized", () => {
  const r = setup(),
    [a, b, c] = r.players,
    id = r.reactor!.id;
  reactorAccess(r, b, id, 2100);
  b.connected = false;
  c.location = 2;
  reactorAccess(r, c, id, 2200);
  b.connected = true;
  assert(!("instructions" in view(r, b.id, 2300).reactor!));
  assert.deepEqual(
    view(r, c.id, 2300).reactor!.instructions,
    r.reactor!.sequence,
  );
  assert.equal(r.players.filter((p) => p.id === b.id).length, 1);
});
test("crises remain room-local; spectator cannot obtain a solution or submit inputs", () => {
  const a = setup(),
    b = setup(),
    s = player("s", "Observer");
  s.spectator = true;
  s.location = 4;
  a.players.push(s);
  assert.throws(() => reactorAccess(a, s, a.reactor!.id, 2100));
  assert(!("instructions" in view(a, s.id, 2200).reactor!));
  assert.notEqual(a.reactor!.id, b.reactor!.id);
  a.reactor!.inputs.push(1);
  assert.equal(b.reactor!.inputs.length, 0);
});

test("three-player survival is achievable with each cover-role combination when the Mole refuses all cooperation", () => {
  for (let moleIndex = 0; moleIndex < 3; moleIndex++) {
    const r = setup();
    r.reactor = null;
    r.reactorAt = 16000;
    r.spreadAt = 13000;
    r.players.forEach((p, i) => {
      p.mole = i === moleIndex;
      p.location = 5;
    });
    const defenders = r.players.filter((p) => !p.mole);
    for (let now = 1200; now <= 370000 && r.phase === "playing"; now += 200) {
      tick(r, now);
      if (r.phase !== "playing") break;
      for (const p of defenders) {
        if (p.travel) continue;
        const crisis = r.reactor as
          import("../server/reactor.js").Reactor | null;
        if (crisis?.status === "active" && p === defenders[0]) {
          if (crisis.overrideBy === p.id) continue;
          if (p.location !== 1) {
            travel(r, p, 1, now);
            continue;
          }
          if (crisis.ends - now > 10000) {
            reactorOverride(r, p, crisis.id, now);
            continue;
          }
        }
        if (p.task) {
          if (now - p.task.started >= 1400) {
            const task = p.task;
            for (const cell of task.sequence)
              if (!task.done.includes(cell)) taskStep(r, p, task.id, cell, now);
            action(r, p, "repair", task.node, now);
          }
          continue;
        }
        const reserved = defenders
          .filter((other) => other !== p)
          .map((other) => other.travel?.path.at(-1) ?? other.task?.node);
        const targets = [0, 1, 5, 3, 2, 4].filter(
          (node) => r.nodes[node].infected && !reserved.includes(node),
        );
        const target = targets.includes(p.location) ? p.location : targets[0];
        if (target === undefined) continue;
        if (p.location !== target) travel(r, p, target, now);
        else if (p.next <= now) begin(r, p, "repair", target, now);
      }
    }
    assert.equal(
      r.winner,
      "DEFENDERS",
      `Defenders without ${r.players[moleIndex].role} should be able to stabilize the city; core ${r.core}`,
    );
    assert(r.core > 0);
  }
});

test("replay during an unresolved reactor crisis clears private instructions and stale gameplay state", () => {
  const r = setup(),
    remote = r.players[1];
  reactorAccess(r, remote, r.reactor!.id, 2100);
  finish(r, "DEFENDERS");
  resetLobby(r);
  for (const p of r.players) {
    const snapshot = view(r, p.id, 2200);
    assert.equal(snapshot.phase, "lobby");
    assert.equal(snapshot.reactor, null);
    assert.equal(snapshot.me?.task, undefined);
    assert.equal(snapshot.me?.mole, false);
  }
  start(r, 3000);
  assert.equal(r.reactor, null);
  assert.equal(r.players.filter((p) => p.mole).length, 1);
});
