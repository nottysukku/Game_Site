import React, { useState, useCallback } from 'react';
import BackButton from './BackButton';
import './GoFish.css';

const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const SUIT_COL = {'♠':'#e0e0e0','♥':'#ff5252','♦':'#ff5252','♣':'#e0e0e0'};

function makeDeck(){
  const d=[];
  for(const s of SUITS) for(const r of RANKS) d.push({rank:r,suit:s,id:`${r}${s}`});
  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  return d;
}

function checkBooks(hand){
  const byRank={};
  hand.forEach(c=>{if(!byRank[c.rank])byRank[c.rank]=[];byRank[c.rank].push(c);});
  const books=[], remaining=[];
  for(const r in byRank){
    if(byRank[r].length===4) books.push(r);
    else remaining.push(...byRank[r]);
  }
  return {books,remaining};
}

export default function GoFish(){
  const [phase,setPhase]=useState('menu');
  const [pHand,setPHand]=useState([]);
  const [aHand,setAHand]=useState([]);
  const [pool,setPool]=useState([]);
  const [pBooks,setPBooks]=useState([]);
  const [aBooks,setABooks]=useState([]);
  const [log,setLog]=useState([]);
  const [turn,setTurn]=useState('player');
  const [selectedRank,setSelectedRank]=useState(null);

  const addLog=(msg)=>setLog(l=>[msg,...l].slice(0,8));

  const deal=useCallback(()=>{
    const deck=makeDeck();
    setPHand(deck.slice(0,7)); setAHand(deck.slice(7,14)); setPool(deck.slice(14));
    setPBooks([]); setABooks([]); setLog([]); setTurn('player'); setSelectedRank(null);
    setPhase('playing');
  },[]);

  const goFish=(hand,setHand,poolArr)=>{
    if(poolArr.length===0) return {hand,pool:poolArr};
    const np=[...poolArr]; const card=np.pop();
    const nh=[...hand,card];
    return {hand:nh,pool:np};
  };

  const processBooks=(hand,books)=>{
    const {books:newBooks,remaining}=checkBooks(hand);
    return {hand:remaining,books:[...books,...newBooks]};
  };

  const askForRank=(rank)=>{
    if(turn!=='player'||!rank) return;
    setSelectedRank(null);
    let ph=[...pHand], ah=[...aHand], pl=[...pool];
    const got=ah.filter(c=>c.rank===rank);
    if(got.length>0){
      addLog(`You asked for ${rank}s — Got ${got.length}!`);
      ph=[...ph,...got]; ah=ah.filter(c=>c.rank!==rank);
      const pRes=processBooks(ph,pBooks);
      ph=pRes.hand; setPBooks(pRes.books);
      setPHand(ph); setAHand(ah);
      checkEnd(pRes.books,aBooks,pl);
    } else {
      addLog(`You asked for ${rank}s — Go Fish!`);
      const res=goFish(ph,setPHand,pl);
      ph=res.hand; pl=res.pool;
      const pRes=processBooks(ph,pBooks);
      ph=pRes.hand; setPBooks(pRes.books);
      setPHand(ph); setPool(pl);
      if(!checkEnd(pRes.books,aBooks,pl)){
        setTurn('ai');
        setTimeout(()=>aiTurn(ph,ah,pl,pRes.books,aBooks),800);
      }
    }
  };

  const aiTurn=(ph,ah,pl,pb,ab)=>{
    if(ah.length===0&&pl.length>0){
      const res=goFish(ah,null,pl);ah=res.hand;pl=res.pool;
    }
    if(ah.length===0){checkEnd(pb,ab,pl);setTurn('player');return;}
    // AI picks a random rank from its hand
    const rank=ah[Math.floor(Math.random()*ah.length)].rank;
    const got=ph.filter(c=>c.rank===rank);
    if(got.length>0){
      addLog(`AI asked for ${rank}s — Got ${got.length} from you!`);
      ah=[...ah,...got]; ph=ph.filter(c=>c.rank!==rank);
      const aRes=processBooks(ah,ab);
      ah=aRes.hand; ab=aRes.books; setABooks(ab);
      setPHand(ph); setAHand(ah);
      if(!checkEnd(pb,ab,pl)){
        setTimeout(()=>aiTurn(ph,ah,pl,pb,ab),800);
      }
    } else {
      addLog(`AI asked for ${rank}s — Go Fish!`);
      const res=goFish(ah,null,pl);
      ah=res.hand; pl=res.pool;
      const aRes=processBooks(ah,ab);
      ah=aRes.hand; ab=aRes.books; setABooks(ab);
      setAHand(ah); setPool(pl);
      if(!checkEnd(pb,ab,pl)){
        setTurn('player');
      }
    }
  };

  const checkEnd=(pb,ab,pl)=>{
    if(pb.length+ab.length===13||pl.length===0){
      setPhase('result'); return true;
    }
    return false;
  };

  const uniqueRanks=[...new Set(pHand.map(c=>c.rank))];

  if(phase==='menu') return(
    <div className="gf-menu">
      <h1>🐟 Go Fish</h1>
      <p>Collect all four of a rank to score a book!</p>
      <button onClick={deal}>Play</button>
      <BackButton/>
    </div>
  );

  if(phase==='result'){
    const pWin=pBooks.length>aBooks.length;
    return(
      <div className="gf-result">
        <h2>{pWin?'🎉 You Win!':'😞 AI Wins!'}</h2>
        <p>Your books: {pBooks.length} &nbsp;|&nbsp; AI books: {aBooks.length}</p>
        <button onClick={deal}>Play Again</button>
        <BackButton/>
      </div>
    );
  }

  return(
    <div className="gf-root">
      <div className="gf-info">
        <span>Your Books: {pBooks.length}</span>
        <span>Pool: {pool.length}</span>
        <span>AI Books: {aBooks.length}</span>
      </div>
      <div className="gf-ai">
        <div className="gf-label">AI ({aHand.length} cards)</div>
        <div className="gf-cards">{aHand.map(c=><div key={c.id} className="gf-card back">🂠</div>)}</div>
      </div>

      <div className="gf-books">
        {pBooks.length>0&&<div className="gf-book-row">Your books: {pBooks.join(', ')}</div>}
        {aBooks.length>0&&<div className="gf-book-row">AI books: {aBooks.join(', ')}</div>}
      </div>

      <div className="gf-log">{log.map((m,i)=><div key={i} className="gf-log-line">{m}</div>)}</div>

      {turn==='player'&&(
        <div className="gf-ask">
          <div className="gf-ask-label">Ask AI for a rank:</div>
          <div className="gf-rank-btns">
            {uniqueRanks.map(r=>(
              <button key={r} className={selectedRank===r?'sel':''} onClick={()=>setSelectedRank(r)}>{r}</button>
            ))}
          </div>
          {selectedRank&&<button className="gf-go" onClick={()=>askForRank(selectedRank)}>Ask for {selectedRank}s</button>}
        </div>
      )}
      {turn==='ai'&&<div className="gf-thinking">AI is thinking…</div>}

      <div className="gf-player">
        <div className="gf-label">Your Hand</div>
        <div className="gf-cards">
          {pHand.map(c=>(
            <div key={c.id} className="gf-card front" style={{color:SUIT_COL[c.suit]}}>
              <span className="gf-r">{c.rank}</span><span className="gf-su">{c.suit}</span>
            </div>
          ))}
        </div>
      </div>
      <BackButton/>
    </div>
  );
}
