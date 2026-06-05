import React, { useState, useCallback, useEffect, useRef } from 'react';
import BackButton from './BackButton';
import './Solitaire.css';

const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_COLORS = { '♠': '#e0e0e0', '♥': '#ff5252', '♦': '#ff5252', '♣': '#e0e0e0' };
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s, faceUp: false, id: `${r}${s}` });
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}

function rankVal(r) { return RANKS.indexOf(r); }
function isRed(s) { return s === '♥' || s === '♦'; }

export default function Solitaire() {
  const [started, setStarted] = useState(false);
  const [tableau, setTableau] = useState([[], [], [], [], [], [], []]);
  const [foundations, setFoundations] = useState([[], [], [], []]);
  const [stock, setStock] = useState([]);
  const [waste, setWaste] = useState([]);
  const [selected, setSelected] = useState(null); // { source, colIdx, cardIdx }
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  const deal = useCallback(() => {
    const deck = makeDeck();
    const tab = [[], [], [], [], [], [], []];
    let idx = 0;
    for (let c = 0; c < 7; c++) {
      for (let r = 0; r <= c; r++) {
        const card = { ...deck[idx++], faceUp: r === c };
        tab[c].push(card);
      }
    }
    const st = deck.slice(idx).map(c => ({ ...c, faceUp: false }));
    setTableau(tab); setFoundations([[], [], [], []]); setStock(st); setWaste([]);
    setSelected(null); setMoves(0); setWon(false); setStarted(true); setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  useEffect(() => {
    if (foundations.every(f => f.length === 13) && started) {
      setWon(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [foundations, started]);

  const drawStock = () => {
    if (stock.length === 0) {
      setStock(waste.map(c => ({ ...c, faceUp: false })).reverse());
      setWaste([]);
    } else {
      const newStock = [...stock];
      const card = { ...newStock.pop(), faceUp: true };
      setStock(newStock);
      setWaste(w => [...w, card]);
    }
    setSelected(null);
  };

  const canPlaceOnFoundation = (card, fIdx) => {
    const f = foundations[fIdx];
    if (f.length === 0) return card.rank === 'A';
    const top = f[f.length - 1];
    return top.suit === card.suit && rankVal(card.rank) === rankVal(top.rank) + 1;
  };

  const canPlaceOnTableau = (card, colIdx) => {
    const col = tableau[colIdx];
    if (col.length === 0) return card.rank === 'K';
    const top = col[col.length - 1];
    return isRed(card.suit) !== isRed(top.suit) && rankVal(card.rank) === rankVal(top.rank) - 1;
  };

  const handleSelect = (source, colIdx, cardIdx) => {
    if (won) return;
    if (selected && selected.source === source && selected.colIdx === colIdx && selected.cardIdx === cardIdx) {
      setSelected(null); return;
    }

    if (selected) {
      // Try to place
      let cards = [];
      if (selected.source === 'waste') cards = [waste[waste.length - 1]];
      else if (selected.source === 'tableau') cards = tableau[selected.colIdx].slice(selected.cardIdx);
      else if (selected.source === 'foundation') cards = [foundations[selected.colIdx][foundations[selected.colIdx].length - 1]];

      if (cards.length === 0) { setSelected(null); return; }

      if (source === 'foundation' && cards.length === 1) {
        if (canPlaceOnFoundation(cards[0], colIdx)) {
          // Build new foundations with the card added
          const newF = foundations.map(f => [...f]);
          newF[colIdx] = [...newF[colIdx], cards[0]];
          setFoundations(newF);
          // Remove from source (handle tableau source in one update to avoid race)
          if (selected.source === 'waste') {
            setWaste(w => { const n = [...w]; n.pop(); return n; });
          } else if (selected.source === 'tableau') {
            setTableau(prev => {
              const n = prev.map(c => [...c]);
              n[selected.colIdx] = n[selected.colIdx].slice(0, selected.cardIdx);
              if (n[selected.colIdx].length > 0) n[selected.colIdx][n[selected.colIdx].length - 1].faceUp = true;
              return n;
            });
          } else if (selected.source === 'foundation') {
            // Moving between foundations - already handled by newF, but src foundation needs trimming
            const newF2 = newF.map(f => [...f]);
            newF2[selected.colIdx] = newF2[selected.colIdx].slice(0, -1);
            setFoundations(newF2);
          }
          setMoves(m => m + 1);
          setSelected(null);
          return;
        }
      }
      if (source === 'tableau') {
        if (canPlaceOnTableau(cards[0], colIdx)) {
          if (selected.source === 'tableau') {
            // Both source and dest are tableau - do it in one update
            setTableau(prev => {
              const n = prev.map(c => [...c]);
              const moving = n[selected.colIdx].slice(selected.cardIdx);
              n[selected.colIdx] = n[selected.colIdx].slice(0, selected.cardIdx);
              if (n[selected.colIdx].length > 0) n[selected.colIdx][n[selected.colIdx].length - 1].faceUp = true;
              n[colIdx] = [...n[colIdx], ...moving];
              return n;
            });
          } else {
            // Source is waste or foundation
            const newTab = tableau.map(c => [...c]);
            newTab[colIdx] = [...newTab[colIdx], ...cards];
            setTableau(newTab);
            if (selected.source === 'waste') {
              setWaste(w => { const n = [...w]; n.pop(); return n; });
            } else if (selected.source === 'foundation') {
              setFoundations(prev => {
                const n = prev.map(f => [...f]);
                n[selected.colIdx] = n[selected.colIdx].slice(0, -1);
                return n;
              });
            }
          }
          setMoves(m => m + 1);
          setSelected(null);
          return;
        }
      }
      // No valid placement, re-select
      if (source === 'waste' || source === 'tableau') {
        setSelected({ source, colIdx, cardIdx });
      } else {
        setSelected(null);
      }
    } else {
      setSelected({ source, colIdx, cardIdx });
    }
  };

  // Auto-complete to foundation on double click
  const autoFoundation = (card, source, colIdx, cardIdx) => {
    for (let i = 0; i < 4; i++) {
      if (canPlaceOnFoundation(card, i)) {
        const newF = foundations.map(f => [...f]);
        newF[i] = [...newF[i], card];
        setFoundations(newF);
        if (source === 'waste') {
          setWaste(w => { const n = [...w]; n.pop(); return n; });
        } else if (source === 'tableau') {
          setTableau(prev => {
            const n = prev.map(c => [...c]);
            n[colIdx] = n[colIdx].slice(0, cardIdx);
            if (n[colIdx].length > 0) n[colIdx][n[colIdx].length - 1].faceUp = true;
            return n;
          });
        } else if (source === 'foundation') {
          // Edge case: moving between foundations
          const newF2 = newF.map(f => [...f]);
          newF2[colIdx] = newF2[colIdx].slice(0, -1);
          setFoundations(newF2);
        }
        setMoves(m => m + 1);
        setSelected(null);
        return true;
      }
    }
    return false;
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const isSelected = (source, colIdx, cardIdx) =>
    selected && selected.source === source && selected.colIdx === colIdx && selected.cardIdx === cardIdx;

  const renderCard = (card, source, colIdx, cardIdx, style = {}) => {
    if (!card.faceUp) return (
      <div key={`${colIdx}-${cardIdx}`} className="sol-card facedown" style={style}>
        <div className="sol-card-back">♾</div>
      </div>
    );
    const sel = isSelected(source, colIdx, cardIdx);
    return (
      <div
        key={card.id}
        className={`sol-card faceup ${sel ? 'selected' : ''}`}
        style={{ ...style, color: SUIT_COLORS[card.suit] }}
        onClick={() => handleSelect(source, colIdx, cardIdx)}
        onDoubleClick={() => autoFoundation(card, source, colIdx, cardIdx)}
      >
        <span className="sol-rank">{card.rank}</span>
        <span className="sol-suit">{card.suit}</span>
      </div>
    );
  };

  if (!started) {
    return (
      <div className="sol-menu">
        <h1>🃏 Solitaire</h1>
        <p>Klondike</p>
        <button onClick={deal}>Deal Cards</button>
        <BackButton />
      </div>
    );
  }

  return (
    <div className="sol-root">
      <div className="sol-top-bar">
        <div className="sol-stats">Moves: {moves} &nbsp;&nbsp; Time: {formatTime(timer)}</div>
        <button className="sol-new" onClick={deal}>New Game</button>
      </div>

      <div className="sol-upper">
        <div className="sol-stock-waste">
          <div className="sol-stock" onClick={drawStock}>
            {stock.length > 0 ? <div className="sol-card facedown"><div className="sol-card-back">♾</div></div> : <div className="sol-empty">↺</div>}
          </div>
          <div className="sol-waste-pile">
            {waste.length > 0 && renderCard(waste[waste.length - 1], 'waste', 0, waste.length - 1)}
          </div>
        </div>
        <div className="sol-foundations">
          {foundations.map((f, i) => (
            <div key={i} className="sol-foundation" onClick={() => selected && handleSelect('foundation', i, 0)}>
              {f.length > 0
                ? renderCard(f[f.length - 1], 'foundation', i, f.length - 1)
                : <div className="sol-empty">{SUITS[i]}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="sol-tableau">
        {tableau.map((col, ci) => (
          <div key={ci} className="sol-column" onClick={() => col.length === 0 && selected && handleSelect('tableau', ci, 0)}>
            {col.length === 0 && <div className="sol-empty">—</div>}
            {col.map((card, ri) =>
              renderCard(card, 'tableau', ci, ri, { top: `${ri * 28}px`, position: 'absolute', zIndex: ri })
            )}
            <div style={{ height: col.length * 28 + 80 }} />
          </div>
        ))}
      </div>

      {won && (
        <div className="sol-win">
          <h2>🎉 You Win!</h2>
          <p>Moves: {moves} &nbsp; Time: {formatTime(timer)}</p>
          <button onClick={deal}>Play Again</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
