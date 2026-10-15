// Carrera de ordenamiento: 4 algoritmos ordenan el MISMO arreglo aleatorio.
// El tiempo avanza 1 tick por comparación, así que la animación es una
// medida honesta del trabajo que hace cada algoritmo.
import { C, MONO, SANS, card, esc, heading, num, panel, pct, ramp, shuffle, stamp, svg } from './lib.ts';

type Move = { t: number; pos: number };
type Mark = { t: number; i: number; j: number };

/** Registra comparaciones y movimientos para poder animarlos después. */
class Tracker {
  t = 0;
  vals: number[];
  arr: number[]; // arr[pos] = id de la barra
  moves: Move[][];
  marks: Mark[] = [];

  constructor(vals: number[]) {
    this.vals = vals;
    this.arr = vals.map((_, id) => id);
    this.moves = vals.map(() => []);
  }

  less(i: number, j: number): boolean {
    this.marks.push({ t: this.t, i, j });
    this.t++;
    return this.vals[this.arr[i]] < this.vals[this.arr[j]];
  }

  /** Coloca `ids` a partir de la posición `lo`; el movimiento ocurre en el tick actual. */
  place(lo: number, ids: number[]): void {
    const t = this.t - 1;
    ids.forEach((id, k) => {
      if (this.arr[lo + k] === id) return;
      this.arr[lo + k] = id;
      const m = this.moves[id];
      if (m.length && m[m.length - 1].t === t) m[m.length - 1].pos = lo + k;
      else m.push({ t, pos: lo + k });
    });
  }

  swap(i: number, j: number): void {
    const a = this.arr[i];
    const b = this.arr[j];
    if (i < j) this.place(i, [b, ...this.arr.slice(i + 1, j), a]);
    else this.place(j, [a, ...this.arr.slice(j + 1, i), b]);
  }
}

function bubble(s: Tracker): void {
  const n = s.arr.length;
  for (let end = n - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      if (s.less(i + 1, i)) {
        s.swap(i, i + 1);
        swapped = true;
      }
    }
    if (!swapped) break;
  }
}

function insertion(s: Tracker): void {
  for (let i = 1; i < s.arr.length; i++) {
    for (let j = i; j > 0 && s.less(j, j - 1); j--) s.swap(j, j - 1);
  }
}

function merge(s: Tracker, lo = 0, hi = s.arr.length): void {
  if (hi - lo < 2) return;
  const mid = (lo + hi) >> 1;
  merge(s, lo, mid);
  merge(s, mid, hi);
  const done: number[] = [];
  let left = s.arr.slice(lo, mid);
  let right = s.arr.slice(mid, hi);
  while (left.length && right.length) {
    const p = lo + done.length;
    if (s.less(p + left.length, p)) {
      done.push(right[0]);
      right = right.slice(1);
      s.place(lo, [...done, ...left, ...right]);
    } else {
      done.push(left[0]);
      left = left.slice(1);
    }
  }
}

function quick(s: Tracker, lo = 0, hi = s.arr.length - 1): void {
  if (lo >= hi) return;
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (s.less(j, hi)) {
      if (i !== j) s.swap(i, j);
      i++;
    }
  }
  if (i !== hi) s.swap(i, hi);
  quick(s, lo, i - 1);
  quick(s, i + 1, hi);
}

const ALGOS = [
  { name: 'Bubble Sort', big: 'O(n²)', run: bubble },
  { name: 'Insertion Sort', big: 'O(n²)', run: insertion },
  { name: 'Merge Sort', big: 'O(n log n)', run: merge },
  { name: 'Quick Sort', big: 'O(n log n)', run: quick },
];

const N = 30;
const W = 800;
const PW = 370;
const PH = 182;
const BAR_MAX = 112;
const BAR_COLORS = [C.blue, C.purple, C.pink, C.orange];
const MEDALS = [C.yellow, '#c9d1d9', '#d18616', C.muted];

export function sortRace(rand: () => number, date: Date): { svg: string; summary: string } {
  const vals = shuffle(Array.from({ length: N }, (_, i) => i + 1), rand);
  const runs = ALGOS.map((a) => {
    const s = new Tracker(vals);
    a.run(s);
    return { ...a, s, steps: s.t };
  });
  const maxSteps = Math.max(...runs.map((r) => r.steps));
  const DT = 17 / maxSteps; // la más lenta tarda ~17 s
  const T = maxSteps * DT + 4.5; // + pausa para ver el resultado
  const HOLD_END = T - 0.8;
  const ranking = [...runs].sort((a, b) => a.steps - b.steps);

  let css = `.s-run{animation:${num(T)}s steps(1,end) infinite}
`;
  let body = '<defs><path id="s-tri" d="M0 0l4.5 7h-9z"/></defs>';

  runs.forEach((r, k) => {
    const px = 20 + (k % 2) * (PW + 20);
    const py = 80 + Math.floor(k / 2) * (PH + 16);
    const innerX = px + 14;
    const slot = (PW - 28) / N;
    const baseY = py + PH - 26;
    const doneAt = r.steps * DT;
    const place = ranking.indexOf(r);
    const tooltip = `${r.name}: ${r.steps} comparaciones`;

    body += panel(px, py, PW, PH);
    body += `<text x="${px + 14}" y="${py + 25}" font-family="${SANS}" font-size="14" font-weight="700" fill="${C.text}">${esc(r.name)}<tspan dx="8" font-family="${MONO}" font-size="12" font-weight="400" fill="${C.muted}">${esc(r.big)}</tspan></text>`;

    // estado: "ordenando…" mientras corre, medalla al terminar
    css += `@keyframes s-run${k}{0%{opacity:1}${pct(doneAt, T)}{opacity:0}100%{opacity:0}}
@keyframes s-done${k}{0%{opacity:0}${pct(doneAt, T)}{opacity:1}${pct(HOLD_END, T)}{opacity:0}100%{opacity:0}}
`;
    body += `<text class="s-run" style="animation-name:s-run${k}" x="${px + PW - 14}" y="${py + 25}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${C.muted}">ordenando…</text>`;
    body += `<g class="s-run" style="animation-name:s-done${k}"><title>${esc(tooltip)}</title>
<rect x="${px + PW - 186}" y="${py + 11}" width="38" height="20" rx="10" fill="${MEDALS[place]}"/>
<text x="${px + PW - 167}" y="${py + 25.5}" text-anchor="middle" font-family="${SANS}" font-size="12" font-weight="700" fill="${C.bg}">${place + 1}.º</text>
<text x="${px + PW - 14}" y="${py + 25}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${C.text}">${r.steps} comparaciones</text></g>`;

    // barras (SMIL: mucho más compacto que @keyframes para cientos de pasos)
    const xAt = (pos: number) => num(innerX + 1 + pos * slot, 1);
    const kt = (t: number) => num(t / T, 4);
    r.s.vals.forEach((v, id) => {
      const h = 6 + (v / N) * (BAR_MAX - 6);
      const times = ['0'];
      const xs = [xAt(id)];
      let pos = id;
      for (const m of r.s.moves[id]) {
        times.push(kt((m.t + 0.1) * DT), kt((m.t + 0.9) * DT));
        xs.push(xAt(pos), xAt(m.pos));
        pos = m.pos;
      }
      times.push(kt(HOLD_END), '1');
      xs.push(xAt(pos), xAt(id));
      body += `<rect x="${xAt(id)}" y="${num(baseY - h)}" width="${num(slot - 2.4)}" height="${num(h)}" rx="1.5" fill="${ramp(BAR_COLORS, (v - 1) / (N - 1))}"><animate attributeName="x" values="${xs.join(';')}" keyTimes="${times.join(';')}" dur="${num(T)}s" repeatCount="indefinite"/></rect>`;
    });

    // marcadores de las dos posiciones que se están comparando
    for (const side of ['i', 'j'] as const) {
      const times: string[] = [];
      const xs: string[] = [];
      let last = -1;
      for (const m of r.s.marks) {
        const p = m[side];
        if (p === last) continue;
        times.push(kt(m.t * DT));
        xs.push(num(innerX + (p + 0.5) * slot, 1));
        last = p;
      }
      body += `<use href="#s-tri" y="${baseY + 5}" fill="${C.text}"><animate attributeName="x" values="${xs.join(';')}" keyTimes="${times.join(';')}" calcMode="discrete" dur="${num(T)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" keyTimes="0;${kt(doneAt)}" calcMode="discrete" dur="${num(T)}s" repeatCount="indefinite"/></use>`;
    }
  });

  const subtitle = `Mismo arreglo aleatorio de ${N} números · 1 tick = 1 comparación · carrera nueva cada 6 h · ${stamp(date)}`;
  const H = 80 + 2 * PH + 16 + 20;
  const out = svg(
    W,
    H,
    'Carrera de algoritmos de ordenamiento',
    `<style>${css}</style>\n${card(W, H)}\n${heading('Carrera de ordenamiento', subtitle)}\n${body}`,
  );
  const summary = ranking.map((r, i) => `${i + 1}. ${r.name} (${r.steps})`).join(', ');
  return { svg: out, summary };
}
