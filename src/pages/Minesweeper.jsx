import React, { useState, useCallback, useEffect, useRef } from 'react';
import BackButton from './BackButton';
import './Minesweeper.css';

const DIFFS = [
  { label: 'Easy', rows: 9, cols: 9, mines: 10 },
  { label: 'Medium', rows: 16, cols: 16, mines: 40 },
  { label: 'Hard', rows: 16, cols: 30, mines: 99 },
];

function createBoard(rows, cols, mines, firstR, firstC) {
  const b = Array.from({ length: rows }, () => Array(cols).fill(0));
  // Place mines
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows), c = Math.floor(Math.random() * cols);
    if (b[r][c] === -1 || (Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1)) continue;
    b[r][c] = -1; placed++;
  }
  // Count neighbors
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (b[r][c] === -1) continue;
    let cnt = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && b[nr][nc] === -1) cnt++;
    }
    b[r][c] = cnt;
  }
  return b;
}

export default function Minesweeper() {
  const [diffIdx, setDiffIdx] = useState(0);
  const [board, setBoard] = useState(null);
  const [revealed, setRevealed] = useState(null);
  const [flagged, setFlagged] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [firstClick, setFirstClick] = useState(true);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  const diff = DIFFS[diffIdx];

  const startGame = useCallback((di) => {
    const d = DIFFS[di !== undefined ? di : diffIdx];
    setBoard(null); setRevealed(Array.from({ length: d.rows }, () => Array(d.cols).fill(false)));
    setFlagged(Array.from({ length: d.rows }, () => Array(d.cols).fill(false)));
    setGameOver(false); setWon(false); setFirstClick(true); setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [diffIdx]);

  useEffect(() => { startGame(); }, []);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const reveal = (b, rev, r, c) => {
    if (r < 0 || r >= diff.rows || c < 0 || c >= diff.cols || rev[r][c]) return;
    rev[r][c] = true;
    if (b[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) reveal(b, rev, r + dr, c + dc);
    }
  };

  const checkWin = (rev, b) => {
    for (let r = 0; r < diff.rows; r++)
      for (let c = 0; c < diff.cols; c++)
        if (!rev[r][c] && b[r][c] !== -1) return false;
    return true;
  };

  const handleClick = (r, c) => {
    if (gameOver || won) return;
    if (flagged && flagged[r][c]) return;
    let b = board;
    if (firstClick) {
      b = createBoard(diff.rows, diff.cols, diff.mines, r, c);
      setBoard(b); setFirstClick(false);
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    if (!b) return;
    if (b[r][c] === -1) {
      // Game over
      const rev = Array.from({ length: diff.rows }, () => Array(diff.cols).fill(true));
      setRevealed(rev); setGameOver(true);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const rev = revealed.map(row => [...row]);
    reveal(b, rev, r, c);
    setRevealed(rev);
    if (checkWin(rev, b)) {
      setWon(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleRightClick = (e, r, c) => {
    e.preventDefault();
    if (gameOver || won || !revealed || revealed[r][c]) return;
    const nf = flagged.map(row => [...row]);
    nf[r][c] = !nf[r][c];
    setFlagged(nf);
  };

  const mineCount = diff.mines - (flagged ? flagged.flat().filter(Boolean).length : 0);
  const NUM_COLORS = ['', '#42a5f5', '#66bb6a', '#ff5252', '#7e57c2', '#ff9800', '#00bcd4', '#333', '#999'];

  return (
    <div className="ms-root">
      <div className="ms-top">
        <div className="ms-diffs">
          {DIFFS.map((d, i) => (
            <button key={d.label} className={i === diffIdx ? 'active' : ''} onClick={() => { setDiffIdx(i); startGame(i); }}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="ms-info">
          <span>💣 {mineCount}</span>
          <button className="ms-restart" onClick={() => startGame()}>😊 New</button>
          <span>⏱ {timer}s</span>
        </div>
      </div>

      <div className="ms-board" style={{ gridTemplateColumns: `repeat(${diff.cols}, 1fr)` }}>
        {Array.from({ length: diff.rows }).map((_, r) =>
          Array.from({ length: diff.cols }).map((_, c) => {
            const isRev = revealed && revealed[r][c];
            const isFlag = flagged && flagged[r][c];
            const val = board ? board[r][c] : 0;
            return (
              <div key={`${r}-${c}`}
                className={`ms-cell ${isRev ? 'revealed' : 'hidden'} ${isRev && val === -1 ? 'mine' : ''}`}
                onClick={() => handleClick(r, c)}
                onContextMenu={(e) => handleRightClick(e, r, c)}>
                {isFlag && !isRev && '🚩'}
                {isRev && val === -1 && '💣'}
                {isRev && val > 0 && <span style={{ color: NUM_COLORS[val] }}>{val}</span>}
              </div>
            );
          })
        )}
      </div>

      {(gameOver || won) && (
        <div className="ms-overlay">
          <h2>{won ? '🎉 You Win!' : '💥 Game Over!'}</h2>
          <p>Time: {timer}s</p>
          <button onClick={() => startGame()}>Play Again</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
