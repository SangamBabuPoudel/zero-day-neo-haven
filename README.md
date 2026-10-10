# ZERO DAY — Mole in the Mainframe

**TRUST NO ONE. PATCH EVERYTHING.** A real-time, 3–8 player social-deduction game set in NEO-HAVEN. React / TypeScript / Vite / Express / Socket.IO. All cyber mechanics are fictional game rules.

## Run locally

Node 22 or newer. From this directory:

```sh
npm ci
npm run build
npm start
```

Open http://localhost:3000 in three independent browser tabs or contexts. Create an operation and share its code. Session credentials are kept in sessionStorage; duplicate-tab session copies may require a fresh tab. Development: `npm run dev` and `npm run client` in separate terminals, then use Vite's URL. `npm test` runs engine and live multiplayer tests; the latter starts a local server on port 3199 and requires local listening permission.

## How to play

1. Select a building to travel along the glowing roads (2–5 seconds). All agents start at the Core. Actions require server-confirmed arrival.
2. Use the building terminal: reconnect three circuit ports in order, or isolate three corrupted data blocks. Commit your operation. Every defender can repair; Patcher repairs faster and restores more integrity.
3. Firewall deploys shields; Sniffer audits the last 90 seconds of recorded visits and operations. Share evidence in room chat.
4. Red packets warn of incoming infections. Power infection accelerates attacks; Data doubles pulse damage; Core increases damage; Comms hides threat destinations; Surveillance shortens warnings; Security halves shield duration.
5. Exactly one operator is secretly the Mole, with a normal specialist cover. CORRUPT makes a building look healthy, then triggers a failure 10 seconds later. Repair can clear it; a shield can block it. Corruption has a separate 30-second cooldown. Service logs do not identify which action was corruption: compare who visited before a failure.
6. Emergency meetings pause city timers for up to 35 seconds. Use chat and vote. A strict majority identifying the Mole wins; an innocent majority costs 20 Core integrity. Ties and skips resume play. Each caller has a 90-second meeting cooldown.
7. Defenders can also win by holding until the uplink seals at five minutes, then maintaining a clean city for 12 seconds. Core collapse or the six-minute deadline gives the Mole victory. Meetings extend the round. A decisive vote can end a round early. Host can replay after the full role reveal.

Late joiners observe as spectators (up to eight total room members); they cannot act, vote or send round chat. They join the next round. Reconnect uses private random credentials, never callsigns. Duplicate callsigns within a room are rejected to keep evidence legible.

## Production deployment

The existing `render.yaml` configures one Node web service, with a production build and `/health` check. Push **this directory** as the repository root and select the Blueprint in Render. If you place it inside a larger repository, set the service root directory to `zero-day`. Equivalent Node hosts can run:

- Build: `npm ci && npm run build`
- Start: `npm start`
- Health check: `/health`
- Node: 22+, host supplies `PORT`

The server serves the production frontend and Socket.IO from the same origin. No application secrets or external APIs are required. No public deployment has been performed by this task. After deployment, test three independent devices on the actual HTTPS URL, including chat, movement, terminal tasks, voting, reconnect, and replay.

## Architecture and limits

- `shared/city.ts`: six districts, road graph, shortest paths and visual interpolation.
- `server/game.ts`: authoritative game state, private views, travel, tasks, infection, evidence, meetings and victory.
- `server/index.ts`: room/session lifecycle, Socket.IO commands, static hosting and periodic ticks.
- `src/City.tsx`: layered SVG architecture, roads, packets and visible agents.
- `src/Interior.tsx`: reusable terminal tasks and team chat.
- `src/main.tsx`, `src/style.css`: lobby, boot sequence, round interface, reveal, audio and responsive styling.

Run exactly **one server instance**. Rooms, chat and bearer credentials live in memory and disappear on restart. Empty rooms expire after ten minutes. A disconnected player remains in a running round and can reconnect; host transfers to another connected operator. Meetings keep their original voter set so disconnects cannot lower the majority threshold. The map hides specialist roles and allegiance until the reveal; each player's own assignment and audit results are private.

This build has bounded messages, basic command throttling and server validation, but no account system or durable multiplayer state. Three-to-eight-player balance needs real human playtesting. Automated gameplay checks are described in `VERIFICATION.md`.
