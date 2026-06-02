import React, { useState, useRef, useCallback } from 'react';
import BackButton from './BackButton';
import './ReactionTest.css';

const STATES = { waiting: 'waiting', ready: 'ready', go: 'go', result: 'result', tooEarly: 'tooEarly' };

export default function ReactionTest() {
  const [phase, setPhase] = useState(STATES.waiting);
  const [reactionTime, setReactionTime] = useState(0);
  const [times, setTimes] = useState([]);
  const [bestTime, setBestTime] = useState(() => parseInt(localStorage.getItem('rt-best') || '9999'));
  const timerRef = useRef(null);
  const startRef = useRef(0);

  const handleClick = useCallback(() => {
    if (phase === STATES.waiting) {
      setPhase(STATES.ready);
      const delay = 1500 + Math.random() * 3500;
      timerRef.current = setTimeout(() => {
        setPhase(STATES.go);
        startRef.current = Date.now();
      }, delay);
    } else if (phase === STATES.ready) {
      // Clicked too early
      clearTimeout(timerRef.current);
      setPhase(STATES.tooEarly);
    } else if (phase === STATES.go) {
      const time = Date.now() - startRef.current;
      setReactionTime(time);
      setTimes(prev => [...prev, time]);
      if (time < bestTime) {
        setBestTime(time);
        localStorage.setItem('rt-best', String(time));
      }
      setPhase(STATES.result);
    } else {
      // result or tooEarly -> restart
      setPhase(STATES.waiting);
    }
  }, [phase, bestTime]);

  const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  const getLabel = () => {
    if (reactionTime < 200) return { text: 'Superhuman! ⚡', color: '#69f0ae' };
    if (reactionTime < 250) return { text: 'Excellent! 🔥', color: '#ffd740' };
    if (reactionTime < 350) return { text: 'Good 👍', color: '#00e5ff' };
    if (reactionTime < 500) return { text: 'Average', color: '#ff6e40' };
    return { text: 'Slow 🐢', color: '#ff5252' };
  };

  return (
    <div className="rt-root">
      <h1>⚡ Reaction Time</h1>

      <div
        className={`rt-box rt-${phase}`}
        onClick={handleClick}
      >
        {phase === STATES.waiting && (
          <>
            <div className="rt-icon">🖱️</div>
            <p className="rt-big">Click to Start</p>
            <p className="rt-sub">Click as fast as you can when the screen turns green</p>
          </>
        )}
        {phase === STATES.ready && (
          <>
            <div className="rt-icon">⏳</div>
            <p className="rt-big">Wait for green...</p>
          </>
        )}
        {phase === STATES.go && (
          <>
            <div className="rt-icon">🟢</div>
            <p className="rt-big">CLICK NOW!</p>
          </>
        )}
        {phase === STATES.tooEarly && (
          <>
            <div className="rt-icon">❌</div>
            <p className="rt-big">Too Early!</p>
            <p className="rt-sub">Click to try again</p>
          </>
        )}
        {phase === STATES.result && (
          <>
            <div className="rt-icon">⏱️</div>
            <p className="rt-time">{reactionTime} ms</p>
            <p className="rt-label" style={{ color: getLabel().color }}>{getLabel().text}</p>
            <p className="rt-sub">Click to try again</p>
          </>
        )}
      </div>

      <div className="rt-stats">
        <div className="rt-stat-item">
          <span className="rt-stat-val">{times.length}</span>
          <span>Attempts</span>
        </div>
        <div className="rt-stat-item">
          <span className="rt-stat-val">{avg || '—'}</span>
          <span>Avg (ms)</span>
        </div>
        <div className="rt-stat-item">
          <span className="rt-stat-val">{bestTime < 9999 ? bestTime : '—'}</span>
          <span>Best (ms)</span>
        </div>
      </div>

      {times.length > 0 && (
        <div className="rt-history">
          {times.map((t, i) => (
            <span key={i} className={`rt-hist-item ${t < 250 ? 'fast' : t < 400 ? 'ok' : 'slow'}`}>{t}ms</span>
          ))}
        </div>
      )}

      <BackButton />
    </div>
  );
}
