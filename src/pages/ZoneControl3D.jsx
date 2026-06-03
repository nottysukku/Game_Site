import React, { useEffect, useMemo, useRef, useState } from 'react';
import Peer from 'peerjs';
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
  const [gameMode, setGameMode] = useState('menu'); // 'menu', 'local', 'online'
  const [onlineRole, setOnlineRole] = useState(null); // 'host', 'client'
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
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

  const peerRef = useRef(null);
  const connRef = useRef(null);

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

  // Clean up WebRTC peer on unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  const initHost = () => {
    setOnlineRole('host');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomCode(code);
    setConnectionStatus('Initializing Host Peer...');

    const peer = new Peer(`arcade-zc-${code}`, {
      debug: 1,
    });
    peerRef.current = peer;

    peer.on('open', () => {
      setConnectionStatus('Waiting for player 2...');
    });

    peer.on('connection', (conn) => {
      connRef.current = conn;
      setConnectionStatus('Connected to Client!');
      setStatus('Game started! You are Blue (First Player).');

      // Send initial board state to client
      const cellsArray = Array.from(cells.entries());
      conn.on('open', () => {
        conn.send({
          type: 'INIT',
          cells: cellsArray,
          turn: 0
        });
      });

      setupConnectionListeners(conn);
    });

    peer.on('error', (err) => {
      console.error(err);
      setConnectionStatus('Connection Error');
      setStatus('Error hosting game. Try again.');
    });
  };

  const initClient = (codeToJoin) => {
    if (!codeToJoin) {
      setStatus('Please enter a valid room code.');
      return;
    }
    setOnlineRole('client');
    setConnectionStatus('Connecting to Host...');

    const peer = new Peer(null, { debug: 1 });
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(`arcade-zc-${codeToJoin}`);
      connRef.current = conn;
      setupConnectionListeners(conn);
    });

    peer.on('error', (err) => {
      console.error(err);
      setConnectionStatus('Connection Error');
      setStatus('Failed to connect to host. Check code.');
    });
  };

  const setupConnectionListeners = (conn) => {
    conn.on('data', (data) => {
      if (data.type === 'INIT') {
        const restoredMap = new Map(data.cells);
        setCells(restoredMap);
        setTurn(data.turn);
        setConnectionStatus('Connected to Host!');
        setStatus('Game started! You are Rose (Second Player).');
      } else if (data.type === 'MOVE') {
        const restoredMap = new Map(data.cells);
        setCells(restoredMap);
        setTurn(data.turn);
        setStatus(data.status);
      } else if (data.type === 'RESET') {
        const map = new Map();
        for (let q = 0; q < SIZE; q += 1) {
          for (let r = 0; r < SIZE; r += 1) map.set(key(q, r), { q, r, owner: null, turret: false, wall: false });
        }
        map.get(key(0, SIZE - 1)).owner = 0;
        map.get(key(SIZE - 1, 0)).owner = 1;
        setCells(map);
        setTurn(0);
        setStatus('Game was reset by the other player.');
      }
    });

    conn.on('close', () => {
      setConnectionStatus('Disconnected');
      setStatus('Other player disconnected.');
    });

    conn.on('error', (err) => {
      console.error(err);
      setConnectionStatus('Connection Error');
    });
  };

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

    if (gameMode === 'online' && connRef.current) {
      connRef.current.send({ type: 'RESET' });
    }
  };

  const click = (event) => {
    // Check turn validation for online mode
    if (gameMode === 'online') {
      if (onlineRole === 'host' && turn !== 0) {
        setStatus('Not your turn! Waiting for Rose.');
        return;
      }
      if (onlineRole === 'client' && turn !== 1) {
        setStatus('Not your turn! Waiting for Blue.');
        return;
      }
    }

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
    let newStatus = '';
    if (owned[turn] / next.size >= 0.6) {
      newStatus = `${TEAMS[turn].name} controls 60 percent and wins.`;
    } else {
      newStatus = `${TEAMS[1 - turn].name} command phase.`;
    }

    setCells(next);
    setTurn(1 - turn);
    setStatus(newStatus);

    // Sync online move
    if (gameMode === 'online' && connRef.current) {
      const cellsArray = Array.from(next.entries());
      connRef.current.send({
        type: 'MOVE',
        cells: cellsArray,
        turn: 1 - turn,
        status: newStatus
      });
    }
  };

  const exitMode = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    connRef.current = null;
    setGameMode('menu');
    setOnlineRole(null);
    setConnectionStatus('Disconnected');
    reset();
  };

  if (gameMode === 'menu') {
    return (
      <div className="zc-root">
        <BackButton />
        <div className="zc-panel" style={{ position: 'relative', top: 'auto', left: 'auto', width: '360px' }}>
          <h1>Zone Control 3D</h1>
          <p>Deploy turrets and barriers to claim hexagonal territory in this futuristic hex-strategy simulator.</p>
          <button style={{ marginTop: '20px' }} onClick={() => setGameMode('local')}>🎮 Local Pass & Play</button>
          <button style={{ marginTop: '10px' }} onClick={() => setGameMode('online')}>🌐 Online WebRTC Mode</button>
        </div>
      </div>
    );
  }

  if (gameMode === 'online' && !onlineRole) {
    return (
      <div className="zc-root">
        <BackButton />
        <div className="zc-panel" style={{ position: 'relative', top: 'auto', left: 'auto', width: '380px' }}>
          <h1>Online Lobby</h1>
          <p>Host a game and share code with a friend, or join an active host's room.</p>
          
          <div style={{ marginTop: '20px', borderTop: '1px solid #22d3ee44', paddingTop: '15px' }}>
            <button onClick={initHost}>Create / Host Room</button>
          </div>

          <div style={{ marginTop: '20px', borderTop: '1px solid #22d3ee44', paddingTop: '15px' }}>
            <input 
              type="text" 
              placeholder="Enter 6-digit Code" 
              value={joinCode} 
              onChange={(e) => setJoinCode(e.target.value)} 
              style={{
                width: '100%',
                padding: '10px',
                background: '#0f172a',
                border: '1px solid rgba(34, 211, 238, 0.4)',
                color: '#e2e8f0',
                marginBottom: '10px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontSize: '16px'
              }}
            />
            <button onClick={() => initClient(joinCode)}>Join Room</button>
          </div>

          <button onClick={exitMode} style={{ marginTop: '20px', borderColor: '#ef4444', color: '#ef4444' }}>Back to Menu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="zc-root">
      <button onClick={exitMode} className="zc-back-btn" style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: 'rgba(7, 17, 31, 0.8)',
        border: '1px solid rgba(34, 211, 238, 0.28)',
        color: '#e2e8f0',
        padding: '8px 16px',
        cursor: 'pointer',
        fontWeight: 'bold',
        zIndex: 10
      }}>← Exit Game</button>

      <canvas ref={canvasRef} width={900} height={620} className="zc-canvas" onClick={click} />
      <div className="zc-panel">
        <h1>Zone Control 3D</h1>
        {gameMode === 'online' && (
          <div style={{
            background: 'rgba(34, 211, 238, 0.1)',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '10px',
            border: '1px solid rgba(34, 211, 238, 0.2)'
          }}>
            <div style={{ fontSize: '10px', color: '#889' }}>CONNECTION STATE</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#22d3ee' }}>{connectionStatus}</div>
            {roomCode && (
              <div style={{ marginTop: '4px', fontSize: '12px' }}>
                ROOM CODE: <span style={{ color: '#ffd740', letterSpacing: '1px', fontWeight: 'bold' }}>{roomCode}</span>
              </div>
            )}
            <div style={{ fontSize: '10px', color: '#889', marginTop: '4px' }}>
              ROLE: {onlineRole === 'host' ? 'Blue Host (Player 1)' : 'Rose Client (Player 2)'}
            </div>
          </div>
        )}
        <div className="zc-turn" style={{ color: TEAMS[turn].color }}>{TEAMS[turn].name} Turn</div>
        <p>{status}</p>
        <div className="zc-tools">
          {['capture', 'turret', 'wall'].map(item => (
            <button key={item} className={tool === item ? 'active' : ''} onClick={() => setTool(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="zc-counts">Blue {counts[0]} | Rose {counts[1]}</div>
        <button onClick={reset}>Reset War</button>
      </div>
    </div>
  );
}
