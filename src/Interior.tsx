import React from "react";
import { buildings } from "../shared/city";
export function Interior({
  r,
  selected,
  now,
  cmd,
}: {
  r: any;
  selected: number;
  now: number;
  cmd: (kind: string, extra?: any) => void;
}) {
  const b = buildings[selected],
    p = r.me,
    t = p.task;
  const ready =
    r.phase === "playing" &&
    !p.spectator &&
    !p.travel &&
    p.location === selected;
  const cooldown = Math.max(0, Math.ceil((p.next - now) / 1000));
  const task = t && t.node === selected && t.expires > now ? t : null;
  return (
    <section className={`panel actions interior interior-${selected}`}>
      <div className="eyebrow">
        {ready ? "INTERIOR / CONNECTED" : "DISTRICT TERMINAL"}
      </div>
      <h3>{b.name}</h3>
      <p>{b.effect}</p>
      <div className="interior-art" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} style={{ height: `${25 + ((i * 23) % 55)}px` }} />
        ))}
      </div>
      <p className={r.nodes[selected]?.infected ? "red" : ""}>
        {r.nodes[selected]?.infected ? "⚠ INFECTED" : "◇ SYSTEM HEALTHY"}
        {r.nodes[selected]?.shield > now ? " / SHIELDED" : ""}
      </p>
      {!ready && (
        <p className="travel-notice">
          {p.spectator
            ? "SPECTATOR / Observe this operation"
            : p.travel
              ? `IN TRANSIT / ${Math.max(0, Math.ceil((p.travel.arrives - now) / 1000))}s to arrival`
              : "Select this building on the map to travel."}
        </p>
      )}
      {task && ready ? (
        <div className="mini-task">
          <div className="eyebrow">
            {task.mode === "circuit"
              ? "RECONNECT CIRCUIT"
              : "ISOLATE CORRUPTED DATA"}
          </div>
          <p>
            {task.mode === "circuit"
              ? `Connect ports in order: ${task.sequence.map((v: number) => v + 1).join(" → ")}`
              : "Quarantine all three red blocks. Leave healthy data intact."}
          </p>
          <div className="task-cells">
            {Array.from({ length: 6 }, (_, cell) => (
              <button
                key={cell}
                className={`${task.mode === "isolate" && task.sequence.includes(cell) ? "bad-cell" : ""} ${task.done.includes(cell) ? "done-cell" : ""}`}
                disabled={task.done.includes(cell)}
                onClick={() => cmd("step", { task: task.id, cell })}
                aria-label={`Block ${cell + 1}${task.mode === "isolate" && task.sequence.includes(cell) ? " corrupted" : ""}`}
              >
                {task.done.includes(cell)
                  ? "✓"
                  : String(cell + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
          <button
            className="primary"
            disabled={task.done.length !== 3 || now - task.started < 1200}
            onClick={() => cmd(task.kind, { node: selected })}
          >
            COMMIT{" "}
            {task.kind === "sabotage" ? "CORRUPTION" : task.kind.toUpperCase()}{" "}
            →
          </button>
          <p>
            {Math.max(0, Math.ceil((task.expires - now) / 1000))}s terminal
            session remaining
          </p>
        </div>
      ) : (
        <>
          <button
            className="primary"
            disabled={!ready || cooldown > 0}
            onClick={() => cmd("begin", { ability: "repair", node: selected })}
          >
            REPAIR SYSTEM <span>{cooldown ? `${cooldown}s` : "↗"}</span>
          </button>
          {p.role !== "PATCHER" && !p.spectator && (
            <button
              disabled={!ready || cooldown > 0}
              onClick={() =>
                cmd("begin", {
                  ability: p.role === "FIREWALL" ? "shield" : "scan",
                  node: selected,
                })
              }
            >
              {p.role === "FIREWALL" ? "DEPLOY SHIELD" : "AUDIT ACCESS HISTORY"}
            </button>
          )}
          {p.mole && (
            <button
              className="danger"
              disabled={!ready || cooldown > 0 || p.corruptNext > now}
              onClick={() =>
                cmd("begin", { ability: "sabotage", node: selected })
              }
            >
              CORRUPT{" "}
              {p.corruptNext > now
                ? `${Math.ceil((p.corruptNext - now) / 1000)}s`
                : " / COVERT"}
            </button>
          )}
        </>
      )}
      {p.scan && <p className="scan-result">{p.scan}</p>}
      <button
        className="meeting-button"
        disabled={r.phase !== "playing" || p.spectator || p.meetingNext > now}
        onClick={() => cmd("meeting")}
      >
        ⚠ EMERGENCY MEETING{" "}
        {p.meetingNext > now
          ? `${Math.ceil((p.meetingNext - now) / 1000)}s`
          : ""}
      </button>
    </section>
  );
}
export function Chat({
  r,
  cmd,
}: {
  r: any;
  cmd: (kind: string, extra?: any) => void;
}) {
  const [message, setMessage] = React.useState("");
  return (
    <section className="panel chat">
      <div className="eyebrow">ENCRYPTED TEAM COMMS</div>
      <div className="messages" role="log" aria-label="Room chat">
        {r.chat.length ? (
          r.chat.slice(-12).map((m: any, i: number) => (
            <p key={i}>
              <b>{m.name}</b> {m.text}
            </p>
          ))
        ) : (
          <p>
            Who was near that building before it failed? Share evidence here.
          </p>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) {
            cmd("chat", { text: message });
            setMessage("");
          }
        }}
      >
        <input
          aria-label="Message your team"
          maxLength={220}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Transmit to team…"
          disabled={r.me.spectator && r.phase !== "lobby"}
        />
        <button type="submit" disabled={!message.trim()}>
          SEND ↗
        </button>
      </form>
    </section>
  );
}
