// src/pages/FpsShooter3D.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import Peer from 'peerjs';
import BackButton from './BackButton';
import './FpsShooter3D.css';

// Import newly extracted FPS modular sub-systems
import { WEAPONS, createWeaponModel } from './fps/FpsWeapons';
import {
  playShootSound,
  playReloadSound,
  playEmptyClickSound,
  playHitmarkerSound,
  playExplosionSound,
  playFootstepSound,
  startAmbientWind,
  stopAmbientWind
} from './fps/FpsAudio';
import { buildEnvironment, buildCabins } from './fps/FpsMap';
import { testMovementCollision, testBotCollision, castPlayerRaycast } from './fps/FpsPhysics';

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

const MAP_SIZE = 120;

// 8 Spawning Cabin locations
const CABIN_CONFIGS = [
  { id: 1, cx: -35, cz: -35, door: 'E' }, // Player 1 (Host) Spawn
  { id: 2, cx: -35, cz: 0,   door: 'E' }, // Bot 1 Spawn
  { id: 3, cx: -35, cz: 35,  door: 'E' }, // Bot 2 Spawn
  { id: 4, cx: 35,  cz: -35, door: 'W' }, // Bot 3 Spawn
  { id: 5, cx: 35,  cz: 0,   door: 'W' }, // Bot 4 Spawn
  { id: 6, cx: 35,  cz: 35,  door: 'W' }, // Bot 5 Spawn
  { id: 7, cx: 0,   cz: -35, door: 'S' }, // Bot 6 Spawn
  { id: 8, cx: 0,   cz: 35,  door: 'N' }  // Bot 7 / Player 2 Spawn
];

export default function FpsShooter3D() {
  // Lobby States
  const [phase, setPhase] = useState('menu'); // menu | join_input | playing
  const [gameMode, setGameMode] = useState('tdm'); // tdm | bomb | zombies
  const [startingWeapon, setStartingWeapon] = useState('ar');
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [peerErr, setPeerErr] = useState('');
  const [connected, setConnected] = useState(false);
  const [oppDisconnected, setOppDisconnected] = useState(false);
  const [copied, setCopied] = useState(false);

  // Match / Lobby timers
  const [lobbyTimer, setLobbyTimer] = useState(60);
  const [matchTimer, setMatchTimer] = useState(300); // 5 minutes
  const [matchStarted, setMatchStarted] = useState(false);
  const [showMatchGoBanner, setShowMatchGoBanner] = useState(false);
  
  // Game Configuration & Statistics
  const [team, setTeam] = useState('Blue'); // Blue (CT) | Red (T)
  const [hp, setHp] = useState(100);
  const [shield, setShield] = useState(100);
  const [score, setScore] = useState({ local: 0, remote: 0 });
  const [grenades, setGrenades] = useState(3);
  const [reloading, setReloading] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Dynamic weapon switching inventory
  const [activeWeaponId, setActiveWeaponId] = useState('ar');
  const [weaponClip, setWeaponClip] = useState(30);
  const [weaponReserve, setWeaponReserve] = useState(90);

  // Scoped Sniper view state
  const [isScoped, setIsScoped] = useState(false);

  // Bomb Defuse states
  const [bombPlanted, setBombPlanted] = useState(false);
  const [bombSite, setBombSite] = useState(''); // 'A' | 'B'
  const [bombTimer, setBombTimer] = useState(40);
  const [plantProgress, setPlantProgress] = useState(0); // 0 to 100
  const [defuseProgress, setDefuseProgress] = useState(0); // 0 to 100
  const [planting, setPlanting] = useState(false);
  const [defusing, setDefusing] = useState(false);

  // Zombies wave mode states
  const [waveNum, setWaveNum] = useState(1);
  const [zombiesCount, setZombiesCount] = useState(0);
  const [waveBanner, setWaveBanner] = useState('');
  const [bossHp, setBossHp] = useState(0); // 0 means no active boss
  const [bossMaxHp, setBossMaxHp] = useState(1500);

  // HUD logs & leaderboard
  const [killFeed, setKillFeed] = useState([]);
  const [damageFlash, setDamageFlash] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [winner, setWinner] = useState('');

  // Three.js and Minimap Canvas References
  const containerRef = useRef(null);
  const minimapCanvasRef = useRef(null);

  const stateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    clock: null,
    
    // Player values
    pos: new THREE.Vector3(-35, 0.9, -35),
    velocity: new THREE.Vector3(0, 0, 0),
    yaw: Math.PI / 4,
    pitch: 0,
    isGrounded: true,
    moveSpeed: 8.5,
    jumpSpeed: 11.5,
    cameraShake: 0,
    walkDistance: 0,

    // Controls
    keys: { w: false, a: false, s: false, d: false, space: false, f: false },
    
    // Weapon values
    activeWeaponId: 'ar',
    weaponsInventory: {
      ar: { clip: 30, reserve: 90 },
      smg: { clip: 40, reserve: 120 },
      shotgun: { clip: 7, reserve: 21 },
      sniper: { clip: 5, reserve: 15 },
      pistol: { clip: 12, reserve: 36 }
    },
    lastShootTime: 0,
    recoilAmount: 0,
    swayTime: 0,
    weaponGroup: null, // Viewport weapon model container
    isScoped: false,

    // Synced Opponent Representation
    oppMesh: null,
    oppGunMesh: null,
    oppPos: new THREE.Vector3(0, 0.9, 35),
    oppTargetPos: new THREE.Vector3(0, 0.9, 35),
    oppYaw: 0,
    oppPitch: 0,
    oppHp: 100,
    oppActiveWeaponId: 'ar',

    // Entities lists
    grenadesList: [],
    bulletsList: [],
    particles: [],
    boundingBoxes: [],
    dummies: [],
    bots: [],
    zombies: [],
    bossProjectiles: [],
    damagePopups: [],

    // Bomb defusal meshes
    bombMesh: null,
    bombPlantedPos: null,

    // Network Sync rate
    lastSyncTime: 0,

    // Mutable gameplay state mirrored for the Three.js loop
    connected: false,
    hp: 100,
    shield: 100,
    score: { local: 0, remote: 0 },
    grenades: 3,
    reloading: false,
    isDead: false,
    showGameOver: false,
    winner: '',
    gameMode: 'tdm',
    team: 'Blue',
    isHost: true,

    // Zombies wave counters
    waveNum: 1,
    zombiesToSpawn: 0,
    spawnCooldown: 0,
    intermissionTimer: 0,

    // Bomb scenarios
    bombPlanted: false,
    bombSite: '',
    bombTimer: 40,
    plantProgress: 0,
    defuseProgress: 0,
    planting: false,
    defusing: false,

    animId: null
  });

  const syncGameState = (key, setter, value) => {
    const current = stateRef.current[key];
    const next = typeof value === 'function' ? value(current) : value;
    stateRef.current[key] = next;
    setter(next);
    return next;
  };

  const setConnectedState = (value) => syncGameState('connected', setConnected, value);
  const setHpState = (value) => syncGameState('hp', setHp, value);
  const setShieldState = (value) => syncGameState('shield', setShield, value);
  const setScoreState = (value) => syncGameState('score', setScore, value);
  const setGrenadesState = (value) => syncGameState('grenades', setGrenades, value);
  const setReloadingState = (value) => syncGameState('reloading', setReloading, value);
  const setIsDeadState = (value) => syncGameState('isDead', setIsDead, value);
  const setShowGameOverState = (value) => syncGameState('showGameOver', setShowGameOver, value);
  const setWinnerState = (value) => syncGameState('winner', setWinner, value);
  const setBombPlantedState = (value) => syncGameState('bombPlanted', setBombPlanted, value);
  const setBombTimerState = (value) => syncGameState('bombTimer', setBombTimer, value);
  const setWaveNumState = (value) => syncGameState('waveNum', setWaveNum, value);

  // WebRTC References
  const peerRef = useRef(null);
  const connRef = useRef(null);

  // Sync ref values for callbacks
  const teamRef = useRef('Blue');
  useEffect(() => { teamRef.current = team; }, [team]);

  const gameModeRef = useRef('tdm');
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);

  const startingWeaponRef = useRef('ar');
  useEffect(() => { startingWeaponRef.current = startingWeapon; }, [startingWeapon]);

  const isHost = !connRef.current || (peerRef.current && peerRef.current.id && peerRef.current.id.startsWith(ROOM_PREFIX));
  stateRef.current.isHost = isHost;

  // Push log helper
  const addLog = (txt, isLocalKiller) => {
    const log = { id: Math.random(), txt, isLocalKiller };
    setKillFeed(prev => [...prev.slice(-4), log]);
    setTimeout(() => {
      setKillFeed(prev => prev.filter(l => l.id !== log.id));
    }, 4500);
  };

  // Reset local match stats
  const resetStats = useCallback(() => {
    setHpState(100);
    setShieldState(100);
    setGrenadesState(3);
    setReloadingState(false);
    setIsDeadState(false);
    setShowGameOverState(false);
    setWinnerState('');
    setBombPlantedState(false);
    setBombTimerState(40);
    setWaveNumState(1);

    const st = stateRef.current;
    
    // Clear inventory
    st.weaponsInventory = {
      ar: { clip: 30, reserve: 90 },
      smg: { clip: 40, reserve: 120 },
      shotgun: { clip: 7, reserve: 21 },
      sniper: { clip: 5, reserve: 15 },
      pistol: { clip: 12, reserve: 36 }
    };
    
    // Set starting weapon
    const weaponId = startingWeaponRef.current;
    st.activeWeaponId = weaponId;
    setActiveWeaponId(weaponId);
    setWeaponClip(st.weaponsInventory[weaponId].clip);
    setWeaponReserve(st.weaponsInventory[weaponId].reserve);

    // Zoom exit
    st.isScoped = false;
    setIsScoped(false);

    // Plant progress
    st.plantProgress = 0;
    st.defuseProgress = 0;
    st.planting = false;
    st.defusing = false;
    setPlantProgress(0);
    setDefuseProgress(0);
    setPlanting(false);
    setDefusing(false);

    // Clear bomb scene meshes
    if (st.bombMesh && st.scene) {
      st.scene.remove(st.bombMesh);
      st.bombMesh = null;
    }
    st.bombPlantedPos = null;

    // Clear active waves
    st.waveNum = 1;
    st.zombiesToSpawn = 0;
    st.intermissionTimer = 0;
    
    // Clear dynamic entities
    if (st.scene) {
      st.zombies.forEach(z => st.scene.remove(z.mesh));
      st.bossProjectiles.forEach(p => st.scene.remove(p.mesh));
    }
    st.zombies = [];
    st.bossProjectiles = [];
    setZombiesCount(0);
    setBossHp(0);

    const isHostInstance = !connRef.current || (peerRef.current && peerRef.current.id && peerRef.current.id.startsWith(ROOM_PREFIX));
    
    if (isHostInstance) {
      st.pos.set(-35, 0.9, -35); // House 1
      st.oppPos.set(0, 0.9, 35); // House 8
    } else {
      st.pos.set(0, 0.9, 35); // House 8
      st.oppPos.set(-35, 0.9, -35); // House 1
    }
    st.velocity.set(0, 0, 0);
    st.oppTargetPos.copy(st.oppPos);
    st.oppHp = 100;
  }, []);

  // Sync state over WebRTC
  const broadcastSync = () => {
    const st = stateRef.current;
    if (connRef.current && st.connected) {
      connRef.current.send({
        type: 'sync',
        x: st.pos.x,
        y: st.pos.y,
        z: st.pos.z,
        yaw: st.yaw,
        pitch: st.pitch,
        hp: st.hp,
        shield: st.shield,
        score: st.score.local,
        weaponId: st.activeWeaponId,
        planting: st.planting,
        defusing: st.defusing
      });
    }
  };

  // Trigger hit damage logic
  const handleHit = useCallback((damage) => {
    const st = stateRef.current;
    if (st.isDead || st.showGameOver) return;
    setDamageFlash(true);
    setTimeout(() => setDamageFlash(false), 120);

    setShieldState(prevS => {
      const sImpact = Math.min(prevS, damage * 0.6);
      const hImpact = damage - sImpact;
      const nextShield = prevS - sImpact;
      
      setHpState(prevH => {
        const nextHp = Math.max(0, prevH - hImpact);
        if (nextHp <= 0) {
          setIsDeadState(true);
          addLog(`You were eliminated`, false);
          
          if (connRef.current) {
            connRef.current.send({ type: 'kill', killer: 'Opponent' });
          }

          if (st.gameMode === 'tdm') {
            setScoreState(prev => {
              const nextScore = { ...prev, remote: prev.remote + 1 };
              return nextScore;
            });
          }

          // Trigger local respawn
          setTimeout(() => {
            resetStats();
          }, 3000);
        }
        return nextHp;
      });
      return nextShield;
    });
  }, [resetStats]);

  const handleHitRef = useRef(handleHit);
  handleHitRef.current = handleHit;

  // Deal damage to bot (Host authority)
  const dealDamageToBot = (bot, damage, attackerName) => {
    if (bot.isDead) return;
    bot.hp = Math.max(0, bot.hp - damage);

    if (connRef.current && stateRef.current.connected) {
      connRef.current.send({
        type: 'bot_hit_effect',
        botId: bot.id,
        hp: bot.hp,
        damage: damage
      });
    }

    if (bot.hp <= 0) {
      bot.isDead = true;
      bot.group.visible = false;

      // Credit score
      if (attackerName === 'Player') {
        if (stateRef.current.gameMode === 'tdm') {
          setScoreState(prev => {
            const nextScore = { ...prev, local: prev.local + 1 };
            return nextScore;
          });
        }
        addLog(`You killed ${bot.name}`, true);
      } else if (attackerName === 'Guest') {
        if (stateRef.current.gameMode === 'tdm') {
          setScoreState(prev => {
            const nextScore = { ...prev, remote: prev.remote + 1 };
            return nextScore;
          });
        }
        addLog(`Opponent killed ${bot.name}`, false);
      } else {
        addLog(`${attackerName} killed ${bot.name}`, false);
        const killerBot = stateRef.current.bots.find(b => b.name === attackerName);
        if (killerBot) {
          killerBot.score += 1;
        }
      }

      if (connRef.current && stateRef.current.connected) {
        connRef.current.send({
          type: 'bot_death',
          botId: bot.id,
          attacker: attackerName,
          scores: { local: stateRef.current.score.local, remote: stateRef.current.score.remote }
        });
      }

      // Respawn 3 seconds later
      setTimeout(() => {
        bot.hp = 100;
        bot.isDead = false;
        bot.group.visible = true;
        bot.pos.set(bot.cabinCx, 0.9, bot.cabinCz);
        bot.group.position.copy(bot.pos);
        bot.box.setFromObject(bot.group);
        bot.exitedCabin = false;
        bot.mode = Math.random() < 0.5 ? 'A' : 'B';
        bot.shootCooldownTimer = 1.5 + Math.random() * 0.5;

        if (connRef.current && stateRef.current.connected) {
          connRef.current.send({
            type: 'bot_respawn',
            botId: bot.id,
            x: bot.pos.x,
            y: bot.pos.y,
            z: bot.pos.z
          });
        }
      }, 3000);
    }
  };

  const dealDamageToBotRef = useRef(dealDamageToBot);
  dealDamageToBotRef.current = dealDamageToBot;

  // Handle incoming data channel payloads
  const wireConn = useCallback((conn) => {
    connRef.current = conn;
    conn.on('open', () => {
      setConnectedState(true);
      setLobbyTimer(30); // reset lobby countdown to 30 seconds when guest joins
      
      const st = stateRef.current;
      const isHostInstance = peerRef.current && peerRef.current.id && peerRef.current.id.startsWith(ROOM_PREFIX);
      
      if (isHostInstance) {
        // Send initial setup parameters to Guest
        conn.send({
          type: 'init',
          hostTeam: teamRef.current,
          gameMode: gameModeRef.current
        });
        
        // Deactivate Bot 7 (assigned to House 8) since guest spawned there
        const bot7 = st.bots.find(b => b.id === 'bot_7');
        if (bot7) {
          bot7.isDead = true;
          bot7.group.visible = false;
        }
      }
    });

    conn.on('data', (data) => {
      const st = stateRef.current;
      if (data.type === 'init') {
        setTeam(data.hostTeam === 'Blue' ? 'Red' : 'Blue');
        setGameMode(data.gameMode);
        st.gameMode = data.gameMode;
        
        // Guest spawns at House 8
        st.pos.set(0, 0.9, 35);
        st.oppPos.set(-35, 0.9, -35);
      }
      else if (data.type === 'sync') {
        st.oppTargetPos.set(data.x, data.y, data.z);
        st.oppYaw = data.yaw;
        st.oppPitch = data.pitch;
        st.oppHp = data.hp;
        
        if (st.oppActiveWeaponId !== data.weaponId) {
          st.oppActiveWeaponId = data.weaponId;
          // Re-create gun viewport model for client opponent representation
          if (st.oppMesh && st.oppGunMesh) {
            st.oppMesh.remove(st.oppGunMesh);
            const nextGun = createWeaponModel(data.weaponId, st.team === 'Blue' ? 0xff3d00 : 0x00e5ff);
            nextGun.position.set(0.25, 0.3, -0.35);
            st.oppMesh.add(nextGun);
            st.oppGunMesh = nextGun;
          }
        }
      }
      else if (data.type === 'shoot') {
        playShootSound(data.weaponId || 'ar', false);
        if (st.scene) {
          const origin = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
          const dir = new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z);
          
          if (st.oppGunMesh) {
            const opFlash = new THREE.PointLight(0xff7700, 3, 4);
            opFlash.position.copy(st.oppGunMesh.position);
            st.scene.add(opFlash);
            setTimeout(() => { st.scene.remove(opFlash); }, 50);
          }

          const tracerCol = st.team === 'Blue' ? 0xff3300 : 0x00e5ff;
          const material = new THREE.LineBasicMaterial({ color: tracerCol, transparent: true, opacity: 0.8 });
          const points = [origin, origin.clone().addScaledVector(dir, 150)];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const tracer = new THREE.Line(geometry, material);
          st.scene.add(tracer);
          st.bulletsList.push({ mesh: tracer, age: 0, maxAge: 0.08 });
        }
      }
      else if (data.type === 'grenade') {
        playExplosionSound();
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
        addLog(`You eliminated Opponent`, true);
        if (st.gameMode === 'tdm') {
          setScoreState(prev => {
            const nextScore = { ...prev, local: prev.local + 1 };
            return nextScore;
          });
        }
      }
      else if (data.type === 'rematch') {
        setScoreState({ local: 0, remote: 0 });
        resetStats();
      }
      else if (data.type === 'start_match') {
        setMatchStarted(true);
        setScoreState({ local: 0, remote: 0 });
        resetStats();
        setMatchTimer(300);
        setShowMatchGoBanner(true);
        setTimeout(() => setShowMatchGoBanner(false), 3000);
      }
      else if (data.type === 'bot_hit') {
        const bot = st.bots.find(b => b.id === data.botId);
        if (bot) {
          dealDamageToBotRef.current(bot, data.damage, 'Guest');
        }
      }
      else if (data.type === 'bot_hit_effect') {
        const bot = st.bots.find(b => b.id === data.botId);
        if (bot) {
          bot.hp = data.hp;
          bot.flashTimer = 0.2;
          bot.torsoMesh.material.color.setHex(0xffff00);
        }
      }
      else if (data.type === 'bot_death') {
        const bot = st.bots.find(b => b.id === data.botId);
        if (bot) {
          bot.isDead = true;
          bot.group.visible = false;
          addLog(`${data.attacker} killed ${bot.name}`, false);
        }
        setScoreState(data.scores);
      }
      else if (data.type === 'bot_respawn') {
        const bot = st.bots.find(b => b.id === data.botId);
        if (bot) {
          bot.hp = 100;
          bot.isDead = false;
          bot.group.visible = true;
          bot.pos.set(data.x, data.y, data.z);
          bot.group.position.copy(bot.pos);
          bot.box.setFromObject(bot.group);
        }
      }
      else if (data.type === 'bots_sync') {
        data.bots.forEach((bData) => {
          const bot = st.bots.find(b => b.id === bData.id);
          if (bot) {
            bot.targetPos.set(bData.x, bData.y, bData.z);
            bot.targetYaw = bData.yaw;
            bot.targetPitch = bData.pitch;
            bot.hp = bData.hp;
            bot.isDead = bData.isDead;
            bot.group.visible = !bData.isDead;
          }
        });
      }
      else if (data.type === 'bot_shoot') {
        playShootSound(data.weaponId || 'ar', false);
        if (st.scene) {
          const origin = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
          const hitPt = new THREE.Vector3(data.hitPt.x, data.hitPt.y, data.hitPt.z);
          
          const material = new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
          const points = [origin, hitPt];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const tracer = new THREE.Line(geometry, material);
          st.scene.add(tracer);
          st.bulletsList.push({ mesh: tracer, age: 0, maxAge: 0.08 });

          const flash = new THREE.PointLight(0xff7700, 3, 4);
          flash.position.copy(origin);
          st.scene.add(flash);
          setTimeout(() => st.scene.remove(flash), 50);
        }
      }
      
      // Bomb Scenario WebRTC synchronization
      else if (data.type === 'bomb_planted') {
        setBombPlantedState(true);
        setBombSite(data.site);
        st.bombPlantedPos = new THREE.Vector3(data.x, data.y, data.z);
        addLog(`Bomb planted at Site ${data.site}!`, false);

        // Spawn planted bomb model locally
        if (st.scene) {
          const bGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 16);
          const bMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          const bMesh = new THREE.Mesh(bGeom, bMat);
          bMesh.position.copy(st.bombPlantedPos);
          st.scene.add(bMesh);
          st.bombMesh = bMesh;
        }
      }
      else if (data.type === 'bomb_defused') {
        setBombPlantedState(false);
        addLog(`Bomb has been defused! CT wins.`, false);
        setWinnerState('Counter-Terrorists (Blue)');
        setShowGameOverState(true);
        document.exitPointerLock?.();
      }
      else if (data.type === 'bomb_exploded') {
        setBombPlantedState(false);
        addLog(`Bomb detonated! T wins.`, false);
        setWinnerState('Terrorists (Red)');
        setShowGameOverState(true);
        document.exitPointerLock?.();
        
        // Spawn local explosion FX
        if (st.bombPlantedPos) {
          st.cameraShake = 0.9;
          playExplosionSound();
        }
      }

      // Zombies wave synchronization
      else if (data.type === 'zombie_spawn') {
        if (!st.scene) return;
        const zGroup = new THREE.Group();
        zGroup.position.set(data.x, data.y, data.z);
        
        const scale = data.zType === 'tank' ? 1.8 : (data.zType === 'boss' ? 2.5 : 1.0);
        const zColor = data.zType === 'runner' ? 0xff3300 : (data.zType === 'tank' ? 0x6d28d9 : (data.zType === 'exploder' ? 0xeab308 : (data.zType === 'boss' ? 0xca8a04 : 0x15803d)));
        
        const torso = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24 * scale, 0.24 * scale, 1.3 * scale, 12),
          new THREE.MeshStandardMaterial({ color: zColor, roughness: 0.7 })
        );
        torso.position.y = 0.65 * scale;
        zGroup.add(torso);

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.18 * scale, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
        );
        head.position.y = 1.45 * scale;
        zGroup.add(head);

        st.scene.add(zGroup);
        
        st.zombies.push({
          id: data.zId,
          type: data.zType,
          hp: data.hp,
          maxHp: data.maxHp,
          group: zGroup,
          torsoMesh: torso,
          headMesh: head,
          pos: new THREE.Vector3(data.x, data.y, data.z),
          targetPos: new THREE.Vector3(data.x, data.y, data.z),
          scale: scale,
          flashTimer: 0
        });
        setZombiesCount(st.zombies.length);
      }
      else if (data.type === 'zombies_sync') {
        data.zombies.forEach((zData) => {
          const zombie = st.zombies.find(z => z.id === zData.id);
          if (zombie) {
            zombie.targetPos.set(zData.x, zData.y, zData.z);
            zombie.hp = zData.hp;
            if (zData.type === 'boss') {
              setBossHp(zData.hp);
            }
          }
        });
      }
      else if (data.type === 'zombie_hit_effect') {
        const zombie = st.zombies.find(z => z.id === data.zId);
        if (zombie) {
          zombie.hp = data.hp;
          zombie.flashTimer = 0.15;
          zombie.torsoMesh.material.color.setHex(0xffff00);
        }
      }
      else if (data.type === 'zombie_death') {
        const zombie = st.zombies.find(z => z.id === data.zId);
        if (zombie) {
          if (st.scene) {
            st.scene.remove(zombie.group);
          }
          st.zombies = st.zombies.filter(z => z.id !== data.zId);
          setZombiesCount(st.zombies.length);
          if (zombie.type === 'boss') {
            setBossHp(0);
          }
        }
      }
      else if (data.type === 'zombie_hit') {
        // Client damaged a zombie, process on Host
        const zombie = st.zombies.find(z => z.id === data.zId);
        if (zombie) {
          zombie.hp = Math.max(0, zombie.hp - data.damage);
          if (zombie.hp <= 0) {
            // zombie dies
            if (st.scene) st.scene.remove(zombie.group);
            st.zombies = st.zombies.filter(z => z.id !== data.zId);
            setZombiesCount(st.zombies.length);
            
            if (zombie.type === 'boss') {
              setBossHp(0);
              addLog(`Giant Boss Defeated! Wave complete.`, true);
            }
            
            conn.send({ type: 'zombie_death', zId: zombie.id });
          } else {
            conn.send({ type: 'zombie_hit_effect', zId: zombie.id, hp: zombie.hp });
          }
        }
      }
      else if (data.type === 'wave_start') {
        setWaveNumState(data.wave);
        setWaveBanner(`WAVE ${data.wave}`);
        setTimeout(() => setWaveBanner(''), 4000);
      }
      else if (data.type === 'boss_projectile') {
        if (st.scene) {
          const pMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x00e5ff })
          );
          pMesh.position.set(data.x, data.y, data.z);
          st.scene.add(pMesh);
          st.bossProjectiles.push({
            mesh: pMesh,
            vel: new THREE.Vector3(data.vx, data.vy, data.vz),
            age: 0
          });
        }
      }
    });

    conn.on('close', () => {
      setOppDisconnected(true);
      setConnectedState(false);
      document.exitPointerLock?.();
    });
  }, [handleHit, resetStats]);

  // Peer room hosting
  const createRoom = () => {
    cleanupPeer();
    const code = genCode();
    setRoomCode(code);
    setPhase('playing');
    setPeerErr('');
    setMatchStarted(false);
    setLobbyTimer(60);

    const st = stateRef.current;
    st.pos.set(-35, 0.9, -35); // House 1
    st.oppPos.set(0, 0.9, 35); // House 8
    st.oppTargetPos.copy(st.oppPos);
    st.yaw = Math.PI / 4;
    st.pitch = 0;

    const peer = new Peer(ROOM_PREFIX + code);
    peerRef.current = peer;
    peer.on('error', (err) => {
      setPeerErr(err.type === 'unavailable-id' ? 'Room Code is active — try another' : `PeerJS Error: ${err.type}`);
    });

    peer.on('connection', (conn) => {
      wireConn(conn);
      conn.on('open', () => {
        conn.send({
          type: 'init',
          hostTeam: teamRef.current,
          gameMode: gameModeRef.current
        });
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
    setMatchStarted(false);
    setLobbyTimer(30);

    const peer = new Peer();
    peerRef.current = peer;
    peer.on('open', () => {
      const conn = peer.connect(ROOM_PREFIX + code);
      wireConn(conn);
      setRoomCode(code);
      setPhase('playing');
      
      const st = stateRef.current;
      st.pos.set(0, 0.9, 35); // House 8
      st.oppPos.set(-35, 0.9, -35); // House 1
      st.oppTargetPos.copy(st.oppPos);
      st.yaw = -Math.PI / 1.5;
      st.pitch = 0;
    });

    peer.on('error', (err) => {
      setPeerErr(err.type === 'peer-unavailable' ? 'Room ID not found' : `PeerJS Error: ${err.type}`);
      setPhase('menu');
    });
  };

  const cleanupPeer = useCallback(() => {
    if (connRef.current) {
      try { connRef.current.close(); } catch(e){}
      connRef.current = null;
    }
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch(e){}
      peerRef.current = null;
    }
    setConnectedState(false);
    setPeerErr('');
    setOppDisconnected(false);
    setMatchStarted(false);
    stopAmbientWind();
  }, []);

  const handleRematch = () => {
    if (connRef.current && stateRef.current.connected) {
      connRef.current.send({ type: 'rematch' });
    }
    setScoreState({ local: 0, remote: 0 });
    resetStats();
  };

  const startMatch = () => {
    setMatchStarted(true);
    setScoreState({ local: 0, remote: 0 });
    resetStats();
    setMatchTimer(300);
    setShowMatchGoBanner(true);
    setTimeout(() => setShowMatchGoBanner(false), 3000);

    if (connRef.current && stateRef.current.connected) {
      connRef.current.send({ type: 'start_match' });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setJoinInput(roomParam.toUpperCase());
      setPhase('join_input');
    }
    return () => cleanupPeer();
  }, [cleanupPeer]);

  // Lobby Practice Countdown
  useEffect(() => {
    if (phase !== 'playing' || matchStarted) return;

    const interval = setInterval(() => {
      setLobbyTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isHost) startMatch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, matchStarted, isHost]);

  // Match Round Timer Countdown
  useEffect(() => {
    if (!matchStarted || phase !== 'playing') return;

    const interval = setInterval(() => {
      setMatchTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowGameOverState(true);
          
          let bestAttacker = 'You';
          let bestScoreVal = stateRef.current.score.local;

          if (connected && stateRef.current.score.remote > bestScoreVal) {
            bestAttacker = 'Opponent';
            bestScoreVal = stateRef.current.score.remote;
          }

          stateRef.current.bots.forEach(bot => {
            if (connected && bot.id === 'bot_7') return;
            if (bot.score > bestScoreVal) {
              bestAttacker = bot.name;
              bestScoreVal = bot.score;
            }
          });

          setWinnerState(bestAttacker);
          document.exitPointerLock?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [matchStarted, phase, connected]);

  const getLeaderboard = () => {
    const list = [];
    list.push({ name: 'You', score: score.local, isLocal: true });
    if (connected && gameMode !== 'zombies') {
      list.push({ name: 'Opponent', score: score.remote, isRemote: true });
    }
    stateRef.current.bots.forEach(bot => {
      if (connected && bot.id === 'bot_7') return;
      list.push({ name: bot.name, score: bot.score });
    });
    list.sort((a, b) => b.score - a.score);
    return list;
  };

  // Main 3D Canvas Game Engine Implementation
  useEffect(() => {
    if (phase !== 'playing' || !containerRef.current) return;

    const st = stateRef.current;
    st.gameMode = gameModeRef.current;
    
    // Core game parameters
    const gravity = 28.0;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. THREE SCENE & CAMERA
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050409);
    scene.fog = new THREE.FogExp2(0x050409, 0.02);
    st.scene = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.05, 500);
    st.camera = camera;

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

    // Start ambient synthesised wind
    startAmbientWind();

    // 2. LIGHTING
    const ambientLight = new THREE.AmbientLight(0x0f0c22, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xff00b7, 1.25);
    dirLight.position.set(15, 35, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x00e5ff, 0.9);
    backLight.position.set(-15, 20, -15);
    scene.add(backLight);

    // Floor
    const floorGeom = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x07060d,
      roughness: 0.9,
      metalness: 0.15
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(MAP_SIZE, 35, 0x00e5ff, 0x1f0c3d);
    gridHelper.position.y = 0.005;
    scene.add(gridHelper);

    // 3. BUILD THE MODULAR ENVIRONMENT & SPAWNS
    st.boundingBoxes = [];
    st.dummies = [];
    st.bots = [];

    // Procedural scene elements building using modular FpsMap functions
    buildEnvironment(scene, st.boundingBoxes, MAP_SIZE);
    const spinningRacks = buildCabins(scene, st.boundingBoxes, st.dummies, CABIN_CONFIGS);

    // Dynamic AI bots generation
    const botColors = [0xff6600, 0x9d00ff, 0x00ff55, 0x00ffff, 0xff00d0, 0xffea00, 0xff005d];
    CABIN_CONFIGS.forEach((cabin, idx) => {
      if (idx === 0) return; // Cabin 1 is for host
      
      const teamColor = botColors[idx - 1];
      const botGroup = new THREE.Group();
      
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 1.4, 12),
        new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.5, metalness: 0.25 })
      );
      torso.position.y = 0.7;
      torso.castShadow = true;
      botGroup.add(torso);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 })
      );
      head.position.y = 1.5;
      botGroup.add(head);

      const gun = createWeaponModel('ar', teamColor);
      gun.position.set(0.25, 0.8, -0.3);
      botGroup.add(gun);

      scene.add(botGroup);

      const bPos = new THREE.Vector3(cabin.cx, 0.9, cabin.cz);
      botGroup.position.copy(bPos);
      const botBox = new THREE.Box3().setFromObject(botGroup);

      st.bots.push({
        id: `bot_${cabin.id}`,
        name: `Bot ${cabin.id - 1}`,
        cabinCx: cabin.cx,
        cabinCz: cabin.cz,
        door: cabin.door,
        color: teamColor,
        pos: bPos,
        targetPos: bPos.clone(),
        targetYaw: 0,
        targetPitch: 0,
        yaw: cabin.door === 'E' ? Math.PI/2 : -Math.PI/2,
        pitch: 0,
        hp: 100,
        score: 0,
        mode: Math.random() < 0.5 ? 'A' : 'B',
        shootCooldownTimer: 1.5 + Math.random() * 0.5,
        group: botGroup,
        torsoMesh: torso,
        headMesh: head,
        gunMesh: gun,
        box: botBox,
        flashTimer: 0,
        isDead: false,
        exitedCabin: false,
        wanderTarget: null,
        practiceTarget: null
      });
    });

    // 4. WEAPON VIEWPORT MODEL
    const weaponGroup = new THREE.Group();
    weaponGroup.position.set(0.24, -0.22, -0.42);
    camera.add(weaponGroup);
    st.weaponGroup = weaponGroup;

    // Load active starting model
    let activeWeaponMesh = createWeaponModel(st.activeWeaponId, st.team === 'Blue' ? 0x00e5ff : 0xff3b30);
    weaponGroup.add(activeWeaponMesh);

    const flashLight = new THREE.PointLight(0xff7700, 0, 5);
    flashLight.position.set(0, 0, -0.36);
    weaponGroup.add(flashLight);

    // 5. OPPONENT GUEST REPRESENTATION
    const oGeom = new THREE.CylinderGeometry(0.35, 0.35, 1.8, 16);
    const oMat = new THREE.MeshStandardMaterial({ color: 0xff3d00, metalness: 0.6, roughness: 0.4 });
    const oppMesh = new THREE.Mesh(oGeom, oMat);
    oppMesh.position.copy(st.oppPos);
    oppMesh.castShadow = true;
    scene.add(oppMesh);
    st.oppMesh = oppMesh;
    oppMesh.visible = false;

    const ohGeom = new THREE.SphereGeometry(0.22, 16, 16);
    const oppHead = new THREE.Mesh(ohGeom, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    oppHead.position.y = 1.05;
    oppMesh.add(oppHead);

    const oppGun = createWeaponModel('ar', 0xff3d00);
    oppGun.position.set(0.25, 0.3, -0.35);
    oppMesh.add(oppGun);
    st.oppGunMesh = oppGun;

    // 6. KEYBOARD / MOUSE EVENT BINDINGS
    const onKeyDown = (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') st.keys.w = true;
      if (code === 'KeyS' || code === 'ArrowDown') st.keys.s = true;
      if (code === 'KeyA' || code === 'ArrowLeft') st.keys.a = true;
      if (code === 'KeyD' || code === 'ArrowRight') st.keys.d = true;
      if (code === 'Space') st.keys.space = true;
      if (code === 'KeyF') st.keys.f = true;
      if (code === 'KeyR') triggerReload();
      if (code === 'KeyG') triggerGrenade();

      // CS-style weapon quick switching 1-5 keys
      if (code === 'Digit1') switchWeapon('ar');
      if (code === 'Digit2') switchWeapon('smg');
      if (code === 'Digit3') switchWeapon('shotgun');
      if (code === 'Digit4') switchWeapon('sniper');
      if (code === 'Digit5') switchWeapon('pistol');
    };

    const onKeyUp = (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') st.keys.w = false;
      if (code === 'KeyS' || code === 'ArrowDown') st.keys.s = false;
      if (code === 'KeyA' || code === 'ArrowLeft') st.keys.a = false;
      if (code === 'KeyD' || code === 'ArrowRight') st.keys.d = false;
      if (code === 'Space') st.keys.space = false;
      if (code === 'KeyF') st.keys.f = false;
    };

    const onMouseMove = (e) => {
      if (document.pointerLockElement !== containerRef.current) return;
      // Reduce mouse sensitivity when scoped with sniper
      const scaleSens = st.isScoped ? 0.0007 : 0.0022;
      st.yaw -= e.movementX * scaleSens;
      st.pitch -= e.movementY * scaleSens;
      st.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, st.pitch));
    };

    const onLockChange = () => {
      setIsLocked(document.pointerLockElement === containerRef.current);
    };

    const handleMouseClick = (e) => {
      if (document.pointerLockElement !== containerRef.current) {
        containerRef.current.requestPointerLock();
        return;
      }
      if (e.button === 0) {
        triggerFire();
      } else if (e.button === 2) {
        // Toggle sniper scoped zoom on Right Click
        if (st.activeWeaponId === 'sniper') {
          st.isScoped = !st.isScoped;
          setIsScoped(st.isScoped);
          // Animate camera FOV zoom
          camera.fov = st.isScoped ? 25 : 75;
          camera.updateProjectionMatrix();
        } else {
          triggerGrenade();
        }
      }
    };

    const blockContextMenu = (e) => {
      if (document.pointerLockElement === containerRef.current) e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onLockChange);
    containerRef.current.addEventListener('mousedown', handleMouseClick);
    window.addEventListener('contextmenu', blockContextMenu);

    // Switch active weapon
    const switchWeapon = (wId) => {
      if (st.isDead || st.reloading || st.activeWeaponId === wId) return;
      st.activeWeaponId = wId;
      setActiveWeaponId(wId);
      
      // Force scoped off on switch
      st.isScoped = false;
      setIsScoped(false);
      camera.fov = 75;
      camera.updateProjectionMatrix();

      // Update clip sizes
      const inv = st.weaponsInventory[wId];
      setWeaponClip(inv.clip);
      setWeaponReserve(inv.reserve);

      // Recreate mesh viewport gun representation
      if (st.weaponGroup && activeWeaponMesh) {
        st.weaponGroup.remove(activeWeaponMesh);
        const teamCol = st.team === 'Blue' ? 0x00e5ff : 0xff3b30;
        const nextMesh = createWeaponModel(wId, teamCol);
        st.weaponGroup.add(nextMesh);
        activeWeaponMesh = nextMesh;
      }

      // Play click mechanical change sound
      playEmptyClickSound();
    };

    // Trigger reload cycle
    const triggerReload = () => {
      const curW = WEAPONS[st.activeWeaponId];
      const inv = st.weaponsInventory[st.activeWeaponId];
      if (st.reloading || inv.clip === curW.ammoMax || inv.reserve <= 0 || st.isDead || st.showGameOver) return;
      
      setReloadingState(true);
      playReloadSound(st.activeWeaponId);
      
      let reloadAge = 0;
      const rAnim = setInterval(() => {
        reloadAge += 0.05;
        // Gun rotating/reloading visual animation
        weaponGroup.rotation.z = Math.sin((reloadAge / 1.5) * Math.PI * 2) * 1.5;
        weaponGroup.position.y = -0.22 - Math.sin((reloadAge / 1.5) * Math.PI) * 0.15;
        
        if (reloadAge >= 1.5) {
          clearInterval(rAnim);
          weaponGroup.rotation.z = 0;
          weaponGroup.position.y = -0.22;

          const needed = curW.ammoMax - inv.clip;
          const fill = Math.min(inv.reserve, needed);
          inv.clip += fill;
          inv.reserve -= fill;
          
          setWeaponClip(inv.clip);
          setWeaponReserve(inv.reserve);
          setReloadingState(false);
        }
      }, 50);
    };

    // Text damage indicators
    const createDamagePopup = (text, pos, color = '#ffaa00') => {
      const popupCanvas = document.createElement('canvas');
      popupCanvas.width = 128;
      popupCanvas.height = 64;
      const pCtx = popupCanvas.getContext('2d');
      pCtx.fillStyle = color;
      pCtx.font = 'bold 36px monospace';
      pCtx.textAlign = 'center';
      pCtx.fillText(text, 64, 32);

      const texture = new THREE.CanvasTexture(popupCanvas);
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.4, (Math.random() - 0.5) * 0.4));
      sprite.scale.set(1.5, 0.75, 1);
      scene.add(sprite);

      return { sprite, age: 0, maxAge: 0.8, vel: new THREE.Vector3(0, 1.25, 0) };
    };

    // Trigger local weapon fire
    const triggerFire = () => {
      const now = clock.getElapsedTime();
      const curW = WEAPONS[st.activeWeaponId];
      const inv = st.weaponsInventory[st.activeWeaponId];

      if (st.isDead || st.reloading || inv.clip <= 0 || st.showGameOver) {
        if (inv.clip <= 0 && !st.reloading) playEmptyClickSound();
        return;
      }
      if (now - st.lastShootTime < curW.fireRate) return;

      st.lastShootTime = now;
      inv.clip = Math.max(0, inv.clip - 1);
      setWeaponClip(inv.clip);

      playShootSound(st.activeWeaponId, true);

      const shootOrigin = st.pos.clone().add(new THREE.Vector3(0, 0.7, 0));
      const lookDir = new THREE.Vector3(
        Math.sin(st.yaw) * Math.cos(st.pitch),
        Math.sin(st.pitch),
        Math.cos(st.yaw) * Math.cos(st.pitch)
      ).normalize();

      flashLight.intensity = 4;
      setTimeout(() => { flashLight.intensity = 0; }, 40);

      spawnFlashShellParticles(shootOrigin);

      // Network send shoot event
      if (connRef.current && st.connected) {
        connRef.current.send({
          type: 'shoot',
          weaponId: st.activeWeaponId,
          origin: { x: shootOrigin.x, y: shootOrigin.y, z: shootOrigin.z },
          direction: { x: lookDir.x, y: lookDir.y, z: lookDir.z }
        });
      }

      // Tracer line
      const tracerCol = st.team === 'Blue' ? 0x00e5ff : 0xff3b30;
      const tMat = new THREE.LineBasicMaterial({ color: tracerCol, transparent: true, opacity: 0.85 });
      const tPts = [shootOrigin, shootOrigin.clone().addScaledVector(lookDir, curW.range)];
      const tGeom = new THREE.BufferGeometry().setFromPoints(tPts);
      const tracer = new THREE.Line(tGeom, tMat);
      scene.add(tracer);
      st.bulletsList.push({ mesh: tracer, age: 0, maxAge: 0.06 });

      st.pitch += curW.recoil;
      st.yaw += (Math.random() - 0.5) * curW.recoil * 0.5;
      st.cameraShake = curW.recoil * 1.5;

      // Handle Raycasting hits (against wall walls, dummies, bots, remote client, and zombies)
      const raycastResults = castPlayerRaycast(st, shootOrigin, lookDir, curW);
      
      // Let's also check Zombies hitscan
      let zombieHit = null;
      let zombieHitDist = curW.range;
      let zombieHeadshot = false;

      st.zombies.forEach((zombie) => {
        const zBox = new THREE.Box3(
          zombie.pos.clone().sub(new THREE.Vector3(0.35 * zombie.scale, 0.9 * zombie.scale, 0.35 * zombie.scale)),
          zombie.pos.clone().add(new THREE.Vector3(0.35 * zombie.scale, 0.9 * zombie.scale, 0.35 * zombie.scale))
        );
        const hitPt = new THREE.Vector3();
        const ray = new THREE.Ray(shootOrigin, lookDir);
        if (ray.intersectBox(zBox, hitPt)) {
          const d = shootOrigin.distanceTo(hitPt);
          if (d < zombieHitDist) {
            zombieHitDist = d;
            zombieHit = zombie;
            zombieHeadshot = (hitPt.y - zombie.group.position.y > 1.05 * zombie.scale);
          }
        }
      });

      // Process closest target priority
      let finalHit = raycastResults;
      if (zombieHit && zombieHitDist < raycastResults.closestDist) {
        finalHit = {
          closestDist: zombieHitDist,
          closestHit: shootOrigin.clone().addScaledVector(lookDir, zombieHitDist),
          hitType: 'zombie',
          hitObject: zombieHit,
          headshot: zombieHeadshot
        };
      }

      const hitType = finalHit.hitType;
      const closestHit = finalHit.closestHit;
      const hitObject = finalHit.hitObject;
      const isHead = finalHit.headshot;

      if (closestHit) {
        const sparkColor = hitType === 'opponent' ? 0xff0055 :
                           hitType === 'zombie' ? 0x00ff55 :
                           hitType === 'bot' ? 0xff3300 :
                           hitType === 'dummy' ? 0xffff00 : 0xaaaaaa;
        spawnImpactSparks(closestHit, sparkColor, hitType === 'wall' ? 4 : 12);

        // Apply weapon damage math & headshot multiplier
        let baseDmg = curW.damage;
        if (isHead) baseDmg = Math.floor(baseDmg * 2.2);

        if (hitType === 'dummy') {
          hitObject.flashTimer = 0.2;
          hitObject.torsoMesh.material.color.setHex(0xffff00);
          hitObject.headMesh.material.color.setHex(0xffff00);

          const pop = createDamagePopup(`-${baseDmg}`, closestHit, '#ffff00');
          st.damagePopups.push(pop);
          playHitmarkerSound(isHead);
        }
        else if (hitType === 'bot') {
          hitObject.flashTimer = 0.2;
          hitObject.torsoMesh.material.color.setHex(0xffff00);

          const pop = createDamagePopup(`-${baseDmg}`, closestHit, isHead ? '#ffff00' : '#ff3300');
          st.damagePopups.push(pop);
          playHitmarkerSound(isHead);

          if (isHost) {
            dealDamageToBot(hitObject, baseDmg, 'Player');
          } else {
            connRef.current.send({ type: 'bot_hit', botId: hitObject.id, damage: baseDmg });
          }
        }
        else if (hitType === 'opponent') {
          playHitmarkerSound(isHead);
          if (connRef.current && st.connected) {
            connRef.current.send({ type: 'hit', damage: baseDmg });
          }
        }
        else if (hitType === 'zombie') {
          playHitmarkerSound(isHead);
          const pop = createDamagePopup(`-${baseDmg}`, closestHit, isHead ? '#facc15' : '#4ade80');
          st.damagePopups.push(pop);

          if (isHost) {
            hitObject.hp = Math.max(0, hitObject.hp - baseDmg);
            if (hitObject.type === 'boss') setBossHp(hitObject.hp);
            
            if (hitObject.hp <= 0) {
              scene.remove(hitObject.group);
              st.zombies = st.zombies.filter(z => z.id !== hitObject.id);
              setZombiesCount(st.zombies.length);
              addLog(`Zombie eliminated!`, true);
              
              if (hitObject.type === 'boss') {
                setBossHp(0);
                addLog(`Giant Boss defeated! Wave complete.`, true);
              }
              if (connRef.current && st.connected) {
                connRef.current.send({ type: 'zombie_death', zId: hitObject.id });
              }
            } else {
              hitObject.flashTimer = 0.15;
              hitObject.torsoMesh.material.color.setHex(0xffff00);
              if (connRef.current && st.connected) {
                connRef.current.send({ type: 'zombie_hit_effect', zId: hitObject.id, hp: hitObject.hp });
              }
            }
          } else {
            // Client forwards zombie damage calculation to host
            connRef.current.send({ type: 'zombie_hit', zId: hitObject.id, damage: baseDmg });
          }
        }
      }
    };

    const triggerGrenade = () => {
      if (st.isDead || st.grenades <= 0 || st.showGameOver) return;
      setGrenadesState(prev => Math.max(0, prev - 1));

      const throwOrigin = st.pos.clone().add(new THREE.Vector3(0, 0.7, 0));
      const lookDir = new THREE.Vector3(
        Math.sin(st.yaw) * Math.cos(st.pitch),
        Math.sin(st.pitch),
        Math.cos(st.yaw) * Math.cos(st.pitch)
      ).normalize();

      const velocity = lookDir.clone().multiplyScalar(15).add(new THREE.Vector3(0, 3.0, 0));

      if (connRef.current && st.connected) {
        connRef.current.send({
          type: 'grenade',
          origin: { x: throwOrigin.x, y: throwOrigin.y, z: throwOrigin.z },
          velocity: { x: velocity.x, y: velocity.y, z: velocity.z }
        });
      }

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

    // Bot attack firing loop on Host
    const botShoot = (bot, targetPos, targetType) => {
      const gunPos = bot.pos.clone().add(new THREE.Vector3(0, 0.7, 0));
      const spread = 0.15;
      const shootDir = targetPos.clone().sub(gunPos).normalize();
      
      const angleX = (Math.random() - 0.5) * spread;
      const angleY = (Math.random() - 0.5) * spread;
      shootDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleX);
      shootDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), angleY);

      playShootSound('ar', false);

      const flash = new THREE.PointLight(0xff7700, 3, 4);
      flash.position.copy(gunPos).add(shootDir.clone().multiplyScalar(0.5));
      scene.add(flash);
      setTimeout(() => { scene.remove(flash); }, 50);

      const ray = new THREE.Ray(gunPos, shootDir);
      let closestD = 99999;
      let hitPt = gunPos.clone().addScaledVector(shootDir, 100);
      let hitT = 'none';
      let hitObj = null;

      st.boundingBoxes.forEach((box) => {
        const pt = new THREE.Vector3();
        if (ray.intersectBox(box, pt)) {
          const d = gunPos.distanceTo(pt);
          if (d < closestD) {
            closestD = d;
            hitPt.copy(pt);
            hitT = 'wall';
          }
        }
      });

      st.dummies.forEach((dummy) => {
        const pt = new THREE.Vector3();
        if (ray.intersectBox(dummy.box, pt)) {
          const d = gunPos.distanceTo(pt);
          if (d < closestD) {
            closestD = d;
            hitPt.copy(pt);
            hitT = 'dummy';
            hitObj = dummy;
          }
        }
      });

      st.bots.forEach((otherBot) => {
        if (otherBot.id === bot.id || otherBot.isDead) return;
        const pt = new THREE.Vector3();
        if (ray.intersectBox(otherBot.box, pt)) {
          const d = gunPos.distanceTo(pt);
          if (d < closestD) {
            closestD = d;
            hitPt.copy(pt);
            hitT = 'bot';
            hitObj = otherBot;
          }
        }
      });

      // Check local player
      const hostAABB = new THREE.Box3(
        st.pos.clone().sub(new THREE.Vector3(0.35, 0.9, 0.35)),
        st.pos.clone().add(new THREE.Vector3(0.35, 0.9, 0.35))
      );
      const hostPt = new THREE.Vector3();
      if (ray.intersectBox(hostAABB, hostPt)) {
        const d = gunPos.distanceTo(hostPt);
        if (d < closestD) {
          closestD = d;
          hitPt.copy(hostPt);
          hitT = 'player';
        }
      }

      // Check remote guest player
      if (st.connected) {
        const guestAABB = new THREE.Box3(
          st.oppPos.clone().sub(new THREE.Vector3(0.4, 0.9, 0.4)),
          st.oppPos.clone().add(new THREE.Vector3(0.4, 0.9, 0.4))
        );
        const guestPt = new THREE.Vector3();
        if (ray.intersectBox(guestAABB, guestPt)) {
          const d = gunPos.distanceTo(guestPt);
          if (d < closestD) {
            closestD = d;
            hitPt.copy(guestPt);
            hitT = 'opponent';
          }
        }
      }

      // Tracer
      const material = new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
      const points = [gunPos, hitPt];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const tracer = new THREE.Line(geometry, material);
      scene.add(tracer);
      st.bulletsList.push({ mesh: tracer, age: 0, maxAge: 0.08 });

      const damage = Math.floor(5 + Math.random() * 6);

      if (hitT === 'player') {
        handleHitRef.current(damage);
      } else if (hitT === 'opponent') {
        if (connRef.current && st.connected) {
          connRef.current.send({ type: 'hit', damage: damage });
        }
      } else if (hitT === 'bot') {
        dealDamageToBot(hitObj, damage, bot.name);
      } else if (hitT === 'dummy') {
        hitObj.flashTimer = 0.2;
        hitObj.torsoMesh.material.color.setHex(0xffff00);
        hitObj.headMesh.material.color.setHex(0xffff00);
        spawnImpactSparks(hitPt, 0xffff00, 5);
        const pop = createDamagePopup(`-${damage}`, hitPt, '#ffff00');
        st.damagePopups.push(pop);
      } else if (hitT === 'wall') {
        spawnImpactSparks(hitPt, 0xaaaaaa, 3);
      }

      if (connRef.current && st.connected) {
        connRef.current.send({
          type: 'bot_shoot',
          botId: bot.id,
          weaponId: 'ar',
          origin: { x: gunPos.x, y: gunPos.y, z: gunPos.z },
          hitPt: { x: hitPt.x, y: hitPt.y, z: hitPt.z }
        });
      }
    };

    // Trigger explosion bomb detonator / grenade
    const triggerExplosion = (pos) => {
      st.cameraShake = 0.45;
      playExplosionSound();

      const eGeom = new THREE.SphereGeometry(0.1, 16, 16);
      const eMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.8 });
      const explosionRing = new THREE.Mesh(eGeom, eMat);
      explosionRing.position.copy(pos);
      scene.add(explosionRing);

      let ringAge = 0;
      const rAnim = setInterval(() => {
        ringAge += 0.05;
        explosionRing.scale.addScalar(0.75);
        explosionRing.material.opacity = 0.8 * (1 - ringAge / 0.55);
        if (ringAge >= 0.55) {
          clearInterval(rAnim);
          scene.remove(explosionRing);
        }
      }, 50);

      spawnImpactSparks(pos, 0xff5500, 24);

      const dToLocal = st.pos.distanceTo(pos);
      if (dToLocal < 5.8) {
        const damage = Math.floor((1 - dToLocal / 5.8) * 80);
        if (damage > 10) handleHitRef.current(damage);
      }

      // Check bots splash damage
      st.bots.forEach(bot => {
        if (bot.isDead) return;
        const d = bot.pos.distanceTo(pos);
        if (d < 5.8) {
          const dmg = Math.floor((1 - d / 5.8) * 80);
          if (dmg > 10) {
            dealDamageToBot(bot, dmg, 'Explosion');
          }
        }
      });

      // Check zombies splash damage
      st.zombies.forEach(z => {
        const d = z.pos.distanceTo(pos);
        if (d < 5.8) {
          const dmg = Math.floor((1 - d / 5.8) * 80);
          if (dmg > 10) {
            z.hp = Math.max(0, z.hp - dmg);
            if (z.type === 'boss') setBossHp(z.hp);
            if (z.hp <= 0) {
              scene.remove(z.group);
              st.zombies = st.zombies.filter(x => x.id !== z.id);
              setZombiesCount(st.zombies.length);
              if (z.type === 'boss') setBossHp(0);
              if (connRef.current && st.connected) {
                connRef.current.send({ type: 'zombie_death', zId: z.id });
              }
            } else {
              z.flashTimer = 0.15;
              z.torsoMesh.material.color.setHex(0xffff00);
              if (connRef.current && st.connected) {
                connRef.current.send({ type: 'zombie_hit_effect', zId: z.id, hp: z.hp });
              }
            }
          }
        }
      });
    };

    // Host authoritative spawning of Zombie Wave Mode entities
    const hostSpawnZombie = (zType) => {
      if (!isHost || !st.scene) return;
      const zId = `zombie_${Date.now()}_${Math.floor(Math.random()*1000)}`;
      
      // Select spawn location on boundary perimeter circle
      const angle = Math.random() * Math.PI * 2;
      const x = Math.sin(angle) * 48;
      const z = Math.cos(angle) * 48;
      const y = 0.9;

      const scale = zType === 'tank' ? 1.8 : (zType === 'boss' ? 2.5 : 1.0);
      const zColor = zType === 'runner' ? 0xff3300 : (zType === 'tank' ? 0x6d28d9 : (zType === 'exploder' ? 0xeab308 : (zType === 'boss' ? 0xca8a04 : 0x15803d)));
      
      const zGroup = new THREE.Group();
      zGroup.position.set(x, y, z);
      
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24 * scale, 0.24 * scale, 1.3 * scale, 12),
        new THREE.MeshStandardMaterial({ color: zColor, roughness: 0.7 })
      );
      torso.position.y = 0.65 * scale;
      torso.castShadow = true;
      zGroup.add(torso);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.18 * scale, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
      );
      head.position.y = 1.45 * scale;
      zGroup.add(head);

      scene.add(zGroup);

      // Define attributes based on zombie type classification
      let hp = 100;
      let speed = 2.2;
      let damage = 15;

      if (zType === 'runner') {
        hp = 50; speed = 4.8; damage = 8;
      } else if (zType === 'tank') {
        hp = 300; speed = 1.6; damage = 35;
      } else if (zType === 'exploder') {
        hp = 80; speed = 4.0; damage = 60;
      } else if (zType === 'boss') {
        hp = 1500; speed = 1.2; damage = 40;
        setBossHp(1500);
      }

      st.zombies.push({
        id: zId,
        type: zType,
        hp: hp,
        maxHp: hp,
        speed: speed,
        damage: damage,
        pos: new THREE.Vector3(x, y, z),
        targetPos: new THREE.Vector3(x, y, z),
        group: zGroup,
        torsoMesh: torso,
        headMesh: head,
        scale: scale,
        flashTimer: 0,
        meleeCooldown: 0,
        projectileTimer: 2.0
      });

      setZombiesCount(st.zombies.length);

      // Broadcast zombie spawn to Guest client
      if (connRef.current && st.connected) {
        connRef.current.send({
          type: 'zombie_spawn',
          zId,
          zType,
          x, y, z,
          hp, maxHp: hp
        });
      }
    };

    const hostStartNextZombieWave = () => {
      st.waveNum += 1;
      setWaveNumState(st.waveNum);
      
      const toSpawn = st.waveNum * 5 + 5;
      st.zombiesToSpawn = toSpawn;
      st.spawnCooldown = 0.5;

      // Broadcast wave start event
      if (connRef.current && st.connected) {
        connRef.current.send({ type: 'wave_start', wave: st.waveNum });
      }

      setWaveBanner(`WAVE ${st.waveNum}`);
      setTimeout(() => setWaveBanner(''), 4000);
    };

    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 7. ANIMATION ENGINE LOOP
    function animate() {
      st.animId = requestAnimationFrame(animate);
      const dt = Math.min(0.033, clock.getDelta());

      if (st.cameraShake > 0) st.cameraShake -= dt * 0.2;

      // Update particle systems
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i];
        p.age += dt;
        p.vel.y -= 9.8 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        if (p.age >= p.maxAge) {
          scene.remove(p.mesh);
          st.particles.splice(i, 1);
        }
      }

      // Update bullet tracers
      for (let i = st.bulletsList.length - 1; i >= 0; i--) {
        const b = st.bulletsList[i];
        b.age += dt;
        if (b.age >= b.maxAge) {
          scene.remove(b.mesh);
          st.bulletsList.splice(i, 1);
        }
      }

      // Update floating damage text overlays
      for (let i = st.damagePopups.length - 1; i >= 0; i--) {
        const pop = st.damagePopups[i];
        pop.age += dt;
        pop.sprite.position.addScaledVector(pop.vel, dt);
        pop.sprite.material.opacity = 1 - (pop.age / pop.maxAge);
        if (pop.age >= pop.maxAge) {
          scene.remove(pop.sprite);
          st.damagePopups.splice(i, 1);
        }
      }

      // Update thrown grenades physics
      for (let i = st.grenadesList.length - 1; i >= 0; i--) {
        const g = st.grenadesList[i];
        g.age += dt;
        g.velocity.y -= 18.0 * dt;

        const nextPos = g.pos.clone().addScaledVector(g.velocity, dt);
        let collided = false;
        let colNormal = new THREE.Vector3(0, 1, 0);

        if (nextPos.y <= 0.1) {
          collided = true;
          nextPos.y = 0.1;
          colNormal.set(0, 1, 0);
        } else {
          const gBox = new THREE.Box3(
            nextPos.clone().sub(new THREE.Vector3(0.18, 0.18, 0.18)),
            nextPos.clone().add(new THREE.Vector3(0.18, 0.18, 0.18))
          );
          for (const box of st.boundingBoxes) {
            if (gBox.intersectsBox(box)) {
              collided = true;
              const boxCenter = new THREE.Vector3();
              box.getCenter(boxCenter);
              colNormal.subVectors(nextPos, boxCenter).normalize();
              break;
            }
          }
        }

        if (collided) {
          g.velocity.reflect(colNormal).multiplyScalar(0.4);
          g.pos.addScaledVector(g.velocity, dt);
        } else {
          g.pos.copy(nextPos);
        }

        if (g.age >= 2.5) {
          triggerExplosion(g.pos);
          scene.remove(g.mesh);
          st.grenadesList.splice(i, 1);
        }
      }

      // Update Boss Projectiles
      for (let i = st.bossProjectiles.length - 1; i >= 0; i--) {
        const p = st.bossProjectiles[i];
        p.age += dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        
        let detonated = false;
        if (p.mesh.position.y <= 0.1) detonated = true;
        
        const pBox = new THREE.Box3(
          p.mesh.position.clone().sub(new THREE.Vector3(0.3, 0.3, 0.3)),
          p.mesh.position.clone().add(new THREE.Vector3(0.3, 0.3, 0.3))
        );

        for (const box of st.boundingBoxes) {
          if (pBox.intersectsBox(box)) {
            detonated = true; break;
          }
        }

        const dToLocal = st.pos.distanceTo(p.mesh.position);
        if (dToLocal < 1.4 && !st.isDead && !st.showGameOver) {
          detonated = true;
          handleHitRef.current(25);
        }

        if (detonated || p.age >= 4.0) {
          triggerExplosion(p.mesh.position);
          scene.remove(p.mesh);
          st.bossProjectiles.splice(i, 1);
        }
      }

      // Smooth rotate floating weapon racks
      spinningRacks.forEach((rack) => {
        if (rack) rack.rotation.y += dt * 0.75;
      });

      // Update opponent coordinates interpolations
      if (oppMesh) {
        oppMesh.visible = st.connected && st.gameMode !== 'zombies';
        if (st.connected) {
          oppMesh.position.lerp(st.oppTargetPos, dt * 10);
          oppMesh.rotation.y = THREE.MathUtils.lerp(oppMesh.rotation.y, st.oppYaw, dt * 10);
          if (oppGun) oppGun.rotation.x = THREE.MathUtils.lerp(oppGun.rotation.x, st.oppPitch, dt * 10);
        }
      }

      // Flashing damage targets feedback reset
      st.dummies.forEach((dummy) => {
        if (dummy.flashTimer > 0) {
          dummy.flashTimer -= dt;
          if (dummy.flashTimer <= 0) {
            dummy.torsoMesh.material.color.setHex(0xef4444);
            dummy.headMesh.material.color.setHex(0xffffff);
          }
        }
      });
      st.bots.forEach((bot) => {
        if (bot.flashTimer > 0) {
          bot.flashTimer -= dt;
          if (bot.flashTimer <= 0) bot.torsoMesh.material.color.setHex(bot.color);
        }
      });
      st.zombies.forEach((zombie) => {
        if (zombie.flashTimer > 0) {
          zombie.flashTimer -= dt;
          if (zombie.flashTimer <= 0) {
            const colors = { walker: 0x15803d, runner: 0xff3300, tank: 0x6d28d9, exploder: 0xeab308, boss: 0xca8a04 };
            zombie.torsoMesh.material.color.setHex(colors[zombie.type]);
          }
        }
      });

      // --- ZOMBIES WAVE MANAGER (Host Authority) ---
      if (isHost && st.gameMode === 'zombies' && matchStarted) {
        if (st.zombiesToSpawn > 0) {
          st.spawnCooldown -= dt;
          if (st.spawnCooldown <= 0) {
            st.spawnCooldown = 1.3;
            // Spawn zombie based on wave ratio distribution
            let type = 'walker';
            const roll = Math.random();
            if (st.waveNum >= 10 && st.zombiesToSpawn === 1) {
              type = 'boss';
            } else if (st.waveNum >= 5 && roll < 0.2) {
              type = 'exploder';
            } else if (st.waveNum >= 3 && roll < 0.4) {
              type = 'tank';
            } else if (roll < 0.3 + (st.waveNum * 0.05)) {
              type = 'runner';
            }
            hostSpawnZombie(type);
            st.zombiesToSpawn -= 1;
          }
        } else if (st.zombies.length === 0 && !st.showGameOver) {
          // Intermission countdown next wave
          if (st.intermissionTimer <= 0) {
            st.intermissionTimer = 10.0;
            setWaveBanner('WAVE CLEARED');
            setTimeout(() => setWaveBanner(''), 3000);
          } else {
            st.intermissionTimer -= dt;
            if (st.intermissionTimer <= 0) {
              hostStartNextZombieWave();
            }
          }
        }

        // Update Zombie positions on host
        st.zombies.forEach((z) => {
          // Select target nearest player or bot teammate
          let target = st.pos;
          let targetDist = z.pos.distanceTo(st.pos);

          if (st.connected && !st.isDead) {
            const dGuest = z.pos.distanceTo(st.oppPos);
            if (dGuest < targetDist) {
              target = st.oppPos;
              targetDist = dGuest;
            }
          }

          st.bots.forEach(b => {
            if (b.isDead) return;
            const d = z.pos.distanceTo(b.pos);
            if (d < targetDist) {
              target = b.pos;
              targetDist = d;
            }
          });

          // Move zombie towards nearest target
          const zDir = target.clone().sub(z.pos);
          zDir.y = 0;
          zDir.normalize();

          const angle = Math.atan2(zDir.x, zDir.z);
          z.group.rotation.y = angle;

          const nextPos = z.pos.clone().addScaledVector(zDir, z.speed * dt);
          if (!testBotCollision(nextPos, st.boundingBoxes)) {
            z.pos.copy(nextPos);
            z.group.position.copy(z.pos);
          }

          // Melee attacks math
          if (z.meleeCooldown > 0) z.meleeCooldown -= dt;

          if (targetDist < 1.4 && z.meleeCooldown <= 0) {
            z.meleeCooldown = 1.0;
            if (z.type === 'exploder') {
              triggerExplosion(z.pos);
              scene.remove(z.group);
              st.zombies = st.zombies.filter(x => x.id !== z.id);
              setZombiesCount(st.zombies.length);
              if (connRef.current && st.connected) {
                connRef.current.send({ type: 'zombie_death', zId: z.id });
              }
            } else {
              // Melee damage
              if (target.equals(st.pos)) {
                handleHitRef.current(z.damage);
              } else if (st.connected && target.equals(st.oppPos)) {
                connRef.current.send({ type: 'hit', damage: z.damage });
              } else {
                // Damaging bot teammate
                const botTarget = st.bots.find(b => b.pos.equals(target));
                if (botTarget) {
                  dealDamageToBot(botTarget, z.damage, z.type);
                }
              }
            }
          }

          // Boss ranged projectile attack logic
          if (z.type === 'boss') {
            z.projectileTimer -= dt;
            if (z.projectileTimer <= 0) {
              z.projectileTimer = 3.2;
              const pVel = target.clone().sub(z.pos).normalize().multiplyScalar(15);
              const pX = z.pos.x;
              const pY = z.pos.y + 1.8;
              const pZ = z.pos.z;

              const pMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
              pMesh.position.set(pX, pY, pZ);
              scene.add(pMesh);

              st.bossProjectiles.push({ mesh: pMesh, vel: pVel, age: 0 });

              if (connRef.current && st.connected) {
                connRef.current.send({
                  type: 'boss_projectile',
                  x: pX, y: pY, z: pZ,
                  vx: pVel.x, vy: pVel.y, vz: pVel.z
                });
              }
            }
          }
        });
      } else {
        // Client zombie interpolation updates
        st.zombies.forEach((z) => {
          z.pos.lerp(z.targetPos, dt * 9);
          z.group.position.copy(z.pos);
          
          const zDir = z.targetPos.clone().sub(z.pos);
          zDir.y = 0;
          if (zDir.length() > 0.05) {
            zDir.normalize();
            z.group.rotation.y = Math.atan2(zDir.x, zDir.z);
          }
        });
      }

      // --- AUTHORITATIVE BOTS SIMULATION ---
      const activeTeammateBots = st.gameMode === 'zombies';
      if (isHost) {
        st.bots.forEach((bot) => {
          if (bot.isDead) return;

          if (bot.shootCooldownTimer > 0) bot.shootCooldownTimer -= dt;

          let target = null;
          let targetDist = 99999;
          let targetType = ''; // 'player' | 'opponent' | 'bot' | 'dummy' | 'zombie'

          if (!matchStarted) {
            // Lobby practice target dummies
            if (bot.mode === 'A') {
              const cabinDummies = st.dummies.filter(d => d.id.startsWith(`dummy_${bot.id.split('_')[1]}_`));
              if (cabinDummies.length > 0) {
                if (!bot.practiceTarget || bot.practiceTarget.hp <= 0) {
                  bot.practiceTarget = cabinDummies[Math.floor(Math.random() * cabinDummies.length)];
                }
                target = bot.practiceTarget; targetType = 'dummy';
                if (target) targetDist = bot.pos.distanceTo(target.pos);
              }
            } else {
              const distToLocal = bot.pos.distanceTo(st.pos);
              if (distToLocal < 18) {
                target = st.pos; targetDist = distToLocal; targetType = 'player';
              }
            }
          } else {
            // Match targeting rules
            if (activeTeammateBots) {
              // Bots hunt zombies!
              st.zombies.forEach((z) => {
                const d = bot.pos.distanceTo(z.pos);
                if (d < targetDist && d < 35) {
                  target = z.pos; targetDist = d; targetType = 'zombie';
                }
              });
            } else {
              // Bots hunt players
              const distToLocal = bot.pos.distanceTo(st.pos);
              if (distToLocal < 32) {
                target = st.pos; targetDist = distToLocal; targetType = 'player';
              }
              if (st.connected) {
                const distToOpp = bot.pos.distanceTo(st.oppPos);
                if (distToOpp < 32 && distToOpp < targetDist) {
                  target = st.oppPos; targetDist = distToOpp; targetType = 'opponent';
                }
              }
              st.bots.forEach((otherBot) => {
                if (otherBot.id === bot.id || otherBot.isDead) return;
                const distToBot = bot.pos.distanceTo(otherBot.pos);
                if (distToBot < 32 && distToBot < targetDist) {
                  target = otherBot.pos; targetDist = distToBot; targetType = 'bot';
                }
              });
            }
          }

          if (target) {
            const targetPos = target.clone();
            targetPos.y = 0.8;
            
            const dir = targetPos.clone().sub(bot.pos);
            bot.yaw = Math.atan2(dir.x, dir.z);
            bot.pitch = Math.atan2(dir.y, Math.sqrt(dir.x * dir.x + dir.z * dir.z));

            if (bot.shootCooldownTimer <= 0) {
              bot.shootCooldownTimer = 1.6 + Math.random() * 0.4;
              botShoot(bot, targetPos, targetType);
            }

            if (targetDist > 7) {
              const walkDir = new THREE.Vector3(Math.sin(bot.yaw), 0, Math.cos(bot.yaw)).normalize();
              const nextPos = bot.pos.clone().addScaledVector(walkDir, 3.2 * dt);
              if (!testBotCollision(nextPos, st.boundingBoxes)) {
                bot.pos.copy(nextPos);
              }
            }
          } else {
            // Default wandering behavior
            if (bot.mode === 'B' || matchStarted) {
              if (!bot.exitedCabin) {
                let dx = 0, dz = 0;
                if (bot.door === 'E') dx = 1;
                else if (bot.door === 'W') dx = -1;
                else if (bot.door === 'S') dz = 1;
                else if (bot.door === 'N') dz = -1;

                const exitPt = new THREE.Vector3(bot.cabinCx + 7.5 * dx, 0.9, bot.cabinCz + 7.5 * dz);
                const walkDir = exitPt.clone().sub(bot.pos);
                walkDir.y = 0;
                
                if (walkDir.length() < 1.2) {
                  bot.exitedCabin = true;
                } else {
                  walkDir.normalize();
                  bot.yaw = Math.atan2(walkDir.x, walkDir.z);
                  const nextPos = bot.pos.clone().addScaledVector(walkDir, 3.2 * dt);
                  if (!testBotCollision(nextPos, st.boundingBoxes)) {
                    bot.pos.copy(nextPos);
                  }
                }
              } else {
                if (!bot.wanderTarget || bot.pos.distanceTo(bot.wanderTarget) < 2.5 || Math.random() < 0.008) {
                  bot.wanderTarget = new THREE.Vector3((Math.random() - 0.5) * 55, 0.9, (Math.random() - 0.5) * 55);
                }
                const walkDir = bot.wanderTarget.clone().sub(bot.pos);
                walkDir.y = 0; walkDir.normalize();
                bot.yaw = Math.atan2(walkDir.x, walkDir.z);
                const nextPos = bot.pos.clone().addScaledVector(walkDir, 3.2 * dt);
                if (!testBotCollision(nextPos, st.boundingBoxes)) {
                  bot.pos.copy(nextPos);
                }
              }
            }
          }

          bot.group.position.copy(bot.pos);
          bot.group.rotation.y = bot.yaw;
          bot.gunMesh.rotation.x = bot.pitch;
          bot.box.setFromObject(bot.group);
        });
      } else {
        // Client Bot Interpolation coordinates sync
        st.bots.forEach((bot) => {
          if (bot.isDead) { bot.group.visible = false; return; }
          bot.group.visible = true;
          bot.pos.lerp(bot.targetPos, dt * 9);
          bot.group.position.copy(bot.pos);
          bot.yaw = THREE.MathUtils.lerp(bot.yaw, bot.targetYaw, dt * 9);
          bot.group.rotation.y = bot.yaw;
          bot.pitch = THREE.MathUtils.lerp(bot.pitch, bot.targetPitch, dt * 9);
          bot.gunMesh.rotation.x = bot.pitch;
          bot.box.setFromObject(bot.group);
        });
      }

      // --- LOCAL MOVEMENT PHYSICS ---
      if (!st.isDead && !st.showGameOver) {
        const moveVector = new THREE.Vector3(0, 0, 0);
        const forward = new THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw)).normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        if (st.keys.w) moveVector.add(forward);
        if (st.keys.s) moveVector.sub(forward);
        if (st.keys.d) moveVector.add(right);
        if (st.keys.a) moveVector.sub(right);

        moveVector.normalize().multiplyScalar(st.moveSpeed);
        st.velocity.x = moveVector.x;
        st.velocity.z = moveVector.z;

        if (!st.isGrounded) {
          st.velocity.y -= gravity * dt;
        }

        if (st.keys.space && st.isGrounded) {
          st.velocity.y = st.jumpSpeed;
          st.isGrounded = false;
        }

        // AABB Resolve Sliding
        const dx = st.velocity.x * dt;
        const newPosX = st.pos.clone().add(new THREE.Vector3(dx, 0, 0));
        if (!testMovementCollision(st, newPosX)) {
          st.pos.x = newPosX.x;
        }
        const dz = st.velocity.z * dt;
        const newPosZ = st.pos.clone().add(new THREE.Vector3(0, 0, dz));
        if (!testMovementCollision(st, newPosZ)) {
          st.pos.z = newPosZ.z;
        }
        const dy = st.velocity.y * dt;
        const newPosY = st.pos.clone().add(new THREE.Vector3(0, dy, 0));
        
        let resolvingFloorY = false;
        if (newPosY.y <= 0.9) {
          st.pos.y = 0.9; st.velocity.y = 0; st.isGrounded = true;
          resolvingFloorY = true;
        } else {
          const pBox = new THREE.Box3(
            newPosY.clone().sub(new THREE.Vector3(0.35, 0.9, 0.35)),
            newPosY.clone().add(new THREE.Vector3(0.35, 0.9, 0.35))
          );
          for (const box of st.boundingBoxes) {
            if (pBox.intersectsBox(box)) {
              resolvingFloorY = true;
              if (st.velocity.y < 0) {
                st.pos.y = box.max.y + 0.9;
                st.velocity.y = 0;
                st.isGrounded = true;
              } else {
                st.velocity.y = -2;
              }
              break;
            }
          }
          if (!resolvingFloorY) {
            st.pos.y = newPosY.y;
            if (st.pos.y > 0.9 && st.velocity.y === 0) st.isGrounded = false;
          }
        }

        camContainer.position.copy(st.pos);

        // --- DYNAMIC SURFACE FOOTSTEPS GENERATION ---
        const isMoving = st.keys.w || st.keys.s || st.keys.a || st.keys.d;
        if (isMoving && st.isGrounded) {
          // Accumulate walking distance math
          st.walkDistance += Math.hypot(st.velocity.x * dt, st.velocity.z * dt);
          if (st.walkDistance > 2.2) {
            st.walkDistance = 0;
            // Determine surface coordinate bounds
            let surface = 'concrete';
            
            // Check inside spawns
            let insideCabin = false;
            CABIN_CONFIGS.forEach(c => {
              if (Math.abs(st.pos.x - c.cx) < 5.0 && Math.abs(st.pos.z - c.cz) < 5.0) {
                insideCabin = true;
              }
            });

            if (insideCabin) {
              surface = 'wood';
            } else if (st.pos.y > 1.2) {
              surface = 'metal';
            } else if (Math.abs(st.pos.x) < 26 && Math.abs(st.pos.z) < 26) {
              surface = 'grass';
            }
            playFootstepSound(surface);
          }

          st.swayTime += dt * 13;
          weaponGroup.position.x = 0.24 + Math.sin(st.swayTime) * 0.015;
          weaponGroup.position.y = -0.22 + Math.cos(st.swayTime * 2) * 0.008;
        } else {
          weaponGroup.position.set(0.24, -0.22, -0.42);
        }

        // --- BOMB PLANTING / DEFUSING SYSTEM ---
        if (st.gameMode === 'bomb' && matchStarted) {
          const isT = st.team === 'Red';
          const inSiteA = st.pos.distanceTo(new THREE.Vector3(-20, 0.9, -20)) < 7.5;
          const inSiteB = st.pos.distanceTo(new THREE.Vector3(16, 0.01, 16)) < 7.5;
          const insideSite = inSiteA || inSiteB;

          // Planting logic
          if (isT && insideSite && !st.bombPlanted && st.keys.f) {
            st.planting = true;
            st.plantProgress = Math.min(100, st.plantProgress + dt * 33.3); // 3 seconds
            setPlantProgress(Math.floor(st.plantProgress));
            setPlanting(true);

            if (st.plantProgress >= 100) {
              st.bombPlanted = true;
              st.plantProgress = 0;
              setPlantProgress(0);
              setBombPlantedState(true);
              setPlanting(false);
              st.planting = false;
              
              const activeSite = inSiteA ? 'A' : 'B';
              setBombSite(activeSite);
              st.bombPlantedPos = st.pos.clone().sub(new THREE.Vector3(0, 0.8, 0)); // ground placement

              addLog(`Bomb planted at Site ${activeSite}!`, true);

              // Add 3D Bomb mesh locally
              const bGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 16);
              const bMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
              const bMesh = new THREE.Mesh(bGeom, bMat);
              bMesh.position.copy(st.bombPlantedPos);
              scene.add(bMesh);
              st.bombMesh = bMesh;

              if (connRef.current && st.connected) {
                connRef.current.send({
                  type: 'bomb_planted',
                  site: activeSite,
                  x: st.bombPlantedPos.x,
                  y: st.bombPlantedPos.y,
                  z: st.bombPlantedPos.z
                });
              }
            }
          } else {
            st.planting = false;
            st.plantProgress = 0;
            setPlanting(false);
            setPlantProgress(0);
          }

          // Defusing logic
          const closeToBomb = st.bombPlantedPos && st.pos.distanceTo(st.bombPlantedPos) < 2.5;
          if (!isT && st.bombPlanted && closeToBomb && st.keys.f) {
            st.defusing = true;
            st.defuseProgress = Math.min(100, st.defuseProgress + dt * 20); // 5 seconds
            setDefuseProgress(Math.floor(st.defuseProgress));
            setDefusing(true);

            if (st.defuseProgress >= 100) {
              st.bombPlanted = false;
              st.defuseProgress = 0;
              setDefuseProgress(0);
              setBombPlantedState(false);
              setDefusing(false);
              st.defusing = false;

              addLog(`Bomb has been defused! CT wins.`, true);
              setWinnerState('Counter-Terrorists (Blue)');
              setShowGameOverState(true);
              document.exitPointerLock?.();

              if (connRef.current && st.connected) {
                connRef.current.send({ type: 'bomb_defused' });
              }
            }
          } else {
            st.defusing = false;
            st.defuseProgress = 0;
            setDefusing(false);
            setDefuseProgress(0);
          }
        }
      }

      // Authoritative Bomb Timer countdown on Host
      if (isHost && st.gameMode === 'bomb' && st.bombPlanted && matchStarted && !st.showGameOver) {
        st.bombTimer -= dt;
        setBombTimerState(Math.ceil(st.bombTimer));

        // Play procedural click beeps
        if (Math.floor(st.bombTimer * 2) % 2 === 0 && Math.random() < 0.08) {
          playEmptyClickSound();
        }

        if (st.bombTimer <= 0) {
          st.bombPlanted = false;
          setBombPlantedState(false);
          addLog(`Bomb detonated! T wins.`, true);
          setWinnerState('Terrorists (Red)');
          setShowGameOverState(true);
          document.exitPointerLock?.();

          if (st.bombPlantedPos) {
            triggerExplosion(st.bombPlantedPos);
          }

          if (connRef.current && st.connected) {
            connRef.current.send({ type: 'bomb_exploded' });
          }
        }
      }

      // Camera view rotation LookAt
      const idealCamLook = new THREE.Vector3(
        Math.sin(st.yaw) * Math.cos(st.pitch),
        Math.sin(st.pitch),
        Math.cos(st.yaw) * Math.cos(st.pitch)
      ).normalize();

      if (st.cameraShake > 0) {
        camera.position.set((Math.random() - 0.5) * st.cameraShake, (Math.random() - 0.5) * st.cameraShake, 0);
      } else {
        camera.position.set(0, 0, 0);
      }
      camera.lookAt(camera.position.clone().add(idealCamLook));

      // Network coordinates broadcast
      const nowMs = Date.now();
      if (nowMs - st.lastSyncTime > 33) {
        st.lastSyncTime = nowMs;
        broadcastSync();

        // Host synchronizes all bots coordinates to Guest client
        if (isHost && connRef.current && st.connected) {
          connRef.current.send({
            type: 'bots_sync',
            bots: st.bots.map(b => ({
              id: b.id,
              x: b.pos.x,
              y: b.pos.y,
              z: b.pos.z,
              yaw: b.yaw,
              pitch: b.pitch,
              hp: b.hp,
              isDead: b.isDead
            }))
          });

          // Sync zombies data packets
          if (st.gameMode === 'zombies') {
            connRef.current.send({
              type: 'zombies_sync',
              zombies: st.zombies.map(z => ({
                id: z.id,
                type: z.type,
                x: z.pos.x,
                y: z.pos.y,
                z: z.pos.z,
                hp: z.hp
              }))
            });
          }
        }
      }

      // --- 2D RADAR MINIMAP RENDER ---
      const mCanvas = minimapCanvasRef.current;
      const mCtx = mCanvas?.getContext('2d');
      if (mCanvas && mCtx) {
        mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
        
        // Draw background radar sweep
        const radius = mCanvas.width / 2;
        mCtx.fillStyle = 'rgba(6, 4, 15, 0.85)';
        mCtx.beginPath(); mCtx.arc(radius, radius, radius, 0, Math.PI * 2); mCtx.fill();
        
        // Draw concentric radar lines
        mCtx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
        mCtx.lineWidth = 1;
        mCtx.beginPath(); mCtx.arc(radius, radius, radius * 0.65, 0, Math.PI * 2); mCtx.stroke();
        mCtx.beginPath(); mCtx.arc(radius, radius, radius * 0.35, 0, Math.PI * 2); mCtx.stroke();
        
        // Draw cross lines
        mCtx.beginPath(); mCtx.moveTo(radius, 0); mCtx.lineTo(radius, radius * 2); mCtx.stroke();
        mCtx.beginPath(); mCtx.moveTo(0, radius); mCtx.lineTo(radius * 2, radius); mCtx.stroke();

        // Save context to apply local yaw rotation
        mCtx.save();
        mCtx.translate(radius, radius);
        // Rotate map opposite to player yaw so UP is always forward
        mCtx.rotate(-st.yaw);

        // Minimap scale conversion multiplier (from 120m world to 130px canvas)
        const worldToCanvas = radius / 60; // 60 meters radius from center

        // Draw outer boundary walls
        mCtx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
        mCtx.lineWidth = 2;
        mCtx.strokeRect(-55 * worldToCanvas, -55 * worldToCanvas, 110 * worldToCanvas, 110 * worldToCanvas);

        // Draw spawn cabins
        mCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        mCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        CABIN_CONFIGS.forEach(c => {
          mCtx.fillRect(
            (c.cx - 5) * worldToCanvas,
            (c.cz - 5) * worldToCanvas,
            10 * worldToCanvas,
            10 * worldToCanvas
          );
          mCtx.strokeRect(
            (c.cx - 5) * worldToCanvas,
            (c.cz - 5) * worldToCanvas,
            10 * worldToCanvas,
            10 * worldToCanvas
          );
        });

        // Draw Bomb Sites
        if (st.gameMode === 'bomb') {
          mCtx.font = 'bold 9px monospace';
          mCtx.fillStyle = '#00e5ff';
          mCtx.textAlign = 'center';
          mCtx.fillText('A', -20 * worldToCanvas, -20 * worldToCanvas + 3);
          
          mCtx.fillStyle = '#ff00b7';
          mCtx.fillText('B', 16 * worldToCanvas, 16 * worldToCanvas + 3);

          if (st.bombPlanted && st.bombPlantedPos) {
            // Blinking red planted bomb
            mCtx.fillStyle = Math.floor(Date.now() / 250) % 2 === 0 ? '#ff0000' : '#ffffff';
            mCtx.beginPath();
            mCtx.arc(st.bombPlantedPos.x * worldToCanvas, st.bombPlantedPos.z * worldToCanvas, 4, 0, Math.PI * 2);
            mCtx.fill();
          }
        }

        // Draw Teammates / Bots
        st.bots.forEach(b => {
          if (b.isDead) return;
          // In zombies mode, bots are green allies. Otherwise, TDM team matches.
          const isAlly = st.gameMode === 'zombies' || 
                         (st.team === 'Blue' && b.color !== 0xff3d00) || 
                         (st.team === 'Red' && b.color === 0xff3d00);
          
          mCtx.fillStyle = isAlly ? '#22c55e' : '#ef4444';
          mCtx.beginPath();
          mCtx.arc(b.pos.x * worldToCanvas, b.pos.z * worldToCanvas, 3, 0, Math.PI * 2);
          mCtx.fill();
        });

        // Draw Guest Opponent player
        if (st.connected && st.gameMode !== 'zombies') {
          mCtx.fillStyle = '#ef4444';
          mCtx.beginPath();
          mCtx.arc(st.oppPos.x * worldToCanvas, st.oppPos.z * worldToCanvas, 3.5, 0, Math.PI * 2);
          mCtx.fill();
        }

        // Draw Zombies
        if (st.gameMode === 'zombies') {
          st.zombies.forEach(z => {
            mCtx.fillStyle = z.type === 'boss' ? '#ca8a04' : '#ff3300';
            mCtx.beginPath();
            mCtx.arc(z.pos.x * worldToCanvas, z.pos.z * worldToCanvas, z.type === 'boss' ? 4.5 : 2.5, 0, Math.PI * 2);
            mCtx.fill();
          });
        }

        mCtx.restore();

        // Draw local player arrow stationary in center pointing UP
        mCtx.fillStyle = '#00e5ff';
        mCtx.beginPath();
        mCtx.moveTo(radius, radius - 6);
        mCtx.lineTo(radius - 5, radius + 5);
        mCtx.lineTo(radius + 5, radius + 5);
        mCtx.closePath();
        mCtx.fill();
      }

      renderer.render(scene, camera);
    }

    animate();

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
      stopAmbientWind();

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

  const handleLobbyBack = () => {
    cleanupPeer();
    setPhase('menu');
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareRoomCode = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    if (navigator.share) {
      navigator.share({
        title: 'Cyber Elite FPS',
        text: `Join my lobby on Cyber Elite FPS! Room Code: ${roomCode}`,
        url: shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl);
        addLog('Lobby Link Copied!', true);
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      addLog('Lobby Link Copied!', true);
    }
  };

  return (
    <div className="fps-root">
      
      {/* ──────────────── RENDER LOBBY INTERFACES ──────────────── */}
      {phase === 'menu' && (
        <div className="fps-lobby-overlay">
          <div className="fps-lobby-box">
            <h1>Cyber Elite FPS</h1>
            <div className="fps-lobby-sub">// ARENA MULTIPLAYER SHOOTER</div>
            
            {/* Game Mode Selector */}
            <div className="fps-mode-select">
              <label>Select Game Mode</label>
              <div className="fps-mode-options">
                <button className={`fps-mode-btn ${gameMode === 'tdm' ? 'active' : ''}`} onClick={() => setGameMode('tdm')}>
                  <span className="fps-mode-icon">🔫</span>
                  TDM
                  <div className="fps-mode-desc">Team Deathmatch</div>
                </button>
                <button className={`fps-mode-btn ${gameMode === 'bomb' ? 'active' : ''}`} onClick={() => setGameMode('bomb')}>
                  <span className="fps-mode-icon">💣</span>
                  Defusal
                  <div className="fps-mode-desc">Bomb Site Plant & Defuse</div>
                </button>
                <button className={`fps-mode-btn ${gameMode === 'zombies' ? 'active' : ''}`} onClick={() => setGameMode('zombies')}>
                  <span className="fps-mode-icon">🧟</span>
                  Zombies
                  <div className="fps-mode-desc">Wave Co-Op Survival</div>
                </button>
              </div>
            </div>

            {/* Loadout Picker Grid */}
            <div className="fps-loadout-panel">
              <label>Choose Starting Loadout</label>
              <div className="fps-loadout-grid">
                <div className={`fps-loadout-card ${startingWeapon === 'ar' ? 'active' : ''}`} onClick={() => setStartingWeapon('ar')}>
                  <div className="fps-loadout-card-name">AR</div>
                  <div className="fps-loadout-card-desc">Laser Assault Rifle</div>
                </div>
                <div className={`fps-loadout-card ${startingWeapon === 'smg' ? 'active' : ''}`} onClick={() => setStartingWeapon('smg')}>
                  <div className="fps-loadout-card-name">SMG</div>
                  <div className="fps-loadout-card-desc">Submachine Gun</div>
                </div>
                <div className={`fps-loadout-card ${startingWeapon === 'shotgun' ? 'active' : ''}`} onClick={() => setStartingWeapon('shotgun')}>
                  <div className="fps-loadout-card-name">Shotgun</div>
                  <div className="fps-loadout-card-desc">Spread Pellet Blast</div>
                </div>
                <div className={`fps-loadout-card ${startingWeapon === 'sniper' ? 'active' : ''}`} onClick={() => setStartingWeapon('sniper')}>
                  <div className="fps-loadout-card-name">Sniper</div>
                  <div className="fps-loadout-card-desc">Scoped Railgun</div>
                </div>
                <div className={`fps-loadout-card ${startingWeapon === 'pistol' ? 'active' : ''}`} onClick={() => setStartingWeapon('pistol')}>
                  <div className="fps-loadout-card-name">Pistol</div>
                  <div className="fps-loadout-card-desc">Precision Sidearm</div>
                </div>
              </div>
            </div>

            <div className="fps-team-select">
              <label>Select Faction</label>
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
            <div className="fps-lobby-sub">// INSERT ROOM ENCRYPTED CODE</div>

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

            {/* Loadout selection for guest joins */}
            <div className="fps-loadout-panel" style={{ marginTop: '20px' }}>
              <label>Starting Loadout</label>
              <div className="fps-loadout-grid">
                <div className={`fps-loadout-card ${startingWeapon === 'ar' ? 'active' : ''}`} onClick={() => setStartingWeapon('ar')}>
                  <div className="fps-loadout-card-name">AR</div>
                </div>
                <div className={`fps-loadout-card ${startingWeapon === 'smg' ? 'active' : ''}`} onClick={() => setStartingWeapon('smg')}>
                  <div className="fps-loadout-card-name">SMG</div>
                </div>
                <div className={`fps-loadout-card ${startingWeapon === 'shotgun' ? 'active' : ''}`} onClick={() => setStartingWeapon('shotgun')}>
                  <div className="fps-loadout-card-name">Shotgun</div>
                </div>
                <div className={`fps-loadout-card ${startingWeapon === 'sniper' ? 'active' : ''}`} onClick={() => setStartingWeapon('sniper')}>
                  <div className="fps-loadout-card-name">Sniper</div>
                </div>
                <div className={`fps-loadout-card ${startingWeapon === 'pistol' ? 'active' : ''}`} onClick={() => setStartingWeapon('pistol')}>
                  <div className="fps-loadout-card-name">Pistol</div>
                </div>
              </div>
            </div>

            <div className="fps-action-btns" style={{ marginTop: '20px' }}>
              <button className="fps-action-btn" onClick={joinRoom}>
                Connect to Host
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

      {/* ──────────────── RENDER GAMEPLAY CANVAS ──────────────── */}
      {phase === 'playing' && (
        <>
          {/* Main 3D canvas viewport container */}
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

          {/* HUD Overlay layer */}
          <div className="fps-hud-container">
            {/* Center Circular Crosshair Reticle (Hide when scoped) */}
            {isLocked && !isDead && !showGameOver && !isScoped && (
              <div className="fps-crosshair">
                <div className="fps-crosshair-dot" />
              </div>
            )}

            {/* Scope overlay Vignette for Sniper */}
            {isLocked && !isDead && !showGameOver && isScoped && (
              <div className="fps-scope-overlay">
                <div className="fps-scope-vignette" />
                <div className="fps-scope-crosshair-h" />
                <div className="fps-scope-crosshair-v" />
                <div className="fps-scope-circle" />
              </div>
            )}

            {/* Circular Radar Minimap Canvas */}
            {!showGameOver && (
              <div className="fps-minimap-container">
                <canvas ref={minimapCanvasRef} width={130} height={130} className="fps-minimap-canvas" />
              </div>
            )}

            {/* Locked Instruction Panel */}
            {!isLocked && !showGameOver && (
              <div className="fps-lock-overlay">
                <div className="fps-lock-box">
                  <h2>Cyber Elite 3D</h2>
                  <ul>
                    <li>Move: <strong>W / A / S / D</strong></li>
                    <li>Aim / View Look: <strong>Mouse Position</strong></li>
                    <li>Fire Weapon: <strong>Left Click</strong></li>
                    <li>Switch Weapons: <strong>1 - 5 Keys</strong></li>
                    <li>Reload Weapon: <strong>R Key</strong></li>
                    <li>Throw Grenade: <strong>G Key</strong> or <strong>Right Click (AR/SMG)</strong></li>
                    <li>Sniper Zoom Scope: <strong>Right Click</strong></li>
                    <li>Defuse/Plant Bomb: <strong>Hold F Key</strong></li>
                    <li>Jump Action: <strong>Spacebar</strong></li>
                  </ul>
                  <button className="fps-lock-btn">
                    Engage HUD Controls
                  </button>
                </div>
              </div>
            )}

            {/* Room Code Display */}
            <div className="fps-hud-room-code">
              <span className="fps-hud-code-lbl">ROOM:</span>
              <span className="fps-hud-code-val">{roomCode}</span>
              <button className={`fps-copy-btn ${copied ? 'copied' : ''}`} onClick={copyRoomCode}>
                {copied ? 'COPIED!' : 'COPY'}
              </button>
              <button className="fps-copy-btn" onClick={shareRoomCode} style={{ borderColor: 'rgba(255, 0, 127, 0.4)', color: '#ff007f', background: 'rgba(255, 0, 127, 0.1)' }}>
                SHARE
              </button>
            </div>

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
                  <div className="fps-hud-label">{WEAPONS[activeWeaponId].name} CELL</div>
                  {reloading ? (
                    <div className="fps-reload-text">RECHARGING CORE</div>
                  ) : (
                    <div className="fps-hud-val">{weaponClip}<span> / {weaponReserve}</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Scoreboard / Mode Widget (Top Center) */}
            {gameMode !== 'zombies' && (
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
            )}

            {/* Zombies Mode Active Wave Metrics */}
            {gameMode === 'zombies' && (
              <div className="fps-hud-top">
                <div className="fps-score-badge" style={{ padding: '8px 24px', borderColor: '#ff3300' }}>
                  <div style={{ color: '#ff3300', fontWeight: '800', fontSize: '14px', letterSpacing: '0.1em' }}>
                    WAVE {waveNum}
                  </div>
                </div>
              </div>
            )}

            {/* Zombie Wave Status Banners */}
            {waveBanner && (
              <div className="fps-zombie-banner">
                <h3>{waveBanner}</h3>
              </div>
            )}

            {/* Zombies count indicator */}
            {gameMode === 'zombies' && matchStarted && !showGameOver && (
              <div className="fps-zombie-count-badge">
                Zombies Remaining: {zombiesCount}
              </div>
            )}

            {/* Boss health bar */}
            {gameMode === 'zombies' && bossHp > 0 && !showGameOver && (
              <div className="fps-boss-bar-container">
                <div className="fps-boss-bar-fill" style={{ width: `${(bossHp / bossMaxHp) * 100}%` }} />
                <div className="fps-boss-label">MUTANT BOSS: {bossHp} / {bossMaxHp} HP</div>
              </div>
            )}

            {/* Bomb Scenario HUD indicators */}
            {gameMode === 'bomb' && bombPlanted && !showGameOver && (
              <div className="fps-bomb-alert">
                <h3>⚠️ BOMB PLANTED AT SITE {bombSite} ⚠️</h3>
                <div className="fps-bomb-alert-timer">{bombTimer}s</div>
              </div>
            )}

            {/* Bomb planting / defusing progress overlay */}
            {planting && (
              <div className="fps-progress-overlay">
                <div className="fps-progress-label">PLANTING CHARGE</div>
                <div className="fps-progress-bar">
                  <div className="fps-progress-fill" style={{ width: `${plantProgress}%` }} />
                </div>
              </div>
            )}

            {defusing && (
              <div className="fps-progress-overlay">
                <div className="fps-progress-label">DEFUSING BOMB</div>
                <div className="fps-progress-bar">
                  <div className="fps-progress-fill" style={{ width: `${defuseProgress}%` }} />
                </div>
              </div>
            )}

            {/* Leaderboard Overlay */}
            {matchStarted && gameMode !== 'zombies' && (
              <div className="fps-hud-leaderboard">
                <div className="fps-leaderboard-title">LEADERBOARD</div>
                {getLeaderboard().map((entry, idx) => (
                  <div key={idx} className={`fps-leaderboard-row ${entry.isLocal ? 'active-player' : ''} ${entry.isRemote ? 'active-remote' : ''}`}>
                    <span>{idx + 1}. {entry.name}</span>
                    <span>{entry.score} kills</span>
                  </div>
                ))}
              </div>
            )}

            {/* Kill feed announcements */}
            <div className="fps-kill-feed" style={{ top: (matchStarted && gameMode !== 'zombies') ? '240px' : '25px' }}>
              {killFeed.map((log) => (
                <div key={log.id} className={`fps-kill-log ${log.isLocalKiller ? 'local-killer' : ''}`}>
                  <span>🔫 {log.txt}</span>
                </div>
              ))}
            </div>

            {/* Match Timer Display */}
            {matchStarted && gameMode !== 'zombies' && (
              <div className="fps-match-timer">
                <span className="fps-match-timer-icon">⏱️</span>
                <span className={`fps-match-timer-val ${matchTimer < 30 ? 'urgent' : ''}`}>
                  {Math.floor(matchTimer / 60)}:{(matchTimer % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          {/* Lobby Practice Countdown Overlay */}
          {!matchStarted && (
            <div className="fps-countdown-overlay">
              <div className="fps-countdown-box">
                <div className="fps-countdown-label">LOBBY PRACTICE PHASE</div>
                <div className="fps-countdown-val">Match starts in {lobbyTimer}s</div>
                <div className="fps-countdown-sub">Shoot targets inside spawning cabins to warm up!</div>
                {isHost && !connected && (
                  <button className="fps-start-bots-btn" onClick={startMatch}>
                    START MATCH WITH BOTS
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Dramatic MATCH STARTED Banner */}
          {showMatchGoBanner && (
            <div className="fps-match-go-banner">
              <h1>MATCH STARTED - GO!</h1>
            </div>
          )}

          {/* Death Respawn Screen */}
          {isDead && !showGameOver && (
            <div className="fps-death-overlay">
              <div className="fps-death-box">
                <h2>YOU WERE ELIMINATED</h2>
                <p>Respawning at faction cabin spawns...</p>
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
                  // Winner: <strong style={{ color: '#ffaa00' }}>{winner}</strong>
                </p>

                {gameMode !== 'zombies' && (
                  <div className="fps-gameover-stats">
                    <div className="fps-stat-item">
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>YOUR SCORE</span>
                      <span className="fps-stat-val">{score.local}</span>
                    </div>
                    {connected && (
                      <div className="fps-stat-item">
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>OPPONENT SCORE</span>
                        <span className="fps-stat-val">{score.remote}</span>
                      </div>
                    )}
                  </div>
                )}

                {gameMode === 'zombies' && (
                  <div style={{ margin: '20px 0', fontSize: '16px', color: '#00e5ff', fontWeight: '800' }}>
                    Survival: Survived up to Wave {waveNum}
                  </div>
                )}

                <div className="fps-action-btns">
                  {isHost && (
                    <button className="fps-rematch-btn" onClick={handleRematch}>
                      Request Rematch
                    </button>
                  )}
                  <button className="fps-action-btn secondary" onClick={() => { cleanupPeer(); setPhase('menu'); }}>
                    Exit Lobby
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Exit button */}
          <button className="fps-back-btn" style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 100, fontSize: '15px', marginTop: 0 }} onClick={handleLobbyBack}>
            ← Exit Game
          </button>
        </>
      )}
    </div>
  );
}
