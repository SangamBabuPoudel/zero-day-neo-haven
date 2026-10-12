# Verification — October 12, 2026

## Original repository audit

Preserved the React 19 / TypeScript / Vite frontend and Express 5 / Socket.IO backend. The original source included a 20-node network, room creation/joining, one private Mole, specialist actions, infection ticks, meetings/voting, reconnect tokens, replay, boot and reveal UI, Web Audio, nine engine tests and one socket integration test. Render configuration was already present. There was no Git repository; checkpoint `7315b6a` preserves the original implementation plus expanded ignore rules. No secret files were found among the tracked source.

Baseline `npm ci --offline` and `npm run build` succeeded. All nine original engine tests passed. The original socket test could not start its server under sandbox restrictions (`listen EPERM`); this was a runtime permission limitation, not a verified baseline gameplay result.

## Implemented

Six-location SVG city, shared road routing, authoritative travel and arrivals, client interpolation, location-gated terminal tasks, specialist abilities, basic repair for all, private cover roles, delayed corruption with cooldown and indirect evidence, recorded access-history scans, six district consequences, incoming threat packets, room chat, paused meetings with stable voter eligibility, late spectators, private credential reconnect, replay/reveal, mobile layouts and mute control.

## Automated coverage

Engine tests cover role/hidden-state secrecy, road routing, movement bounds and arrival, remote-action rejection, task IDs/order/cells/minimum duration, corruption delay and evidence, cooldowns, repair cancellation of corruption, shield interaction, district effects, threat information loss, strict majority/reveal, meeting timer pause, disconnect voting, victory/deadline, spectator restrictions, chat rate limits and room isolation.

The live Socket.IO test drives independent clients through creation/join, host restrictions, hidden assignments, travel seen by other clients, a complete repair task, chat isolation, spectator restrictions, meeting chat, voting, role reveal, replay and reconnect with private credentials. It also checks the production page and health endpoint.

## Cooperative crisis coverage

The additional engine tests cover field/remote information separation, authorized terminal access, readers being barred from field switches, correct and incorrect sequences, duplicate and expired input rejection, timeout, costly solo override, interrupted override, paused crisis timers, discussion-period vote gating, disconnected remote handoff, room isolation, spectator restrictions and replay during an unresolved crisis.

A full-round simulation verifies that two defenders can stabilize the city with each possible missing specialist when the third player refuses all cooperation. This demonstrates an achievable survival path, not human balance or fun.

The second live Socket.IO integration test drives correct and incorrect reactor outcomes in successive rounds. It verifies that the field and third player receive no private instruction field, that reconnect preserves the remote player's identity and authorization, that all clients see the same outcome, and that a subsequent Sniffer scan retrieves the actual switch submissions.

## Final results

- `npm run build`: passed TypeScript checking and production Vite build.
- `npm test`: 28 passed, zero failures, including two live multi-client integration tests.
- Three independent desktop Chrome contexts: passed room creation/join/start, public movement, location-based repair, private reactor instructions, chat coordination, correct field switches, synchronized stabilization, discussion/voting, victory reveal and replay; no page errors.
- A 390px mobile viewport: no horizontal page overflow; district controls and terminal actions inspected visually; chat and meeting voting exercised in the browser flow.
- Desktop reactor-field, private-intelligence, mobile, meeting and victory screenshots were captured and visually inspected where noted in the work session. Browser QA used local Chrome, not physical phones.

The final cleanup includes fixing connection-listener initialization, allowing bounded rapid command bursts, clearing gameplay state when replaying from an active crisis, and placing chat beside active reactor controls.

The repeatable browser flow is `scripts/browser-smoke.mjs`. It requires Chrome and Playwright; Playwright is optional test tooling and is not a production dependency. Set `GAME_URL` to an already-running game server. Set `PLAYWRIGHT_MODULE` to an installed Playwright module URL if it is outside this checkout. Screenshots default to the ignored `test-results/browser/` directory. Example with the temporary runner installed during this session:

```sh
GAME_URL=http://127.0.0.1:3202 \
PLAYWRIGHT_MODULE=file:///private/tmp/zero-day-browser/node_modules/playwright/index.mjs \
node scripts/browser-smoke.mjs
```

## Outstanding verification

Public deployment and real-device internet gameplay have not been performed. Human balance, deception quality and enjoyment are unverified. No claim of competition eligibility or completed submission is made.
