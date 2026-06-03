import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import BackButton from './BackButton';
import './CrownRush3D.css';

const ROOM_PREFIX = 'arcadecrown_';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function code() {
  let out = '';
  for (let i = 0; i < 6; i += 1) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d < -Math.PI) d += Math.PI * 2;
  while (d > Math.PI) d -= Math.PI * 2;
  return d;
}

export default function CrownRush3D() {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const engineRef = useRef(null);
  const peerRef = useRef(null);
  const connRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [room, setRoom] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [connected, setConnected] = useState(false);
  const [crownTime, setCrownTime] = useState(0);
  const [status, setStatus] = useState('Host or join a Crown Rush arena.');

  useEffect(() => {
    const down = e => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyG', 'Space'].includes(e.code)) e.preventDefault();
      keysRef.current[e.code] = true;
    };
    const up = e => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(engineRef.current?.raf);
      connRef.current?.close();
      peerRef.current?.destroy();
    };
  }, []);

  const initEngine = (spawn = -8) => {
    engineRef.current = {
      player: { x: 0, z: spawn, yaw: 0, y: 0, hp: 100, crown: false, hold: 0, gun: false, shot: false, stun: 0, rockCd: 0 },
      remote: { x: 0, z: -spawn, yaw: Math.PI, hp: 100, crown: false, hold: 0, gun: false, stun: 0, connected: false },
      crown: { x: 0, z: 0, y: 2.4 },
      gun: { x: Math.random() > 0.5 ? -7 : 7, z: Math.random() > 0.5 ? -6 : 6, taken: false },
      rocks: [{ x: -5, z: 3 }, { x: 5, z: -3 }, { x: 8, z: 4 }, { x: -8, z: -4 }],
      thrown: [],
      message: 'Claim the crown on the central tower.',
      sync: 0,
      over: false,
      last: performance.now(),
      raf: null,
    };
    setCrownTime(0);
    setStatus('Claim the crown on the central tower.');
    setPhase('playing');
    engineRef.current.raf = requestAnimationFrame(loop);
  };

  const send = (payload) => {
    if (connRef.current?.open) connRef.current.send(payload);
  };

  const wire = (conn) => {
    connRef.current = conn;
    conn.on('open', () => {
      setConnected(true);
      send({ type: 'hello' });
    });
    conn.on('data', data => {
      const engine = engineRef.current;
      if (!engine) return;
      if (data.type === 'hello') engine.remote.connected = true;
      if (data.type === 'sync') engine.remote = { ...engine.remote, ...data.remote, connected: true };
      if (data.type === 'rock') {
        const p = engine.player;
        if (Math.hypot(p.x - data.x, p.z - data.z) < 1.5) {
          p.stun = 2;
          setStatus('Stunned by a thrown rock.');
        }
      }
      if (data.type === 'shot') {
        engine.player.hp = 0;
        engine.over = true;
        setPhase('over');
        setStatus('The hidden gun ended the round.');
      }
      if (data.type === 'win') {
        engine.over = true;
        setPhase('over');
        setStatus('Opponent held the crown for 30 seconds.');
      }
    });
    conn.on('close', () => {
      setConnected(false);
      setStatus('Opponent disconnected.');
    });
  };

  const host = () => {
    const next = code();
    setRoom(next);
    setStatus('Waiting for challenger.');
    setPhase('hosting');
    const peer = new Peer(ROOM_PREFIX + next);
    peerRef.current = peer;
    peer.on('connection', conn => {
      wire(conn);
      initEngine(-8);
    });
    peer.on('error', err => setStatus(`Peer error ${err.type}`));
  };

  const join = () => {
    const target = joinCode.trim().toUpperCase();
    if (!target) return;
    setPhase('joining');
    setStatus('Connecting to arena.');
    const peer = new Peer();
    peerRef.current = peer;
    peer.on('open', () => {
      const conn = peer.connect(ROOM_PREFIX + target);
      wire(conn);
      initEngine(8);
      setRoom(target);
    });
    peer.on('error', err => setStatus(`Peer error ${err.type}`));
  };

  const mouseMove = (event) => {
    const engine = engineRef.current;
    if (!engine || phase !== 'playing') return;
    engine.player.yaw += event.movementX * 0.006;
  };

  const interact = () => {
    const engine = engineRef.current;
    if (!engine || engine.over) return;
    const p = engine.player;
    if (dist(p, engine.crown) < 2.2 && p.y > 1.5) {
      p.crown = true;
      setStatus('The crown has been claimed.');
    }
    if (!engine.gun.taken && dist(p, engine.gun) < 1.7) {
      p.gun = true;
      engine.gun.taken = true;
      setStatus('Hidden gun found. One shot.');
    }
  };

  const click = () => {
    const engine = engineRef.current;
    if (!engine || engine.over) return;
    const p = engine.player;
    if (p.gun && !p.shot) {
      p.shot = true;
      const aim = Math.atan2(engine.remote.x - p.x, engine.remote.z - p.z);
      if (Math.abs(angleDiff(aim, p.yaw)) < 0.22 && dist(p, engine.remote) < 15) {
        send({ type: 'shot' });
        engine.over = true;
        setPhase('over');
        setStatus('Clean hidden-gun shot.');
      } else setStatus('Shot missed. The gun is spent.');
    }
  };

  const throwRock = (engine) => {
    const p = engine.player;
    if (p.rockCd > 0) return;
    const rock = engine.rocks.find(r => Math.hypot(r.x - p.x, r.z - p.z) < 1.8);
    if (!rock) return;
    p.rockCd = 1.2;
    const tx = p.x + Math.sin(p.yaw) * 5;
    const tz = p.z + Math.cos(p.yaw) * 5;
    engine.thrown.push({ x: p.x, z: p.z, tx, tz, life: 0.5 });
    send({ type: 'rock', x: tx, z: tz });
    if (Math.hypot(engine.remote.x - tx, engine.remote.z - tz) < 1.7) setStatus('Rock throw connected.');
  };

  const loop = (now) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;
    if (!engine) return;
    if (!canvas || !ctx) {
      engine.raf = requestAnimationFrame(loop);
      return;
    }
    const dt = Math.min(0.04, (now - engine.last) / 1000);
    engine.last = now;
    const p = engine.player;
    p.stun = Math.max(0, p.stun - dt);
    p.rockCd = Math.max(0, p.rockCd - dt);
    if (p.stun <= 0) {
      const speed = keysRef.current.ShiftLeft ? 6.2 : 4.2;
      let strafe = 0;
      let fwd = 0;
      if (keysRef.current.KeyW) fwd += 1;
      if (keysRef.current.KeyS) fwd -= 1;
      if (keysRef.current.KeyA) strafe -= 1;
      if (keysRef.current.KeyD) strafe += 1;
      p.x += (Math.sin(p.yaw) * fwd + Math.cos(p.yaw) * strafe) * speed * dt;
      p.z += (Math.cos(p.yaw) * fwd - Math.sin(p.yaw) * strafe) * speed * dt;
      p.x = Math.max(-12, Math.min(12, p.x));
      p.z = Math.max(-12, Math.min(12, p.z));
    }
    const onTower = Math.hypot(p.x, p.z) < 2.1;
    p.y += ((onTower ? 2.2 : 0) - p.y) * 0.08;
    if (keysRef.current.KeyE) interact();
    if (keysRef.current.KeyG) throwRock(engine);
    if (p.crown) {
      p.hold += dt;
      setCrownTime(p.hold);
      engine.crown.x = p.x;
      engine.crown.z = p.z;
      if (p.hold >= 30) {
        send({ type: 'win' });
        engine.over = true;
        setPhase('over');
        setStatus('You held the crown for 30 seconds.');
      }
    }
    engine.thrown.forEach(r => { r.life -= dt; r.x += (r.tx - r.x) * 0.12; r.z += (r.tz - r.z) * 0.12; });
    engine.thrown = engine.thrown.filter(r => r.life > 0);
    engine.sync += dt;
    if (engine.sync > 0.05) {
      engine.sync = 0;
      send({ type: 'sync', remote: { x: p.x, z: p.z, yaw: p.yaw, hp: p.hp, crown: p.crown, hold: p.hold, gun: p.gun, stun: p.stun } });
    }

    ctx.fillStyle = '#87b7d9';
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
    ctx.fillStyle = '#3f5f40';
    ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
    ctx.fillStyle = '#7c3f1d';
    ctx.fillRect(0, canvas.height / 2 + 90, canvas.width, 120);
    ctx.fillStyle = 'rgba(15,23,42,0.7)';
    ctx.fillRect(0, 0, canvas.width, 72);

    const drawBillboard = (obj, color, label, size = 1) => {
      const dx = obj.x - p.x;
      const dz = obj.z - p.z;
      const distance = Math.hypot(dx, dz);
      const angle = angleDiff(Math.atan2(dx, dz), p.yaw);
      if (Math.abs(angle) > 0.9 || distance < 0.1) return;
      const scale = 430 / distance;
      const x = canvas.width / 2 + Math.sin(angle) * scale;
      const y = canvas.height / 2 + 65 - (obj.y || 0) * scale * 0.13;
      const r = Math.max(8, Math.min(90, scale * 0.08 * size));
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - r - 8);
    };

    for (let i = -10; i <= 10; i += 5) {
      drawBillboard({ x: i, z: 0, y: 0.8 }, '#78350f', 'TOWER', 1.8);
    }
    if (!p.crown && !engine.remote.crown) drawBillboard(engine.crown, '#facc15', 'CROWN', 1.2);
    if (!engine.gun.taken) drawBillboard({ ...engine.gun, y: 0.4 }, '#e5e7eb', 'GUN', 0.9);
    engine.rocks.forEach(r => drawBillboard({ ...r, y: 0.25 }, '#94a3b8', 'ROCK', 0.65));
    engine.thrown.forEach(r => drawBillboard({ ...r, y: 0.8 }, '#f97316', 'THROWN', 0.8));
    if (engine.remote.connected || connected) drawBillboard({ ...engine.remote, y: 0.8 }, engine.remote.crown ? '#facc15' : '#fb7185', 'RIVAL', 1.1);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(canvas.width / 2 - 28, canvas.height / 2); ctx.lineTo(canvas.width / 2 + 28, canvas.height / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(canvas.width / 2, canvas.height / 2 - 28); ctx.lineTo(canvas.width / 2, canvas.height / 2 + 28); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`CROWN ${Math.floor(p.hold)}/30  ${p.gun ? (p.shot ? 'GUN SPENT' : 'GUN READY') : 'NO GUN'}  ROOM ${room || 'LOCAL'}`, 24, 38);

    if (!engine.over) engine.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="cr-root">
      <BackButton />
      {phase === 'playing' ? (
        <canvas ref={canvasRef} width={980} height={620} className="cr-canvas" onMouseMove={mouseMove} onMouseDown={click} />
      ) : (
        <div className="cr-menu">
          <h1>Crown Rush 3D</h1>
          <p>{status}</p>
          <button onClick={host}>Host Crown Room</button>
          <div className="cr-join">
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="ROOM CODE" />
            <button onClick={join}>Join</button>
          </div>
          {phase === 'hosting' && <strong>Room: {room}</strong>}
          {phase === 'over' && <button onClick={() => initEngine(-8)}>Local Rematch</button>}
        </div>
      )}
      {phase === 'playing' && (
        <div className="cr-hud">
          <h1>Crown Rush 3D</h1>
          <div>Hold {Math.floor(crownTime)} / 30 | {connected ? 'Online' : 'Local/Waiting'}</div>
          <p>{status}</p>
        </div>
      )}
    </div>
  );
}
