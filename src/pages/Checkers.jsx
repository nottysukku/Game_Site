import React, { useState, useCallback } from 'react';
import BackButton from './BackButton';
import './Checkers.css';

const EMPTY=0,WP=1,WK=2,BP=3,BK=4;
const isW=p=>p===WP||p===WK;
const isB=p=>p===BP||p===BK;
const isKing=p=>p===WK||p===BK;

function initBoard(){
  const b=Array(64).fill(EMPTY);
  for(let r=0;r<3;r++) for(let c=0;c<8;c++) if((r+c)%2===1) b[r*8+c]=BP;
  for(let r=5;r<8;r++) for(let c=0;c<8;c++) if((r+c)%2===1) b[r*8+c]=WP;
  return b;
}

function getMoves(board,idx){
  const p=board[idx]; if(p===EMPTY)return[];
  const r=Math.floor(idx/8),c=idx%8;
  const moves=[],jumps=[];
  const dirs=isKing(p)?[[-1,-1],[-1,1],[1,-1],[1,1]]:isW(p)?[[-1,-1],[-1,1]]:[[1,-1],[1,1]];
  const enemy=isW(p)?isB:isW;
  for(const[dr,dc]of dirs){
    const nr=r+dr,nc=c+dc;
    if(nr>=0&&nr<8&&nc>=0&&nc<8){
      if(board[nr*8+nc]===EMPTY) moves.push({from:idx,to:nr*8+nc});
      else if(enemy(board[nr*8+nc])){
        const jr=nr+dr,jc=nc+dc;
        if(jr>=0&&jr<8&&jc>=0&&jc<8&&board[jr*8+jc]===EMPTY)
          jumps.push({from:idx,to:jr*8+jc,captured:nr*8+nc});
      }
    }
  }
  return jumps.length>0?jumps:moves;
}

function getAllMoves(board,isWhiteTurn){
  const check=isWhiteTurn?isW:isB;
  let allJumps=[],allMoves=[];
  for(let i=0;i<64;i++){
    if(!check(board[i]))continue;
    const m=getMoves(board,i);
    m.forEach(mv=>{mv.captured?allJumps.push(mv):allMoves.push(mv);});
  }
  return allJumps.length>0?allJumps:allMoves;
}

function applyMove(board,move){
  const nb=[...board];
  nb[move.to]=nb[move.from]; nb[move.from]=EMPTY;
  if(move.captured!==undefined) nb[move.captured]=EMPTY;
  // King promotion
  const r=Math.floor(move.to/8);
  if(nb[move.to]===WP&&r===0) nb[move.to]=WK;
  if(nb[move.to]===BP&&r===7) nb[move.to]=BK;
  return nb;
}

function evaluate(board){
  let s=0;
  for(let i=0;i<64;i++){
    if(board[i]===WP) s+=3;
    if(board[i]===WK) s+=7;
    if(board[i]===BP) s-=3;
    if(board[i]===BK) s-=7;
  }
  return s;
}

function minimax(board,depth,alpha,beta,maximising){
  if(depth===0){return{score:evaluate(board),move:null};}
  const moves=getAllMoves(board,!maximising); // black=min
  if(moves.length===0) return{score:maximising?-100:100,move:null};
  let best=null;
  if(maximising){
    let mx=-Infinity;
    for(const m of moves){
      const nb=applyMove(board,m);
      // Check multi-jump
      let finalBoard=nb;
      if(m.captured!==undefined){
        const chain=getMoves(nb,m.to).filter(x=>x.captured!==undefined);
        if(chain.length>0){
          // Simple: just take first chain jump for AI
          finalBoard=applyMove(nb,chain[0]);
        }
      }
      const{score}=minimax(finalBoard,depth-1,alpha,beta,false);
      if(score>mx){mx=score;best=m;}
      alpha=Math.max(alpha,score);if(beta<=alpha)break;
    }
    return{score:mx,move:best};
  }else{
    let mn=Infinity;
    for(const m of moves){
      const nb=applyMove(board,m);
      let finalBoard=nb;
      if(m.captured!==undefined){
        const chain=getMoves(nb,m.to).filter(x=>x.captured!==undefined);
        if(chain.length>0) finalBoard=applyMove(nb,chain[0]);
      }
      const{score}=minimax(finalBoard,depth-1,alpha,beta,true);
      if(score<mn){mn=score;best=m;}
      beta=Math.min(beta,score);if(beta<=alpha)break;
    }
    return{score:mn,move:best};
  }
}

export default function Checkers(){
  const[board,setBoard]=useState(initBoard);
  const[selected,setSelected]=useState(null);
  const[legalMoves,setLegalMoves]=useState([]);
  const[turn,setTurn]=useState('w');
  const[status,setStatus]=useState('');
  const[thinking,setThinking]=useState(false);
  const[wCount,setWCount]=useState(12);
  const[bCount,setBCount]=useState(12);

  const countPieces=(b)=>{
    let w=0,bl=0;
    b.forEach(p=>{if(isW(p))w++;if(isB(p))bl++;});
    return{w,b:bl};
  };

  const checkWin=(b)=>{
    const{w,b:bl}=countPieces(b);
    setWCount(w);setBCount(bl);
    if(bl===0){setStatus('You win!');return true;}
    if(w===0){setStatus('AI wins!');return true;}
    return false;
  };

  const handleClick=(i)=>{
    if(turn!=='w'||thinking||status)return;
    const p=board[i];
    if(selected!==null){
      const mv=legalMoves.find(m=>m.to===i);
      if(mv){
        let nb=applyMove(board,mv);
        // Multi-jump
        if(mv.captured!==undefined){
          const chain=getMoves(nb,mv.to).filter(x=>x.captured!==undefined);
          if(chain.length>0){
            setBoard(nb);setSelected(mv.to);
            setLegalMoves(chain);return;
          }
        }
        setBoard(nb);setSelected(null);setLegalMoves([]);
        if(!checkWin(nb)){setTurn('b');setTimeout(()=>aiMove(nb),300);}
        return;
      }
    }
    if(isW(p)){
      setSelected(i);
      const allMv=getAllMoves(board,true);
      setLegalMoves(allMv.filter(m=>m.from===i));
    }else{setSelected(null);setLegalMoves([]);}
  };

  const aiMove=(b)=>{
    setThinking(true);
    setTimeout(()=>{
      const moves=getAllMoves(b,false);
      if(moves.length===0){setStatus('You win!');setThinking(false);return;}
      const{move}=minimax(b,4,-Infinity,Infinity,false);
      if(!move){setStatus('You win!');setThinking(false);return;}
      let nb=applyMove(b,move);
      // Multi-jump for AI
      if(move.captured!==undefined){
        let chain=getMoves(nb,move.to).filter(x=>x.captured!==undefined);
        while(chain.length>0){
          nb=applyMove(nb,chain[0]);
          chain=getMoves(nb,chain[0].to).filter(x=>x.captured!==undefined);
        }
      }
      setBoard(nb);setThinking(false);
      if(!checkWin(nb)){
        const pmoves=getAllMoves(nb,true);
        if(pmoves.length===0) setStatus('AI wins!');
        else setTurn('w');
      }
    },50);
  };

  const reset=()=>{
    setBoard(initBoard());setSelected(null);setLegalMoves([]);
    setTurn('w');setStatus('');setThinking(false);setWCount(12);setBCount(12);
  };

  const targets=new Set(legalMoves.map(m=>m.to));

  return(
    <div className="ck-root">
      <div className="ck-side">
        <h1>⬛ Checkers</h1>
        <div className="ck-counts">
          <span>You: {wCount} pieces</span>
          <span>AI: {bCount} pieces</span>
        </div>
        {thinking&&<div className="ck-think">AI thinking…</div>}
        {status&&<div className="ck-status">{status}</div>}
        <button className="ck-reset" onClick={reset}>New Game</button>
      </div>
      <div className="ck-board">
        {board.map((p,i)=>{
          const r=Math.floor(i/8),c=i%8;
          const dark=(r+c)%2===1;
          const isSel=selected===i;
          const isTarget=targets.has(i);
          return(
            <div key={i} className={`ck-sq ${dark?'dark':'light'} ${isSel?'sel':''}`}
              onClick={()=>handleClick(i)}>
              {isTarget&&<div className="ck-dot"/>}
              {p===WP&&<div className="ck-piece white"/>}
              {p===WK&&<div className="ck-piece white king">♛</div>}
              {p===BP&&<div className="ck-piece black"/>}
              {p===BK&&<div className="ck-piece black king">♛</div>}
            </div>
          );
        })}
      </div>
      {status&&<div className="ck-overlay"><h2>{status}</h2><button onClick={reset}>Play Again</button></div>}
      <BackButton/>
    </div>
  );
}
