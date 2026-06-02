import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from './BackButton';
import './Tetris.css';

const COLS = 10, ROWS = 20, SZ = 30;
const SHAPES = [
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[0,1,0],[1,1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]],
  [[1,1,0],[0,1,1]],
  [[0,1,1],[1,1,0]],
];
const COLORS = ['#00e5ff','#ffd740','#ce93d8','#ff6e40','#448aff','#69f0ae','#ff5252'];

function emptyBoard() { return Array.from({length:ROWS},()=>Array(COLS).fill(0)); }
function rotate(shape) { return shape[0].map((_,i)=>shape.map(r=>r[i]).reverse()); }

export default function Tetris() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const boardRef = useRef(emptyBoard());
  const pieceRef = useRef(null);
  const posRef = useRef({x:0,y:0});
  const colorRef = useRef(0);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const gameOverRef = useRef(false);
  const pausedRef = useRef(false);
  const tickRef = useRef(null);

  const spawn = useCallback(() => {
    const idx = Math.floor(Math.random()*SHAPES.length);
    pieceRef.current = SHAPES[idx].map(r=>[...r]);
    colorRef.current = idx;
    posRef.current = {x:Math.floor(COLS/2)-Math.floor(pieceRef.current[0].length/2), y:0};
    if (collides(boardRef.current, pieceRef.current, posRef.current)) {
      gameOverRef.current = true;
      setGameOver(true);
    }
  },[]);

  function collides(board, shape, pos) {
    for (let r=0;r<shape.length;r++)
      for (let c=0;c<shape[r].length;c++)
        if (shape[r][c]) {
          const nr=pos.y+r, nc=pos.x+c;
          if (nr<0||nr>=ROWS||nc<0||nc>=COLS||board[nr][nc]) return true;
        }
    return false;
  }

  function merge(board, shape, pos, ci) {
    const nb = board.map(r=>[...r]);
    for (let r=0;r<shape.length;r++)
      for (let c=0;c<shape[r].length;c++)
        if (shape[r][c]) nb[pos.y+r][pos.x+c] = ci+1;
    return nb;
  }

  function clearLines(board) {
    let cleared = 0;
    const nb = board.filter(r => { if (r.every(c=>c)) { cleared++; return false; } return true; });
    while (nb.length<ROWS) nb.unshift(Array(COLS).fill(0));
    return {board:nb, cleared};
  }

  const tick = useCallback(() => {
    if (gameOverRef.current || pausedRef.current) return;
    const np = {x:posRef.current.x, y:posRef.current.y+1};
    if (!collides(boardRef.current, pieceRef.current, np)) {
      posRef.current = np;
    } else {
      boardRef.current = merge(boardRef.current, pieceRef.current, posRef.current, colorRef.current);
      const {board:cb, cleared} = clearLines(boardRef.current);
      boardRef.current = cb;
      const pts = [0,100,300,500,800][cleared]*(levelRef.current);
      scoreRef.current += pts;
      linesRef.current += cleared;
      const nl = Math.floor(linesRef.current/10)+1;
      levelRef.current = nl;
      setScore(scoreRef.current);
      setLines(linesRef.current);
      setLevel(nl);
      spawn();
    }
  },[spawn]);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0d1225';
    ctx.fillRect(0,0,COLS*SZ,ROWS*SZ);
    // grid
    ctx.strokeStyle = '#1a2a44';
    ctx.lineWidth = 0.5;
    for (let r=0;r<=ROWS;r++) { ctx.beginPath();ctx.moveTo(0,r*SZ);ctx.lineTo(COLS*SZ,r*SZ);ctx.stroke(); }
    for (let c=0;c<=COLS;c++) { ctx.beginPath();ctx.moveTo(c*SZ,0);ctx.lineTo(c*SZ,ROWS*SZ);ctx.stroke(); }
    // board
    for (let r=0;r<ROWS;r++)
      for (let c=0;c<COLS;c++)
        if (boardRef.current[r][c]) {
          ctx.fillStyle = COLORS[boardRef.current[r][c]-1];
          ctx.fillRect(c*SZ+1,r*SZ+1,SZ-2,SZ-2);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(c*SZ+1,r*SZ+1,SZ-2,4);
        }
    // piece
    if (pieceRef.current && !gameOverRef.current) {
      ctx.fillStyle = COLORS[colorRef.current];
      for (let r=0;r<pieceRef.current.length;r++)
        for (let c=0;c<pieceRef.current[r].length;c++)
          if (pieceRef.current[r][c]) {
            const px = (posRef.current.x+c)*SZ, py = (posRef.current.y+r)*SZ;
            ctx.fillRect(px+1,py+1,SZ-2,SZ-2);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(px+1,py+1,SZ-2,4);
            ctx.fillStyle = COLORS[colorRef.current];
          }
      // ghost
      let gy = posRef.current.y;
      while (!collides(boardRef.current, pieceRef.current, {x:posRef.current.x,y:gy+1})) gy++;
      if (gy !== posRef.current.y) {
        ctx.globalAlpha = 0.2;
        for (let r=0;r<pieceRef.current.length;r++)
          for (let c=0;c<pieceRef.current[r].length;c++)
            if (pieceRef.current[r][c])
              ctx.fillRect((posRef.current.x+c)*SZ+1,(gy+r)*SZ+1,SZ-2,SZ-2);
        ctx.globalAlpha = 1;
      }
    }
  },[]);

  const move = useCallback((dx) => {
    if (gameOverRef.current||pausedRef.current) return;
    const np = {x:posRef.current.x+dx, y:posRef.current.y};
    if (!collides(boardRef.current, pieceRef.current, np)) posRef.current = np;
  },[]);

  const rotatePiece = useCallback(() => {
    if (gameOverRef.current||pausedRef.current) return;
    const rotated = rotate(pieceRef.current);
    if (!collides(boardRef.current, rotated, posRef.current)) pieceRef.current = rotated;
    else {
      // wall kick
      for (const dx of [1,-1,2,-2]) {
        const np = {x:posRef.current.x+dx,y:posRef.current.y};
        if (!collides(boardRef.current, rotated, np)) { pieceRef.current = rotated; posRef.current = np; return; }
      }
    }
  },[]);

  const hardDrop = useCallback(() => {
    if (gameOverRef.current||pausedRef.current) return;
    while (!collides(boardRef.current, pieceRef.current, {x:posRef.current.x,y:posRef.current.y+1}))
      posRef.current = {x:posRef.current.x,y:posRef.current.y+1};
    tick();
  },[tick]);

  const restart = () => {
    boardRef.current = emptyBoard();
    scoreRef.current=0; linesRef.current=0; levelRef.current=1;
    gameOverRef.current=false; pausedRef.current=false;
    setScore(0);setLines(0);setLevel(1);setGameOver(false);setPaused(false);
    spawn();
  };

  useEffect(() => {
    spawn();
    const loop = () => { draw(); requestAnimationFrame(loop); };
    const af = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(af);
  },[spawn,draw]);

  useEffect(() => {
    const speed = Math.max(100, 800 - (level-1)*70);
    tickRef.current = setInterval(tick, speed);
    return () => clearInterval(tickRef.current);
  },[tick, level]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key==='ArrowLeft') move(-1);
      else if (e.key==='ArrowRight') move(1);
      else if (e.key==='ArrowDown') tick();
      else if (e.key==='ArrowUp') rotatePiece();
      else if (e.key===' ') hardDrop();
      else if (e.key==='p'||e.key==='P') { pausedRef.current=!pausedRef.current; setPaused(p=>!p); }
      draw();
    };
    window.addEventListener('keydown',handler);
    return () => window.removeEventListener('keydown',handler);
  },[move,tick,rotatePiece,hardDrop,draw]);

  return (
    <div className="tetris-root">
      <div className="tetris-side">
        <h1>Tetris</h1>
        <div className="tetris-stat"><label>Score</label><span>{score}</span></div>
        <div className="tetris-stat"><label>Lines</label><span>{lines}</span></div>
        <div className="tetris-stat"><label>Level</label><span>{level}</span></div>
        {paused && <p className="tetris-paused">PAUSED</p>}
        <div className="tetris-controls">
          <p>← → Move</p><p>↑ Rotate</p><p>↓ Soft drop</p><p>Space Hard drop</p><p>P Pause</p>
        </div>
        {gameOver && <button className="tetris-restart" onClick={restart}>Play Again</button>}
      </div>
      <div className="tetris-board-wrap">
        <canvas ref={canvasRef} width={COLS*SZ} height={ROWS*SZ} className="tetris-canvas" />
        {gameOver && <div className="tetris-over"><h2>Game Over</h2><p>Score: {score}</p></div>}
      </div>
      <BackButton />
    </div>
  );
}
