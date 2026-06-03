import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './BombRelay3D.css';

const PLAYERS = [
  { name: 'P1', color: '#22d3ee', up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', throwKey: 'KeyQ' },
  { name: 'P2', color: '#fb7185', up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', throwKey: 'KeyU' },
  { name: 'P3', color: '#facc15', up: 'KeyT', down: 'KeyG', left: 'KeyF', right: 'KeyH', throwKey: 'KeyR' },
  { name: 'P4', color: '#a78bfa', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', throwKey: 'Slash' },
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export default function BombRelay3D() {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const latchRef = useRef({});
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [status, setStatus] = useState('Pass the ticking bomb before it detonates.');
  const [lives, setLives] = useState([3, 3, 3, 3]);

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

  const resetBomb = (engine) => {
    const alive = engine.players.filter(p => p.lives > 0);
    engine.bomb = { holder: alive[Math.floor(Math.random() * alive.length)]?.id ?? 0, x: 450, y: 280, vx: 0, vy: 0, timer: 7, flying: false };
  };

  const start = () => {
    const starts = [[120, 120], [780, 120], [120, 450], [780, 450]];
    const crates = [];
    for (let i = 0; i < 34; i += 1) {
      crates.push({ x: 180 + (i % 9) * 75 + (i % 2) * 8, y: 170 + Math.floor(i / 9) * 80, hp: 1 });
    }
    engineRef.current = {
      players: PLAYERS.map((_, i) => ({ id: i, x: starts[i][0], y: starts[i][1], dir: 0, lives: 3, stun: 0 })),
      crates,
      blast: 0,
      over: false,
      last: performance.now(),
      raf: null,
    };
    resetBomb(engineRef.current);
    setPhase('playing');
    setLives([3, 3, 3, 3]);
    setStatus('Bomb armed.');
    engineRef.current.raf = requestAnimationFrame(loop);
  };

  const explode = (engine) => {
    const bomb = engine.bomb;
    const victim = engine.players[bomb.holder];
    if (victim?.lives > 0) {
      victim.lives -= 1;
      victim.stun = 1.2;
      setStatus(`${PLAYERS[victim.id].name} held the bomb too long.`);
    }
    engine.blast = 0.8;
    setLives(engine.players.map(p => p.lives));
    const alive = engine.players.filter(p => p.lives > 0);
    if (alive.length <= 1) {
      engine.over = true;
      setPhase('over');
      setStatus(alive[0] ? `${PLAYERS[alive[0].id].name} survives Pass the Pain.` : 'No one survived the blast.');
      return;
    }
    resetBomb(engine);
  };

  const loop = (now) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;
    if (!canvas || !ctx || !engine) return;
    const dt = Math.min(0.04, (now - engine.last) / 1000);
    engine.last = now;
    const bomb = engine.bomb;
    bomb.timer -= dt;
    engine.blast = Math.max(0, engine.blast - dt);
    if (bomb.timer <= 0) explode(engine);

    engine.players.forEach((p, i) => {
      if (p.lives <= 0) return;
      p.stun = Math.max(0, p.stun - dt);
      const ctl = PLAYERS[i];
      let dx = 0;
      let dy = 0;
      if (p.stun <= 0) {
        if (keysRef.current[ctl.up]) dy -= 1;
        if (keysRef.current[ctl.down]) dy += 1;
        if (keysRef.current[ctl.left]) dx -= 1;
        if (keysRef.current[ctl.right]) dx += 1;
      }
      const len = Math.hypot(dx, dy) || 1;
      if (dx || dy) p.dir = Math.atan2(dy, dx);
      p.x = clamp(p.x + dx / len * 190 * dt, 45, canvas.width - 45);
      p.y = clamp(p.y + dy / len * 190 * dt, 65, canvas.height - 45);

      engine.crates.forEach(c => {
        if (c.hp > 0 && Math.abs(p.x - c.x) < 34 && Math.abs(p.y - c.y) < 34) {
          p.x -= dx / len * 190 * dt;
          p.y -= dy / len * 190 * dt;
        }
      });

      if (bomb.holder === i && keysRef.current[ctl.throwKey] && !latchRef.current[ctl.throwKey]) {
        latchRef.current[ctl.throwKey] = true;
        bomb.holder = null;
        bomb.flying = true;
        bomb.x = p.x;
        bomb.y = p.y;
        bomb.vx = Math.cos(p.dir) * 460;
        bomb.vy = Math.sin(p.dir) * 460;
      }
    });

    if (bomb.flying) {
      bomb.x += bomb.vx * dt;
      bomb.y += bomb.vy * dt;
      bomb.vx *= 0.985;
      bomb.vy *= 0.985;
      engine.crates.forEach(c => {
        if (c.hp > 0 && Math.abs(bomb.x - c.x) < 32 && Math.abs(bomb.y - c.y) < 32) {
          c.hp = 0;
          bomb.vx *= -0.35;
          bomb.vy *= -0.35;
        }
      });
      engine.players.forEach(p => {
        if (p.lives > 0 && Math.hypot(p.x - bomb.x, p.y - bomb.y) < 30) {
          bomb.holder = p.id;
          bomb.flying = false;
          p.stun = 0.25;
          setStatus(`${PLAYERS[p.id].name} caught the bomb.`);
        }
      });
      if (bomb.x < 20 || bomb.x > canvas.width - 20) bomb.vx *= -0.7;
      if (bomb.y < 60 || bomb.y > canvas.height - 20) bomb.vy *= -0.7;
      if (Math.hypot(bomb.vx, bomb.vy) < 28) bomb.flying = false;
    } else if (bomb.holder !== null) {
      const h = engine.players[bomb.holder];
      bomb.x = h.x;
      bomb.y = h.y - 30;
    }

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(25, 55, canvas.width - 50, canvas.height - 80);
    for (let x = 55; x < canvas.width; x += 74) {
      ctx.strokeStyle = 'rgba(148,163,184,0.12)';
      ctx.beginPath(); ctx.moveTo(x, 55); ctx.lineTo(x - 60, canvas.height - 25); ctx.stroke();
    }

    engine.crates.forEach(c => {
      if (c.hp <= 0) return;
      ctx.fillStyle = '#9a5b22';
      ctx.fillRect(c.x - 24, c.y - 24, 48, 48);
      ctx.strokeStyle = '#fbbf24';
      ctx.strokeRect(c.x - 24, c.y - 24, 48, 48);
    });

    if (engine.blast > 0) {
      ctx.fillStyle = `rgba(251,146,60,${engine.blast})`;
      ctx.beginPath(); ctx.arc(bomb.x, bomb.y, 120 * (1 - engine.blast + 0.2), 0, Math.PI * 2); ctx.fill();
    }

    engine.players.forEach((p, i) => {
      if (p.lives <= 0) return;
      ctx.fillStyle = PLAYERS[i].color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#020617';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(PLAYERS[i].name, p.x, p.y + 4);
      if (bomb.holder === i) {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, 31 + Math.sin(now / 100) * 4, 0, Math.PI * 2); ctx.stroke();
      }
    });

    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.arc(bomb.x, bomb.y, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(bomb.timer), bomb.x, bomb.y + 5);

    if (!engine.over) engine.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="br-root">
      <BackButton />
      <canvas ref={canvasRef} width={900} height={580} className="br-canvas" />
      <div className="br-panel">
        <h1>Bomb Relay 3D</h1>
        <p>{status}</p>
        <div className="br-lives">{PLAYERS.map((p, i) => <span key={p.name} style={{ color: p.color }}>{p.name}:{lives[i]}</span>)}</div>
        {phase !== 'playing' && <button onClick={start}>{phase === 'menu' ? 'Start Relay' : 'Replay Relay'}</button>}
      </div>
    </div>
  );
}
