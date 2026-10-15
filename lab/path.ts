// BFS vs A* sobre el mismo laberinto aleatorio: ambos encuentran el camino más
// corto, pero A* usa una heurística (distancia Manhattan) para explorar mucho menos.
import { C, MONO, SANS, card, esc, heading, num, panel, pct, stamp, svg } from './lib.ts';

const W = 800;
const COLS = 35;
const ROWS = 23;
const CELL = 10;
type P = [number, number];

function maze(rand: () => number): boolean[][] {
  const wall = Array.from({ length: ROWS }, () => Array<boolean>(COLS).fill(true));
  // DFS aleatorio (backtracking) → laberinto perfecto
  const stack: P[] = [[1, 1]];
  wall[1][1] = false;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const next = ([[2, 0], [-2, 0], [0, 2], [0, -2]] as P[])
      .map(([dx, dy]): P => [x + dx, y + dy])
      .filter(([nx, ny]) => nx > 0 && ny > 0 && nx < COLS - 1 && ny < ROWS - 1 && wall[ny][nx]);
    if (!next.length) {
      stack.pop();
      continue;
    }
    const [nx, ny] = next[Math.floor(rand() * next.length)];
    wall[(y + ny) / 2][(x + nx) / 2] = false;
    wall[ny][nx] = false;
    stack.push([nx, ny]);
  }
  // abrir algunos muros extra para crear ciclos y caminos alternativos
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (wall[y][x] && (x + y) % 2 === 1 && rand() < 0.3) wall[y][x] = false;
    }
  }
  return wall;
}

const neighbors = ([x, y]: P, wall: boolean[][]): P[] =>
  ([[1, 0], [0, 1], [-1, 0], [0, -1]] as P[])
    .map(([dx, dy]): P => [x + dx, y + dy])
    .filter(([nx, ny]) => !wall[ny]?.[nx]);

const key = ([x, y]: P): number => y * COLS + x;

function trace(parent: Map<number, P>, goal: P): P[] {
  const path: P[] = [goal];
  for (let p = parent.get(key(goal)); p; p = parent.get(key(p))) path.unshift(p);
  return path;
}

function bfs(wall: boolean[][], start: P, goal: P): { order: P[]; path: P[] } {
  const parent = new Map<number, P>();
  const seen = new Set([key(start)]);
  const queue: P[] = [start];
  const order: P[] = [];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    order.push(cur);
    if (key(cur) === key(goal)) break;
    for (const nb of neighbors(cur, wall)) {
      if (seen.has(key(nb))) continue;
      seen.add(key(nb));
      parent.set(key(nb), cur);
      queue.push(nb);
    }
  }
  return { order, path: trace(parent, goal) };
}

/** Min-heap binario genérico. */
class Heap<T> {
  items: T[] = [];
  less: (a: T, b: T) => boolean;
  constructor(less: (a: T, b: T) => boolean) {
    this.less = less;
  }
  push(x: T): void {
    const a = this.items;
    a.push(x);
    for (let i = a.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): T | undefined {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length && last !== undefined) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function astar(wall: boolean[][], start: P, goal: P): { order: P[]; path: P[] } {
  const h = ([x, y]: P) => Math.abs(x - goal[0]) + Math.abs(y - goal[1]);
  type Node = { p: P; g: number; f: number };
  // desempate: a igual f, preferir el nodo más cercano a la meta (mayor g)
  const open = new Heap<Node>((a, b) => a.f < b.f || (a.f === b.f && a.g > b.g));
  const best = new Map([[key(start), 0]]);
  const parent = new Map<number, P>();
  const closed = new Set<number>();
  const order: P[] = [];
  open.push({ p: start, g: 0, f: h(start) });
  for (let n = open.pop(); n; n = open.pop()) {
    if (closed.has(key(n.p))) continue;
    closed.add(key(n.p));
    order.push(n.p);
    if (key(n.p) === key(goal)) break;
    for (const nb of neighbors(n.p, wall)) {
      const g = n.g + 1;
      if (g >= (best.get(key(nb)) ?? Infinity)) continue;
      best.set(key(nb), g);
      parent.set(key(nb), n.p);
      open.push({ p: nb, g, f: g + h(nb) });
    }
  }
  return { order, path: trace(parent, goal) };
}

function wallsPath(wall: boolean[][]): string {
  let d = '';
  wall.forEach((row, y) => {
    for (let x = 0; x < COLS; x++) {
      if (!row[x]) continue;
      let w = 1;
      while (x + w < COLS && row[x + w]) w++;
      d += `M${x} ${y}h${w}v1h-${w}z`;
      x += w - 1;
    }
  });
  return d;
}

export function pathfinding(rand: () => number, date: Date): { svg: string; summary: string } {
  const wall = maze(rand);
  const start: P = [1, 1];
  const goal: P = [COLS - 2, ROWS - 2];
  const runs = [
    { name: 'BFS', sub: 'búsqueda en anchura', color: C.blue, flash: '#a5d6ff', ...bfs(wall, start, goal) },
    { name: 'A*', sub: 'heurística Manhattan', color: C.purple, flash: '#e2c5ff', ...astar(wall, start, goal) },
  ];

  const most = Math.max(...runs.map((r) => r.order.length));
  const DT = Math.min(0.03, 9 / most);
  const DRAW = 1.1;
  const HOLD = 4;
  const VIS = most * DT + DRAW + HOLD; // cuánto dura visible cada celda
  const T = most * DT + VIS + 0.8;
  const PW = 20 + COLS * CELL;
  const PH = 44 + ROWS * CELL + 14;
  const walls = wallsPath(wall);

  let css = `.p-s{opacity:0;animation:${num(T)}s steps(1,end) infinite}
`;
  let body = '';
  runs.forEach((r, k) => {
    const px = 20 + k * (PW + 20);
    const py = 80;
    const gx = px + 10;
    const gy = py + 44;
    const doneAt = r.order.length * DT;
    const visEnd = pct(VIS, T);
    const fade = pct(VIS + 0.35, T);
    css += `@keyframes p-v${k}{0%{opacity:1;fill:${r.flash}}${pct(0.45, T)}{fill:${r.color}}${visEnd}{opacity:1;fill:${r.color}}${fade}{opacity:0;fill:${r.color}}100%{opacity:0}}
.p-c${k}>path{opacity:0;animation:p-v${k} ${num(T)}s linear infinite}
@keyframes p-run${k}{0%{opacity:1}${pct(doneAt, T)}{opacity:0}100%{opacity:0}}
@keyframes p-done${k}{0%{opacity:0}${pct(doneAt, T)}{opacity:1}${pct(VIS, T)}{opacity:0}100%{opacity:0}}
`;
    body += panel(px, py, PW, PH);
    body += `<text x="${px + 14}" y="${py + 27}" font-family="${SANS}" font-size="15" font-weight="700" fill="${r.color}">${esc(r.name)}<tspan dx="8" font-family="${MONO}" font-size="12" font-weight="400" fill="${C.muted}">${esc(r.sub)}</tspan></text>`;
    body += `<text class="p-s" style="animation-name:p-run${k}" x="${px + PW - 14}" y="${py + 27}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${C.muted}">explorando…</text>`;
    body += `<text class="p-s" style="animation-name:p-done${k}" x="${px + PW - 14}" y="${py + 27}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${C.text}">${r.order.length} celdas · camino ${r.path.length - 1}</text>`;

    let cells = '';
    r.order.forEach(([x, y], i) => {
      cells += `<path d="M${x} ${y}h1v1h-1z" style="animation-delay:${num(i * DT)}s"/>`;
    });

    // el camino se dibuja (stroke-dashoffset) cuando la búsqueda termina
    const pts = r.path.map(([x, y]) => `${x + 0.5} ${y + 0.5}`).join(' ');
    const len = r.path.length - 1;
    const pathStart = doneAt + 0.15;
    css += `@keyframes p-path${k}{0%{opacity:0;stroke-dashoffset:${len}}${pct(pathStart, T)}{opacity:1;stroke-dashoffset:${len}}${pct(pathStart + DRAW, T)}{stroke-dashoffset:0}${visEnd}{opacity:1;stroke-dashoffset:0}${fade}{opacity:0;stroke-dashoffset:0}100%{opacity:0;stroke-dashoffset:0}}\n`;

    body += `<g transform="translate(${gx} ${gy}) scale(${CELL})">
<rect width="${COLS}" height="${ROWS}" fill="${C.bg}"/>
<g class="p-c${k}">${cells}</g>
<path d="${walls}" fill="#2a313c"/>
<polyline points="${pts}" fill="none" stroke="${C.yellow}" stroke-width=".42" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${len} ${len}" style="opacity:0;animation:p-path${k} ${num(T)}s linear infinite"/>
<rect x="${start[0] + 0.1}" y="${start[1] + 0.1}" width=".8" height=".8" rx=".2" fill="${C.green}"/>
<rect x="${goal[0] + 0.1}" y="${goal[1] + 0.1}" width=".8" height=".8" rx=".2" fill="${C.red}"/>
</g>`;
  });

  const H = 80 + PH + 20;
  const subtitle = `Laberinto aleatorio nuevo cada 6 h · inicio verde, meta roja · ${stamp(date)}`;
  const out = svg(W, H, 'BFS vs A* en un laberinto aleatorio', `<style>${css}</style>\n${card(W, H)}\n${heading('Búsqueda de caminos: BFS vs A*', subtitle)}\n${body}`);
  return { svg: out, summary: runs.map((r) => `${r.name}: ${r.order.length} celdas`).join(', ') };
}
