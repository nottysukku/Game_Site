import React, { useState, useCallback } from 'react';
import BackButton from './BackButton';
import './TeenPatti.css';

const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUIT_COL = {'♠':'#e0e0e0','♥':'#ff5252','♦':'#ff5252','♣':'#e0e0e0'};

function makeDeck(){
  const d=[];
  for(const s of SUITS) for(const r of RANKS) d.push({rank:r,suit:s,id:`${r}${s}`});
  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  return d;
}

const rv = r => RANKS.indexOf(r);

function handRank(cards){
  const sorted=[...cards].sort((a,b)=>rv(a.rank)-rv(b.rank));
  const ranks=sorted.map(c=>rv(c.rank));
  const suits=sorted.map(c=>c.suit);
  const isFlush=suits[0]===suits[1]&&suits[1]===suits[2];
  const isSeq=(ranks[2]-ranks[1]===1&&ranks[1]-ranks[0]===1)||
    (ranks[0]===0&&ranks[1]===1&&ranks[2]===12);// A-2-3
  const isTrail=ranks[0]===ranks[1]&&ranks[1]===ranks[2];
  const isPair=ranks[0]===ranks[1]||ranks[1]===ranks[2]||ranks[0]===ranks[2];

  if(isTrail) return {rank:6,high:ranks[0],name:'Trail (Three of a Kind)'};
  if(isFlush&&isSeq) return {rank:5,high:ranks[2],name:'Pure Sequence'};
  if(isSeq) return {rank:4,high:ranks[2],name:'Sequence (Run)'};
  if(isFlush) return {rank:3,high:ranks[2],name:'Flush (Color)'};
  if(isPair){
    const pairVal=ranks[0]===ranks[1]?ranks[0]:ranks[1]===ranks[2]?ranks[1]:ranks[0];
    return {rank:2,high:pairVal,kicker:ranks.find(r=>r!==pairVal),name:'Pair'};
  }
  return {rank:1,high:ranks[2],name:'High Card'};
}

function compareHands(a,b){
  const ha=handRank(a),hb=handRank(b);
  if(ha.rank!==hb.rank) return ha.rank-hb.rank;
  if(ha.high!==hb.high) return ha.high-hb.high;
  if(ha.kicker!==undefined&&hb.kicker!==undefined) return ha.kicker-hb.kicker;
  return 0;
}

export default function TeenPatti(){
  const [phase,setPhase]=useState('menu'); // menu, betting, showdown, result
  const [playerHand,setPlayerHand]=useState([]);
  const [aiHand,setAiHand]=useState([]);
  const [pot,setPot]=useState(0);
  const [playerChips,setPlayerChips]=useState(1000);
  const [aiChips,setAiChips]=useState(1000);
  const [round,setRound]=useState(0);
  const [result,setResult]=useState('');
  const [showAi,setShowAi]=useState(false);
  const [betAmount]=useState(50);

  const deal=useCallback(()=>{
    const deck=makeDeck();
    setPlayerHand([deck[0],deck[1],deck[2]]);
    setAiHand([deck[3],deck[4],deck[5]]);
    setPot(0); setShowAi(false); setResult('');
    setPhase('betting');
    setRound(r=>r+1);
  },[]);

  const placeBet=(amt)=>{
    if(playerChips<amt) return;
    // AI also matches
    const aiAmt=amt;
    setPlayerChips(c=>c-amt);
    setAiChips(c=>c-aiAmt);
    setPot(p=>p+amt+aiAmt);
  };

  const showCards=()=>{
    setShowAi(true);
    const cmp=compareHands(playerHand,aiHand);
    let res;
    if(cmp>0){res='You Win!';setPlayerChips(c=>c+pot);}
    else if(cmp<0){res='AI Wins!';setAiChips(c=>c+pot);}
    else{res='Tie!';setPlayerChips(c=>c+pot/2);setAiChips(c=>c+pot/2);}
    setResult(res);
    setPhase('result');
  };

  const fold=()=>{
    setShowAi(true);
    setAiChips(c=>c+pot);
    setResult('You Folded — AI takes the pot');
    setPhase('result');
  };

  const renderCard=(card,hidden=false)=>{
    if(hidden) return <div className="tp-card facedown" key={card.id}><span>🂠</span></div>;
    return(
      <div className="tp-card faceup" key={card.id} style={{color:SUIT_COL[card.suit]}}>
        <span className="tp-rank">{card.rank}</span>
        <span className="tp-suit">{card.suit}</span>
      </div>
    );
  };

  if(phase==='menu') return(
    <div className="tp-menu">
      <h1>🃏 Teen Patti</h1>
      <p>3 Patti — Indian Poker</p>
      <p className="tp-sub">Get dealt 3 cards. Bet or fold against the AI!</p>
      <button onClick={deal}>Play</button>
      <BackButton/>
    </div>
  );

  return(
    <div className="tp-root">
      <div className="tp-info">
        <div className="tp-chip-bar">
          <span>You: 💰{playerChips}</span>
          <span className="tp-pot">Pot: {pot}</span>
          <span>AI: 💰{aiChips}</span>
        </div>
        <div className="tp-round">Round {round}</div>
      </div>

      <div className="tp-table">
        <div className="tp-hand-label">AI's Hand</div>
        <div className="tp-hand">{aiHand.map(c=>renderCard(c,!showAi))}</div>

        <div className="tp-vs">VS</div>

        <div className="tp-hand-label">Your Hand</div>
        <div className="tp-hand">{playerHand.map(c=>renderCard(c))}</div>
        {playerHand.length>0 && <div className="tp-hand-name">{handRank(playerHand).name}</div>}
      </div>

      {phase==='betting'&&(
        <div className="tp-actions">
          <button onClick={()=>{placeBet(betAmount);showCards();}}>Show ({betAmount})</button>
          <button onClick={()=>{placeBet(betAmount*2);showCards();}}>Raise & Show ({betAmount*2})</button>
          <button className="tp-fold" onClick={fold}>Fold</button>
        </div>
      )}

      {phase==='result'&&(
        <div className="tp-result-area">
          <div className={`tp-result ${result.includes('Win')?'win':result.includes('Fold')?'fold':'lose'}`}>{result}</div>
          {showAi && aiHand.length>0 && <div className="tp-ai-rank">AI had: {handRank(aiHand).name}</div>}
          <button onClick={deal}>Next Hand</button>
        </div>
      )}

      <BackButton/>
    </div>
  );
}
