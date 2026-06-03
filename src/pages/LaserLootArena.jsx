import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './LaserLootArena.css';

const THIEVES = [
  { name: 'P1', color: '#22d3ee', left: 'KeyA', right: 'KeyD', jump: 'KeyW', slide: 'KeyS' },
  { name: 'P2', color: '#fb7185', left: 'KeyJ', right: 'KeyL', jump: 'KeyI', slide: 'KeyK' },
];

const PLATFORMS = [
  [0, 500, 2400, 40], [170, 420, 220, 22], [440, 355, 260, 22], [760, 440, 230, 22],
  [1080, 340, 260, 22], [1400, 430, 220, 22], [1680, 320, 260, 22], [2020, 420, 260, 22],
];

const LASERS = [
  { x: 560, y: 325, len: 150, speed: 1.5 },
  { x: 920, y: 390, len: 170, speed: -1.2 },
  { x: 1260, y: 305, len: 160, speed: 1.7 },
  { x: 1820, y: 365, len: 190, speed: -1.4 },
];

function lineDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

export default function LaserLootArena() {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [status, setStatus] = useState('Two thieves race through the same laser vault.');

  useEffect(() => {
    const down = e => { keysRef.current[e.code] = true; };
    const up = e => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(engineRef.current?.raf);
    };
  }, []);

  const start = () => {
    engineRef.current = {
      players: THIEVES.map((_, i) => ({ x: 60, y: 455 - i * 24, vx: 0, vy: 0, hits: 0, checkpoint: 60, grounded: false, slide: 0 })),
      coins: Array.from({ length: 22 }, (_, i) => ({ x: 250 + i * 92, y: 260 + (i % 4) * 42, taken: false })),
      camera: 0,
      elapsed: 0,
      over: false,
      last: performance.now(),
      raf: null,
    };
    setPhase('playing');
    setStatus('Vault breach started.');
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

    engine.players.forEach((p, i) => {
      const ctl = THIEVES[i];
      p.vx = 0;
      if (keysRef.current[ctl.left]) p.vx -= 210;
      if (keysRef.current[ctl.right]) p.vx += 210;
      if (keysRef.current[ctl.slide]) p.slide = 0.22;
      if (keysRef.current[ctl.jump] && p.grounded) {
        p.vy = -430;
        p.grounded = false;
      }
      p.vy += 880 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.slide = Math.max(0, p.slide - dt);
      p.grounded = false;
      const h = p.slide > 0 ? 18 : 34;
      for (const [x, y, w, ph] of PLATFORMS) {
        if (p.x > x - 18 && p.x < x + w + 18 && p.y + h > y && p.y + h < y + ph + 22 && p.vy >= 0) {
          p.y = y - h;
          p.vy = 0;
          p.grounded = true;
          if (x > p.checkpoint) p.checkpoint = x + 20;
        }
      }
      if (p.y > 560) {
        p.x = p.checkpoint;
        p.y = 455;
        p.vy = 0;
        p.hits += 1;
      }

      LASERS.forEach(l => {
        const a = engine.elapsed * l.speed;
        const ax = l.x + Math.cos(a) * l.len * 0.5;
        const ay = l.y + Math.sin(a) * l.len * 0.5;
        const bx = l.x - Math.cos(a) * l.len * 0.5;
        const by = l.y - Math.sin(a) * l.len * 0.5;
        if (lineDistance(p.x, p.y + h * 0.45, ax, ay, bx, by) < 16) {
          p.x = p.checkpoint;
          p.y = 455;
          p.vy = 0;
          p.hits += 1;
          setStatus(`${ctl.name} tripped a laser.`);
        }
      });

      engine.coins.forEach(c => {
        if (!c.taken && Math.hypot(p.x - c.x, p.y - c.y) < 28) c.taken = true;
      });
      if (p.x > 2250) {
        engine.over = true;
        setPhase('over');
        setStatus(`${ctl.name} grabs the diamond with ${p.hits} alarms.`);
      }
    });

    engine.camera += ((Math.max(...engine.players.map(p => p.x)) - 360) - engine.camera) * 0.05;
    engine.camera = Math.max(0, Math.min(1500, engine.camera));

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-engine.camera, 0);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(engine.camera, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111827';
    for (let x = 0; x < 2500; x += 80) ctx.fillRect(x, 0, 4, 540);

    PLATFORMS.forEach(([x, y, w, h]) => {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x, y, w, 4);
    });

    LASERS.forEach(l => {
      const a = engine.elapsed * l.speed;
      const ax = l.x + Math.cos(a) * l.len * 0.5;
      const ay = l.y + Math.sin(a) * l.len * 0.5;
      const bx = l.x - Math.cos(a) * l.len * 0.5;
      const by = l.y - Math.sin(a) * l.len * 0.5;
      ctx.strokeStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.shadowBlur = 0;
    });

    engine.coins.forEach(c => {
      if (c.taken) return;
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(2280, 400); ctx.lineTo(2310, 430); ctx.lineTo(2280, 462); ctx.lineTo(2250, 430); ctx.closePath();
    ctx.fill();

    engine.players.forEach((p, i) => {
      const h = p.slide > 0 ? 18 : 34;
      ctx.fillStyle = THIEVES[i].color;
      ctx.fillRect(p.x - 16, p.y, 32, h);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(p.x + 6, p.y + 7, 8, 7);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`${THIEVES[i].name} H${p.hits}`, p.x - 20, p.y - 9);
    });
    ctx.restore();

    if (!engine.over) engine.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="lla-root">
      <BackButton />
      <canvas ref={canvasRef} width={900} height={540} className="lla-canvas" />
      <div className="lla-panel">
        <h1>Laser Loot Arena</h1>
        <p>{status}</p>
        {phase !== 'playing' && <button onClick={start}>{phase === 'menu' ? 'Start Heist' : 'Run It Back'}</button>}
      </div>
    </div>
  );
}
