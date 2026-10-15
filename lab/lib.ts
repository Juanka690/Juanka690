// Utilidades compartidas por todos los generadores de SVG.

export const C = {
  bg: '#0d1117',
  panel: '#161b22',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#8b949e',
  faint: '#21262d',
  green: '#3fb950',
  blue: '#58a6ff',
  purple: '#bc8cff',
  pink: '#f778ba',
  orange: '#ffa657',
  red: '#ff7b72',
  yellow: '#e3b341',
};

export const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";
export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Número compacto para SVG/CSS: sin ceros sobrantes ni "-0". */
export const num = (x: number, digits = 2): string => {
  const v = Number(x.toFixed(digits));
  return Object.is(v, -0) ? '0' : String(v);
};

/** Porcentaje para @keyframes. */
export const pct = (t: number, total: number): string => `${num((t / total) * 100, 3)}%`;

export function svg(w: number, h: number, title: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
${body}
</svg>
`;
}

/** Fondo tipo tarjeta, se ve bien con el tema claro y el oscuro de GitHub. */
export function card(w: number, h: number): string {
  return `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="14" fill="${C.bg}" stroke="${C.border}"/>`;
}

export function heading(title: string, subtitle: string): string {
  return `<text x="24" y="38" fill="${C.text}" font-family="${SANS}" font-size="20" font-weight="700">${esc(title)}</text>
<text x="24" y="60" fill="${C.muted}" font-family="${SANS}" font-size="12.5">${esc(subtitle)}</text>`;
}

export function panel(x: number, y: number, w: number, h: number): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${C.panel}" stroke="${C.border}"/>`;
}

/** PRNG determinista (mulberry32): misma semilla, mismo resultado. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Interpola entre una lista de colores hex, t ∈ [0, 1]. */
export function ramp(colors: string[], t: number): string {
  const rgb = colors.map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
  const x = Math.min(Math.max(t, 0), 1) * (rgb.length - 1);
  const i = Math.min(Math.floor(x), rgb.length - 2);
  const f = x - i;
  return '#' + rgb[i].map((v, k) => Math.round(v + (rgb[i + 1][k] - v) * f).toString(16).padStart(2, '0')).join('');
}

export function stamp(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(date);
}
