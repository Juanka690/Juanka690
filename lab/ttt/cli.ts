// Procesa una jugada que llega como issue ("ttt|move|5" o "ttt|new"),
// hace jugar a la IA y actualiza el estado y el README.
//
//   node lab/ttt/cli.ts play     (usa TTT_TITLE y TTT_USER del entorno)
//   node lab/ttt/cli.ts render   (solo re-dibuja el tablero en el README)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { bestMove, status, winningLine, type Cell, type Status } from './engine.ts';

const REPO = process.env.GITHUB_REPOSITORY ?? 'Juanka690/Juanka690';
const PROFILE = `https://github.com/${REPO.split('/')[0]}`;
const STATE_FILE ='game/ttt.json';
const README = 'README.md';
const COMMENT_FILE = '.ttt/comment.md';
const ASSETS = `https://raw.githubusercontent.com/${REPO}/lab/ttt`;
const START = '<!-- TTT:START -->';
const END = '<!-- TTT:END -->';

type Entry = { user: string; cell: number; ai: number | null; nodes: number; result: Status };
type State = {
  board: Cell[];
  score: { humans: number; ai: number; draws: number };
  history: Entry[];
};

const fresh = (): Cell[] => Array<Cell>(9).fill('');

function load(): State {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { board: fresh(), score: { humans: 0, ai: 0, draws: 0 }, history: [] };
  }
}

function issueLink(title: string): string {
  const body = '¡Solo dale **Submit new issue**! 👇 Mi IA responderá en unos segundos y el tablero del perfil se actualizará solo.';
  return `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

const fmt = (n: number) => n.toLocaleString('es-CO');

function emojiBoard(board: Cell[]): string {
  const e = (c: Cell) => (c === 'X' ? '❌' : c === 'O' ? '⭕' : '⬜');
  return [0, 3, 6].map((r) => board.slice(r, r + 3).map(e).join('')).join('<br>');
}

function renderSection(state: State): string {
  const st = status(state.board);
  const win = winningLine(state.board) ?? [];
  const rows = [0, 3, 6].map((r) => {
    const cells = [0, 1, 2].map((c) => {
      const i = r + c;
      const v = state.board[i];
      if (!v) {
        const img = `<img src="${ASSETS}/cell-${i + 1}.svg" width="84" alt="casilla ${i + 1}">`;
        return st === 'playing' ? `<td><a href="${issueLink(`ttt|move|${i + 1}`)}">${img}</a></td>` : `<td>${img}</td>`;
      }
      const name = `${v.toLowerCase()}${win.includes(i) ? '-win' : ''}.svg`;
      return `<td><img src="${ASSETS}/${name}" width="84" alt="${v}"></td>`;
    });
    return `<tr>${cells.join('')}</tr>`;
  });

  const again = `[**▶ Nueva partida**](${issueLink('ttt|new')})`;
  const message = {
    playing: state.board.some(Boolean)
      ? '**Tu turno:** juegas con ❌, haz clic en una casilla libre.'
      : '**¡Empieza tú!** Juegas con ❌: haz clic en cualquier casilla.',
    X: `**¡Le ganaste a la IA!** 🤯 Eso no debería ser posible… ${again}`,
    O: `**Ganó la IA** 🤖 Minimax no perdona. ${again}`,
    draw: `**Empate** 🤝 Es lo mejor que se puede lograr contra minimax. ${again}`,
  }[st];

  const { humans, ai, draws } = state.score;
  const history = state.history
    .slice(0, 6)
    .map((h) => {
      const reply = h.ai === null ? '' : ` → la IA respondió en **${h.ai + 1}** tras analizar ${fmt(h.nodes)} posiciones`;
      return `- [@${h.user}](https://github.com/${h.user}) jugó en **${h.cell + 1}**${reply}`;
    })
    .join('\n');

  return `${START}
<div align="center">

<table>
${rows.join('\n')}
</table>

${message}

🧑 Humanos **${humans}** · 🤖 IA **${ai}** · 🤝 Empates **${draws}**

</div>
${history ? `\n<details>\n<summary><b>Últimas jugadas</b></summary>\n\n${history}\n\n</details>\n` : ''}
${END}`;
}

function writeReadme(state: State): void {
  const readme = readFileSync(README, 'utf8');
  const a = readme.indexOf(START);
  const b = readme.indexOf(END);
  if (a < 0 || b < 0) throw new Error('No encontré los marcadores TTT en el README');
  writeFileSync(README, readme.slice(0, a) + renderSection(state) + readme.slice(b + END.length));
}

function play(): string {
  const state = load();
  const title = (process.env.TTT_TITLE ?? '').trim();
  const raw = process.env.TTT_USER ?? '';
  const user = /^[A-Za-z0-9-]{1,39}$/.test(raw) ? raw : 'alguien';
  const m = /^ttt\|(?:move\|([1-9])|new)$/.exec(title);
  if (!m) return `No entendí esa jugada 🤔 Usa los enlaces del tablero en el [perfil](${PROFILE}).`;

  if (!m[1]) {
    state.board = fresh();
    save(state);
    return `🎮 ¡Nueva partida lista, @${user}! Ve al [perfil](${PROFILE}) y haz la primera jugada.`;
  }

  if (status(state.board) !== 'playing') state.board = fresh(); // partida terminada: empieza otra
  const cell = Number(m[1]) - 1;
  if (state.board[cell]) {
    return `La casilla **${cell + 1}** ya está ocupada 😅 Elige otra en el [perfil](${PROFILE}).\n\n${emojiBoard(state.board)}`;
  }

  state.board[cell] = 'X';
  let ai: number | null = null;
  let nodes = 0;
  let st = status(state.board);
  if (st === 'playing') {
    const t0 = performance.now();
    const move = bestMove(state.board);
    ai = move.cell;
    nodes = move.nodes;
    state.board[ai] = 'O';
    st = status(state.board);
    console.log(`IA: casilla ${ai + 1}, ${nodes} nodos, ${(performance.now() - t0).toFixed(1)} ms`);
  }
  if (st === 'X') state.score.humans++;
  if (st === 'O') state.score.ai++;
  if (st === 'draw') state.score.draws++;
  state.history.unshift({ user, cell, ai, nodes, result: st });
  state.history = state.history.slice(0, 10);
  save(state);

  const lines = [`@${user} jugó en la casilla **${cell + 1}**.`];
  if (ai !== null) lines.push(`🤖 Respondí en la **${ai + 1}** después de analizar **${fmt(nodes)}** posiciones con minimax + poda alfa-beta.`);
  lines.push('', emojiBoard(state.board), '');
  lines.push(
    {
      playing: 'Tu turno 😏',
      X: '¡¿Me ganaste?! 🤯 Esto no debería pasar…',
      O: 'Gané yo 😎 ¿Revancha?',
      draw: 'Empate 🤝 Contra minimax eso es un buen resultado.',
    }[st],
  );
  lines.push('', `👉 [Volver al tablero](${PROFILE})`);
  return lines.join('\n');
}

function save(state: State): void {
  mkdirSync('game', { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  writeReadme(state);
}

const cmd = process.argv[2];
if (cmd === 'play') {
  const comment = play();
  mkdirSync('.ttt', { recursive: true });
  writeFileSync(COMMENT_FILE, comment + '\n');
  console.log(comment);
} else if (cmd === 'render') {
  save(load());
} else {
  console.error('uso: node lab/ttt/cli.ts play|render');
  process.exit(1);
}
