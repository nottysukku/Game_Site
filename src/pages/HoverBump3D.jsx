import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './HoverBump3D.css';

const CRAFTS = [
  { name: 'P1', color: '#22d3ee', up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', boost: 'KeyQ' },
  { name: 'P2', color: '#fb7185', up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', boost: 'KeyU' },
  { name: 'P3', color: '#facc15', up: 'KeyT', down: 'KeyG', left: 'KeyF', right: 'KeyH', boost: 'KeyR' },
  { name: 'P4', color: '#a78bfa', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', boost: 'Slash' },
];

export default function HoverBump3D() {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const latchRef = useRef({});
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [points, setPoints] = useState([0, 0, 0, 0]);
  const [status, setStatus] = useState('Boost into opponents and knock them out of the ring.');

  useEffect(() => {
    const down = e => { keysRef.current[e.code] = true; };
    const up = e => { keysRef.current[e.code] = false; latchRef.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(engineRef.current?.raf);
    };
  }, []);

  const newRound = (engine) => {
    const positions = [[-120, -80], [120, -80], [-120, 90], [120, 90]];
    engine.crafts = CRAFTS.map((_, i) => ({ x: 450 + positions[i][0], y: 290 + positions[i][1], vx: 0, vy: 0, alive: true, boost: 1 }));
    engine.radius = 235;
    engine.elapsed = 0;
  };

  const start = () => {
    engineRef.current = { crafts: [], points: [0, 0, 0, 0], radius: 235, elapsed: 0, over: false, last: performance.now(), raf: null };
    newRound(engineRef.current);
    setPoints([0, 0, 0, 0]);
    setPhase('playing');
    setStatus('Round live.');
    engineRef.current.raf = requestAnimationFrame(loop);
  };

  const loop = (now) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;
    if (!canvas || !ctx || !engine) return;
    const dt = Math.min(0.04, (now - engine.last) / 1000);
    engine.last = now;
    engine.elapsed += dt;
    engine.radius = Math.max(115, 235 - Math.floor(engine.elapsed / 15) * 24 - engine.elapsed * 0.8);

    engine.crafts.forEach((c, i) => {
      if (!c.alive) return;
      const ctl = CRAFTS[i];
      let ax = 0;
      let ay = 0;
      if (keysRef.current[ctl.up]) ay -= 1;
      if (keysRef.current[ctl.down]) ay += 1;
      if (keysRef.current[ctl.left]) ax -= 1;
      if (keysRef.current[ctl.right]) ax += 1;
      const len = Math.hypot(ax, ay) || 1;
      let force = 430;
      if (keysRef.current[ctl.boost] && !latchRef.current[ctl.boost] && c.boost > 0) {
        latchRef.current[ctl.boost] = true;
        force = 1250;
        c.boost = 0;
      }
      c.vx += ax / len * force * dt;
      c.vy += ay / len * force * dt;
      c.vx *= 0.94;
      c.vy *= 0.94;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.boost = Math.min(1, c.boost + dt * 0.16);
      if (Math.hypot(c.x - 450, c.y - 290) > engine.radius + 20) {
        c.alive = false;
        setStatus(`${CRAFTS[i].name} ring-out.`);
      }
    });

    for (let i = 0; i < engine.crafts.length; i += 1) {
      for (let j = i + 1; j < engine.crafts.length; j += 1) {
        const a = engine.crafts[i];
        const b = engine.crafts[j];
        if (!a.alive || !b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d < 48) {
          const nx = dx / (d || 1);
          const ny = dy / (d || 1);
          const impulse = 260 + Math.abs(a.vx - b.vx) + Math.abs(a.vy - b.vy);
          a.vx -= nx * impulse * dt * 9; a.vy -= ny * impulse * dt * 9;
          b.vx += nx * impulse * dt * 9; b.vy += ny * impulse * dt * 9;
        }
      }
    }

    const alive = engine.crafts.map((c, i) => c.alive ? i : null).filter(v => v !== null);
    if (alive.length <= 1) {
      if (alive.length === 1) {
        engine.points[alive[0]] += 1;
        setPoints([...engine.points]);
        setStatus(`${CRAFTS[alive[0]].name} wins the round.`);
        if (engine.points[alive[0]] >= 3) {
          engine.over = true;
          setPhase('over');
          setStatus(`${CRAFTS[alive[0]].name} wins Sumo Slam.`);
        } else {
          newRound(engine);
        }
      } else newRound(engine);
    }

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.arc(450, 290, engine.radius + 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.arc(450, 290, engine.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(248,250,252,0.12)';
    for (let r = 60; r < engine.radius; r += 55) {
      ctx.beginPath(); ctx.arc(450, 290, r, 0, Math.PI * 2); ctx.stroke();
    }

    engine.crafts.forEach((c, i) => {
      if (!c.alive) return;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(Math.atan2(c.vy, c.vx));
      ctx.fillStyle = CRAFTS[i].color;
      ctx.shadowColor = CRAFTS[i].color;
      ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.ellipse(0, 0, 26, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#020617';
      ctx.fillRect(2, -8, 12, 16);
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(CRAFTS[i].name, c.x, c.y - 26);
    });

    if (!engine.over) engine.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="hb-root">
      <BackButton />
      <canvas ref={canvasRef} width={900} height={580} className="hb-canvas" />
      <div className="hb-panel">
        <h1>Hover Bump 3D</h1>
        <p>{status}</p>
        <div className="hb-points">{CRAFTS.map((c, i) => <span key={c.name} style={{ color: c.color }}>{c.name}:{points[i]}</span>)}</div>
        {phase !== 'playing' && <button onClick={start}>{phase === 'menu' ? 'Start Sumo Slam' : 'Rematch'}</button>}
      </div>
    </div>
  );
}
