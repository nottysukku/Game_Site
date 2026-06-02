import React, { useState, useCallback } from "react";
import BackButton from "./BackButton";
import "./ConnectFour.css";

const ROWS = 6,
  COLS = 7;
const EMPTY = 0,
  P1 = 1,
  P2 = 2;

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function drop(board, col, player) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) {
      const nb = board.map((row) => [...row]);
      nb[r][col] = player;
      return { board: nb, row: r };
    }
  }
  return null;
}

function checkWin(board, player) {
  // Horizontal, vertical, diagonal
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (
        c + 3 < COLS &&
        board[r][c] === player &&
        board[r][c + 1] === player &&
        board[r][c + 2] === player &&
        board[r][c + 3] === player
      )
        return [
          [r, c],
          [r, c + 1],
          [r, c + 2],
          [r, c + 3],
        ];
      if (
        r + 3 < ROWS &&
        board[r][c] === player &&
        board[r + 1][c] === player &&
        board[r + 2][c] === player &&
        board[r + 3][c] === player
      )
        return [
          [r, c],
          [r + 1, c],
          [r + 2, c],
          [r + 3, c],
        ];
      if (
        r + 3 < ROWS &&
        c + 3 < COLS &&
        board[r][c] === player &&
        board[r + 1][c + 1] === player &&
        board[r + 2][c + 2] === player &&
        board[r + 3][c + 3] === player
      )
        return [
          [r, c],
          [r + 1, c + 1],
          [r + 2, c + 2],
          [r + 3, c + 3],
        ];
      if (
        r + 3 < ROWS &&
        c - 3 >= 0 &&
        board[r][c] === player &&
        board[r + 1][c - 1] === player &&
        board[r + 2][c - 2] === player &&
        board[r + 3][c - 3] === player
      )
        return [
          [r, c],
          [r + 1, c - 1],
          [r + 2, c - 2],
          [r + 3, c - 3],
        ];
    }
  return null;
}

function isFull(board) {
  return board[0].every((c) => c !== EMPTY);
}

function evaluate(board) {
  const score = (player, opp) => {
    let s = 0;
    // Center column preference
    for (let r = 0; r < ROWS; r++) if (board[r][3] === player) s += 3;
    // Count windows
    const count = (cells) => {
      const p = cells.filter((v) => v === player).length;
      const e = cells.filter((v) => v === EMPTY).length;
      const o = cells.filter((v) => v === opp).length;
      if (p === 4) return 100;
      if (p === 3 && e === 1) return 5;
      if (p === 2 && e === 2) return 2;
      if (o === 3 && e === 1) return -4;
      return 0;
    };
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c <= COLS - 4; c++)
        s += count([
          board[r][c],
          board[r][c + 1],
          board[r][c + 2],
          board[r][c + 3],
        ]);
    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 0; c < COLS; c++)
        s += count([
          board[r][c],
          board[r + 1][c],
          board[r + 2][c],
          board[r + 3][c],
        ]);
    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 0; c <= COLS - 4; c++)
        s += count([
          board[r][c],
          board[r + 1][c + 1],
          board[r + 2][c + 2],
          board[r + 3][c + 3],
        ]);
    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 3; c < COLS; c++)
        s += count([
          board[r][c],
          board[r + 1][c - 1],
          board[r + 2][c - 2],
          board[r + 3][c - 3],
        ]);
    return s;
  };
  return score(P2, P1) - score(P1, P2);
}

function minimax(board, depth, alpha, beta, maximising) {
  if (checkWin(board, P2)) return { score: 10000, col: -1 };
  if (checkWin(board, P1)) return { score: -10000, col: -1 };
  if (isFull(board) || depth === 0) return { score: evaluate(board), col: -1 };

  const validCols = [];
  for (let c = 0; c < COLS; c++) if (board[0][c] === EMPTY) validCols.push(c);
  // Order: center first
  validCols.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));

  if (maximising) {
    let best = -Infinity,
      bestCol = validCols[0];
    for (const c of validCols) {
      const res = drop(board, c, P2);
      if (!res) continue;
      const { score } = minimax(res.board, depth - 1, alpha, beta, false);
      if (score > best) {
        best = score;
        bestCol = c;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: best, col: bestCol };
  } else {
    let best = Infinity,
      bestCol = validCols[0];
    for (const c of validCols) {
      const res = drop(board, c, P1);
      if (!res) continue;
      const { score } = minimax(res.board, depth - 1, alpha, beta, true);
      if (score < best) {
        best = score;
        bestCol = c;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: best, col: bestCol };
  }
}

export default function ConnectFour() {
  const [board, setBoard] = useState(emptyBoard);
  const [turn, setTurn] = useState(P1);
  const [winCells, setWinCells] = useState(null);
  const [status, setStatus] = useState("Your turn");
  const [thinking, setThinking] = useState(false);
  const [hoverCol, setHoverCol] = useState(-1);

  const reset = useCallback(() => {
    setBoard(emptyBoard());
    setTurn(P1);
    setWinCells(null);
    setStatus("Your turn");
    setThinking(false);
  }, []);

  const handleDrop = (col) => {
    if (turn !== P1 || winCells || thinking) return;
    const res = drop(board, col, P1);
    if (!res) return;
    const win = checkWin(res.board, P1);
    if (win) {
      setBoard(res.board);
      setWinCells(win);
      setStatus("🎉 You win!");
      return;
    }
    if (isFull(res.board)) {
      setBoard(res.board);
      setStatus("Draw!");
      return;
    }
    setBoard(res.board);
    setTurn(P2);
    setStatus("AI thinking…");
    setThinking(true);
    setTimeout(() => {
      const { col: aiCol } = minimax(res.board, 2, -Infinity, Infinity, true);
      const aiRes = drop(res.board, aiCol, P2);
      if (!aiRes) {
        setThinking(false);
        return;
      }
      const aiWin = checkWin(aiRes.board, P2);
      if (aiWin) {
        setBoard(aiRes.board);
        setWinCells(aiWin);
        setStatus("AI wins!");
        setThinking(false);
        return;
      }
      if (isFull(aiRes.board)) {
        setBoard(aiRes.board);
        setStatus("Draw!");
        setThinking(false);
        return;
      }
      setBoard(aiRes.board);
      setTurn(P1);
      setStatus("Your turn");
      setThinking(false);
    }, 100);
  };

  const isWinCell = (r, c) =>
    winCells && winCells.some(([wr, wc]) => wr === r && wc === c);

  return (
    <div className="c4-root">
      <h1>Connect Four</h1>
      <div className="c4-status">{status}</div>
      <div className="c4-board">
        {/* Column hover indicators */}
        <div className="c4-top-row">
          {Array.from({ length: COLS }).map((_, c) => (
            <div
              key={c}
              className="c4-top-cell"
              onMouseEnter={() => setHoverCol(c)}
              onMouseLeave={() => setHoverCol(-1)}
              onClick={() => handleDrop(c)}
            >
              {hoverCol === c && turn === P1 && !winCells && (
                <div className="c4-preview" />
              )}
            </div>
          ))}
        </div>
        {board.map((row, r) => (
          <div key={r} className="c4-row">
            {row.map((cell, c) => (
              <div
                key={c}
                className={`c4-cell ${isWinCell(r, c) ? "win" : ""}`}
                onClick={() => handleDrop(c)}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(-1)}
              >
                <div
                  className={`c4-disc ${cell === P1 ? "red" : cell === P2 ? "yellow" : ""} ${cell !== EMPTY ? "drop" : ""}`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      {(winCells || status === "Draw!") && (
        <button className="c4-reset" onClick={reset}>
          Play Again
        </button>
      )}
      <BackButton />
    </div>
  );
}
