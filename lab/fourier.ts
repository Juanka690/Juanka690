// Series de Fourier: una curva cerrada se descompone (DFT) en círculos que giran
// a frecuencias enteras. Puestos uno al final del otro, reconstruyen el dibujo.
import { C, MONO, SANS, card, heading, num, panel, svg } from './lib.ts';

type Pt = [number, number];
type Coef = { k: number; re: number; im: number; amp: number; phase: number };

const N = 512; // puntos muestreados del dibujo
const ARMS = 60; // círculos de la animación principal
const PERIOD = 14; // segundos por vuelta completa

// --- el dibujo: una taza de café con vapor, como un solo trazo cerrado ---------
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const line = (a: Pt, b: Pt) => (t: number) => lerp(a, b, t);
const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt) => (t: number): Pt => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};
const reverse = (f: (t: number) => Pt) => (t: number) => f(1 - t);

function steam(x: number, y: number, h: number, sway: number): ((t: number) => Pt)[] {
  const up = [
    cubic([x, y], [x - sway, y - h * 0.2], [x + sway, y - h * 0.35], [x, y - h * 0.5]),
    cubic([x, y - h * 0.5], [x - sway, y - h * 0.65], [x + sway, y - h * 0.8], [x, y - h]),
  ];
  return [...up, ...[...up].reverse().map(reverse)];
}

function coffeeCup(): Pt[] {
  const segs = [
    line([-62, -20], [-18, -20]),
    ...steam(-18, -20, 64, 13),
    line([-18, -20], [14, -20]),
    ...steam(14, -20, 50, -12),
    line([14, -20], [62, -20]),
    line([62, -20], [61, -6]),
    cubic([61, -6], [102, -16], [102, 44], [56, 32]), // asa
    cubic([56, 32], [52, 46], [46, 53], [40, 56]),
    line([40, 56], [86, 56]), // plato
    cubic([86, 56], [82, 68], [68, 72], [56, 72]),
    line([56, 72], [-56, 72]),
    cubic([-56, 72], [-68, 72], [-82, 68], [-86, 56]),
    line([-86, 56], [-40, 56]),
    cubic([-40, 56], [-50, 50], [-58, 40], [-60, 20]),
    cubic([-60, 20], [-62, 5], [-62, -10], [-62, -20]),
  ];
  // muestreo denso y luego re-muestreo uniforme por longitud de arco
  const dense: Pt[] = [];
  for (const f of segs) for (let i = 0; i < 200; i++) dense.push(f(i / 200));
  dense.push(dense[0]);
  const acc = [0];
  for (let i = 1; i < dense.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  }
  const total = acc[acc.length - 1];
  const out: Pt[] = [];
  for (let n = 0, j = 0; n < N; n++) {
    const target = (n / N) * total;
    while (acc[j + 1] < target) j++;
    const f = (target - acc[j]) / (acc[j + 1] - acc[j] || 1);
    out.push(lerp(dense[j], dense[j + 1], f));
  }
  return out;
}

/** Transformada discreta de Fourier de puntos tratados como números complejos x + iy. */
function dft(points: Pt[]): Coef[] {
  const n = points.length;
  const coefs: Coef[] = [];
  for (let k = -n / 2; k < n / 2; k++) {
    let re = 0;
    let im = 0;
    points.forEach(([x, y], j) => {
      const a = (-2 * Math.PI * k * j) / n;
      re += x * Math.cos(a) - y * Math.sin(a);
      im += x * Math.sin(a) + y * Math.cos(a);
    });
    re /= n;
    im /= n;
    coefs.push({ k, re, im, amp: Math.hypot(re, im), phase: Math.atan2(im, re) });
  }
  return coefs;
}

/** Punto del dibujo en t ∈ [0, 1) usando solo los coeficientes dados. */
function evaluate(coefs: Coef[], t: number): Pt {
  let x = 0;
  let y = 0;
  for (const c of coefs) {
    const a = 2 * Math.PI * c.k * t + c.phase;
    x += c.amp * Math.cos(a);
    y += c.amp * Math.sin(a);
  }
  return [x, y];
}

function polyline(coefs: Coef[], samples: number, map: (p: Pt) => Pt): { pts: Pt[]; d: string } {
  const pts: Pt[] = [];
  for (let i = 0; i <= samples; i++) pts.push(map(evaluate(coefs, i / samples)));
  return { pts, d: 'M' + pts.map(([x, y]) => `${num(x, 1)} ${num(y, 1)}`).join('L') };
}

export function fourier(): string {
  const coefs = dft(coffeeCup());
  const dc = coefs.find((c) => c.k === 0)!;
  const ranked = coefs.filter((c) => c.k !== 0).sort((a, b) => b.amp - a.amp);
  const W = 800;
  const H = 430;

  // panel principal
  const [px, py, pw, ph] = [20, 80, 470, 330];
  const S = 1.6;
  const cx = px + pw / 2 - 7 * S; // centro aproximado del dibujo: (7, -6)
  const cy = py + ph / 2 - 10 + 6 * S;
  const toMain = ([x, y]: Pt): Pt => [cx + x * S, cy + y * S];
  const arms = ranked.slice(0, ARMS);

  // cadena de epiciclos: cada grupo gira relativo a su padre
  let chain = `<circle r="3.5" fill="${C.yellow}"/>`;
  for (let i = arms.length - 1; i >= 0; i--) {
    const c = arms[i];
    const prev = arms[i - 1];
    const r = c.amp * S;
    const rel0 = ((c.phase - (prev?.phase ?? 0)) * 180) / Math.PI;
    const relTurns = c.k - (prev?.k ?? 0);
    const circle = r > 0.8 ? `<circle r="${num(r)}" fill="none" stroke="${C.muted}" stroke-opacity=".4"/>` : '';
    const inner = `<g transform="translate(${num(r)} 0)">${chain}</g>`;
    chain = `<g><animateTransform attributeName="transform" type="rotate" from="${num(rel0)}" to="${num(rel0 + 360 * relTurns)}" dur="${PERIOD}s" repeatCount="indefinite"/>${circle}<line x2="${num(r)}" stroke="${C.text}" stroke-opacity=".7"/>${inner}</g>`;
  }
  const [ox, oy] = toMain([dc.re, dc.im]);

  // trazo que se va dibujando sincronizado con la punta de la cadena
  const SAMPLES = 720;
  const trace = polyline(arms, SAMPLES, ([x, y]) => [ox + x * S, oy + y * S]);
  const cum = [0];
  for (let i = 1; i < trace.pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(trace.pts[i][0] - trace.pts[i - 1][0], trace.pts[i][1] - trace.pts[i - 1][1]));
  }
  const L = cum[cum.length - 1];
  const KEYS = 90;
  const keyTimes: string[] = [];
  const offsets: string[] = [];
  for (let j = 0; j <= KEYS; j++) {
    keyTimes.push(num(j / KEYS, 4));
    offsets.push(num(L - cum[Math.round((j / KEYS) * SAMPLES)], 1));
  }

  let body = panel(px, py, pw, ph);
  body += `<defs><clipPath id="f-clip"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="10"/></clipPath></defs>
<g clip-path="url(#f-clip)">
<path d="${trace.d}" fill="none" stroke="${C.muted}" stroke-opacity=".18" stroke-width="1.5"/>
<path d="${trace.d}" fill="none" stroke="${C.orange}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${num(L, 1)} ${num(L, 1)}" stroke-dashoffset="${num(L, 1)}">
<animate attributeName="stroke-dashoffset" values="${offsets.join(';')}" keyTimes="${keyTimes.join(';')}" dur="${PERIOD}s" repeatCount="indefinite"/></path>
<g transform="translate(${num(ox)} ${num(oy)})">${chain}</g>
</g>
<text x="${px + 14}" y="${py + ph - 14}" font-family="${MONO}" font-size="11.5" fill="${C.muted}">${ARMS} círculos · cada uno gira a una frecuencia entera</text>`;

  // paneles pequeños: misma figura con menos círculos
  const levels = [
    { k: 3, note: 'solo la idea general' },
    { k: 10, note: 'aparece el vapor' },
    { k: 30, note: 'asa, plato y vapor' },
  ];
  levels.forEach((lv, i) => {
    const [qx, qy, qw, qh] = [505, 80 + i * 115, 275, 100];
    const s = 0.47;
    const mx = qx + 66;
    const my = qy + qh / 2;
    const approx = polyline(ranked.slice(0, lv.k), 240, ([x, y]) => [mx + (x + dc.re - 7) * s, my + (y + dc.im + 6) * s]);
    body += panel(qx, qy, qw, qh);
    body += `<path d="${approx.d}" fill="none" stroke="${C.orange}" stroke-width="1.6" stroke-linejoin="round"/>`;
    body += `<text x="${qx + 138}" y="${qy + 44}" font-family="${SANS}" font-size="16" font-weight="700" fill="${C.text}">${lv.k} círculos</text>`;
    body += `<text x="${qx + 138}" y="${qy + 64}" font-family="${SANS}" font-size="12" fill="${C.muted}">${lv.note}</text>`;
  });

  return svg(
    W,
    H,
    'Series de Fourier: círculos que dibujan una taza de café',
    `${card(W, H)}\n${heading('Series de Fourier: círculos que dibujan un café', `DFT de ${N} puntos → cada coeficiente es un círculo con su radio, fase y velocidad`)}\n${body}`,
  );
}
