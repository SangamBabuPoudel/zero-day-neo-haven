import { test } from "node:test";
import assert from "node:assert/strict";
import {
  create,
  player,
  start,
  view,
  action,
  meeting,
  vote,
  tick,
} from "../server/game.js";
function setup() {
  const r = create("ABC123", "a", "Alpha");
  r.players.push(player("b", "Beta"), player("c", "Gamma"));
  start(r, 1000);
  return r;
}
test("exactly one Mole and personalized state hides allegiance", () => {
  const r = setup();
  assert.equal(r.players.filter((p) => p.mole).length, 1);
  for (const p of r.players) {
    const v = view(r, p.id);
    assert.equal(v.me?.mole, p.mole);
    assert(v.players.every((x) => !("mole" in x)));
    assert(v.players.every((x) => !("next" in x)));
  }
});
test("cooldowns, role validation, shielding and node bounds", () => {
  const r = setup();
  const p = r.players[0];
  action(r, p, "repair", 2, 1000);
  assert.equal(r.nodes[2].infected, false);
  assert.throws(() => action(r, p, "repair", 8, 1001));
  assert.throws(() => action(r, p, "shield", 8, 10000));
  assert.throws(() => action(r, p, "repair", 22, 10000));
  const f = r.players[1];
  action(r, f, "shield", 1, 1000);
  assert.equal(r.nodes[1].shield, 19000);
  const mole = r.players.find((p) => p.mole)!;
  assert.throws(() => action(r, mole, "sabotage", 1, 10000));
  const innocent = r.players.find((p) => !p.mole)!;
  assert.throws(() => action(r, innocent, "sabotage", 3, 100000));
});
test("infection pulse is shared and shield excludes propagation", () => {
  const r = setup();
  r.nodes.forEach((n) => (n.infected = false));
  r.nodes[0].infected = true;
  [1, 19, 10].forEach((i) => (r.nodes[i].shield = 100000));
  tick(r, 8000);
  assert.equal(r.nodes.filter((n) => n.infected).length, 1);
  assert(r.core < 100);
});
test("correct majority wins and reveals all roles", () => {
  const r = setup();
  meeting(r, r.players[0], 1000);
  const m = r.players.find((p) => p.mole)!;
  r.players.forEach((p) => vote(r, p, m.id));
  assert.throws(() => vote(r, r.players[0], m.id));
  tick(r, 2000);
  assert.equal(r.winner, "DEFENDERS");
  assert(view(r, "a").players.every((p) => "mole" in p));
});
test("wrong vote penalizes, pauses mission and permits continuing", () => {
  const r = setup();
  const innocent = r.players.find((p) => !p.mole)!;
  meeting(r, r.players[0], 1000);
  r.players.forEach((p) => vote(r, p, innocent.id));
  tick(r, 5000);
  assert.equal(r.phase, "playing");
  assert.equal(r.core, 80);
  assert.equal(r.endAt, 245000);
});
test("clean stabilization and collapse produce opposite victories", () => {
  const r = setup();
  r.nodes.forEach((n) => (n.infected = false));
  tick(r, 1001);
  tick(r, 13001);
  assert.equal(r.winner, "DEFENDERS");
  const other = setup();
  other.core = 1;
  tick(other, 8000);
  assert.equal(other.winner, "MOLE");
});
test("independent rooms and fresh rounds do not share state", () => {
  const a = setup(),
    b = setup();
  a.nodes[0].infected = true;
  assert.equal(b.nodes[0].infected, false);
  a.core = 0;
  tick(a, 8000);
  start(a, 20000);
  assert.equal(a.core, 100);
  assert.equal(a.phase, "playing");
  assert.equal(a.players.filter((p) => p.mole).length, 1);
});
test("Sniffer reports privately, suspicious flags stay off the public map", () => {
  const r = setup();
  const p = r.players[2];
  r.nodes[0].suspicious = 20000;
  action(r, p, "scan", 0, 1000);
  assert.match(p.scan!, /SUSPICIOUS/);
  assert.equal(view(r, "a").me?.scan, undefined);
  assert(view(r, "a").nodes.every((n) => !("suspicious" in n)));
});
test("meeting timeout, skips and mission deadline resolve authoritatively", () => {
  const r = setup();
  meeting(r, r.players[0], 1000);
  vote(r, r.players[0], "skip");
  tick(r, 21000);
  assert.equal(r.phase, "playing");
  assert.equal(r.core, 100);
  assert.throws(() => meeting(r, r.players[0], 22000));
  tick(r, r.endAt);
  assert.equal(r.winner, "MOLE");
});
