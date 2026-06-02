import React, { useState, useCallback, useEffect } from 'react';
import BackButton from './BackButton';
import './Sudoku.css';

// Simple Sudoku generator
function generatePuzzle(difficulty) {
  // Start with a solved board, then remove cells
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));

  function isValid(b, r, c, num) {
    for (let i = 0; i < 9; i++) { if (b[r][i] === num || b[i][c] === num) return false; }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = br; i < br + 3; i++) for (let j = bc; j < bc + 3; j++) if (b[i][j] === num) return false;
    return true;
  }

  function solve(b) {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const n of nums) {
          if (isValid(b, r, c, n)) {
            b[r][c] = n;
            if (solve(b)) return true;
            b[r][c] = 0;
          }
        }
        return false;
      }
    }
    return true;
  }

  solve(board);
  const solution = board.map(r => [...r]);
  const puzzle = board.map(r => [...r]);

  // Remove cells based on difficulty
  const toRemove = difficulty === 'easy' ? 35 : difficulty === 'medium' ? 45 : 55;
  let removed = 0;
  const cells = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells.push([r, c]);
  cells.sort(() => Math.random() - 0.5);
  for (const [r, c] of cells) {
    if (removed >= toRemove) break;
    puzzle[r][c] = 0;
    removed++;
  }

  return { puzzle, solution };
}

export default function Sudoku() {
  const [difficulty, setDifficulty] = useState('medium');
  const [puzzle, setPuzzle] = useState(null);
  const [solution, setSolution] = useState(null);
  const [grid, setGrid] = useState(null);
  const [fixed, setFixed] = useState(null);
  const [selected, setSelected] = useState(null);
  const [errors, setErrors] = useState(new Set());
  const [won, setWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = React.useRef(null);

  const newGame = useCallback((diff) => {
    const d = diff || difficulty;
    const { puzzle: p, solution: s } = generatePuzzle(d);
    setPuzzle(p);
    setSolution(s);
    setGrid(p.map(r => [...r]));
    setFixed(p.map(r => r.map(v => v !== 0)));
    setSelected(null);
    setErrors(new Set());
    setWon(false);
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  }, [difficulty]);

  useEffect(() => { newGame(); }, []);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const checkComplete = (g, s) => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (g[r][c] !== s[r][c]) return false;
    return true;
  };

  const handleCellClick = (r, c) => {
    if (won) return;
    setSelected([r, c]);
  };

  const handleInput = (num) => {
    if (!selected || won) return;
    const [r, c] = selected;
    if (fixed[r][c]) return;
    const ng = grid.map(row => [...row]);
    ng[r][c] = num;
    setGrid(ng);

    // Check errors
    const ne = new Set();
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      if (ng[i][j] !== 0 && ng[i][j] !== solution[i][j]) ne.add(`${i}-${j}`);
    }
    setErrors(ne);

    if (num !== 0 && checkComplete(ng, solution)) {
      setWon(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    if (!grid) return;
    const handler = (e) => {
      if (won) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) handleInput(num);
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') handleInput(0);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!grid) return <div className="su-loading">Loading…</div>;

  return (
    <div className="su-root">
      <h1>Sudoku</h1>
      <div className="su-top">
        <div className="su-diffs">
          {['easy', 'medium', 'hard'].map(d => (
            <button key={d} className={d === difficulty ? 'active' : ''}
              onClick={() => { setDifficulty(d); newGame(d); }}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <span className="su-timer">⏱ {formatTime(timer)}</span>
      </div>

      <div className="su-grid">
        {grid.map((row, r) => row.map((val, c) => {
          const isFixed = fixed[r][c];
          const isSel = selected && selected[0] === r && selected[1] === c;
          const isHighlight = selected && (selected[0] === r || selected[1] === c ||
            (Math.floor(selected[0] / 3) === Math.floor(r / 3) && Math.floor(selected[1] / 3) === Math.floor(c / 3)));
          const isSameNum = selected && val !== 0 && grid[selected[0]][selected[1]] === val;
          const isErr = errors.has(`${r}-${c}`);
          const borderR = (c + 1) % 3 === 0 && c < 8 ? 'br' : '';
          const borderB = (r + 1) % 3 === 0 && r < 8 ? 'bb' : '';
          return (
            <div key={`${r}-${c}`}
              className={`su-cell ${isFixed ? 'fixed' : ''} ${isSel ? 'sel' : ''} ${isHighlight ? 'hl' : ''} ${isSameNum ? 'same' : ''} ${isErr ? 'err' : ''} ${borderR} ${borderB}`}
              onClick={() => handleCellClick(r, c)}>
              {val > 0 ? val : ''}
            </div>
          );
        }))}
      </div>

      <div className="su-numpad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button key={n} onClick={() => handleInput(n)}>{n}</button>
        ))}
        <button onClick={() => handleInput(0)}>⌫</button>
      </div>

      {won && (
        <div className="su-win">
          <h2>🎉 Solved!</h2>
          <p>Time: {formatTime(timer)}</p>
          <button onClick={() => newGame()}>New Puzzle</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
