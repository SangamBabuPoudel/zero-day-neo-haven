# ZERO DAY — Mole in the Mainframe

Real-time 3–8 player social deduction game. React / TypeScript / Vite / Tailwind / Express / Socket.IO. Fictional cybersecurity mechanics only.

## Local play

Node 22 or newer.

```
npm ci
npm run build
npm start
```

Open http://localhost:3000. Open three independent tabs (each tab has its own session), create a room and join with its code. Development: run `npm run dev` and `npm run client` in two terminals; open Vite's URL. `npm test` runs authoritative-engine and live Socket.IO integration checks.

## Deploy today on Render

1. Extract this project, create a GitHub repository, and push the source (exclude node_modules).
2. In Render, create a Blueprint from that repository; `render.yaml` creates one Node web service. Alternatively create a Web Service: build `npm ci && npm run build`, start `npm start`, health endpoint `/health`, Node 22.
3. Use a paid always-on instance for the competition to avoid cold starts. Hosting costs are your responsibility.
4. Render supplies PORT automatically. No secrets, database, or external API required. The service serves frontend and Socket.IO on one origin.
5. Share the resulting HTTPS URL with three people on different devices; create one room, join it, start, confirm changing nodes match, complete a vote, and replay. This real-device public smoke test remains required until actually performed.

## Rules

Exactly one private Mole; role repeats Patcher/Firewall/Sniffer. Any player can repair (Patcher 3.5s, others 6.5s). Firewall shields 18s with 9s cooldown; Sniffer scans with 4.5s cooldown. Mole sabotage infects an unshielded node with 18s cooldown. All abilities share one cooldown per player. Scans report node state, never player allegiance. Sabotage is generic in the public event stream.
Every 7 seconds infection reaches up to two neighboring unshielded nodes and damages core. Clear every node and hold clean for 12 seconds to win. Catch the Mole by a strict majority to win. Wrong majority costs 20 integrity, no innocent is expelled. Skips/ties resume without a penalty. Meetings last up to 20 seconds, pause infection and mission time; each operator can call one per 60 seconds. Mainframe collapse or four-minute deadline gives Mole victory. Discuss using an external voice call; no built-in chat. Host controls start/replay.

## Limitations

In-memory rooms disappear on restart/deploy. Run exactly ONE instance: multiple instances need a shared store/adapter and persistent game coordination. Disconnects retain private reconnect tokens in sessionStorage for 10 minutes when everyone leaves; host transfers to a connected operator. A disconnected Mole remains assigned and can reconnect. No accounts, persistent statistics, or chat. Event feed displays claims as game events, not evidence of allegiance. Balance is initial tuning and needs human playtesting. Client clocks are corrected against server snapshots; the server decides all outcomes. Tokens are bearer credentials: do not share them. Basic packet throttling and payload limits are included; production abuse protection is limited. Competition eligibility and rules have not been independently verified.
