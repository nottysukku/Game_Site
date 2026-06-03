import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './CrystalCometClash.css';

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export default function CrystalCometClash() {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(3);
  const [status, setStatus] = useState('Hold Space to jet upward through crystal storms.');

  useEffect(() => {
    const down = e => { if (e.code === 'Space') e.preventDefault(); keysRef.current[e.code] = true; };
    const up = e => { keysRef.current[e.code] = false; };
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
      runner: { x: 160, y: 280, vy: 0, invuln: 0 },
      comets: [],
      gems: [],
      particles: [],
      wave: 0,
      score: 0,
      hp: 3,
      spawn: 0,
      gemSpawn: 0.6,
      elapsed: 0,
      last: performance.now(),
      raf: null,
    };
    setPhase('playing');
    setScore(0);
    setHp(3);
    setStatus('Crystal field live.');
    engineRef.current.raf = requestAnimationFrame(loop);
  };

  const burst = (engine, x, y, color, count = 12) => {
    for (let i = 0; i < count; i += 1) {
      engine.particles.push({ x, y, vx: rand(-90, 90), vy: rand(-90, 90), life: rand(0.25, 0.55), color });
    }
  };

  const loop = (now) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;
    if (!canvas || !ctx || !engine) return;

    const dt = Math.min(0.04, (now - engine.last) / 1000);
    engine.last = now;
    engine.elapsed += dt;
    engine.spawn -= dt;
    engine.gemSpawn -= dt;

    const runner = engine.runner;
    runner.vy += keysRef.current.Space ? -860 * dt : 620 * dt;
    runner.vy = Math.max(-360, Math.min(420, runner.vy));
    runner.y = Math.max(54, Math.min(canvas.height - 54, runner.y + runner.vy * dt));
    runner.invuln = Math.max(0, runner.invuln - dt);

    if (engine.spawn <= 0) {
      const wave = engine.elapsed > 28 && Math.floor(engine.elapsed) % 30 < 6;
      const count = wave ? 3 : 1;
      for (let i = 0; i < count; i += 1) {
        engine.comets.push({
          x: canvas.width + rand(20, 260),
          y: rand(50, canvas.height - 50),
          r: rand(20, wave ? 46 : 34),
          speed: rand(210, 330) + engine.elapsed * 3,
          spin: rand(-3, 3),
        });
      }
      engine.spawn = wave ? 0.24 : rand(0.45, 0.85);
      if (wave) setStatus('Massive comet wave.');
    }

    if (engine.gemSpawn <= 0) {
      engine.gems.push({ x: canvas.width + 40, y: rand(70, canvas.height - 70), r: 12, speed: rand(180, 240) });
      engine.gemSpawn = rand(0.7, 1.2);
    }

    engine.comets.forEach(c => { c.x -= c.speed * dt; c.y += Math.sin(now / 300 + c.x) * 20 * dt; });
    engine.gems.forEach(g => { g.x -= g.speed * dt; });
    engine.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });

    engine.comets = engine.comets.filter(c => c.x > -80);
    engine.gems = engine.gems.filter(g => g.x > -40);
    engine.particles = engine.particles.filter(p => p.life > 0);

    for (const comet of engine.comets) {
      if (runner.invuln <= 0 && Math.hypot(runner.x - comet.x, runner.y - comet.y) < comet.r + 20) {
        runner.invuln = 1.2;
        engine.hp -= 1;
        setHp(engine.hp);
        burst(engine, runner.x, runner.y, '#ff4d7d', 20);
        setStatus('Hull cracked.');
        if (engine.hp <= 0) {
          setPhase('over');
          setStatus(`Run ended at ${Math.floor(engine.score)} crystals.`);
          return;
        }
      }
    }

    for (const gem of engine.gems) {
      if (!gem.collected && Math.hypot(runner.x - gem.x, runner.y - gem.y) < gem.r + 22) {
        gem.collected = true;
        engine.score += 25;
        burst(engine, gem.x, gem.y, '#67e8f9', 10);
      }
    }
    engine.gems = engine.gems.filter(g => !g.collected);
    engine.score += dt * 8;
    setScore(engine.score);

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 80; i += 1) {
      const x = (i * 97 - engine.elapsed * (40 + (i % 5) * 16)) % (canvas.width + 80);
      const y = (i * 53) % canvas.height;
      ctx.fillStyle = `rgba(255,255,255,${0.25 + (i % 4) * 0.12})`;
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.fillStyle = runner.invuln > 0 ? '#fef08a' : '#67e8f9';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.moveTo(runner.x + 28, runner.y);
    ctx.lineTo(runner.x - 22, runner.y - 20);
    ctx.lineTo(runner.x - 16, runner.y);
    ctx.lineTo(runner.x - 22, runner.y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = keysRef.current.Space ? '#fb923c' : '#f97316';
    ctx.beginPath();
    ctx.ellipse(runner.x - 28, runner.y, 18, keysRef.current.Space ? 12 : 6, 0, 0, Math.PI * 2);
    ctx.fill();

    engine.comets.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(now / 1000 * c.spin);
      ctx.fillStyle = '#ff4d7d';
      ctx.shadowColor = '#ff4d7d';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      for (let i = 0; i < 7; i += 1) {
        const a = i / 7 * Math.PI * 2;
        const rr = c.r * (0.72 + (i % 2) * 0.34);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    });

    engine.gems.forEach(g => {
      ctx.fillStyle = '#7dd3fc';
      ctx.shadowColor = '#7dd3fc';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - 16); ctx.lineTo(g.x + 14, g.y); ctx.lineTo(g.x, g.y + 16); ctx.lineTo(g.x - 14, g.y); ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    engine.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1;

    engine.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="ccc-root">
      <BackButton />
      <canvas ref={canvasRef} width={900} height={540} className="ccc-canvas" />
      <div className="ccc-hud">
        <h1>Crystal Comet Clash</h1>
        <div>Score {Math.floor(score)} | Hull {hp}</div>
        <p>{status}</p>
        {phase !== 'playing' && <button onClick={start}>{phase === 'menu' ? 'Launch Runner' : 'Retry Run'}</button>}
      </div>
    </div>
  );
}
