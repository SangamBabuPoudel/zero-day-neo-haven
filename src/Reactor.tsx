import React from "react";
export function Reactor({
  r,
  now,
  cmd,
}: {
  r: any;
  now: number;
  cmd: (kind: string, extra?: any) => void;
}) {
  const c = r.reactor,
    p = r.me;
  if (!c) return null;
  const active = c.status === "active",
    can = r.phase === "playing" && !p.spectator && !p.travel;
  const atPower = p.location === 1,
    atRemote = [2, 4].includes(p.location),
    field = c.fieldId === p.id;
  const name = (id: string) =>
    r.players.find((x: any) => x.id === id)?.name || "UNASSIGNED";
  return (
    <section
      className={`panel reactor ${active ? "reactor-alert" : "reactor-resolved"}`}
      aria-label="Reactor crisis"
    >
      <div className="reactor-heading">
        <div>
          <div className="eyebrow">COOPERATIVE EMERGENCY / POWER PLANT</div>
          <h3>
            {active
              ? "REACTOR MELTDOWN"
              : c.status === "overload"
                ? "REACTOR OVERLOAD"
                : "REACTOR STABILIZED"}
          </h3>
        </div>
        {active && (
          <strong>{Math.max(0, Math.ceil((c.ends - now) / 1000))}s</strong>
        )}
      </div>
      {active ? (
        <>
          <p>
            One agent operates <b>POWER</b>. Another reads private instructions
            at <b>COMMS</b> or <b>SURVEILLANCE</b>. Communicate the sequence
            through chat. Can you trust it?
          </p>
          <div className="reactor-crew">
            <span>
              FIELD <b>{name(c.fieldId)}</b>
            </span>
            <span>
              INTELLIGENCE <b>{name(c.remoteId)}</b>
            </span>
          </div>
          {c.instructions && (
            <div className="private-intel">
              <div className="eyebrow">PRIVATE / REMOTE EYES ONLY</div>
              <div className="shutdown-sequence">
                {c.instructions.join(" → ")}
              </div>
              <p>
                Tell the field operator these numbers in this order. You cannot
                press their switches.
              </p>
            </div>
          )}
          {can && atRemote && !c.instructions && (
            <button onClick={() => cmd("reactor-access", { crisis: c.id })}>
              ACCESS PRIVATE SHUTDOWN SEQUENCE ↗
            </button>
          )}
          {can && atPower && !field && (
            <button onClick={() => cmd("reactor-access", { crisis: c.id })}>
              TAKE FIELD SWITCH PANEL ↗
            </button>
          )}
          {atPower && field && (
            <div className="reactor-panel">
              <div className="eyebrow">
                FIELD PANEL / ASK YOUR TEAM FOR THE SEQUENCE
              </div>
              <p>
                Inputs: {c.submitted?.join(" → ") || "—"} / {c.entered} of 3. A
                wrong sequence overloads the reactor.
              </p>
              <div className="reactor-switches">
                {[1, 2, 3, 4].map((value) => (
                  <button
                    key={value}
                    disabled={!can || c.entered >= 3}
                    aria-label={`Reactor switch ${value}`}
                    onClick={() =>
                      cmd("reactor-input", {
                        crisis: c.id,
                        index: c.entered,
                        value,
                      })
                    }
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}
          {can && !atPower && !atRemote && (
            <div className="crisis-routes">
              <button onClick={() => cmd("travel", { node: 1 })}>
                GO TO POWER ↗
              </button>
              <button onClick={() => cmd("travel", { node: 4 })}>
                GO TO INTELLIGENCE ↗
              </button>
            </div>
          )}
          {c.overrideEnds ? (
            <p className="gold">
              {name(c.overrideBy)} is holding the emergency override.{" "}
              {Math.max(0, Math.ceil((c.overrideEnds - now) / 1000))}s left.
              Leaving cancels it.
            </p>
          ) : (
            can &&
            atPower && (
              <button
                className="override-button"
                disabled={c.ends - now <= 10000}
                onClick={() => cmd("reactor-override", { crisis: c.id })}
              >
                SOLO OVERRIDE / HOLD 10s / COST 8 CORE
              </button>
            )
          )}
          <small>
            No partner? Reach Power and start the costly override with more than
            10 seconds remaining.
          </small>
        </>
      ) : (
        <p>
          {c.status === "overload"
            ? "Integrity −12. Infection launched. Review the recorded switch inputs; the system cannot know what was said in voice chat."
            : c.status === "override"
              ? "Emergency bypass complete. Power is clean; eight integrity spent."
              : "Shutdown confirmed. Power is clean and Core recovered four integrity. Well coordinated."}
        </p>
      )}
    </section>
  );
}
export function Evidence({ r }: { r: any }) {
  const e = r.me.evidence;
  if (!e) return null;
  return (
    <section className="panel evidence">
      <div className="eyebrow">YOUR FORENSIC SNAPSHOT / PRIVATE</div>
      <h3>{r.nodes[e.node]?.name}</h3>
      <p>
        Last 90 seconds before your scan.{" "}
        {r.nodes[4]?.infected
          ? "Surveillance degraded: only four records recovered."
          : "Up to twelve recorded events."}{" "}
        Records show access and inputs, not intent.
      </p>
      <ol>
        {e.entries.map((v: any, i: number) => (
          <li key={i}>
            <time>
              {Math.max(0, Math.floor((e.capturedAt - v.at) / 1000))}s before
              scan
            </time>
            <b>{v.player}</b>
            <span>{v.kind}</span>
          </li>
        ))}
      </ol>
      {!e.entries.length && <p>No recorded activity in this window.</p>}
    </section>
  );
}
export function HowToPlay() {
  return (
    <details className="panel how-to">
      <summary>HOW TO PLAY / A 30-SECOND BRIEF</summary>
      <ol>
        <li>
          <b>Move.</b> Select a district. Everyone sees your callsign,
          destination and working status. Exact terminal actions stay private.
        </li>
        <li>
          <b>Respond together.</b> During a reactor crisis, one agent goes to
          Power and another to a clean Comms or Surveillance terminal. The
          remote agent reads the private sequence aloud or in chat; the field
          agent presses the four numbered switches.
        </li>
        <li>
          <b>Decide whom to trust.</b> The Mole can lie about instructions or
          enter wrong switches. No partner? Hold the 10-second solo override at
          Power for eight Core integrity.
        </li>
        <li>
          <b>Use your specialty.</b> Everyone repairs. Patcher repairs faster,
          Firewall shields attacks, and Sniffer reviews recorded visitors and
          terminal operations.
        </li>
        <li>
          <b>Investigate and accuse.</b> Watch where agents go. Compare real
          evidence in chat. Meetings pause threats; a majority catching the Mole
          wins. A wrong accusation costs 20 integrity.
        </li>
        <li>
          <b>Protect the Core.</b> Survive the five-minute uplink lockdown, then
          keep the city clean for 12 seconds before the six-minute deadline. The
          Mole wins if the Core collapses or time expires.
        </li>
      </ol>
    </details>
  );
}
