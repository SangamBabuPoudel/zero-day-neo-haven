import React from "react";
import { buildings, edges, position } from "../shared/city";
const colors = [
  "#69dfff",
  "#ffd17c",
  "#c09aff",
  "#6bf0c7",
  "#90b4ff",
  "#ff91bb",
  "#edfeac",
  "#ffffff",
];
function Structure({ id }: { id: number }) {
  return (
    <g className="structure">
      <path className="foundation" d="M-63 12 L0 -18 L68 12 L5 48 Z" />
      {id === 0 && (
        <>
          {[-35, -3, 29].map((x, i) => (
            <g key={x} transform={`translate(${x} ${i * 5})`}>
              <path d="M-14 0 V-72 L6 -82 L22 -72 V0 L2 10Z" />
              <path className="roof" d="M-14 -72 L6 -82 L22 -72 L2 -62Z" />
              {[0, 1, 2, 3].map((y) => (
                <path
                  key={y}
                  className="light"
                  d={`M-8 ${-55 + y * 14} l10 5 m4 -1 l10 -5`}
                />
              ))}
            </g>
          ))}
        </>
      )}
      {id === 1 && (
        <>
          <path d="M-49 5 L-42 -40 L-14 -40 L-6 5Z M12 12 L18 -58 L47 -58 L57 12Z" />
          <ellipse className="roof" cx="-28" cy="-40" rx="14" ry="7" />
          <ellipse className="roof" cx="33" cy="-58" rx="15" ry="8" />
          <path
            className="light"
            d="M-29 -27 l-7 17 h13 l-9 17 M34 -42 l-8 18 h14 l-9 19"
          />
          <path
            className="steam"
            d="M-28 -49 Q-42 -64 -25 -79 T-24 -107 M33 -68 Q47 -88 32 -99 T35 -130"
          />
        </>
      )}
      {id === 2 && (
        <>
          <path d="M-28 10 L0 -116 L30 10 M-19 -22 H21 M-12 -52 H13 M-8 -81 H8" />
          <path className="roof" d="M-35 -85 Q0 -49 35 -98 L0 -77Z" />
          <path className="light" d="M0 -77 l19 -32" />
          <circle className="beacon" cx="0" cy="-116" r="4" />
          <path
            className="radio"
            d="M-24 -114 Q0 -145 25 -114 M-36 -124 Q0 -166 38 -124"
          />
        </>
      )}
      {id === 3 && (
        <>
          <path d="M-53 7 V-48 L0 -75 L53 -48 V7 L0 34Z" />
          <path className="roof" d="M-53 -48 L0 -75 L53 -48 L0 -22Z" />
          <path
            className="light"
            d="M0 -17 l19 -8 v20 l-19 20 l-19 -20 v-20Z"
          />
          <path d="M-42 -10 V-31 M-32 -5 V-26 M32 -5 V-26 M42 -10 V-31" />
        </>
      )}
      {id === 4 && (
        <>
          <path d="M-52 6 V-34 L0 -58 L52 -34 V6 L0 30Z" />
          <path className="roof" d="M-52 -34 L0 -58 L52 -34 L0 -10Z" />
          <path d="M-23 -48 V-79 M23 -48 V-89" />
          <path
            className="light"
            d="M-40 -83 h28 v13 h-28Z M11 -93 h29 v13 H11Z"
          />
          <path
            className="radar"
            d="M-40 -76 l-45 30 l45 -10Z M40 -86 l43 26 l-43 -5Z"
          />
          <path className="light" d="M-33 0 l17 8 M16 8 l18 -8" />
        </>
      )}
      {id === 5 && (
        <>
          <path d="M-38 9 V-103 L0 -124 L38 -103 V9 L0 32Z" />
          <path className="roof" d="M-38 -103 L0 -124 L38 -103 L0 -82Z" />
          <path d="M-19 -115 V-154 L0 -165 L19 -154 V-115" />
          <path
            className="light"
            d="M0 -165 V-192 M0 -80 V20 M-25 -89 V0 M25 -89 V0"
          />
          <circle className="beacon" cx="0" cy="-194" r="5" />
          {[-60, -40, -20].map((y) => (
            <path
              className="light"
              key={y}
              d={`M-32 ${y} L0 ${y + 18} L32 ${y}`}
            />
          ))}
        </>
      )}
    </g>
  );
}
export function City({
  room,
  now,
  selected,
  onSelect,
}: {
  room?: any;
  now: number;
  selected?: number;
  onSelect?: (id: number) => void;
}) {
  const paused = room?.phase === "meeting";
  return (
    <svg
      className="city"
      viewBox="0 0 930 700"
      aria-label="NEO-HAVEN city. Select a district to travel."
    >
      <defs>
        <pattern
          id="city-grid"
          width="44"
          height="22"
          patternUnits="userSpaceOnUse"
          patternTransform="skewY(-26)"
        >
          <path d="M44 0H0V22" fill="none" stroke="#173747" strokeWidth=".6" />
        </pattern>
        <radialGradient id="city-glow">
          <stop stopColor="#17475b" stopOpacity=".65" />
          <stop offset="1" stopColor="#060d18" />
        </radialGradient>
      </defs>
      <rect width="930" height="700" fill="url(#city-glow)" />
      <rect width="930" height="700" fill="url(#city-grid)" />
      <text className="city-title" x="35" y="42">
        NEO–HAVEN
      </text>
      <text className="city-caption" x="36" y="62">
        SECTOR 07 / CIVILIAN NETWORK
      </text>
      {Array.from({ length: 22 }, (_, i) => {
        const x = 50 + ((i * 137) % 810),
          y = 120 + ((i * 193) % 480);
        return (
          <g key={i} opacity=".2" transform={`translate(${x} ${y})`}>
            <path
              d="M-16 0 V-25 L0 -33 L16 -25 V0 L0 8Z"
              fill="#163548"
              stroke="#43647d"
            />
            <path d="M0 -22 V3" stroke="#87b6d8" />
          </g>
        );
      })}
      {edges.map(([a, b], i) => (
        <g key={i}>
          <path
            className="road-bed"
            d={`M${buildings[a].x} ${buildings[a].y} L${buildings[b].x} ${buildings[b].y}`}
          />
          <path
            className={`road ${room?.nodes[a]?.infected || room?.nodes[b]?.infected ? "road-danger" : ""}`}
            d={`M${buildings[a].x} ${buildings[a].y} L${buildings[b].x} ${buildings[b].y}`}
          />
        </g>
      ))}
      {(room?.threats || []).map((t: any, i: number) => {
        const p = position(
          [t.from, t.to],
          (now - t.started) / (t.arrives - t.started),
        );
        return (
          <g key={i}>
            <circle className="packet" cx={p.x} cy={p.y} r="6" />
            <circle
              className="threat-ring"
              cx={buildings[t.to].x}
              cy={buildings[t.to].y}
              r="67"
            />
            <text
              className="threat-label"
              x={buildings[t.to].x}
              y={buildings[t.to].y + 84}
              textAnchor="middle"
            >
              BREACH IN {Math.max(0, Math.ceil((t.arrives - now) / 1000))}s
            </text>
          </g>
        );
      })}
      {buildings.map((b) => {
        const n = room?.nodes[b.id];
        return (
          <g
            key={b.id}
            transform={`translate(${b.x} ${b.y})`}
            className={`district ${n?.infected ? "compromised" : ""} ${selected === b.id ? "chosen" : ""} ${n?.shield > now ? "protected" : ""}`}
            style={{ "--district": b.color } as React.CSSProperties}
            tabIndex={onSelect ? 0 : undefined}
            role={onSelect ? "button" : undefined}
            aria-label={`${b.name}. ${n?.infected ? "Infected" : "Secure"}. ${b.effect}`}
            onClick={() => onSelect?.(b.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(b.id);
              }
            }}
          >
            <ellipse className="district-ring" cx="0" cy="12" rx="74" ry="40" />
            <Structure id={b.id} />
            <text className="district-name" x="0" y="61" textAnchor="middle">
              {b.name}
            </text>
            <text className="district-meta" x="0" y="77" textAnchor="middle">
              {n?.infected
                ? "⚠ COMPROMISED"
                : n?.shield > now
                  ? "◇ SHIELDED"
                  : b.detail}
            </text>
          </g>
        );
      })}
      {room?.players
        .filter((p: any) => !p.spectator)
        .map((p: any, i: number) => {
          const pos = p.travel
            ? position(
                p.travel.path,
                (now - p.travel.started) /
                  (p.travel.arrives - p.travel.started),
              )
            : buildings[p.location];
          const offset = ((i % 3) - 1) * 25;
          return (
            <g
              key={p.id}
              className={`agent ${p.id === room.me.id ? "own-agent" : ""} ${p.travel && !paused ? "walking" : ""}`}
              transform={`translate(${pos.x + offset} ${pos.y + 21 + Math.floor(i / 3) * 16})`}
              opacity={p.connected ? 1 : 0.35}
            >
              <ellipse cx="0" cy="10" rx="10" ry="4" fill="#000" />
              <path
                d="M-6 8 V-3 Q0 -9 6 -3 V8 M-3 8 v6 M3 8 v6"
                fill={colors[i % 8]}
                stroke={colors[i % 8]}
                strokeWidth="3"
              />
              <circle cx="0" cy="-11" r="5" style={{ fill: colors[i % 8] }} />
              <path d="M-4 -11 h8" stroke="#0a1b25" strokeWidth="3" />
              <text className="agent-name" x="0" y="-27" textAnchor="middle">
                {p.name}
                {p.id === room.me.id ? " / YOU" : ""}
              </text>
            </g>
          );
        })}
      <text className="city-caption" x="35" y="669">
        {room?.intelOffline
          ? "⚠ COMMS OFFLINE — THREAT INTELLIGENCE LOST"
          : "CITY LINK ACTIVE / SELECT A BUILDING TO DEPLOY"}
      </text>
    </svg>
  );
}
