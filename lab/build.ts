// Genera todos los SVG del perfil.
//   node lab/build.ts [carpeta-salida] [--seed N]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fourier } from './fourier.ts';
import { header } from './header.ts';
import { rng } from './lib.ts';
import { pathfinding } from './path.ts';
import { sortRace } from './sort.ts';
import { tttAssets } from './ttt/art.ts';

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) ?? 'dist';
const seedArg = args.indexOf('--seed');
const seed = seedArg >= 0 ? Number(args[seedArg + 1]) : Date.now() % 2 ** 32;
const now = new Date();
const rand = rng(seed);

const sort = sortRace(rand, now);
const path = pathfinding(rand, now);
const files: Record<string, string> = {
  'header.svg': header(),
  'sort.svg': sort.svg,
  'path.svg': path.svg,
  'fourier.svg': fourier(),
};
for (const [name, content] of Object.entries(tttAssets())) files[`ttt/${name}`] = content;

for (const [name, content] of Object.entries(files)) {
  const file = join(out, name);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, content);
  console.log(`${file.padEnd(28)} ${(Buffer.byteLength(content) / 1024).toFixed(1).padStart(6)} KB`);
}
console.log(`semilla ${seed}`);
console.log(`ordenamiento: ${sort.summary}`);
console.log(`caminos: ${path.summary}`);
