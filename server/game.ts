import { randomInt, randomBytes } from "node:crypto";
export const roles = ["PATCHER", "FIREWALL", "SNIFFER"];
export type Player = {
  id: string;
  name: string;
  role: string;
  mole: boolean;
  connected: boolean;
  next: number;
  meetingNext: number;
  scan?: string;
};
export type Room = {
  code: string;
  host: string;
  players: Player[];
  phase: string;
  nodes: any[];
  core: number;
  events: string[];
  endAt: number;
  cleanAt: number;
  spreadAt: number;
  meeting: any;
  winner?: string;
};
export const edges = Array.from({ length: 20 }, (_, i) => [
  i,
  (i + 1) % 20,
]).concat(Array.from({ length: 10 }, (_, i) => [i, i + 10]));
export function create(code: string, id: string, name: string): Room {
  return {
    code,
    host: id,
    players: [player(id, name)],
    phase: "lobby",
    nodes: [],
    core: 100,
    events: [],
    endAt: 0,
    cleanAt: 0,
    spreadAt: 0,
    meeting: null,
  };
}
export function player(id: string, name: string): Player {
  return {
    id,
    name,
    role: "",
    mole: false,
    connected: true,
    next: 0,
    meetingNext: 0,
  };
}
export function event(r: Room, s: string) {
  r.events.unshift(s);
  r.events = r.events.slice(0, 16);
}
export function finish(r: Room, w: string) {
  r.phase = "ended";
  r.winner = w;
  event(r, w === "DEFENDERS" ? "THREAT NEUTRALIZED" : "MAINFRAME LOST");
}
export function start(r: Room, now = Date.now()) {
  if (r.players.filter((p) => p.connected).length < 3)
    throw Error("Three connected operators required.");
  r.players = r.players.filter((p) => p.connected);
  const m = randomInt(r.players.length);
  r.players.forEach((p, i) => {
    p.role = roles[i % 3];
    p.mole = i === m;
    p.next = 0;
    p.meetingNext = 0;
    p.scan = undefined;
  });
  r.nodes = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    name:
      ["SERVER", "ROUTER", "CAMERA", "SATELLITE", "DATABASE", "POWER"][i % 6] +
      " " +
      String(i + 1).padStart(2, "0"),
    infected: [2, 8, 14].includes(i),
    shield: 0,
    suspicious: 0,
  }));
  r.phase = "playing";
  r.core = 100;
  r.endAt = now + 240000;
  r.cleanAt = 0;
  r.spreadAt = now + 7000;
  r.meeting = null;
  r.winner = undefined;
  r.events = [];
  event(r, "Intrusion detected. Secure the mainframe.");
}
export function view(r: Room, id: string) {
  const me = r.players.find((p) => p.id === id);
  return {
    ...r,
    endAt:
      r.phase === "meeting"
        ? r.endAt + Date.now() - r.meeting.started
        : r.endAt,
    nodes: r.nodes.map(({ suspicious, ...n }) => n),
    players: r.players.map(({ mole, next, scan, meetingNext, ...p }) => ({
      ...p,
      ...(r.phase === "ended" ? { mole } : {}),
    })),
    me: me ? { ...me } : null,
    meeting: r.meeting
      ? {
          ends: r.meeting.ends,
          caller: r.meeting.caller,
          voted: Object.keys(r.meeting.votes),
        }
      : null,
    serverNow: Date.now(),
  };
}
export function action(
  r: Room,
  p: Player,
  kind: string,
  nodeId: number,
  now = Date.now(),
) {
  if (r.phase !== "playing") throw Error("Round is paused.");
  if (p.next > now) throw Error("Ability cooling down.");
  const n = r.nodes[nodeId];
  if (!n) throw Error("Select a node.");
  if (kind === "sabotage") {
    if (!p.mole) throw Error("Unauthorized ability.");
    if (n.shield > now) throw Error("Node shielded.");
    n.infected = true;
    n.suspicious = now + 25000;
    p.next = now + 18000;
    event(r, "Anomalous packet detected.");
  } else if (kind === "repair") {
    n.infected = false;
    p.next = now + (p.role === "PATCHER" ? 3500 : 6500);
    event(r, `${p.name} repaired ${n.name}.`);
  } else if (kind === "shield" && p.role === "FIREWALL") {
    n.shield = now + 18000;
    p.next = now + 9000;
    event(r, `${p.name} shielded ${n.name}.`);
  } else if (kind === "scan" && p.role === "SNIFFER") {
    p.scan = `${n.name}: ${n.infected ? "INFECTED" : n.suspicious > now ? "SUSPICIOUS" : "CLEAN"}`;
    p.next = now + 4500;
  } else throw Error("Invalid ability.");
}
export function meeting(r: Room, p: Player, now = Date.now()) {
  if (r.phase !== "playing" || p.meetingNext > now)
    throw Error("Meeting unavailable.");
  r.phase = "meeting";
  p.meetingNext = now + 60000;
  r.meeting = { caller: p.name, ends: now + 20000, votes: {}, started: now };
  event(r, "EMERGENCY // communications secured");
}
export function vote(r: Room, p: Player, target: string) {
  if (r.phase !== "meeting" || r.meeting.votes[p.id])
    throw Error("Vote unavailable.");
  if (
    target !== "skip" &&
    !r.players.some((x) => x.id === target && x.connected)
  )
    throw Error("Invalid suspect.");
  r.meeting.votes[p.id] = target;
}
export function tick(r: Room, now = Date.now()) {
  if (r.phase === "meeting") {
    const active = r.players.filter((p) => p.connected);
    if (now >= r.meeting.ends || active.every((p) => r.meeting.votes[p.id])) {
      const counts: Record<string, number> = {};
      Object.values(r.meeting.votes).forEach(
        (v: any) => (counts[v] = (counts[v] || 0) + 1),
      );
      const suspect = r.players.find(
        (p) => (counts[p.id] || 0) > active.length / 2,
      );
      if (suspect?.mole) {
        finish(r, "DEFENDERS");
        return;
      }
      if (suspect) {
        r.core = Math.max(0, r.core - 20);
        event(r, `${suspect.name} cleared. False accusation: integrity -20.`);
      } else event(r, "No majority. Operations resumed.");
      const pause = now - r.meeting.started;
      r.endAt += pause;
      r.spreadAt += pause;
      if (r.cleanAt) r.cleanAt += pause;
      r.phase = "playing";
      r.meeting = null;
      if (r.core === 0) finish(r, "MOLE");
    }
    return;
  }
  if (r.phase !== "playing") return;
  const infected = r.nodes.filter((n) => n.infected);
  if (!infected.length) {
    if (!r.cleanAt) r.cleanAt = now;
    if (now - r.cleanAt >= 12000) {
      finish(r, "DEFENDERS");
      return;
    }
  } else r.cleanAt = 0;
  if (now >= r.spreadAt) {
    r.spreadAt = now + 7000;
    const candidates = edges
      .flatMap(([a, b]) =>
        r.nodes[a].infected && !r.nodes[b].infected
          ? [b]
          : r.nodes[b].infected && !r.nodes[a].infected
            ? [a]
            : [],
      )
      .filter((i) => r.nodes[i].shield <= now);
    for (const i of [...new Set(candidates)]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2))
      r.nodes[i].infected = true;
    r.core = Math.max(0, r.core - Math.max(1, Math.ceil(infected.length / 2)));
    event(r, "Infection pulse // integrity deteriorating.");
  }
  if (r.core === 0 || now >= r.endAt) {
    r.core = 0;
    finish(r, "MOLE");
  }
}
