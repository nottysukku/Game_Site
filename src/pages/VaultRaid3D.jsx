import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './VaultRaid3D.css';

const WALLS = [
  [60, 70, 780, 24], [60, 480, 780, 24], [60, 70, 24, 504], [816, 70, 24, 504],
  [190, 150, 24, 280], [320, 94, 24, 230], [320, 350, 260, 24],
  [500, 150, 24, 220], [640, 94, 24, 250], [640, 390, 24, 90],
  [214, 250, 170, 24], [520, 250, 140, 24],
];

const TERMINALS = [
  { x: 258, y: 130, open: [190, 150, 24, 90] },
  { x: 570, y: 438, open: [640, 390, 24, 90] },
  { x: 735, y: 150, open: [640, 94, 24, 90] },
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function sameRect(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function blocked(x, y, hacked) {
  return WALLS.some(w => {
    const terminal = TERMINALS.find(t => sameRect(t.open, w));
    if (terminal && hacked.has(terminal)) return false;
    return x + 12 > w[0] && x - 12 < w[0] + w[2] && y + 12 > w[1] && y - 12 < w[1] + w[3];
  });
}

export default function VaultRaid3D() {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [time, setTime] = useState(180);
  const [smoke, setSmoke] = useState(3);
  const [status, setStatus] = useState('Sneak past cones, hack terminals, reach the core.');

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
      player: { x: 120, y: 430, smoke: 3, hack: null, hackTime: 0 },
      guards: [
        { x: 260, y: 430, baseX: 260, baseY: 430, a: -0.3, path: 0 },
        { x: 440, y: 160, baseX: 440, baseY: 160, a: 1.9, path: 1.7 },
        { x: 710, y: 335, baseX: 710, baseY: 335, a: 3.2, path: 3.2 },
      ],
      hacked: new Set(),
      smokeClouds: [],
      time: 180,
      over: false,
      last: performance.now(),
      raf: null,
    };
    setPhase('playing');
    setTime(180);
    setSmoke(3);
    setStatus('Infiltration live.');
    engineRef.current.raf = requestAnimationFrame(loop);
  };

  const seenByGuard = (guard, player, clouds) => {
    if (clouds.some(c => Math.hypot(player.x - c.x, player.y - c.y) < c.r)) return false;
    const dx = player.x - guard.x;
    const dy = player.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 175) return false;
    const angle = Math.atan2(dy, dx);
    let diff = angle - guard.a;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return Math.abs(diff) < 0.46;
  };

  const loop = (now) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;
    if (!canvas || !ctx || !engine) return;
    const dt = Math.min(0.04, (now - engine.last) / 1000);
    engine.last = now;
    engine.time -= dt;
    setTime(engine.time);

    const p = engine.player;
    const speed = keysRef.current.ShiftLeft ? 115 : 155;
    let dx = 0;
    let dy = 0;
    if (keysRef.current.KeyW) dy -= 1;
    if (keysRef.current.KeyS) dy += 1;
    if (keysRef.current.KeyA) dx -= 1;
    if (keysRef.current.KeyD) dx += 1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = clamp(p.x + dx / len * speed * dt, 90, 805);
    const ny = clamp(p.y + dy / len * speed * dt, 100, 470);
    if (!blocked(nx, p.y, engine.hacked)) p.x = nx;
    if (!blocked(p.x, ny, engine.hacked)) p.y = ny;

    if (keysRef.current.Space && !keysRef.current._smoke && p.smoke > 0) {
      keysRef.current._smoke = true;
      p.smoke -= 1;
      setSmoke(p.smoke);
      engine.smokeClouds.push({ x: p.x, y: p.y, r: 24, life: 4 });
    }
    if (!keysRef.current.Space) keysRef.current._smoke = false;

    let nearTerminal = null;
    TERMINALS.forEach(t => {
      if (!engine.hacked.has(t) && Math.hypot(p.x - t.x, p.y - t.y) < 34) nearTerminal = t;
    });
    if (nearTerminal && keysRef.current.KeyE) {
      p.hack = nearTerminal;
      p.hackTime += dt;
      setStatus(`Hacking terminal ${Math.ceil(3 - p.hackTime)}.`);
      if (p.hackTime >= 3) {
        engine.hacked.add(nearTerminal);
        p.hack = null;
        p.hackTime = 0;
        setStatus('Door circuit disabled.');
      }
    } else {
      p.hack = null;
      p.hackTime = 0;
    }

    engine.guards.forEach((g, i) => {
      g.path += dt;
      g.x = g.baseX + Math.sin(g.path * (0.65 + i * 0.13)) * (70 + i * 18);
      g.y = g.baseY + Math.cos(g.path * 0.55) * 36;
      g.a += Math.sin(g.path * 0.8) * dt * 0.9;
      if (seenByGuard(g, p, engine.smokeClouds)) {
        engine.over = true;
        setPhase('over');
        setStatus('Spotted by vault security.');
      }
    });
    engine.smokeClouds.forEach(c => { c.life -= dt; c.r = Math.min(80, c.r + dt * 26); });
    engine.smokeClouds = engine.smokeClouds.filter(c => c.life > 0);

    if (Math.hypot(p.x - 760, p.y - 430) < 34) {
      engine.over = true;
      setPhase('over');
      setStatus('Vault core extracted. Clean escape.');
    }
    if (engine.time <= 0) {
      engine.over = true;
      setPhase('over');
      setStatus('Vault lockdown completed.');
    }

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(60, 70, 780, 504);
    for (let x = 80; x < 820; x += 40) {
      ctx.strokeStyle = 'rgba(148,163,184,0.08)';
      ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x, 504); ctx.stroke();
    }

    WALLS.forEach(w => {
      const terminal = TERMINALS.find(t => sameRect(t.open, w));
      if (terminal && engine.hacked.has(terminal)) {
        ctx.fillStyle = 'rgba(34,197,94,0.2)';
      } else {
        ctx.fillStyle = '#334155';
      }
      ctx.fillRect(...w);
    });

    engine.smokeClouds.forEach(c => {
      ctx.fillStyle = `rgba(203,213,225,${Math.min(0.45, c.life / 7)})`;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
    });

    TERMINALS.forEach(t => {
      ctx.fillStyle = engine.hacked.has(t) ? '#22c55e' : '#38bdf8';
      ctx.fillRect(t.x - 12, t.y - 12, 24, 24);
    });

    engine.guards.forEach(g => {
      ctx.fillStyle = 'rgba(248,113,113,0.18)';
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.arc(g.x, g.y, 175, g.a - 0.46, g.a + 0.46);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(g.x, g.y, 15, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(760, 430, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a7f3d0';
    ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#020617';
    ctx.fillRect(p.x + 2, p.y - 5, 8, 4);

    if (!engine.over) engine.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="vr-root">
      <BackButton />
      <canvas ref={canvasRef} width={900} height={620} className="vr-canvas" />
      <div className="vr-panel">
        <h1>Vault Raid</h1>
        <div>Time {Math.max(0, Math.ceil(time))} | Smoke {smoke}</div>
        <p>{status}</p>
        {phase !== 'playing' && <button onClick={start}>{phase === 'menu' ? 'Begin Raid' : 'Retry Raid'}</button>}
      </div>
    </div>
  );
}
