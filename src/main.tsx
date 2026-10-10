import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import "./style.css";
import { City } from "./City";
import { buildings } from "../shared/city";
import { Interior, Chat } from "./Interior";
const socket = io();
function App() {
  const [r, setR] = useState<any>(null),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(5),
    [connected, setConnected] = useState(socket.connected),
    [boot, setBoot] = useState(true),
    [now, setNow] = useState(Date.now()),
    [sound, setSound] = useState(false),
    [offset, setOffset] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBoot(false), 1500);
    const clock = setInterval(() => setNow(Date.now()), 40);
    socket.on("state", (state: any) => {
      setOffset(state.serverNow - Date.now());
      setR(state);
    });
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
            o.onended = () => {
              void a.close();
            };
          } catch {}
        }
      });
  }
  const serverTime = now + offset;
  const cityTime = r?.phase === "meeting" ? r.meeting.ends - 35000 : serverTime;
  const host = r?.host === r?.me?.id;
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
              NEO-HAVEN is under attack.
              <br />
              One of your teammates is the threat.
            </p>
            <div className="hero-network">
              <City now={now} />
            </div>
          </div>
          <section className="access panel">
            <div className="eyebrow">01 / ACCESS TERMINAL</div>
            <h2>Enter the mainframe.</h2>
            <p>3–8 operators. One hidden Mole. Five-minute lockdown.</p>
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
                Travel to districts. Complete quick terminal tasks to repair,
                shield, or audit. Compare access histories in chat to expose the
                Mole. Hold five minutes, then clear the city for 12 seconds.
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
                    "Shield a district for 24 seconds. Stop incoming infection.",
                  ],
                  [
                    "SNIFFER",
                    "Audit real visits and operations. Connect failures to evidence.",
                  ],
                ].map(([a, b]) => (
                  <article key={a}>
                    <h3>{a}</h3>
                    <p>{b}</p>
                  </article>
                ))}
                <p>
                  Every specialist can repair. The Mole wears a specialist
                  identity and plants delayed corruption. A majority vote
                  identifies the suspect; a false accusation costs 20 integrity.
                </p>
                <p>
                  Select a district to travel (2–5 seconds), then use its
                  terminal. Red packets are incoming attacks. Hold until the
                  uplink seals at five minutes, then keep all six districts
                  clean for 12 seconds before the six-minute deadline. Catch the
                  Mole early with a majority vote.
                </p>
              </section>
            </div>
          ) : (
            <>
              <div className="game-grid">
                <section className="map panel">
                  <div className="map-header">
                    <span>
                      NEO-HAVEN / CITY LINK <b>LIVE</b>
                    </span>
                    <span className="red">{infected} / 6 COMPROMISED</span>
                  </div>
                  <div className="core-bar">
                    <span>CORE INTEGRITY</span>
                    <strong className={r.core < 35 ? "red" : ""}>
                      {r.core}%
                    </strong>
                    <meter min="0" max="100" value={r.core} />
                    <small>
                      {serverTime < r.secureAt
                        ? `UPLINK SEALS IN ${Math.ceil((r.secureAt - serverTime) / 1000)}s`
                        : "UPLINK SEALED / CLEAR THE CITY"}
                    </small>
                  </div>
                  <City
                    room={r}
                    now={cityTime}
                    selected={selected}
                    onSelect={(node) => {
                      setSelected(node);
                      if (
                        r.phase === "playing" &&
                        !r.me.spectator &&
                        !r.me.travel &&
                        r.me.location !== node
                      )
                        cmd("travel", { node });
                    }}
                  />
                  <div
                    className="district-controls"
                    aria-label="District travel controls"
                  >
                    {buildings.map((b) => (
                      <button
                        key={b.id}
                        className={selected === b.id ? "active" : ""}
                        disabled={
                          r.phase !== "playing" ||
                          r.me.spectator ||
                          !!r.me.travel
                        }
                        onClick={() => {
                          setSelected(b.id);
                          if (r.me.location !== b.id)
                            cmd("travel", { node: b.id });
                        }}
                      >
                        <span>{b.name}</span>
                        <small className={r.nodes[b.id].infected ? "red" : ""}>
                          {r.me.location === b.id
                            ? "YOU ARE HERE"
                            : r.nodes[b.id].infected
                              ? "⚠ INFECTED"
                              : "◇ SECURE"}
                        </small>
                      </button>
                    ))}
                  </div>
                  <div className="map-footer">
                    <span>● CLEAN</span>
                    <span className="red">● INFECTED</span>
                    <span className="gold">● SHIELDED</span>
                    <span>
                      {r.cleanAt
                        ? "STABILIZING // HOLD FOR 12s"
                        : "SELECT A DISTRICT TO TRAVEL"}
                    </span>
                  </div>
                </section>
                <aside>
                  <section className="panel identity">
                    <div className="eyebrow">YOUR ASSIGNMENT / PRIVATE</div>
                    <h2 className={r.me.mole ? "red" : ""}>
                      {r.me.spectator
                        ? "SPECTATOR"
                        : r.me.mole
                          ? "THE MOLE"
                          : r.me.role}
                    </h2>
                    <p>
                      {r.me.mole
                        ? "Blend in. Infect silently. Destroy the Core."
                        : "Contain the infection. Find the insider."}
                    </p>
                    <span className="chip">COVER: {r.me.role}</span>
                  </section>
                  <Interior
                    r={r}
                    selected={selected}
                    now={cityTime}
                    cmd={cmd}
                  />
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
              <Chat r={r} cmd={cmd} />
              <div className="team-strip">
                {r.players.map((p: any) => (
                  <span key={p.id}>
                    <i className={p.connected ? "online" : ""} />
                    {p.name}
                    <small>
                      {p.spectator
                        ? "SPECTATOR"
                        : p.travel
                          ? "IN TRANSIT"
                          : buildings[p.location]?.name}
                    </small>
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
                  {r.meeting.caller} called an emergency meeting. Compare access
                  histories in team chat, then select your suspect.
                </p>
                <Chat r={r} cmd={cmd} />
                <div className="vote-clock">
                  {Math.max(0, Math.ceil((r.meeting.ends - serverTime) / 1000))}
                  s
                </div>
                {r.players
                  .filter((p: any) => r.meeting.eligible.includes(p.id))
                  .map((p: any) => (
                    <button
                      disabled={
                        !r.meeting.eligible.includes(r.me.id) ||
                        r.meeting.voted.includes(r.me.id)
                      }
                      key={p.id}
                      onClick={() => cmd("vote", { target: p.id })}
                    >
                      {p.name}
                      <span>{p.role} →</span>
                    </button>
                  ))}
                <button
                  disabled={
                    !r.meeting.eligible.includes(r.me.id) ||
                    r.meeting.voted.includes(r.me.id)
                  }
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
