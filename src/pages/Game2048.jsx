import React, { useState, useCallback, useEffect } from 'react';
import BackButton from './BackButton';
import './Game2048.css';

function emptyGrid() { return Array.from({ length: 4 }, () => Array(4).fill(0)); }

function addRandom(grid) {
  const empty = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (grid[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const ng = grid.map(row => [...row]);
  ng[r][c] = Math.random() < 0.9 ? 2 : 4;
  return ng;
}

function slideRow(row) {
  let filtered = row.filter(v => v !== 0);
  let score = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2; score += filtered[i]; filtered[i + 1] = 0;
    }
  }
  filtered = filtered.filter(v => v !== 0);
  while (filtered.length < 4) filtered.push(0);
  return { row: filtered, score };
}

function moveLeft(grid) {
  let sc = 0;
  const ng = grid.map(row => { const { row: r, score } = slideRow([...row]); sc += score; return r; });
  return { grid: ng, score: sc };
}
function rotate90(g) {
  const n = emptyGrid();
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) n[c][3 - r] = g[r][c];
  return n;
}
function moveRight(g) { let ng = rotate90(rotate90(g)); const res = moveLeft(ng); ng = rotate90(rotate90(res.grid)); return { grid: ng, score: res.score }; }
function moveUp(g) { let ng = rotate90(rotate90(rotate90(g))); const res = moveLeft(ng); ng = rotate90(res.grid); return { grid: ng, score: res.score }; }
function moveDown(g) { let ng = rotate90(g); const res = moveLeft(ng); ng = rotate90(rotate90(rotate90(res.grid))); return { grid: ng, score: res.score }; }

function canMove(grid) {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (grid[r][c] === 0) return true;
    if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
    if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
  }
  return false;
}

function gridsEqual(a, b) {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (a[r][c] !== b[r][c]) return false;
  return true;
}

const TILE_COLORS = {
  0: '#1a2040', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
  32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
  512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
};
const DARK_TILES = new Set([0, 2, 4]);

export default function Game2048() {
  const [grid, setGrid] = useState(() => addRandom(addRandom(emptyGrid())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('2048_best') || '0'));
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const doMove = useCallback((moveFn) => {
    if (gameOver) return;
    setGrid(prev => {
      const { grid: ng, score: sc } = moveFn(prev);
      if (gridsEqual(prev, ng)) return prev;
      const withNew = addRandom(ng);
      setScore(s => {
        const ns = s + sc;
        if (ns > best) { setBest(ns); localStorage.setItem('2048_best', ns); }
        return ns;
      });
      // Check 2048
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (withNew[r][c] === 2048 && !won) setWon(true);
      if (!canMove(withNew)) setGameOver(true);
      return withNew;
    });
  }, [gameOver, won, best]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); doMove(moveLeft); }
      if (e.key === 'ArrowRight') { e.preventDefault(); doMove(moveRight); }
      if (e.key === 'ArrowUp') { e.preventDefault(); doMove(moveUp); }
      if (e.key === 'ArrowDown') { e.preventDefault(); doMove(moveDown); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doMove]);

  // Touch support
  const touchRef = React.useRef(null);
  const onTouchStart = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) > Math.abs(dy)) { dx > 30 ? doMove(moveRight) : dx < -30 && doMove(moveLeft); }
    else { dy > 30 ? doMove(moveDown) : dy < -30 && doMove(moveUp); }
    touchRef.current = null;
  };

  const reset = () => {
    setGrid(addRandom(addRandom(emptyGrid())));
    setScore(0); setGameOver(false); setWon(false);
  };

  return (
    <div className="g2-root" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <h1>2048</h1>
      <div className="g2-scores">
        <div className="g2-sc">Score<br /><strong>{score}</strong></div>
        <div className="g2-sc">Best<br /><strong>{best}</strong></div>
        <button onClick={reset}>New Game</button>
      </div>
      <div className="g2-board">
        {grid.flat().map((val, i) => (
          <div key={i} className={`g2-tile ${val > 0 ? 'pop' : ''}`}
            style={{
              background: TILE_COLORS[val] || '#3c3a32',
              color: DARK_TILES.has(val) ? '#776e65' : '#f9f6f2',
              fontSize: val >= 1024 ? '1.5rem' : val >= 128 ? '1.8rem' : '2.2rem',
            }}>
            {val > 0 ? val : ''}
          </div>
        ))}
      </div>
      <p className="g2-hint">Use arrow keys or swipe</p>
      {gameOver && (
        <div className="g2-over"><h2>Game Over!</h2><p>Score: {score}</p><button onClick={reset}>Try Again</button></div>
      )}
      {won && !gameOver && (
        <div className="g2-win"><h2>🎉 2048!</h2><p>You reached 2048!</p>
          <button onClick={() => setWon(false)}>Keep Playing</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
