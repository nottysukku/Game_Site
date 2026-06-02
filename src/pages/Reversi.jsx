import React, { useState, useCallback } from 'react';
import BackButton from './BackButton';
import './Reversi.css';

const SIZE = 8;
const EMPTY = 0, BLACK = 1, WHITE = 2;
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

function initBoard() {
  const b = Array.from({length:SIZE},()=>Array(SIZE).fill(EMPTY));
  b[3][3]=WHITE; b[3][4]=BLACK; b[4][3]=BLACK; b[4][4]=WHITE;
  return b;
}

function getFlips(board, r, c, player) {
  if (board[r][c] !== EMPTY) return [];
  const opp = player === BLACK ? WHITE : BLACK;
  const flips = [];
  for (const [dr,dc] of DIRS) {
    const line = [];
    let nr=r+dr, nc=c+dc;
    while (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===opp) {
      line.push([nr,nc]); nr+=dr; nc+=dc;
    }
    if (line.length>0&&nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===player)
      flips.push(...line);
  }
  return flips;
}

function getValidMoves(board, player) {
  const moves = [];
  for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) {
    if (getFlips(board,r,c,player).length>0) moves.push([r,c]);
  }
  return moves;
}

function countPieces(board) {
  let b=0,w=0;
  for (const row of board) for (const cell of row) { if (cell===BLACK)b++; if (cell===WHITE)w++; }
  return {b,w};
}

// Simple AI: maximize flips + corner/edge bonuses
const WEIGHT = [
  [100,-20,10,5,5,10,-20,100],
  [-20,-50,-2,-2,-2,-2,-50,-20],
  [10,-2,1,1,1,1,-2,10],
  [5,-2,1,0,0,1,-2,5],
  [5,-2,1,0,0,1,-2,5],
  [10,-2,1,1,1,1,-2,10],
  [-20,-50,-2,-2,-2,-2,-50,-20],
  [100,-20,10,5,5,10,-20,100],
];

function aiMove(board) {
  const moves = getValidMoves(board, WHITE);
  if (!moves.length) return null;
  let best = null, bestScore = -Infinity;
  for (const [r,c] of moves) {
    const flips = getFlips(board,r,c,WHITE);
    const score = flips.length * 2 + WEIGHT[r][c];
    if (score > bestScore) { bestScore = score; best = [r,c]; }
  }
  return best;
}

export default function Reversi() {
  const [board, setBoard] = useState(initBoard);
  const [turn, setTurn] = useState(BLACK);
  const [gameOver, setGameOver] = useState(false);
  const [lastFlipped, setLastFlipped] = useState([]);

  const playMove = useCallback((r, c, player) => {
    const flips = getFlips(board,r,c,player);
    if (!flips.length) return false;
    const nb = board.map(row=>[...row]);
    nb[r][c] = player;
    for (const [fr,fc] of flips) nb[fr][fc] = player;
    setBoard(nb);
    setLastFlipped(flips.map(([fr,fc])=>fr*SIZE+fc));

    const next = player === BLACK ? WHITE : BLACK;
    const nextMoves = getValidMoves(nb, next);
    const currentMoves = getValidMoves(nb, player);
    if (nextMoves.length > 0) {
      setTurn(next);
      // AI plays after human
      if (next === WHITE) {
        setTimeout(() => {
          const move = aiMove(nb);
          if (move) {
            const flips2 = getFlips(nb, move[0], move[1], WHITE);
            const nb2 = nb.map(row=>[...row]);
            nb2[move[0]][move[1]] = WHITE;
            for (const [fr,fc] of flips2) nb2[fr][fc] = WHITE;
            setBoard(nb2);
            setLastFlipped(flips2.map(([fr,fc])=>fr*SIZE+fc));
            const bm = getValidMoves(nb2, BLACK);
            if (bm.length > 0) setTurn(BLACK);
            else if (getValidMoves(nb2, WHITE).length > 0) {
              // WHITE goes again, recurse
              setTurn(WHITE);
            } else setGameOver(true);
          }
        }, 400);
      }
    } else if (currentMoves.length > 0) {
      // Next player has no moves, current keeps turn (but we just played, check if AI)
      setTurn(player);
    } else {
      setGameOver(true);
    }
    return true;
  }, [board]);

  const handleClick = (r, c) => {
    if (gameOver || turn !== BLACK) return;
    playMove(r, c, BLACK);
  };

  const restart = () => {
    setBoard(initBoard());
    setTurn(BLACK);
    setGameOver(false);
    setLastFlipped([]);
  };

  const {b,w} = countPieces(board);
  const validMoves = turn === BLACK ? getValidMoves(board, BLACK) : [];
  const validSet = new Set(validMoves.map(([r,c])=>r*SIZE+c));

  return (
    <div className="rv-root">
      <h1>⚫ Reversi</h1>
      <div className="rv-hud">
        <span className="rv-score-b">⚫ {b}</span>
        <span className={`rv-turn ${turn===BLACK?'your':'ai'}`}>{gameOver ? 'Game Over' : turn===BLACK ? 'Your turn' : 'AI thinking...'}</span>
        <span className="rv-score-w">⚪ {w}</span>
      </div>
      <div className="rv-board">
        {board.map((row,r) => row.map((cell,c) => {
          const idx = r*SIZE+c;
          const isValid = validSet.has(idx);
          const isFlipped = lastFlipped.includes(idx);
          return (
            <div key={idx} className={`rv-cell ${isValid?'valid':''}`} onClick={()=>handleClick(r,c)}>
              {cell !== EMPTY && (
                <div className={`rv-piece ${cell===BLACK?'black':'white'} ${isFlipped?'flipped':''}`} />
              )}
              {isValid && cell===EMPTY && <div className="rv-hint" />}
            </div>
          );
        }))}
      </div>
      {gameOver && (
        <div className="rv-over">
          <h2>{b>w?'You Win! ⚫':b<w?'AI Wins! ⚪':'Draw!'}</h2>
          <p>Black: {b} — White: {w}</p>
          <button onClick={restart}>Play Again</button>
        </div>
      )}
      <button className="rv-restart" onClick={restart}>New Game</button>
      <BackButton />
    </div>
  );
}
