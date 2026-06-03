import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './TurboTotem3D.css';

export default function TurboTotem3D() {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const latchRef = useRef({});
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [height, setHeight] = useState(0);
  const [playerCount, setPlayerCount] = useState(1);
  const [turn, setTurn] = useState(0);
  const [status, setStatus] = useState('Drop swinging blocks. Trimmed overhangs decide the tower.');

  useEffect(() => {
    const down = e => { if (e.code === 'Space') e.preventDefault(); keysRef.current[e.code] = true; };
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
      blocks: [{ x: 450, y: 510, w: 160, color: '#64748b', player: 0 }],
      swing: { x: 450, dir: 1, w: 160, y: 430 },
      playerCount,
      turn: 0,
      wind: 0,
      quake: 0,
      over: false,
      last: performance.now(),
      raf: null,
    };
    setPhase('playing');
    setHeight(1);
    setTurn(0);
    setStatus('Tower live.');
    engineRef.current.raf = requestAnimationFrame(loop);
  };

  const drop = (engine) => {
    const last = engine.blocks[engine.blocks.length - 1];
    const swing = engine.swing;
    const overlap = Math.min(last.x + last.w / 2, swing.x + swing.w / 2) - Math.max(last.x - last.w / 2, swing.x - swing.w / 2);
    if (overlap <= 8) {
      engine.over = true;
      setPhase('over');
      setStatus(`Tower collapsed at ${engine.blocks.length} blocks.`);
      return;
    }
    const newX = (Math.max(last.x - last.w / 2, swing.x - swing.w / 2) + Math.min(last.x + last.w / 2, swing.x + swing.w / 2)) / 2;
    const color = engine.turn === 0 ? '#22d3ee' : '#fb7185';
    engine.blocks.push({ x: newX, y: last.y - 32, w: overlap, color, player: engine.turn });
    engine.turn = (engine.turn + 1) % engine.playerCount;
    swing.w = overlap;
    swing.y = last.y - 64;
    swing.x = 450 + (Math.random() > 0.5 ? -180 : 180);
    swing.dir = swing.x < 450 ? 1 : -1;
    engine.wind = (Math.random() - 0.5) * Math.min(2.4, 0.25 + engine.blocks.length * 0.08);
    if (engine.blocks.length % 10 === 0) engine.quake = 1.2;
    setHeight(engine.blocks.length);
    setTurn(engine.turn);
    setStatus(overlap > last.w * 0.9 ? 'Near-perfect drop.' : 'Overhang sliced.');
  };

  const loop = (now) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;
    if (!canvas || !ctx || !engine) return;
    const dt = Math.min(0.04, (now - engine.last) / 1000);
    engine.last = now;
    engine.quake = Math.max(0, engine.quake - dt);
    const speed = 190 + engine.blocks.length * 5;
    engine.swing.x += engine.swing.dir * speed * dt + engine.wind;
    if (engine.swing.x < 120 || engine.swing.x > 780) engine.swing.dir *= -1;
    if (keysRef.current.Space && !latchRef.current.Space) {
      latchRef.current.Space = true;
      drop(engine);
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e293b';
    for (let y = 0; y < canvas.height; y += 44) {
      ctx.fillRect(0, y + ((engine.blocks.length * 8) % 44), canvas.width, 2);
    }
    const cameraY = Math.max(0, engine.blocks.length * 32 - 280);
    const shake = engine.quake > 0 ? Math.sin(now / 45) * 8 * engine.quake : 0;
    ctx.save();
    ctx.translate(shake, cameraY);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 542 - cameraY, canvas.width, 36);
    engine.blocks.forEach((b, i) => {
      const sway = Math.sin(now / 400 + i) * Math.min(9, engine.blocks.length * 0.2) * (i / engine.blocks.length);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - b.w / 2 + sway, b.y, b.w, 30);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(b.x - b.w / 2 + sway + 8, b.y + 5, Math.max(12, b.w - 16), 4);
    });
    if (!engine.over) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(450, engine.swing.y - 90); ctx.lineTo(engine.swing.x, engine.swing.y); ctx.stroke();
      ctx.fillStyle = engine.turn === 0 ? '#22d3ee' : '#fb7185';
      ctx.fillRect(engine.swing.x - engine.swing.w / 2, engine.swing.y, engine.swing.w, 30);
    }
    ctx.restore();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`Wind ${engine.wind.toFixed(1)}  Quake ${engine.quake > 0 ? 'ACTIVE' : 'idle'}`, 40, 42);

    if (!engine.over) engine.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="tt-root">
      <BackButton />
      <canvas ref={canvasRef} width={900} height={580} className="tt-canvas" />
      <div className="tt-panel">
        <h1>Turbo Totem 3D</h1>
        <div>Blocks {height} | Turn P{turn + 1}</div>
        <p>{status}</p>
        {phase === 'menu' && (
          <div className="tt-pickers">
            <button className={playerCount === 1 ? 'active' : ''} onClick={() => setPlayerCount(1)}>1P</button>
            <button className={playerCount === 2 ? 'active' : ''} onClick={() => setPlayerCount(2)}>2P</button>
          </div>
        )}
        {phase !== 'playing' && <button onClick={start}>{phase === 'menu' ? 'Start Stack' : 'Stack Again'}</button>}
      </div>
    </div>
  );
}
