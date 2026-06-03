import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './OrbHarvest3D.css';

const TIERS = [
  { name: 'cone', size: 7, color: '#fb923c' },
  { name: 'bench', size: 13, color: '#a3e635' },
  { name: 'car', size: 21, color: '#38bdf8' },
  { name: 'shop', size: 34, color: '#c084fc' },
  { name: 'tower', size: 54, color: '#f472b6' },
];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export default function OrbHarvest3D() {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [size, setSize] = useState(18);
  const [time, setTime] = useState(120);
  const [status, setStatus] = useState('Absorb smaller objects to grow the cosmic orb.');

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
    const objects = [];
    for (let i = 0; i < 120; i += 1) {
      const tier = TIERS[Math.floor(Math.random() * TIERS.length)];
      objects.push({ x: rand(80, 2000), y: rand(80, 1500), tier, stuck: false, angle: rand(0, Math.PI * 2) });
    }
    engineRef.current = {
      orb: { x: 160, y: 160, r: 18, vx: 0, vy: 0, spin: 0 },
      objects,
      camera: { x: 0, y: 0 },
      time: 120,
      over: false,
      last: performance.now(),
      raf: null,
    };
    setPhase('playing');
    setSize(18);
    setTime(120);
    setStatus('Roll out.');
    engineRef.current.raf = requestAnimationFrame(loop);
  };

  const loop = (now) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;
    if (!canvas || !ctx || !engine) return;
    const dt = Math.min(0.04, (now - engine.last) / 1000);
    engine.last = now;
    engine.time -= dt;
    const orb = engine.orb;
    let ax = 0;
    let ay = 0;
    if (keysRef.current.KeyW || keysRef.current.ArrowUp) ay -= 1;
    if (keysRef.current.KeyS || keysRef.current.ArrowDown) ay += 1;
    if (keysRef.current.KeyA || keysRef.current.ArrowLeft) ax -= 1;
    if (keysRef.current.KeyD || keysRef.current.ArrowRight) ax += 1;
    const len = Math.hypot(ax, ay) || 1;
    orb.vx += ax / len * 480 * dt;
    orb.vy += ay / len * 480 * dt;
    orb.vx *= 0.94;
    orb.vy *= 0.94;
    orb.x = Math.max(40, Math.min(2050, orb.x + orb.vx * dt));
    orb.y = Math.max(40, Math.min(1550, orb.y + orb.vy * dt));
    orb.spin += Math.hypot(orb.vx, orb.vy) * dt / Math.max(20, orb.r);

    engine.objects.forEach(obj => {
      if (obj.stuck) return;
      const d = Math.hypot(orb.x - obj.x, orb.y - obj.y);
      if (d < orb.r + obj.tier.size) {
        if (obj.tier.size < orb.r * 0.78) {
          obj.stuck = true;
          obj.attach = { a: Math.atan2(obj.y - orb.y, obj.x - orb.x), d: orb.r * 0.62 };
          orb.r += obj.tier.size * 0.055;
          setStatus(`Absorbed ${obj.tier.name}.`);
        } else {
          orb.vx += (orb.x - obj.x) / d * 180;
          orb.vy += (orb.y - obj.y) / d * 180;
          setStatus(`${obj.tier.name} is still too large.`);
        }
      }
    });

    engine.camera.x += (orb.x - canvas.width / 2 - engine.camera.x) * 0.08;
    engine.camera.y += (orb.y - canvas.height / 2 - engine.camera.y) * 0.08;
    engine.camera.x = Math.max(0, Math.min(1200, engine.camera.x));
    engine.camera.y = Math.max(0, Math.min(950, engine.camera.y));
    setSize(orb.r);
    setTime(engine.time);
    if (orb.r >= 86) {
      engine.over = true;
      setPhase('over');
      setStatus('Target mass reached. The city is harvested.');
    } else if (engine.time <= 0) {
      engine.over = true;
      setPhase('over');
      setStatus(`Time up at size ${Math.floor(orb.r)}.`);
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-engine.camera.x, -engine.camera.y);
    ctx.fillStyle = '#94a3b8';
    for (let x = 0; x < 2200; x += 100) ctx.fillRect(x, 0, 8, 1700);
    for (let y = 0; y < 1700; y += 100) ctx.fillRect(0, y, 2200, 8);
    engine.objects.forEach(obj => {
      if (obj.stuck) return;
      ctx.fillStyle = obj.tier.color;
      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.angle);
      ctx.fillRect(-obj.tier.size, -obj.tier.size, obj.tier.size * 2, obj.tier.size * 2);
      ctx.restore();
    });

    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.arc(orb.x + 8, orb.y + 10, orb.r, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(orb.x - orb.r * 0.3, orb.y - orb.r * 0.3, 5, orb.x, orb.y, orb.r);
    grad.addColorStop(0, '#fef3c7');
    grad.addColorStop(0.45, '#38bdf8');
    grad.addColorStop(1, '#312e81');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2); ctx.fill();
    engine.objects.forEach(obj => {
      if (!obj.stuck) return;
      const a = obj.attach.a + orb.spin;
      const x = orb.x + Math.cos(a) * obj.attach.d;
      const y = orb.y + Math.sin(a) * obj.attach.d;
      ctx.fillStyle = obj.tier.color;
      ctx.fillRect(x - obj.tier.size * 0.45, y - obj.tier.size * 0.45, obj.tier.size * 0.9, obj.tier.size * 0.9);
    });
    ctx.restore();

    if (!engine.over) engine.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="oh-root">
      <BackButton />
      <canvas ref={canvasRef} width={900} height={560} className="oh-canvas" />
      <div className="oh-panel">
        <h1>Orb Harvest 3D</h1>
        <div>Size {Math.floor(size)} / 86 | Time {Math.max(0, Math.ceil(time))}</div>
        <p>{status}</p>
        {phase !== 'playing' && <button onClick={start}>{phase === 'menu' ? 'Start Harvest' : 'Harvest Again'}</button>}
      </div>
    </div>
  );
}
