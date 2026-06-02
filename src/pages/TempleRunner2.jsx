import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './TempleRunner2.css';
import BackButton from './BackButton.jsx';

export default function TempleRunner2() {
  const mountRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [paused, setPaused] = useState(false);
  const [bestScore, setBestScore] = useState(() => +(localStorage.getItem('tr2Best') || 0));
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [powerUp, setPowerUp] = useState(null);
  const [ammo, setAmmo] = useState(12);
  const [notification, setNotification] = useState(null);
  const [canResurrect, setCanResurrect] = useState(false);
  const [missionUI, setMissionUI] = useState([]);
  const [biomeName, setBiomeName] = useState('');
  const [rampage, setRampage] = useState(false);
  const [trackName, setTrackName] = useState('');
  const [turnPrompt, setTurnPrompt] = useState(false);
  const [weaponName, setWeaponName] = useState('Pistol');
  const [grenades, setGrenades] = useState(2);
  const fnRef = useRef({});

  useEffect(() => {
    let disposed = false;
    const el = mountRef.current;
    if (!el) return;

    /* ============ SCENE ============ */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 10, 90);
    const w = el.clientWidth, h = el.clientHeight;
    const camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 200);
    camera.position.set(0, 4.5, 8);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dl = new THREE.DirectionalLight(0xfff0d0, 0.9);
    dl.position.set(5, 15, 10); dl.castShadow = true;
    scene.add(dl);

    /* ============ MATERIALS ============ */
    const matG = new THREE.MeshStandardMaterial({ color: 0x6b5540, roughness: 0.9 });
    const matGA = new THREE.MeshStandardMaterial({ color: 0xb0a080, roughness: 0.8 });
    const matW = new THREE.MeshStandardMaterial({ color: 0x3a2518, roughness: 0.9 });
    const matObs = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.5 });
    const matDuck = new THREE.MeshStandardMaterial({ color: 0x33aa44, roughness: 0.5 });
    const matMoving = new THREE.MeshStandardMaterial({ color: 0x3366ff, roughness: 0.4, emissive: 0x2244aa, emissiveIntensity: 0.2 });
    const matCoin = new THREE.MeshStandardMaterial({ color: 0xffdd00, metalness: 0.8, roughness: 0.2 });
    const matGem = new THREE.MeshStandardMaterial({ color: 0xff00ff, metalness: 0.9, roughness: 0.1, emissive: 0xff00ff, emissiveIntensity: 0.3 });
    const matShield = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
    const matMagnet = new THREE.MeshStandardMaterial({ color: 0xff3366, metalness: 0.7, roughness: 0.3, emissive: 0xff3366, emissiveIntensity: 0.3 });
    const matGuard = new THREE.MeshStandardMaterial({ color: 0x330000, roughness: 0.7 });
    const matRamp = new THREE.MeshStandardMaterial({ color: 0xaa8844, roughness: 0.8 });
    const matVine = new THREE.MeshStandardMaterial({ color: 0x226622, roughness: 0.9 });
    const matTrain = new THREE.MeshStandardMaterial({ color: 0xff6600, metalness: 0.5, roughness: 0.6 });
    const matPillar = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85 });
    const matLane = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.6 });
    const matBar = new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.5 });
    const matBullet = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const matAmmo = new THREE.MeshStandardMaterial({ color: 0x44ff44, metalness: 0.5, roughness: 0.3, emissive: 0x22aa22, emissiveIntensity: 0.4 });
    const matZip = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const matBoss = new THREE.MeshStandardMaterial({ color: 0x440000, roughness: 0.5, emissive: 0x330000, emissiveIntensity: 0.3 });
    const matLaser = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const matGrenade = new THREE.MeshStandardMaterial({ color: 0x66ff66, roughness: 0.35, metalness: 0.35 });

    /* ============ TRACK TYPES ============ */
    const TRACK_TYPES = ['normal', 'dirt', 'water', 'ice', 'lava', 'minecart', 'sky'];
    const trackNameMap = { normal: '🏛️ Temple Path', dirt: '🟤 Dirt Trail', water: '🌊 Water River', ice: '❄️ Ice Path', lava: '🔥 Lava Bridge', minecart: '⛏️ Mine Shaft', sky: '☁️ Sky Bridge' };
    const matDirt = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 1.0 });
    const matDirtAlt = new THREE.MeshStandardMaterial({ color: 0x6B4F12, roughness: 1.0 });
    const matDirtWall = new THREE.MeshStandardMaterial({ color: 0x5A3E0A, roughness: 0.95 });
    const matWater2 = new THREE.MeshStandardMaterial({ color: 0x2266bb, roughness: 0.2, transparent: true, opacity: 0.75 });
    const matWaterAlt = new THREE.MeshStandardMaterial({ color: 0x1155aa, roughness: 0.2, transparent: true, opacity: 0.75 });
    const matBoat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.8 });
    const matIceGround = new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.05, metalness: 0.3 });
    const matIceAlt = new THREE.MeshStandardMaterial({ color: 0xcceeFF, roughness: 0.05, metalness: 0.3 });
    const matIceWall = new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.1, transparent: true, opacity: 0.6 });
    const matLavaGround = new THREE.MeshStandardMaterial({ color: 0x1a0a0a, roughness: 0.9 });
    const matLavaAlt = new THREE.MeshStandardMaterial({ color: 0x2a0a0a, roughness: 0.9 });
    const matLavaEdge = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8, roughness: 0.3 });
    const matMineGround = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 });
    const matMineAlt = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.95 });
    const matMineWall = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
    const matMineRail = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const matSkyGround = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.4, transparent: true, opacity: 0.55 });
    const matSkyAlt = new THREE.MeshStandardMaterial({ color: 0xddddff, roughness: 0.4, transparent: true, opacity: 0.55 });
    const matSkyWall = new THREE.MeshStandardMaterial({ color: 0xccccff, roughness: 0.4, transparent: true, opacity: 0.3 });

    /* ============ SOUND ENGINE ============ */
    const AC = window.AudioContext || window.webkitAudioContext;
    let actx = null;
    function initSound() { try { actx = new AC(); } catch (e) { actx = null; } }
    function tone(f, d, t, v) {
      if (!actx || actx.state === 'suspended') return;
      try {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = t || 'sine'; o.frequency.value = f;
        g.gain.value = v || 0.1;
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + d);
        o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
      } catch (e) {}
    }
    function ramp(f1, f2, d, t, v) {
      if (!actx || actx.state === 'suspended') return;
      try {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = t || 'sine'; o.frequency.value = f1;
        o.frequency.linearRampToValueAtTime(f2, actx.currentTime + d);
        g.gain.value = v || 0.08;
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + d);
        o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
      } catch (e) {}
    }
    function sfx(name) {
      if (!actx) return;
      if (actx.state === 'suspended') actx.resume();
      switch (name) {
        case 'coin': tone(1200, 0.06, 'sine', 0.1); setTimeout(() => tone(1600, 0.04, 'sine', 0.07), 25); break;
        case 'gem': tone(800, 0.15, 'sine', 0.12); setTimeout(() => { tone(1200, 0.12, 'sine', 0.1); setTimeout(() => tone(1600, 0.1, 'sine', 0.08), 50); }, 40); break;
        case 'powerup': [600, 800, 1000, 1200].forEach((f, i) => setTimeout(() => tone(f, 0.08, 'sine', 0.09), i * 25)); break;
        case 'shield': tone(400, 0.2, 'sine', 0.08); break;
        case 'shoot': tone(800, 0.08, 'square', 0.1); setTimeout(() => tone(600, 0.06, 'square', 0.07), 40); break;
        case 'hit': tone(200, 0.12, 'sawtooth', 0.12); setTimeout(() => tone(150, 0.15, 'square', 0.09), 50); break;
        case 'guard': tone(120, 0.35, 'sawtooth', 0.11); setTimeout(() => tone(80, 0.4, 'square', 0.08), 60); break;
        case 'jump': ramp(280, 680, 0.12, 'sine', 0.07); break;
        case 'djump': ramp(500, 1100, 0.1, 'sine', 0.08); setTimeout(() => tone(1300, 0.04, 'sine', 0.06), 40); break;
        case 'fastfall': ramp(600, 200, 0.18, 'sawtooth', 0.09); break;
        case 'slam': tone(80, 0.15, 'square', 0.12); setTimeout(() => tone(60, 0.2, 'sine', 0.08), 30); break;
        case 'slide': tone(110, 0.18, 'sawtooth', 0.04); break;
        case 'land': tone(90, 0.06, 'sine', 0.05); break;
        case 'death': tone(180, 0.45, 'sawtooth', 0.13); setTimeout(() => tone(70, 0.6, 'square', 0.07), 80); break;
        case 'start': [400, 600, 800].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'sine', 0.08), i * 35)); break;
        case 'ammo': tone(500, 0.08, 'sine', 0.09); setTimeout(() => tone(800, 0.06, 'sine', 0.07), 30); break;
        case 'zip': ramp(300, 800, 0.3, 'sine', 0.06); break;
        case 'turn': tone(350, 0.12, 'sine', 0.08); setTimeout(() => tone(500, 0.08, 'sine', 0.06), 40); break;
        case 'boss': tone(80, 0.5, 'sawtooth', 0.15); setTimeout(() => tone(60, 0.5, 'square', 0.1), 100); break;
        case 'resurrect': [500, 700, 900, 1100, 1300].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'sine', 0.1), i * 40)); break;
        case 'achieve': [800, 1000, 1200, 1400].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'sine', 0.1), i * 50)); break;
        case 'crumble': tone(60, 0.3, 'square', 0.08); setTimeout(() => tone(40, 0.4, 'sawtooth', 0.06), 50); break;
        case 'rampage': [400,600,800,1000,1200,1400].forEach((f,i)=>setTimeout(()=>tone(f,0.1,'square',0.12),i*30)); break;
        case 'destroy': tone(300,0.08,'sawtooth',0.06); break;
        case 'splash': ramp(400,100,0.3,'sine',0.1); setTimeout(()=>tone(80,0.2,'sine',0.06),50); break;
        case 'trackchange': [500,700,900,700,500].forEach((f,i)=>setTimeout(()=>tone(f,0.08,'sine',0.08),i*40)); break;
        case 'shotgun': [260,220,180].forEach((f,i)=>setTimeout(()=>tone(f,0.05,'square',0.1),i*18)); break;
        case 'laser': ramp(1400,400,0.18,'sine',0.09); break;
        case 'grenade': tone(140,0.1,'square',0.1); setTimeout(()=>tone(90,0.1,'sawtooth',0.08),45); break;
        case 'explode': tone(120,0.22,'sawtooth',0.12); setTimeout(()=>tone(70,0.18,'square',0.07),55); break;
        case 'shop': [700,900,1100].forEach((f,i)=>setTimeout(()=>tone(f,0.08,'sine',0.07),i*55)); break;
        case 'switch': [500,750].forEach((f,i)=>setTimeout(()=>tone(f,0.06,'sine',0.06),i*40)); break;
        default: break;
      }
    }

    /* ============ WORLD DATA ============ */
    const scrollGroup = new THREE.Group();
    scene.add(scrollGroup);
    let groundSegs = [], wallArr = [], obstacles = [], movingObs = [], coinList = [],
      gemList = [], powerUpList = [], ammoBoxes = [], particles = [], decos = [],
      bullets = [], speedLines = [], ziplines = [], weatherParts = [], crossroads = [],
      rampagePickups = [], boats = [];
    const matRampage = new THREE.MeshStandardMaterial({ color: 0xff4400, metalness: 0.8, roughness: 0.2, emissive: 0xff2200, emissiveIntensity: 0.6 });
    let animId, lastTime = 0, groundZ = 0, obsZ = -30, guardian = null, boss = null;
    const LANES = [-2, 0, 2], GLEN = 20, GRAV = -0.02;

    const biomes = [
      { name: 'Temple', sky: 0x1a1a2e, fog: 0x1a1a2e, ground: 0x6b5540, groundAlt: 0xb0a080, wall: 0x3a2518, weather: null },
      { name: 'Jungle', sky: 0x1a3a1a, fog: 0x2a4a2a, ground: 0x3a5a2a, groundAlt: 0x5a7a4a, wall: 0x2a3a1a, weather: 'leaves' },
      { name: 'Cave', sky: 0x050510, fog: 0x0a0a1a, ground: 0x3a3a4a, groundAlt: 0x5a5a6a, wall: 0x1a1a2a, weather: 'dust' },
      { name: 'Desert', sky: 0x6a5a3a, fog: 0x5a4a2a, ground: 0xc9a87e, groundAlt: 0xe9c89e, wall: 0x8a6a4a, weather: 'sand' },
      { name: 'Ice', sky: 0x2a4a6a, fog: 0x3a5a7a, ground: 0xaaccee, groundAlt: 0xddeeff, wall: 0x6a8aaa, weather: 'snow' },
      { name: 'Lava', sky: 0x2a0a0a, fog: 0x3a0a0a, ground: 0x4a1a1a, groundAlt: 0x6a2a2a, wall: 0x1a0a0a, weather: 'ember' },
      { name: 'Sky', sky: 0x4a7aaa, fog: 0x5a8abb, ground: 0xaaccdd, groundAlt: 0xcceeff, wall: 0x8aaacc, weather: 'cloud' },
      { name: 'Night', sky: 0x050515, fog: 0x0a0a2a, ground: 0x2a2a4a, groundAlt: 0x4a4a6a, wall: 0x1a1a2a, weather: 'star' }
    ];
    let currentBiome = biomes[0];

    /* ============ ACHIEVEMENTS ============ */
    const achievements = {};
    const achieveNames = {
      dist500: '🏃 Explorer — 500m', dist1000: '🗺️ Adventurer — 1000m',
      dist2500: '🏔️ Trailblazer — 2500m', dist5000: '🌍 World Runner — 5000m',
      coins50: '🪙 Coin Collector', coins100: '💰 Rich Runner',
      coins200: '🤑 Gold Hoarder', killGuard: '⚔️ Guardian Slayer',
      killBoss: '👹 Boss Killer', combo20: '🔥 Combo Master'
    };

    /* ============ MISSIONS ============ */
    let missionList = [];
    function genMissions() {
      const ct = 30 + Math.floor(Math.random() * 30);
      const dt2 = 500 + Math.floor(Math.random() * 500);
      return [
        { desc: `Collect ${ct} coins`, type: 'coins', target: ct, done: false },
        { desc: `Run ${dt2}m`, type: 'dist', target: dt2, done: false },
        { desc: 'Kill the Guardian', type: 'killGuard', target: 1, done: false }
      ];
    }

    /* ============ GAME STATE ============ */
    function newGS() {
      return {
        inMenu: true, started: false, over: false, paused: false,
        speed: 0.22, dist: 0, coins: 0, gems: 0, combo: 0, mult: 1, lastCoin: 0,
        shield: 0, magnet: 0, guardDist: -100, guardianHealth: 3,
        ammo: 12, resurrected: false,
        superMode: false,
        weapon: 'pistol', grenades: 2,
        bgmT: 0.12, bgmStep: 0,
        shopMode: 0,
        turnCooldown: 0, turnSwoop: 0,
        bossActive: false, bossHealth: 0, deathAnim: 0, guardsKilled: 0,
        lastBossDist: 0,
        rampage: 0, rampageShotTimer: 0,
        trackType: 'normal'
      };
    }
    function newPS() {
      return { lane: 1, y: 0, vy: 0, jumping: false, canDbl: true, ducking: false, duckT: 0, runT: 0, fastFall: false, onZipline: false, zipT: 0, zipDown: false, zipStartY: 0 };
    }
    let gs = newGS(), ps = newPS();

    /* ============ PLAYER ============ */
    const player = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.4), new THREE.MeshStandardMaterial({ color: 0x4488ff }));
    body.position.y = 1.2; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffccaa }));
    head.position.y = 2; head.castShadow = true;
    const legG = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const legM = new THREE.MeshStandardMaterial({ color: 0x224488 });
    const lLeg = new THREE.Mesh(legG, legM); lLeg.position.set(-0.15, 0.4, 0);
    const rLeg = new THREE.Mesh(legG, legM); rLeg.position.set(0.15, 0.4, 0);
    const armG = new THREE.BoxGeometry(0.15, 0.55, 0.15);
    const armM = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const lArm = new THREE.Mesh(armG, armM); lArm.position.set(-0.45, 1.2, 0);
    const rArm = new THREE.Mesh(armG, armM); rArm.position.set(0.45, 1.2, 0);
    // Gun on right arm
    const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 }));
    gunMesh.position.set(0, -0.22, -0.25);
    rArm.add(gunMesh);
    player.add(body, head, lLeg, rLeg, lArm, rArm);
    player.userData = { body, head, lLeg, rLeg, lArm, rArm };
    player.position.set(0, 0, 0);
    scene.add(player);

    // Shield visual bubble
    const shieldBubble = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    );
    shieldBubble.visible = false;
    shieldBubble.position.y = 1.2;
    player.add(shieldBubble);

    /* ============ GUARDIAN ============ */
    guardian = new THREE.Group();
    const gBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.8), matGuard);
    gBody.position.y = 1.5; gBody.castShadow = true;
    const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), matGuard);
    gHead.position.y = 2.6;
    const gEye1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    gEye1.position.set(-0.15, 2.7, 0.35);
    const gEye2 = gEye1.clone(); gEye2.position.set(0.15, 2.7, 0.35);
    guardian.add(gBody, gHead, gEye1, gEye2);
    guardian.position.set(0, 0, -100); guardian.visible = false;
    scene.add(guardian);

    /* ============ BOSS ============ */
    boss = new THREE.Group();
    const bBody = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 1.2), matBoss);
    bBody.position.y = 2; bBody.castShadow = true;
    const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), matBoss);
    bHead.position.y = 3.8;
    const bEye1 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    bEye1.position.set(-0.25, 3.9, 0.55);
    const bEye2 = bEye1.clone(); bEye2.position.set(0.25, 3.9, 0.55);
    const horn1 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0xaa0000 }));
    horn1.position.set(-0.3, 4.4, 0); horn1.rotation.z = 0.3;
    const horn2 = horn1.clone(); horn2.position.set(0.3, 4.4, 0); horn2.rotation.z = -0.3;
    boss.add(bBody, bHead, bEye1, bEye2, horn1, horn2);
    boss.position.set(0, 0, -200); boss.visible = false;
    scene.add(boss);

    /* ============ SPEED LINES ============ */
    for (let i = 0; i < 30; i++) {
      const sl = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.02, 3 + Math.random() * 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
      );
      sl.position.set((Math.random() - 0.5) * 14, Math.random() * 6, -20 - Math.random() * 40);
      scene.add(sl);
      speedLines.push(sl);
    }

    /* ============ SHOOTING ============ */
    function switchWeapon(next) {
      gs.weapon = next;
      setWeaponName(next[0].toUpperCase() + next.slice(1));
      sfx('switch');
      notify('🔫 Weapon: ' + (next[0].toUpperCase() + next.slice(1)));
    }

    function enterShop(side = 1) {
      gs.shopMode = 7;
      sfx('shop');
      notify('🛍️ Gift Shop Alley Open!');
      // short alley blocks
      for (let i = 0; i < 4; i++) {
        const zz = -8 - i * 8;
        const floor = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 7), new THREE.MeshStandardMaterial({ color: 0x4b3a2a, roughness: 0.9 }));
        floor.position.set(0, -0.2, zz); scrollGroup.add(floor); decos.push(floor);
        const sWallL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.2, 7), new THREE.MeshStandardMaterial({ color: 0x6a4d33, roughness: 0.9 }));
        sWallL.position.set(-3.8, 1.6, zz); scrollGroup.add(sWallL); decos.push(sWallL);
        const sWallR = sWallL.clone(); sWallR.position.x = 3.8; scrollGroup.add(sWallR); decos.push(sWallR);
      }
      const wp = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), matMagnet);
      wp.position.set(0, 1.2, -12); wp.userData = { type: 'weapon' }; scrollGroup.add(wp); powerUpList.push(wp);
      const gr = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), matGrenade);
      gr.position.set(-2, 0.6, -14); gr.userData = { type: 'grenade' }; scrollGroup.add(gr); ammoBoxes.push(gr);
      const am = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), matAmmo);
      am.position.set(2, 0.6, -16); am.userData = { type: 'ammo' }; scrollGroup.add(am); ammoBoxes.push(am);

      const shop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.2, 2.6), new THREE.MeshStandardMaterial({ color: 0x7c5d41, roughness: 0.85 }));
      shop.position.set(side * 7.2, 1.6, -10);
      scrollGroup.add(shop); decos.push(shop);
    }

    function shoot() {
      if (!gs.started || gs.over || gs.paused) return;
      const wpn = gs.weapon || 'pistol';
      if (wpn === 'pistol') {
        if (gs.ammo <= 0) return;
        gs.ammo--; setAmmo(gs.ammo);
        const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), matBullet);
        bullet.position.set(player.position.x, player.position.y + 1.2, player.position.z - 0.5);
        bullet.userData = { speed: 1.2, dmg: 1, pierce: 0 };
        scene.add(bullet); bullets.push(bullet); sfx('shoot');
      } else if (wpn === 'shotgun') {
        if (gs.ammo < 2) return;
        gs.ammo -= 2; setAmmo(gs.ammo);
        for (let i = -2; i <= 2; i++) {
          const pellet = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), matBullet);
          pellet.position.set(player.position.x, player.position.y + 1.2, player.position.z - 0.5);
          pellet.userData = { speed: 1.15, dmg: 1, pierce: 0, vx: i * 0.028 };
          scene.add(pellet); bullets.push(pellet);
        }
        sfx('shotgun');
      } else if (wpn === 'laser') {
        if (gs.ammo < 3) return;
        gs.ammo -= 3; setAmmo(gs.ammo);
        const laser = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), matLaser);
        laser.position.set(player.position.x, player.position.y + 1.2, player.position.z - 0.5);
        laser.userData = { speed: 2.2, dmg: 2, pierce: 3 };
        scene.add(laser); bullets.push(laser); sfx('laser');
      } else if (wpn === 'grenade') {
        if (gs.grenades <= 0) return;
        gs.grenades--; setGrenades(gs.grenades);
        const g = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), matGrenade);
        g.position.set(player.position.x, player.position.y + 1.1, player.position.z - 0.5);
        g.userData = { speed: 0.75, dmg: 3, blast: 2.5, vy: 0.05, life: 2.4 };
        scene.add(g); bullets.push(g); sfx('grenade');
      }
      for (let i = 0; i < 3; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 4),
          new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true }));
        p.position.set(player.position.x + (Math.random() - 0.5) * 0.2, player.position.y + 1.2, player.position.z - 0.5);
        scene.add(p);
        particles.push({ mesh: p, vy: Math.random() * 0.05, life: 0.2, maxLife: 0.2 });
      }
    }

    /* ============ GROUND SPAWN ============ */
    function spawnGround(z) {
      const idx = Math.round(Math.abs(z) / GLEN);
      const tt = gs.trackType;
      let gMat, gMatA, wMat;
      switch (tt) {
        case 'dirt': gMat = matDirt; gMatA = matDirtAlt; wMat = matDirtWall; break;
        case 'water': gMat = matWater2; gMatA = matWaterAlt; wMat = matW; break;
        case 'ice': gMat = matIceGround; gMatA = matIceAlt; wMat = matIceWall; break;
        case 'lava': gMat = matLavaGround; gMatA = matLavaAlt; wMat = matLavaEdge; break;
        case 'minecart': gMat = matMineGround; gMatA = matMineAlt; wMat = matMineWall; break;
        case 'sky': gMat = matSkyGround; gMatA = matSkyAlt; wMat = matSkyWall; break;
        default: gMat = matG; gMatA = matGA; wMat = matW; break;
      }
      const g = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, GLEN), idx % 2 ? gMatA : gMat);
      g.position.set(0, -0.25, z); g.receiveShadow = true;
      scrollGroup.add(g); groundSegs.push(g);
      const wallH = tt === 'sky' ? 1.5 : tt === 'water' ? 2 : 3;
      for (const sx of [-3.75, 3.75]) {
        const wm = new THREE.Mesh(new THREE.BoxGeometry(0.5, wallH, GLEN), wMat);
        wm.position.set(sx, wallH / 2, z);
        scrollGroup.add(wm); wallArr.push(wm);
      }
      const laneCol = tt === 'water' ? 0x88ccff : tt === 'ice' ? 0xaaeeff : tt === 'lava' ? 0xff6600 : tt === 'minecart' ? 0x666666 : tt === 'sky' ? 0xaaaaff : 0xffcc44;
      const lMat = new THREE.MeshBasicMaterial({ color: laneCol, transparent: true, opacity: 0.6 });
      for (const lx of [-1.0, 1.0]) {
        const ln = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, GLEN), lMat);
        ln.position.set(lx, 0.02, z);
        scrollGroup.add(ln); decos.push(ln);
      }
      const barCol = tt === 'water' ? 0x4488cc : tt === 'lava' ? 0xff4400 : tt === 'minecart' ? 0x555555 : tt === 'sky' ? 0x8888cc : 0xff8844;
      const bMat2 = new THREE.MeshBasicMaterial({ color: barCol, transparent: true, opacity: 0.5 });
      for (let k = 0; k < 6; k++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(7, 0.04, 0.15), bMat2);
        bar.position.set(0, 0.02, z - GLEN / 2 + k * (GLEN / 6) + 1.5);
        scrollGroup.add(bar); decos.push(bar);
      }
      // Track-type decorations
      if (tt === 'water') {
        for (let k = 0; k < 4; k++) {
          const ripple = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.5, 8),
            new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
          ripple.rotation.x = -Math.PI / 2;
          ripple.position.set((Math.random() - 0.5) * 5, 0.05, z - Math.random() * GLEN);
          scrollGroup.add(ripple); decos.push(ripple);
        }
      } else if (tt === 'ice') {
        for (let k = 0; k < 3; k++) {
          const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 4),
            new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.7, metalness: 0.5 }));
          crystal.position.set(Math.random() < 0.5 ? -3.2 : 3.2, 0.5 + Math.random() * 2, z - Math.random() * GLEN);
          scrollGroup.add(crystal); decos.push(crystal);
        }
      } else if (tt === 'lava') {
        for (const sx of [-3.2, 3.2]) {
          const glow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, GLEN),
            new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.6 }));
          glow.position.set(sx, 0.08, z);
          scrollGroup.add(glow); decos.push(glow);
        }
      } else if (tt === 'minecart') {
        for (const lx of LANES) {
          for (const rx of [-0.3, 0.3]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, GLEN), matMineRail);
            rail.position.set(lx + rx, 0.05, z);
            scrollGroup.add(rail); decos.push(rail);
          }
        }
        for (let k = 0; k < 10; k++) {
          const tie = new THREE.Mesh(new THREE.BoxGeometry(6, 0.04, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x5a3e0a, roughness: 0.9 }));
          tie.position.set(0, 0.03, z - GLEN / 2 + k * (GLEN / 10) + 1);
          scrollGroup.add(tie); decos.push(tie);
        }
      } else if (tt === 'sky') {
        for (let k = 0; k < 3; k++) {
          const cloud = new THREE.Mesh(new THREE.SphereGeometry(1 + Math.random(), 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
          cloud.position.set((Math.random() - 0.5) * 10, -2 - Math.random() * 3, z - Math.random() * GLEN);
          scrollGroup.add(cloud); decos.push(cloud);
        }
      } else if (tt === 'dirt') {
        for (let k = 0; k < 5; k++) {
          for (const sx of [-3.5, 3.5]) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.5, 0.15),
              new THREE.MeshStandardMaterial({ color: 0x6B4F12, roughness: 0.9 }));
            post.position.set(sx, 0.75, z - k * 4);
            scrollGroup.add(post); decos.push(post);
          }
        }
      }
    }

    /* ============ OBSTACLE ROW SPAWN ============ */
    function spawnRow(z) {
      const r = Math.random;
      const rnd = r();
      const d = gs.dist;
      const tt = gs.trackType;

      // --- Crossroad (dead-end intersection — TURN OR DIE!) ---
      if (r() < 0.07 && d > 80 && gs.turnCooldown <= 0) {
        gs.turnCooldown = 18;
        // Dead-end wall — massive, can't jump over
        const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.8 }));
        wall.position.set(0, 3, z);
        wall.userData = { type: 'deadwall', triggered: false };
        scrollGroup.add(wall); obstacles.push(wall); crossroads.push(wall);
        // Wall cap
        const cap2 = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.6, 2),
          new THREE.MeshStandardMaterial({ color: 0x663311, roughness: 0.7 }));
        cap2.position.set(0, 6.3, z); scrollGroup.add(cap2); decos.push(cap2);
        // Warning stripes on wall face
        for (let ws = 0; ws < 3; ws++) {
          const wStripe = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.35, 0.1),
            new THREE.MeshBasicMaterial({ color: ws % 2 ? 0xffaa00 : 0xff0000 }));
          wStripe.position.set(0, 1.2 + ws * 1.5, z + 0.8);
          scrollGroup.add(wStripe); decos.push(wStripe);
        }
        // Left branch path
        const leftG2 = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 7),
          new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.9 }));
        leftG2.position.set(-11.5, -0.25, z); scrollGroup.add(leftG2); decos.push(leftG2);
        for (const wz2 of [-3.75, 3.75]) {
          const lw2 = new THREE.Mesh(new THREE.BoxGeometry(16, 3, 0.5), matW);
          lw2.position.set(-11.5, 1.5, z + wz2); scrollGroup.add(lw2); decos.push(lw2);
        }
        // Right branch path
        const rightG2 = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 7),
          new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.9 }));
        rightG2.position.set(11.5, -0.25, z); scrollGroup.add(rightG2); decos.push(rightG2);
        for (const wz2 of [-3.75, 3.75]) {
          const rw2 = new THREE.Mesh(new THREE.BoxGeometry(16, 3, 0.5), matW);
          rw2.position.set(11.5, 1.5, z + wz2); scrollGroup.add(rw2); decos.push(rw2);
        }
        // Green arrow signs pointing left & right
        const lArr2 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 4),
          new THREE.MeshBasicMaterial({ color: 0x00ff44 }));
        lArr2.position.set(-2.5, 4.5, z + 1.5); lArr2.rotation.z = Math.PI / 2;
        scrollGroup.add(lArr2); decos.push(lArr2);
        const rArr2 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 4),
          new THREE.MeshBasicMaterial({ color: 0x00ff44 }));
        rArr2.position.set(2.5, 4.5, z + 1.5); rArr2.rotation.z = -Math.PI / 2;
        scrollGroup.add(rArr2); decos.push(rArr2);
        // Warning beacons on top
        for (const xp of [-2, 0, 2]) {
          const bec = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff4400 }));
          bec.position.set(xp, 6.8, z); scrollGroup.add(bec); decos.push(bec);
        }
        // Ground warning stripes approaching crossroad
        for (let ws = 0; ws < 6; ws++) {
          const gStrip = new THREE.Mesh(new THREE.BoxGeometry(7, 0.08, 0.5),
            new THREE.MeshBasicMaterial({ color: ws % 2 ? 0xffaa00 : 0xff4400 }));
          gStrip.position.set(0, 0.06, z + 3 + ws * 2.5);
          scrollGroup.add(gStrip); decos.push(gStrip);
        }
        return; // No other obstacles at a crossroad
      }

      // --- Track-specific unique obstacles ---
      if (tt === 'water') {
        const numBoats = 1 + Math.floor(r() * 2);
        const used = [];
        for (let b = 0; b < numBoats; b++) {
          let l; do { l = Math.floor(r() * 3); } while (used.includes(l));
          used.push(l);
          const boat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 14), matBoat);
          boat.position.set(LANES[l], 0.15, z - 7);
          boat.userData = { type: 'boat', lane: l };
          scrollGroup.add(boat); boats.push(boat);
          for (const bsx of [-0.85, 0.85]) {
            const bRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 14),
              new THREE.MeshStandardMaterial({ color: 0x6B4020, roughness: 0.8 }));
            bRail.position.set(LANES[l] + bsx, 0.32, z - 7);
            scrollGroup.add(bRail); decos.push(bRail);
          }
          if (r() < 0.3) {
            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6),
              new THREE.MeshStandardMaterial({ color: 0x8B5A2B }));
            mast.position.set(LANES[l], 1.2, z - 7);
            scrollGroup.add(mast); decos.push(mast);
          }
        }
        for (let l = 0; l < 3; l++) {
          if (used.includes(l)) continue;
          if (r() < 0.5) {
            const splash = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6),
              new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.4 }));
            splash.position.set(LANES[l], 0.3, z - 3 - r() * 8);
            scrollGroup.add(splash); decos.push(splash);
          }
        }
      } else if (tt === 'ice') {
        if (r() < 0.35) {
          const il = Math.floor(r() * 3);
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5, 5),
            new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.8 }));
          spike.position.set(LANES[il], 0.75, z);
          spike.userData = { type: 'jump' };
          scrollGroup.add(spike); obstacles.push(spike);
        }
        if (r() < 0.2) {
          const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.2, 5),
            new THREE.MeshStandardMaterial({ color: 0xcceeFF, transparent: true, opacity: 0.7 }));
          icicle.position.set(LANES[Math.floor(r() * 3)], 2.5, z - 4);
          icicle.rotation.x = Math.PI;
          icicle.userData = { type: 'duck' };
          scrollGroup.add(icicle); obstacles.push(icicle);
        }
      } else if (tt === 'lava') {
        if (r() < 0.3) {
          const gl2 = Math.floor(r() * 3);
          const geyser = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 2.5, 6),
            new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.7 }));
          geyser.position.set(LANES[gl2], 1.25, z);
          geyser.userData = { type: 'jump' };
          scrollGroup.add(geyser); obstacles.push(geyser);
          const glowBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 8),
            new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5 }));
          glowBase.position.set(LANES[gl2], 0.05, z);
          scrollGroup.add(glowBase); decos.push(glowBase);
        }
        if (r() < 0.2) {
          const lavaRock = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6),
            new THREE.MeshStandardMaterial({ color: 0x661100, emissive: 0x441100, emissiveIntensity: 0.5 }));
          lavaRock.position.set(LANES[Math.floor(r() * 3)], 1.0, z - 8);
          lavaRock.userData = { type: 'moving', speed: 0.2 + r() * 0.15 };
          scrollGroup.add(lavaRock); movingObs.push(lavaRock);
        }
      } else if (tt === 'dirt') {
        if (r() < 0.3) {
          const bl = Math.floor(r() * 3);
          const boulder = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6),
            new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 1.0 }));
          boulder.position.set(LANES[bl], 0.5, z);
          boulder.userData = { type: 'jump' };
          scrollGroup.add(boulder); obstacles.push(boulder);
        }
        if (r() < 0.2) {
          const mud = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 8),
            new THREE.MeshBasicMaterial({ color: 0x4a3010, transparent: true, opacity: 0.6 }));
          mud.position.set(LANES[Math.floor(r() * 3)], 0.04, z - 3);
          scrollGroup.add(mud); decos.push(mud);
        }
      } else if (tt === 'minecart') {
        if (r() < 0.3) {
          const cl2 = Math.floor(r() * 3);
          const cart = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.8),
            new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.4 }));
          cart.position.set(LANES[cl2], 0.4, z - 15);
          cart.userData = { type: 'train', speed: 0.2 + r() * 0.15 };
          scrollGroup.add(cart); movingObs.push(cart);
        }
        if (r() < 0.25) {
          const beam = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.4, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x5a3e0a, roughness: 0.9 }));
          beam.position.set(0, 1.3, z - 5);
          beam.userData = { type: 'duck' };
          scrollGroup.add(beam); obstacles.push(beam);
        }
      } else if (tt === 'sky') {
        if (r() < 0.25) {
          const wind = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xccddff, transparent: true, opacity: 0.6 }));
          wind.position.set(LANES[Math.floor(r() * 3)], 1.0 + r() * 0.8, z - 8);
          wind.userData = { type: 'moving', speed: 0.3 + r() * 0.2 };
          scrollGroup.add(wind); movingObs.push(wind);
        }
        if (r() < 0.12) {
          const skyGap = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 4),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 }));
          skyGap.position.set(0, -0.3, z - 2);
          skyGap.userData = { type: 'gap' };
          scrollGroup.add(skyGap); obstacles.push(skyGap);
          for (let s = 0; s < 3; s++) {
            const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 4, 4),
              new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }));
            wisp.position.set((r() - 0.5) * 6, -0.2, z - 2 + (r() - 0.5) * 3);
            scrollGroup.add(wisp); decos.push(wisp);
          }
          return;
        }
      }

      // --- Gaps (visible holes with red edges) ---
      if (rnd < 0.09 && d > 60) {
        const eL = new THREE.Mesh(new THREE.BoxGeometry(7, 0.2, 0.25),
          new THREE.MeshBasicMaterial({ color: 0xff4444 }));
        eL.position.set(0, 0.08, z + 1.8);
        scrollGroup.add(eL); decos.push(eL);
        const eR = eL.clone(); eR.position.set(0, 0.08, z - 1.8);
        scrollGroup.add(eR); decos.push(eR);
        // Danger stripes
        for (let s = -2; s <= 2; s++) {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 3.6),
            new THREE.MeshBasicMaterial({ color: Math.abs(s) % 2 ? 0xffaa00 : 0x000000 }));
          stripe.position.set(s * 1.5, 0.05, z);
          scrollGroup.add(stripe); decos.push(stripe);
        }
        const gapFloor = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 3.6),
          new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.9 }));
        gapFloor.position.set(0, -0.3, z);
        gapFloor.userData = { type: 'gap' };
        scrollGroup.add(gapFloor); obstacles.push(gapFloor);
        return;
      }

      // --- Ziplines: normal (flat) and downward (sloped descent) ---
      if (r() < 0.09 && d > 50) {
        const zLane = Math.floor(r() * 3);
        const isDownward = r() < 0.4; // 40% chance downward zipline
        const wireLen = isDownward ? 22 : 18;
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, wireLen, 6), matZip);
        wire.rotation.z = Math.PI / 2;
        wire.rotation.x = isDownward ? 0.35 : 0.12; // steeper angle for downward
        const wireY = isDownward ? 4.5 : 3.5;
        wire.position.set(LANES[zLane], wireY, z - 8);
        wire.userData = { type: 'zipline', lane: zLane, downward: isDownward };
        scrollGroup.add(wire); ziplines.push(wire);
        // Start pole (tall)
        const startPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, isDownward ? 6 : 4, 6), matZip);
        startPole.position.set(LANES[zLane], isDownward ? 3 : 2, z);
        scrollGroup.add(startPole); decos.push(startPole);
        // End pole (shorter for downward)
        const endPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, isDownward ? 2.5 : 4, 6), matZip);
        endPole.position.set(LANES[zLane], isDownward ? 1.25 : 2, z - 16);
        scrollGroup.add(endPole); decos.push(endPole);
        // Grab handle indicator (bright yellow)
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.2),
          new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.5 }));
        handle.position.set(LANES[zLane], wireY - 0.3, z - 1);
        scrollGroup.add(handle); decos.push(handle);
        // Label
        if (isDownward) {
          const marker = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.15),
            new THREE.MeshBasicMaterial({ color: 0xff8800 }));
          marker.position.set(LANES[zLane], wireY + 0.3, z - 1);
          scrollGroup.add(marker); decos.push(marker);
        }
      }

      // --- Red obstacles (jump over) ---
      if (rnd < 0.50) {
        const lane = Math.floor(r() * 3);
        const stacked = r() < 0.18 && d > 120;
        const o = new THREE.Mesh(new THREE.BoxGeometry(1.6, stacked ? 1.8 : 1, 0.5), matObs);
        o.position.set(LANES[lane], stacked ? 0.9 : 0.5, z);
        o.userData = { type: 'jump' };
        scrollGroup.add(o); obstacles.push(o);
        if (r() < 0.3) {
          const l2 = (lane + 1 + Math.floor(r() * 2)) % 3;
          const o2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 0.5), matObs);
          o2.position.set(LANES[l2], 0.5, z); o2.userData = { type: 'jump' };
          scrollGroup.add(o2); obstacles.push(o2);
        }
        // Pyramid
        if (r() < 0.1 && d > 200) {
          for (let i = 0; i < 3; i++) {
            const po = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.4), matObs);
            po.position.set(LANES[i], 0.3, z - 2); po.userData = { type: 'jump' };
            scrollGroup.add(po); obstacles.push(po);
          }
        }
      }
      // --- Green logs (duck under) ---
      else {
        const o = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 0.4), matDuck);
        o.position.set(0, 1.3, z); o.userData = { type: 'duck' };
        scrollGroup.add(o); obstacles.push(o);
      }

      // --- Blue moving projectiles ---
      if (r() < 0.18 && d > 40) {
        const ml = Math.floor(r() * 3);
        const mObs = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), matMoving);
        mObs.position.set(LANES[ml], 1.0 + r() * 0.8, z - 10);
        mObs.userData = { type: 'moving', speed: 0.25 + r() * 0.15 };
        scrollGroup.add(mObs); movingObs.push(mObs);
      }

      // --- Ramps ---
      if (r() < 0.14 && d > 60) {
        const rl = Math.floor(r() * 3);
        const rampM = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 4), matRamp);
        rampM.position.set(LANES[rl], 0.15, z - 6); rampM.rotation.x = -0.3;
        scrollGroup.add(rampM); decos.push(rampM);
      }

      // --- Hanging vines (COLLIDABLE — duck under!) ---
      if (r() < 0.12 && d > 60) {
        const vl = Math.floor(r() * 3);
        const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 2.5, 6), matVine);
        vine.position.set(LANES[vl], 2.2, z - 4);
        vine.userData = { type: 'duck' };
        scrollGroup.add(vine); obstacles.push(vine);
        for (let lf = 0; lf < 3; lf++) {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.15, 4, 4), matVine);
          leaf.position.set(LANES[vl] + (Math.random() - 0.5) * 0.4, 1.8 + lf * 0.4, z - 4 + (Math.random() - 0.5) * 0.3);
          scrollGroup.add(leaf); decos.push(leaf);
        }
      }

      // --- Pillars (decorative) ---
      if (r() < 0.2) {
        const side = r() < 0.5 ? -4.5 : 4.5;
        const pH = 3 + r() * 2;
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, pH, 0.8), matPillar);
        pillar.position.set(side, pH / 2, z - 3); pillar.castShadow = true;
        scrollGroup.add(pillar); decos.push(pillar);
      }

      // --- Trains ---
      if (r() < 0.1 && d > 120) {
        const tl = Math.floor(r() * 3);
        const train = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 5), matTrain);
        train.position.set(LANES[tl], 0.6, z - 20);
        train.userData = { type: 'train', speed: 0.15 + r() * 0.1 };
        scrollGroup.add(train); movingObs.push(train);
      }

      // --- Crumbling ground ---
      if (r() < 0.06 && d > 150) {
        const cLane = Math.floor(r() * 3);
        const crumble = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 2.2),
          new THREE.MeshStandardMaterial({ color: 0x8b6540, roughness: 0.9 }));
        crumble.position.set(LANES[cLane], 0.02, z - 3);
        crumble.userData = { type: 'crumble', timer: 1.2, shaking: false, falling: false, fallVy: 0 };
        scrollGroup.add(crumble); obstacles.push(crumble);
        // Crack lines on crumble
        const crack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.04),
          new THREE.MeshBasicMaterial({ color: 0x333333 }));
        crack.position.set(LANES[cLane], 0.2, z - 3);
        scrollGroup.add(crack); decos.push(crack);
      }

      // --- Coins ---
      const cl = Math.floor(r() * 3);
      for (let k = 0; k < 3; k++) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 8), matCoin);
        c.position.set(LANES[cl], 1.2, z - k * 2.2); c.rotation.x = Math.PI / 2;
        scrollGroup.add(c); coinList.push(c);
      }

      // --- Gems ---
      if (r() < 0.14) {
        const gl = Math.floor(r() * 3);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), matGem);
        gem.position.set(LANES[gl], 1.5, z - 5);
        scrollGroup.add(gem); gemList.push(gem);
      }

      // --- Power-ups (shield / magnet) MORE COMMON ---
      if (r() < 0.14 && d > 20) {
        const pl = Math.floor(r() * 3);
        const pType = r() < 0.5 ? 'shield' : 'magnet';
        const pMat = pType === 'shield' ? matShield : matMagnet;
        const pup = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 10), pMat);
        pup.position.set(LANES[pl], 1.5, z - 8);
        pup.userData = { type: pType };
        scrollGroup.add(pup); powerUpList.push(pup);
        // Glow ring
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 16),
          new THREE.MeshBasicMaterial({ color: pType === 'shield' ? 0x00ffff : 0xff3366, transparent: true, opacity: 0.5 }));
        ring.position.set(LANES[pl], 1.5, z - 8);
        scrollGroup.add(ring); decos.push(ring);
      }

      // --- Ammo boxes (FREQUENT) ---
      if (r() < 0.20) {
        const al = Math.floor(r() * 3);
        const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matAmmo);
        ammoBox.position.set(LANES[al], 0.5, z - 6);
        ammoBox.userData = { type: 'ammo' };
        scrollGroup.add(ammoBox); ammoBoxes.push(ammoBox);
        // Bullet icon on box
        const bIcon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 6),
          new THREE.MeshBasicMaterial({ color: 0xffff00 }));
        bIcon.position.set(LANES[al], 0.5, z - 6 + 0.28);
        bIcon.rotation.x = Math.PI / 2;
        scrollGroup.add(bIcon); decos.push(bIcon);
      }

      // --- RAMPAGE pickup (rare, epic power-up: bullets everywhere) ---
      if (r() < 0.03 && d > 150) {
        const rl = Math.floor(r() * 3);
        const rpick = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), matRampage);
        rpick.position.set(LANES[rl], 1.5, z - 9);
        rpick.userData = { type: 'rampage' };
        scrollGroup.add(rpick); rampagePickups.push(rpick);
        // Fire ring around it
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 8, 16),
          new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.6 }));
        ring.position.set(LANES[rl], 1.5, z - 9);
        scrollGroup.add(ring); decos.push(ring);
      }

      // --- Shootable gift-shop entrance box ---
      if (r() < 0.045 && d > 140 && gs.shopMode <= 0) {
        const side = r() < 0.5 ? -1 : 1;
        const storefront = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.2, 2.6), new THREE.MeshStandardMaterial({ color: 0x7c5d41, roughness: 0.85 }));
        storefront.position.set(side * 7.2, 1.6, z - 4);
        scrollGroup.add(storefront); decos.push(storefront);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.15), new THREE.MeshBasicMaterial({ color: 0xffcc44 }));
        sign.position.set(side * 7.2, 3.4, z - 4); scrollGroup.add(sign); decos.push(sign);
        const triggerLane = Math.floor(r() * 3);
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0xff44aa }));
        trigger.position.set(LANES[triggerLane], 0.8, z - 1);
        trigger.userData = { type: 'shopTrigger', side };
        scrollGroup.add(trigger); obstacles.push(trigger);
      }
    }

    /* ============ MAIN LOOP ============ */
    function loop(now) {
      if (disposed) return;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (gs.started && !gs.over && !gs.paused) update(dt);

      // Death animation (tumble)
      if (gs.over && gs.deathAnim > 0) {
        gs.deathAnim -= dt;
        player.rotation.x += dt * 8;
        player.position.y += dt * (gs.deathAnim > 0.3 ? 3 : -5);
        if (player.position.y < -5) gs.deathAnim = 0;
      }

      if (!gs.paused) {
        for (const c of coinList) c.rotation.z += dt * 3;
        for (const g of gemList) { g.rotation.y += dt * 2; g.rotation.z += dt * 1.5; }
        for (const p of powerUpList) { p.rotation.y += dt * 3; }
        for (const a of ammoBoxes) { a.rotation.y += dt * 2; }
        for (const m of movingObs) { m.rotation.x += dt * 5; m.rotation.y += dt * 3; }
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(loop);
    }

    /* ============ UPDATE ============ */
    function update(dt) {
      const spd = gs.speed * dt * 60;
      gs.speed = Math.min(0.55, gs.speed + 0.004 * dt);
      gs.dist += spd * 5;

      // --- Background music loop ---
      gs.bgmT -= dt;
      if (gs.bgmT <= 0 && gs.started && !gs.paused && !gs.over) {
        const seq = [220, 247, 294, 262, 196, 247, 294, 330];
        tone(seq[gs.bgmStep % seq.length], 0.16, 'triangle', 0.02);
        if (gs.bgmStep % 4 === 0) tone(90, 0.1, 'sine', 0.03);
        gs.bgmStep++;
        gs.bgmT = 0.28;
      }

      if (gs.shopMode > 0) {
        gs.shopMode -= dt;
        if (gs.shopMode <= 0) notify('🏁 Leaving Gift Shop Alley');
      }

      // --- Biome transitions (every 300 distance) ---
      const biomeIdx = Math.floor(gs.dist / 300) % biomes.length;
      if (currentBiome !== biomes[biomeIdx]) {
        currentBiome = biomes[biomeIdx];
        scene.background.setHex(currentBiome.sky);
        scene.fog.color.setHex(currentBiome.fog);
        matG.color.setHex(currentBiome.ground);
        matGA.color.setHex(currentBiome.groundAlt);
        matW.color.setHex(currentBiome.wall);
        notify('🌍 ' + currentBiome.name + ' Biome');
        setBiomeName(currentBiome.name);
      }

      // --- Speed lines ---
      const slOpacity = Math.max(0, (gs.speed - 0.25) / 0.3) * 0.4;
      for (const sl of speedLines) {
        sl.material.opacity = slOpacity;
        sl.position.z += spd * 2;
        if (sl.position.z > 10) sl.position.z = -20 - Math.random() * 40;
      }

      // --- Weather particles ---
      if (currentBiome.weather) spawnWeather();
      for (let i = weatherParts.length - 1; i >= 0; i--) {
        const wp = weatherParts[i];
        wp.life -= dt;
        if (wp.life <= 0) { scene.remove(wp.mesh); weatherParts.splice(i, 1); continue; }
        wp.mesh.position.y += wp.vy * dt * 60;
        wp.mesh.position.x += (wp.vx || 0) * dt * 60;
        wp.mesh.position.z += spd;
        wp.mesh.material.opacity = Math.min(0.7, wp.life / wp.maxLife);
      }

      // --- Turn cooldown ---
      if (gs.turnCooldown > 0) gs.turnCooldown -= dt;

      // --- Crossroad processing (dead-end intersections) ---
      let crossroadNear = false;
      for (let i = crossroads.length - 1; i >= 0; i--) {
        const cw = crossroads[i];
        if (!cw.userData.triggered && cw.position.z > -12 && cw.position.z < 8) {
          crossroadNear = true;
        }
        // Recycle passed crossroads
        if (cw.position.z > 20) {
          scrollGroup.remove(cw);
          const oi = obstacles.indexOf(cw);
          if (oi >= 0) obstacles.splice(oi, 1);
          crossroads.splice(i, 1);
        }
      }
      setTurnPrompt(crossroadNear);

      // --- Camera turn swoosh effect ---
      if (gs.turnSwoop > 0) {
        gs.turnSwoop -= dt;
        const swoopT = gs.turnSwoop / 0.5;
        camera.fov = 70 + Math.sin(swoopT * Math.PI) * 15;
        camera.updateProjectionMatrix();
      } else if (Math.abs(camera.fov - 70) > 0.1) {
        camera.fov = 70;
        camera.updateProjectionMatrix();
      }

      // --- Power-up timers ---
      if (gs.shield > 0) {
        gs.shield -= dt;
        shieldBubble.visible = true;
        shieldBubble.material.opacity = 0.15 + Math.sin(lastTime * 0.01) * 0.05;
        if (gs.shield <= 0) { setPowerUp(null); shieldBubble.visible = false; }
      } else { shieldBubble.visible = false; }
      if (gs.magnet > 0) { gs.magnet -= dt; if (gs.magnet <= 0 && gs.shield <= 0) setPowerUp(null); }

      // --- Scroll everything ---
      const ch = scrollGroup.children;
      for (let i = 0, n = ch.length; i < n; i++) ch[i].position.z += spd;

      // --- Recycle ---
      for (let i = groundSegs.length - 1; i >= 0; i--)
        if (groundSegs[i].position.z > 22) { scrollGroup.remove(groundSegs[i]); groundSegs.splice(i, 1); }
      for (let i = wallArr.length - 1; i >= 0; i--)
        if (wallArr[i].position.z > 22) { scrollGroup.remove(wallArr[i]); wallArr.splice(i, 1); }
      for (let i = decos.length - 1; i >= 0; i--)
        if (decos[i].position.z > 22) { scrollGroup.remove(decos[i]); decos.splice(i, 1); }
      while (groundSegs.length < 8) { groundZ -= GLEN; spawnGround(groundZ); }
      groundZ += spd;

      for (let i = obstacles.length - 1; i >= 0; i--)
        if (obstacles[i].position.z > 15) { scrollGroup.remove(obstacles[i]); obstacles.splice(i, 1); }
      for (let i = movingObs.length - 1; i >= 0; i--)
        if (movingObs[i].position.z > 15) { scrollGroup.remove(movingObs[i]); movingObs.splice(i, 1); }
      for (let i = coinList.length - 1; i >= 0; i--)
        if (coinList[i].position.z > 15) { scrollGroup.remove(coinList[i]); coinList.splice(i, 1); }
      for (let i = gemList.length - 1; i >= 0; i--)
        if (gemList[i].position.z > 15) { scrollGroup.remove(gemList[i]); gemList.splice(i, 1); }
      for (let i = powerUpList.length - 1; i >= 0; i--)
        if (powerUpList[i].position.z > 15) { scrollGroup.remove(powerUpList[i]); powerUpList.splice(i, 1); }
      for (let i = ammoBoxes.length - 1; i >= 0; i--)
        if (ammoBoxes[i].position.z > 15) { scrollGroup.remove(ammoBoxes[i]); ammoBoxes.splice(i, 1); }
      for (let i = ziplines.length - 1; i >= 0; i--)
        if (ziplines[i].position.z > 25) { scrollGroup.remove(ziplines[i]); ziplines.splice(i, 1); }
      for (let i = boats.length - 1; i >= 0; i--)
        if (boats[i].position.z > 20) { scrollGroup.remove(boats[i]); boats.splice(i, 1); }
      obsZ += spd;
      while (obsZ > groundZ + 30) { obsZ -= 15; spawnRow(obsZ); }

      // --- RAMPAGE power-up timer & auto-shooting ---
      if (gs.rampage > 0) {
        gs.rampage -= dt;
        gs.rampageShotTimer -= dt;
        if (gs.rampageShotTimer <= 0) {
          gs.rampageShotTimer = 0.08; // fire every 80ms
          // Shoot in 3 directions: forward, forward-left, forward-right
          for (const xOff of [-1.5, 0, 1.5]) {
            const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), matBullet);
            bullet.position.set(player.position.x + xOff, player.position.y + 1.2, player.position.z - 0.5);
            scene.add(bullet); bullets.push(bullet);
          }
          // Random sideways bullets too
          if (Math.random() < 0.3) {
            for (const xOff of [-3, 3]) {
              const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), matBullet);
              bullet.position.set(player.position.x + xOff, player.position.y + 1 + Math.random(), player.position.z - Math.random() * 3);
              scene.add(bullet); bullets.push(bullet);
            }
          }
          if (Math.random() < 0.4) sfx('destroy');
        }
        // Flash player body during rampage
        body.material.emissive = new THREE.Color(0xff4400);
        body.material.emissiveIntensity = 0.3 + Math.sin(lastTime * 0.02) * 0.2;
        if (gs.rampage <= 0) {
          gs.rampage = 0; setRampage(false); setPowerUp(null);
          body.material.emissive = new THREE.Color(0x000000);
          body.material.emissiveIntensity = 0;
          notify('💥 Rampage Over!');
        }
      }

      // --- Rampage pickups recycle ---
      for (let i = rampagePickups.length - 1; i >= 0; i--) {
        const rp = rampagePickups[i];
        rp.rotation.y += dt * 4; rp.rotation.x += dt * 2;
        if (rp.position.z > 15) { scrollGroup.remove(rp); rampagePickups.splice(i, 1); }
      }

      // --- Rampage pickup collect ---
      for (let i = rampagePickups.length - 1; i >= 0; i--) {
        const rp = rampagePickups[i];
        if (Math.abs(player.position.x - rp.position.x) < 1.2 && Math.abs(rp.position.z) < 1.5) {
          scrollGroup.remove(rp); rampagePickups.splice(i, 1);
          gs.rampage = 5; gs.rampageShotTimer = 0; // 5 seconds of chaos
          setRampage(true); setPowerUp('rampage');
          sfx('rampage'); notify('🔥💥 RAMPAGE MODE! 🔥💥');
        }
      }

      // --- Moving obstacles update ---
      for (const m of movingObs) {
        m.position.z += (m.userData.speed + gs.speed * 0.3) * dt * 60;
      }

      // --- Crumbling ground ---
      for (const o of obstacles) {
        if (o.userData.type !== 'crumble') continue;
        const dz = Math.abs(o.position.z);
        const dx = Math.abs(player.position.x - o.position.x);
        if (dx < 1.2 && dz < 1.5 && !o.userData.shaking && !o.userData.falling) {
          o.userData.shaking = true; sfx('crumble');
        }
        if (o.userData.shaking && !o.userData.falling) {
          o.userData.timer -= dt;
          o.position.x += (Math.random() - 0.5) * 0.08;
          if (o.userData.timer <= 0) { o.userData.falling = true; o.userData.fallVy = 0; }
        }
        if (o.userData.falling) {
          o.userData.fallVy -= 0.03;
          o.position.y += o.userData.fallVy;
        }
      }

      // --- Bullets ---
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const bd = b.userData || {};
        b.position.z -= (bd.speed || 1.2);
        if (bd.vx) b.position.x += bd.vx;
        if (bd.vy !== undefined) { bd.vy += GRAV * 0.55; b.position.y += bd.vy; }
        if (bd.life !== undefined) bd.life -= dt;

        // Hit shop trigger / destroyable obstacles
        let consumed = false;
        for (let j = obstacles.length - 1; j >= 0; j--) {
          const o = obstacles[j];
          const odx = Math.abs(b.position.x - o.position.x);
          const odz = Math.abs(b.position.z - o.position.z);
          if (odx > 1.1 || odz > 1.1) continue;
          if (o.userData.type === 'shopTrigger') {
            const side = o.userData.side || 1;
            scrollGroup.remove(o); obstacles.splice(j, 1);
            enterShop(side);
            if ((bd.pierce || 0) <= 0) { scene.remove(b); bullets.splice(i, 1); consumed = true; }
            else bd.pierce--;
            break;
          }
          if (o.userData.type !== 'gap' && o.userData.type !== 'deadwall') {
            hitBurst(o.position.x, o.position.y + 0.5, o.position.z);
            scrollGroup.remove(o); obstacles.splice(j, 1);
            if ((bd.pierce || 0) <= 0) { scene.remove(b); bullets.splice(i, 1); consumed = true; }
            else bd.pierce--;
            break;
          }
        }
        if (consumed) continue;

        if (bd.blast && (bd.life <= 0 || b.position.y <= 0)) {
          sfx('explode');
          hitBurst(b.position.x, Math.max(0.2, b.position.y), b.position.z);
          for (let j = obstacles.length - 1; j >= 0; j--) {
            const o = obstacles[j];
            if (o.userData.type === 'gap' || o.userData.type === 'deadwall') continue;
            const odx = Math.abs(b.position.x - o.position.x);
            const odz = Math.abs(b.position.z - o.position.z);
            if (odx < bd.blast && odz < bd.blast) { scrollGroup.remove(o); obstacles.splice(j, 1); }
          }
          for (let j = movingObs.length - 1; j >= 0; j--) {
            const mo = movingObs[j];
            const mdx = Math.abs(b.position.x - mo.position.x);
            const mdz = Math.abs(b.position.z - mo.position.z);
            if (mdx < bd.blast && mdz < bd.blast) { scrollGroup.remove(mo); movingObs.splice(j, 1); }
          }
          scene.remove(b); bullets.splice(i, 1); continue;
        }

        // Hit guardian
        if (guardian.visible) {
          const dx = Math.abs(b.position.x - guardian.position.x);
          const dy = Math.abs(b.position.y - (guardian.position.y + 1.5));
          const dz = Math.abs(b.position.z - guardian.position.z);
          if (dx < 0.8 && dy < 1.2 && dz < 1.0) {
            if ((bd.pierce || 0) <= 0) { scene.remove(b); bullets.splice(i, 1); }
            else bd.pierce--;
            gs.guardianHealth -= (bd.dmg || 1); sfx('hit');
            hitBurst(guardian.position.x, guardian.position.y + 1.5, guardian.position.z);
            if (gs.guardianHealth <= 0) {
              guardian.visible = false; guardian.position.z = -200;
              gs.guardDist = -200; gs.guardianHealth = 3; gs.guardsKilled++;
              checkAchieve('killGuard'); notify('⚔️ Guardian Killed! +10 coins');
              gs.coins += 10; setCoins(gs.coins);
            }
            continue;
          }
        }
        // Hit boss
        if (boss.visible) {
          const dx = Math.abs(b.position.x - boss.position.x);
          const dy = Math.abs(b.position.y - (boss.position.y + 2));
          const dz = Math.abs(b.position.z - boss.position.z);
          if (dx < 1.2 && dy < 2 && dz < 1.2) {
            if ((bd.pierce || 0) <= 0) { scene.remove(b); bullets.splice(i, 1); }
            else bd.pierce--;
            gs.bossHealth -= (bd.dmg || 1); sfx('hit');
            hitBurst(boss.position.x, boss.position.y + 2, boss.position.z);
            if (gs.bossHealth <= 0) {
              boss.visible = false; boss.position.z = -200; gs.bossActive = false;
              gs.coins += 25; setCoins(gs.coins);
              checkAchieve('killBoss'); notify('👹 BOSS DEFEATED! +25 coins');
            }
            continue;
          }
        }
        // Rampage bullets destroy obstacles
        if (gs.rampage > 0) {
          let hitObs = false;
          for (let j = obstacles.length - 1; j >= 0; j--) {
            const o = obstacles[j];
            if (o.userData.type === 'gap') continue;
            const odx = Math.abs(b.position.x - o.position.x);
            const odz = Math.abs(b.position.z - o.position.z);
            if (odx < 1.2 && odz < 1.0) {
              hitBurst(o.position.x, o.position.y + 0.5, o.position.z);
              scrollGroup.remove(o); obstacles.splice(j, 1);
              scene.remove(b); bullets.splice(i, 1);
              gs.coins++; setCoins(gs.coins);
              hitObs = true; break;
            }
          }
          if (hitObs) continue;
          // Also destroy moving obstacles
          for (let j = movingObs.length - 1; j >= 0; j--) {
            const mo = movingObs[j];
            const mdx = Math.abs(b.position.x - mo.position.x);
            const mdz = Math.abs(b.position.z - mo.position.z);
            if (mdx < 1.2 && mdz < 1.5) {
              hitBurst(mo.position.x, mo.position.y, mo.position.z);
              scrollGroup.remove(mo); movingObs.splice(j, 1);
              scene.remove(b); bullets.splice(i, 1);
              gs.coins++; setCoins(gs.coins);
              hitObs = true; break;
            }
          }
          if (hitObs) continue;
        }
        if (b.position.z < -120 || Math.abs(b.position.x) > 20 || b.position.y < -6) { scene.remove(b); bullets.splice(i, 1); }
      }

      // --- Player lane movement ---
      player.position.x += (LANES[ps.lane] - player.position.x) * 12 * dt;

      // --- Zipline ride (flat or downward) ---
      if (ps.onZipline) {
        ps.zipT -= dt;
        if (ps.zipDown) {
          // Descend from start height to ground over the zip duration
          const progress = 1 - (ps.zipT / 2.0); // 2 sec total
          ps.y = ps.zipStartY * (1 - progress * progress); // ease-out descent
          if (ps.y < 0.1) ps.y = 0.1;
        } else {
          ps.y = 3.2 + Math.sin(ps.zipT * 3) * 0.08;
        }
        player.position.y = ps.y;
        if (ps.zipT <= 0) {
          ps.onZipline = false; ps.zipDown = false;
          if (ps.y > 0.5) { ps.jumping = true; ps.vy = 0.05; ps.canDbl = true; }
          else { ps.y = 0; ps.jumping = false; ps.canDbl = true; sfx('land'); }
        }
      }
      // --- Jump / fast-fall ---
      else if (ps.jumping) {
        if (ps.fastFall) ps.vy = -0.5;
        else ps.vy += GRAV;
        ps.y += ps.vy;
        if (ps.y <= 0) {
          ps.y = 0; ps.vy = 0; ps.jumping = false; ps.canDbl = true;
          if (ps.fastFall) { sfx('slam'); spawnRadialBurst(player.position.x, 0, 0); ps.fastFall = false; }
          else { sfx('land'); spawnParticle(player.position.x, 0, 0); }
        }
        player.position.y = ps.y;
      } else {
        player.position.y = ps.y;
      }

      // --- Duck / Slide ---
      if (ps.ducking) { ps.duckT -= dt; if (ps.duckT <= 0) ps.ducking = false; }

      // --- Animate body ---
      const u = player.userData;
      ps.runT += dt * (8 + gs.speed * 12);
      const ph = Math.sin(ps.runT), ph2 = Math.sin(ps.runT + Math.PI);
      if (ps.ducking) {
        player.scale.y = 0.55; player.rotation.x = 0;
        u.body.position.y = 0.55; u.head.position.y = 1.15;
        u.lLeg.rotation.x = 1.2; u.rLeg.rotation.x = 0.4;
        u.lArm.rotation.x = -0.3; u.rArm.rotation.x = 0.3;
        u.lArm.rotation.z = 0.6; u.rArm.rotation.z = -0.6;
      } else if (ps.onZipline) {
        player.scale.y = 1; player.rotation.x = 0;
        u.body.position.y = 1.2; u.head.position.y = 2;
        u.lArm.rotation.x = -3; u.rArm.rotation.x = -3;
        u.lLeg.rotation.x = 0.2; u.rLeg.rotation.x = -0.2;
        u.lArm.rotation.z = 0; u.rArm.rotation.z = 0;
      } else {
        player.scale.y = 1;
        player.rotation.x = 0.1 + Math.abs(ph) * 0.03;
        u.body.position.y = 1.2 + 0.04 * Math.abs(ph);
        u.head.position.y = 2.0 + 0.03 * Math.abs(ph);
        u.lLeg.rotation.x = ph * 0.7; u.rLeg.rotation.x = -ph * 0.7;
        u.lArm.rotation.x = ph2 * 0.6; u.rArm.rotation.x = -ph2 * 0.6;
        u.lArm.rotation.z = 0; u.rArm.rotation.z = 0;
        if (!ps.jumping && !ps.onZipline) player.position.y = ps.y + Math.abs(Math.sin(ps.runT)) * 0.06;
      }

      // --- Water track: sink if not on boat ---
      if (gs.trackType === 'water' && ps.y < 0.3 && !ps.jumping && !ps.onZipline && gs.shield <= 0) {
        let onBoat = false;
        for (const b of boats) {
          if (b.userData.lane === ps.lane && Math.abs(b.position.z) < 8) { onBoat = true; break; }
        }
        if (!onBoat) { sfx('splash'); notify('\ud83c\udf0a You sank!'); die(); return; }
      }

      // --- Collisions ---
      if (gs.shield <= 0 && gs.shopMode <= 0) {
        for (const o of obstacles) {
          if (o.userData.type === 'crumble' && o.userData.falling) continue;
          const dz = Math.abs(o.position.z);
          if (dz > 2) continue;
          if (o.userData.type === 'deadwall' && dz < 1.2) { die(); return; }
          if (o.userData.type === 'gap' && dz < 1.5 && ps.y < 0.5 && !ps.onZipline) { die(); return; }
          if (o.userData.type === 'jump') {
            const dx = Math.abs(player.position.x - o.position.x);
            if (dx < 0.9 && dz < 0.6 && ps.y < 0.8) { die(); return; }
          } else if (o.userData.type === 'duck' && dz < 0.5 && !ps.ducking && ps.y < o.position.y - 0.6) { die(); return; }
        }
        for (const m of movingObs) {
          const dx = Math.abs(player.position.x - m.position.x);
          const dy = Math.abs(player.position.y - m.position.y);
          const dz = Math.abs(m.position.z);
          if (m.userData.type === 'train') {
            if (dx < 1.0 && dz < 2.5 && ps.y < 1.5) { die(); return; }
          } else {
            if (dx < 0.5 && dy < 0.5 && dz < 0.5) { die(); return; }
          }
        }
      }

      // --- Zipline grab (flat or downward) ---
      if (ps.jumping && !ps.onZipline) {
        for (const zl of ziplines) {
          const dx = Math.abs(player.position.x - LANES[zl.userData.lane]);
          const dz = Math.abs(zl.position.z);
          if (dx < 1.2 && dz < 8 && ps.y > 2.0) {
            ps.onZipline = true; ps.vy = 0; ps.jumping = false;
            if (zl.userData.downward) {
              ps.zipDown = true; ps.zipT = 2.0; ps.zipStartY = ps.y;
              sfx('zip'); notify('⬇️ Downward Zipline!');
            } else {
              ps.zipDown = false; ps.zipT = 1.5;
              sfx('zip'); notify('🪢 Zipline!');
            }
            break;
          }
        }
      }

      // --- Coin pickup ---
      for (let i = coinList.length - 1; i >= 0; i--) {
        const c = coinList[i];
        const cdist = Math.abs(player.position.x - c.position.x);
        const magnetRange = gs.magnet > 0 ? 2.5 : 1;
        if (cdist < magnetRange && Math.abs(c.position.z) < (gs.magnet > 0 ? 3 : 1)) {
          scrollGroup.remove(c); coinList.splice(i, 1);
          gs.coins++; setCoins(gs.coins);
          if (gs.dist - gs.lastCoin < 100) {
            gs.combo++; if (gs.combo >= 10 && gs.mult < 5) { gs.mult++; setMultiplier(gs.mult); }
          } else { gs.combo = 0; gs.mult = 1; setMultiplier(1); }
          gs.lastCoin = gs.dist; setCombo(gs.combo); sfx('coin');
          spawnParticle(c.position.x, c.position.y, c.position.z);
          if (gs.coins >= 200) checkAchieve('coins200');
          else if (gs.coins >= 100) checkAchieve('coins100');
          else if (gs.coins >= 50) checkAchieve('coins50');
          if (gs.combo >= 20) checkAchieve('combo20');
        }
      }

      // --- Gem pickup ---
      for (let i = gemList.length - 1; i >= 0; i--) {
        const g = gemList[i];
        if (Math.abs(player.position.x - g.position.x) < 1 && Math.abs(g.position.z) < 1) {
          scrollGroup.remove(g); gemList.splice(i, 1);
          gs.gems++; gs.coins += 5; setCoins(gs.coins); sfx('gem');
          spawnParticle(g.position.x, g.position.y, g.position.z, 0xff00ff);
        }
      }

      // --- Power-up pickup ---
      for (let i = powerUpList.length - 1; i >= 0; i--) {
        const p = powerUpList[i];
        if (Math.abs(player.position.x - p.position.x) < 1.2 && Math.abs(p.position.z) < 1.2) {
          scrollGroup.remove(p); powerUpList.splice(i, 1);
          if (p.userData.type === 'shield') {
            gs.shield = 8; setPowerUp('shield'); sfx('shield'); notify('🛡️ Shield Active!');
          } else if (p.userData.type === 'magnet') {
            gs.magnet = 10; setPowerUp('magnet'); notify('🧲 Magnet Active!');
          } else if (p.userData.type === 'weapon') {
            const wlist = ['pistol', 'shotgun', 'laser', 'grenade'];
            const next = wlist[(wlist.indexOf(gs.weapon) + 1) % wlist.length];
            switchWeapon(next);
          }
          sfx('powerup');
        }
      }

      // --- Ammo box pickup ---
      for (let i = ammoBoxes.length - 1; i >= 0; i--) {
        const a = ammoBoxes[i];
        if (Math.abs(player.position.x - a.position.x) < 1 && Math.abs(a.position.z) < 1.2) {
          scrollGroup.remove(a); ammoBoxes.splice(i, 1);
          if (a.userData.type === 'grenade') {
            gs.grenades = Math.min(gs.grenades + 2, 12); setGrenades(gs.grenades);
            sfx('ammo'); notify('💣 +2 Grenades!');
          } else {
            gs.ammo = Math.min(gs.ammo + 6, 30); setAmmo(gs.ammo);
            sfx('ammo'); notify('🔫 +6 Ammo!');
          }
          spawnParticle(a.position.x, a.position.y, a.position.z, 0x44ff44);
        }
      }

      // --- Guardian chase ---
      if (gs.dist > 250 && !guardian.visible && !gs.bossActive) {
        guardian.visible = true; gs.guardDist = -80; gs.guardianHealth = 3; sfx('guard');
        notify('⚠️ Guardian is chasing you!');
      }
      if (guardian.visible) {
        gs.guardDist += (gs.speed * 0.7 + 0.15) * dt * 60;
        guardian.position.z = gs.guardDist;
        guardian.position.x += (player.position.x - guardian.position.x) * 2 * dt;
        guardian.rotation.y = Math.sin(lastTime * 0.005) * 0.3;
        // Die only when player and guardian origins are nearly the same
        const gdx = Math.abs(player.position.x - guardian.position.x);
        const gdy = Math.abs(player.position.y - guardian.position.y);
        const gdz = Math.abs(player.position.z - guardian.position.z);
        if (gdx < 0.35 && gdy < 0.35 && gdz < 0.7 && gs.shield <= 0) { die(); return; }
      }

      // --- Boss encounter every 1200 distance ---
      const bossCheck = Math.floor(gs.dist / 1200);
      if (bossCheck > gs.lastBossDist && !gs.bossActive) {
        gs.lastBossDist = bossCheck;
        gs.bossActive = true; gs.bossHealth = 8;
        boss.visible = true; boss.position.set(0, 0, -60);
        guardian.visible = false; guardian.position.z = -200; gs.guardDist = -200;
        sfx('boss'); notify('👹 BOSS INCOMING!');
      }
      if (boss.visible) {
        boss.position.z += (gs.speed * 0.5 + 0.1) * dt * 60;
        boss.position.x += (player.position.x - boss.position.x) * 1.5 * dt;
        boss.rotation.y = Math.sin(lastTime * 0.004) * 0.4;
        if (boss.position.z > -5 && gs.shield <= 0 && ps.y < 3) { die(); return; }
      }

      // --- Achievements ---
      if (gs.dist >= 5000) checkAchieve('dist5000');
      else if (gs.dist >= 2500) checkAchieve('dist2500');
      else if (gs.dist >= 1000) checkAchieve('dist1000');
      else if (gs.dist >= 500) checkAchieve('dist500');

      // --- Missions ---
      let mChanged = false;
      for (const m of missionList) {
        if (m.done) continue;
        if (m.type === 'coins' && gs.coins >= m.target) { m.done = true; notify('✅ Mission: ' + m.desc); gs.coins += 10; setCoins(gs.coins); mChanged = true; }
        if (m.type === 'dist' && gs.dist >= m.target) { m.done = true; notify('✅ Mission: ' + m.desc); gs.coins += 10; setCoins(gs.coins); mChanged = true; }
        if (m.type === 'killGuard' && gs.guardsKilled >= m.target) { m.done = true; notify('✅ Mission: ' + m.desc); gs.coins += 10; setCoins(gs.coins); mChanged = true; }
      }
      if (mChanged) setMissionUI([...missionList]);

      // --- Particles ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); continue; }
        p.vy -= 0.02; p.mesh.position.y += p.vy;
        if (p.vx !== undefined) p.mesh.position.x += p.vx;
        if (p.vz !== undefined) p.mesh.position.z += p.vz;
        p.mesh.position.z += spd;
        p.mesh.material.opacity = p.life / p.maxLife;
      }

      setScore(Math.floor(gs.dist * gs.mult));

      // --- Camera (fixed behind player with turn swoosh) ---
      const camShakeX = gs.turnSwoop > 0 ? Math.sin(gs.turnSwoop * 20) * gs.turnSwoop * 2.5 : 0;
      camera.position.x += (player.position.x + camShakeX - camera.position.x) * 5 * dt;
      camera.position.z += (8 - camera.position.z) * 3 * dt;
      camera.position.y = 4.5 + ps.y * 0.3;
      camera.lookAt(player.position.x, 1.2, -10);
    }

    /* ============ WEATHER ============ */
    function spawnWeather() {
      if (Math.random() > 0.3) return;
      const type = currentBiome.weather;
      let color = 0xffffff, size = 0.05, vy = -0.05, life = 2;
      if (type === 'snow') { color = 0xeeeeff; size = 0.06; vy = -0.03; }
      else if (type === 'ember') { color = 0xff6600; size = 0.04; vy = 0.02; life = 1.5; }
      else if (type === 'sand') { color = 0xccaa66; size = 0.03; vy = -0.01; }
      else if (type === 'dust') { color = 0x888888; size = 0.04; vy = -0.02; }
      else if (type === 'leaves') { color = 0x44aa22; size = 0.08; vy = -0.04; }
      else if (type === 'cloud') { color = 0xffffff; size = 0.15; vy = 0; life = 3; }
      else if (type === 'star') { color = 0xffffaa; size = 0.03; vy = 0; life = 4; }
      else return;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 4, 4),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
      );
      mesh.position.set((Math.random() - 0.5) * 14, 3 + Math.random() * 4, -5 - Math.random() * 20);
      scene.add(mesh);
      weatherParts.push({ mesh, vy, vx: (Math.random() - 0.5) * 0.02, life, maxLife: life });
    }

    /* ============ PARTICLE HELPERS ============ */
    function spawnParticle(x, y, z, color = 0xffdd00) {
      for (let i = 0; i < 5; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4),
          new THREE.MeshBasicMaterial({ color, transparent: true }));
        p.position.set(x + (Math.random() - 0.5) * 0.3, y + Math.random() * 0.3, z);
        scene.add(p);
        particles.push({ mesh: p, vy: Math.random() * 0.15, life: 0.5, maxLife: 0.5 });
      }
    }

    function spawnRadialBurst(x, y, z) {
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4),
          new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true }));
        p.position.set(x, y + 0.1, z); scene.add(p);
        particles.push({ mesh: p, vx: Math.cos(angle) * 0.12, vz: Math.sin(angle) * 0.12, vy: 0.08, life: 0.6, maxLife: 0.6 });
      }
    }

    function hitBurst(x, y, z) {
      for (let j = 0; j < 8; j++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4),
          new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true }));
        p.position.set(x, y, z); scene.add(p);
        particles.push({ mesh: p, vx: (Math.random() - 0.5) * 0.15, vy: Math.random() * 0.2, vz: (Math.random() - 0.5) * 0.15, life: 0.4, maxLife: 0.4 });
      }
    }

    /* ============ NOTIFICATIONS ============ */
    let notifyTimer = null;
    function notify(msg) {
      setNotification(msg);
      if (notifyTimer) clearTimeout(notifyTimer);
      notifyTimer = setTimeout(() => setNotification(null), 2200);
    }

    function checkAchieve(key) {
      if (!key || achievements[key]) return;
      achievements[key] = true;
      sfx('achieve');
      notify('🏆 ' + achieveNames[key]);
    }

    /* ============ DIE / RESURRECT ============ */
    function die() {
      if (gs.superMode) { superdie(); return; }
      gs.over = true; gs.started = false; gs.deathAnim = 0.8;
      const finalScore = Math.floor(gs.dist * gs.mult);
      if (finalScore > bestScore) { setBestScore(finalScore); localStorage.setItem('tr2Best', String(finalScore)); }
      setPowerUp(null); setCombo(0); setMultiplier(1); shieldBubble.visible = false;
      gs.rampage = 0; setRampage(false);
      body.material.emissive = new THREE.Color(0x000000); body.material.emissiveIntensity = 0;
      sfx('death');
      setTurnPrompt(false);
      setCanResurrect(gs.coins >= 20 && !gs.resurrected);
      setPhase('over');
    }

    function superdie(){
        console.log('youre not dying anymore');
    }

    function activateSuperMode() {
      gs.superMode = true;
      gs.shield = 1e9; // effectively infinite
      shieldBubble.visible = true;
      setPowerUp('shield');
      notify('⚡ SUPER MODE ENABLED');
      superdie();
    }


    function resurrect() {
      if (gs.coins < 20 || gs.resurrected) return;
      gs.coins -= 20; setCoins(gs.coins);
      gs.resurrected = true; gs.over = false; gs.started = true; gs.deathAnim = 0;
      gs.shield = 3; gs.rampage = 0; shieldBubble.visible = true; setPowerUp('shield'); setRampage(false);
      body.material.emissive = new THREE.Color(0x000000); body.material.emissiveIntensity = 0;
      setCanResurrect(false);
      ps.y = 0; ps.vy = 0; ps.jumping = false; ps.ducking = false; ps.fastFall = false; ps.onZipline = false;
      player.position.y = 0; player.scale.y = 1; player.rotation.x = 0;
      const u = player.userData;
      u.body.position.y = 1.2; u.head.position.y = 2;
      u.lLeg.rotation.x = 0; u.rLeg.rotation.x = 0;
      u.lArm.rotation.set(0, 0, 0); u.rArm.rotation.set(0, 0, 0);
      guardian.visible = false; guardian.position.z = -200; gs.guardDist = -200;
      boss.visible = false; boss.position.z = -200; gs.bossActive = false;
      lastTime = performance.now();
      sfx('resurrect'); notify('✨ Resurrected!');
      setPhase('playing');
    }

    /* ============ INPUT ============ */
    function input(a) {
      if (!gs.started || gs.over || gs.paused) return;
      // Crossroad: left/right near dead-end wall triggers track change
      if (a === 'left' || a === 'right') {
        for (let ci = crossroads.length - 1; ci >= 0; ci--) {
          const cw = crossroads[ci];
          if (!cw.userData.triggered && cw.position.z > -6 && cw.position.z < 6) {
            cw.userData.triggered = true;
            const oi = obstacles.indexOf(cw);
            if (oi >= 0) obstacles.splice(oi, 1);
            cw.visible = false;
            // Pick new track type
            const newTypes = TRACK_TYPES.filter(t => t !== gs.trackType);
            gs.trackType = newTypes[Math.floor(Math.random() * newTypes.length)];
            // Clear ahead ground to respawn with new track type
            for (let j = groundSegs.length - 1; j >= 0; j--) {
              if (groundSegs[j].position.z < -5) { scrollGroup.remove(groundSegs[j]); groundSegs.splice(j, 1); }
            }
            for (let j = wallArr.length - 1; j >= 0; j--) {
              if (wallArr[j].position.z < -5) { scrollGroup.remove(wallArr[j]); wallArr.splice(j, 1); }
            }
            for (let j = decos.length - 1; j >= 0; j--) {
              if (decos[j].position.z < -5) { scrollGroup.remove(decos[j]); decos.splice(j, 1); }
            }
            gs.turnSwoop = 0.5; gs.turnCooldown = 18;
            sfx('turn'); sfx('trackchange');
            notify((a === 'left' ? '⬅️' : '➡️') + ' ' + trackNameMap[gs.trackType]);
            setTrackName(trackNameMap[gs.trackType]); setTurnPrompt(false);
            return; // Don't lane-change when turning
          }
        }
      }
      if (a === 'left' && ps.lane > 0) ps.lane--;
      else if (a === 'right' && ps.lane < 2) ps.lane++;
      else if (a === 'jump' && !ps.jumping && !ps.onZipline) {
        ps.jumping = true; ps.vy = 0.38;
        if (ps.ducking) { ps.ducking = false; player.scale.y = 1; }
        sfx('jump');
      }
      else if (a === 'jump' && ps.jumping && ps.canDbl) { ps.canDbl = false; ps.vy = 0.36; sfx('djump'); }
      else if (a === 'duck' && !ps.jumping && !ps.onZipline) { ps.ducking = true; ps.duckT = 0.6; sfx('slide'); }
      else if (a === 'duck' && ps.jumping && !ps.fastFall) { ps.fastFall = true; sfx('fastfall'); }
    }

    function start() {
      initSound();
      missionList = genMissions(); setMissionUI([...missionList]);
      gs.inMenu = false; gs.started = true;
      sfx('start'); setPhase('playing');
    }

    function restart() {
      for (let i = scrollGroup.children.length - 1; i >= 0; i--) scrollGroup.remove(scrollGroup.children[i]);
      for (let i = particles.length - 1; i >= 0; i--) scene.remove(particles[i].mesh);
      for (let i = bullets.length - 1; i >= 0; i--) scene.remove(bullets[i]);
      for (let i = weatherParts.length - 1; i >= 0; i--) scene.remove(weatherParts[i].mesh);
      groundSegs = []; wallArr = []; obstacles = []; movingObs = []; coinList = [];
      gemList = []; powerUpList = []; ammoBoxes = []; particles = []; decos = [];
      bullets = []; ziplines = []; weatherParts = []; crossroads = []; rampagePickups = [];
      boats = [];
      gs = newGS(); gs.inMenu = false; gs.started = true;
      setTrackName(''); setTurnPrompt(false);
      ps = newPS();
      missionList = genMissions(); setMissionUI([...missionList]);
      guardian.visible = false; guardian.position.z = -100;
      boss.visible = false; boss.position.z = -200;
      shieldBubble.visible = false;
      currentBiome = biomes[0]; setBiomeName('');
      scene.background.setHex(currentBiome.sky); scene.fog.color.setHex(currentBiome.fog);
      matG.color.setHex(currentBiome.ground); matGA.color.setHex(currentBiome.groundAlt); matW.color.setHex(currentBiome.wall);
      camera.fov = 70; camera.updateProjectionMatrix();
      player.position.set(0, 0, 0); player.scale.y = 1; player.rotation.x = 0;
      const u = player.userData;
      u.body.position.y = 1.2; u.head.position.y = 2;
      u.lLeg.rotation.x = 0; u.rLeg.rotation.x = 0;
      u.lArm.rotation.set(0, 0, 0); u.rArm.rotation.set(0, 0, 0);
      groundZ = GLEN;
      for (let i = 0; i < 8; i++) { groundZ -= GLEN; spawnGround(groundZ); }
      obsZ = -30;
      for (let i = 0; i < 4; i++) { obsZ -= 15; spawnRow(obsZ); }
      Object.keys(achievements).forEach(k => achievements[k] = false);
      body.material.emissive = new THREE.Color(0x000000); body.material.emissiveIntensity = 0;
      setScore(0); setCoins(0); setAmmo(12); setCombo(0); setMultiplier(1);
      setPowerUp(null); setRampage(false); setCanResurrect(false); setPhase('playing');
    }

    function togglePause() {
      if (!gs.started || gs.over) return;
      gs.paused = !gs.paused; setPaused(gs.paused);
      if (!gs.paused) lastTime = performance.now();
    }

    function enableSuperMode() {
      if (gs.superMode) { notify('⚡ SUPER MODE ALREADY ON'); return; }
      activateSuperMode();
    }

    /* ============ KEY / TOUCH ============ */
    function onKey(e) {
      if (e.code === 'Z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        activateSuperMode();
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (gs.inMenu) start();
        else if (gs.over) restart();
        else if (gs.started) input('jump');
        return;
      }
      if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); return; }
      if (e.code === 'KeyF') { e.preventDefault(); shoot(); return; }
      if (gs.paused) return;
      const m = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump', ArrowDown: 'duck',
        KeyA: 'left', KeyD: 'right', KeyW: 'jump', KeyS: 'duck' };
      if (m[e.code]) { e.preventDefault(); input(m[e.code]); }
    }

    let tX = 0, tY = 0;
    function tStart(e) { tX = e.touches[0].clientX; tY = e.touches[0].clientY; }
    function tEnd(e) {
      const dx = e.changedTouches[0].clientX - tX, dy = e.changedTouches[0].clientY - tY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
      if (Math.abs(dx) > Math.abs(dy)) input(dx > 0 ? 'right' : 'left');
      else input(dy > 0 ? 'duck' : 'jump');
    }

    function onResize() {
      if (!mountRef.current) return;
      const w2 = mountRef.current.clientWidth, h2 = mountRef.current.clientHeight;
      camera.aspect = w2 / h2; camera.updateProjectionMatrix(); renderer.setSize(w2, h2);
    }

    fnRef.current = { start, restart, togglePause, resurrect, enableSuperMode };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    if (el) {
      el.addEventListener('touchstart', tStart, { passive: true });
      el.addEventListener('touchend', tEnd, { passive: true });
    }

    // --- Build initial world ---
    groundZ = GLEN;
    for (let i = 0; i < 8; i++) { groundZ -= GLEN; spawnGround(groundZ); }
    for (let i = 0; i < 4; i++) { obsZ -= 15; spawnRow(obsZ); }
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);

    return () => {
      disposed = true; cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      if (el) { el.removeEventListener('touchstart', tStart); el.removeEventListener('touchend', tEnd); }
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      if (actx) { try { actx.close(); } catch (e) {} }
      if (notifyTimer) clearTimeout(notifyTimer);
    };
  }, []);

  /* ============ JSX ============ */
  return (
    <div className="tr2-root">
      <div ref={mountRef} className="tr2-canvas" />

      {notification && <div className="tr2-notify">{notification}</div>}

      {turnPrompt && <div style={{
        position:'absolute', top:'42%', left:'50%', transform:'translate(-50%,-50%)',
        color:'#00ff44', fontSize:'2.2em', fontWeight:'bold',
        textShadow:'0 0 20px #00ff44, 0 0 40px #00ff44',
        animation:'pulse 0.5s ease-in-out infinite', pointerEvents:'none', zIndex:20,
        background:'rgba(0,0,0,0.5)', padding:'10px 28px', borderRadius:'14px',
        border:'2px solid #00ff44', letterSpacing:'2px'
      }}>⬅️ TURN! ➡️</div>}

      {phase === 'menu' && (
        <div className="tr2-overlay">
          <h1 className="tr2-title">🏃 Temple Runner</h1>
          {bestScore > 0 && <div className="tr2-best">🏆 Best: {bestScore.toLocaleString()}</div>}
          <p className="tr2-sub">Arrow Keys / WASD / Swipe</p>
          <p className="tr2-sub sm">↑ Jump (2x) &nbsp; ↓ Duck/FastFall &nbsp; ← → Lanes &nbsp; F Shoot</p>
          <p className="tr2-sub sm">P/Esc Pause &nbsp; Jump mid-air for ziplines</p>
          <button className="tr2-btn play" onClick={() => fnRef.current.start?.()}>▶ PLAY</button>
          <p className="tr2-sub sm">or press SPACE</p>
        </div>
      )}

      {phase === 'playing' && (
        <>
          <div className="tr2-hud">
            <div className="tr2-left">
              <div className="tr2-score">{score.toLocaleString()}</div>
              {multiplier > 1 && <div className="tr2-mult">x{multiplier}</div>}
              {combo > 0 && <div className="tr2-combo">{combo} combo!</div>}
              {biomeName && <div className="tr2-biome">{biomeName}</div>}
              {trackName && <div className="tr2-biome" style={{color:'#ffaa44',marginTop:2}}>{trackName}</div>}
            </div>
            <button className="tr2-pause-btn" onClick={() => fnRef.current.togglePause?.()}>⏸</button>
            <div className="tr2-right">
              <div className="tr2-coins">🪙 {coins}</div>
              <div className="tr2-ammo">🔫 {ammo}</div>
              <button className="tr2-btn super" style={{padding:'6px 10px', fontSize:'0.8em', pointerEvents:'auto'}} onClick={() => fnRef.current.enableSuperMode?.()}>
                ⚡ SUPER
              </button>
              {powerUp && <div className="tr2-powerup">{powerUp === 'shield' ? '🛡️ Shield' : powerUp === 'rampage' ? '🔥 RAMPAGE' : '🧲 Magnet'}</div>}
              {rampage && <div className="tr2-rampage">💥 BULLETS EVERYWHERE 💥</div>}
            </div>
          </div>
          <div className="tr2-missions">
            {missionUI.map((m, i) => (
              <div key={i} className={'tr2-mission' + (m.done ? ' done' : '')}>
                {m.done ? '✅' : '⬜'} {m.desc}
              </div>
            ))}
          </div>
          {paused && (
            <div className="tr2-overlay pause">
              <h1 className="tr2-title pause">⏸ PAUSED</h1>
              <button className="tr2-btn resume" onClick={() => fnRef.current.togglePause?.()}>▶ RESUME</button>
              <p className="tr2-sub sm">or press P / Esc</p>
            </div>
          )}
        </>
      )}

      {phase === 'over' && (
        <div className="tr2-overlay">
          <h1 className="tr2-title dead">GAME OVER</h1>
          <p className="tr2-sub">Score: {score.toLocaleString()}</p>
          {score > bestScore && <p className="tr2-sub new">🎉 NEW BEST!</p>}
          <p className="tr2-sub">Coins: {coins}</p>
          {bestScore > 0 && <p className="tr2-sub sm">Best: {bestScore.toLocaleString()}</p>}
          {canResurrect && (
            <button className="tr2-btn resurrect" onClick={() => fnRef.current.resurrect?.()}>
              ✨ Resurrect (20 coins)
            </button>
          )}
          <button className="tr2-btn restart" onClick={() => fnRef.current.restart?.()}>↻ PLAY AGAIN</button>
          <p className="tr2-sub sm">or press SPACE</p>
        </div>
      )}
      <BackButton />
    </div>
  );
}
