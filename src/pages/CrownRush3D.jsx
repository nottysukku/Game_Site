import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import Peer from 'peerjs';
import BackButton from './BackButton';
import './CrownRush3D.css';

// Web Audio API Sound Generator
let audioCtx = null;
function playSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'shoot') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'throw') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'hit') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(30, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'claim') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }
  } catch (e) {
    console.error('AudioContext error:', e);
  }
}

const ARENA_SIZE = 40;
const TOWER_RADIUS = 3.0;
const TOWER_HEIGHT = 4.5;

export default function CrownRush3D() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Game states
  const [phase, setPhase] = useState('menu'); // 'menu', 'lobby', 'playing', 'gameover'
  const [onlineRole, setOnlineRole] = useState(null); // 'host', 'client'
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [statusText, setStatusText] = useState('Click screen to lock mouse. Climb tower & hold crown for 30s!');
  
  // HUD variables
  const [playerHoldTime, setPlayerHoldTime] = useState(0);
  const [rivalHoldTime, setRivalHoldTime] = useState(0);
  const [hasCrown, setHasCrown] = useState(false);
  const [hasGun, setHasGun] = useState(false);
  const [ammo, setAmmo] = useState(0);
  const [isStunned, setIsStunned] = useState(false);
  const [rivalConnected, setRivalConnected] = useState(false);

  // References for game logic loop
  const stateRef = useRef({
    keys: {},
    player: {
      pos: new THREE.Vector3(0, 1.2, -15),
      vel: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      hasCrown: false,
      hasGun: false,
      ammo: 0,
      holdTime: 0,
      stunTime: 0,
      rockCooldown: 0,
    },
    rival: {
      pos: new THREE.Vector3(0, 1.2, 15),
      vel: new THREE.Vector3(),
      yaw: Math.PI,
      hasCrown: false,
      hasGun: false,
      holdTime: 0,
      stunTime: 0,
    },
    crown: {
      pos: new THREE.Vector3(0, TOWER_HEIGHT + 0.8, 0),
      holder: null, // 'player', 'rival', or null
    },
    gunItem: {
      pos: new THREE.Vector3(-12, 1.0, 10),
      spawned: true,
      timer: 0
    },
    rocks: [
      new THREE.Vector3(-8, 0.5, -8),
      new THREE.Vector3(8, 0.5, -8),
      new THREE.Vector3(-8, 0.5, 8),
      new THREE.Vector3(8, 0.5, 8)
    ],
    projectiles: [], // Array of thrown rocks { pos, vel, owner }
    tracers: [], // Array of gun laser lines { start, end, timer }
    particles: [], // Sparks { pos, vel, color, timer }
  });

  // WebRTC Refs
  const peerRef = useRef(null);
  const connRef = useRef(null);

  // Three.js Refs
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    playerGunMesh: null,
    rivalMesh: null,
    crownMesh: null,
    gunPedestal: null,
    gunItemMesh: null,
    rockMeshes: [],
    projectileMeshes: [],
    tracerLines: [],
    lightHelper: null,
  });

  // Pointer lock track
  const isPointerLocked = useRef(false);

  // Keyboard and Mouse input listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      stateRef.current.keys[e.code] = true;
      if (e.code === 'KeyG') {
        throwRock();
      }
      if (e.code === 'KeyE') {
        interactCrown();
      }
    };
    const handleKeyUp = (e) => {
      stateRef.current.keys[e.code] = false;
    };
    const handleMouseMove = (e) => {
      if (!isPointerLocked.current || stateRef.current.player.stunTime > 0) return;
      const sensitivity = 0.0025;
      stateRef.current.player.yaw -= e.movementX * sensitivity;
      stateRef.current.player.pitch -= e.movementY * sensitivity;
      stateRef.current.player.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, stateRef.current.player.pitch));
    };
    const handleMouseDown = (e) => {
      if (e.button === 0) { // Left click
        shootGun();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  // WebRTC Synchronization Logic
  const setupConnection = (conn) => {
    connRef.current = conn;
    setRivalConnected(true);
    setConnectionStatus('Connected!');
    
    conn.on('data', (data) => {
      const state = stateRef.current;
      if (data.type === 'SYNC') {
        state.rival.pos.copy(data.player.pos);
        state.rival.yaw = data.player.yaw;
        state.rival.hasCrown = data.player.hasCrown;
        state.rival.hasGun = data.player.hasGun;
        state.rival.holdTime = data.player.holdTime;
        state.rival.stunTime = data.player.stunTime;
        
        // Sync crown state if authority (host handles crown authority)
        if (onlineRole === 'client') {
          state.crown.holder = data.crown.holder;
          state.crown.pos.copy(data.crown.pos);
          state.gunItem.spawned = data.gunItem.spawned;
          state.gunItem.pos.copy(data.gunItem.pos);
        }
      } else if (data.type === 'FIRE') {
        // Draw laser tracer for rival
        const start = new THREE.Vector3().copy(data.start);
        const end = new THREE.Vector3().copy(data.end);
        spawnTracer(start, end);
        playSound('shoot');
      } else if (data.type === 'THROW') {
        // Spawn thrown rock for rival
        const pos = new THREE.Vector3().copy(data.pos);
        const vel = new THREE.Vector3().copy(data.vel);
        state.projectiles.push({ pos, vel, owner: 'rival' });
        playSound('throw');
      } else if (data.type === 'STUN') {
        // We got stunned by host/rival
        state.player.stunTime = 1.5;
        setIsStunned(true);
        playSound('hit');
        if (state.player.hasCrown) {
          dropCrown();
        }
      }
    });

    conn.on('close', () => {
      setRivalConnected(false);
      setConnectionStatus('Rival Disconnected');
    });
  };

  const startHost = () => {
    setOnlineRole('host');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomCode(code);
    setConnectionStatus('Waiting for rival...');
    
    const peer = new Peer(`arcade-cr-${code}`, { debug: 1 });
    peerRef.current = peer;

    peer.on('open', () => {
      setConnectionStatus('Room created! Waiting for player...');
    });
    peer.on('connection', (conn) => {
      setupConnection(conn);
    });
    peer.on('error', (err) => {
      console.error(err);
      setConnectionStatus('Lobby Error');
    });

    setPhase('lobby');
  };

  const startClient = () => {
    if (!joinCode) return;
    setOnlineRole('client');
    setConnectionStatus('Connecting...');

    const peer = new Peer(null, { debug: 1 });
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(`arcade-cr-${joinCode}`);
      setupConnection(conn);
    });
    peer.on('error', (err) => {
      console.error(err);
      setConnectionStatus('Join Failed');
    });

    setPhase('lobby');
  };

  const startSinglePlayer = () => {
    setOnlineRole('single');
    setConnectionStatus('Playing Offline');
    setPhase('playing');
    initThree();
  };

  const restartGame = () => {
    const state = stateRef.current;
    state.player.pos.set(0, 1.2, -15);
    state.player.vel.set(0, 0, 0);
    state.player.hasCrown = false;
    state.player.hasGun = false;
    state.player.ammo = 0;
    state.player.holdTime = 0;
    state.player.stunTime = 0;

    state.rival.pos.set(0, 1.2, 15);
    state.rival.hasCrown = false;
    state.rival.hasGun = false;
    state.rival.holdTime = 0;
    state.rival.stunTime = 0;

    state.crown.holder = null;
    state.crown.pos.set(0, TOWER_HEIGHT + 0.8, 0);

    state.gunItem.spawned = true;
    state.gunItem.pos.set(-12, 1.0, 10);
    
    state.projectiles = [];
    state.tracers = [];
    state.particles = [];

    setPlayerHoldTime(0);
    setRivalHoldTime(0);
    setHasCrown(false);
    setHasGun(false);
    setAmmo(0);
    setIsStunned(false);
    
    setPhase('playing');
  };

  // Interactions
  const interactCrown = () => {
    const state = stateRef.current;
    if (state.player.stunTime > 0) return;
    if (state.player.hasCrown) return;

    // Check if player is close to crown item
    const playerPos = state.player.pos;
    const crownPos = state.crown.pos;
    const distance = playerPos.distanceTo(crownPos);
    
    if (distance < 3.2 && state.crown.holder === null) {
      state.player.hasCrown = true;
      state.crown.holder = 'player';
      setHasCrown(true);
      playSound('claim');
      setStatusText('You hold the crown! Stay on top to secure time.');
    }
  };

  const dropCrown = () => {
    const state = stateRef.current;
    state.player.hasCrown = false;
    setHasCrown(false);
    if (state.crown.holder === 'player') {
      state.crown.holder = null;
      state.crown.pos.copy(state.player.pos).y = Math.max(0.8, state.player.pos.y);
      playSound('hit');
    }
  };

  const shootGun = () => {
    const state = stateRef.current;
    const three = threeRef.current;
    if (state.player.stunTime > 0 || !state.player.hasGun || state.player.ammo <= 0) return;
    
    state.player.ammo--;
    setAmmo(state.player.ammo);
    playSound('shoot');

    // Create direction vector from camera pitch/yaw
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(state.player.pitch, state.player.yaw, 0));
    const start = new THREE.Vector3().copy(state.player.pos);
    // adjust slightly to shoot from hip
    start.y -= 0.2;
    
    const maxDist = 80;
    const end = new THREE.Vector3().copy(start).addScaledVector(dir, maxDist);

    // Bullet Raycast
    const ray = new THREE.Ray(start, dir);
    
    // Check hit on rival
    const rivalPos = state.rival.pos;
    const hitBoxRadius = 1.2;
    const distToRival = ray.distanceToPoint(rivalPos);
    const projection = new THREE.Vector3().copy(rivalPos).sub(start).dot(dir);

    let hitPoint = new THREE.Vector3().copy(end);
    let hitRival = false;

    if (projection > 0 && projection < maxDist && distToRival < hitBoxRadius) {
      hitPoint.copy(start).addScaledVector(dir, projection);
      hitRival = true;
    }

    spawnTracer(start, hitPoint);
    spawnSparks(hitPoint, 0xff3d00);

    // Sync laser fire to peer
    if (connRef.current && connRef.current.open) {
      connRef.current.send({
        type: 'FIRE',
        start: { x: start.x, y: start.y, z: start.z },
        end: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z }
      });
    }

    if (hitRival) {
      if (onlineRole === 'single') {
        state.rival.stunTime = 1.5;
        playSound('hit');
        if (state.rival.hasCrown) {
          state.rival.hasCrown = false;
          state.crown.holder = null;
          state.crown.pos.copy(state.rival.pos).y = 0.8;
        }
      } else if (connRef.current && connRef.current.open) {
        connRef.current.send({ type: 'STUN' });
      }
    }

    if (state.player.ammo <= 0) {
      state.player.hasGun = false;
      setHasGun(false);
    }
  };

  const throwRock = () => {
    const state = stateRef.current;
    if (state.player.stunTime > 0) return;
    
    // Check if player is near a rock to pick up and throw
    let rockIndex = -1;
    for (let i = 0; i < state.rocks.length; i++) {
      if (state.player.pos.distanceTo(state.rocks[i]) < 2.5) {
        rockIndex = i;
        break;
      }
    }

    if (rockIndex !== -1) {
      // Picked up! Throw it!
      const throwPos = new THREE.Vector3().copy(state.player.pos);
      const throwDir = new THREE.Vector3(0, 0, -1)
        .applyEuler(new THREE.Euler(state.player.pitch + 0.1, state.player.yaw, 0));
      const vel = new THREE.Vector3().copy(throwDir).multiplyScalar(15);
      
      state.projectiles.push({
        pos: throwPos,
        vel: vel,
        owner: 'player'
      });
      playSound('throw');

      // Temporarily move the rock away to simulate respawning
      state.rocks[rockIndex].y = -10; 
      setTimeout(() => {
        state.rocks[rockIndex].y = 0.5;
      }, 5000);

      // WebRTC Sync
      if (connRef.current && connRef.current.open) {
        connRef.current.send({
          type: 'THROW',
          pos: { x: throwPos.x, y: throwPos.y, z: throwPos.z },
          vel: { x: vel.x, y: vel.y, z: vel.z }
        });
      }
    }
  };

  // Spark Generator
  const spawnSparks = (pos, colorVal) => {
    const state = stateRef.current;
    for (let i = 0; i < 15; i++) {
      state.particles.push({
        pos: new THREE.Vector3().copy(pos),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          Math.random() * 5,
          (Math.random() - 0.5) * 5
        ),
        color: colorVal,
        timer: 0.4
      });
    }
  };

  const spawnTracer = (start, end) => {
    stateRef.current.tracers.push({
      start: new THREE.Vector3().copy(start),
      end: new THREE.Vector3().copy(end),
      timer: 0.1
    });
  };

  // ThreeJS Scene Setup
  const initThree = () => {
    const state = stateRef.current;
    const three = threeRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    three.renderer = renderer;

    // Scene & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);
    scene.fog = new THREE.FogExp2(0x0a0c10, 0.015);
    three.scene = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);
    three.camera = camera;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffaa44, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x00e5ff, 1.5, 30);
    pointLight.position.set(0, TOWER_HEIGHT + 1, 0);
    scene.add(pointLight);

    // Floor grid & material
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(100, 50, 0x00e5ff, 0x1d2433);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Arena Outer Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x181e2b, roughness: 0.9 });
    const wallGeo = new THREE.BoxGeometry(100, 8, 2);
    
    // North wall
    const wallN = new THREE.Mesh(wallGeo, wallMat);
    wallN.position.set(0, 4, -50);
    scene.add(wallN);
    // South wall
    const wallS = new THREE.Mesh(wallGeo, wallMat);
    wallS.position.set(0, 4, 50);
    scene.add(wallS);
    // West wall
    const wallW = new THREE.Mesh(wallGeo, wallMat);
    wallW.rotation.y = Math.PI / 2;
    wallW.position.set(-50, 4, 0);
    scene.add(wallW);
    // East wall
    const wallE = new THREE.Mesh(wallGeo, wallMat);
    wallE.rotation.y = Math.PI / 2;
    wallE.position.set(50, 4, 0);
    scene.add(wallE);

    // Central Tower
    const towerGeo = new THREE.CylinderGeometry(TOWER_RADIUS, TOWER_RADIUS + 1, TOWER_HEIGHT, 16);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x222a36, roughness: 0.5, metalness: 0.5 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, TOWER_HEIGHT / 2, 0);
    tower.castShadow = true;
    tower.receiveShadow = true;
    scene.add(tower);

    // Crown Mesh (futuristic glowing floating ring)
    const crownGroup = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(0.8, 0.12, 8, 24);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 1.0,
      roughness: 0.1,
      metalness: 1.0
    });
    const ring = new THREE.Mesh(ringGeo, crownMat);
    ring.rotation.x = Math.PI / 2;
    crownGroup.add(ring);

    // spikes
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spikeGeo = new THREE.ConeGeometry(0.08, 0.4, 4);
      const spike = new THREE.Mesh(spikeGeo, crownMat);
      spike.position.set(Math.cos(angle) * 0.8, 0.2, Math.sin(angle) * 0.8);
      spike.rotation.x = Math.PI / 2;
      spike.rotation.z = angle - Math.PI / 2;
      crownGroup.add(spike);
    }
    crownGroup.position.copy(state.crown.pos);
    scene.add(crownGroup);
    three.crownMesh = crownGroup;

    // Gun Pedestal
    const pedGeo = new THREE.BoxGeometry(1.2, 2, 1.2);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.7, roughness: 0.2 });
    const pedestal = new THREE.Mesh(pedGeo, pedMat);
    pedestal.position.set(state.gunItem.pos.x, 1, state.gunItem.pos.z);
    scene.add(pedestal);
    three.gunPedestal = pedestal;

    // Gun Item Model (floating spinning laser gun)
    const gunItem = new THREE.Group();
    const barrelGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const handleGeo = new THREE.BoxGeometry(0.12, 0.3, 0.12);
    const laserMat = new THREE.MeshStandardMaterial({ color: 0xff3d00, emissive: 0xff3d00 });
    const gunBody = new THREE.Mesh(barrelGeo, laserMat);
    const gunHandle = new THREE.Mesh(handleGeo, pedMat);
    gunHandle.position.set(0, -0.2, -0.2);
    gunItem.add(gunBody);
    gunItem.add(gunHandle);
    gunItem.position.set(state.gunItem.pos.x, 2.2, state.gunItem.pos.z);
    scene.add(gunItem);
    three.gunItemMesh = gunItem;

    // First person gun model (attached to camera)
    const viewGun = new THREE.Group();
    const fpBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), laserMat);
    fpBarrel.rotation.x = Math.PI / 2;
    fpBarrel.position.set(0.3, -0.25, -0.5);
    viewGun.add(fpBarrel);
    scene.add(viewGun);
    three.playerGunMesh = viewGun;

    // Rival avatar mesh (for multiplayer & AI bot)
    const rivalGroup = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444 }));
    head.position.y = 1.8;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.1, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 }));
    body.position.y = 1.0;
    rivalGroup.add(head);
    rivalGroup.add(body);
    rivalGroup.position.copy(state.rival.pos);
    scene.add(rivalGroup);
    three.rivalMesh = rivalGroup;

    // Rock obstacles & pickups
    state.rocks.forEach(pos => {
      const rockGeo = new THREE.DodecahedronGeometry(0.5);
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.copy(pos);
      scene.add(rock);
      three.rockMeshes.push(rock);
    });

    // Handle Resize
    const resize = () => {
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', resize);

    // Pointer Lock events
    const canvasClick = () => {
      canvas.requestPointerLock();
    };
    canvas.addEventListener('click', canvasClick);

    const lockChange = () => {
      isPointerLocked.current = document.pointerLockElement === canvas;
    };
    document.addEventListener('pointerlockchange', lockChange);

    // Start Game Loop
    let lastTime = performance.now();
    let frameId;

    const gameLoop = (time) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      updatePhysics(dt);
      updateAI(dt);
      renderThree();

      // Send status sync over WebRTC
      if (connRef.current && connRef.current.open && onlineRole) {
        connRef.current.send({
          type: 'SYNC',
          player: {
            pos: { x: state.player.pos.x, y: state.player.pos.y, z: state.player.pos.z },
            yaw: state.player.yaw,
            hasCrown: state.player.hasCrown,
            hasGun: state.player.hasGun,
            holdTime: state.player.holdTime,
            stunTime: state.player.stunTime
          },
          crown: {
            holder: state.crown.holder,
            pos: { x: state.crown.pos.x, y: state.crown.pos.y, z: state.crown.pos.z }
          },
          gunItem: {
            spawned: state.gunItem.spawned,
            pos: { x: state.gunItem.pos.x, y: state.gunItem.pos.y, z: state.gunItem.pos.z }
          }
        });
      }

      frameId = requestAnimationFrame(gameLoop);
    };
    frameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', canvasClick);
      document.removeEventListener('pointerlockchange', lockChange);
    };
  };

  const updatePhysics = (dt) => {
    const state = stateRef.current;
    const p = state.player;
    
    // Cooldowns
    if (p.stunTime > 0) {
      p.stunTime -= dt;
      if (p.stunTime <= 0) setIsStunned(false);
    }
    
    // Player controls & movement (only if not stunned)
    if (p.stunTime <= 0) {
      const speed = 7.5;
      const moveVec = new THREE.Vector3();
      if (state.keys['KeyW']) moveVec.z -= 1;
      if (state.keys['KeyS']) moveVec.z += 1;
      if (state.keys['KeyA']) moveVec.x -= 1;
      if (state.keys['KeyD']) moveVec.x += 1;
      
      moveVec.normalize().applyEuler(new THREE.Euler(0, p.yaw, 0));
      p.pos.addScaledVector(moveVec, speed * dt);
      
      // Jump
      if (state.keys['Space'] && p.pos.y <= 1.25) {
        p.vel.y = 8;
      }
    }

    // Apply gravity
    if (p.pos.y > 1.2 || p.vel.y > 0) {
      p.vel.y -= 15 * dt;
      p.pos.y += p.vel.y * dt;
      if (p.pos.y < 1.2) {
        p.pos.y = 1.2;
        p.vel.y = 0;
      }
    }

    // Boundary Collisions
    p.pos.x = Math.max(-ARENA_SIZE + 1.5, Math.min(ARENA_SIZE - 1.5, p.pos.x));
    p.pos.z = Math.max(-ARENA_SIZE + 1.5, Math.min(ARENA_SIZE - 1.5, p.pos.z));

    // Tower Collisions (Standing on Top or blocking)
    const distToCenter = Math.hypot(p.pos.x, p.pos.z);
    if (distToCenter < TOWER_RADIUS + 0.8) {
      // If above tower platform level, stand on it
      if (p.pos.y >= TOWER_HEIGHT) {
        if (p.pos.y + p.vel.y * dt <= TOWER_HEIGHT + 1.2) {
          p.pos.y = TOWER_HEIGHT + 1.2;
          p.vel.y = 0;
        }
      } else {
        // Push out of tower cylinder
        const angle = Math.atan2(p.pos.z, p.pos.x);
        p.pos.x = Math.cos(angle) * (TOWER_RADIUS + 0.8);
        p.pos.z = Math.sin(angle) * (TOWER_RADIUS + 0.8);
      }
    }

    // Pick up Gun Item
    if (state.gunItem.spawned && p.pos.distanceTo(state.gunItem.pos) < 2.5) {
      state.gunItem.spawned = false;
      p.hasGun = true;
      p.ammo = 10;
      setHasGun(true);
      setAmmo(10);
      playSound('claim');
    }

    // Respawn gun if not active
    if (!state.gunItem.spawned) {
      state.gunItem.timer += dt;
      if (state.gunItem.timer > 10) {
        state.gunItem.spawned = true;
        state.gunItem.timer = 0;
      }
    }

    // Projectile (Rocks) Simulation
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const proj = state.projectiles[i];
      proj.vel.y -= 12 * dt;
      proj.pos.addScaledVector(proj.vel, dt);

      // Hit Ground Check
      if (proj.pos.y < 0.2) {
        spawnSparks(proj.pos, 0x555555);
        state.projectiles.splice(i, 1);
        continue;
      }

      // Check hit against player/rival
      if (proj.owner === 'player' && proj.pos.distanceTo(state.rival.pos) < 1.5) {
        // Stun rival
        if (onlineRole === 'single') {
          state.rival.stunTime = 1.5;
          playSound('hit');
          if (state.rival.hasCrown) {
            state.rival.hasCrown = false;
            state.crown.holder = null;
            state.crown.pos.copy(state.rival.pos).y = 0.8;
          }
        } else if (connRef.current && connRef.current.open) {
          connRef.current.send({ type: 'STUN' });
        }
        spawnSparks(proj.pos, 0xff0000);
        state.projectiles.splice(i, 1);
      } else if (proj.owner === 'rival' && proj.pos.distanceTo(p.pos) < 1.5) {
        // Stun player
        p.stunTime = 1.5;
        setIsStunned(true);
        playSound('hit');
        dropCrown();
        spawnSparks(proj.pos, 0x00e5ff);
        state.projectiles.splice(i, 1);
      }
    }

    // Crown position tracking
    if (state.crown.holder === 'player') {
      state.crown.pos.copy(p.pos);
      state.crown.pos.y += 1.4;
      p.holdTime += dt;
      setPlayerHoldTime(Math.floor(p.holdTime));

      // Win Condition Check
      if (p.holdTime >= 30) {
        setPhase('gameover');
        setStatusText('Victory! You held the crown for 30 seconds!');
        document.exitPointerLock();
      }
    } else if (state.crown.holder === 'rival') {
      state.crown.pos.copy(state.rival.pos);
      state.crown.pos.y += 1.4;
      state.rival.holdTime += dt;
      setRivalHoldTime(Math.floor(state.rival.holdTime));

      if (state.rival.holdTime >= 30) {
        setPhase('gameover');
        setStatusText('Defeat! The rival held the crown for 30 seconds.');
        document.exitPointerLock();
      }
    } else {
      // Spin floating crown
      state.crown.pos.y = (TOWER_HEIGHT + 0.8) + Math.sin(timeSeconds() * 3) * 0.2;
    }
  };

  const updateAI = (dt) => {
    const state = stateRef.current;
    if (onlineRole !== 'single') return; // AI is only active in single player offline mode

    const rival = state.rival;
    if (rival.stunTime > 0) {
      rival.stunTime -= dt;
      return;
    }

    // Simple AI decision tree
    const speed = 4.5;
    let target = new THREE.Vector3();

    if (state.crown.holder === null) {
      // Go for crown on top of the tower
      target.copy(state.crown.pos);
    } else if (state.crown.holder === 'player') {
      // Chase player with crown
      target.copy(state.player.pos);
    } else {
      // Wander or seek gun pedestal
      if (state.gunItem.spawned) {
        target.copy(state.gunItem.pos);
      } else {
        target.set(10, 1.2, -10);
      }
    }

    // Move rival toward target
    const dir = new THREE.Vector3().copy(target).sub(rival.pos);
    dir.y = 0; // lock height
    if (dir.length() > 0.5) {
      dir.normalize();
      rival.pos.addScaledVector(dir, speed * dt);
      rival.yaw = Math.atan2(dir.x, dir.z);
    }

    // Tower climbing logic
    const distToCenter = Math.hypot(rival.pos.x, rival.pos.z);
    if (distToCenter < TOWER_RADIUS + 0.6) {
      rival.pos.y = THREE.MathUtils.lerp(rival.pos.y, TOWER_HEIGHT + 1.0, 0.1);
    } else {
      rival.pos.y = THREE.MathUtils.lerp(rival.pos.y, 1.2, 0.1);
    }

    // AI picking up crown
    if (state.crown.holder === null && rival.pos.distanceTo(state.crown.pos) < 2.5) {
      rival.hasCrown = true;
      state.crown.holder = 'rival';
      playSound('claim');
      setStatusText('Rival grabbed the crown! Stun them to reclaim it!');
    }

    // AI picking up gun
    if (state.gunItem.spawned && rival.pos.distanceTo(state.gunItem.pos) < 2.5) {
      state.gunItem.spawned = false;
      rival.hasGun = true;
      playSound('claim');
    }

    // AI shooting player
    if (rival.hasGun && Math.random() < 0.02) {
      // Shoot at player
      const fpDir = new THREE.Vector3().copy(state.player.pos).sub(rival.pos).normalize();
      const start = new THREE.Vector3().copy(rival.pos);
      const end = new THREE.Vector3().copy(start).addScaledVector(fpDir, 50);

      spawnTracer(start, end);
      playSound('shoot');

      if (rival.pos.distanceTo(state.player.pos) < 20 && Math.random() < 0.6) {
        state.player.stunTime = 1.5;
        setIsStunned(true);
        playSound('hit');
        dropCrown();
      }
    }
  };

  const renderThree = () => {
    const state = stateRef.current;
    const three = threeRef.current;
    if (!three.scene || !three.camera || !three.renderer) return;

    // Update player camera orientation
    three.camera.rotation.set(0, 0, 0); // reset
    three.camera.rotation.y = state.player.yaw;
    three.camera.rotation.x = state.player.pitch;
    
    // Camera position (eye height = 1.8 units above player box)
    three.camera.position.copy(state.player.pos);
    three.camera.position.y += 0.8;

    // Viewport Gun tracking
    if (three.playerGunMesh) {
      three.playerGunMesh.visible = state.player.hasGun;
      // attach to camera position
      three.playerGunMesh.position.copy(three.camera.position);
      three.playerGunMesh.rotation.copy(three.camera.rotation);
    }

    // Rival rendering
    if (three.rivalMesh) {
      three.rivalMesh.position.copy(state.rival.pos);
      three.rivalMesh.rotation.y = state.rival.yaw;
    }

    // Crown rendering
    if (three.crownMesh) {
      three.crownMesh.position.copy(state.crown.pos);
      three.crownMesh.rotation.y += 0.02;
    }

    // Gun Item spinning
    if (three.gunItemMesh) {
      three.gunItemMesh.visible = state.gunItem.spawned;
      three.gunItemMesh.rotation.y += 0.03;
    }

    // Projectile rendering
    // Simple dynamic spheres for rocks
    three.projectileMeshes.forEach(mesh => three.scene.remove(mesh));
    three.projectileMeshes = [];
    state.projectiles.forEach(proj => {
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
      mesh.position.copy(proj.pos);
      three.scene.add(mesh);
      three.projectileMeshes.push(mesh);
    });

    // Tracer lines rendering
    three.tracerLines.forEach(line => three.scene.remove(line));
    three.tracerLines = [];
    state.tracers.forEach((trace, idx) => {
      const mat = new THREE.LineBasicMaterial({ color: 0xff3d00, linewidth: 2 });
      const points = [trace.start, trace.end];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, mat);
      three.scene.add(line);
      three.tracerLines.push(line);

      trace.timer -= 0.016; // tick at ~60fps
      if (trace.timer <= 0) {
        state.tracers.splice(idx, 1);
      }
    });

    // Draw sparks/particles
    state.particles.forEach((part, idx) => {
      part.pos.addScaledVector(part.vel, 0.016);
      part.vel.y -= 9.8 * 0.016; // gravity
      part.timer -= 0.016;

      const pMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.12),
        new THREE.MeshBasicMaterial({ color: part.color })
      );
      pMesh.position.copy(part.pos);
      three.scene.add(pMesh);
      three.projectileMeshes.push(pMesh); // clean up with main meshes

      if (part.timer <= 0) {
        state.particles.splice(idx, 1);
      }
    });

    three.renderer.render(three.scene, three.camera);
  };

  const timeSeconds = () => {
    return performance.now() / 1000;
  };

  // Start game when lobby starts
  useEffect(() => {
    if (rivalConnected && phase === 'lobby') {
      setPhase('playing');
      initThree();
    }
  }, [rivalConnected, phase]);

  const leaveLobby = () => {
    if (peerRef.current) peerRef.current.destroy();
    setPhase('menu');
  };

  if (phase === 'menu') {
    return (
      <div className="cr-root">
        <BackButton />
        <div className="cr-menu">
          <h1>Crown Rush 3D</h1>
          <p>Overhaul 3D first-person shooter. Lock mouse look and climb the tower to capture the crown.</p>
          <button style={{ marginTop: '20px' }} onClick={startSinglePlayer}>🎮 Play Single Player</button>
          
          <div style={{ marginTop: '20px', borderTop: '1px solid #facc1555', paddingTop: '15px' }}>
            <button onClick={startHost}>Host WebRTC Room</button>
          </div>

          <div className="cr-join">
            <input 
              type="text" 
              placeholder="Enter Room Code" 
              value={joinCode} 
              onChange={(e) => setJoinCode(e.target.value)} 
            />
            <button onClick={startClient}>Join</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'lobby') {
    return (
      <div className="cr-root">
        <BackButton />
        <div className="cr-menu">
          <h1>Lobby</h1>
          <p>Status: <strong>{connectionStatus}</strong></p>
          {roomCode && (
            <p>Share code with P2: <strong style={{ fontSize: '18px', color: '#ffaa00' }}>{roomCode}</strong></p>
          )}
          <button onClick={leaveLobby} style={{ borderColor: '#ef4444', color: '#ef4444' }}>Leave Lobby</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cr-root" ref={containerRef}>
      <button 
        onClick={() => {
          document.exitPointerLock();
          if (peerRef.current) peerRef.current.destroy();
          setPhase('menu');
        }}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'rgba(17, 24, 39, 0.8)',
          border: '1px solid #facc15',
          color: '#fff7ed',
          padding: '8px 16px',
          cursor: 'pointer',
          fontWeight: 'bold',
          zIndex: 10
        }}
      >← Leave Match</button>

      <canvas ref={canvasRef} className="cr-canvas" style={{ width: '100vw', height: '100vh', display: 'block' }} />

      <div className="cr-hud" style={{ pointerEvents: 'none' }}>
        <h1>Match HUD</h1>
        <p style={{ color: '#00e5ff', fontSize: '14px', fontWeight: 'bold' }}>{statusText}</p>
        
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Your Crown Time:</span>
          <span style={{ color: '#00e5ff', fontWeight: 'bold' }}>{playerHoldTime}s / 30s</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Rival Crown Time:</span>
          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{rivalHoldTime}s / 30s</span>
        </div>

        <div style={{ marginTop: '15px', borderTop: '1px solid #facc1544', paddingTop: '10px' }}>
          <div style={{ fontSize: '11px', color: '#888' }}>INVENTORY</div>
          <div>CROWN: <span style={{ color: hasCrown ? '#00e5ff' : '#888' }}>{hasCrown ? 'HELD' : 'NONE'}</span></div>
          <div>LASER GUN: <span style={{ color: hasGun ? '#ffd700' : '#888' }}>{hasGun ? `${ammo} AMMO` : 'NONE'}</span></div>
        </div>

        {isStunned && (
          <div style={{
            marginTop: '15px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '6px',
            textAlign: 'center',
            fontWeight: 'bold',
            animation: 'pulse 0.5s infinite alternate'
          }}>
            STUNNED!
          </div>
        )}
      </div>

      {phase === 'gameover' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <h2 style={{ fontSize: '36px', color: '#ffd700', textShadow: '0 0 15px #ffd700' }}>GAME OVER</h2>
          <p style={{ fontSize: '18px', color: '#fff', margin: '15px 0' }}>{statusText}</p>
          <button 
            onClick={restartGame}
            style={{
              padding: '12px 24px',
              border: '1px solid #facc15',
              background: 'rgba(250, 204, 21, 0.15)',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >Play Again</button>
        </div>
      )}
    </div>
  );
}
