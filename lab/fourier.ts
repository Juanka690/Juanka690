// Series de Fourier: una curva cerrada se descompone (DFT) en círculos que giran
// a frecuencias enteras. Puestos uno al final del otro, escriben mi nombre.
import { C, MONO, SANS, card, heading, num, panel, svg } from './lib.ts';

type Pt = [number, number];
type Coef = { k: number; re: number; im: number; amp: number; phase: number };

const N = 1024; // puntos muestreados de la firma
const ARMS = 240; // círculos de la animación principal
const PERIOD = 20; // segundos por vuelta completa

// --- la firma: "Juanka" en cursiva, un solo trazo cerrado de curvas de Bézier ---
// Línea base en y = 0, altura de la x en y = -40. El último tramo es el subrayado
// que vuelve al inicio y cierra la curva.
const SIGNATURE = `
M0 -55
C5 -85 30 -95 42 -90 C52 -86 48 -70 44 -50 C38 -20 34 20 24 40 C16 54 0 50 4 36 C10 18 40 4 58 -6
C64 -20 68 -35 70 -40 C66 -15 68 0 78 0 C88 0 94 -25 96 -40 C94 -20 92 -2 102 0 C108 0 112 -6 116 -14
C124 -30 138 -42 150 -38 C140 -44 124 -36 124 -18 C124 -2 140 4 148 -12 C150 -22 151 -32 152 -40 C150 -25 148 -4 158 0 C164 0 168 -6 172 -14
C174 -28 176 -36 178 -40 C178 -25 177 -10 176 0 C180 -30 200 -45 204 -30 C206 -18 202 -2 212 0 C218 0 222 -6 226 -12
C236 -50 248 -90 238 -92 C226 -94 226 -50 228 0 C232 -25 250 -42 256 -32 C260 -24 248 -18 236 -18 C248 -16 250 -2 262 0 C268 0 272 -6 276 -14
C284 -30 298 -42 310 -38 C300 -44 284 -36 284 -18 C284 -2 300 4 308 -12 C310 -22 311 -32 312 -40 C310 -25 308 -4 318 0 C324 0 328 -6 332 -14
C350 -30 362 10 320 24 C220 40 100 34 -6 22 C-30 14 -5 -35 0 -55`;

/** Mini intérprete de rutas SVG (solo M y C absolutas). */
function parsePath(d: string): ((t: number) => Pt)[] {
  const tokens = d.match(/[MC]|-?\d*\.?\d+/g) ?? [];
  const segs: ((t: number) => Pt)[] = [];
  let cur: Pt = [0, 0];
  for (let i = 0; i < tokens.length; ) {
    const cmd = tokens[i++];
    const read = (): Pt => [Number(tokens[i++]), Number(tokens[i++])];
    if (cmd === 'M') {
      cur = read();
    } else if (cmd === 'C') {
      const [p0, p1, p2, p3] = [cur, read(), read(), read()];
      segs.push((t) => {
        const u = 1 - t;
        const [a, b, c, e] = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
        return [a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]];
      });
      cur = p3;
    }
  }
  return segs;
}

/** Muestrea la curva en `n` puntos equidistantes (por longitud de arco). */
function sample(segs: ((t: number) => Pt)[], n: number): Pt[] {
  const dense: Pt[] = [];
  for (const f of segs) for (let i = 0; i < 200; i++) dense.push(f(i / 200));
  dense.push(dense[0]);
  const acc = [0];
  for (let i = 1; i < dense.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  }
  const total = acc[acc.length - 1];
  const out: Pt[] = [];
  for (let k = 0, j = 0; k < n; k++) {
    const target = (k / n) * total;
    while (acc[j + 1] < target) j++;
    const f = (target - acc[j]) / (acc[j + 1] - acc[j] || 1);
    out.push([dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f]);
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

/** Punto de la curva en t ∈ [0, 1) usando solo los coeficientes dados. */
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

/** Transformación que encaja la caja `box` centrada dentro del rectángulo dado. */
function fit(box: { x0: number; y0: number; x1: number; y1: number }, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / (box.x1 - box.x0), h / (box.y1 - box.y0));
  const cx = x + w / 2 - ((box.x0 + box.x1) / 2) * s;
  const cy = y + h / 2 - ((box.y0 + box.y1) / 2) * s;
  return { s, map: ([px, py]: Pt): Pt => [cx + px * s, cy + py * s] };
}

export function fourier(): string {
  const points = sample(parsePath(SIGNATURE), N);
  const coefs = dft(points);
  const dc = coefs.find((c) => c.k === 0)!;
  const ranked = coefs.filter((c) => c.k !== 0).sort((a, b) => b.amp - a.amp);
  const box = {
    x0: Math.min(...points.map((p) => p[0])),
    y0: Math.min(...points.map((p) => p[1])),
    x1: Math.max(...points.map((p) => p[0])),
    y1: Math.max(...points.map((p) => p[1])),
  };
  const W = 800;
  const H = 505;

  // panel principal (ancho, porque un nombre es ancho)
  const [px, py, pw, ph] = [20, 80, 760, 260];
  const main = fit(box, px + 40, py + 22, pw - 80, ph - 62);
  const S = main.s;
  const arms = ranked.slice(0, ARMS);
  const [ox, oy] = main.map([dc.re, dc.im]);

  // cadena de epiciclos: cada grupo gira relativo a su padre
  let chain = `<circle r="3.5" fill="${C.yellow}"/>`;
  for (let i = arms.length - 1; i >= 0; i--) {
    const c = arms[i];
    const prev = arms[i - 1];
    const r = c.amp * S;
    const rel0 = ((c.phase - (prev?.phase ?? 0)) * 180) / Math.PI;
    const relTurns = c.k - (prev?.k ?? 0);
    const circle = r > 1 ? `<circle r="${num(r, 1)}" fill="none" stroke="${C.muted}" stroke-opacity=".4"/>` : '';
    chain = `<g><animateTransform attributeName="transform" type="rotate" from="${num(rel0, 1)}" to="${num(rel0 + 360 * relTurns, 1)}" dur="${PERIOD}s" repeatCount="indefinite"/>${circle}<line x2="${num(r, 1)}" stroke="${C.text}" stroke-opacity=".7"/><g transform="translate(${num(r, 1)} 0)">${chain}</g></g>`;
  }

  // trazo que se va dibujando sincronizado con la punta de la cadena
  const SAMPLES = 1600;
  const trace = polyline(arms, SAMPLES, ([x, y]) => [ox + x * S, oy + y * S]);
  const cum = [0];
  for (let i = 1; i < trace.pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(trace.pts[i][0] - trace.pts[i - 1][0], trace.pts[i][1] - trace.pts[i - 1][1]));
  }
  const L = cum[cum.length - 1];
  const KEYS = 200;
  const keyTimes: string[] = [];
  const offsets: string[] = [];
  for (let j = 0; j <= KEYS; j++) {
    keyTimes.push(num(j / KEYS, 4));
    offsets.push(num(L - cum[Math.round((j / KEYS) * SAMPLES)], 1));
  }

  let body = panel(px, py, pw, ph);
  body += `<defs><clipPath id="f-clip"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="10"/></clipPath></defs>
<g clip-path="url(#f-clip)">
<path d="${trace.d}" fill="none" stroke="${C.muted}" stroke-opacity=".16" stroke-width="1.5"/>
<path d="${trace.d}" fill="none" stroke="${C.orange}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${num(L, 1)} ${num(L, 1)}" stroke-dashoffset="${num(L, 1)}">
<animate attributeName="stroke-dashoffset" values="${offsets.join(';')}" keyTimes="${keyTimes.join(';')}" dur="${PERIOD}s" repeatCount="indefinite"/></path>
<g transform="translate(${num(ox, 1)} ${num(oy, 1)})">${chain}</g>
</g>
<text x="${px + 14}" y="${py + ph - 14}" font-family="${MONO}" font-size="11.5" fill="${C.muted}">${ARMS} círculos · cada uno gira a una frecuencia entera</text>`;

  // paneles pequeños: la misma firma con menos círculos
  const levels = [
    { k: 8, note: 'solo una mancha' },
    { k: 30, note: 'ya se adivinan letras' },
    { k: 80, note: 'casi legible' },
  ];
  const qw = (pw - 30) / 3;
  levels.forEach((lv, i) => {
    const [qx, qy, qh] = [px + i * (qw + 15), py + ph + 15, 130];
    const mini = fit(box, qx + 14, qy + 38, qw - 28, qh - 50);
    const approx = polyline(ranked.slice(0, lv.k), 500, ([x, y]) => mini.map([x + dc.re, y + dc.im]));
    body += panel(qx, qy, qw, qh);
    body += `<text x="${qx + 14}" y="${qy + 24}" font-family="${SANS}" font-size="14" font-weight="700" fill="${C.text}">${lv.k} círculos<tspan dx="8" font-size="12" font-weight="400" fill="${C.muted}">${lv.note}</tspan></text>`;
    body += `<path d="${approx.d}" fill="none" stroke="${C.orange}" stroke-width="1.5" stroke-linejoin="round"/>`;
  });

  return svg(
    W,
    H,
    'Series de Fourier: círculos que escriben Juanka',
    `${card(W, H)}\n${heading('Series de Fourier: círculos que escriben mi nombre', `DFT de ${N} puntos de mi firma → cada coeficiente es un círculo con su radio, fase y velocidad`)}\n${body}`,
  );
}
