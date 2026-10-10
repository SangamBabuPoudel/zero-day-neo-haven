export const buildings = [
  {
    id: 0,
    name: "DATA CENTER",
    x: 200,
    y: 215,
    detail: "ARCHIVE / 01",
    effect: "Infection doubles Core damage.",
    color: "#69dfff",
  },
  {
    id: 1,
    name: "POWER PLANT",
    x: 570,
    y: 185,
    detail: "ENERGY / 02",
    effect: "Infection accelerates incoming attacks.",
    color: "#ffd17c",
  },
  {
    id: 2,
    name: "COMMS TOWER",
    x: 745,
    y: 370,
    detail: "UPLINK / 03",
    effect: "Infection obscures threat destinations.",
    color: "#c09aff",
  },
  {
    id: 3,
    name: "SECURITY HQ",
    x: 555,
    y: 575,
    detail: "DEFENSE / 04",
    effect: "Infection halves shield duration.",
    color: "#6bf0c7",
  },
  {
    id: 4,
    name: "SURVEILLANCE HUB",
    x: 190,
    y: 545,
    detail: "INTEL / 05",
    effect: "Infection shortens attack warnings.",
    color: "#90b4ff",
  },
  {
    id: 5,
    name: "MAINFRAME CORE",
    x: 435,
    y: 365,
    detail: "NEO-HAVEN / 00",
    effect: "Infection directly increases integrity damage.",
    color: "#e6faff",
  },
];
export const edges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 0],
  [0, 5],
  [1, 5],
  [2, 5],
  [3, 5],
  [4, 5],
];
export function route(from: number, to: number): number[] {
  const costs = buildings.map(() => Infinity),
    paths: number[][] = buildings.map(() => []),
    visited = new Set<number>();
  costs[from] = 0;
  paths[from] = [from];
  while (visited.size < buildings.length) {
    const a = costs.reduce(
      (best, c, i) =>
        !visited.has(i) && (best < 0 || c < costs[best]) ? i : best,
      -1,
    );
    if (a < 0 || a === to) break;
    visited.add(a);
    for (const edge of edges) {
      if (!edge.includes(a)) continue;
      const b = edge[0] === a ? edge[1] : edge[0];
      const d = Math.hypot(
        buildings[a].x - buildings[b].x,
        buildings[a].y - buildings[b].y,
      );
      if (costs[a] + d < costs[b]) {
        costs[b] = costs[a] + d;
        paths[b] = [...paths[a], b];
      }
    }
  }
  return paths[to];
}
export function routeLength(path: number[]) {
  return path
    .slice(1)
    .reduce(
      (sum, b, i) =>
        sum +
        Math.hypot(
          buildings[path[i]].x - buildings[b].x,
          buildings[path[i]].y - buildings[b].y,
        ),
      0,
    );
}
export function position(path: number[], fraction: number) {
  if (fraction <= 0) return buildings[path[0]];
  if (fraction >= 1) return buildings[path[path.length - 1]];
  let distance = routeLength(path) * Math.max(0, Math.min(1, fraction));
  for (let i = 1; i < path.length; i++) {
    const a = buildings[path[i - 1]],
      b = buildings[path[i]],
      length = Math.hypot(a.x - b.x, a.y - b.y);
    if (distance <= length)
      return {
        x: a.x + ((b.x - a.x) * distance) / length,
        y: a.y + ((b.y - a.y) * distance) / length,
      };
    distance -= length;
  }
  return buildings[path[path.length - 1]];
}
