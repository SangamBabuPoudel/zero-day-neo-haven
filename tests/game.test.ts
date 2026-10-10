import { test } from "node:test";
import assert from "node:assert/strict";
import {
  create,
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
  chat,
  type Room,
  type Player,
} from "../server/game.js";
import {
  edges,
  route,
  routeLength,
  position,
  buildings,
} from "../shared/city.js";
function setup() {
  const r = create("ABC123", "a", "Alpha");
  r.players.push(player("b", "Beta"), player("c", "Gamma"));
  start(r, 1000);
  return r;
}
function operate(r: Room, p: Player, kind: string, node: number, now: number) {
  begin(r, p, kind, node, now);
  for (const cell of p.task!.sequence)
    taskStep(r, p, p.task!.id, cell, now + 300);
  action(r, p, kind, node, now + 1300);
}
test("exactly one Mole; other roles, tasks, allegiance, corruption and histories never broadcast", () => {
  const r = setup();
  r.nodes[0].corruptAt = 9999;
  r.nodes[0].corruptBy = "Alpha";
  for (const p of r.players) {
    const v = view(r, p.id);
    assert.equal(v.me?.mole, p.mole);
    for (const other of v.players) {
      assert(!("mole" in other));
      assert(!("role" in other));
      assert(!("task" in other));
    }
    assert(!("history" in v));
    assert(v.nodes.every((n) => !("corruptAt" in n) && !("corruptBy" in n)));
  }
});
test("roads form valid shortest routes and interpolation follows roads", () => {
  for (const a of buildings)
    for (const b of buildings) {
      const path = route(a.id, b.id);
      assert.equal(path[0], a.id);
      assert.equal(path.at(-1), b.id);
      path
        .slice(1)
        .forEach((n, i) =>
          assert(edges.some((e) => e.includes(n) && e.includes(path[i]))),
        );
      assert.equal(position(path, 0).x, a.x);
      assert.equal(position(path, 1).y, b.y);
      assert(routeLength(path) >= 0);
    }
});
test("movement validates locations, transit, arrival and remote actions", () => {
  const r = setup(),
    p = r.players[0];
  assert.throws(() => travel(r, p, NaN, 1000));
  assert.throws(() => travel(r, p, 99, 1000));
  travel(r, p, 0, 1000);
  const end = p.travel!.arrives;
  assert(end - 1000 >= 2000 && end - 1000 <= 5000);
  assert.throws(() => travel(r, p, 1, 1001));
  assert.throws(() => begin(r, p, "repair", 0, 1002));
  tick(r, end - 1);
  assert.equal(p.location, 5);
  tick(r, end);
  assert.equal(p.location, 0);
  assert(!p.travel);
  assert(r.history.some((e) => e.kind === "arrived"));
  operate(r, p, "repair", 0, end);
  assert(!r.nodes[0].infected);
  assert.throws(() => begin(r, p, "repair", 0, end + 1400));
});
test("terminal checks task identity, correct cells, minimum duration and position", () => {
  const r = setup(),
    p = r.players[0];
  assert.throws(() => action(r, p, "repair", 5, 1000));
  begin(r, p, "repair", 5, 1000);
  const task = p.task!;
  assert.throws(() => taskStep(r, p, "forged", task.sequence[0], 1100));
  assert.throws(() => taskStep(r, p, task.id, task.sequence[1], 1100));
  for (const cell of task.sequence) taskStep(r, p, task.id, cell, 1200);
  assert.throws(() => action(r, p, "repair", 5, 1200));
  travel(r, p, 0, 1300);
  assert(!p.task);
  assert.throws(() => action(r, p, "repair", 5, 4000));
});
test("isolation task accepts corrupted blocks only and disallows duplicates", () => {
  const r = setup(),
    p = r.players[0];
  p.location = 0;
  begin(r, p, "repair", 0, 1000);
  const t = p.task!;
  assert.equal(t.mode, "isolate");
  const clean = [0, 1, 2, 3, 4, 5].find((v) => !t.sequence.includes(v))!;
  assert.throws(() => taskStep(r, p, t.id, clean, 1200));
  taskStep(r, p, t.id, t.sequence[2], 1300);
  assert.throws(() => taskStep(r, p, t.id, t.sequence[2], 1400));
});
test("delayed corruption is private, cooldown enforced, failure leaves real evidence", () => {
  const r = setup(),
    m = r.players.find((p) => p.mole)!,
    sniffer = r.players[2];
  m.location = 0;
  operate(r, m, "sabotage", 0, 1000);
  assert(!r.nodes[0].infected);
  assert(r.nodes[0].corruptAt > 0);
  tick(r, 12299);
  assert(!r.nodes[0].infected);
  tick(r, 12300);
  assert(r.nodes[0].infected);
  assert(r.history.some((e) => e.kind === "delayed service failure"));
  assert.throws(() => begin(r, m, "sabotage", 0, 13000));
  sniffer.location = 0;
  sniffer.next = 0;
  operate(r, sniffer, "scan", 0, 14000);
  assert.match(sniffer.scan!, new RegExp(m.name));
  assert.match(sniffer.scan!, /service operation/);
  assert.equal(
    view(r, r.players.find((p) => p !== sniffer)!.id).me?.scan,
    undefined,
  );
});
test("all defenders repair; specialist restrictions; shield blocks corruption and packets", () => {
  const r = setup(),
    f = r.players[1],
    m = r.players.find((p) => p.mole)!;
  assert.throws(() => begin(r, r.players[0], "shield", 5, 1000));
  const innocent = r.players.find((p) => !p.mole)!;
  assert.throws(() => begin(r, innocent, "sabotage", 5, 1000));
  operate(r, f, "shield", 5, 1000);
  assert.equal(r.nodes[5].shield, 26300);
  m.next = 0;
  begin(r, m, "sabotage", 5, 5000);
  for (const c of m.task!.sequence) taskStep(r, m, m.task!.id, c, 5500);
  assert.throws(() => action(r, m, "sabotage", 5, 6500));
  r.threats = [{ from: 0, to: 5, started: 1000, arrives: 7000 }];
  tick(r, 7000);
  assert(!r.nodes[5].infected);
  f.next = 0;
  f.location = 0;
  operate(r, f, "repair", 0, 8000);
  assert(!r.nodes[0].infected);
});
test("repair clears pending corruption; security infection weakens shielding", () => {
  const r = setup(),
    p = r.players[0],
    f = r.players[1];
  r.nodes[5].corruptAt = 9000;
  operate(r, p, "repair", 5, 1000);
  assert.equal(r.nodes[5].corruptAt, 0);
  r.nodes[3].infected = true;
  operate(r, f, "shield", 5, 1000);
  assert.equal(r.nodes[5].shield, 14300);
});
test("power speeds attacks; data amplifies damage; comms and surveillance limit intel", () => {
  const r = setup();
  tick(r, 13000);
  assert.equal(r.spreadAt, 23000);
  assert.equal(r.core, 96);
  assert.equal(r.threats.length, 1);
  r.nodes[2].infected = true;
  assert.equal(view(r, "a", 13000).threats.length, 0);
  r.nodes[2].infected = false;
  r.nodes[4].infected = true;
  assert.equal(view(r, "a", 13000).threats.length, 0);
  assert.equal(view(r, "a", 18000).threats.length, 1);
  r.nodes[0].infected = false;
  r.nodes[1].infected = false;
  tick(r, 23000);
  assert.equal(r.spreadAt, 41000);
});
test("correct strict majority wins; end reveals roles; duplicate votes rejected", () => {
  const r = setup(),
    m = r.players.find((p) => p.mole)!;
  meeting(r, r.players[0], 1000);
  r.players.forEach((p) => vote(r, p, m.id));
  assert.throws(() => vote(r, r.players[0], m.id));
  tick(r, 2000);
  assert.equal(r.winner, "DEFENDERS");
  assert(view(r, "a").players.every((p) => "mole" in p && "role" in p));
});
test("meeting freezes movement, threats, corruption, shields and mission; wrong vote costs 20", () => {
  const r = setup(),
    p = r.players[0],
    innocent = r.players.find((p) => !p.mole)!;
  travel(r, p, 0, 1000);
  const arrival = p.travel!.arrives;
  r.nodes[0].corruptAt = 8000;
  r.nodes[3].shield = 18000;
  r.threats = [{ from: 0, to: 5, started: 1000, arrives: 7000 }];
  meeting(r, p, 1500);
  r.players.forEach((p) => vote(r, p, innocent.id));
  tick(r, 5500);
  assert.equal(r.phase, "playing");
  assert.equal(r.core, 80);
  assert.equal(r.endAt, 365000);
  assert.equal(p.travel!.arrives, arrival + 4000);
  assert.equal(r.nodes[0].corruptAt, 12000);
  assert.equal(r.nodes[3].shield, 22000);
  assert.equal(r.threats[0].arrives, 11000);
});
test("disconnects do not lower voting majority; timeout and skips resume safely", () => {
  const r = setup();
  meeting(r, r.players[0], 1000);
  vote(r, r.players[0], r.players.find((p) => p.mole)!.id);
  r.players[1].connected = false;
  r.players[2].connected = false;
  tick(r, 36000);
  assert.equal(r.phase, "playing");
  assert(!r.winner);
  assert.throws(() => meeting(r, r.players[0], 37000));
});
test("clean win requires uplink seal and 12 seconds; deadline and zero integrity lose", () => {
  const r = setup();
  r.nodes.forEach((n) => (n.infected = false));
  r.spreadAt = Infinity;
  tick(r, 1001);
  tick(r, 13001);
  assert.equal(r.phase, "playing");
  tick(r, r.secureAt);
  tick(r, r.secureAt + 12000);
  assert.equal(r.winner, "DEFENDERS");
  const other = setup();
  other.core = 1;
  tick(other, 13000);
  assert.equal(other.winner, "MOLE");
  const timeout = setup();
  tick(timeout, timeout.endAt);
  assert.equal(timeout.winner, "MOLE");
});
test("spectators cannot play or chat; separate rooms isolate state and chat", () => {
  const a = setup(),
    b = setup(),
    s = player("s", "Observer");
  s.spectator = true;
  a.players.push(s);
  assert.throws(() => travel(a, s, 0));
  assert.throws(() => begin(a, s, "repair", 5));
  assert.throws(() => meeting(a, s));
  assert.throws(() => chat(a, s, "clue"));
  chat(a, a.players[0], "actual clue", 1000);
  assert.equal(b.chat.length, 0);
  assert.throws(() => chat(a, a.players[0], "spam", 1001));
  a.nodes[3].infected = true;
  assert(!b.nodes[3].infected);
  a.phase = "lobby";
  start(a, 20000);
  assert.equal(a.core, 100);
  assert.equal(a.players.filter((p) => p.mole).length, 1);
});
