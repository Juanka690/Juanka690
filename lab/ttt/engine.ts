// Triqui (tic-tac-toe) contra una IA con minimax + poda alfa-beta.
export type Cell = '' | 'X' | 'O';
export type Status = 'playing' | 'X' | 'O' | 'draw';

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function status(board: Cell[]): Status {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a] as 'X' | 'O';
  }
  return board.every(Boolean) ? 'draw' : 'playing';
}

export function winningLine(board: Cell[]): number[] | null {
  return LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]) ?? null;
}

/**
 * Minimax con poda alfa-beta. La IA juega con O (maximiza).
 * Ganar pronto vale más que ganar tarde; perder tarde, menos malo que perder pronto.
 */
export function bestMove(board: Cell[], rand: () => number = Math.random): { cell: number; nodes: number; score: number } {
  let nodes = 0;
  const search = (b: Cell[], turn: 'X' | 'O', depth: number, alpha: number, beta: number): number => {
    nodes++;
    const s = status(b);
    if (s === 'O') return 10 - depth;
    if (s === 'X') return depth - 10;
    if (s === 'draw') return 0;
    let best = turn === 'O' ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = turn;
      const v = search(b, turn === 'O' ? 'X' : 'O', depth + 1, alpha, beta);
      b[i] = '';
      if (turn === 'O') {
        best = Math.max(best, v);
        alpha = Math.max(alpha, v);
      } else {
        best = Math.min(best, v);
        beta = Math.min(beta, v);
      }
      if (beta <= alpha) break; // poda: esta rama ya no puede cambiar la decisión
    }
    return best;
  };

  const scored: { cell: number; score: number }[] = [];
  const b = [...board];
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = 'O';
    scored.push({ cell: i, score: search(b, 'X', 1, -Infinity, Infinity) });
    b[i] = '';
  }
  const top = Math.max(...scored.map((s) => s.score));
  const options = scored.filter((s) => s.score === top); // entre jugadas igual de buenas, varía
  const pick = options[Math.floor(rand() * options.length)];
  return { cell: pick.cell, nodes, score: top };
}
