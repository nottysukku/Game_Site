import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import BackButton from "./BackButton";
import "./StickFighter.css";

// --- Audio Synthesizer ---
let audioCtx = null;
function playSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "punch") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(120, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === "kick") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === "special") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(900, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === "hit") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(90, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(30, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === "powerup") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {
    console.error(e);
  }
}

// Config
const FIGHTER_STYLES = [
  { id: "cyber", name: "Neon Cyber", color: 0x00e5ff, emissive: 0x00e5ff, particleColor: 0x00e5ff },
  { id: "demon", name: "Fire Demon", color: 0xff3d00, emissive: 0xff3d00, particleColor: 0xff5d00 },
  { id: "knight", name: "Frost Knight", color: 0x82b1ff, emissive: 0x82b1ff, particleColor: 0x00b0ff },
  { id: "buddha", name: "Golden Buddha", color: 0xffd700, emissive: 0xffd700, particleColor: 0xffea00 },
  { id: "assassin", name: "Void Assassin", color: 0xd500f9, emissive: 0xd500f9, particleColor: 0xd500f9 },
  { id: "ninja", name: "Shadow Ninja", color: 0x37474f, emissive: 0x263238, particleColor: 0x263238 },
  { id: "monk", name: "Solar Monk", color: 0xffab00, emissive: 0xffab00, particleColor: 0xffab00 },
  { id: "cobra", name: "Poison Cobra", color: 0x00e676, emissive: 0x00e676, particleColor: 0x00e676 },
  { id: "mech", name: "Lightning Mech", color: 0xffff00, emissive: 0xffff00, particleColor: 0xffff8d },
  { id: "guard", name: "Robo Guard", color: 0x2979ff, emissive: 0x2979ff, particleColor: 0x2979ff },
];

const WEAPONS = [
  { id: "fists", name: "Fists", damageMult: 1.0, rangeMult: 1.0, icon: "👊" },
  { id: "katana", name: "Neon Katana", damageMult: 1.4, rangeMult: 1.5, icon: "⚔️" },
  { id: "staff", name: "Plasma Staff", damageMult: 1.2, rangeMult: 1.8, icon: "🦯" },
  { id: "claws", name: "Cyber Claws", damageMult: 1.5, rangeMult: 1.1, icon: "🐾" },
  { id: "sword", name: "Laser Sword", damageMult: 1.7, rangeMult: 1.4, icon: "🗡️" },
];

const VENUES = [
  { id: "dojo", name: "Dojo Temple", color: 0x3b2a17, fog: 0x140e0b, ambient: 0xffe0b2 },
  { id: "neon", name: "Neon City", color: 0x111622, fog: 0x080911, ambient: 0x00e5ff },
  { id: "lava", name: "Lava Core", color: 0x2c0f0f, fog: 0x140505, ambient: 0xff3d00 },
  { id: "ice", name: "Ice Palace", color: 0x5a7a8a, fog: 0x0a141a, ambient: 0x82b1ff },
];

export default function StickFighter() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Match Configuration states
  const [phase, setPhase] = useState("menu"); // 'menu', 'playing', 'gameover'
  const [gameMode, setGameMode] = useState("1p"); // '1p' (vs AI), '2p' (local multiplayer)
  const [venueId, setVenueId] = useState("dojo");
  const [p1StyleIdx, setP1StyleIdx] = useState(0);
  const [p2StyleIdx, setP2StyleIdx] = useState(1);
  const [p1WeaponIdx, setP1WeaponIdx] = useState(0);
  const [p2WeaponIdx, setP2WeaponIdx] = useState(0);

  // HUD states
  const [p1HP, setP1HP] = useState(100);
  const [p2HP, setP2HP] = useState(100);
  const [p1Special, setP1Special] = useState(0);
  const [p2Special, setP2Special] = useState(0);
  const [p1Powerup, setP1Powerup] = useState("");
  const [p2Powerup, setP2Powerup] = useState("");
  const [p1Weapon, setP1Weapon] = useState("Fists");
  const [p2Weapon, setP2Weapon] = useState("Fists");
  const [statusText, setStatusText] = useState("");

  // Refs for logic loop
  const stateRef = useRef({
    keys: {},
    p1: {
      pos: new THREE.Vector3(-6, 0, 0),
      vel: new THREE.Vector3(),
      hp: 100,
      special: 0,
      powerup: "",
      powerupTimer: 0,
      state: "idle", // 'idle', 'run', 'jump', 'punch', 'kick', 'special', 'recoil', 'victory', 'defeat'
      stateTimer: 0,
      weapon: WEAPONS[0],
      shieldActive: false,
      speedMult: 1.0,
      damageMult: 1.0,
      facing: 1, // 1 for right, -1 for left
    },
    p2: {
      pos: new THREE.Vector3(6, 0, 0),
      vel: new THREE.Vector3(),
      hp: 100,
      special: 0,
      powerup: "",
      powerupTimer: 0,
      state: "idle",
      stateTimer: 0,
      weapon: WEAPONS[0],
      shieldActive: false,
      speedMult: 1.0,
      damageMult: 1.0,
      facing: -1,
    },
    powerupItem: {
      pos: new THREE.Vector3(0, 1.5, 0),
      active: false,
      type: "", // 'heal', 'shield', 'speed', 'rage'
      timer: 0
    },
    particles: [], // sparks
    slowMo: 1.0,
    over: false,
  });

  // Three.js Refs
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    p1Stick: null,
    p2Stick: null,
    p1WeaponMesh: null,
    p2WeaponMesh: null,
    powerupMesh: null,
    particleMeshes: [],
    ground: null,
    lights: [],
  });

  // Initialize Split Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      stateRef.current.keys[e.code] = true;
    };
    const handleKeyUp = (e) => {
      stateRef.current.keys[e.code] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const startGame = () => {
    const state = stateRef.current;
    state.p1.pos.set(-6, 0, 0);
    state.p1.vel.set(0, 0, 0);
    state.p1.hp = 100;
    state.p1.special = 0;
    state.p1.powerup = "";
    state.p1.state = "idle";
    state.p1.facing = 1;
    state.p1.weapon = WEAPONS[p1WeaponIdx];

    state.p2.pos.set(6, 0, 0);
    state.p2.vel.set(0, 0, 0);
    state.p2.hp = 100;
    state.p2.special = 0;
    state.p2.powerup = "";
    state.p2.state = "idle";
    state.p2.facing = -1;
    state.p2.weapon = WEAPONS[p2WeaponIdx];

    state.powerupItem.active = false;
    state.powerupItem.timer = 0;
    state.particles = [];
    state.over = false;
    state.slowMo = 1.0;

    setP1HP(100);
    setP2HP(100);
    setP1Special(0);
    setP2Special(0);
    setP1Powerup("");
    setP2Powerup("");
    setP1Weapon(WEAPONS[p1WeaponIdx].name);
    setP2Weapon(WEAPONS[p2WeaponIdx].name);
    setStatusText("FIGHT!");

    setPhase("playing");
    setTimeout(() => {
      initThree();
    }, 100);
  };

  const createStickmanMesh = (style) => {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: style.color,
      emissive: style.emissive,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.5,
    });

    const jointGeo = new THREE.SphereGeometry(0.24, 8, 8);
    const headGeo = new THREE.SphereGeometry(0.38, 12, 12);
    const boneGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 8);
    boneGeo.translate(0, 0.5, 0); // pivot at end

    // Parts
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 2.4;
    group.add(head);

    const chest = new THREE.Mesh(jointGeo, mat);
    chest.position.y = 1.9;
    group.add(chest);

    const pelvis = new THREE.Mesh(jointGeo, mat);
    pelvis.position.y = 1.0;
    group.add(pelvis);

    // Spine
    const spine = new THREE.Mesh(boneGeo, mat);
    spine.position.copy(pelvis.position);
    spine.scale.set(1, 0.9, 1);
    group.add(spine);

    // Limbs helper
    const addLimb = (parentJoint, len1, len2) => {
      const gLimb = new THREE.Group();
      gLimb.position.copy(parentJoint);

      const segment1 = new THREE.Group();
      const bone1 = new THREE.Mesh(boneGeo, mat);
      bone1.scale.set(1, len1, 1);
      segment1.add(bone1);

      const elbow = new THREE.Mesh(jointGeo, mat);
      elbow.position.y = len1;
      segment1.add(elbow);

      const segment2 = new THREE.Group();
      segment2.position.y = len1;
      const bone2 = new THREE.Mesh(boneGeo, mat);
      bone2.scale.set(1, len2, 1);
      segment2.add(bone2);

      const hand = new THREE.Mesh(jointGeo, mat);
      hand.position.y = len2;
      segment2.add(hand);

      segment1.add(segment2);
      gLimb.add(segment1);

      return { group: gLimb, seg1: segment1, seg2: segment2 };
    };

    const leftArm = addLimb(new THREE.Vector3(-0.35, 1.9, 0), 0.7, 0.7);
    const rightArm = addLimb(new THREE.Vector3(0.35, 1.9, 0), 0.7, 0.7);
    const leftLeg = addLimb(new THREE.Vector3(-0.25, 1.0, 0), 0.8, 0.8);
    const rightLeg = addLimb(new THREE.Vector3(0.25, 1.0, 0), 0.8, 0.8);

    // Flip bones to point down for legs
    leftLeg.seg1.rotation.z = Math.PI;
    rightLeg.seg1.rotation.z = Math.PI;

    group.add(leftArm.group);
    group.add(rightArm.group);
    group.add(leftLeg.group);
    group.add(rightLeg.group);

    group.castShadow = true;

    return {
      group,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
    };
  };

  const createWeaponMesh = (wId) => {
    const group = new THREE.Group();
    if (wId === "fists") return group;

    const w = WEAPONS.find((item) => item.id === wId);
    let mat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    if (wId === "katana") {
      mat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.5 });
      const bladeGeo = new THREE.BoxGeometry(0.08, 1.4, 0.08);
      const blade = new THREE.Mesh(bladeGeo, mat);
      blade.position.y = 0.7;
      const hiltGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8);
      const hilt = new THREE.Mesh(hiltGeo, new THREE.MeshStandardMaterial({ color: 0x111 }));
      hilt.position.y = -0.15;
      group.add(blade);
      group.add(hilt);
    } else if (wId === "staff") {
      mat = new THREE.MeshStandardMaterial({ color: 0xe040fb, emissive: 0xe040fb, emissiveIntensity: 1.5 });
      const staffGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.0, 8);
      const staff = new THREE.Mesh(staffGeo, mat);
      group.add(staff);
    } else if (wId === "claws") {
      mat = new THREE.MeshStandardMaterial({ color: 0xff3d00, emissive: 0xff3d00, emissiveIntensity: 1.5 });
      for (let i = 0; i < 3; i++) {
        const clawGeo = new THREE.BoxGeometry(0.04, 0.6, 0.04);
        const claw = new THREE.Mesh(clawGeo, mat);
        claw.position.set((i - 1) * 0.1, 0.3, 0);
        claw.rotation.z = (i - 1) * 0.15;
        group.add(claw);
      }
    } else if (wId === "sword") {
      mat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 1.5 });
      const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
      const beam = new THREE.Mesh(beamGeo, mat);
      beam.position.y = 0.6;
      const hiltGeo = new THREE.BoxGeometry(0.12, 0.25, 0.12);
      const hilt = new THREE.Mesh(hiltGeo, new THREE.MeshStandardMaterial({ color: 0x333 }));
      hilt.position.y = -0.12;
      group.add(beam);
      group.add(hilt);
    }

    return group;
  };

  const initThree = () => {
    const state = stateRef.current;
    const three = threeRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = containerRef.current.clientWidth || window.innerWidth;
    const h = containerRef.current.clientHeight || window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    three.renderer = renderer;

    // Scene
    const scene = new THREE.Scene();
    const venue = VENUES.find((item) => item.id === venueId);
    scene.background = new THREE.Color(venue.fog);
    scene.fog = new THREE.FogExp2(venue.fog, 0.02);
    three.scene = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 3, 11);
    camera.lookAt(0, 1.8, 0);
    three.camera = camera;

    // Lights
    const ambient = new THREE.AmbientLight(venue.ambient, 0.35);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 12, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pLight1 = new THREE.PointLight(FIGHTER_STYLES[p1StyleIdx].color, 1.2, 15);
    pLight1.position.set(-6, 2, 1);
    scene.add(pLight1);
    three.lights.push(pLight1);

    const pLight2 = new THREE.PointLight(FIGHTER_STYLES[p2StyleIdx].color, 1.2, 15);
    pLight2.position.set(6, 2, 1);
    scene.add(pLight2);
    three.lights.push(pLight2);

    // Ground Plane
    const groundGeo = new THREE.BoxGeometry(40, 0.4, 10);
    const groundMat = new THREE.MeshStandardMaterial({
      color: venue.color,
      roughness: 0.7,
      metalness: 0.3,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    scene.add(ground);
    three.ground = ground;

    // Grid details on ground for tech feel
    const grid = new THREE.GridHelper(40, 20, FIGHTER_STYLES[p1StyleIdx].color, 0x333333);
    grid.position.y = 0.01;
    scene.add(grid);

    // Assemble Player 1
    const p1Stick = createStickmanMesh(FIGHTER_STYLES[p1StyleIdx]);
    scene.add(p1Stick.group);
    three.p1Stick = p1Stick;

    const p1W = createWeaponMesh(WEAPONS[p1WeaponIdx].id);
    p1Stick.rightArm.seg2.add(p1W); // Attach to hand segment
    p1W.position.set(0, 0.7, 0); // place weapon right on the hand joint
    p1W.rotation.x = Math.PI / 2;
    three.p1WeaponMesh = p1W;

    // Assemble Player 2
    const p2Stick = createStickmanMesh(FIGHTER_STYLES[p2StyleIdx]);
    scene.add(p2Stick.group);
    three.p2Stick = p2Stick;

    const p2W = createWeaponMesh(WEAPONS[p2WeaponIdx].id);
    p2Stick.rightArm.seg2.add(p2W);
    p2W.position.set(0, 0.7, 0);
    p2W.rotation.x = Math.PI / 2;
    three.p2WeaponMesh = p2W;

    // Powerup Mesh Setup
    const pUpGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const pUpMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1.0 });
    const pUpMesh = new THREE.Mesh(pUpGeo, pUpMat);
    pUpMesh.position.copy(state.powerupItem.pos);
    pUpMesh.visible = false;
    scene.add(pUpMesh);
    three.powerupMesh = pUpMesh;

    const resize = () => {
      const wWidth = containerRef.current.clientWidth || window.innerWidth;
      const wHeight = containerRef.current.clientHeight || window.innerHeight;
      camera.aspect = wWidth / wHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(wWidth, wHeight);
    };
    window.addEventListener("resize", resize);

    // Loop
    let lastTime = performance.now();
    let frameId;

    const loop = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000) * state.slowMo;
      lastTime = now;

      updatePhysics(dt);
      animateFighters(now);
      renderThree();

      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  };

  const applyAnimationRotations = (stick, pose) => {
    stick.leftArm.seg1.rotation.z = pose.la1;
    stick.leftArm.seg2.rotation.z = pose.la2;
    stick.rightArm.seg1.rotation.z = pose.ra1;
    stick.rightArm.seg2.rotation.z = pose.ra2;

    stick.leftLeg.seg1.rotation.z = Math.PI + pose.ll1;
    stick.leftLeg.seg2.rotation.z = pose.ll2;
    stick.rightLeg.seg1.rotation.z = Math.PI + pose.rl1;
    stick.rightLeg.seg2.rotation.z = pose.rl2;
  };

  const animateFighters = (time) => {
    const state = stateRef.current;
    const tSec = time / 1000;

    // Helper: generate procedural poses by state
    const getPose = (fighterState, facing, timer) => {
      const poses = {
        idle: {
          la1: 0.4 + Math.sin(tSec * 4) * 0.1, la2: 0.8,
          ra1: -0.4 - Math.sin(tSec * 4) * 0.1, ra2: -0.8,
          ll1: 0.15, ll2: 0.1,
          rl1: -0.15, rl2: 0.1,
        },
        run: {
          la1: 0.8 + Math.sin(tSec * 12) * 0.8, la2: 0.6,
          ra1: -0.8 - Math.sin(tSec * 12) * 0.8, ra2: -0.6,
          ll1: Math.sin(tSec * 12) * 0.7, ll2: Math.max(0, -Math.sin(tSec * 12) * 0.6),
          rl1: -Math.sin(tSec * 12) * 0.7, rl2: Math.max(0, Math.sin(tSec * 12) * 0.6),
        },
        jump: {
          la1: 1.2, la2: 0.4,
          ra1: -1.2, ra2: -0.4,
          ll1: 0.4, ll2: 0.8,
          rl1: -0.4, rl2: 0.8,
        },
        punch: {
          la1: 0.4, la2: 0.8,
          ra1: facing === 1 ? -1.8 : 1.8, ra2: 0.0, // thrust arm out
          ll1: 0.2, ll2: 0.1,
          rl1: -0.2, rl2: 0.1,
        },
        kick: {
          la1: 0.8, la2: 0.8,
          ra1: -0.8, ra2: -0.8,
          ll1: facing === 1 ? -1.6 : 1.6, ll2: 0.0, // extend leg out
          rl1: -0.1, rl2: 0.1,
        },
        special: {
          la1: facing === 1 ? 1.6 : -1.6, la2: 0.0,
          ra1: facing === 1 ? -1.6 : 1.6, ra2: 0.0, // double overhead raise
          ll1: 0.2, ll2: 0.4,
          rl1: -0.2, rl2: 0.4,
        },
        recoil: {
          la1: -0.8, la2: 0.8,
          ra1: 0.8, ra2: -0.8,
          ll1: -0.4, ll2: 0.6,
          rl1: 0.4, rl2: 0.6,
        },
        victory: {
          la1: 1.8, la2: 0.5,
          ra1: -1.8, ra2: -0.5,
          ll1: 0.1, ll2: 0.1,
          rl1: -0.1, rl2: 0.1,
        },
        defeat: {
          la1: 0.1, la2: 0.2,
          ra1: -0.1, ra2: -0.2,
          ll1: 0.8, ll2: 1.2,
          rl1: -0.8, rl2: 1.2, // bent double, collapsed
        },
      };
      return poses[fighterState] || poses.idle;
    };

    if (threeRef.current.p1Stick) {
      applyAnimationRotations(threeRef.current.p1Stick, getPose(state.p1.state, state.p1.facing, state.p1.stateTimer));
    }
    if (threeRef.current.p2Stick) {
      applyAnimationRotations(threeRef.current.p2Stick, getPose(state.p2.state, state.p2.facing, state.p2.stateTimer));
    }
  };

  const updatePhysics = (dt) => {
    const state = stateRef.current;
    
    // Increment animation/state timers
    state.p1.stateTimer += dt;
    state.p2.stateTimer += dt;

    // Reset hit state triggers back to idle
    const handleStateCd = (p) => {
      if (["punch", "kick", "recoil"].includes(p.state) && p.stateTimer > 0.35) {
        p.state = "idle";
        p.stateTimer = 0;
      }
      if (p.state === "special" && p.stateTimer > 0.6) {
        p.state = "idle";
        p.stateTimer = 0;
      }
    };
    handleStateCd(state.p1);
    handleStateCd(state.p2);

    // AI logic (Only if game mode is 1P vs CPU and match not over)
    if (gameMode === "1p" && !state.over && state.p2.hp > 0 && state.p1.hp > 0) {
      updateCPU(dt);
    }

    // Player 1 controls (WASD)
    if (!state.over && state.p1.hp > 0 && !["recoil", "punch", "kick", "special"].includes(state.p1.state)) {
      const speed = 6.0 * state.p1.speedMult;
      let moveX = 0;
      if (state.keys["KeyA"]) moveX = -1;
      if (state.keys["KeyD"]) moveX = 1;
      
      state.p1.pos.x += moveX * speed * dt;
      if (moveX !== 0) {
        state.p1.state = "run";
        state.p1.facing = moveX > 0 ? 1 : -1;
      } else {
        state.p1.state = "idle";
      }

      // Jump
      if (state.keys["KeyW"] && state.p1.pos.y <= 0.01) {
        state.p1.vel.y = 12;
      }

      // Attack keys
      if (state.keys["KeyF"]) {
        executeAttack("p1", "punch");
      } else if (state.keys["KeyG"]) {
        executeAttack("p1", "kick");
      } else if (state.keys["KeyQ"] && state.p1.special >= 100) {
        executeAttack("p1", "special");
      }
    }

    // Player 2 controls (Arrow Keys - local multiplayer)
    if (gameMode === "2p" && !state.over && state.p2.hp > 0 && !["recoil", "punch", "kick", "special"].includes(state.p2.state)) {
      const speed = 6.0 * state.p2.speedMult;
      let moveX = 0;
      if (state.keys["ArrowLeft"]) moveX = -1;
      if (state.keys["ArrowRight"]) moveX = 1;
      
      state.p2.pos.x += moveX * speed * dt;
      if (moveX !== 0) {
        state.p2.state = "run";
        state.p2.facing = moveX > 0 ? 1 : -1;
      } else {
        state.p2.state = "idle";
      }

      // Jump
      if (state.keys["ArrowUp"] && state.p2.pos.y <= 0.01) {
        state.p2.vel.y = 12;
      }

      // Attacks
      if (state.keys["KeyK"]) {
        executeAttack("p2", "punch");
      } else if (state.keys["KeyL"]) {
        executeAttack("p2", "kick");
      } else if (state.keys["KeyI"] && state.p2.special >= 100) {
        executeAttack("p2", "special");
      }
    }

    // Apply gravity
    const applyGravity = (p) => {
      if (p.pos.y > 0 || p.vel.y > 0) {
        p.vel.y -= 30 * dt;
        p.pos.y += p.vel.y * dt;
        p.state = "jump";
        if (p.pos.y < 0) {
          p.pos.y = 0;
          p.vel.y = 0;
          p.state = "idle";
        }
      }
    };
    applyGravity(state.p1);
    applyGravity(state.p2);

    // Keep players within arena range
    state.p1.pos.x = Math.max(-18, Math.min(18, state.p1.pos.x));
    state.p2.pos.x = Math.max(-18, Math.min(18, state.p2.pos.x));

    // Powerup spawning logic
    state.powerupItem.timer += dt;
    if (!state.powerupItem.active && state.powerupItem.timer > 8) {
      const types = ["heal", "shield", "speed", "rage"];
      state.powerupItem.type = types[Math.floor(Math.random() * types.length)];
      state.powerupItem.pos.x = (Math.random() - 0.5) * 20;
      state.powerupItem.active = true;
      state.powerupItem.timer = 0;
    }

    // Check powerup collections
    const checkPUpCollection = (p, pName) => {
      if (state.powerupItem.active && p.pos.distanceTo(state.powerupItem.pos) < 1.5) {
        state.powerupItem.active = false;
        p.powerup = state.powerupItem.type;
        p.powerupTimer = 6.0;
        playSound("powerup");

        if (p.powerup === "heal") {
          p.hp = Math.min(100, p.hp + 30);
          if (pName === "p1") setP1HP(p.hp); else setP2HP(p.hp);
        } else if (p.powerup === "speed") {
          p.speedMult = 1.6;
        } else if (p.powerup === "rage") {
          p.damageMult = 2.0;
        } else if (p.powerup === "shield") {
          p.shieldActive = true;
        }
        
        if (pName === "p1") setP1Powerup(p.powerup.toUpperCase());
        else setP2Powerup(p.powerup.toUpperCase());
      }
    };
    checkPUpCollection(state.p1, "p1");
    checkPUpCollection(state.p2, "p2");

    // Powerup durations countdown
    const decayPowerup = (p, pName) => {
      if (p.powerup) {
        p.powerupTimer -= dt;
        if (p.powerupTimer <= 0) {
          p.powerup = "";
          p.speedMult = 1.0;
          p.damageMult = 1.0;
          p.shieldActive = false;
          if (pName === "p1") setP1Powerup(""); else setP2Powerup("");
        }
      }
    };
    decayPowerup(state.p1, "p1");
    decayPowerup(state.p2, "p2");

    // Projectile particles mechanics
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const part = state.particles[i];
      part.pos.addScaledVector(part.vel, dt);
      part.timer -= dt;
      if (part.timer <= 0) {
        state.particles.splice(i, 1);
      }
    }

    // Win condition and slow mo execution
    if (!state.over) {
      if (state.p1.hp <= 0 || state.p2.hp <= 0) {
        state.over = true;
        state.slowMo = 0.25; // drop game speed into slow motion dramatic finish
        
        const winner = state.p1.hp > 0 ? "Player 1" : (gameMode === "1p" ? "CPU Rival" : "Player 2");
        setStatusText(`${winner} wins the battle!`);
        
        state.p1.state = state.p1.hp > 0 ? "victory" : "defeat";
        state.p2.state = state.p2.hp > 0 ? "victory" : "defeat";

        setTimeout(() => {
          setPhase("gameover");
        }, 3000);
      }
    }
  };

  const updateCPU = (dt) => {
    const state = stateRef.current;
    const cpu = state.p2;
    const player = state.p1;

    // AI decision states
    const distToPlayer = cpu.pos.distanceTo(player.pos);
    const speed = 4.8 * cpu.speedMult;

    if (distToPlayer > 3.0) {
      // Approach
      const dir = player.pos.x > cpu.pos.x ? 1 : -1;
      cpu.pos.x += dir * speed * dt;
      cpu.state = "run";
      cpu.facing = dir;
    } else {
      // Strike
      cpu.state = "idle";
      if (Math.random() < 0.05) {
        if (cpu.special >= 100 && Math.random() < 0.3) {
          executeAttack("p2", "special");
        } else {
          executeAttack("p2", Math.random() < 0.6 ? "punch" : "kick");
        }
      }
    }
  };

  const executeAttack = (attackerName, type) => {
    const state = stateRef.current;
    const attacker = attackerName === "p1" ? state.p1 : state.p2;
    const target = attackerName === "p1" ? state.p2 : state.p1;

    attacker.state = type;
    attacker.stateTimer = 0;
    playSound(type);

    // Hit registration logic
    let dmg = 0;
    let range = 2.4; // default fists range

    if (type === "punch") {
      dmg = 12 * attacker.weapon.damageMult;
      range = 2.2 * attacker.weapon.rangeMult;
    } else if (type === "kick") {
      dmg = 18 * attacker.weapon.damageMult;
      range = 2.6 * attacker.weapon.rangeMult;
    } else if (type === "special") {
      dmg = 40;
      range = 4.0;
      attacker.special = 0;
      if (attackerName === "p1") setP1Special(0); else setP2Special(0);
    }

    // Multiply damage if rage is active
    dmg *= attacker.damageMult;

    // Check hit radius
    const dist = attacker.pos.distanceTo(target.pos);
    if (dist <= range && Math.abs(attacker.pos.y - target.pos.y) < 1.5) {
      // Hit registered
      playSound("hit");
      spawnSparks(target.pos, FIGHTER_STYLES[attackerName === "p1" ? p1StyleIdx : p2StyleIdx].color);

      // Apply damage (factoring shield block)
      if (target.shieldActive) {
        dmg *= 0.2; // 80% damage reduction
      }
      
      target.hp = Math.max(0, target.hp - dmg);
      target.state = "recoil";
      target.stateTimer = 0;

      // Update HUD values
      if (attackerName === "p1") {
        setP2HP(target.hp);
        attacker.special = Math.min(100, attacker.special + 18);
        setP1Special(attacker.special);
      } else {
        setP1HP(target.hp);
        attacker.special = Math.min(100, attacker.special + 18);
        setP2Special(attacker.special);
      }
    }
  };

  const spawnSparks = (pos, colorVal) => {
    const state = stateRef.current;
    for (let i = 0; i < 12; i++) {
      state.particles.push({
        pos: new THREE.Vector3(pos.x, pos.y + 1.2, pos.z),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          Math.random() * 8,
          (Math.random() - 0.5) * 3
        ),
        color: colorVal,
        timer: 0.35,
      });
    }
  };

  const renderThree = () => {
    const state = stateRef.current;
    const three = threeRef.current;
    if (!three.scene || !three.renderer || !three.camera) return;

    // Update positions
    if (three.p1Stick) {
      three.p1Stick.group.position.copy(state.p1.pos);
      // rotate mesh towards facing
      three.p1Stick.group.rotation.y = state.p1.facing === 1 ? 0 : Math.PI;
    }
    if (three.p2Stick) {
      three.p2Stick.group.position.copy(state.p2.pos);
      three.p2Stick.group.rotation.y = state.p2.facing === 1 ? 0 : Math.PI;
    }

    // Lights update to track fighters
    if (three.lights[0]) three.lights[0].position.copy(state.p1.pos).y += 2;
    if (three.lights[1]) three.lights[1].position.copy(state.p2.pos).y += 2;

    // Spin powerup box
    if (three.powerupMesh) {
      three.powerupMesh.visible = state.powerupItem.active;
      three.powerupMesh.position.copy(state.powerupItem.pos);
      three.powerupMesh.rotation.y += 0.04;
      three.powerupMesh.rotation.x += 0.02;

      // Color powerup box by type
      const colors = { heal: 0x00ff00, shield: 0xffea00, speed: 0x00e5ff, rage: 0xff3d00 };
      three.powerupMesh.material.color.setHex(colors[state.powerupItem.type] || 0xffffff);
      three.powerupMesh.material.emissive.setHex(colors[state.powerupItem.type] || 0xffffff);
    }

    // Dynamic camera centering between fighters
    const midpoint = new THREE.Vector3().addVectors(state.p1.pos, state.p2.pos).multiplyScalar(0.5);
    const distance = Math.max(8.0, state.p1.pos.distanceTo(state.p2.pos));
    
    three.camera.position.x = midpoint.x;
    three.camera.position.z = Math.min(15, Math.max(7.5, distance * 0.95));
    three.camera.position.y = 3.0 + (distance * 0.1);
    three.camera.lookAt(midpoint.x, 1.6, 0);

    // Particle rendering
    three.particleMeshes.forEach((mesh) => three.scene.remove(mesh));
    three.particleMeshes = [];

    state.particles.forEach((part) => {
      const pMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 4, 4),
        new THREE.MeshBasicMaterial({ color: part.color })
      );
      pMesh.position.copy(part.pos);
      three.scene.add(pMesh);
      three.particleMeshes.push(pMesh);
    });

    three.renderer.render(three.scene, three.camera);
  };

  const handleMenuExit = () => {
    setPhase("menu");
  };

  if (phase === "menu") {
    return (
      <div className="sf-root">
        <BackButton />
        <div className="sf-overlay">
          <h1>Stickman Fighter 3D</h1>
          <p className="sf-subtitle">Select your styles and weapons, pick a stage, and fight!</p>

          <div style={{ display: "flex", gap: "20px", width: "100%", maxWidth: "750px", justifyContent: "center" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", padding: "15px", borderRadius: "14px" }}>
              <div className="sf-section-label cyan-text">Player 1 Config</div>
              <div className="sf-section-label" style={{ fontSize: "11px", margin: "2px 0" }}>Fighter Style</div>
              <select 
                value={p1StyleIdx} 
                onChange={(e) => setP1StyleIdx(parseInt(e.target.value))}
                style={{ width: "100%", padding: "8px", background: "#111", color: "#00e5ff", border: "1px solid #00e5ff" }}
              >
                {FIGHTER_STYLES.map((style, idx) => (
                  <option key={style.id} value={idx}>{style.name}</option>
                ))}
              </select>

              <div className="sf-section-label" style={{ fontSize: "11px", margin: "8px 0 2px 0" }}>Weapon Choice</div>
              <select
                value={p1WeaponIdx}
                onChange={(e) => setP1WeaponIdx(parseInt(e.target.value))}
                style={{ width: "100%", padding: "8px", background: "#111", color: "#00e5ff", border: "1px solid #00e5ff" }}
              >
                {WEAPONS.map((w, idx) => (
                  <option key={w.id} value={idx}>{w.icon} {w.name} (x{w.damageMult} DMG)</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", padding: "15px", borderRadius: "14px" }}>
              <div className="sf-section-label red-text">Player 2 / CPU Config</div>
              <div className="sf-section-label" style={{ fontSize: "11px", margin: "2px 0" }}>Fighter Style</div>
              <select 
                value={p2StyleIdx} 
                onChange={(e) => setP2StyleIdx(parseInt(e.target.value))}
                style={{ width: "100%", padding: "8px", background: "#111", color: "#ff5252", border: "1px solid #ff5252" }}
              >
                {FIGHTER_STYLES.map((style, idx) => (
                  <option key={style.id} value={idx}>{style.name}</option>
                ))}
              </select>

              <div className="sf-section-label" style={{ fontSize: "11px", margin: "8px 0 2px 0" }}>Weapon Choice</div>
              <select
                value={p2WeaponIdx}
                onChange={(e) => setP2WeaponIdx(parseInt(e.target.value))}
                style={{ width: "100%", padding: "8px", background: "#111", color: "#ff5252", border: "1px solid #ff5252" }}
              >
                {WEAPONS.map((w, idx) => (
                  <option key={w.id} value={idx}>{w.icon} {w.name} (x{w.damageMult} DMG)</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: "15px", width: "100%", maxWidth: "750px", textAlign: "center" }}>
            <div className="sf-section-label">Select Venue Stage</div>
            <div className="sf-venue-grid">
              {VENUES.map((v) => (
                <div 
                  key={v.id} 
                  className={`sf-venue-card ${v.id === venueId ? "selected" : ""}`}
                  onClick={() => setVenueId(v.id)}
                >
                  <div className="sf-venue-name">{v.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="sf-menu-buttons">
            <button className="sf-menu-btn" onClick={() => { setGameMode("1p"); startGame(); }}>1 Player vs CPU</button>
            <button className="sf-menu-btn purple" onClick={() => { setGameMode("2p"); startGame(); }}>2 Player Local</button>
          </div>

          <div className="sf-keys sf-keys-p1">
            <p><b>P1 Controls:</b> Move: <b>A/D</b> | Jump: <b>W</b> | Punch: <b>F</b> | Kick: <b>G</b> | Special: <b>Q</b></p>
            {gameMode === "2p" && (
              <p><b>P2 Controls:</b> Move: <b>Arrows</b> | Jump: <b>Up</b> | Punch: <b>K</b> | Kick: <b>L</b> | Special: <b>I</b></p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sf-root" ref={containerRef}>
      <button 
        onClick={() => setPhase("menu")} 
        style={{
          position: "fixed",
          top: "20px",
          left: "20px",
          background: "rgba(10,14,26,0.8)",
          border: "1px solid #00e5ff",
          color: "#00e5ff",
          padding: "8px 16px",
          cursor: "pointer",
          zIndex: 10,
          fontWeight: "bold"
        }}
      >← Exit Fight</button>

      <canvas ref={canvasRef} className="sf-canvas" style={{ width: "100vw", height: "100vh", display: "block" }} />

      {/* HUD Bar */}
      <div className="sf-hud">
        <div className="sf-hud-left">
          <span className="sf-label cyan-text">Player 1 ({FIGHTER_STYLES[p1StyleIdx].name})</span>
          <div className="sf-bar">
            <div className="sf-fill cyan" style={{ width: `${p1HP}%` }} />
          </div>
          <div className="sf-meter-wrap">
            <span style={{ fontSize: "10px", color: "#ffd740" }}>SPECIAL:</span>
            <div className="sf-meter-bar">
              <div className="sf-meter-fill" style={{ width: `${p1Special}%` }} />
            </div>
            {p1Special >= 100 && <span className="sf-ready-flash">READY [Q]</span>}
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
            <span className="sf-weapon-hud">{p1Weapon}</span>
            {p1Powerup && <span className="sf-powerup-hud" style={{ color: "#00e5ff" }}>{p1Powerup}</span>}
          </div>
        </div>

        <div className="sf-info">
          <div className="sf-score-display">{statusText}</div>
          <div className="sf-arena-name">{VENUES.find(v => v.id === venueId).name}</div>
          <div className="sf-mode-tag">{gameMode === "1p" ? "Solo vs AI" : "Local PvP"}</div>
        </div>

        <div className="sf-hud-right">
          <span className="sf-label red-text">Player 2 / CPU ({FIGHTER_STYLES[p2StyleIdx].name})</span>
          <div className="sf-bar">
            <div className="sf-fill red" style={{ width: `${p2HP}%` }} />
          </div>
          <div className="sf-meter-wrap">
            <span style={{ fontSize: "10px", color: "#ffd740" }}>SPECIAL:</span>
            <div className="sf-meter-bar">
              <div className="sf-meter-fill" style={{ width: `${p2Special}%` }} />
            </div>
            {p2Special >= 100 && <span className="sf-ready-flash">READY [I]</span>}
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "4px", justifyContent: "flex-end" }}>
            <span className="sf-weapon-hud">{p2Weapon}</span>
            {p2Powerup && <span className="sf-powerup-hud" style={{ color: "#ff5252" }}>{p2Powerup}</span>}
          </div>
        </div>
      </div>

      {/* Game Over Screen */}
      {phase === "gameover" && (
        <div className="sf-gameover">
          <h2>BATTLE OVER</h2>
          <p className="sf-go-score">{statusText}</p>
          <div className="sf-gameover-buttons">
            <button onClick={startGame}>Rematch</button>
            <button className="secondary" onClick={handleMenuExit}>Main Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
