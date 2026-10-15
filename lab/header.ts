// Encabezado: una terminal que se escribe sola y termina corriendo donut.c,
// un toro 3D renderizado en ASCII (rotaciones, proyección, z-buffer e iluminación).
import { C, MONO, esc, num, svg } from './lib.ts';

const W = 800;
const H = 300;
const X0 = 24;
const Y0 = 70;
const LINE = 22;
const CW = 8.4; // ancho fijo por carácter: cada glifo se posiciona a mano, así no depende de la fuente

type Seg = { t: string; c?: string; b?: boolean };
type Line = { kind: 'cmd'; text: string; at: number } | { kind: 'out'; segs: Seg[]; at: number };

const SCRIPT: Line[] = [
  { kind: 'cmd', text: 'whoami', at: 0.4 },
  { kind: 'out', segs: [{ t: 'Juanka', c: C.green, b: true }, { t: ' — desarrollador de software' }], at: 1.2 },
  { kind: 'out', segs: [{ t: 'Medellín, Colombia', c: C.muted }], at: 1.35 },
  { kind: 'cmd', text: 'cat stack.txt', at: 1.9 },
  { kind: 'out', segs: [{ t: 'backend  ', c: C.blue }, { t: 'Java · Spring Boot · Python · FastAPI' }], at: 3.0 },
  { kind: 'out', segs: [{ t: 'frontend ', c: C.purple }, { t: 'TypeScript · React · Flutter' }], at: 3.15 },
  { kind: 'out', segs: [{ t: 'datos    ', c: C.orange }, { t: 'SQL · GraphQL' }], at: 3.3 },
  { kind: 'cmd', text: './donut --spin', at: 3.8 },
  { kind: 'out', segs: [{ t: '✔ ', c: C.green }, { t: 'toro 3D en ASCII: rotación + z-buffer + luz', c: C.muted }], at: 5.1 },
];
const TYPE_SPEED = 0.075;
const PROMPT_AT = 5.5;

/** Texto con cada carácter en una x fija (los espacios solo avanzan la posición). */
function glyphs(s: string, x: number, y: number, attrs: string): string {
  const chars = [...s].map((ch, i) => ({ ch, x: x + i * CW })).filter((g) => g.ch !== ' ');
  const xs = chars.map((g) => num(g.x, 1)).join(' ');
  return `<text x="${xs}" y="${y}" ${attrs}>${esc(chars.map((g) => g.ch).join(''))}</text>`;
}

function terminal(): { body: string; css: string } {
  let body = '';
  let css = '';
  SCRIPT.forEach((line, i) => {
    const y = Y0 + i * LINE;
    if (line.kind === 'cmd') {
      const len = [...line.text].length;
      const dur = len * TYPE_SPEED;
      const tx = X0 + 2 * CW;
      body += `<g class="h-in" style="animation-delay:${num(line.at - 0.35)}s">
${glyphs('❯', X0, y, `fill="${C.green}" font-weight="700"`)}
${glyphs(line.text, tx, y, `fill="${C.text}"`)}
<rect class="h-cover" x="${num(tx, 1)}" y="${y - 16}" width="${num((len + 2) * CW, 1)}" height="22" fill="${C.bg}" style="animation:h-type${i} ${num(dur)}s steps(${len},end) ${num(line.at)}s both"/>
<rect x="${num(tx, 1)}" y="${y - 14}" width="${CW - 1}" height="18" fill="${C.green}" style="animation:h-type${i} ${num(dur)}s steps(${len},end) ${num(line.at)}s both,h-life ${num(dur + 0.6)}s linear ${num(line.at - 0.35)}s"/>
</g>
`;
      css += `@keyframes h-type${i}{from{transform:translateX(0)}to{transform:translateX(${num(len * CW, 1)}px)}}\n`;
    } else {
      let x = X0;
      let parts = '';
      for (const seg of line.segs) {
        const attrs = `fill="${seg.c ?? C.text}"${seg.b ? ' font-weight="700"' : ''}`;
        parts += glyphs(seg.t, x, y, attrs);
        x += [...seg.t].length * CW;
      }
      body += `<g class="h-in" style="animation-delay:${num(line.at)}s">${parts}</g>\n`;
    }
  });
  const y = Y0 + SCRIPT.length * LINE;
  body += `<g class="h-in" style="animation-delay:${PROMPT_AT}s">
${glyphs('❯', X0, y, `fill="${C.green}" font-weight="700"`)}
<rect class="h-blink" x="${num(X0 + 2 * CW, 1)}" y="${y - 14}" width="${CW - 1}" height="18" fill="${C.green}" style="animation-delay:${PROMPT_AT}s"/>
</g>
`;
  return { body, css };
}

// --- donut.c ---------------------------------------------------------------
const COLS = 40;
const ROWS = 22;
const FRAMES = 48;
const FRAME_DT = 0.08;
const LUM = '.,-~:;=!*#$@';

function donutFrame(A: number, B: number): string[] {
  const R1 = 1;
  const R2 = 2;
  const K2 = 5;
  const K1 = (COLS * K2 * 3) / (8 * (R1 + R2)) * 0.78;
  const ASPECT = 0.56; // los caracteres son más altos que anchos
  const out = Array.from({ length: ROWS }, () => Array<string>(COLS).fill(' '));
  const zbuf = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  const [cA, sA, cB, sB] = [Math.cos(A), Math.sin(A), Math.cos(B), Math.sin(B)];
  for (let th = 0; th < 2 * Math.PI; th += 0.07) {
    const [ct, st] = [Math.cos(th), Math.sin(th)];
    for (let ph = 0; ph < 2 * Math.PI; ph += 0.02) {
      const [cp, sp] = [Math.cos(ph), Math.sin(ph)];
      const cx = R2 + R1 * ct;
      const cy = R1 * st;
      const x = cx * (cB * cp + sA * sB * sp) - cy * cA * sB;
      const y = cx * (sB * cp - sA * cB * sp) + cy * cA * cB;
      const z = K2 + cA * cx * sp + cy * sA;
      const ooz = 1 / z;
      const xp = Math.floor(COLS / 2 + K1 * ooz * x);
      const yp = Math.floor(ROWS / 2 - K1 * ooz * y * ASPECT);
      const L = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp);
      if (L > 0 && xp >= 0 && xp < COLS && yp >= 0 && yp < ROWS && ooz > zbuf[yp][xp]) {
        zbuf[yp][xp] = ooz;
        out[yp][xp] = LUM[Math.min(LUM.length - 1, Math.floor(L * 8))];
      }
    }
  }
  return out.map((r) => r.join(''));
}

function donut(): { body: string; css: string } {
  const FS = 9.5;
  const DCW = 5.7; // ancho forzado por carácter (textLength)
  const LH = 10.4;
  const ox = 790 - COLS * DCW - 14;
  const oy = 64;
  let frames = '';
  for (let f = 0; f < FRAMES; f++) {
    const t = (2 * Math.PI * f) / FRAMES;
    const rows = donutFrame(t, t);
    let rowsSvg = '';
    rows.forEach((row, r) => {
      const trimmed = row.trimEnd();
      const lead = trimmed.length - trimmed.trimStart().length;
      const text = trimmed.trimStart();
      if (!text) return;
      rowsSvg += `<text x="${num(ox + lead * DCW, 1)}" y="${num(oy + r * LH, 1)}" textLength="${num(text.length * DCW, 1)}">${text.replaceAll(' ', ' ')}</text>`;
    });
    frames += `<g class="h-f" style="animation-delay:${num(f * FRAME_DT)}s">${rowsSvg}</g>\n`;
  }
  const cycle = FRAMES * FRAME_DT;
  const css = `.h-f{opacity:0;animation:h-frame ${num(cycle)}s steps(1,end) infinite}
@keyframes h-frame{0%{opacity:1}${num(100 / FRAMES, 3)}%{opacity:0}100%{opacity:0}}
`;
  const gx1 = ox;
  const gx2 = ox + COLS * DCW;
  const body = `<defs><linearGradient id="h-g" gradientUnits="userSpaceOnUse" x1="${num(gx1)}" y1="${oy}" x2="${num(gx2)}" y2="${oy + ROWS * LH}">
<stop offset="0" stop-color="${C.orange}"/><stop offset=".5" stop-color="${C.pink}"/><stop offset="1" stop-color="${C.purple}"/></linearGradient></defs>
<g class="h-in" style="animation-delay:4.9s" fill="url(#h-g)" font-family="${MONO}" font-size="${FS}">
${frames}</g>
`;
  return { body, css };
}

export function header(): string {
  const term = terminal();
  const dn = donut();
  const style = `<style>
.h-in{opacity:0;animation:h-fade .25s ease-out both}
@keyframes h-fade{from{opacity:0}to{opacity:1}}
@keyframes h-life{from,to{opacity:1}}
.h-cover+rect{opacity:0}
.h-blink{opacity:0;animation:h-blink 1.1s steps(1,end) infinite}
@keyframes h-blink{0%{opacity:1}50%{opacity:0}}
${term.css}${dn.css}</style>`;
  const body = `${style}
<defs><clipPath id="h-clip"><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12"/></clipPath></defs>
<g clip-path="url(#h-clip)">
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<rect width="${W}" height="34" fill="${C.panel}"/>
<line x1="0" y1="34.5" x2="${W}" y2="34.5" stroke="${C.border}"/>
<circle cx="22" cy="17" r="6" fill="#ff5f56"/><circle cx="42" cy="17" r="6" fill="#ffbd2e"/><circle cx="62" cy="17" r="6" fill="#27c93f"/>
<text x="${W / 2}" y="21.5" text-anchor="middle" fill="${C.muted}" font-family="${MONO}" font-size="12">juanka@medellin: ~/lab</text>
<g font-family="${MONO}" font-size="14">
${term.body}</g>
${dn.body}</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${C.border}"/>`;
  return svg(W, H, 'Terminal de Juanka: whoami, stack y donut.c girando', body);
}
