// src/pages/Racing.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import Peer from 'peerjs';
import BackButton from './BackButton';
import './Racing.css';

// Networking constants
const ROOM_PREFIX = 'arcaderacing_';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode(n = 6) {
  let s = '';
  for (let i = 0; i < n; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

// 1. TRACKS COORDINATE CONFIGURATIONS (Monza, Spa-Francorchamps, Brands Hatch)
const TRACKS_CONFIG = {
  monza: {
    name: 'Monza Circuit',
    waypoints: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(80, 0, 0),     // Retifilio Straight
      new THREE.Vector3(150, 0, -10),
      new THREE.Vector3(220, 0, -20),
      new THREE.Vector3(250, 0, 10),   // Curva Grande
      new THREE.Vector3(240, 0, 50),
      new THREE.Vector3(190, 0, 75),   // Roggia Chicane
      new THREE.Vector3(150, 0, 65),
      new THREE.Vector3(110, 0, 95),   // Lesmo 1
      new THREE.Vector3(70, 0, 115),   // Lesmo 2
      new THREE.Vector3(10, 0, 90),    // Serraglio Straight
      new THREE.Vector3(-60, 0, 70),   // Ascari Chicane
      new THREE.Vector3(-110, 0, 45),
      new THREE.Vector3(-150, 0, -10), // Parabolica
      new THREE.Vector3(-110, 0, -45),
      new THREE.Vector3(-45, 0, -25),
    ],
    width: 9.6
  },
  spa: {
    name: 'Spa-Francorchamps',
    waypoints: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(35, 0, -15),   // La Source hairpin
      new THREE.Vector3(15, -4, -45),  // downhill run
      new THREE.Vector3(25, 4, -80),   // Eau Rouge rise!
      new THREE.Vector3(45, 12, -110), // Raidillon top
      new THREE.Vector3(80, 12, -160), // Kemmel straight
      new THREE.Vector3(120, 8, -200), // Les Combes chicane
      new THREE.Vector3(95, 5, -230),
      new THREE.Vector3(40, 1, -210),  // Malmedy
      new THREE.Vector3(-10, -2, -170), // Bruxelles
      new THREE.Vector3(-60, -4, -120), // Pouhon double-left
      new THREE.Vector3(-90, -4, -70),
      new THREE.Vector3(-65, -1, -30),  // Blanchimont
      new THREE.Vector3(-25, 0, -10),
    ],
    width: 10.2
  },
  brands: {
    name: 'Brands Hatch',
    waypoints: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(45, -3, -15),  // Paddock Hill drop
      new THREE.Vector3(75, -4, -45),
      new THREE.Vector3(50, 0, -70),   // Druids hairpin
      new THREE.Vector3(15, 2, -60),
      new THREE.Vector3(-15, 0, -45),  // Graham Hill bend
      new THREE.Vector3(-45, -1, -35), // Cooper straight
      new THREE.Vector3(-75, -2, -5),  // Surtees
      new THREE.Vector3(-55, 0, 25),   // Clearways
      new THREE.Vector3(-20, 0, 15),
    ],
    width: 9.0
  }
};

const TOTAL_SPLINE_STEPS = 400;

export default function Racing() {
  const containerRef = useRef(null);
  const minimapCanvasRef = useRef(null);

  // Match / Lobby Configuration States
  const [phase, setPhase] = useState('menu'); // menu | join_input | lobby | playing | over
  const [selectedTrack, setSelectedTrack] = useState('monza');
  const [selectedMode, setSelectedMode] = useState('gp'); // gp (Grand Prix) | tt (Time Trial) | mp (Multiplayer)
  const [kartColor, setKartColor] = useState('#ff007f'); // default pink
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [peerErr, setPeerErr] = useState('');
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState(false);

  // In-Game UI HUD states
  const [lap, setLap] = useState(1);
  const [speed, setSpeed] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rankText, setRankText] = useState('1st');
  const [score, setScore] = useState(0);
  const [lapTimes, setLapTimes] = useState([]);
  const [activePowerup, setActivePowerup] = useState(null); // mushroom | banana | green_shell | red_shell | lightning

  // Starting traffic lights countdown
  const [countdownState, setCountdownState] = useState(-1); // 3, 2, 1, 0(GO!), -1(hidden)
  const [showGoBanner, setShowGoBanner] = useState(false);

  // Lobby peers info list
  const [lobbyPeers, setLobbyPeers] = useState([]);

  // Authoritative gameplay state ref
  const stateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    clock: null,
    curvePoints: [],
    trackCurve: null,
    trackWidth: 9.0,
    
    // local player physics parameters
    playerIndex: 0, // Assigned racer index on grid
    pos: new THREE.Vector3(),
    angle: 0,
    speed: 0,
    velocity: new THREE.Vector3(),
    driftAngle: 0,
    isDrifting: false,
    driftSide: 0,
    boostTimer: 0,
    spinTimer: 0,
    lap: 1,
    checkpointPassed: false,
    splineProgressIndex: 0,
    score: 0,
    scale: 1.0,
    shrinkTimer: 0,
    activePowerup: null,

    // Controls
    keys: { w: false, s: false, a: false, d: false, space: false },

    // Dynamic Lists
    karts: [], // List of all 16 racers
    particleSystems: [],
    powerupBoxes: [],
    hazards: [], // deployed banana peels
    projectiles: [], // flying shells

    // Network connections
    peersList: [], // { id, conn, name, color, index }
    connected: false,
    isHost: true,

    // Countdown flag
    countdown: -1,
    matchStarted: false,
    lapStartTime: 0,
    gameStartTime: 0,
    currentLapTimes: [],

    animId: null
  });

  const peerRef = useRef(null);
  const connsMapRef = useRef(new Map());

  // Push scoreboard log helper
  const addLog = (txt, isPlayer = true) => {
    // simple console-log or push to feed
  };

  // Build grid positions double file staggering behind index 0
  const assignGridPositions = (trackCurve, width) => {
    const st = stateRef.current;
    st.karts = [];

    const colorsList = ['#ff007f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#a855f7', '#06b6d4', '#22c55e', '#eab308', '#e11d48', '#d946ef', '#6366f1', '#475569'];
    const namesList = ['PLAYER', 'GUEST 1', 'TurboBot', 'CyberDrift', 'NeonRider', 'Rival C', 'Rival D', 'Rival E', 'Rival F', 'Rival G', 'Rival H', 'Rival I', 'Rival J', 'Rival K', 'Rival L', 'Rival M'];

    for (let i = 0; i < 16; i++) {
      // Stagger spacing: place karts behind index 0 (e.g. index 400 - i*3)
      const splineIdx = (TOTAL_SPLINE_STEPS - (i * 3)) % TOTAL_SPLINE_STEPS;
      const pt = trackCurve.getPointAt(splineIdx / TOTAL_SPLINE_STEPS);
      const tangent = trackCurve.getTangentAt(splineIdx / TOTAL_SPLINE_STEPS);
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      
      // Left / Right double file staggering
      const offsetSide = (i % 2 === 0) ? -1.6 : 1.6;
      const initialPos = pt.clone().addScaledVector(normal, offsetSide);
      initialPos.y = pt.y + 0.28;

      st.karts.push({
        index: i,
        name: namesList[i],
        color: colorsList[i],
        isRemoteHuman: false,
        isLocalHuman: i === 0,
        pos: initialPos,
        angle: Math.PI * 0.9,
        speed: 0,
        velocity: new THREE.Vector3(),
        driftAngle: 0,
        isDrifting: false,
        driftSide: 0,
        boostTimer: 0,
        spinTimer: 0,
        shrinkTimer: 0,
        lap: 1,
        checkpointPassed: false,
        splineProgressIndex: splineIdx,
        scale: 1.0,
        activePowerup: null,
        modelGroup: null,
        wheelsList: [],
        score: 0,
        // AI parameters
        skill: 0.8 + (i * 0.015),
        targetNode: (splineIdx + 12) % TOTAL_SPLINE_STEPS
      });
    }
  };

  // Sound synthesis beepers
  const playBeep = (freq, duration) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch(e){}
  };

  // Authoritative host starts countdown lights
  const startRaceCountdown = () => {
    const st = stateRef.current;
    st.matchStarted = false;
    st.countdown = 3;
    setCountdownState(3);

    const timer = setInterval(() => {
      st.countdown -= 1;
      setCountdownState(st.countdown);
      
      if (st.countdown > 0) {
        playBeep(440, 0.15); // low pitch beep
      } else if (st.countdown === 0) {
        playBeep(880, 0.4); // high pitch GO beep
        st.matchStarted = true;
        setShowGoBanner(true);
        setTimeout(() => setShowGoBanner(false), 2000);
        st.gameStartTime = st.clock.getElapsedTime();
        st.lapStartTime = st.gameStartTime;
        clearInterval(timer);
        setTimeout(() => setCountdownState(-1), 1000);
      }
    }, 1000);
  };

  // Sync state data channels
  const broadcastSyncAll = () => {
    const st = stateRef.current;
    if (st.isHost && st.connected) {
      connsMapRef.current.forEach(conn => {
        conn.send({
          type: 'sync_all',
          karts: st.karts.map(k => ({
            index: k.index,
            x: k.pos.x,
            y: k.pos.y,
            z: k.pos.z,
            angle: k.angle,
            speed: k.speed,
            driftAngle: k.driftAngle,
            isDrifting: k.isDrifting,
            lap: k.lap,
            spinTimer: k.spinTimer,
            scale: k.scale,
            progress: k.splineProgressIndex,
            activePowerup: k.activePowerup
          })),
          boxes: st.powerupBoxes.map(b => ({ id: b.id, active: b.active })),
          hazards: st.hazards.map(h => ({ id: h.id, x: h.pos.x, y: h.pos.y, z: h.pos.z, active: h.active })),
          projectiles: st.projectiles.map(p => ({ id: p.id, x: p.mesh.position.x, y: p.mesh.position.y, z: p.mesh.position.z, type: p.type })),
          countdown: st.countdown,
          matchStarted: st.matchStarted
        });
      });
    }
  };

  const handleRemoteRacerSync = (data) => {
    const st = stateRef.current;
    const remoteIndex = data.index;
    if (remoteIndex !== undefined && st.karts[remoteIndex]) {
      const k = st.karts[remoteIndex];
      // authoritatively update position values
      k.pos.set(data.x, data.y, data.z);
      k.angle = data.angle;
      k.speed = data.speed;
      k.driftAngle = data.driftAngle;
      k.isDrifting = data.isDrifting;
      k.activePowerup = data.activePowerup;
    }
  };

  // Wire network client channels
  const wireConnection = (conn, isHostSide) => {
    const st = stateRef.current;
    st.connected = true;
    setConnected(true);

    conn.on('data', (data) => {
      if (data.type === 'sync_all') {
        // Client updates karts coordinates autoritatively
        data.karts.forEach((syncKart) => {
          const k = st.karts[syncKart.index];
          if (k) {
            if (!k.isLocalHuman) {
              k.pos.set(syncKart.x, syncKart.y, syncKart.z);
              k.angle = syncKart.angle;
              k.speed = syncKart.speed;
              k.driftAngle = syncKart.driftAngle;
              k.isDrifting = syncKart.isDrifting;
            }
            k.lap = syncKart.lap;
            k.spinTimer = syncKart.spinTimer;
            k.scale = syncKart.scale;
            k.splineProgressIndex = syncKart.progress;
            k.activePowerup = syncKart.activePowerup;
          }
        });

        // Sync boxes
        data.boxes.forEach(boxSync => {
          const b = st.powerupBoxes.find(x => x.id === boxSync.id);
          if (b && b.mesh) {
            b.active = boxSync.active;
            b.mesh.visible = boxSync.active;
          }
        });

        // Sync countdown / start
        if (st.countdown !== data.countdown) {
          st.countdown = data.countdown;
          setCountdownState(data.countdown);
          if (st.countdown === 0) {
            st.matchStarted = true;
            setShowGoBanner(true);
            setTimeout(() => setShowGoBanner(false), 2000);
            st.gameStartTime = st.clock.getElapsedTime();
            st.lapStartTime = st.gameStartTime;
          }
        }
        st.matchStarted = data.matchStarted;
      }
      else if (data.type === 'sync') {
        // Host parses client updates
        handleRemoteRacerSync(data);
      }
      else if (data.type === 'lobby_update') {
        setLobbyPeers(data.peers);
        setSelectedTrack(data.track);
        setSelectedMode(data.mode);
      }
      else if (data.type === 'start_mp_match') {
        setPhase('playing');
        st.matchStarted = false;
        st.countdown = 3;
        setCountdownState(3);
      }
    });

    conn.on('close', () => {
      st.connected = false;
      setConnected(false);
      addLog('Connection lost.', false);
    });
  };

  // Host P2P Lobby
  const createRoom = () => {
    cleanupPeer();
    const code = genCode();
    setRoomCode(code);
    setPhase('lobby');
    setPeerErr('');

    const st = stateRef.current;
    st.isHost = true;

    const peer = new Peer(ROOM_PREFIX + code);
    peerRef.current = peer;

    peer.on('connection', (conn) => {
      const idx = st.peersList.length + 1; // Assign Racer Index
      const peerInfo = { id: conn.peer, conn, name: `Player ${idx + 1}`, color: '#ff3b30', index: idx };
      st.peersList.push(peerInfo);
      connsMapRef.current.set(conn.peer, conn);
      
      // Update racer flags
      if (st.karts[idx]) {
        st.karts[idx].isRemoteHuman = true;
        st.karts[idx].isLocalHuman = false;
        st.karts[idx].name = peerInfo.name;
      }

      wireConnection(conn, true);

      // Notify guest client of their details
      conn.send({
        type: 'init_client',
        index: idx,
        track: selectedTrack,
        mode: selectedMode
      });

      // Broadcast list updates to all peers
      const peersData = st.peersList.map(p => ({ name: p.name, color: p.color }));
      setLobbyPeers([{ name: 'Host (You)', color: kartColor }, ...peersData]);
      
      st.peersList.forEach(p => {
        p.conn.send({
          type: 'lobby_update',
          peers: [{ name: 'Host', color: kartColor }, ...peersData],
          track: selectedTrack,
          mode: selectedMode
        });
      });
    });

    setLobbyPeers([{ name: 'Host (You)', color: kartColor }]);
  };

  // Guest joins P2P Lobby
  const joinRoom = () => {
    const code = joinInput.toUpperCase().trim();
    if (code.length < 4) {
      setPeerErr('Insert a valid Room Code');
      return;
    }
    cleanupPeer();
    setPeerErr('');
    
    const st = stateRef.current;
    st.isHost = false;

    const peer = new Peer();
    peerRef.current = peer;
    
    peer.on('open', () => {
      const conn = peer.connect(ROOM_PREFIX + code);
      connsMapRef.current.set(conn.peer, conn);

      conn.on('data', (data) => {
        if (data.type === 'init_client') {
          st.playerIndex = data.index;
          setSelectedTrack(data.track);
          setSelectedMode(data.mode);
          setPhase('lobby');
        }
      });

      wireConnection(conn, false);
      setRoomCode(code);
    });

    peer.on('error', (err) => {
      setPeerErr('Room ID not found');
      setPhase('menu');
    });
  };

  const cleanupPeer = useCallback(() => {
    connsMapRef.current.forEach(c => { try{ c.close(); } catch(e){} });
    connsMapRef.current.clear();
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch(e){}
      peerRef.current = null;
    }
    setConnected(false);
  }, []);

  const triggerStartMatch = () => {
    const st = stateRef.current;
    if (st.isHost && st.connected) {
      st.peersList.forEach(p => {
        p.conn.send({ type: 'start_mp_match' });
      });
    }
    setPhase('playing');
  };

  // In-game powerup usage triggers
  const triggerPowerup = () => {
    const st = stateRef.current;
    const player = st.karts[st.playerIndex];
    if (!player || player.spinTimer > 0 || !st.matchStarted || st.isDead) return;

    const type = player.activePowerup;
    if (!type) return;

    player.activePowerup = null;
    setActivePowerup(null);

    // Get tangent direction vectors
    const forward = new THREE.Vector3(
      Math.sin(player.angle + player.driftAngle),
      0,
      Math.cos(player.angle + player.driftAngle)
    ).normalize();

    if (type === 'mushroom') {
      // Speed Boost!
      player.boostTimer = 1.8;
      player.speed = 34; // burst speed
      playBeep(650, 0.2);
    }
    else if (type === 'banana') {
      // Spawn banana peel behind kart
      const spawnPos = player.pos.clone().subScaledVector(forward, 1.8);
      spawnPos.y = TRACK_CURVE.getPointAt(player.splineProgressIndex / TOTAL_SPLINE_STEPS).y + 0.05;

      const bananaGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 12);
      const bananaMat = new THREE.MeshBasicMaterial({ color: 0xffea00 }); // Yellow cylinder
      const bananaMesh = new THREE.Mesh(bananaGeo, bananaMat);
      bananaMesh.position.copy(spawnPos);
      st.scene.add(bananaMesh);

      st.hazards.push({
        id: `banana_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        pos: spawnPos,
        mesh: bananaMesh,
        active: true,
        radius: 0.9
      });
      playBeep(300, 0.1);
    }
    else if (type === 'green_shell') {
      // Fire forward along road tangent direction
      const spawnPos = player.pos.clone().addScaledVector(forward, 1.8);
      spawnPos.y = TRACK_CURVE.getPointAt(player.splineProgressIndex / TOTAL_SPLINE_STEPS).y + 0.15;

      const shellGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
      const shellMat = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // Green cylinder
      const shellMesh = new THREE.Mesh(shellGeo, shellMat);
      shellMesh.position.copy(spawnPos);
      st.scene.add(shellMesh);

      st.projectiles.push({
        id: `shell_${Date.now()}`,
        type: 'green',
        mesh: shellMesh,
        vel: forward.clone().multiplyScalar(30), // speed 30m/s
        age: 0
      });
      playBeep(520, 0.15);
    }
    else if (type === 'red_shell') {
      // Homing shell targets kart directly ahead
      const standings = getRacerStandingsList();
      const myRank = standings.findIndex(k => k.index === st.playerIndex);
      let targetIndex = -1;
      
      if (myRank > 0) {
        // Target the racer in front of player
        targetIndex = standings[myRank - 1].index;
      }

      const spawnPos = player.pos.clone().addScaledVector(forward, 1.8);
      spawnPos.y = TRACK_CURVE.getPointAt(player.splineProgressIndex / TOTAL_SPLINE_STEPS).y + 0.15;

      const shellGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
      const shellMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Red cylinder
      const shellMesh = new THREE.Mesh(shellGeo, shellMat);
      shellMesh.position.copy(spawnPos);
      st.scene.add(shellMesh);

      st.projectiles.push({
        id: `shell_${Date.now()}`,
        type: 'red',
        mesh: shellMesh,
        targetIdx: targetIndex,
        age: 0
      });
      playBeep(580, 0.18);
    }
    else if (type === 'lightning') {
      // Lightning strike bolts strike everyone else!
      st.cameraShake = 0.55;
      playBeep(150, 0.4);

      st.karts.forEach(k => {
        if (k.index === st.playerIndex) return;
        k.scale = 0.4;
        k.shrinkTimer = 4.0;
        k.speed *= 0.5;
        k.modelGroup.scale.set(0.4, 0.4, 0.4);
      });
      addLog('Lightning strike triggered!', true);
    }
  };

  // Helper sorting racer standings list
  const getRacerStandingsList = () => {
    const st = stateRef.current;
    const standings = st.karts.map(k => ({
      index: k.index,
      name: k.name,
      lap: k.lap,
      progress: k.splineProgressIndex,
      color: k.color
    }));
    standings.sort((a, b) => {
      const scoreA = a.lap * 2000 + a.progress;
      const scoreB = b.lap * 2000 + b.progress;
      return scoreB - scoreA;
    });
    return standings;
  };

  // Three.js curve helper configurations
  let TRACK_CURVE = null;
  let CURVE_POINTS = [];
  const trackCfg = TRACKS_CONFIG[selectedTrack];
  if (trackCfg) {
    TRACK_CURVE = new THREE.CatmullRomCurve3(trackCfg.waypoints, true);
    CURVE_POINTS = TRACK_CURVE.getPoints(TOTAL_SPLINE_STEPS);
  }

  // 3D Canvas initialization
  useEffect(() => {
    if (phase !== 'playing' || !containerRef.current) return;

    const st = stateRef.current;
    
    // Set parameters
    const trackInfo = TRACKS_CONFIG[selectedTrack];
    st.trackCurve = new THREE.CatmullRomCurve3(trackInfo.waypoints, true);
    st.curvePoints = st.trackCurve.getPoints(TOTAL_SPLINE_STEPS);
    st.trackWidth = trackInfo.width;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05020c);
    scene.fog = new THREE.FogExp2(0x05020c, 0.012);
    st.scene = scene;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    st.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    st.renderer = renderer;

    const clock = new THREE.Clock();
    st.clock = clock;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x1a1230, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xff00ff, 1.45);
    dirLight.position.set(40, 80, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const helperLight = new THREE.DirectionalLight(0x00ffff, 0.85);
    helperLight.position.set(-40, 40, -40);
    scene.add(helperLight);

    // Synthwave floor grids
    const gridFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000, 40, 40),
      new THREE.MeshBasicMaterial({ color: 0x1c0f3d, wireframe: true, transparent: true, opacity: 0.28 })
    );
    gridFloor.rotation.x = -Math.PI / 2;
    gridFloor.position.y = -0.05;
    scene.add(gridFloor);

    // Road procedural creation
    const roadGeometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const indices = [];

    const curbGeometryL = new THREE.BufferGeometry();
    const curbGeometryR = new THREE.BufferGeometry();
    const curbVertsL = [];
    const curbVertsR = [];
    const curbColorsL = [];
    const curbColorsR = [];
    const curbIndicesL = [];
    const curbIndicesR = [];

    for (let i = 0; i <= TOTAL_SPLINE_STEPS; i++) {
      const u = i / TOTAL_SPLINE_STEPS;
      const p = st.trackCurve.getPointAt(u % 1.0);
      const tangent = st.trackCurve.getTangentAt(u % 1.0);
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const leftPt = p.clone().addScaledVector(normal, -st.trackWidth / 2);
      const rightPt = p.clone().addScaledVector(normal, st.trackWidth / 2);

      vertices.push(leftPt.x, leftPt.y + 0.01, leftPt.z);
      vertices.push(rightPt.x, rightPt.y + 0.01, rightPt.z);

      colors.push(0.08, 0.07, 0.12);
      colors.push(0.08, 0.07, 0.12);

      const leftCurbOuter = p.clone().addScaledVector(normal, -st.trackWidth / 2 - 0.45);
      const rightCurbOuter = p.clone().addScaledVector(normal, st.trackWidth / 2 + 0.45);

      curbVertsL.push(leftCurbOuter.x, leftCurbOuter.y + 0.02, leftCurbOuter.z);
      curbVertsL.push(leftPt.x, leftPt.y + 0.02, leftPt.z);

      curbVertsR.push(rightPt.x, rightPt.y + 0.02, rightPt.z);
      curbVertsR.push(rightCurbOuter.x, rightCurbOuter.y + 0.02, rightCurbOuter.z);

      const stripeColor = Math.floor(i / 3) % 2 === 0 ? [0.95, 0.05, 0.35] : [0.95, 0.95, 0.95];
      curbColorsL.push(...stripeColor, ...stripeColor);
      curbColorsR.push(...stripeColor, ...stripeColor);

      if (i < TOTAL_SPLINE_STEPS) {
        const row = i * 2;
        indices.push(row, row + 1, row + 2);
        indices.push(row + 1, row + 3, row + 2);

        curbIndicesL.push(row, row + 1, row + 2);
        curbIndicesL.push(row + 1, row + 3, row + 2);

        curbIndicesR.push(row, row + 1, row + 2);
        curbIndicesR.push(row + 1, row + 3, row + 2);
      }
    }

    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    roadGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    roadGeometry.setIndex(indices);
    roadGeometry.computeVertexNormals();

    const roadMesh = new THREE.Mesh(roadGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.1 }));
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    curbGeometryL.setAttribute('position', new THREE.Float32BufferAttribute(curbVertsL, 3));
    curbGeometryL.setAttribute('color', new THREE.Float32BufferAttribute(curbColorsL, 3));
    curbGeometryL.setIndex(curbIndicesL);
    curbGeometryL.computeVertexNormals();
    scene.add(new THREE.Mesh(curbGeometryL, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 })));

    curbGeometryR.setAttribute('position', new THREE.Float32BufferAttribute(curbVertsR, 3));
    curbGeometryR.setAttribute('color', new THREE.Float32BufferAttribute(curbColorsR, 3));
    curbGeometryR.setIndex(curbIndicesR);
    curbGeometryR.computeVertexNormals();
    scene.add(new THREE.Mesh(curbGeometryR, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 })));

    // Neon center line
    const splineGeo = new THREE.BufferGeometry().setFromPoints(st.curvePoints);
    const centerLine = new THREE.LineLoop(splineGeo, new THREE.LineBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.5 }));
    centerLine.position.y = 0.03;
    scene.add(centerLine);

    // Chassis builder
    function buildGoKart(colorHex) {
      const kart = new THREE.Group();
      const basePlate = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.16, 2.3), new THREE.MeshStandardMaterial({ color: 0x222226, metalness: 0.85 }));
      basePlate.position.y = 0.28;
      kart.add(basePlate);

      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.62, roughness: 0.15 });

      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.65), bodyMat);
      nose.position.set(0, 0.36, -0.95);
      kart.add(nose);

      const fWing = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 0.32), bodyMat);
      fWing.position.set(0, 0.22, -1.35);
      kart.add(fWing);

      const lPod = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 1.25), bodyMat);
      lPod.position.set(-0.64, 0.36, 0);
      kart.add(lPod);

      const rPod = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 1.25), bodyMat);
      rPod.position.set(0.64, 0.36, 0);
      kart.add(rPod);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 0.52), new THREE.MeshStandardMaterial({ color: 0x121214 }));
      seat.position.set(0, 0.58, 0.35);
      kart.add(seat);

      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 0.48), bodyMat);
      spoiler.position.set(0, 1.2, 1.15);
      kart.add(spoiler);

      // Wheels
      const wheelsList = [];
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.88 });
      const wPositions = [
        { x: -0.68, y: 0.28, z: -0.72, isFront: true },
        { x: 0.68, y: 0.28, z: -0.72, isFront: true },
        { x: -0.72, y: 0.35, z: 0.75, isFront: false },
        { x: 0.72, y: 0.35, z: 0.75, isFront: false }
      ];

      wPositions.forEach((wp) => {
        const wGroup = new THREE.Group();
        wGroup.position.set(wp.x, wp.y, wp.z);
        const radius = wp.isFront ? 0.34 : 0.44;
        const thickness = wp.isFront ? 0.26 : 0.36;

        const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 16), tireMat);
        tire.rotation.z = Math.PI / 2;
        wGroup.add(tire);

        kart.add(wGroup);
        wheelsList.push({ mesh: wGroup, isFront: wp.isFront, radius });
      });

      scene.add(kart);
      return { model: kart, wheels: wheelsList };
    }

    // Populate karts onto grid
    assignGridPositions(st.trackCurve, st.trackWidth);

    st.karts.forEach((k) => {
      // Overwrite local player color matching choice
      let col = k.color;
      if (k.index === st.playerIndex) {
        col = kartColor; k.color = kartColor;
      }
      
      const build = buildGoKart(col);
      k.modelGroup = build.model;
      k.wheelsList = build.wheels;
      k.modelGroup.position.copy(k.pos);
      k.modelGroup.rotation.y = k.angle;
    });

    // Populate track items (glowing item boxes and boost zippers)
    st.powerupBoxes = [];
    st.hazards = [];
    st.projectiles = [];
    st.particleSystems = [];

    // Place Mario-kart style item boxes around track curve
    const boxSplineSegments = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360];
    boxSplineSegments.forEach((step, idx) => {
      const p = st.trackCurve.getPointAt(step / TOTAL_SPLINE_STEPS);
      const tangent = st.trackCurve.getTangentAt(step / TOTAL_SPLINE_STEPS);
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      
      // Spawn 3 side pods item boxes at each marker
      const horizontalOffsets = [-2.2, 0, 2.2];
      horizontalOffsets.forEach((side, boxIdx) => {
        const spawnPos = p.clone().addScaledVector(normal, side);
        spawnPos.y = p.y + 0.6; // floating height

        // Rotating cube mesh
        const bMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.72, 0.72),
          new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.65,
            emissive: 0x00a0ff
          })
        );
        bMesh.position.copy(spawnPos);
        scene.add(bMesh);

        st.powerupBoxes.push({
          id: `box_${step}_${boxIdx}`,
          mesh: bMesh,
          pos: spawnPos,
          active: true,
          respawnTimer: 0
        });
      });
    });

    // Spawning booster zippers along track
    const zipperSplineSegments = [15, 75, 135, 205, 285, 345];
    zipperSplineSegments.forEach((step) => {
      const p = st.trackCurve.getPointAt(step / TOTAL_SPLINE_STEPS);
      const tangent = st.trackCurve.getTangentAt(step / TOTAL_SPLINE_STEPS);
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      const spawnPos = p.clone();
      spawnPos.y = p.y + 0.02;

      // Glow zipper plane arrow mesh
      const zipMesh = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 0.05, 2.0),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.75 })
      );
      zipMesh.position.copy(spawnPos);
      zipMesh.lookAt(spawnPos.clone().add(tangent));
      scene.add(zipMesh);

      st.powerupBoxes.push({
        id: `zipper_${step}`,
        type: 'zipper',
        mesh: zipMesh,
        pos: spawnPos,
        active: true
      });
    });

    // Procedural neon decorative arches
    const archSteps = [0, 100, 200, 300];
    archSteps.forEach(step => {
      const p = st.trackCurve.getPointAt(step / TOTAL_SPLINE_STEPS);
      const tangent = st.trackCurve.getTangentAt(step / TOTAL_SPLINE_STEPS);
      
      const archGroup = new THREE.Group();
      archGroup.position.copy(p);
      archGroup.lookAt(p.clone().add(tangent));

      const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7.5), new THREE.MeshStandardMaterial({ color: 0x18181c }));
      pillarL.position.set(-st.trackWidth/2 - 0.8, 3.75, 0);
      archGroup.add(pillarL);

      const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7.5), new THREE.MeshStandardMaterial({ color: 0x18181c }));
      pillarR.position.set(st.trackWidth/2 + 0.8, 3.75, 0);
      archGroup.add(pillarR);

      const beam = new THREE.Mesh(new THREE.BoxGeometry(st.trackWidth + 2.0, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: step === 0 ? 0xff00ff : 0x00ffff }));
      beam.position.set(0, 7.5, 0);
      archGroup.add(beam);

      scene.add(archGroup);
    });

    // Particle generator
    const spawnExhaustBubble = (pos, col = 0xff00cc) => {
      const pMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.65 })
      );
      pMesh.position.copy(pos);
      scene.add(pMesh);

      st.particleSystems.push({
        mesh: pMesh,
        type: 'exhaust',
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.4),
        age: 0,
        maxAge: 0.42
      });
    };

    const spawnDriftSparks = (pos, col = 0xff00ff) => {
      const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: col }));
      pMesh.position.copy(pos);
      scene.add(pMesh);

      st.particleSystems.push({
        mesh: pMesh,
        type: 'spark',
        velocity: new THREE.Vector3((Math.random() - 0.5) * 3.4, 1.2 + Math.random() * 2.2, (Math.random() - 0.5) * 3.4),
        age: 0,
        maxAge: 0.35
      });
    };

    // Keyboard bindings
    const keys = st.keys;
    const onKeyDown = (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keys.w = true;
      if (code === 'KeyS' || code === 'ArrowDown') keys.s = true;
      if (code === 'KeyA' || code === 'ArrowLeft') keys.a = true;
      if (code === 'KeyD' || code === 'ArrowRight') keys.d = true;
      if (code === 'Space') keys.space = true;
      if (code === 'ShiftLeft' || code === 'KeyE') triggerPowerup();
    };

    const onKeyUp = (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keys.w = false;
      if (code === 'KeyS' || code === 'ArrowDown') keys.s = false;
      if (code === 'KeyA' || code === 'ArrowLeft') keys.a = false;
      if (code === 'KeyD' || code === 'ArrowRight') keys.d = false;
      if (code === 'Space') keys.space = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Initial countdown start
    if (st.isHost) {
      setTimeout(() => startRaceCountdown(), 1500);
    }

    // Animation engine loop
    function animate() {
      st.animId = requestAnimationFrame(animate);
      const dt = Math.min(0.03, clock.getDelta());
      let cameraShake = st.cameraShake;

      if (st.cameraShake > 0) st.cameraShake -= dt * 1.5;

      // Update particles
      for (let i = st.particleSystems.length - 1; i >= 0; i--) {
        const p = st.particleSystems[i];
        p.age += dt;
        p.mesh.position.addScaledVector(p.velocity, dt);
        if (p.type === 'exhaust') {
          p.mesh.scale.multiplyScalar(1.04);
          p.mesh.material.opacity = 0.65 * (1 - p.age / p.maxAge);
        } else if (p.type === 'spark') {
          p.velocity.y -= 9.8 * dt;
        }
        if (p.age >= p.maxAge) {
          scene.remove(p.mesh);
          st.particleSystems.splice(i, 1);
        }
      }

      // Rotate item boxes
      st.powerupBoxes.forEach((item) => {
        if (item.type === 'zipper') return;
        if (!item.active) {
          if (st.isHost) {
            item.respawnTimer -= dt;
            if (item.respawnTimer <= 0) {
              item.active = true;
              item.mesh.visible = true;
            }
          }
          return;
        }
        item.mesh.rotation.y += dt * 2.2;
        item.mesh.position.y = (st.trackCurve.getPointAt(parseInt(item.id.split('_')[1]) / TOTAL_SPLINE_STEPS).y + 0.6) + Math.sin(clock.getElapsedTime() * 4) * 0.12;
      });

      // Update projectiles (shells) physics
      for (let i = st.projectiles.length - 1; i >= 0; i--) {
        const p = st.projectiles[i];
        p.age += dt;

        if (p.type === 'green') {
          // Travel forward along straight line
          p.mesh.position.addScaledVector(p.vel, dt);
        } else if (p.type === 'red') {
          // Homing shell towards target kart
          const targetKart = st.karts[p.targetIdx];
          if (targetKart) {
            const dir = targetKart.pos.clone().sub(p.mesh.position).normalize();
            p.mesh.position.addScaledVector(dir, 25 * dt); // speed 25
          } else {
            // normal travel if no target
            p.mesh.position.y -= 5 * dt;
          }
        }

        // Raycast check collision with all karts
        let shellHit = false;
        st.karts.forEach((k) => {
          if (k.spinTimer > 0) return;
          const dist = p.mesh.position.distanceTo(k.pos);
          if (dist < 1.6) {
            shellHit = true;
            k.spinTimer = 1.2;
            k.speed *= 0.25;
            playBeep(200, 0.3);
          }
        });

        // boundary check or expiration
        if (shellHit || p.age >= 6.0) {
          scene.remove(p.mesh);
          st.projectiles.splice(i, 1);
        }
      }

      // Authoritative physics loop
      st.karts.forEach((k) => {
        // Decrease shrink lightning effects
        if (k.shrinkTimer > 0) {
          k.shrinkTimer -= dt;
          if (k.shrinkTimer <= 0) {
            k.scale = 1.0;
            k.modelGroup.scale.set(1.0, 1.0, 1.0);
          }
        }

        if (k.isLocalHuman) {
          // --- LOCAL PLAYER CONTROLS ---
          if (st.matchStarted) {
            if (k.spinTimer > 0) {
              k.spinTimer -= dt;
              k.speed = Math.max(0, k.speed - dt * 25);
              k.modelGroup.rotation.y += dt * 14.5;
            } else {
              // Accelerator / Reverse
              if (keys.w) {
                const acc = k.boostTimer > 0 ? 25 : 12;
                const topSpd = (k.boostTimer > 0 ? 34 : 22) * k.scale;
                k.speed = Math.min(topSpd, k.speed + acc * dt);
              } else if (keys.s) {
                k.speed = Math.max(-10, k.speed - 15 * dt);
              } else {
                k.speed -= k.speed * 1.8 * dt;
              }

              let steer = 1.0;
              if (Math.abs(k.speed) < 2) steer = 0.28;
              else if (k.isDrifting) steer = 1.55;

              if (keys.a) {
                k.angle += 2.2 * steer * dt; k.driftSide = -1;
              } else if (keys.d) {
                k.angle -= 2.2 * steer * dt; k.driftSide = 1;
              }

              // Drifting trigger
              if (keys.space && (keys.a || keys.d) && k.speed > 10) {
                k.isDrifting = true;
              } else {
                k.isDrifting = false;
              }

              // Steering animation
              k.wheelsList.forEach((w) => {
                w.mesh.rotation.x += (k.speed * dt) / w.radius;
                if (w.isFront) {
                  const targetSteer = keys.a ? 0.35 : keys.d ? -0.35 : 0;
                  w.mesh.rotation.y = THREE.MathUtils.lerp(w.mesh.rotation.y, targetSteer, dt * 10);
                }
              });

              if (k.isDrifting) {
                k.driftAngle = THREE.MathUtils.lerp(k.driftAngle, -k.driftSide * 0.44, dt * 6);
                spawnDriftSparks(k.modelGroup.position, '#ff00ff');
              } else {
                k.driftAngle = THREE.MathUtils.lerp(k.driftAngle, 0, dt * 8);
              }

              const heading = k.angle + k.driftAngle;
              const targetVel = new THREE.Vector3(Math.sin(heading) * k.speed, 0, Math.cos(heading) * k.speed);
              const slip = k.isDrifting ? 2.2 : 8.5;
              k.velocity.lerp(targetVel, dt * slip);
              k.pos.addScaledVector(k.velocity, dt);

              k.modelGroup.position.copy(k.pos);
              k.modelGroup.rotation.y = k.angle + k.driftAngle;
            }

            if (k.boostTimer > 0) {
              k.boostTimer -= dt;
            }

            // Off-track slow penalizer
            let minDist = 9999;
            let closestIdx = 0;
            st.curvePoints.forEach((pt, idx) => {
              const d = k.pos.distanceTo(pt);
              if (d < minDist) { minDist = d; closestIdx = idx; }
            });
            k.splineProgressIndex = closestIdx;

            // Spa Eau Rouge rise elevations interpolation
            k.pos.y = st.curvePoints[closestIdx].y + 0.28;
            k.modelGroup.position.y = k.pos.y;

            if (minDist > st.trackWidth / 2) {
              const grassCap = 5.2;
              if (k.speed > grassCap) k.speed = THREE.MathUtils.lerp(k.speed, grassCap, dt * 4);
            }

            // Powerup boxes collisions check
            st.powerupBoxes.forEach((item) => {
              if (!item.active) return;
              const d = k.pos.distanceTo(item.pos);
              if (d < item.radius) {
                if (item.type === 'zipper') {
                  k.boostTimer = 1.35;
                  k.speed = 34; // boost zip speed
                  st.cameraShake = 0.28;
                } else {
                  // question mark item box
                  item.active = false;
                  item.mesh.visible = false;
                  item.respawnTimer = 5.0; // 5s respawn
                  
                  if (!k.activePowerup) {
                    const powerups = ['mushroom', 'banana', 'green_shell', 'red_shell', 'lightning'];
                    const chosen = powerups[Math.floor(Math.random() * powerups.length)];
                    k.activePowerup = chosen;
                    setActivePowerup(chosen);
                    playBeep(600, 0.1);
                  }
                }
              }
            });

            // Lap updates
            if (closestIdx > 180 && closestIdx < 220) k.checkpointPassed = true;
            if (closestIdx > 385 && k.checkpointPassed) {
              k.checkpointPassed = false;
              const now = clock.getElapsedTime();
              const lapTime = now - st.lapStartTime;
              st.lapStartTime = now;
              
              st.currentLapTimes.push(lapTime.toFixed(2));
              setLapTimes([...st.currentLapTimes]);

              if (k.lap >= 3) {
                setPhase('over');
              } else {
                k.lap += 1;
                setLap(k.lap);
              }
            }

            setSpeed(Math.floor(k.speed * 7));
          }
        } else {
          // --- CPU AI PATH FOLLOWING (Simulated only on Host authority) ---
          if (st.isHost && st.matchStarted) {
            if (k.spinTimer > 0) {
              k.spinTimer -= dt;
              k.speed = Math.max(0, k.speed - dt * 20);
              k.modelGroup.rotation.y += dt * 14.5;
            } else {
              let minDist = 9999;
              let closestIdx = 0;
              st.curvePoints.forEach((pt, idx) => {
                const d = k.pos.distanceTo(pt);
                if (d < minDist) { minDist = d; closestIdx = idx; }
              });
              k.splineProgressIndex = closestIdx;

              const targetSeg = (closestIdx + 12) % TOTAL_SPLINE_STEPS;
              const targetPt = st.curvePoints[targetSeg];

              const dir = targetPt.clone().sub(k.pos).normalize();
              const headingAngle = Math.atan2(dir.x, dir.z);

              let angleDiff = headingAngle - k.angle;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

              k.angle += THREE.MathUtils.clamp(angleDiff, -2.5 * dt, 2.5 * dt);

              // Max speed
              const targetSpd = (16.2 + k.skill * 4) * (minDist > st.trackWidth / 2 ? 0.35 : 1.0) * k.scale;
              k.speed = THREE.MathUtils.lerp(k.speed, targetSpd, dt * 3);

              k.velocity.set(Math.sin(k.angle) * k.speed, 0, Math.cos(k.angle) * k.speed);
              k.pos.addScaledVector(k.velocity, dt);
              
              k.pos.y = st.curvePoints[closestIdx].y + 0.28;
              k.modelGroup.position.copy(k.pos);
              k.modelGroup.rotation.y = k.angle;

              // AI use powerups automatically
              if (k.activePowerup) {
                k.activePowerup = null; // consume
                if (Math.random() < 0.25) {
                  // mushroom boost
                  k.boostTimer = 1.5;
                  k.speed += 8;
                }
              }
            }

            k.wheelsList.forEach((w) => {
              w.mesh.rotation.x += (k.speed * dt) / w.radius;
            });

            // CPU item box collisions on Host
            st.powerupBoxes.forEach((item) => {
              if (!item.active || item.type === 'zipper') return;
              const d = k.pos.distanceTo(item.pos);
              if (d < item.radius) {
                item.active = false;
                item.mesh.visible = false;
                item.respawnTimer = 5.0;
                k.activePowerup = 'mushroom';
              }
            });

            // Lap counters CPU
            if (k.splineProgressIndex > 180 && k.splineProgressIndex < 220) k.checkpointPassed = true;
            if (k.splineProgressIndex > 385 && k.checkpointPassed) {
              k.checkpointPassed = false;
              k.lap += 1;
            }
          }
        }

        // Exhaust bubbles
        if (Math.abs(k.speed) > 1 && Math.random() < 0.15) {
          spawnExhaustBubble(k.modelGroup.position, k.color);
        }

        // Collision logic push back
        st.karts.forEach((other) => {
          if (other.index === k.index) return;
          const dist = k.pos.distanceTo(other.pos);
          if (dist < 1.6) {
            const push = k.pos.clone().sub(other.pos).normalize();
            if (k.isLocalHuman) {
              k.velocity.addScaledVector(push, 8.5);
              st.cameraShake = 0.25;
            } else {
              k.pos.addScaledVector(push, 0.1);
            }
            k.speed *= 0.7;
          }
        });
      });

      // Update deployed banana hazards spinouts
      st.hazards.forEach((hazard) => {
        if (!hazard.active) return;
        st.karts.forEach((k) => {
          if (k.spinTimer > 0) return;
          const dist = k.pos.distanceTo(hazard.pos);
          if (dist < hazard.radius) {
            hazard.active = false;
            scene.remove(hazard.mesh);
            k.spinTimer = 1.2; // spin-out 1.2s
            k.speed *= 0.25;
            playBeep(200, 0.3);
          }
        });
      });

      // standings rankings updates
      const standings = getRacerStandingsList();
      setLeaderboard(standings.map((r, i) => `${i + 1}. ${r.name} (L${r.lap})`));

      const rankIndex = standings.findIndex(r => r.index === st.playerIndex);
      const rankings = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', '13th', '14th', '15th', '16th'];
      setRankText(rankings[rankIndex] || '16th');

      // Chase camera
      const player = st.karts[st.playerIndex];
      if (player) {
        const targetFOV = player.boostTimer > 0 ? 82 : 65;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, dt * 5);
        camera.updateProjectionMatrix();

        const heading = player.angle + player.driftAngle;
        const idealCam = player.pos.clone().add(new THREE.Vector3(
          Math.sin(heading) * -4.5,
          2.1,
          Math.cos(heading) * -4.5
        ));
        camera.position.lerp(idealCam, dt * 6.5);
        
        const targetLook = player.pos.clone().add(new THREE.Vector3(Math.sin(heading) * 4.5, 0.8, Math.cos(heading) * 4.5));
        
        if (st.cameraShake > 0) {
          camera.position.x += (Math.random() - 0.5) * st.cameraShake;
          camera.position.y += (Math.random() - 0.5) * st.cameraShake;
        }
        camera.lookAt(targetLook);
      }

      // NetworkAuthoritative broadcast syncs
      broadcastSyncAll();

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(st.animId);
      
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [phase]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exitMatch = () => {
    cleanupPeer();
    setPhase('menu');
  };

  return (
    <div className="racing-root">
      
      {/* ──────────────── MAIN MENU ──────────────── */}
      {phase === 'menu' && (
        <div className="racing-lobby-overlay">
          <div className="racing-lobby-box">
            <h1>Go-Kart Grand Prix</h1>
            <div className="racing-lobby-sub">// 3D MULTIPLAYER RACING</div>

            <div className="racing-select-section">
              <label>Select Track</label>
              <div className="racing-options-grid">
                <div className={`racing-option-card ${selectedTrack === 'monza' ? 'active' : ''}`} onClick={() => setSelectedTrack('monza')}>
                  <div className="racing-card-title">Monza</div>
                  <div className="racing-card-desc">High-speed straights & chicanes</div>
                </div>
                <div className={`racing-option-card ${selectedTrack === 'spa' ? 'active' : ''}`} onClick={() => setSelectedTrack('spa')}>
                  <div className="racing-card-title">Spa</div>
                  <div className="racing-card-desc">Eau Rouge elevation curves</div>
                </div>
                <div className={`racing-option-card ${selectedTrack === 'brands' ? 'active' : ''}`} onClick={() => setSelectedTrack('brands')}>
                  <div className="racing-card-title">Brands Hatch</div>
                  <div className="racing-card-desc">Winding, technical hills</div>
                </div>
              </div>
            </div>

            <div className="racing-select-section">
              <label>Game Mode</label>
              <div className="racing-options-grid">
                <div className={`racing-option-card ${selectedMode === 'gp' ? 'active' : ''}`} onClick={() => setSelectedMode('gp')}>
                  <div className="racing-card-title">Grand Prix</div>
                  <div className="racing-card-desc">Race against 15 CPU drivers</div>
                </div>
                <div className={`racing-option-card ${selectedMode === 'tt' ? 'active' : ''}`} onClick={() => setSelectedMode('tt')}>
                  <div className="racing-card-title">Time Trial</div>
                  <div className="racing-card-desc">Solo lap records training</div>
                </div>
                <div className={`racing-option-card ${selectedMode === 'mp' ? 'active' : ''}`} onClick={() => setSelectedMode('mp')}>
                  <div className="racing-card-title">Multiplayer</div>
                  <div className="racing-card-desc">WebRTC P2P hosting rooms</div>
                </div>
              </div>
            </div>

            <div className="racing-select-section">
              <label>Kart Paint Finish</label>
              <div className="racing-color-options">
                {['#ff007f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'].map(col => (
                  <button
                    key={col}
                    className={`racing-color-btn ${kartColor === col ? 'active' : ''}`}
                    style={{ backgroundColor: col }}
                    onClick={() => setKartColor(col)}
                  />
                ))}
              </div>
            </div>

            <div className="racing-action-btns">
              {selectedMode === 'mp' ? (
                <>
                  <button className="racing-btn" onClick={createRoom}>
                    Host Lobby Room
                  </button>
                  <button className="racing-btn secondary" onClick={() => setPhase('join_input')}>
                    Join Lobby Room
                  </button>
                </>
              ) : (
                <button className="racing-btn" onClick={() => setPhase('playing')}>
                  Start Solo Race
                </button>
              )}
            </div>
          </div>
          <BackButton />
        </div>
      )}

      {/* ──────────────── JOIN LOBBY INPUT ──────────────── */}
      {phase === 'join_input' && (
        <div className="racing-lobby-overlay">
          <div className="racing-lobby-box">
            <h1>Join Race Room</h1>
            <div className="racing-lobby-sub">// ESTABLISH WEBRTC CHANNEL</div>

            <div className="racing-join-section">
              <label>Room Encryption Key</label>
              <input
                className="racing-input-code"
                maxLength={6}
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                autoFocus
              />
            </div>

            <div className="racing-action-btns">
              <button className="racing-btn" onClick={joinRoom}>
                Connect to Host
              </button>
              <button className="racing-btn secondary" onClick={() => setPhase('menu')}>
                Cancel
              </button>
            </div>
            {peerErr && <div className="racing-error">{peerErr}</div>}
          </div>
          <BackButton />
        </div>
      )}

      {/* ──────────────── MULTIPLAYER LOBBY SCREEN ──────────────── */}
      {phase === 'lobby' && (
        <div className="racing-lobby-overlay">
          <div className="racing-lobby-box">
            <h1>Karting Room</h1>
            <div className="racing-lobby-sub">// LOBBY ROSTER LIST</div>

            <div className="racing-lobby-peers">
              <div className="racing-lobby-peers-title">Drivers Connected</div>
              <div className="racing-lobby-peers-list">
                {lobbyPeers.map((p, idx) => (
                  <div key={idx} className="racing-peer-row">
                    <span style={{ color: p.color }}>● {p.name}</span>
                    <span>READY</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="racing-action-btns">
              {stateRef.current.isHost ? (
                <button className="racing-btn" onClick={triggerStartMatch}>
                  Start Grid Race
                </button>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                  Waiting for Host to start match...
                </div>
              )}
              <button className="racing-btn secondary" onClick={exitMatch}>
                Exit Room
              </button>
            </div>

            <div className="racing-hud-room-code" style={{ position: 'relative', top: 'auto', left: 'auto', display: 'inline-flex', marginTop: '20px' }}>
              <span className="racing-hud-code-lbl">ROOM:</span>
              <span className="racing-hud-code-val">{roomCode}</span>
              <button className={`racing-copy-btn ${copied ? 'copied' : ''}`} onClick={copyRoomCode}>
                {copied ? 'COPIED!' : 'COPY'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── GAMEPLAY RENDER ──────────────── */}
      {phase === 'playing' && (
        <>
          {/* Three.js viewport */}
          <div ref={containerRef} className="racing-container" />

          {/* In-Game HUD elements */}
          <div className="racing-hud-container">
            {/* Top Left Cards */}
            <div className="racing-hud-top-left">
              <button className="racing-exit-btn" onClick={exitMatch}>
                ← Exit Race
              </button>
              <div className="racing-hud-card">
                <div className="racing-hud-label">LAP COUNT</div>
                <div className="racing-hud-val">{lap}<span> / 3</span></div>
              </div>
            </div>

            {/* Top Center Powerup Icon Display */}
            {selectedMode !== 'tt' && (
              <>
                <div className={`racing-powerup-slot ${activePowerup ? 'has-item' : ''}`}>
                  {activePowerup === 'mushroom' && '🍄'}
                  {activePowerup === 'banana' && '🍌'}
                  {activePowerup === 'green_shell' && '🟢'}
                  {activePowerup === 'red_shell' && '🔴'}
                  {activePowerup === 'lightning' && '⚡'}
                </div>
                {activePowerup && (
                  <div className="racing-powerup-hint">
                    Press SHIFT or E to activate
                  </div>
                )}
              </>
            )}

            {/* Top Right Leaderboard standings */}
            {selectedMode !== 'tt' && (
              <div className="racing-hud-standings">
                <div className="racing-standings-title">STANDINGS</div>
                {leaderboard.slice(0, 8).map((r, idx) => (
                  <div
                    key={idx}
                    className={`racing-standing-row ${r.includes('PLAYER') ? 'local-player' : ''}`}
                  >
                    {r}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Left Standings positions / Laps list */}
            <div className="racing-hud-bottom-left">
              {selectedMode !== 'tt' && (
                <div className="racing-position-indicator">
                  {rankText}
                </div>
              )}
              {lapTimes.length > 0 && (
                <div className="racing-lap-times-list">
                  <div style={{ fontWeight: '800', marginBottom: '3px' }}>LAP TIMES</div>
                  {lapTimes.map((lt, idx) => (
                    <div key={idx}>Lap {idx + 1}: {lt}s</div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Right speedometer */}
            <div className="racing-hud-bottom-right">
              <div className="racing-speedometer-card">
                <div className="racing-speed-val">{speed}</div>
                <div className="racing-speed-unit">KM/H</div>
              </div>
            </div>

            {/* Traffic Lights Countdown Overlay */}
            {countdownState >= 0 && (
              <div className="racing-traffic-lights-overlay">
                <div className="racing-traffic-lights-box">
                  <div className={`racing-light-bulb red ${countdownState >= 3 ? 'active' : ''}`} />
                  <div className={`racing-light-bulb orange ${countdownState >= 2 ? 'active' : ''}`} />
                  <div className={`racing-light-bulb green ${countdownState >= 1 ? 'active' : ''}`} />
                </div>
              </div>
            )}

            {/* Dramatic GO Banner */}
            {showGoBanner && (
              <div className="racing-go-banner">
                <h1>GO!</h1>
              </div>
            )}
          </div>
        </>
      )}

      {/* ──────────────── GAME OVER / PODIUM ──────────────── */}
      {phase === 'over' && (
        <div className="racing-gameover-overlay">
          <div className="racing-gameover-box">
            <h2>Grand Prix Over</h2>
            <div className="racing-gameover-result">
              You finished in <span>{rankText}</span>!
            </div>
            
            {lapTimes.length > 0 && (
              <div style={{ margin: '20px 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                RACE TIMES: {lapTimes.join('s, ')}s
              </div>
            )}

            <div className="racing-action-btns">
              <button className="racing-btn" onClick={() => setPhase('playing')}>
                Replay GP
              </button>
              <button className="racing-btn secondary" onClick={exitMatch}>
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
