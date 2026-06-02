import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from './BackButton';
import './WhackAMole.css';

const GRID = 9;
const GAME_TIME = 30;

export default function WhackAMole() {
  const [moles, setMoles] = useState(Array(GRID).fill(false));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('wam-high') || '0'));
  const [hitAnim, setHitAnim] = useState(Array(GRID).fill(false));
  const timerRef = useRef(null);
  const moleTimerRef = useRef(null);

  const start = () => {
    setScore(0); setTimeLeft(GAME_TIME); setGameOver(false); setPlaying(true);
    setMoles(Array(GRID).fill(false));
    setHitAnim(Array(GRID).fill(false));
  };

  const whack = useCallback((idx) => {
    if (!playing || !moles[idx]) return;
    setScore(s => s + 1);
    setMoles(m => { const n = [...m]; n[idx] = false; return n; });
    setHitAnim(h => { const n = [...h]; n[idx] = true; return n; });
    setTimeout(() => setHitAnim(h => { const n = [...h]; n[idx] = false; return n; }), 300);
  }, [playing, moles]);

  // Timer
  useEffect(() => {
    if (!playing) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setPlaying(false); setGameOver(true);
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [playing]);

  // Mole spawning
  useEffect(() => {
    if (!playing) return;
    const spawnMole = () => {
      const idx = Math.floor(Math.random() * GRID);
      setMoles(m => { const n = [...m]; n[idx] = true; return n; });
      setTimeout(() => {
        setMoles(m => { const n = [...m]; n[idx] = false; return n; });
      }, 800 + Math.random() * 600);
    };
    moleTimerRef.current = setInterval(spawnMole, 600 + Math.random() * 400);
    return () => clearInterval(moleTimerRef.current);
  }, [playing]);

  // High score
  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      localStorage.setItem('wam-high', String(score));
    }
  }, [gameOver, score, highScore]);

  return (
    <div className="wam-root">
      <h1>🔨 Whack-a-Mole</h1>
      <div className="wam-hud">
        <span>Score: <strong>{score}</strong></span>
        <span className="wam-timer">⏱ {timeLeft}s</span>
        <span>Best: <strong>{highScore}</strong></span>
      </div>
      {!playing && !gameOver && (
        <button className="wam-start" onClick={start}>Start Game</button>
      )}
      <div className="wam-grid">
        {moles.map((up, i) => (
          <div key={i} className={`wam-hole ${up ? 'mole-up' : ''} ${hitAnim[i] ? 'hit' : ''}`} onClick={() => whack(i)}>
            <div className="wam-dirt" />
            <div className="wam-mole">{up ? '🐹' : ''}</div>
          </div>
        ))}
      </div>
      {gameOver && (
        <div className="wam-over">
          <h2>Time's Up!</h2>
          <p>Score: {score}</p>
          {score >= highScore && score > 0 && <p className="wam-new-high">🏆 New High Score!</p>}
          <button onClick={start}>Play Again</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
