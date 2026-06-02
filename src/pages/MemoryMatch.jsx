import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from './BackButton';
import './MemoryMatch.css';

const EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐮','🐷','🐸','🐵','🐧','🐦','🦋'];

function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function buildCards(pairs) {
  const emojis = shuffle(EMOJIS).slice(0, pairs);
  return shuffle([...emojis, ...emojis].map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false })));
}

const SIZES = [
  { label: '4×3', pairs: 6, cols: 4 },
  { label: '4×4', pairs: 8, cols: 4 },
  { label: '5×4', pairs: 10, cols: 5 },
  { label: '6×5', pairs: 15, cols: 6 },
];

export default function MemoryMatch() {
  const [sizeIdx, setSizeIdx] = useState(1);
  const [cards, setCards] = useState(() => buildCards(SIZES[1].pairs));
  const [flipped, setFlipped] = useState([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timer, setTimer] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [best, setBest] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mm_best') || '{}'); } catch { return {}; }
  });
  const timerRef = useRef(null);
  const lockRef = useRef(false);

  const totalPairs = SIZES[sizeIdx].pairs;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  }, []);

  const newGame = useCallback((idx) => {
    const i = idx ?? sizeIdx;
    setCards(buildCards(SIZES[i].pairs));
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setTimer(0);
    setStarted(false);
    setWon(false);
    lockRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
  }, [sizeIdx]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleClick = (index) => {
    if (lockRef.current || won) return;
    const card = cards[index];
    if (card.flipped || card.matched) return;

    if (!started) { setStarted(true); startTimer(); }

    const nc = cards.map((c, i) => i === index ? { ...c, flipped: true } : c);
    const nf = [...flipped, index];
    setCards(nc);
    setFlipped(nf);

    if (nf.length === 2) {
      setMoves(m => m + 1);
      lockRef.current = true;
      const [a, b] = nf;
      if (nc[a].emoji === nc[b].emoji) {
        const matched = nc.map((c, i) => (i === a || i === b) ? { ...c, matched: true } : c);
        setCards(matched);
        setFlipped([]);
        lockRef.current = false;
        const newMatches = matches + 1;
        setMatches(newMatches);
        if (newMatches === totalPairs) {
          setWon(true);
          if (timerRef.current) clearInterval(timerRef.current);
          const key = SIZES[sizeIdx].label;
          const newMoves = moves + 1;
          if (!best[key] || newMoves < best[key]) {
            const nb = { ...best, [key]: newMoves };
            setBest(nb);
            try { localStorage.setItem('mm_best', JSON.stringify(nb)); } catch {}
          }
        }
      } else {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === a || i === b) ? { ...c, flipped: false } : c));
          setFlipped([]);
          lockRef.current = false;
        }, 800);
      }
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="mm-root">
      <h1>Memory Match</h1>
      <div className="mm-top">
        <div className="mm-sizes">
          {SIZES.map((s, i) => (
            <button key={s.label} className={i === sizeIdx ? 'active' : ''}
              onClick={() => { setSizeIdx(i); newGame(i); }}>{s.label}</button>
          ))}
        </div>
        <div className="mm-stats">
          <span>Moves: <b>{moves}</b></span>
          <span>⏱ {formatTime(timer)}</span>
          <span>Matched: <b>{matches}/{totalPairs}</b></span>
        </div>
      </div>

      <div className="mm-grid" style={{ gridTemplateColumns: `repeat(${SIZES[sizeIdx].cols}, 72px)` }}>
        {cards.map((card, i) => (
          <div key={card.id} className={`mm-card ${card.flipped || card.matched ? 'flip' : ''} ${card.matched ? 'matched' : ''}`}
            onClick={() => handleClick(i)}>
            <div className="mm-inner">
              <div className="mm-front">?</div>
              <div className="mm-back">{card.emoji}</div>
            </div>
          </div>
        ))}
      </div>

      {best[SIZES[sizeIdx].label] && (
        <div className="mm-best">Best ({SIZES[sizeIdx].label}): {best[SIZES[sizeIdx].label]} moves</div>
      )}

      {won && (
        <div className="mm-win-overlay">
          <div className="mm-win">
            <h2>🎉 You Win!</h2>
            <p>{moves} moves in {formatTime(timer)}</p>
            <button onClick={() => newGame()}>Play Again</button>
          </div>
        </div>
      )}
      <BackButton />
    </div>
  );
}
