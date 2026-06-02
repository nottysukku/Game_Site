import React, { useState, useRef, useCallback, useEffect } from 'react';
import BackButton from './BackButton';
import './RPS.css';

const CHOICES = ['rock', 'paper', 'scissors'];
const ICONS = { rock: '✊', paper: '✋', scissors: '✌️' };
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

export default function RPS() {
  const [phase, setPhase] = useState('idle'); // idle | choosing | countdown | reveal | result
  const [countdown, setCountdown] = useState(3);
  const [playerChoice, setPlayerChoice] = useState(null);
  const [cpuChoice, setCpuChoice] = useState(null);
  const [result, setResult] = useState('');
  const [scores, setScores] = useState({ player: 0, cpu: 0, rounds: 0 });
  const [shakeFrame, setShakeFrame] = useState(0);
  const playerRef = useRef(null);
  const cpuRef = useRef(null);
  const timerRef = useRef(null);
  const shakeRef = useRef(null);

  // Fist shaking animation during countdown
  useEffect(() => {
    if (phase === 'countdown') {
      let frame = 0;
      shakeRef.current = setInterval(() => {
        frame++;
        setShakeFrame(frame);
      }, 100);
      return () => clearInterval(shakeRef.current);
    } else {
      setShakeFrame(0);
    }
  }, [phase]);

  const startRound = useCallback((choice) => {
    if (phase !== 'idle') return;
    setPlayerChoice(choice);
    setPhase('countdown');
    setCountdown(3);
    setCpuChoice(null);
    setResult('');

    let count = 3;
    timerRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timerRef.current);
        // Reveal
        const cpu = CHOICES[Math.floor(Math.random() * 3)];
        setCpuChoice(cpu);
        setPhase('reveal');

        setTimeout(() => {
          let res = '';
          if (choice === cpu) res = 'tie';
          else if (BEATS[choice] === cpu) res = 'win';
          else res = 'lose';

          setResult(res);
          setPhase('result');
          setScores(prev => ({
            player: prev.player + (res === 'win' ? 1 : 0),
            cpu: prev.cpu + (res === 'lose' ? 1 : 0),
            rounds: prev.rounds + 1
          }));

          setTimeout(() => {
            setPhase('idle');
            setPlayerChoice(null);
            setCpuChoice(null);
          }, 2000);
        }, 600);
      }
    }, 800);
  }, [phase]);

  const getShakeTransform = (isLeft) => {
    if (phase !== 'countdown') return '';
    const y = Math.sin(shakeFrame * 1.8) * 20;
    return `translateY(${y}px)`;
  };

  const getRevealAnimation = () => {
    if (phase === 'reveal') return 'reveal-bounce';
    return '';
  };

  const resultText = result === 'win' ? '🎉 You Win!' : result === 'lose' ? '💀 You Lose!' : result === 'tie' ? '🤝 Tie!' : '';
  const resultClass = result === 'win' ? 'win' : result === 'lose' ? 'lose' : result === 'tie' ? 'tie' : '';

  return (
    <div className="rps-root">
      <h1 className="rps-title">Rock Paper Scissors</h1>
      <div className="rps-scoreboard">
        <div className="rps-score you">You: {scores.player}</div>
        <div className="rps-round">Round {scores.rounds + 1}</div>
        <div className="rps-score cpu">CPU: {scores.cpu}</div>
      </div>

      <div className="rps-arena">
        {/* Player side */}
        <div className="rps-fighter left">
          <div className="fighter-label">YOU</div>
          <div
            className={`fist-display ${getRevealAnimation()}`}
            style={{ transform: getShakeTransform(true) }}
            ref={playerRef}
          >
            {phase === 'countdown' && <span className="fist-icon">✊</span>}
            {(phase === 'reveal' || phase === 'result') && playerChoice && (
              <span className="fist-icon choice-reveal">{ICONS[playerChoice]}</span>
            )}
            {phase === 'idle' && <span className="fist-icon waiting">✊</span>}
          </div>
          {(phase === 'reveal' || phase === 'result') && playerChoice && (
            <div className="choice-label">{playerChoice.toUpperCase()}</div>
          )}
        </div>

        {/* VS / Countdown */}
        <div className="rps-center">
          {phase === 'countdown' && (
            <div className="countdown-display" key={countdown}>
              <span className="countdown-number">{countdown}</span>
            </div>
          )}
          {phase === 'reveal' && (
            <div className="vs-text">VS</div>
          )}
          {phase === 'result' && (
            <div className={`result-display ${resultClass}`}>
              {resultText}
            </div>
          )}
          {phase === 'idle' && (
            <div className="vs-text idle-vs">VS</div>
          )}
        </div>

        {/* CPU side */}
        <div className="rps-fighter right">
          <div className="fighter-label">CPU</div>
          <div
            className={`fist-display ${getRevealAnimation()}`}
            style={{ transform: phase === 'countdown' ? getShakeTransform(false) : '' }}
            ref={cpuRef}
          >
            {phase === 'countdown' && <span className="fist-icon mirrored">✊</span>}
            {(phase === 'reveal' || phase === 'result') && cpuChoice && (
              <span className="fist-icon choice-reveal mirrored">{ICONS[cpuChoice]}</span>
            )}
            {phase === 'idle' && <span className="fist-icon waiting mirrored">✊</span>}
          </div>
          {(phase === 'reveal' || phase === 'result') && cpuChoice && (
            <div className="choice-label">{cpuChoice.toUpperCase()}</div>
          )}
        </div>
      </div>

      {/* Choice buttons */}
      <div className={`rps-choices ${phase !== 'idle' ? 'disabled' : ''}`}>
        {CHOICES.map(c => (
          <button
            key={c}
            className="rps-choice-btn"
            onClick={() => startRound(c)}
            disabled={phase !== 'idle'}
          >
            <span className="choice-emoji">{ICONS[c]}</span>
            <span className="choice-name">{c}</span>
          </button>
        ))}
      </div>

      <p className="rps-hint">
        {phase === 'idle' ? 'Pick your weapon!' : phase === 'countdown' ? 'Shaking...' : ''}
      </p>

      <BackButton />
    </div>
  );
}
