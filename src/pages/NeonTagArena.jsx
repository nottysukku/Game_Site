import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './NeonTagArena.css';

const PLAYERS = [
  { name: 'P1', color: '#22d3ee', keys: ['KeyW', 'KeyS', 'KeyA', 'KeyD'] },
  { name: 'P2', color: '#fb7185', keys: ['KeyI', 'KeyK', 'KeyJ', 'KeyL'] },
  { name: 'P3', color: '#facc15', keys: ['KeyT', 'KeyG', 'KeyF', 'KeyH'] },
  { name: 'P4', color: '#a78bfa', keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] },
];

const WALLS = [
  [80, 80, 740, 18], [80, 472, 740, 18], [80, 80, 18, 410], [802, 80, 18, 410],
  [156, 145, 18, 210], [236, 98, 18, 165], [236, 342, 18, 118],
  [320, 145, 240, 18], [320, 242, 18, 158], [404, 242, 240, 18],
  [644, 145, 18, 220], [490, 342, 18, 118], [570, 342, 160, 18],
  [110, 402, 120, 18], [690, 402, 110, 18],
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hitsWall(x, y, radius) {
  return WALLS.some(([wx, wy, ww, wh]) => (
    x + radius > wx && x - radius < wx + ww && y + radius > wy && y - radius < wy + wh
  ));
}

export default function NeonTagArena() {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [time, setTime] = useState(90);
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [it, setIt] = useState(0);
  const [status, setStatus] = useState('One runner is IT. Tag to transfer the chase.');

  useEffect(() => {
    const down = e => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
      keysRef.current[e.code] = true;
    };
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
    const players = [
      { x: 142, y: 130 }, { x: 742, y: 430 }, { x: 142, y: 430 }, { x: 742, y: 130 },
    ].map((pos, i) => ({ ...pos, score: 0, trail: [], boost: 0, frozen: 0, id: i }));

    engineRef.current = {
      players,
      it: Math.floor(Math.random() * 4),
      time: 90,
      over: false,
      pellets: [
        { x: 450, y: 130, kind: 'boost' },
        { x: 450, y: 430, kind: 'freeze' },
        { x: 134, y: 274, kind: 'phase' },
        { x: 756, y: 274, kind: 'boost' },
      ],
      raf: null,
      last: performance.now(),
    };
    setPhase('playing');
    setScores([0, 0, 0, 0]);
    setTime(90);
    setIt(engineRef.current.it);
    setStatus(`${PLAYERS[engineRef.current.it].name} is IT.`);
    engineRef.current.raf = requestAnimationFrame(loop);
  };

  const loop = (now) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;
    if (!canvas || !ctx || !engine || engine.over) return;

    const dt = Math.min(0.04, (now - engine.last) / 1000);
    engine.last = now;
    engine.time = Math.max(0, engine.time - dt);

    engine.players.forEach((player, i) => {
      const [up, down, left, right] = PLAYERS[i].keys;
      const speed = (player.boost > 0 ? 220 : 145) * (player.frozen > 0 ? 0.25 : 1);
      let dx = 0;
      let dy = 0;
      if (keysRef.current[up]) dy -= 1;
      if (keysRef.current[down]) dy += 1;
      if (keysRef.current[left]) dx -= 1;
      if (keysRef.current[right]) dx += 1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = clamp(player.x + (dx / len) * speed * dt, 105, 795);
      const ny = clamp(player.y + (dy / len) * speed * dt, 105, 465);
      const phasing = player.phase > 0;
      if (phasing || !hitsWall(nx, player.y, 14)) player.x = nx;
      if (phasing || !hitsWall(player.x, ny, 14)) player.y = ny;
      player.boost = Math.max(0, player.boost - dt);
      player.frozen = Math.max(0, player.frozen - dt);
      player.phase = Math.max(0, (player.phase || 0) - dt);
      player.trail.push({ x: player.x, y: player.y, t: 0.5 });
      player.trail = player.trail.filter(dot => (dot.t -= dt) > 0).slice(-18);
    });

    const chaser = engine.players[engine.it];
    chaser.score += dt;
    for (let i = 0; i < engine.players.length; i += 1) {
      if (i !== engine.it && Math.hypot(chaser.x - engine.players[i].x, chaser.y - engine.players[i].y) < 27) {
        engine.it = i;
        engine.players[i].boost = 0.8;
        setIt(i);
        setStatus(`${PLAYERS[i].name} got tagged and is now IT.`);
      }
    }

    engine.pellets.forEach(pellet => {
      engine.players.forEach(player => {
        if (Math.hypot(player.x - pellet.x, player.y - pellet.y) < 24) {
          if (pellet.kind === 'boost') player.boost = 4;
          if (pellet.kind === 'phase') player.phase = 3;
          if (pellet.kind === 'freeze') {
            engine.players[engine.it].frozen = 1.8;
          }
          pellet.x = 120 + Math.random() * 660;
          pellet.y = 110 + Math.random() * 340;
        }
      });
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const glow = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    glow.addColorStop(0, '#061a2f');
    glow.addColorStop(1, '#170a2d');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(34,211,238,0.15)';
    for (let x = 0; x < canvas.width; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    WALLS.forEach(([x, y, w, h]) => {
      ctx.fillStyle = '#132344';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 15;
      ctx.fillRect(x, y, w, h);
      ctx.shadowBlur = 0;
    });

    engine.pellets.forEach(p => {
      ctx.fillStyle = p.kind === 'freeze' ? '#a7f3d0' : p.kind === 'phase' ? '#c084fc' : '#fde047';
      ctx.beginPath(); ctx.arc(p.x, p.y, 9 + Math.sin(now / 130) * 2, 0, Math.PI * 2); ctx.fill();
    });

    engine.players.forEach((player, i) => {
      player.trail.forEach(dot => {
        ctx.globalAlpha = dot.t;
        ctx.fillStyle = PLAYERS[i].color;
        ctx.beginPath(); ctx.arc(dot.x, dot.y, 8, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = PLAYERS[i].color;
      ctx.shadowColor = PLAYERS[i].color;
      ctx.shadowBlur = i === engine.it ? 28 : 12;
      ctx.beginPath(); ctx.arc(player.x, player.y, i === engine.it ? 18 : 15, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#031018';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(PLAYERS[i].name, player.x, player.y + 4);
    });

    setTime(engine.time);
    setScores(engine.players.map(p => p.score));
    if (engine.time <= 0) {
      engine.over = true;
      const winner = engine.players.reduce((best, p) => (p.score < best.score ? p : best), engine.players[0]);
      setStatus(`${PLAYERS[winner.id].name} wins by avoiding IT the most!`);
      setPhase('over');
      return;
    }
    engine.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="nt-root">
      <BackButton />
      <canvas ref={canvasRef} width={900} height={560} className="nt-canvas" />
      <div className="nt-panel">
        <h1>Neon Tag Arena</h1>
        <div className="nt-meta">Time {Math.ceil(time)} | IT {PLAYERS[it].name}</div>
        <p>{status}</p>
        <div className="nt-scores">
          {PLAYERS.map((p, i) => <span key={p.name} style={{ color: p.color }}>{p.name} {scores[i].toFixed(1)}</span>)}
        </div>
        {phase !== 'playing' && <button onClick={start}>{phase === 'menu' ? 'Start Tag' : 'Rematch'}</button>}
      </div>
    </div>
  );
}
