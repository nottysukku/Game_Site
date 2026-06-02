import React, { useState, useCallback } from 'react';
import BackButton from './BackButton';
import './TicTacToe.css';

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function getWinner(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a], line: [a,b,c] };
  }
  return board.every(Boolean) ? { winner: 'T', line: null } : null;
}

function minimax(board, isMax, depth = 0) {
  const res = getWinner(board);
  if (res) {
    if (res.winner === 'O') return 10 - depth;
    if (res.winner === 'X') return depth - 10;
    return 0;
  }
  let best = isMax ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = isMax ? 'O' : 'X';
      const val = minimax(board, !isMax, depth + 1);
      board[i] = null;
      best = isMax ? Math.max(best, val) : Math.min(best, val);
    }
  }
  return best;
}

function cpuMove(board) {
  let bestVal = -Infinity, bestIdx = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const val = minimax(board, false, 0);
      board[i] = null;
      if (val > bestVal) { bestVal = val; bestIdx = i; }
    }
  }
  return bestIdx;
}

export default function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [winInfo, setWinInfo] = useState(null);
  const [stats, setStats] = useState({ wins: 0, losses: 0, ties: 0 });
  const [message, setMessage] = useState('Your move (X)');
  const [animCell, setAnimCell] = useState(null);

  const handleClick = useCallback((i) => {
    if (board[i] || winInfo) return;
    const next = [...board];
    next[i] = 'X';
    setBoard(next);
    setAnimCell(i);

    const res = getWinner(next);
    if (res) {
      setWinInfo(res);
      if (res.winner === 'T') { setMessage('Tie!'); setStats(s => ({...s, ties: s.ties+1})); }
      else { setMessage('X wins!'); setStats(s => ({...s, wins: s.wins+1})); }
      return;
    }

    // CPU move after a short delay
    setTimeout(() => {
      const ci = cpuMove(next);
      if (ci >= 0) {
        next[ci] = 'O';
        setBoard([...next]);
        setAnimCell(ci);
        const res2 = getWinner(next);
        if (res2) {
          setWinInfo(res2);
          if (res2.winner === 'T') { setMessage('Tie!'); setStats(s => ({...s, ties: s.ties+1})); }
          else { setMessage('O wins!'); setStats(s => ({...s, losses: s.losses+1})); }
        } else {
          setMessage('Your move (X)');
        }
      }
    }, 300);
  }, [board, winInfo]);

  const restart = () => {
    setBoard(Array(9).fill(null));
    setWinInfo(null);
    setMessage('Your move (X)');
    setAnimCell(null);
  };

  return (
    <div className="ttt-root">
      <h1 className="ttt-title">Tic-Tac-Toe</h1>
      <div className="ttt-stats">
        <span className="stat-win">W: {stats.wins}</span>
        <span className="stat-tie">T: {stats.ties}</span>
        <span className="stat-loss">L: {stats.losses}</span>
      </div>
      <div className="ttt-board">
        {board.map((v, i) => (
          <button
            key={i}
            className={`ttt-cell ${v ? 'filled' : ''} ${v === 'X' ? 'x' : v === 'O' ? 'o' : ''} ${winInfo?.line?.includes(i) ? 'win-cell' : ''} ${animCell === i ? 'pop' : ''}`}
            onClick={() => handleClick(i)}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="ttt-message">{message}</div>
      <button className="ttt-restart" onClick={restart}>Restart</button>
      <BackButton />
    </div>
  );
}
