import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import "./style.css";
const socket = io();
const points = Array.from({ length: 20 }, (_, i) => {
  const angle = (i * Math.PI) / 10 - Math.PI / 2;
  const radius = i % 2 ? 245 : 180;
  return {
    x: 400 + Math.cos(angle) * radius,
    y: 310 + Math.sin(angle) * radius,
  };
});
const edges = Array.from({ length: 20 }, (_, i) => [i, (i + 1) % 20]).concat(
  Array.from({ length: 10 }, (_, i) => [i, i + 10]),
);
function App() {
  const [r, setR] = useState<any>(null),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(2),
    [connected, setConnected] = useState(socket.connected),
    [boot, setBoot] = useState(true),
    [now, setNow] = useState(Date.now()),
    [sound, setSound] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBoot(false), 1500);
    const clock = setInterval(() => setNow(Date.now()), 200);
    socket.on("state", setR);
    socket.on("connect", () => {
      setConnected(true);
      const token = sessionStorage.getItem("zero-token");
      if (token)
        socket.emit("command", { kind: "resume", token }, (v: any) => {
          if (!v.ok) {
            sessionStorage.removeItem("zero-token");
            setR(null);
          }
        });
    });
    socket.on("disconnect", () => setConnected(false));
    return () => {
      clearTimeout(t);
      clearInterval(clock);
    };
  }, []);
  function cmd(kind: string, extra: any = {}) {
    setError("");
    socket
      .timeout(5000)
      .emit("command", { kind, ...extra }, (err: any, v: any) => {
        if (err) {
          setError("Connection interrupted. Try again.");
          return;
        }
        if (!v.ok) setError(v.error);
        if (v.token) sessionStorage.setItem("zero-token", v.token);
        if (v.ok && sound) {
          try {
            const a = new AudioContext();
            const o = a.createOscillator(),
              g = a.createGain();
            o.connect(g);
            g.connect(a.destination);
            o.frequency.value = kind === "sabotage" ? 130 : 560;
            g.gain.setValueAtTime(0.04, a.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.15);
            o.start();
            o.stop(a.currentTime + 0.15);
          } catch {}
        }
      });
  }
  const serverTime = now + (r ? r.serverNow - Date.now() : 0),
    cool = r ? Math.max(0, Math.ceil((r.me.next - serverTime) / 1000)) : 0;
  const host = r?.host === r?.me.id;
  const infected = r?.nodes.filter((n: any) => n.infected).length || 0;
  return (
    <>
      <div className="ambient" />
      <div className="scanlines" />
      {boot && (
        <div className="boot">
          <div className="cross">⌘</div>
          <p>ESTABLISHING SECURE LINK</p>
          <div className="loader" />
        </div>
      )}
      <header>
        <a className="brand" href="/">
          Z<span>Ø</span> / ZERO DAY
        </a>
        <div className="status">
          <i className={connected ? "online" : ""} />
          {connected ? "SECURE LINK ACTIVE" : "RECONNECTING"}
          <button className="sound" onClick={() => setSound(!sound)}>
            {sound ? "SOUND ON" : "SOUND OFF"}
          </button>
        </div>
      </header>
      {!r ? (
        <main className="landing">
          <div className="hero">
            <div className="eyebrow">
              COOPERATIVE SURVIVAL / SOCIAL DECEPTION
            </div>
            <h1>
              ZERO<span>DAY</span>
              <b>MOLE IN THE MAINFRAME</b>
            </h1>
            <p className="tagline">
              TRUST NO ONE.
              <br />
              <em>PATCH EVERYTHING.</em>
            </p>
            <p className="intro">
              Your network is under attack.
              <br />
              One of your teammates is the threat.
            </p>
            <div className="hero-network">
              <svg viewBox="0 0 800 620">
                {edges.map(([a, b], i) => (
                  <line
                    key={i}
                    x1={points[a].x}
                    y1={points[a].y}
                    x2={points[b].x}
                    y2={points[b].y}
                  />
                ))}
                {points.map((p, i) => (
                  <circle
                    className={i % 5 === 0 ? "bad" : ""}
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="7"
                  />
                ))}
                <circle className="core-ring" cx="400" cy="310" r="58" />
                <text x="400" y="316" textAnchor="middle">
                  ZØ
                </text>
              </svg>
            </div>
          </div>
          <section className="access panel">
            <div className="eyebrow">01 / ACCESS TERMINAL</div>
            <h2>Enter the mainframe.</h2>
            <p>3–8 operators. One hidden Mole. Four minutes.</p>
            <label>
              OPERATOR CALLSIGN
              <input
                maxLength={18}
                placeholder="e.g. GHOST"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button
              className="primary"
              disabled={!connected || !name.trim()}
              onClick={() => cmd("create", { name })}
            >
              CREATE OPERATION <span>↗</span>
            </button>
            <div className="divider">OR JOIN YOUR TEAM</div>
            <label>
              ROOM CODE
              <input
                maxLength={6}
                placeholder="6-CHARACTER CODE"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </label>
            <button
              disabled={!connected || !name.trim() || code.length !== 6}
              onClick={() => cmd("join", { name, code })}
            >
              JOIN OPERATION →
            </button>
            <div className="brief">
              <b>MISSION BRIEF</b>
              <p>
                Repair infected nodes. Shield your infrastructure. Scan for
                anomalies. Call a meeting when you suspect the Mole. Clear the
                network for 12 seconds to stabilize it.
              </p>
            </div>
          </section>
        </main>
      ) : (
        <main className="operation">
          <div className="op-heading">
            <div>
              <div className="eyebrow">OPERATION / {r.code}</div>
              <h2>
                {r.phase === "lobby"
                  ? "Assemble your team."
                  : "Mole in the Mainframe"}
              </h2>
            </div>
            <div className="timer">
              {r.phase === "lobby"
                ? "STANDBY"
                : `${Math.max(0, Math.floor((r.endAt - serverTime) / 60000))}:${String(Math.max(0, Math.floor((r.endAt - serverTime) / 1000) % 60)).padStart(2, "0")}`}
              <small>MISSION CLOCK</small>
            </div>
          </div>
          {r.phase === "lobby" ? (
            <div className="lobby-layout">
              <section className="panel lobby">
                <div className="eyebrow">ENCRYPTED ROOM CODE</div>
                <div className="room-code">{r.code}</div>
                <button
                  onClick={() =>
                    navigator.clipboard
                      ?.writeText(r.code)
                      .catch(() => setError("Copy the code manually."))
                  }
                >
                  COPY ROOM CODE ↗
                </button>
                <p>
                  Share this code with your team. Everyone opens the same game
                  URL.
                </p>
                <div className="roster">
                  {r.players.map((p: any, i: number) => (
                    <div key={p.id}>
                      <span className="avatar">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <strong>{p.name}</strong>
                      <span>
                        {p.connected
                          ? p.id === r.host
                            ? "HOST"
                            : "READY"
                          : "OFFLINE"}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className="primary"
                  disabled={
                    !host ||
                    r.players.filter((p: any) => p.connected).length < 3
                  }
                  onClick={() => cmd("start")}
                >
                  {host ? "START OPERATION →" : "WAITING FOR HOST"}
                </button>
              </section>
              <section className="panel instructions">
                <div className="eyebrow">KNOW YOUR SPECIALTY</div>
                {[
                  [
                    "PATCHER",
                    "Repair every 3.5 seconds. Keep the infection contained.",
                  ],
                  [
                    "FIREWALL",
                    "Shield a node for 18 seconds. Stop incoming infection.",
                  ],
                  ["SNIFFER", "Scan for infection and suspicious activity."],
                ].map(([a, b]) => (
                  <article key={a}>
                    <h3>{a}</h3>
                    <p>{b}</p>
                  </article>
                ))}
                <p>
                  Every specialist can repair. The Mole wears a specialist
                  identity and secretly infects nodes. A majority vote
                  identifies the suspect; a false accusation costs 20 integrity.
                </p>
                <p>
                  Infection pulses every 7 seconds. Stabilize a clean network
                  for 12 seconds, or catch the Mole. Survive the four-minute
                  deadline.
                </p>
              </section>
            </div>
          ) : (
            <>
              <div className="game-grid">
                <section className="map panel">
                  <div className="map-header">
                    <span>
                      NETWORK TOPOLOGY <b>LIVE</b>
                    </span>
                    <span className="red">{infected} / 20 COMPROMISED</span>
                  </div>
                  <svg
                    viewBox="0 0 800 620"
                    role="img"
                    aria-label="Interactive network map"
                  >
                    {edges.map(([a, b], i) => {
                      const bad = r.nodes[a]?.infected || r.nodes[b]?.infected;
                      return (
                        <g key={i}>
                          <line
                            className={bad ? "infected-line" : ""}
                            x1={points[a].x}
                            y1={points[a].y}
                            x2={points[b].x}
                            y2={points[b].y}
                          />
                          {bad && (
                            <circle r="3" className="packet">
                              <animateMotion
                                dur={`${3 + (i % 3)}s`}
                                repeatCount="indefinite"
                                path={`M ${points[a].x} ${points[a].y} L ${points[b].x} ${points[b].y}`}
                              />
                            </circle>
                          )}
                        </g>
                      );
                    })}
                    <circle className="core-halo" cx="400" cy="310" r="83" />
                    <circle className="core-track" cx="400" cy="310" r="65" />
                    <circle
                      className="core-ring"
                      style={{
                        strokeDasharray: `${r.core * 4.084} 408.4`,
                        stroke: r.core < 35 ? "#ff4965" : "#62f4de",
                      }}
                      cx="400"
                      cy="310"
                      r="65"
                    />
                    <text
                      className="integrity"
                      x="400"
                      y="310"
                      textAnchor="middle"
                    >
                      {r.core}
                      <tspan className="percent">%</tspan>
                    </text>
                    <text
                      className="core-label"
                      x="400"
                      y="336"
                      textAnchor="middle"
                    >
                      MAINFRAME CORE
                    </text>
                    {r.nodes.map((n: any) => {
                      const p = points[n.id];
                      return (
                        <g
                          key={n.id}
                          tabIndex={0}
                          role="button"
                          aria-label={`${n.name} ${n.infected ? "infected" : "clean"}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              setSelected(n.id);
                          }}
                          onClick={() => setSelected(n.id)}
                          className={`node ${n.infected ? "infected" : ""} ${n.shield > serverTime ? "shielded" : ""} ${selected === n.id ? "selected" : ""}`}
                        >
                          <circle
                            className="node-aura"
                            cx={p.x}
                            cy={p.y}
                            r="25"
                          />
                          <rect
                            x={p.x - 13}
                            y={p.y - 13}
                            width="26"
                            height="26"
                            rx="6"
                          />
                          <text x={p.x} y={p.y + 5} textAnchor="middle">
                            {["▤", "⌁", "◉", "✧", "▥", "ϟ"][n.id % 6]}
                          </text>
                          <text
                            className="node-label"
                            x={p.x}
                            y={p.y + 36}
                            textAnchor="middle"
                          >
                            {n.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="map-footer">
                    <span>● CLEAN</span>
                    <span className="red">● INFECTED</span>
                    <span className="gold">● SHIELDED</span>
                    <span>
                      {r.cleanAt
                        ? "STABILIZING // HOLD FOR 12s"
                        : "SELECT A NODE TO INTERACT"}
                    </span>
                  </div>
                </section>
                <aside>
                  <section className="panel identity">
                    <div className="eyebrow">YOUR ASSIGNMENT / PRIVATE</div>
                    <h2 className={r.me.mole ? "red" : ""}>
                      {r.me.mole ? "THE MOLE" : r.me.role}
                    </h2>
                    <p>
                      {r.me.mole
                        ? "Blend in. Infect silently. Destroy the Core."
                        : "Contain the infection. Find the insider."}
                    </p>
                    <span className="chip">COVER: {r.me.role}</span>
                  </section>
                  <section className="panel actions">
                    <div className="eyebrow">TARGET LOCKED</div>
                    <h3>{r.nodes[selected]?.name}</h3>
                    <p className={r.nodes[selected]?.infected ? "red" : ""}>
                      {r.nodes[selected]?.infected ? "COMPROMISED" : "SECURE"}{" "}
                      {r.nodes[selected]?.shield > serverTime
                        ? " / SHIELDED"
                        : ""}
                    </p>
                    <button
                      className="primary"
                      disabled={cool > 0 || r.phase !== "playing"}
                      onClick={() => cmd("repair", { node: selected })}
                    >
                      PATCH NODE <span>{cool ? `${cool}s` : "↗"}</span>
                    </button>
                    {r.me.role !== "PATCHER" && (
                      <button
                        disabled={cool > 0 || r.phase !== "playing"}
                        onClick={() =>
                          cmd(r.me.role === "FIREWALL" ? "shield" : "scan", {
                            node: selected,
                          })
                        }
                      >
                        {r.me.role === "FIREWALL"
                          ? "DEPLOY SHIELD"
                          : "SCAN NODE"}
                      </button>
                    )}
                    {r.me.scan && <p className="scan-result">{r.me.scan}</p>}
                    {r.me.mole && (
                      <button
                        className="danger"
                        disabled={cool > 0 || r.phase !== "playing"}
                        onClick={() => cmd("sabotage", { node: selected })}
                      >
                        INJECT INFECTION
                      </button>
                    )}
                    <button
                      className="meeting-button"
                      disabled={
                        r.phase !== "playing" || r.me.meetingNext > serverTime
                      }
                      onClick={() => cmd("meeting")}
                    >
                      ⚠ EMERGENCY MEETING{" "}
                      {r.me.meetingNext > serverTime
                        ? `(${Math.ceil((r.me.meetingNext - serverTime) / 1000)}s)`
                        : ""}
                    </button>
                  </section>
                  <section className="panel feed">
                    <div className="eyebrow">SECURITY EVENT STREAM</div>
                    {r.events.slice(0, 7).map((v: string, i: number) => (
                      <p key={i}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        {v}
                      </p>
                    ))}
                  </section>
                </aside>
              </div>
              <div className="team-strip">
                {r.players.map((p: any) => (
                  <span key={p.id}>
                    <i className={p.connected ? "online" : ""} />
                    {p.name}
                    <small>{p.role}</small>
                  </span>
                ))}
              </div>
            </>
          )}
          {r.phase === "meeting" && (
            <div className="overlay">
              <section className="modal panel">
                <div className="eyebrow red">
                  SECURITY OVERRIDE // INFECTION PAUSED
                </div>
                <h2>There’s a Mole among us.</h2>
                <p>
                  {r.meeting.caller} called an emergency meeting. Discuss in
                  your voice call; select your suspect.
                </p>
                <div className="vote-clock">
                  {Math.max(0, Math.ceil((r.meeting.ends - serverTime) / 1000))}
                  s
                </div>
                {r.players
                  .filter((p: any) => p.connected)
                  .map((p: any) => (
                    <button
                      disabled={r.meeting.voted.includes(r.me.id)}
                      key={p.id}
                      onClick={() => cmd("vote", { target: p.id })}
                    >
                      {p.name}
                      <span>{p.role} →</span>
                    </button>
                  ))}
                <button
                  disabled={r.meeting.voted.includes(r.me.id)}
                  onClick={() => cmd("vote", { target: "skip" })}
                >
                  SKIP VOTE
                </button>
                <p>{r.meeting.voted.length} votes locked. Majority required.</p>
              </section>
            </div>
          )}
          {r.phase === "ended" && (
            <div className="overlay">
              <section className="modal panel reveal">
                <div className="eyebrow">OPERATION COMPLETE</div>
                <h1 className={r.winner === "MOLE" ? "red" : ""}>
                  {r.winner === "MOLE" ? "SYSTEM DOWN" : "THREAT ZERO"}
                </h1>
                <p>
                  {r.winner === "MOLE"
                    ? "The Mole brought down the mainframe."
                    : "The defenders secured the network."}
                </p>
                <div className="roster">
                  {r.players.map((p: any) => (
                    <div key={p.id}>
                      <strong>{p.name}</strong>
                      <span className={p.mole ? "red" : ""}>
                        {p.mole ? "THE MOLE" : p.role}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className="primary"
                  disabled={!host}
                  onClick={() => cmd("replay")}
                >
                  {host ? "PLAY AGAIN →" : "WAITING FOR HOST TO REPLAY"}
                </button>
              </section>
            </div>
          )}
        </main>
      )}
      {error && (
        <div className="toast" role="alert" onClick={() => setError("")}>
          {error} ×
        </div>
      )}
      <footer>
        <span>ZERO DAY / MOLE IN THE MAINFRAME</span>
        <span>TRUST IS A VULNERABILITY.</span>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
