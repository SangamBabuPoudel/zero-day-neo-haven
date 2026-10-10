import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomBytes } from "node:crypto";
import {
  create,
  player,
  start,
  view,
  action,
  meeting,
  vote,
  tick,
  travel,
  begin,
  taskStep,
  chat,
  type Room,
} from "./game.js";
const app = express(),
  http = createServer(app),
  io = new Server(http, { maxHttpBufferSize: 10000 });
const rooms = new Map<string, Room>();
const tokens = new Map<string, { code: string; id: string }>();
const socketPlayer = new Map<string, string>();
app.get("/health", (_, res) => res.json({ ok: true }));
app.use(express.static("dist"));
app.get("/{*path}", (_, res) => res.sendFile("index.html", { root: "dist" }));
function emit(r: Room) {
  for (const s of io.sockets.sockets.values())
    if (s.data.code === r.code)
      s.emit("state", view(r, socketPlayer.get(s.id)!));
}
io.on("connection", (s) => {
  let last = 0;
  s.on("command", (data: any, ack: any) => {
    try {
      if (Date.now() - last < 100) throw Error("Slow down.");
      last = Date.now();
      if (!data || typeof data !== "object") throw Error("Invalid request.");
      const { kind } = data;
      if (["create", "join", "resume"].includes(kind)) {
        if (s.data.code) throw Error("Already connected to a room.");
        let r: Room, p: any, token: string;
        if (kind === "resume") {
          const t = tokens.get(data.token);
          if (!t) throw Error("Session expired.");
          r = rooms.get(t.code)!;
          p = r?.players.find((x) => x.id === t.id);
          if (!p) throw Error("Session expired.");
          if (p.connected) throw Error("Session already connected.");
          p.connected = true;
          token = data.token;
        } else {
          const name = String(data.name || "")
            .trim()
            .slice(0, 18);
          if (!name) throw Error("Enter a callsign.");
          const id = randomBytes(12).toString("hex");
          if (kind === "create") {
            if (rooms.size >= 500) throw Error("Server full.");
            let code;
            do {
              code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
            } while (rooms.has(code));
            r = create(code, id, name);
            rooms.set(code, r);
            p = r.players[0];
          } else {
            r = rooms.get(String(data.code).toUpperCase())!;
            if (!r) throw Error("Room not available.");
            if (
              r.players.some((x) => x.name.toLowerCase() === name.toLowerCase())
            )
              throw Error("Callsign already in use in this room.");
            if (r.players.length >= 8) throw Error("Room full.");
            p = player(id, name);
            p.spectator = r.phase !== "lobby";
            r.players.push(p);
          }
          token = randomBytes(24).toString("hex");
          tokens.set(token, { code: r.code, id: p.id });
        }
        s.data.code = r.code;
        socketPlayer.set(s.id, p.id);
        ack?.({ ok: true, token });
        emit(r);
        return;
      }
      const r = rooms.get(s.data.code),
        p = r?.players.find((x) => x.id === socketPlayer.get(s.id));
      if (!r || !p || !p.connected) throw Error("Join a room first.");
      tick(r);
      if (kind === "start") {
        if (r.host !== p.id || r.phase !== "lobby") throw Error("Host only.");
        start(r);
      } else if (kind === "replay") {
        if (r.host !== p.id || r.phase !== "ended") throw Error("Host only.");
        r.phase = "lobby";
        r.nodes = [];
        r.meeting = null;
        r.players.forEach((x) => {
          x.mole = false;
          x.role = "";
        });
      } else if (kind === "travel") travel(r, p, Number(data.node));
      else if (kind === "begin")
        begin(r, p, String(data.ability), Number(data.node));
      else if (kind === "step")
        taskStep(r, p, String(data.task), Number(data.cell));
      else if (kind === "chat") chat(r, p, String(data.text || ""));
      else if (kind === "meeting") meeting(r, p);
      else if (kind === "vote") vote(r, p, String(data.target));
      else action(r, p, kind, Number(data.node));
      tick(r);
      emit(r);
      ack?.({ ok: true });
    } catch (e: any) {
      ack?.({ ok: false, error: e.message });
    }
  });
  s.on("disconnect", () => {
    const r = rooms.get(s.data.code);
    const p = r?.players.find((x) => x.id === socketPlayer.get(s.id));
    if (r && p) {
      p.connected = false;
      if (r.host === p.id)
        r.host = r.players.find((x) => x.connected && !x.spectator)?.id || p.id;
      emit(r);
    }
    socketPlayer.delete(s.id);
  });
});
setInterval(() => {
  for (const r of rooms.values()) {
    if (!r.players.some((p) => p.connected)) {
      (r as any).emptyAt ||= Date.now();
      if (Date.now() - (r as any).emptyAt > 600000) {
        rooms.delete(r.code);
        for (const [t, v] of tokens) if (v.code === r.code) tokens.delete(t);
      }
      continue;
    }
    (r as any).emptyAt = 0;
    tick(r);
    emit(r);
  }
}, 200);
http.listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
  console.log("ZERO DAY listening"),
);
