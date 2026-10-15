// Imágenes de las casillas del triqui (se publican en la rama `lab`).
import { C, SANS, svg } from '../lib.ts';

const S = 100;

function tile(inner: string, opts: { fill?: string; stroke?: string } = {}): string {
  return svg(
    S,
    S,
    'casilla de triqui',
    `<rect x="2" y="2" width="96" height="96" rx="14" fill="${opts.fill ?? C.panel}" stroke="${opts.stroke ?? C.border}" stroke-width="2"/>${inner}`,
  );
}

// trazo que se dibuja al cargar (stroke-dashoffset → 0)
const draw = (len: number, delay: number) =>
  `stroke-dasharray="${len}" stroke-dashoffset="${len}" style="animation:d .35s ease-out ${delay}s forwards"`;
const STYLE = '<style>@keyframes d{to{stroke-dashoffset:0}}</style>';

const X = (color: string) =>
  `${STYLE}<g stroke="${color}" stroke-width="10" stroke-linecap="round"><path d="M30 30L70 70" ${draw(57, 0)}/><path d="M70 30L30 70" ${draw(57, 0.25)}/></g>`;
const O = (color: string) =>
  `${STYLE}<circle cx="50" cy="50" r="22" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" transform="rotate(-90 50 50)" ${draw(139, 0)}/>`;

export function tttAssets(): Record<string, string> {
  const files: Record<string, string> = {
    'x.svg': tile(X(C.orange)),
    'o.svg': tile(O(C.purple)),
    'x-win.svg': tile(X(C.orange), { fill: '#2d2112', stroke: C.orange }),
    'o-win.svg': tile(O(C.purple), { fill: '#251d36', stroke: C.purple }),
  };
  for (let i = 1; i <= 9; i++) {
    files[`cell-${i}.svg`] = tile(
      `<text x="50" y="61" text-anchor="middle" font-family="${SANS}" font-size="30" font-weight="700" fill="${C.muted}" fill-opacity=".35">${i}</text>`,
    );
  }
  return files;
}
