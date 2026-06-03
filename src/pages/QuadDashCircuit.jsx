import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './QuadDashCircuit.css';

const CONTROLS = [
  { name: 'P1', color: '#22c55e', up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', boost: 'ShiftLeft' },
  { name: 'P2', color: '#38bdf8', up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', boost: 'KeyO' },
  { name: 'P3', color: '#f472b6', up: 'KeyT', down: 'KeyG', left: 'KeyF', right: 'KeyH', boost: 'KeyY' },
  { name: 'P4', color: '#f59e0b', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', boost: 'Slash' },
];

const TRACK = [
  { x: 170, y: 160 }, { x: 450, y: 110 }, { x: 745, y: 160 }, { x: 790, y: 300 },
  { x: 720, y: 450 }, { x: 450, y: 500 }, { x: 175, y: 450 }, { x: 95, y: 300 },
];

function distToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function trackDistance(p) {
  return TRACK.reduce((best, a, i) => Math.min(best, distToSegment(p, a, TRACK[(i + 1) % TRACK.length])), Infinity);
}

export default function QuadDashCircuit() {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [leader, setLeader] = useState('Toy cars ready.');

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
      cars: CONTROLS.map((c, i) => ({
        x: 430 - i * 24,
        y: 132 + i * 20,
        angle: 0,
        speed: 0,
        lap: 1,
        wp: 0,
        boost: 1,
        tiny: 0,
        oil: 0,
        finished: false,
      })),
      powers: [
        { x: 260, y: 120, kind: 'boost' },
        { x: 712, y: 245, kind: 'oil' },
        { x: 520, y: 480, kind: 'shrink' },
        { x: 160, y: 380, kind: 'boost' },
      ],
      slicks: [],
      over: false,
      last: performance.now(),
      raf: null,
    };
    setPhase('playing');
    setLeader('First toy car to finish 3 laps wins.');
    engineRef.current.raf = requestAnimationFrame(loop);
  };

  const loop = (now) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;
    if (!canvas || !ctx || !engine) return;
    const dt = Math.min(0.04, (now - engine.last) / 1000);
    engine.last = now;

    engine.cars.forEach((car, i) => {
      if (car.finished) return;
      const ctl = CONTROLS[i];
      const offTrack = trackDistance(car) > 72;
      const max = (car.tiny > 0 ? 170 : 235) * (offTrack || car.oil > 0 ? 0.55 : 1);
      if (keysRef.current[ctl.up]) car.speed = Math.min(max, car.speed + 190 * dt);
      else if (keysRef.current[ctl.down]) car.speed = Math.max(-90, car.speed - 220 * dt);
      else car.speed *= 0.982;
      if (keysRef.current[ctl.boost] && car.boost > 0) {
        car.speed += 380 * dt;
        car.boost = Math.max(0, car.boost - dt * 0.6);
      }
      const turn = (car.speed >= 0 ? 1 : -1) * 2.7 * dt;
      if (keysRef.current[ctl.left]) car.angle -= turn;
      if (keysRef.current[ctl.right]) car.angle += turn;
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      car.oil = Math.max(0, car.oil - dt);
      car.tiny = Math.max(0, car.tiny - dt);

      engine.slicks.forEach(s => {
        if (Math.hypot(car.x - s.x, car.y - s.y) < 34) car.oil = 1.2;
      });

      engine.powers.forEach(p => {
        if (!p.used && Math.hypot(car.x - p.x, car.y - p.y) < 24) {
          p.used = true;
          if (p.kind === 'boost') car.boost = 1;
          if (p.kind === 'oil') engine.slicks.push({ x: car.x - Math.cos(car.angle) * 42, y: car.y - Math.sin(car.angle) * 42, life: 7 });
          if (p.kind === 'shrink') engine.cars.forEach((other, j) => { if (j !== i) other.tiny = 4; });
          setTimeout(() => { p.x = 120 + Math.random() * 680; p.y = 120 + Math.random() * 380; p.used = false; }, 2000);
        }
      });

      const next = TRACK[(car.wp + 1) % TRACK.length];
      if (Math.hypot(car.x - next.x, car.y - next.y) < 70) {
        car.wp = (car.wp + 1) % TRACK.length;
        if (car.wp === 0) {
          car.lap += 1;
          if (car.lap > 3) {
            car.finished = true;
            engine.over = true;
            setPhase('over');
            setLeader(`${ctl.name} wins Tabletop Turbo.`);
            return;
          }
        }
      }
    });
    engine.slicks.forEach(s => { s.life -= dt; });
    engine.slicks = engine.slicks.filter(s => s.life > 0);

    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d8b98b';
    ctx.fillRect(55, 52, 790, 485);
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 124;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    TRACK.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 112;
    ctx.setLineDash([16, 16]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 100;
    ctx.stroke();

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(430, 76, 180, 32);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(90, 82, 150, 28);
    ctx.fillStyle = '#c2410c';
    ctx.beginPath(); ctx.arc(780, 430, 34, 0, Math.PI * 2); ctx.fill();

    engine.slicks.forEach(s => {
      ctx.fillStyle = 'rgba(17,24,39,0.82)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 30, 18, 0.4, 0, Math.PI * 2); ctx.fill();
    });
    engine.powers.forEach(p => {
      if (p.used) return;
      ctx.fillStyle = p.kind === 'boost' ? '#22c55e' : p.kind === 'oil' ? '#111827' : '#a78bfa';
      ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.fill();
    });

    engine.cars.forEach((car, i) => {
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      const scale = car.tiny > 0 ? 0.65 : 1;
      ctx.scale(scale, scale);
      ctx.fillStyle = CONTROLS[i].color;
      ctx.fillRect(-18, -10, 36, 20);
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, -7, 11, 14);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-18, -10, 4, 20);
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${CONTROLS[i].name} L${Math.min(3, car.lap)}`, car.x, car.y - 18);
    });

    if (!engine.over) engine.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="qdc-root">
      <BackButton />
      <canvas ref={canvasRef} width={900} height={580} className="qdc-canvas" />
      <div className="qdc-panel">
        <h1>Quad Dash Circuit</h1>
        <p>{leader}</p>
        {phase !== 'playing' && <button onClick={start}>{phase === 'menu' ? 'Start Table Race' : 'Race Again'}</button>}
      </div>
    </div>
  );
}
