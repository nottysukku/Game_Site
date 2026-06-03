import React, { useEffect, useMemo, useRef, useState } from 'react';
import BackButton from './BackButton';
import './ZoneControl3D.css';

const SIZE = 9;
const TEAMS = [
  { name: 'Blue', color: '#22d3ee' },
  { name: 'Rose', color: '#fb7185' },
];

function neighbors(q, r) {
  return [[q + 1, r], [q - 1, r], [q, r + 1], [q, r - 1], [q + 1, r - 1], [q - 1, r + 1]];
}

function key(q, r) {
  return `${q},${r}`;
}

export default function ZoneControl3D() {
  const canvasRef = useRef(null);
  const [turn, setTurn] = useState(0);
  const [tool, setTool] = useState('capture');
  const [status, setStatus] = useState('Capture adjacent hexes or place defenses.');
  const [cells, setCells] = useState(() => {
    const map = new Map();
    for (let q = 0; q < SIZE; q += 1) {
      for (let r = 0; r < SIZE; r += 1) map.set(key(q, r), { q, r, owner: null, turret: false, wall: false });
    }
    map.get(key(0, SIZE - 1)).owner = 0;
    map.get(key(SIZE - 1, 0)).owner = 1;
    return map;
  });

  const counts = useMemo(() => {
    const totals = [0, 0];
    cells.forEach(c => { if (c.owner !== null) totals[c.owner] += 1; });
    return totals;
  }, [cells]);

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#07111f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const originX = 450;
    const originY = 92;
    const w = 54;
    const h = 31;
    cells.forEach(c => {
      const x = originX + (c.q - c.r) * w * 0.75;
      const y = originY + (c.q + c.r) * h;
      c.cx = x;
      c.cy = y;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = Math.PI / 6 + i * Math.PI / 3;
        const px = x + Math.cos(a) * 32;
        const py = y + Math.sin(a) * 32;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = c.owner === null ? '#172033' : `${TEAMS[c.owner].color}66`;
      if (c.wall) ctx.fillStyle = '#64748b';
      ctx.fill();
      ctx.strokeStyle = c.owner === null ? 'rgba(148,163,184,0.25)' : TEAMS[c.owner].color;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (c.turret) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fde68a';
        ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke();
      }
    });
  };

  useEffect(draw, [cells]);

  const reset = () => {
    const map = new Map();
    for (let q = 0; q < SIZE; q += 1) {
      for (let r = 0; r < SIZE; r += 1) map.set(key(q, r), { q, r, owner: null, turret: false, wall: false });
    }
    map.get(key(0, SIZE - 1)).owner = 0;
    map.get(key(SIZE - 1, 0)).owner = 1;
    setCells(map);
    setTurn(0);
    setTool('capture');
    setStatus('Capture adjacent hexes or place defenses.');
  };

  const click = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    let picked = null;
    cells.forEach(c => {
      if (Math.hypot(x - c.cx, y - c.cy) < 31) picked = c;
    });
    if (!picked) return;
    const next = new Map(cells);
    const c = { ...picked };
    const hasAdj = neighbors(c.q, c.r).some(([q, r]) => next.get(key(q, r))?.owner === turn);
    if (tool === 'capture') {
      if (!hasAdj || c.wall || c.owner === turn) {
        setStatus('Capture must touch your territory and cannot cross walls.');
        return;
      }
      c.owner = turn;
      c.wall = false;
      c.turret = false;
    } else if (tool === 'turret') {
      if (c.owner !== turn) {
        setStatus('Turrets must sit on your territory.');
        return;
      }
      c.turret = !c.turret;
    } else {
      if (!hasAdj || c.owner !== null) {
        setStatus('Walls must be placed beside your color on empty ground.');
        return;
      }
      c.wall = !c.wall;
    }

    next.set(key(c.q, c.r), c);
    next.forEach(cell => {
      if (cell.owner !== null) return;
      const threatened = neighbors(cell.q, cell.r).some(([q, r]) => {
        const n = next.get(key(q, r));
        return n?.owner === turn && n.turret;
      });
      if (threatened && Math.random() < 0.28) cell.owner = turn;
    });

    const owned = [0, 0];
    next.forEach(cell => { if (cell.owner !== null) owned[cell.owner] += 1; });
    if (owned[turn] / next.size >= 0.6) setStatus(`${TEAMS[turn].name} controls 60 percent and wins.`);
    else {
      setTurn(1 - turn);
      setStatus(`${TEAMS[1 - turn].name} command phase.`);
    }
    setCells(next);
  };

  return (
    <div className="zc-root">
      <BackButton />
      <canvas ref={canvasRef} width={900} height={620} className="zc-canvas" onClick={click} />
      <div className="zc-panel">
        <h1>Zone Control 3D</h1>
        <div className="zc-turn" style={{ color: TEAMS[turn].color }}>{TEAMS[turn].name} Turn</div>
        <p>{status}</p>
        <div className="zc-tools">
          {['capture', 'turret', 'wall'].map(item => <button key={item} className={tool === item ? 'active' : ''} onClick={() => setTool(item)}>{item}</button>)}
        </div>
        <div className="zc-counts">Blue {counts[0]} | Rose {counts[1]}</div>
        <button onClick={reset}>Reset War</button>
      </div>
    </div>
  );
}
