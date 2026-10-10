import { randomInt, randomBytes } from "node:crypto";
import { buildings, edges, route, routeLength } from "../shared/city.js";
export { edges };
export const roles = ["PATCHER", "FIREWALL", "SNIFFER"];
type Travel = { path: number[]; started: number; arrives: number };
type Task = {
  id: string;
  kind: string;
  node: number;
  mode: "circuit" | "isolate";
  sequence: number[];
  done: number[];
  started: number;
  expires: number;
};
export type Player = {
  id: string;
  name: string;
  role: string;
  mole: boolean;
  connected: boolean;
  next: number;
  meetingNext: number;
  location: number;
  travel?: Travel;
  task?: Task;
  scan?: string;
  spectator: boolean;
  chatNext: number;
  corruptNext: number;
};
type Node = {
  id: number;
  name: string;
  infected: boolean;
  shield: number;
  corruptAt: number;
  corruptBy?: string;
};
type RecordEntry = { at: number; player: string; node: number; kind: string };
type Threat = { from: number; to: number; started: number; arrives: number };
export type Room = {
  code: string;
  host: string;
  players: Player[];
  phase: string;
  nodes: Node[];
  core: number;
  events: string[];
  history: RecordEntry[];
  chat: { name: string; text: string; at: number }[];
  endAt: number;
  secureAt: number;
  cleanAt: number;
  spreadAt: number;
  threats: Threat[];
  meeting: null | {
    caller: string;
    ends: number;
    started: number;
    votes: Record<string, string>;
    eligible: string[];
  };
  winner?: string;
};
export function player(id: string, name: string): Player {
  return {
    id,
    name,
    role: "",
    mole: false,
    connected: true,
    next: 0,
    meetingNext: 0,
    location: 5,
    spectator: false,
    chatNext: 0,
    corruptNext: 0,
  };
}
export function create(code: string, id: string, name: string): Room {
  return {
    code,
    host: id,
    players: [player(id, name)],
    phase: "lobby",
    nodes: [],
    core: 100,
    events: [],
    history: [],
    chat: [],
    endAt: 0,
    secureAt: 0,
    cleanAt: 0,
    spreadAt: 0,
    threats: [],
    meeting: null,
  };
}
export function event(r: Room, s: string) {
  r.events.unshift(s);
  r.events = r.events.slice(0, 30);
}
function record(r: Room, p: Player, node: number, kind: string, now: number) {
  r.history.push({ at: now, player: p.name, node, kind });
  r.history = r.history.slice(-300);
}
function active(r: Room, p: Player) {
  if (
    r.phase !== "playing" ||
    p.spectator ||
    !p.connected ||
    !r.players.includes(p)
  )
    throw Error("Active operator required.");
}
export function finish(r: Room, w: string) {
  r.phase = "ended";
  r.winner = w;
  r.meeting = null;
  event(r, w === "DEFENDERS" ? "THREAT NEUTRALIZED" : "MAINFRAME LOST");
}
export function start(r: Room, now = Date.now()) {
  if (r.phase !== "lobby") throw Error("Round already active.");
  const ready = r.players.filter((p) => p.connected);
  if (ready.length < 3 || ready.length > 8)
    throw Error("Three to eight connected operators required.");
  r.players = ready;
  const m = randomInt(ready.length);
  r.players.forEach((p, i) =>
    Object.assign(p, player(p.id, p.name), {
      role: roles[i % 3],
      mole: i === m,
    }),
  );
  r.nodes = buildings.map((b) => ({
    id: b.id,
    name: b.name,
    infected: b.id === 0 || b.id === 1,
    shield: 0,
    corruptAt: 0,
  }));
  Object.assign(r, {
    phase: "playing",
    core: 100,
    endAt: now + 360000,
    secureAt: now + 300000,
    cleanAt: 0,
    spreadAt: now + 12000,
    threats: [],
    meeting: null,
    winner: undefined,
    events: [],
    history: [],
  });
  event(
    r,
    "NEO-HAVEN breached. Hold until the uplink seals in 5 minutes, then clear the city.",
  );
}
export function view(r: Room, id: string, now = Date.now()) {
  const me = r.players.find((p) => p.id === id);
  const pause = r.phase === "meeting" ? now - r.meeting!.started : 0;
  return {
    code: r.code,
    host: r.host,
    phase: r.phase,
    core: r.core,
    events: r.events,
    chat: r.chat,
    winner: r.winner,
    endAt: r.endAt + pause,
    secureAt: r.secureAt + pause,
    cleanAt: r.cleanAt,
    serverNow: now,
    nodes: r.nodes.map(({ corruptAt, corruptBy, ...n }) => n),
    threats: r.nodes[2]?.infected
      ? []
      : r.threats.filter(
          (t) => !r.nodes[4]?.infected || t.arrives - now <= 2500,
        ),
    intelOffline: !!r.nodes[2]?.infected,
    players: r.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      spectator: p.spectator,
      location: p.location,
      travel: p.travel,
      ...(r.phase === "ended" ? { role: p.role, mole: p.mole } : {}),
    })),
    me: me ? { ...me } : null,
    meeting: r.meeting
      ? {
          ends: r.meeting.ends,
          caller: r.meeting.caller,
          voted: Object.keys(r.meeting.votes),
          eligible: r.meeting.eligible,
        }
      : null,
  };
}
export function travel(r: Room, p: Player, node: number, now = Date.now()) {
  active(r, p);
  if (!Number.isInteger(node) || !r.nodes[node])
    throw Error("Unknown district.");
  if (p.travel) throw Error("Already in transit.");
  if (p.location === node) return;
  const path = route(p.location, node);
  p.travel = {
    path,
    started: now,
    arrives: now + Math.min(5000, Math.max(2000, routeLength(path) * 7)),
  };
  p.task = undefined;
  record(r, p, p.location, `departed for ${r.nodes[node].name}`, now);
}
function positioned(r: Room, p: Player, node: number, now: number) {
  active(r, p);
  if (!Number.isInteger(node) || !r.nodes[node])
    throw Error("Unknown district.");
  if (p.travel || p.location !== node)
    throw Error("Travel to this building first.");
  if (p.next > now) throw Error("Ability cooling down.");
}
export function begin(
  r: Room,
  p: Player,
  kind: string,
  node: number,
  now = Date.now(),
) {
  positioned(r, p, node, now);
  if (!["repair", "shield", "scan", "sabotage"].includes(kind))
    throw Error("Unknown operation.");
  if (
    (kind === "shield" && p.role !== "FIREWALL") ||
    (kind === "scan" && p.role !== "SNIFFER") ||
    (kind === "sabotage" && !p.mole)
  )
    throw Error("Unauthorized ability.");
  if (kind === "sabotage" && p.corruptNext > now)
    throw Error("Corrupt ability cooling down.");
  const mode = node % 2 === 0 ? "isolate" : "circuit";
  const sequence: number[] = [];
  while (sequence.length < 3) {
    const v = randomInt(6);
    if (!sequence.includes(v)) sequence.push(v);
  }
  p.task = {
    id: randomBytes(8).toString("hex"),
    kind,
    node,
    mode,
    sequence,
    done: [],
    started: now,
    expires: now + 30000,
  };
}
export function taskStep(
  r: Room,
  p: Player,
  id: string,
  cell: number,
  now = Date.now(),
) {
  const t = p.task;
  if (!t || t.id !== id || t.expires < now)
    throw Error("Operation expired. Reopen the terminal.");
  positioned(r, p, t.node, now);
  if (
    !Number.isInteger(cell) ||
    !t.sequence.includes(cell) ||
    t.done.includes(cell) ||
    (t.mode === "circuit" && cell !== t.sequence[t.done.length])
  )
    throw Error("Wrong circuit. Follow the highlighted sequence.");
  t.done.push(cell);
}
export function action(
  r: Room,
  p: Player,
  kind: string,
  node: number,
  now = Date.now(),
) {
  positioned(r, p, node, now);
  const t = p.task;
  if (
    !t ||
    t.kind !== kind ||
    t.node !== node ||
    t.expires < now ||
    t.done.length !== 3 ||
    now - t.started < 1200
  )
    throw Error("Complete the terminal task first (at least 1.2s).");
  const n = r.nodes[node];
  if (kind === "sabotage") {
    if (!p.mole || p.corruptNext > now) throw Error("Corrupt unavailable.");
    if (n.shield > now) throw Error("Building shielded.");
    n.infected = false;
    n.corruptAt = now + 10000;
    n.corruptBy = p.name;
    p.corruptNext = now + 30000;
    p.next = now + 6500;
    record(r, p, node, "service operation", now);
    event(r, `${p.name} serviced ${n.name}.`);
  } else if (kind === "repair") {
    const damaged = n.infected || n.corruptAt > 0;
    n.infected = false;
    n.corruptAt = 0;
    n.corruptBy = undefined;
    if (damaged)
      r.core = Math.min(100, r.core + (p.role === "PATCHER" ? 4 : 2));
    p.next = now + (p.role === "PATCHER" ? 3500 : 6500);
    record(r, p, node, "service operation", now);
    event(r, `${p.name} serviced ${n.name}.`);
  } else if (kind === "shield" && p.role === "FIREWALL") {
    n.shield = now + (r.nodes[3].infected ? 12000 : 24000);
    p.next = now + 9000;
    record(r, p, node, "shield deployed", now);
    event(r, `${p.name} shielded ${n.name}.`);
  } else if (kind === "scan" && p.role === "SNIFFER") {
    const entries = r.history
      .filter((e) => e.node === node && now - e.at <= 90000)
      .slice(-7);
    p.scan =
      `${n.name} / LAST 90s: ` +
      (entries
        .map(
          (e) =>
            `${Math.max(0, Math.floor((now - e.at) / 1000))}s ago: ${e.player} ${e.kind}`,
        )
        .join(" · ") || "No recent access.");
    p.next = now + 4500;
    record(r, p, node, "audit accessed", now);
  } else throw Error("Unauthorized ability.");
  p.task = undefined;
}
export function chat(r: Room, p: Player, text: string, now = Date.now()) {
  if (p.chatNext > now) throw Error("Wait a moment before sending.");
  const value = String(text || "")
    .trim()
    .slice(0, 220);
  if (!value) throw Error("Enter a message.");
  if (p.spectator && r.phase !== "lobby")
    throw Error("Spectators cannot transmit during a round.");
  r.chat.push({ name: p.name, text: value, at: now });
  r.chat = r.chat.slice(-50);
  p.chatNext = now + 1000;
}
export function meeting(r: Room, p: Player, now = Date.now()) {
  active(r, p);
  if (p.meetingNext > now) throw Error("Meeting unavailable.");
  r.phase = "meeting";
  p.meetingNext = now + 90000;
  r.meeting = {
    caller: p.name,
    ends: now + 35000,
    started: now,
    votes: {},
    eligible: r.players
      .filter((x) => !x.spectator && x.connected)
      .map((x) => x.id),
  };
  event(r, "EMERGENCY // City clock paused. Compare access histories.");
}
export function vote(r: Room, p: Player, target: string) {
  if (
    r.phase !== "meeting" ||
    !r.meeting ||
    !r.meeting.eligible.includes(p.id) ||
    !p.connected ||
    r.meeting.votes[p.id]
  )
    throw Error("Vote unavailable.");
  if (target !== "skip" && !r.meeting.eligible.includes(target))
    throw Error("Invalid suspect.");
  r.meeting.votes[p.id] = target;
}
export function tick(r: Room, now = Date.now()) {
  if (r.phase === "meeting") {
    const m = r.meeting!;
    if (now >= m.ends || m.eligible.every((id) => m.votes[id])) {
      const counts: Record<string, number> = {};
      Object.values(m.votes).forEach((v) => (counts[v] = (counts[v] || 0) + 1));
      const suspect = r.players.find(
        (p) => (counts[p.id] || 0) > m.eligible.length / 2,
      );
      if (suspect?.mole) {
        finish(r, "DEFENDERS");
        return;
      }
      if (suspect) {
        r.core = Math.max(0, r.core - 20);
        event(r, `${suspect.name} cleared. False accusation: integrity -20.`);
      } else event(r, "No majority. Operations resumed.");
      const pause = now - m.started;
      r.endAt += pause;
      r.secureAt += pause;
      r.spreadAt += pause;
      if (r.cleanAt) r.cleanAt += pause;
      r.threats.forEach((t) => {
        t.started += pause;
        t.arrives += pause;
      });
      r.nodes.forEach((n) => {
        if (n.shield) n.shield += pause;
        if (n.corruptAt) n.corruptAt += pause;
      });
      r.players.forEach((p) => {
        if (p.travel) {
          p.travel.started += pause;
          p.travel.arrives += pause;
        }
        if (p.task) {
          p.task.started += pause;
          p.task.expires += pause;
        }
        p.next += pause;
        p.corruptNext += pause;
      });
      r.phase = "playing";
      r.meeting = null;
      if (r.core === 0) finish(r, "MOLE");
    }
    return;
  }
  if (r.phase !== "playing") return;
  r.players.forEach((p) => {
    if (p.travel && p.travel.arrives <= now) {
      p.location = p.travel.path.at(-1)!;
      p.travel = undefined;
      record(r, p, p.location, "arrived", now);
    }
  });
  r.nodes.forEach((n) => {
    if (n.corruptAt && n.corruptAt <= now) {
      n.corruptAt = 0;
      if (n.shield <= now) {
        n.infected = true;
        r.core = Math.max(0, r.core - 6);
        event(
          r,
          `Delayed service failure at ${n.name}. Audit recent visitors.`,
        );
        r.history.push({
          at: now,
          player: "SYSTEM",
          node: n.id,
          kind: "delayed service failure",
        });
      }
      n.corruptBy = undefined;
    }
  });
  r.threats = r.threats.filter((t) => {
    if (t.arrives > now) return true;
    const n = r.nodes[t.to];
    if (n.shield <= now) {
      n.infected = true;
      event(r, `Incoming packet breached ${n.name}.`);
    } else event(r, `Shield intercepted attack at ${n.name}.`);
    return false;
  });
  if (now >= r.spreadAt) {
    const infected = r.nodes.filter((n) => n.infected);
    r.spreadAt = now + (r.nodes[1].infected ? 10000 : 18000);
    if (infected.length) {
      const damage =
        Math.max(1, infected.length) * (r.nodes[0].infected ? 2 : 1) +
        (r.nodes[5].infected ? 2 : 0);
      r.core = Math.max(0, r.core - damage);
      event(r, `Infection pulse // integrity −${damage}.`);
    }
    if (now < r.secureAt || infected.length) {
      const candidates = edges.flatMap(([a, b]) =>
        r.nodes[a].infected && !r.nodes[b].infected
          ? [{ from: a, to: b }]
          : r.nodes[b].infected && !r.nodes[a].infected
            ? [{ from: b, to: a }]
            : [],
      );
      const target = candidates.length
        ? candidates[randomInt(candidates.length)]
        : { from: 5, to: randomInt(5) };
      r.threats.push({ ...target, started: now, arrives: now + 6500 });
    }
  }
  if (
    now >= r.secureAt &&
    !r.nodes.some((n) => n.infected || n.corruptAt) &&
    !r.threats.length
  ) {
    if (!r.cleanAt) r.cleanAt = now;
    if (now - r.cleanAt >= 12000) {
      finish(r, "DEFENDERS");
      return;
    }
  } else r.cleanAt = 0;
  if (r.core === 0 || now >= r.endAt) finish(r, "MOLE");
}
