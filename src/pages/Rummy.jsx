import React, { useState, useCallback } from 'react';
import BackButton from './BackButton';
import './Rummy.css';

const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const SUIT_COL = {'♠':'#e0e0e0','♥':'#ff5252','♦':'#ff5252','♣':'#e0e0e0'};
const rv = r => RANKS.indexOf(r);
const cardPts = r => { const v=rv(r); return v===0?1:v>=10?10:v+1; };

function makeDeck(){
  const d=[];
  for(const s of SUITS) for(const r of RANKS) d.push({rank:r,suit:s,id:`${r}${s}`});
  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  return d;
}

function findMelds(hand){
  // Find sets (same rank, diff suit) and runs (same suit, consecutive ranks)
  const melds=[];
  // Sets
  const byRank={};
  hand.forEach((c,i)=>{if(!byRank[c.rank])byRank[c.rank]=[];byRank[c.rank].push(i);});
  for(const r in byRank) if(byRank[r].length>=3) melds.push({type:'set',indices:byRank[r].slice(0,3)});
  // Runs
  const bySuit={};
  hand.forEach((c,i)=>{if(!bySuit[c.suit])bySuit[c.suit]=[];bySuit[c.suit].push({idx:i,rv:rv(c.rank)});});
  for(const s in bySuit){
    const sorted=bySuit[s].sort((a,b)=>a.rv-b.rv);
    for(let i=0;i<=sorted.length-3;i++){
      if(sorted[i+1].rv===sorted[i].rv+1&&sorted[i+2].rv===sorted[i+1].rv+1)
        melds.push({type:'run',indices:[sorted[i].idx,sorted[i+1].idx,sorted[i+2].idx]});
    }
  }
  return melds;
}

function deadwood(hand,meldIndices){
  const used=new Set(meldIndices.flat());
  return hand.reduce((s,c,i)=>used.has(i)?s:s+cardPts(c.rank),0);
}

export default function Rummy(){
  const [phase,setPhase]=useState('menu');
  const [playerHand,setPlayerHand]=useState([]);
  const [aiHand,setAiHand]=useState([]);
  const [drawPile,setDrawPile]=useState([]);
  const [discard,setDiscard]=useState([]);
  const [selected,setSelected]=useState(new Set());
  const [turn,setTurn]=useState('player');
  const [msg,setMsg]=useState('');
  const [scores,setScores]=useState({p:0,a:0});
  const [gameOver,setGameOver]=useState(false);

  const deal=useCallback(()=>{
    const deck=makeDeck();
    const ph=deck.slice(0,7), ah=deck.slice(7,14);
    const disc=[deck[14]];
    const pile=deck.slice(15);
    setPlayerHand(ph); setAiHand(ah); setDrawPile(pile); setDiscard(disc);
    setSelected(new Set()); setTurn('player'); setMsg('Draw a card'); setGameOver(false);
    setPhase('playing');
  },[]);

  const drawFromPile=()=>{
    if(turn!=='player'||drawPile.length===0) return;
    const np=[...drawPile]; const card=np.pop();
    setDrawPile(np); setPlayerHand(h=>[...h,card]); setMsg('Discard a card');
  };

  const drawFromDiscard=()=>{
    if(turn!=='player'||discard.length===0) return;
    const nd=[...discard]; const card=nd.pop();
    setDiscard(nd); setPlayerHand(h=>[...h,card]); setMsg('Discard a card');
  };

  const discardCard=(idx)=>{
    if(playerHand.length<=7) return;
    const nh=[...playerHand]; const card=nh.splice(idx,1)[0];
    setPlayerHand(nh); setDiscard(d=>[...d,card]); setSelected(new Set());
    setMsg('');
    // AI turn
    setTimeout(()=>aiTurn(nh,drawPile,discard.concat(card)),400);
  };

  const aiTurn=(ph,pile,disc)=>{
    setTurn('ai');
    let ah=[...aiHand];
    // AI draws
    let np=[...pile], nd=[...disc];
    if(nd.length>0&&Math.random()<0.4){
      ah.push(nd.pop());
    } else if(np.length>0){
      ah.push(np.pop());
    } else {
      // Reshuffle discard
      np=[...nd.reverse()]; nd=[]; ah.push(np.pop());
    }
    // AI discards highest deadwood card
    const melds=findMelds(ah);
    const meldIdx=new Set(melds.flatMap(m=>m.indices));
    let worst=-1,worstVal=-1;
    ah.forEach((c,i)=>{if(!meldIdx.has(i)&&cardPts(c.rank)>worstVal){worstVal=cardPts(c.rank);worst=i;}});
    if(worst===-1) worst=ah.length-1;
    const discarded=ah.splice(worst,1)[0];
    nd.push(discarded);
    setAiHand(ah); setDrawPile(np); setDiscard(nd);
    setTurn('player'); setMsg('Draw a card');
  };

  const knock=()=>{
    const melds=findMelds(playerHand);
    const best=melds.length>0?melds.reduce((b,m)=>[...b,...m.indices],[]):[];
    const pDead=deadwood(playerHand,melds.map(m=>m.indices));
    const aMelds=findMelds(aiHand);
    const aDead=deadwood(aiHand,aMelds.map(m=>m.indices));
    let pScore=scores.p, aScore=scores.a;
    if(pDead<=aDead){pScore+=aDead-pDead+10;setMsg(`You knock! Deadwood ${pDead} vs ${aDead}. You win the round!`);}
    else{aScore+=pDead-aDead+10;setMsg(`You knock! Deadwood ${pDead} vs ${aDead}. AI wins the round!`);}
    setScores({p:pScore,a:aScore}); setGameOver(true); setPhase('result');
  };

  const toggleSelect=(i)=>{
    const ns=new Set(selected);
    ns.has(i)?ns.delete(i):ns.add(i);
    setSelected(ns);
  };

  const renderCard=(card,i,onClick,isSelected=false,hidden=false)=>{
    if(hidden) return <div className="rm-card facedown" key={card.id}>🂠</div>;
    return(
      <div className={`rm-card faceup ${isSelected?'sel':''}`} key={card.id}
        style={{color:SUIT_COL[card.suit]}} onClick={()=>onClick&&onClick(i)}>
        <span className="rm-r">{card.rank}</span><span className="rm-s">{card.suit}</span>
      </div>
    );
  };

  if(phase==='menu') return(
    <div className="rm-menu">
      <h1>🃏 Rummy</h1>
      <p>Gin Rummy — 7-card</p>
      <button onClick={deal}>Deal</button>
      <BackButton/>
    </div>
  );

  return(
    <div className="rm-root">
      <div className="rm-scores">You: {scores.p} &nbsp;|&nbsp; AI: {scores.a}</div>
      <div className="rm-ai-area">
        <div className="rm-label">AI ({aiHand.length} cards)</div>
        <div className="rm-hand">{aiHand.map((c,i)=>renderCard(c,i,null,false,!gameOver))}</div>
      </div>
      <div className="rm-mid">
        <div className="rm-pile" onClick={drawFromPile}>
          {drawPile.length>0?<div className="rm-card facedown">🂠<br/><small>{drawPile.length}</small></div>:<div className="rm-empty">Empty</div>}
        </div>
        <div className="rm-discard-pile" onClick={drawFromDiscard}>
          {discard.length>0?renderCard(discard[discard.length-1],-1):(<div className="rm-empty">Discard</div>)}
        </div>
      </div>
      {msg&&<div className="rm-msg">{msg}</div>}
      <div className="rm-player-area">
        <div className="rm-label">Your Hand</div>
        <div className="rm-hand">
          {playerHand.map((c,i)=>renderCard(c,i,playerHand.length>7?discardCard:toggleSelect,selected.has(i)))}
        </div>
      </div>
      <div className="rm-btns">
        {!gameOver && <button onClick={knock} disabled={turn!=='player'}>Knock</button>}
        {gameOver && <button onClick={deal}>Next Round</button>}
      </div>
      <BackButton/>
    </div>
  );
}
