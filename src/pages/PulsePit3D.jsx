import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './PulsePit3D.css';

const BEAT = 0.52;

export default function PulsePit3D() {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const latchRef = useRef({});
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [status, setStatus] = useState('Hit actions on the pulse to stay out of the pit.');

  useEffect(() => {
    const down = e => {
      if (['Space', 'ArrowDown', 'ShiftLeft'].includes(e.code)) e.preventDefault();
      keysRef.current[e.code] = true;
    };
    const up = e => { keysRef.current[e.code] = false; latchRef.current[e.code] = false; };
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(engineRef.current?.raf);
    };
  }, []);

  const start = () => {
    engineRef.current = {
      runner: { y: 410, vy: 0, duck: 0, dash: 0, grounded: true },
      obstacles: [],
      elapsed: 0,
      next: 1,
      score: 0,
      combo: 0,
      over: false,
      last: performance.now(),
      raf: null,
    };
    setPhase('playing');
    setScore(0);
    setCombo(0);
    setStatus('Find the pulse.');
    engineRef.current.raf = requestAnimationFrame(loop);
  };

  const beatQuality = (elapsed) => {
    const beat = elapsed % BEAT;
    return Math.min(beat, BEAT - beat);
  };

  const actionOnBeat = (engine, code, action) => {
    if (!keysRef.current[code] || latchRef.current[code]) return false;
    latchRef.current[code] = true;
    const good = beatQuality(engine.elapsed) < 0.11;
    if (good) {
      engine.combo += 1;
      engine.score += 30 + engine.combo * 4;
      setStatus('Perfect pulse.');
    } else {
      engine.combo = 0;
      engine.score = Math.max(0, engine.score - 20);
      setStatus('Off beat.');
    }
    action(good);
    return true;
  };

  const loop = (now) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;
    if (!canvas || !ctx || !engine) return;
    const dt = Math.min(0.04, (now - engine.last) / 1000);
    engine.last = now;
    engine.elapsed += dt;
    const runner = engine.runner;

    actionOnBeat(engine, 'Space', good => {
      if (runner.grounded) {
        runner.vy = good ? -520 : -360;
        runner.grounded = false;
      }
    });
    actionOnBeat(engine, 'ArrowDown', () => { runner.duck = 0.42; });
    actionOnBeat(engine, 'ShiftLeft', good => { runner.dash = good ? 0.32 : 0.16; });

    runner.vy += 1080 * dt;
    runner.y += runner.vy * dt;
    if (runner.y >= 410) {
      runner.y = 410;
      runner.vy = 0;
      runner.grounded = true;
    }
    runner.duck = Math.max(0, runner.duck - dt);
    runner.dash = Math.max(0, runner.dash - dt);

    if (engine.elapsed > engine.next) {
      const types = ['jump', 'duck', 'dash'];
      engine.obstacles.push({ x: canvas.width + 30, type: types[Math.floor(Math.random() * types.length)], pulse: 0 });
      engine.next += BEAT * (1 + Math.floor(Math.random() * 2));
    }

    engine.obstacles.forEach(o => { o.x -= (280 + engine.elapsed * 4 + (runner.dash > 0 ? 90 : 0)) * dt; o.pulse += dt; });
    engine.obstacles = engine.obstacles.filter(o => o.x > -60);

    for (const o of engine.obstacles) {
      if (o.hit) continue;
      if (Math.abs(o.x - 170) < 28) {
        const cleared =
          (o.type === 'jump' && runner.y < 365) ||
          (o.type === 'duck' && runner.duck > 0) ||
          (o.type === 'dash' && runner.dash > 0);
        if (cleared) {
          o.hit = true;
          engine.score += 45 + engine.combo * 3;
        } else {
          engine.over = true;
          setPhase('over');
          setStatus(`Dropped into the pit at ${Math.floor(engine.score)}.`);
        }
      }
    }

    engine.score += dt * (8 + engine.combo * 0.6);
    setScore(engine.score);
    setCombo(engine.combo);

    const beat = engine.elapsed % BEAT;
    const pulse = 1 - Math.min(beat, BEAT - beat) / (BEAT / 2);
    ctx.fillStyle = '#080812';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(34,211,238,${0.09 + pulse * 0.22})`;
    for (let x = -40; x < canvas.width; x += 42) ctx.fillRect(x, 420 + Math.sin(engine.elapsed * 4 + x) * 6, 26, 8);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 432, canvas.width, 108);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 4 + pulse * 5;
    ctx.beginPath();
    ctx.moveTo(0, 432);
    ctx.lineTo(canvas.width, 432);
    ctx.stroke();

    engine.obstacles.forEach(o => {
      ctx.fillStyle = o.type === 'jump' ? '#fb7185' : o.type === 'duck' ? '#facc15' : '#a78bfa';
      if (o.type === 'jump') ctx.fillRect(o.x - 16, 396, 32, 36);
      if (o.type === 'duck') ctx.fillRect(o.x - 16, 326, 32, 96);
      if (o.type === 'dash') {
        ctx.beginPath(); ctx.arc(o.x, 410, 25, 0, Math.PI * 2); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 6; ctx.stroke();
      }
    });

    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 18;
    const h = runner.duck > 0 ? 26 : 54;
    ctx.fillRect(140, runner.y - h, runner.dash > 0 ? 52 : 34, h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#eff6ff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('BEAT', 420, 70);
    ctx.strokeStyle = '#eff6ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(450, 96, 22 + pulse * 20, 0, Math.PI * 2); ctx.stroke();

    if (!engine.over) engine.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="pp-root">
      <BackButton />
      <canvas ref={canvasRef} width={900} height={540} className="pp-canvas" />
      <div className="pp-panel">
        <h1>Pulse Pit</h1>
        <div>Score {Math.floor(score)} | Combo {combo}</div>
        <p>{status}</p>
        {phase !== 'playing' && <button onClick={start}>{phase === 'menu' ? 'Start Beat Run' : 'Retry Beat'}</button>}
      </div>
    </div>
  );
}
