import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './MeteorMayhem3D.css';

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export default function MeteorMayhem3D() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [shield, setShield] = useState(100);
  const [wave, setWave] = useState(1);
  const [status, setStatus] = useState('Mouse aim. Click to fire.');

  useEffect(() => () => cancelAnimationFrame(engineRef.current?.raf), []);

  const spawnWave = (engine) => {
    const boss = engine.wave % 5 === 0;
    if (boss) {
      engine.asteroids.push({ x: 450, y: -110, z: 1.35, r: 78, hp: 7, boss: true, vx: 0, vy: 70 });
      setStatus('Boss asteroid inbound.');
    } else {
      for (let i = 0; i < 4 + engine.wave; i += 1) {
        engine.asteroids.push({ x: rand(80, 820), y: rand(-400, -40), z: rand(0.55, 1.4), r: rand(22, 48), hp: 1, vx: rand(-30, 30), vy: rand(90, 155) + engine.wave * 5 });
      }
      setStatus(`Wave ${engine.wave}.`);
    }
  };

  const start = () => {
    engineRef.current = {
      aim: { x: 450, y: 270 },
      shots: [],
      asteroids: [],
      particles: [],
      wave: 1,
      score: 0,
      shield: 100,
      cooldown: 0,
      over: false,
      last: performance.now(),
      raf: null,
    };
    spawnWave(engineRef.current);
    setPhase('playing');
    setScore(0);
    setShield(100);
    setWave(1);
    engineRef.current.raf = requestAnimationFrame(loop);
  };

  const moveAim = (event) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;
    const rect = canvas.getBoundingClientRect();
    engine.aim.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    engine.aim.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  };

  const fire = () => {
    const engine = engineRef.current;
    if (!engine || engine.cooldown > 0 || engine.over) return;
    engine.cooldown = 0.12;
    engine.shots.push({ x: 450, y: 470, tx: engine.aim.x, ty: engine.aim.y, life: 0.18 });
    for (const asteroid of engine.asteroids) {
      if (Math.hypot(engine.aim.x - asteroid.x, engine.aim.y - asteroid.y) < asteroid.r * asteroid.z) {
        asteroid.hp -= 1;
        engine.score += asteroid.boss ? 80 : 25;
        for (let i = 0; i < 14; i += 1) engine.particles.push({ x: asteroid.x, y: asteroid.y, vx: rand(-120, 120), vy: rand(-120, 120), life: 0.4, color: asteroid.boss ? '#facc15' : '#fb7185' });
        if (asteroid.hp <= 0) asteroid.dead = true;
        break;
      }
    }
  };

  const loop = (now) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;
    if (!canvas || !ctx || !engine) return;
    const dt = Math.min(0.04, (now - engine.last) / 1000);
    engine.last = now;
    engine.cooldown = Math.max(0, engine.cooldown - dt);
    engine.shield = Math.min(100, engine.shield + dt * 4);

    engine.asteroids.forEach(a => {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.z += dt * 0.05;
      if (a.y > 515) {
        a.dead = true;
        engine.shield -= a.boss ? 45 : 18;
      }
    });
    engine.shots.forEach(s => { s.life -= dt; });
    engine.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
    engine.shots = engine.shots.filter(s => s.life > 0);
    engine.particles = engine.particles.filter(p => p.life > 0);

    const before = engine.asteroids.length;
    engine.asteroids = engine.asteroids.filter(a => !a.dead);
    if (before && engine.asteroids.length === 0) {
      engine.wave += 1;
      setWave(engine.wave);
      spawnWave(engine);
    }
    if (engine.shield <= 0) {
      engine.over = true;
      setPhase('over');
      setStatus(`Cockpit breached at ${Math.floor(engine.score)} points.`);
    }

    setScore(engine.score);
    setShield(engine.shield);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 120; i += 1) {
      const x = (i * 71 + now * 0.03) % canvas.width;
      const y = (i * 43 + now * 0.09) % canvas.height;
      ctx.fillStyle = `rgba(255,255,255,${0.2 + (i % 5) * 0.1})`;
      ctx.fillRect(x, y, 2, 2 + (i % 3));
    }

    engine.asteroids.forEach(a => {
      const r = a.r * a.z;
      ctx.fillStyle = a.boss ? '#854d0e' : '#7f1d1d';
      ctx.shadowColor = a.boss ? '#facc15' : '#fb7185';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      for (let i = 0; i < 9; i += 1) {
        const ang = i / 9 * Math.PI * 2 + now / 900;
        const rr = r * (0.75 + (i % 2) * 0.28);
        if (i === 0) ctx.moveTo(a.x + Math.cos(ang) * rr, a.y + Math.sin(ang) * rr);
        else ctx.lineTo(a.x + Math.cos(ang) * rr, a.y + Math.sin(ang) * rr);
      }
      ctx.closePath();
      ctx.fill();
      if (a.boss) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.arc(a.x + Math.sin(now / 220) * 28, a.y, 10, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    });

    engine.shots.forEach(s => {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.tx, s.ty); ctx.stroke();
    });
    engine.particles.forEach(p => {
      ctx.globalAlpha = p.life * 2;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(15,23,42,0.86)';
    ctx.beginPath();
    ctx.moveTo(160, 540); ctx.lineTo(280, 420); ctx.lineTo(620, 420); ctx.lineTo(760, 540); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();
    ctx.strokeStyle = '#f8fafc';
    ctx.beginPath(); ctx.arc(engine.aim.x, engine.aim.y, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(engine.aim.x - 28, engine.aim.y); ctx.lineTo(engine.aim.x + 28, engine.aim.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(engine.aim.x, engine.aim.y - 28); ctx.lineTo(engine.aim.x, engine.aim.y + 28); ctx.stroke();

    if (!engine.over) engine.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="mm-root">
      <BackButton />
      <canvas ref={canvasRef} width={900} height={560} className="mm-canvas" onMouseMove={moveAim} onMouseDown={fire} />
      <div className="mm-panel">
        <h1>Meteor Mayhem 3D</h1>
        <div>Wave {wave} | Score {Math.floor(score)} | Shield {Math.max(0, Math.floor(shield))}</div>
        <p>{status}</p>
        {phase !== 'playing' && <button onClick={start}>{phase === 'menu' ? 'Launch Fighter' : 'Relaunch'}</button>}
      </div>
    </div>
  );
}
