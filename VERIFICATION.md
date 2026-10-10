# Verification — October 9, 2026

## Original repository audit

Preserved the React 19 / TypeScript / Vite frontend and Express 5 / Socket.IO backend. The original source included a 20-node network, room creation/joining, one private Mole, specialist actions, infection ticks, meetings/voting, reconnect tokens, replay, boot and reveal UI, Web Audio, nine engine tests and one socket integration test. Render configuration was already present. There was no Git repository; checkpoint `7315b6a` preserves the original implementation plus expanded ignore rules. No secret files were found among the tracked source.

Baseline `npm ci --offline` and `npm run build` succeeded. All nine original engine tests passed. The original socket test could not start its server under sandbox restrictions (`listen EPERM`); this was a runtime permission limitation, not a verified baseline gameplay result.

## Implemented

Six-location SVG city, shared road routing, authoritative travel and arrivals, client interpolation, location-gated terminal tasks, specialist abilities, basic repair for all, private cover roles, delayed corruption with cooldown and indirect evidence, recorded access-history scans, six district consequences, incoming threat packets, room chat, paused meetings with stable voter eligibility, late spectators, private credential reconnect, replay/reveal, mobile layouts and mute control.

## Automated coverage

Engine tests cover role/hidden-state secrecy, road routing, movement bounds and arrival, remote-action rejection, task IDs/order/cells/minimum duration, corruption delay and evidence, cooldowns, repair cancellation of corruption, shield interaction, district effects, threat information loss, strict majority/reveal, meeting timer pause, disconnect voting, victory/deadline, spectator restrictions, chat rate limits and room isolation.

The live Socket.IO test drives independent clients through creation/join, host restrictions, hidden assignments, travel seen by other clients, a complete repair task, chat isolation, spectator restrictions, meeting chat, voting, role reveal, replay and reconnect with private credentials. It also checks the production page and health endpoint.

## Outstanding verification

Public deployment and real-device internet gameplay have not been performed. Human balance, deception quality and enjoyment are unverified. No claim of competition eligibility or completed submission is made.
