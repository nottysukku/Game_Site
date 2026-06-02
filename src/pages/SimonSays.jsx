import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from './BackButton';
import './SimonSays.css';

const COLORS = ['red', 'green', 'blue', 'yellow'];
const COLOR_MAP = { red: '#ff5252', green: '#69f0ae', blue: '#448aff', yellow: '#ffd740' };
const SOUND_FREQ = { red: 329.63, green: 261.63, blue: 392.00, yellow: 440.00 };

function playTone(color, duration = 300) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = SOUND_FREQ[color];
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (e) {}
}

export default function SimonSays() {
  const [sequence, setSequence] = useState([]);
  const [playerInput, setPlayerInput] = useState([]);
  const [activeColor, setActiveColor] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | showing | input | gameover
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('simon-high') || '0'));
  const [speed, setSpeed] = useState(600);
  const showingRef = useRef(false);

  const nextRound = useCallback((seq) => {
    const newColor = COLORS[Math.floor(Math.random() * 4)];
    const newSeq = [...seq, newColor];
    setSequence(newSeq);
    setPlayerInput([]);
    setPhase('showing');
    showingRef.current = true;

    // Show sequence
    let i = 0;
    const spd = Math.max(250, 600 - seq.length * 20);
    setSpeed(spd);
    const timer = setInterval(() => {
      if (i < newSeq.length) {
        setActiveColor(newSeq[i]);
        playTone(newSeq[i], spd * 0.7);
        setTimeout(() => setActiveColor(null), spd * 0.6);
        i++;
      } else {
        clearInterval(timer);
        setPhase('input');
        showingRef.current = false;
      }
    }, spd);
  }, []);

  const start = () => {
    setScore(0);
    setSequence([]);
    setPlayerInput([]);
    setPhase('idle');
    nextRound([]);
  };

  const handlePress = (color) => {
    if (phase !== 'input') return;
    setActiveColor(color);
    playTone(color, 200);
    setTimeout(() => setActiveColor(null), 200);

    const newInput = [...playerInput, color];
    setPlayerInput(newInput);

    const idx = newInput.length - 1;
    if (newInput[idx] !== sequence[idx]) {
      setPhase('gameover');
      const finalScore = sequence.length - 1;
      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem('simon-high', String(finalScore));
      }
      return;
    }

    if (newInput.length === sequence.length) {
      const newScore = sequence.length;
      setScore(newScore);
      setTimeout(() => nextRound(sequence), 800);
    }
  };

  return (
    <div className="ss-root">
      <h1>🔴 Simon Says</h1>
      <div className="ss-hud">
        <span>Score: <strong>{score}</strong></span>
        <span>Best: <strong>{highScore}</strong></span>
      </div>

      <div className="ss-board">
        {COLORS.map(color => (
          <button
            key={color}
            className={`ss-btn ss-${color} ${activeColor === color ? 'active' : ''}`}
            onClick={() => handlePress(color)}
            disabled={phase !== 'input'}
          />
        ))}
        <div className="ss-center">
          {phase === 'idle' && <button className="ss-start" onClick={start}>START</button>}
          {phase === 'showing' && <span className="ss-label">Watch...</span>}
          {phase === 'input' && <span className="ss-label">Your turn!</span>}
          {phase === 'gameover' && <span className="ss-label fail">Wrong!</span>}
        </div>
      </div>

      {phase === 'gameover' && (
        <div className="ss-over">
          <p>You reached round <strong>{score + 1}</strong></p>
          <button className="ss-restart" onClick={start}>Try Again</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
