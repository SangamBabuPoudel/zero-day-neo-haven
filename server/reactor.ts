import { randomBytes, randomInt } from "node:crypto";
import { event, record, type Room, type Player } from "./game.js";
export type Reactor = {
  id: string;
  sequence: number[];
  status: "active" | "stabilized" | "overload" | "override";
  started: number;
  ends: number;
  resolvedAt?: number;
  fieldId?: string;
  remoteId?: string;
  readers: string[];
  inputs: number[];
  overrideBy?: string;
  overrideEnds?: number;
};
export function startReactor(r: Room, now: number) {
  if (r.reactor?.status === "active") return;
  const sequence: number[] = [];
  while (sequence.length < 3) {
    const n = randomInt(1, 5);
    if (!sequence.includes(n)) sequence.push(n);
  }
  r.reactor = {
    id: randomBytes(10).toString("hex"),
    sequence,
    status: "active",
    started: now,
    ends: now + 25000,
    readers: [],
    inputs: [],
  };
  event(
    r,
    "REACTOR MELTDOWN / 25s. One agent to POWER, another to COMMS or SURVEILLANCE.",
  );
  record(r, { name: "SYSTEM" } as Player, 1, "reactor emergency began", now);
}
function authorized(r: Room, p: Player, id: string, now: number) {
  const c = r.reactor;
  if (
    r.phase !== "playing" ||
    p.spectator ||
    !p.connected ||
    !r.players.includes(p) ||
    p.travel
  )
    throw Error("Reach a terminal as an active operator first.");
  if (!c || c.id !== id || c.status !== "active" || now >= c.ends)
    throw Error("This crisis is no longer active.");
  return c;
}
export function reactorAccess(
  r: Room,
  p: Player,
  id: string,
  now = Date.now(),
) {
  const c = authorized(r, p, id, now);
  if (p.location === 1) {
    if (c.readers.includes(p.id))
      throw Error(
        "Intelligence readers cannot operate this crisis. Use the emergency override if needed.",
      );
    const current = r.players.find((x) => x.id === c.fieldId);
    if (
      current &&
      current.id !== p.id &&
      current.connected &&
      !current.travel &&
      current.location === 1
    )
      throw Error(
        "Field panel in use. You can still initiate a solo override.",
      );
    if (c.fieldId !== p.id) {
      c.fieldId = p.id;
      c.inputs = [];
      record(r, p, 1, "accessed reactor switch panel", now);
    }
  } else if (p.location === 2 || p.location === 4) {
    if (c.fieldId === p.id)
      throw Error("Field operator cannot access private reactor intelligence.");
    if (r.nodes[p.location].infected)
      throw Error(
        "This intelligence terminal is infected. Repair it or use the other terminal.",
      );
    const current = r.players.find((x) => x.id === c.remoteId);
    if (
      current &&
      current.id !== p.id &&
      current.connected &&
      !current.travel &&
      [2, 4].includes(current.location)
    )
      throw Error(
        "Remote terminal assigned. Ask the intelligence operator for the sequence.",
      );
    if (c.remoteId !== p.id) {
      c.remoteId = p.id;
      if (!c.readers.includes(p.id)) c.readers.push(p.id);
      record(r, p, p.location, "accessed private reactor intelligence", now);
    }
  } else
    throw Error("Use POWER switches or COMMS / SURVEILLANCE intelligence.");
  p.task = undefined;
}
function resolve(r: Room, status: Reactor["status"], now: number) {
  const c = r.reactor!;
  c.status = status;
  c.resolvedAt = now;
  c.overrideEnds = undefined;
  r.reactorAt = now + 70000;
  if (status === "overload") {
    r.core = Math.max(0, r.core - 12);
    r.nodes[1].infected = true;
    r.threats.push({ from: 1, to: 2, started: now, arrives: now + 6500 });
    event(
      r,
      "REACTOR OVERLOAD / Integrity −12. New infection packet launched. Audit the operation.",
    );
  } else {
    r.nodes[1].infected = false;
    r.nodes[1].corruptAt = 0;
    r.nodes[1].corruptBy = undefined;
    r.threats = r.threats.filter((t) => t.to !== 1);
    r.core =
      status === "override"
        ? Math.max(0, r.core - 8)
        : Math.min(100, r.core + 4);
    event(
      r,
      status === "override"
        ? "REACTOR SAFE / Solo override consumed 8 integrity."
        : "REACTOR STABILIZED / Team shutdown successful. Integrity +4.",
    );
  }
  record(r, { name: "SYSTEM" } as Player, 1, `reactor ${status}`, now);
  for (const p of r.players)
    if ([c.fieldId, c.remoteId, c.overrideBy].includes(p.id))
      p.feedback = {
        text:
          status === "overload"
            ? "Reactor overload. Check submitted inputs and discuss what happened."
            : status === "override"
              ? "Emergency override complete. Reactor safe; integrity −8."
              : "Team shutdown confirmed. Reactor stabilized; integrity +4.",
        at: now,
      };
}
export function reactorInput(
  r: Room,
  p: Player,
  id: string,
  index: number,
  value: number,
  now = Date.now(),
) {
  const c = authorized(r, p, id, now);
  if (p.location !== 1 || c.fieldId !== p.id || c.readers.includes(p.id))
    throw Error(
      "Only the assigned field operator at POWER may press switches.",
    );
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > 4 ||
    index !== c.inputs.length ||
    index >= 3
  )
    throw Error("Invalid or duplicate switch submission.");
  c.inputs.push(value);
  record(
    r,
    p,
    1,
    `submitted reactor switch ${value} (input ${index + 1}/3)`,
    now,
  );
  if (c.inputs.length === 3)
    resolve(
      r,
      c.inputs.every((v, i) => v === c.sequence[i]) ? "stabilized" : "overload",
      now,
    );
}
export function reactorOverride(
  r: Room,
  p: Player,
  id: string,
  now = Date.now(),
) {
  const c = authorized(r, p, id, now);
  if (p.location !== 1)
    throw Error("Solo override requires physical presence at POWER.");
  if (c.overrideEnds) throw Error("An emergency override is already running.");
  if (now + 10000 >= c.ends)
    throw Error("Not enough time for the 10-second override.");
  c.overrideBy = p.id;
  c.overrideEnds = now + 10000;
  p.task = undefined;
  record(r, p, 1, "started emergency override (10s, 8 integrity)", now);
}
export function reactorView(r: Room, p: Player | undefined, now: number) {
  const c = r.reactor;
  if (!c) return null;
  const paused = r.phase === "meeting" ? now - r.meeting!.started : 0;
  const intel =
    !!p &&
    !p.spectator &&
    p.connected &&
    !p.travel &&
    [2, 4].includes(p.location) &&
    !r.nodes[p.location].infected &&
    c.remoteId === p.id &&
    c.status === "active";
  return {
    id: c.id,
    status: c.status,
    ends: c.ends + paused,
    fieldId: c.fieldId,
    remoteId: c.remoteId,
    entered: c.inputs.length,
    overrideBy: c.overrideBy,
    overrideEnds: c.overrideEnds ? c.overrideEnds + paused : undefined,
    ...(intel ? { instructions: [...c.sequence] } : {}),
    ...(p?.id === c.fieldId ? { submitted: [...c.inputs] } : {}),
  };
}
export function tickReactor(r: Room, now: number) {
  const c = r.reactor;
  if (c?.status === "active") {
    if (c.overrideEnds) {
      const owner = r.players.find((p) => p.id === c.overrideBy);
      if (!owner?.connected || owner.travel || owner.location !== 1) {
        c.overrideEnds = undefined;
        c.overrideBy = undefined;
        event(r, "Emergency override interrupted. Operator left the reactor.");
      } else if (now >= c.overrideEnds && c.overrideEnds < c.ends) {
        resolve(r, "override", now);
        return;
      }
    }
    if (now >= c.ends) resolve(r, "overload", now);
  } else if (now >= r.reactorAt && now < r.secureAt) startReactor(r, now);
}
