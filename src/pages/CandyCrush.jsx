import React, { useState, useEffect, useCallback, useRef } from 'react';
import BackButton from './BackButton';
import './CandyCrush.css';

const COLS = 8, ROWS = 8;
const CANDIES = ['🔴','🟢','🔵','🟡','🟣','🟠'];
const SPECIALS = { HBOMB: '💎', VBOMB: '⭐', BOMB: '💣' };

function rnd(n){ return Math.floor(Math.random()*n); }

function makeBoard(){
  const b = [];
  for(let r=0;r<ROWS;r++){
    b[r]=[];
    for(let c=0;c<COLS;c++){
      let candy;
      do { candy = CANDIES[rnd(CANDIES.length)]; }
      while(
        (c>=2 && b[r][c-1]===candy && b[r][c-2]===candy) ||
        (r>=2 && b[r-1][c]===candy && b[r-2][c]===candy)
      );
      b[r][c]=candy;
    }
  }
  return b;
}

function findMatches(board){
  const matched = new Set();
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS-2;c++){
      const v=board[r][c];
      if(v && !Object.values(SPECIALS).includes(v) && v===board[r][c+1] && v===board[r][c+2]){
        let end=c+2;
        while(end+1<COLS && board[r][end+1]===v) end++;
        for(let i=c;i<=end;i++) matched.add(r*COLS+i);
      }
    }
  }
  for(let c=0;c<COLS;c++){
    for(let r=0;r<ROWS-2;r++){
      const v=board[r][c];
      if(v && !Object.values(SPECIALS).includes(v) && v===board[r+1][c] && v===board[r+2][c]){
        let end=r+2;
        while(end+1<ROWS && board[end+1][c]===v) end++;
        for(let i=r;i<=end;i++) matched.add(i*COLS+c);
      }
    }
  }
  return matched;
}

function hasValidMove(board){
  const trySwap=(r1,c1,r2,c2)=>{
    const copy=board.map(row=>[...row]);
    [copy[r1][c1],copy[r2][c2]]=[copy[r2][c2],copy[r1][c1]];
    return findMatches(copy).size>0;
  };
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(c+1<COLS && trySwap(r,c,r,c+1)) return true;
      if(r+1<ROWS && trySwap(r,c,r+1,c)) return true;
    }
  }
  return false;
}

export default function CandyCrush(){
  const [board, setBoard] = useState(()=>makeBoard());
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(30);
  const [combo, setCombo] = useState(0);
  const [comboText, setComboText] = useState('');
  const [animating, setAnimating] = useState(false);
  const [matched, setMatched] = useState(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [target, setTarget] = useState(1000);
  const comboRef = useRef(0);

  const processBoard = useCallback((b, currentCombo = 0) => {
    const m = findMatches(b);
    if(m.size === 0){
      setAnimating(false);
      setCombo(0);
      comboRef.current = 0;
      if(!hasValidMove(b)){
        setBoard(makeBoard());
      }
      return;
    }

    const newCombo = currentCombo + 1;
    comboRef.current = newCombo;
    setCombo(newCombo);
    const pts = m.size * 10 * newCombo;
    setScore(prev => prev + pts);

    if(newCombo >= 2){
      setComboText(`${newCombo}x Combo! +${pts}`);
      setTimeout(()=>setComboText(''), 800);
    }

    setMatched(m);

    setTimeout(()=>{
      const copy = b.map(row=>[...row]);
      m.forEach(idx=>{
        const r=Math.floor(idx/COLS), c=idx%COLS;
        copy[r][c]=null;
      });

      for(let c=0;c<COLS;c++){
        let writeRow=ROWS-1;
        for(let r=ROWS-1;r>=0;r--){
          if(copy[r][c]!==null){
            copy[writeRow][c]=copy[r][c];
            if(writeRow!==r) copy[r][c]=null;
            writeRow--;
          }
        }
        for(let r=writeRow;r>=0;r--){
          copy[r][c]=CANDIES[rnd(CANDIES.length)];
        }
      }

      setBoard(copy);
      setMatched(new Set());

      setTimeout(()=>processBoard(copy, newCombo), 200);
    }, 300);
  }, []);

  const handleClick = useCallback((r, c) => {
    if(animating || gameOver) return;

    if(!selected){
      setSelected({r,c});
      return;
    }

    const dr=Math.abs(selected.r-r), dc=Math.abs(selected.c-c);
    if((dr===1&&dc===0)||(dr===0&&dc===1)){
      const copy = board.map(row=>[...row]);
      [copy[selected.r][selected.c], copy[r][c]] = [copy[r][c], copy[selected.r][selected.c]];

      const m = findMatches(copy);
      if(m.size > 0){
        setBoard(copy);
        setMoves(prev=>prev-1);
        setAnimating(true);
        setSelected(null);
        setTimeout(()=>processBoard(copy, 0), 100);
      } else {
        setSelected(null);
      }
    } else {
      setSelected({r,c});
    }
  }, [selected, board, animating, gameOver, processBoard]);

  useEffect(()=>{
    if(moves <= 0 && !animating){
      setGameOver(true);
    }
  },[moves, animating]);

  useEffect(()=>{
    if(score >= target && !gameOver){
      setLevel(prev=>prev+1);
      setTarget(prev=>prev+1500);
      setMoves(prev=>prev+10);
    }
  },[score, target, gameOver]);

  const restart = () => {
    setBoard(makeBoard());
    setScore(0);
    setMoves(30);
    setCombo(0);
    setGameOver(false);
    setSelected(null);
    setLevel(1);
    setTarget(1000);
  };

  return (
    <div className="candy-root">
      <BackButton />
      <div className="candy-hud">
        <div>Score: <span>{score}</span></div>
        <div>Level: <span>{level}</span></div>
        <div>Target: <span>{target}</span></div>
        <div>Moves: <span>{moves}</span></div>
      </div>

      <div className="candy-board">
        {comboText && <div className="candy-combo">{comboText}</div>}
        {board.map((row, r) =>
          row.map((candy, c) => (
            <div
              key={`${r}-${c}`}
              className={`candy-cell${selected && selected.r===r && selected.c===c ? ' selected' : ''}${matched.has(r*COLS+c) ? ' matched' : ''}`}
              style={{gridRow: r+1, gridColumn: c+1}}
              onClick={()=>handleClick(r, c)}
            >
              {candy}
            </div>
          ))
        )}

        {gameOver && (
          <div className="candy-overlay">
            <h2>{score >= target ? '🎉 Level Up!' : 'Game Over'}</h2>
            <p>Final Score: {score}</p>
            <p>Level Reached: {level}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
