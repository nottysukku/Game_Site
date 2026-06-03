// src/pages/FpsShooter3D.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import Peer from 'peerjs';
import BackButton from './BackButton';
import './FpsShooter3D.css';

// Networking constants
const ROOM_PREFIX = 'arcadefps_';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode(n = 6) {
  let s = '';
  for (let i = 0; i < n; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

// Map boundary dimensions
const MAP_SIZE = 40;

// Obstacle config mapping
const OBSTACLES = [
  // Surrounding boundary walls
  { x: 0, z: -MAP_SIZE / 2, w: MAP_SIZE, d: 2, h: 6, color: 0x1f2937 }, // North Wall
  { x: 0, z: MAP_SIZE / 2, w: MAP_SIZE, d: 2, h: 6, color: 0x1f2937 },  // South Wall
  { x: -MAP_SIZE / 2, z: 0, w: 2, d: MAP_SIZE, h: 6, color: 0x1f2937 },  // West Wall
  { x: MAP_SIZE / 2, z: 0, w: 2, d: MAP_SIZE, h: 6, color: 0x1f2937 },   // East Wall

  // Center structure (Corridors / Cover blocks)
  { x: 0, z: 0, w: 8, d: 8, h: 5, color: 0x3b82f6 },      // Large Center pillar
  { x: -10, z: -8, w: 6, d: 2, h: 4, color: 0x10b981 },   // Left cover wall
  { x: 10, z: 8, w: 6, d: 2, h: 4, color: 0x10b981 },    // Right cover wall
  { x: -8, z: 10, w: 2, d: 8, h: 4, color: 0xec4899 },   // Southwest structure
  { x: 8, z: -10, w: 2, d: 8, h: 4, color: 0xec4899 },   // Northeast structure

  // Ramps/Bridges
  { x: -14, z: 0, w: 4, d: 8, h: 2, color: 0x6b7280 },    // Low platform West
  { x: 14, z: 0, w: 4, d: 8, h: 2, color: 0x6b7280 },     // Low platform East

  // Scatter boxes (Cover crates)
  { x: -4, z: -8, w: 2.2, d: 2.2, h: 2.2, color: 0xd97706 },
  { x: 4, z: 8, w: 2.2, d: 2.2, h: 2.2, color: 0xd97706 },
  { x: -6, z: 4, w: 2, d: 2, h: 2, color: 0xd97706 },
  { x: 6, z: -4, w: 2, d: 2, h: 2, color: 0xd97706 },
];

export default function FpsShooter3D() {
  // Lobby States
  const [phase, setPhase] = useState('menu'); // menu | hosting | joining | playing
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [peerErr, setPeerErr] = useState('');
  const [connected, setConnected] = useState(false);
  const [oppDisconnected, setOppDisconnected] = useState(false);
  
  // Game Configuration & Statistics
  const [team, setTeam] = useState('Blue'); // Blue (CT) | Red (T)
  const [hp, setHp] = useState(100);
  const [shield, setShield] = useState(100);
  const [score, setScore] = useState({ local: 0, remote: 0 });
  const [ammo, setAmmo] = useState(30);
  const [reserveAmmo, setReserveAmmo] = useState(90);
  const [grenades, setGrenades] = useState(3);
  const [reloading, setReloading] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // HUD logs
  const [killFeed, setKillFeed] = useState([]);
  const [damageFlash, setDamageFlash] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [winner, setWinner] = useState('');

  // Three.js References
  const containerRef = useRef(null);
  const stateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    clock: null,
    
    // Player values
    pos: new THREE.Vector3(0, 0.9, 14), // Starting Y eye height is 1.6
    velocity: new THREE.Vector3(0, 0, 0),
    yaw: Math.PI,
    pitch: 0,
    isGrounded: true,
    moveSpeed: 8.5,
    jumpSpeed: 11.5,
    cameraShake: 0,

    // Controls
    keys: { w: false, a: false, s: false, d: false, space: false },
    
    // Weapon values
    lastShootTime: 0,
    shootCooldown: 0.12, // 120ms between shots
    recoilAmount: 0,
    swayTime: 0,

    // Synced Opponent Representation
    oppMesh: null,
    oppGunMesh: null,
    oppPos: new THREE.Vector3(0, 0.9, -14),
    oppTargetPos: new THREE.Vector3(0, 0.9, -14),
    oppYaw: 0,
    oppPitch: 0,
    oppHp: 100,

    // Entities
    grenadesList: [],
    bulletsList: [],
    particles: [],
    boundingBoxes: [], // Obstacle boxes

    // Network Sync rate
    lastSyncTime: 0,
    
    // Animation ID
    animId: null
  });

  // WebRTC References
  const peerRef = useRef(null);
  const connRef = useRef(null);

  // Sync ref values for callbacks
  const teamRef = useRef('Blue');
  useEffect(() => { teamRef.current = team; }, [team]);

  // Push log helper
  const addLog = (txt, isLocalKiller) => {
    const log = { id: Math.random(), txt, isLocalKiller };
    setKillFeed(prev => [...prev.slice(-3), log]);
    setTimeout(() => {
      setKillFeed(prev => prev.filter(l => l.id !== log.id));
    }, 4500);
  };

  // Reset local match stats
  const resetStats = useCallback(() => {
    setHp(100);
    setShield(100);
    setAmmo(30);
    setReserveAmmo(90);
    setGrenades(3);
    setReloading(false);
    setIsDead(false);
    setShowGameOver(false);
    setWinner('');

    const st = stateRef.current;
    st.pos.set(teamRef.current === 'Blue' ? 0 : 0, 0.9, teamRef.current === 'Blue' ? 14 : -14);
    st.velocity.set(0, 0, 0);
    st.yaw = teamRef.current === 'Blue' ? Math.PI : 0;
    st.pitch = 0;
    st.oppPos.set(teamRef.current === 'Blue' ? 0 : 0, 0.9, teamRef.current === 'Blue' ? -14 : 14);
    st.oppTargetPos.copy(st.oppPos);
    st.oppHp = 100;
  }, []);

  // Sync state over WebRTC
  const broadcastSync = () => {
    if (connRef.current && connected) {
      const st = stateRef.current;
      connRef.current.send({
        type: 'sync',
        x: st.pos.x,
        y: st.pos.y,
        z: st.pos.z,
        yaw: st.yaw,
        pitch: st.pitch,
        hp: hp,
        shield: shield,
        score: score.local,
      });
    }
  };

  // Trigger hit damage logic
  const handleHit = useCallback((damage) => {
    if (isDead) return;
    setDamageFlash(true);
    setTimeout(() => setDamageFlash(false), 120);

    setShield(prevS => {
      const sImpact = Math.min(prevS, damage * 0.6);
      const hImpact = damage - sImpact;
      const nextShield = prevS - sImpact;
      
      setHp(prevH => {
        const nextHp = Math.max(0, prevH - hImpact);
        if (nextHp <= 0) {
          setIsDead(true);
          addLog(`${teamRef.current === 'Blue' ? 'Guest' : 'Host'} killed You`, false);
          
          if (connRef.current) {
            connRef.current.send({ type: 'kill', killer: teamRef.current === 'Blue' ? 'Guest' : 'Host' });
          }

          setScore(prev => {
            const nextScore = { ...prev, remote: prev.remote + 1 };
            if (nextScore.remote >= 5) {
              setWinner(teamRef.current === 'Blue' ? 'Guest' : 'Host');
              setShowGameOver(true);
              document.exitPointerLock?.();
            }
            return nextScore;
          });

          // Trigger local respawn
          setTimeout(() => {
            resetStats();
          }, 3000);
        }
        return nextHp;
      });
      return nextShield;
    });
  }, [hp, shield, isDead, resetStats, score]);

  const handleHitRef = useRef(handleHit);
  handleHitRef.current = handleHit;

  // Handle incoming data channel payloads
  const wireConn = useCallback((conn) => {
    connRef.current = conn;
    conn.on('open', () => {
      setConnected(true);
      setPhase('playing');
    });

    conn.on('data', (data) => {
      const st = stateRef.current;
      if (data.type === 'init') {
        setTeam(data.hostTeam === 'Blue' ? 'Red' : 'Blue');
        setPhase('playing');
      }
      else if (data.type === 'sync') {
        st.oppTargetPos.set(data.x, data.y, data.z);
        st.oppYaw = data.yaw;
        st.oppPitch = data.pitch;
        st.oppHp = data.hp;
      }
      else if (data.type === 'shoot') {
        // Spawn remote tracer bullet path locally
        if (st.scene) {
          const origin = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
          const dir = new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z);
          
          // Muzzle flash on opponent gun
          if (st.oppGunMesh) {
            const opFlash = new THREE.PointLight(0xff7700, 3, 4);
            opFlash.position.copy(st.oppGunMesh.position);
            st.scene.add(opFlash);
            setTimeout(() => { st.scene.remove(opFlash); }, 50);
          }

          // Bullet Tracer Line
          const material = new THREE.LineBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.8 });
          const points = [origin, origin.clone().addScaledVector(dir, 150)];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const tracer = new THREE.Line(geometry, material);
          st.scene.add(tracer);

          st.bulletsList.push({ mesh: tracer, age: 0, maxAge: 0.08 });
        }
      }
      else if (data.type === 'grenade') {
        // Spawn remote grenade
        if (st.scene) {
          const gMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.6 });
          const gGeom = new THREE.SphereGeometry(0.18, 12, 12);
          const mesh = new THREE.Mesh(gGeom, gMat);
          mesh.castShadow = true;
          mesh.position.set(data.origin.x, data.origin.y, data.origin.z);
          st.scene.add(mesh);

          st.grenadesList.push({
            mesh: mesh,
            pos: mesh.position,
            velocity: new THREE.Vector3(data.velocity.x, data.velocity.y, data.velocity.z),
            age: 0
          });
        }
      }
      else if (data.type === 'hit') {
        handleHitRef.current(data.damage);
      }
      else if (data.type === 'kill') {
        addLog(`You killed ${teamRef.current === 'Blue' ? 'Guest' : 'Host'}`, true);
        setScore(prev => {
          const nextScore = { ...prev, local: prev.local + 1 };
          if (nextScore.local >= 5) {
            setWinner(teamRef.current === 'Blue' ? 'Host' : 'Guest');
            setShowGameOver(true);
            document.exitPointerLock?.();
          }
          return nextScore;
        });
      }
      else if (data.type === 'rematch') {
        setScore({ local: 0, remote: 0 });
        resetStats();
      }
    });

    conn.on('close', () => {
      setOppDisconnected(true);
      setConnected(false);
      document.exitPointerLock?.();
    });
  }, [resetStats]);

  // Peer room hosting
  const createRoom = () => {
    cleanupPeer();
    const code = genCode();
    setRoomCode(code);
    setPhase('hosting');
    setPeerErr('');

    const peer = new Peer(ROOM_PREFIX + code);
    peerRef.current = peer;
    peer.on('error', (err) => {
      setPeerErr(err.type === 'unavailable-id' ? 'Room Code is active — try another' : `PeerJS Error: ${err.type}`);
    });

    peer.on('connection', (conn) => {
      wireConn(conn);
      conn.on('open', () => {
        conn.send({ type: 'init', hostTeam: teamRef.current });
      });
    });
  };

  // Peer room joining
  const joinRoom = () => {
    const code = joinInput.toUpperCase().trim();
    if (code.length < 4) {
      setPeerErr('Insert a valid Room Code');
      return;
    }
    cleanupPeer();
    setPeerErr('');
    setPhase('joining');

    const peer = new Peer();
    peerRef.current = peer;
    peer.on('open', () => {
      const conn = peer.connect(ROOM_PREFIX + code);
      wireConn(conn);
      setRoomCode(code);
    });

    peer.on('error', (err) => {
      setPeerErr(err.type === 'peer-unavailable' ? 'Room ID not found' : `PeerJS Error: ${err.type}`);
      setPhase('menu');
    });
  };

  // Clean WebRTC states
  const cleanupPeer = useCallback(() => {
    if (connRef.current) {
      try { connRef.current.close(); } catch(e){}
      connRef.current = null;
    }
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch(e){}
      peerRef.current = null;
    }
    setConnected(false);
    setPeerErr('');
    setOppDisconnected(false);
  }, []);

  // Request rematch
  const handleRematch = () => {
    if (connRef.current && connected) {
      connRef.current.send({ type: 'rematch' });
    }
    setScore({ local: 0, remote: 0 });
    resetStats();
  };

  useEffect(() => {
    return () => cleanupPeer();
  }, [cleanupPeer]);

  // Main 3D Canvas Game Engine Implementation
  useEffect(() => {
    if (phase !== 'playing' || !containerRef.current) return;

    const st = stateRef.current;
    
    // Set base spawn positions depending on teams
    st.pos.set(team === 'Blue' ? 0 : 0, 0.9, team === 'Blue' ? 14 : -14);
    st.oppPos.set(team === 'Blue' ? 0 : 0, 0.9, team === 'Blue' ? -14 : 14);
    st.oppTargetPos.copy(st.oppPos);
    st.yaw = team === 'Blue' ? Math.PI : 0;
    st.pitch = 0;

    // Dimensions
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. THREE SCENE & CAMERA
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06030c);
    scene.fog = new THREE.FogExp2(0x06030c, 0.02);
    st.scene = scene;

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.05, 500);
    st.camera = camera;

    // View bobbing camera container group
    const camContainer = new THREE.Group();
    camContainer.position.copy(st.pos);
    scene.add(camContainer);
    camContainer.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    st.renderer = renderer;

    const clock = new THREE.Clock();
    st.clock = clock;

    // 2. LIGHTING
    const ambientLight = new THREE.AmbientLight(0x090518, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xff00aa, 1.2);
    dirLight.position.set(20, 40, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 100;
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x00d2ff, 0.95);
    backLight.position.set(-20, 25, -20);
    scene.add(backLight);

    // 3. PHYSICAL MAP ENVIRONMENT
    // Sand ground floor
    const floorGeom = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f0b18,
      roughness: 0.95,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid details on floor
    const gridHelper = new THREE.GridHelper(MAP_SIZE, 30, 0x00d2ff, 0x221144);
    gridHelper.position.y = 0.005;
    scene.add(gridHelper);

    // Build map boundary obstacle Box3s
    st.boundingBoxes = [];
    
    OBSTACLES.forEach((wall) => {
      const geom = new THREE.BoxGeometry(wall.w, wall.h, wall.d);
      const mat = new THREE.MeshStandardMaterial({
        color: wall.color,
        roughness: 0.5,
        metalness: 0.45
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(wall.x, wall.h / 2, wall.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Add boundary box to collision lists
      const box = new THREE.Box3().setFromObject(mesh);
      st.boundingBoxes.push(box);
    });

    // 4. WEAPON viewport model
    const weaponGroup = new THREE.Group();
    weaponGroup.position.set(0.24, -0.22, -0.42);
    camera.add(weaponGroup); // Children of camera automatically rotate/follow it

    // Main barrel body
    const mainBarrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.045, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.85, roughness: 0.2 })
    );
    mainBarrel.position.z = -0.15;
    weaponGroup.add(mainBarrel);

    // High tech laser glowing emitter
    const glowingCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.015, 0.25),
      new THREE.MeshBasicMaterial({ color: team === 'Blue' ? 0x00d2ff : 0xff00aa })
    );
    glowingCore.position.set(0, 0.024, -0.15);
    weaponGroup.add(glowingCore);

    // Rifle grip handle
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.12, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 })
    );
    handle.position.set(0, -0.07, -0.05);
    handle.rotation.x = -0.2;
    weaponGroup.add(handle);

    // Weapon Flash light (Muzzle Light)
    const flashLight = new THREE.PointLight(0xff7700, 0, 5);
    flashLight.position.set(0, 0, -0.36);
    weaponGroup.add(flashLight);

    // 5. OPPONENT REPRESENTATION
    // Core Capsule
    const oGeom = new THREE.CylinderGeometry(0.42, 0.42, 1.8, 16);
    const oMat = new THREE.MeshStandardMaterial({
      color: team === 'Blue' ? 0xef4444 : 0x3b82f6, // Red if opponent is T (local is CT) and vice-versa
      metalness: 0.7,
      roughness: 0.3
    });
    const oppMesh = new THREE.Mesh(oGeom, oMat);
    oppMesh.position.copy(st.oppPos);
    oppMesh.castShadow = true;
    oppMesh.receiveShadow = true;
    scene.add(oppMesh);
    st.oppMesh = oppMesh;

    // Glowing head piece
    const ohGeom = new THREE.SphereGeometry(0.35, 16, 16);
    const ohMat = new THREE.MeshBasicMaterial({ color: team === 'Blue' ? 0xff3d00 : 0x00b0ff });
    const oppHead = new THREE.Mesh(ohGeom, ohMat);
    oppHead.position.y = 1.15;
    oppMesh.add(oppHead);

    // Opponent Gun Barrel
    const ogGeom = new THREE.BoxGeometry(0.12, 0.12, 0.75);
    const ogMat = new THREE.MeshStandardMaterial({ color: 0x030712, metalness: 0.8 });
    const oppGun = new THREE.Mesh(ogGeom, ogMat);
    oppGun.position.set(0.3, 0.2, -0.4);
    oppMesh.add(oppGun);
    st.oppGunMesh = oppGun;

    // 6. KEYBOARD EVENT BINDINGS
    const onKeyDown = (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') st.keys.w = true;
      if (code === 'KeyS' || code === 'ArrowDown') st.keys.s = true;
      if (code === 'KeyA' || code === 'ArrowLeft') st.keys.a = true;
      if (code === 'KeyD' || code === 'ArrowRight') st.keys.d = true;
      if (code === 'Space') st.keys.space = true;
      if (code === 'KeyR') triggerReload();
      if (code === 'KeyG') triggerGrenade();
    };

    const onKeyUp = (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') st.keys.w = false;
      if (code === 'KeyS' || code === 'ArrowDown') st.keys.s = false;
      if (code === 'KeyA' || code === 'ArrowLeft') st.keys.a = false;
      if (code === 'KeyD' || code === 'ArrowRight') st.keys.d = false;
      if (code === 'Space') st.keys.space = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse aiming look movements
    const onMouseMove = (e) => {
      if (document.pointerLockElement !== containerRef.current) return;
      const sensitivity = 0.0022;
      st.yaw -= e.movementX * sensitivity;
      st.pitch -= e.movementY * sensitivity;

      // Clamp vertical look to avoid flipping camera Upside down
      st.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, st.pitch));
    };

    window.addEventListener('mousemove', onMouseMove);

    // Handle Lock changes
    const onLockChange = () => {
      setIsLocked(document.pointerLockElement === containerRef.current);
    };

    document.addEventListener('pointerlockchange', onLockChange);

    // Click trigger lock or fire gun
    const handleMouseClick = (e) => {
      if (document.pointerLockElement !== containerRef.current) {
        containerRef.current.requestPointerLock();
        return;
      }
      if (e.button === 0) {
        triggerFire();
      } else if (e.button === 2) {
        triggerGrenade();
      }
    };

    // Block browser context menus on right click
    const blockContextMenu = (e) => {
      if (document.pointerLockElement === containerRef.current) {
        e.preventDefault();
      }
    };

    containerRef.current.addEventListener('mousedown', handleMouseClick);
    window.addEventListener('contextmenu', blockContextMenu);

    // Reload trigger
    const triggerReload = () => {
      if (reloading || ammo === 30 || reserveAmmo <= 0 || isDead || showGameOver) return;
      setReloading(true);
      
      // Weapon rotate reload visual animation
      let reloadAge = 0;
      const rAnim = setInterval(() => {
        reloadAge += 0.05;
        weaponGroup.rotation.z = Math.sin((reloadAge / 1.5) * Math.PI * 2) * 1.5;
        weaponGroup.position.y = -0.22 - Math.sin((reloadAge / 1.5) * Math.PI) * 0.15;
        
        if (reloadAge >= 1.5) {
          clearInterval(rAnim);
          weaponGroup.rotation.z = 0;
          weaponGroup.position.y = -0.22;
          
          setReserveAmmo(prevReserve => {
            setAmmo(prevAmmo => {
              const needed = 30 - prevAmmo;
              const fill = Math.min(prevReserve, needed);
              setReloading(false);
              return prevAmmo + fill;
            });
            const needed = 30 - ammo;
            const fill = Math.min(prevReserve, needed);
            return prevReserve - fill;
          });
        }
      }, 50);
    };

    // Shoot weapon trigger
    const triggerFire = () => {
      const now = clock.getElapsedTime();
      if (isDead || reloading || ammo <= 0 || showGameOver) return;
      if (now - st.lastShootTime < st.shootCooldown) return;

      st.lastShootTime = now;
      setAmmo(prev => prev - 1);

      // Hitscan firing raycast
      const shootOrigin = st.pos.clone().add(new THREE.Vector3(0, 0.7, 0)); // head/eye level offset
      const lookDir = new THREE.Vector3(
        Math.sin(st.yaw) * Math.cos(st.pitch),
        Math.sin(st.pitch),
        Math.cos(st.yaw) * Math.cos(st.pitch)
      ).normalize();

      // Gun muzzle flash light
      flashLight.intensity = 4;
      setTimeout(() => { flashLight.intensity = 0; }, 40);

      // Muzzle spark shell eject particle
      spawnFlashShellParticles(shootOrigin);

      // Synced remote tracer event broadcast
      if (connRef.current && connected) {
        connRef.current.send({
          type: 'shoot',
          origin: { x: shootOrigin.x, y: shootOrigin.y, z: shootOrigin.z },
          direction: { x: lookDir.x, y: lookDir.y, z: lookDir.z }
        });
      }

      // Local Tracer Line
      const tMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.85 });
      const tPts = [shootOrigin, shootOrigin.clone().addScaledVector(lookDir, 100)];
      const tGeom = new THREE.BufferGeometry().setFromPoints(tPts);
      const tracer = new THREE.Line(tGeom, tMat);
      scene.add(tracer);
      st.bulletsList.push({ mesh: tracer, age: 0, maxAge: 0.06 });

      // Gun Recoil pitch kick
      st.pitch += 0.024;
      st.yaw += (Math.random() - 0.5) * 0.01;
      st.cameraShake = 0.05;

      // Opponent hitbox check
      const oppCenter = st.oppPos.clone();
      const oppAABB = new THREE.Box3(
        oppCenter.clone().sub(new THREE.Vector3(0.45, 0.9, 0.45)),
        oppCenter.clone().add(new THREE.Vector3(0.45, 0.9, 0.45))
      );

      const ray = new THREE.Ray(shootOrigin, lookDir);
      
      // Calculate intersection on opponent
      const targetPoint = new THREE.Vector3();
      const hitsOpponent = ray.intersectBox(oppAABB, targetPoint);

      // Compute intersection on environment obstacles to verify blocking walls
      let closestWallDist = 9999;
      st.boundingBoxes.forEach((box) => {
        const wallPt = new THREE.Vector3();
        if (ray.intersectBox(box, wallPt)) {
          const d = shootOrigin.distanceTo(wallPt);
          if (d < closestWallDist) closestWallDist = d;
        }
      });

      if (hitsOpponent) {
        const dToOpp = shootOrigin.distanceTo(targetPoint);
        if (dToOpp < closestWallDist) {
          // HIT!
          spawnImpactSparks(targetPoint, 0xff0055, 12);
          if (connRef.current && connected) {
            connRef.current.send({ type: 'hit', damage: 25 });
          }
          return;
        }
      }

      // If it missed opponent but hit obstacle wall, spawn dust sparks
      if (closestWallDist < 9999) {
        const wallHitPt = shootOrigin.clone().addScaledVector(lookDir, closestWallDist);
        spawnImpactSparks(wallHitPt, 0xaaaaaa, 6);
      }
    };

    // Grenade throw trigger
    const triggerGrenade = () => {
      if (isDead || grenades <= 0 || showGameOver) return;
      setGrenades(prev => prev - 1);

      const throwOrigin = st.pos.clone().add(new THREE.Vector3(0, 0.7, 0));
      const lookDir = new THREE.Vector3(
        Math.sin(st.yaw) * Math.cos(st.pitch),
        Math.sin(st.pitch),
        Math.cos(st.yaw) * Math.cos(st.pitch)
      ).normalize();

      // Launch velocity vector
      const velocity = lookDir.clone().multiplyScalar(15).add(new THREE.Vector3(0, 3.2, 0));

      if (connRef.current && connected) {
        connRef.current.send({
          type: 'grenade',
          origin: { x: throwOrigin.x, y: throwOrigin.y, z: throwOrigin.z },
          velocity: { x: velocity.x, y: velocity.y, z: velocity.z }
        });
      }

      // Local grenade object creation
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.6 })
      );
      mesh.position.copy(throwOrigin);
      mesh.castShadow = true;
      scene.add(mesh);

      st.grenadesList.push({
        mesh: mesh,
        pos: mesh.position,
        velocity: velocity,
        age: 0
      });
    };

    // Spark particle spawner
    const spawnImpactSparks = (pos, color, count) => {
      for (let i = 0; i < count; i++) {
        const pMat = new THREE.MeshBasicMaterial({ color: color });
        const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), pMat);
        pMesh.position.copy(pos);
        scene.add(pMesh);

        st.particles.push({
          mesh: pMesh,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 4.5,
            Math.random() * 3.5,
            (Math.random() - 0.5) * 4.5
          ),
          age: 0,
          maxAge: 0.4
        });
      }
    };

    const spawnFlashShellParticles = (pos) => {
      const pMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.04, 0.015),
        new THREE.MeshBasicMaterial({ color: 0xffaa00 })
      );
      pMesh.position.copy(pos).add(new THREE.Vector3(0.2, -0.1, -0.2));
      scene.add(pMesh);

      st.particles.push({
        mesh: pMesh,
        vel: new THREE.Vector3(Math.random() * 2 + 1, Math.random() * 2 + 1, (Math.random() - 0.5) * 2),
        age: 0,
        maxAge: 0.55
      });
    };

    // Screen dimension resize
    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    // 7. DRIVING ANIMATION ENGINE LOOP
    function animate() {
      st.animId = requestAnimationFrame(animate);
      const dt = Math.min(0.033, clock.getDelta()); // Cap delta

      // Camera view shake damping
      if (st.cameraShake > 0) st.cameraShake -= dt * 0.25;

      // Update particle systems
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i];
        p.age += dt;
        p.vel.y -= 9.8 * dt; // gravity
        p.mesh.position.addScaledVector(p.vel, dt);
        if (p.age >= p.maxAge) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          st.particles.splice(i, 1);
        }
      }

      // Update bullets tracers
      for (let i = st.bulletsList.length - 1; i >= 0; i--) {
        const b = st.bulletsList[i];
        b.age += dt;
        if (b.age >= b.maxAge) {
          scene.remove(b.mesh);
          b.mesh.geometry.dispose();
          b.mesh.material.dispose();
          st.bulletsList.splice(i, 1);
        }
      }

      // Update throwable grenades physical coordinates
      for (let i = st.grenadesList.length - 1; i >= 0; i--) {
        const g = st.grenadesList[i];
        g.age += dt;
        g.velocity.y -= 18.0 * dt; // Gravity draw

        const nextPos = g.pos.clone().addScaledVector(g.velocity, dt);
        let collided = false;
        let colNormal = new THREE.Vector3(0, 1, 0);

        // Ground Floor Bounce
        if (nextPos.y <= 0.1) {
          collided = true;
          nextPos.y = 0.1;
          colNormal.set(0, 1, 0);
        } else {
          // Obstacle Bounds Bounce
          const gBox = new THREE.Box3(
            nextPos.clone().sub(new THREE.Vector3(0.18, 0.18, 0.18)),
            nextPos.clone().add(new THREE.Vector3(0.18, 0.18, 0.18))
          );

          for (const box of st.boundingBoxes) {
            if (gBox.intersectsBox(box)) {
              collided = true;
              // Simple reflection normal calculation from box center direction
              const boxCenter = new THREE.Vector3();
              box.getCenter(boxCenter);
              colNormal.subVectors(nextPos, boxCenter).normalize();
              break;
            }
          }
        }

        if (collided) {
          g.velocity.reflect(colNormal).multiplyScalar(0.42); // Damping bounce
          g.pos.addScaledVector(g.velocity, dt);
        } else {
          g.pos.copy(nextPos);
        }

        // Explode triggers after 2.5 seconds
        if (g.age >= 2.5) {
          triggerExplosion(g.pos);
          scene.remove(g.mesh);
          g.mesh.geometry.dispose();
          g.mesh.material.dispose();
          st.grenadesList.splice(i, 1);
        }
      }

      // Sync Opponent mesh transformations smoothly
      if (oppMesh) {
        oppMesh.position.lerp(st.oppTargetPos, dt * 10);
        oppMesh.rotation.y = THREE.MathUtils.lerp(oppMesh.rotation.y, st.oppYaw, dt * 10);
        
        // Tilt opponent gun mesh based on pitch
        if (oppGun) {
          oppGun.rotation.x = THREE.MathUtils.lerp(oppGun.rotation.x, st.oppPitch, dt * 10);
        }
      }

      // --- LOCAL PLAYER PHYSICS MOVEMENT & COLLISIONS ---
      if (!isDead && !showGameOver) {
        // Horizontal movement directions
        const moveVector = new THREE.Vector3(0, 0, 0);
        const forward = new THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw)).normalize();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

        if (st.keys.w) moveVector.add(forward);
        if (st.keys.s) moveVector.sub(forward);
        if (st.keys.d) moveVector.add(right);
        if (st.keys.a) moveVector.sub(right);

        moveVector.normalize().multiplyScalar(st.moveSpeed);

        // Apply movement velocity
        st.velocity.x = moveVector.x;
        st.velocity.z = moveVector.z;

        // Apply Gravity
        if (!st.isGrounded) {
          st.velocity.y -= gravity * dt;
        }

        // Jumps
        if (st.keys.space && st.isGrounded) {
          st.velocity.y = st.jumpSpeed;
          st.isGrounded = false;
        }

        // --- COLLISION RESOLUTION SLIDING ---
        // Test step changes along X axis
        const dx = st.velocity.x * dt;
        const newPosX = st.pos.clone().add(new THREE.Vector3(dx, 0, 0));
        let collidesX = false;
        
        let playerBox = new THREE.Box3(
          newPosX.clone().sub(new THREE.Vector3(0.35, 0.9, 0.35)),
          newPosX.clone().add(new THREE.Vector3(0.35, 0.9, 0.35))
        );

        for (const box of st.boundingBoxes) {
          if (playerBox.intersectsBox(box)) {
            collidesX = true;
            break;
          }
        }
        if (!collidesX) {
          st.pos.x = newPosX.x;
        }

        // Test step changes along Z axis
        const dz = st.velocity.z * dt;
        const newPosZ = st.pos.clone().add(new THREE.Vector3(0, 0, dz));
        let collidesZ = false;

        playerBox.set(
          newPosZ.clone().sub(new THREE.Vector3(0.35, 0.9, 0.35)),
          newPosZ.clone().add(new THREE.Vector3(0.35, 0.9, 0.35))
        );

        for (const box of st.boundingBoxes) {
          if (playerBox.intersectsBox(box)) {
            collidesZ = true;
            break;
          }
        }
        if (!collidesZ) {
          st.pos.z = newPosZ.z;
        }

        // Test Y vertical coordinates
        const dy = st.velocity.y * dt;
        const newPosY = st.pos.clone().add(new THREE.Vector3(0, dy, 0));
        let collidesY = false;

        // Ground check
        if (newPosY.y <= 0.9) {
          st.pos.y = 0.9;
          st.velocity.y = 0;
          st.isGrounded = true;
        } else {
          // Check block collisions vertically
          playerBox.set(
            newPosY.clone().sub(new THREE.Vector3(0.35, 0.9, 0.35)),
            newPosY.clone().add(new THREE.Vector3(0.35, 0.9, 0.35))
          );

          for (const box of st.boundingBoxes) {
            if (playerBox.intersectsBox(box)) {
              collidesY = true;
              // If moving down, land on top of the block
              if (st.velocity.y < 0) {
                st.pos.y = box.max.y + 0.9;
                st.velocity.y = 0;
                st.isGrounded = true;
              } else {
                // Moving up, hit ceiling block
                st.velocity.y = -2;
              }
              break;
            }
          }
          if (!collidesY) {
            st.pos.y = newPosY.y;
            // If we are high and not touching a block top, we are falling
            if (st.pos.y > 0.9 && st.velocity.y === 0) {
              st.isGrounded = false;
            }
          }
        }

        // Update Camera coordinates position
        camContainer.position.copy(st.pos);

        // Weapon swaying visual animation on movement
        const isMoving = st.keys.w || st.keys.s || st.keys.a || st.keys.d;
        if (isMoving && st.isGrounded) {
          st.swayTime += dt * 13;
          weaponGroup.position.x = 0.24 + Math.sin(st.swayTime) * 0.015;
          weaponGroup.position.y = -0.22 + Math.cos(st.swayTime * 2) * 0.008;
        } else {
          weaponGroup.position.set(0.24, -0.22, -0.42);
        }
      }

      // --- CAMERA ROTATION RENDER LOOKAT ---
      const idealCamLook = new THREE.Vector3(
        Math.sin(st.yaw) * Math.cos(st.pitch),
        Math.sin(st.pitch),
        Math.cos(st.yaw) * Math.cos(st.pitch)
      ).normalize();

      // Apply screen camera vibrations
      if (st.cameraShake > 0) {
        camera.position.set(
          (Math.random() - 0.5) * st.cameraShake,
          (Math.random() - 0.5) * st.cameraShake,
          0
        );
      } else {
        camera.position.set(0, 0, 0);
      }

      camera.lookAt(camera.position.clone().add(idealCamLook));

      // 30Hz network coordinate broadcats sync update
      const nowMs = Date.now();
      if (nowMs - st.lastSyncTime > 33) {
        st.lastSyncTime = nowMs;
        broadcastSync();
      }

      renderer.render(scene, camera);
    }

    animate();

    // Spawn grenade blast particles & splash damage calculations
    const triggerExplosion = (pos) => {
      st.cameraShake = 0.45;

      // Blast Ring sphere expansion mesh
      const eGeom = new THREE.SphereGeometry(0.1, 16, 16);
      const eMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
      const explosionRing = new THREE.Mesh(eGeom, eMat);
      explosionRing.position.copy(pos);
      scene.add(explosionRing);

      // Expansion animation interval
      let ringAge = 0;
      const rAnim = setInterval(() => {
        ringAge += 0.05;
        explosionRing.scale.addScalar(0.7);
        explosionRing.material.opacity = 0.8 * (1 - ringAge / 0.55);
        if (ringAge >= 0.55) {
          clearInterval(rAnim);
          scene.remove(explosionRing);
          explosionRing.geometry.dispose();
          explosionRing.material.dispose();
        }
      }, 50);

      // Explode debris sparks particles
      spawnImpactSparks(pos, 0xff7700, 24);

      // Blast Radial damage check
      const dToLocal = st.pos.distanceTo(pos);
      if (dToLocal < 5.8) {
        const damage = Math.floor((1 - dToLocal / 5.8) * 80);
        if (damage > 10) handleHitRef.current(damage);
      }
    };

    // Clean Three environment and listeners
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('contextmenu', blockContextMenu);
      window.removeEventListener('resize', onResize);
      
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousedown', handleMouseClick);
      }

      cancelAnimationFrame(st.animId);

      // Traverse dispose meshes
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [phase, connected, isDead, showGameOver, team, ammo, reserveAmmo, grenades, reloading, score, resetStats]);

  // Main lobby back navigations
  const handleLobbyBack = () => {
    cleanupPeer();
    setPhase('menu');
  };

  return (
    <div className="fps-root">
      
      {/* ──────────────── RENDER LOBBY INTERFACES ──────────────── */}
      {phase === 'menu' && (
        <div className="fps-lobby-overlay">
          <div className="fps-lobby-box">
            <h1>Cyber Elite FPS</h1>
            <div className="fps-lobby-sub">// 1V1 TACTICAL MULTIPLAYER</div>
            
            <div className="fps-team-select">
              <label>Select Team faction</label>
              <div className="fps-team-options">
                <button className={`fps-team-btn ct-blue ${team === 'Blue' ? 'active' : ''}`} onClick={() => setTeam('Blue')}>
                  CT (Blue)
                </button>
                <button className={`fps-team-btn t-red ${team === 'Red' ? 'active' : ''}`} onClick={() => setTeam('Red')}>
                  T (Red)
                </button>
              </div>
            </div>

            <div className="fps-action-btns">
              <button className="fps-action-btn" onClick={createRoom}>
                Host Match
              </button>
              <button className="fps-action-btn secondary" onClick={() => setPhase('join_input')}>
                Join Match
              </button>
            </div>

            {peerErr && <div className="fps-error">{peerErr}</div>}
          </div>
          <BackButton />
        </div>
      )}

      {phase === 'join_input' && (
        <div className="fps-lobby-overlay">
          <div className="fps-lobby-box">
            <h1>Join Lobby</h1>
            <div className="fps-lobby-sub">// INSERT ENCRYPTED KEY</div>

            <div className="fps-join-section">
              <label>Room Key</label>
              <input
                className="fps-input-code"
                maxLength={6}
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                autoFocus
              />
            </div>

            <div className="fps-action-btns" style={{ marginTop: '20px' }}>
              <button className="fps-action-btn" onClick={joinRoom}>
                Establish Connection
              </button>
              <button className="fps-action-btn secondary" onClick={() => setPhase('menu')}>
                Cancel
              </button>
            </div>

            {peerErr && <div className="fps-error">{peerErr}</div>}
          </div>
          <BackButton />
        </div>
      )}

      {phase === 'hosting' && (
        <div className="fps-lobby-overlay">
          <div className="fps-lobby-box">
            <h1>Waiting for Peer</h1>
            <div className="fps-lobby-sub">// TRANSMITTING LOBBY BEACON</div>

            <div className="fps-waiting-box">
              <div className="fps-code-display">{roomCode}</div>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Share this connection code with your opponent</p>
              <div className="fps-spinner" />
              <button className="fps-back-btn" onClick={handleLobbyBack}>
                Terminate Connection Beacon
              </button>
            </div>

            {peerErr && <div className="fps-error">{peerErr}</div>}
          </div>
          <BackButton />
        </div>
      )}

      {phase === 'joining' && (
        <div className="fps-lobby-overlay">
          <div className="fps-lobby-box">
            <h1>Connecting</h1>
            <div className="fps-lobby-sub">// SYNCING SIGNALS</div>
            <div className="fps-spinner" style={{ margin: '20px auto' }} />
          </div>
          <BackButton />
        </div>
      )}

      {/* ──────────────── RENDER GAMEPLAY CANVAS ──────────────── */}
      {phase === 'playing' && (
        <>
          {/* Main 3D canvas viewport container */}
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

          {/* HUD Overlay layer */}
          <div className="fps-hud-container">
            {/* Center Circular Crosshair Reticle */}
            {isLocked && !isDead && !showGameOver && (
              <div className="fps-crosshair">
                <div className="fps-crosshair-dot" />
              </div>
            )}

            {/* Locked Instruction Panel */}
            {!isLocked && !showGameOver && (
              <div className="fps-lock-overlay">
                <div className="fps-lock-box">
                  <h2>Cyber Elite 1v1</h2>
                  <ul>
                    <li>Move: <strong>W / A / S / D</strong> or arrows</li>
                    <li>Look / Aim: <strong>Mouse Movement</strong></li>
                    <li>Fire Laser Rifle: <strong>Left Click</strong></li>
                    <li>Throw Grenade: <strong>G</strong> or <strong>Right Click</strong></li>
                    <li>Reload Rifle: <strong>R</strong> key</li>
                    <li>Jump Action: <strong>Spacebar</strong></li>
                  </ul>
                  <button className="fps-lock-btn">
                    Engage HUD & Control Lock
                  </button>
                </div>
              </div>
            )}

            {/* Damage screen flash widget */}
            <div className={`fps-damage-indicator ${damageFlash ? 'active' : ''}`} />

            {/* Health / Shield UI Widget (Bottom Left) */}
            {!showGameOver && (
              <div className="fps-hud-left">
                <div className="fps-hud-card red-bar">
                  <div className="fps-hud-label">VITALITY CORE</div>
                  <div className="fps-hud-val">{hp}<span> / 100</span></div>
                </div>

                <div className="fps-hud-card">
                  <div className="fps-hud-label">ENERGY SHIELD</div>
                  <div className="fps-hud-val">{shield}<span> / 100</span></div>
                </div>

                <div className="fps-hud-card" style={{ borderLeftColor: '#ffaa00' }}>
                  <div className="fps-hud-label">TACTICAL GRENADES</div>
                  <div className="fps-grenades-row">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`fps-grenade-dot ${i >= grenades ? 'empty' : ''}`} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Ammo Count HUD Widget (Bottom Right) */}
            {!showGameOver && (
              <div className="fps-hud-right">
                <div className={`fps-hud-card ammo-card ${reloading ? 'reloading' : ''}`}>
                  <div className="fps-hud-label">LASER CELL CHARGE</div>
                  {reloading ? (
                    <div className="fps-reload-text">RELOADING CORE</div>
                  ) : (
                    <div className="fps-hud-val">{ammo}<span> / {reserveAmmo}</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Scoreboard Widget (Top Center) */}
            <div className="fps-hud-top">
              <div className="fps-score-badge">
                <div className="fps-score-team blue">
                  <div className="fps-score-team-lbl">BLUE (CT)</div>
                  <div className="fps-score-num">{team === 'Blue' ? score.local : score.remote}</div>
                </div>
                <div className="fps-score-divider">:</div>
                <div className="fps-score-team red">
                  <div className="fps-score-team-lbl">RED (T)</div>
                  <div className="fps-score-num">{team === 'Red' ? score.local : score.remote}</div>
                </div>
              </div>
            </div>

            {/* Kill Announcements Log (Top Right) */}
            <div className="fps-kill-feed">
              {killFeed.map((log) => (
                <div key={log.id} className={`fps-kill-log ${log.isLocalKiller ? 'local-killer' : ''}`}>
                  <span>🔫 {log.txt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Death Respawn Screen */}
          {isDead && !showGameOver && (
            <div className="fps-death-overlay">
              <div className="fps-death-box">
                <h2>YOU WERE ELIMINATED</h2>
                <p>Respawn coordinates generating...</p>
                <div className="fps-respawn-bar">
                  <div className="fps-respawn-progress" />
                </div>
              </div>
            </div>
          )}

          {/* Match ended Podium Board */}
          {showGameOver && (
            <div className="fps-gameover-overlay">
              <div className="fps-gameover-box">
                <h2>MATCH TERMINATED</h2>
                <p style={{ color: '#aaa', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '20px' }}>
                  // Winner: <strong style={{ color: '#ffaa00' }}>{winner} Team</strong>
                </p>

                <div className="fps-gameover-stats">
                  <div className="fps-stat-item">
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>YOUR SCORE</span>
                    <span className="fps-stat-val">{score.local}</span>
                  </div>
                  <div className="fps-stat-item">
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>ENEMY SCORE</span>
                    <span className="fps-stat-val">{score.remote}</span>
                  </div>
                </div>

                <div className="fps-action-btns">
                  <button className="fps-rematch-btn" onClick={handleRematch}>
                    Request Rematch
                  </button>
                  <button className="fps-action-btn secondary" onClick={() => { cleanupPeer(); setPhase('menu'); }}>
                    Exit Lobby
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Back to menu button */}
          <button className="fps-back-btn" style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 100, fontSize: '15px' }} onClick={handleLobbyBack}>
            ← Exit Game
          </button>
        </>
      )}
    </div>
  );
}
