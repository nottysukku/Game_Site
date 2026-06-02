import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import BackButton from './BackButton';
import './Multiplayer3D.css';

const PLAYER_COLORS = [0x34d399, 0x60a5fa, 0xf472b6, 0xf59e0b];
const PLAYER_COLORS_HEX = ['#34d399', '#60a5fa', '#f472b6', '#f59e0b'];
const PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4'];

const CONTROL_SETS = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', action: 'KeyQ', label: 'P1 WASD + Q [ABILITY]' },
  { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', action: 'KeyU', label: 'P2 IJKL + U [ABILITY]' },
  { up: 'KeyT', down: 'KeyG', left: 'KeyF', right: 'KeyH', action: 'KeyR', label: 'P3 TFGH + R [ABILITY]' },
  {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    action: 'Slash',
    label: 'P4 Arrows + / [ABILITY]',
  },
];

const DEFAULTS = {
  roundSeconds: 90,
  arenaSize: 34,
  baseSpeed: 8.4,
  variant: 'collect',
  collectPoints: 4,
  checkpointPoints: 6,
  tagRate: 4,
  zoneRate: 4,
  zoneRadius: 5,
  bombPenalty: 16,
  survivalRate: 2.4,
  meteorEvery: 1,
  hazardEnabled: false,
  palette: {
    background: 0x081525,
    floor: 0x12304d,
    wall: 0x3bb3ff,
    accent: 0xffd166,
    fog: 0x0b1b2e,
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function circlePoint(radius, angle) {
  return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}

// DYNAMIC CUSTOM 3D PLAYER MESHES BASED ON GAME VARIANT
function createPlayerMesh(color, variant) {
  const group = new THREE.Group();

  if (variant === 'dash') {
    // Futuristic speed racer ship (sharp wedge shape with carbon wings)
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.35, 4),
      new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0.8 })
    );
    body.rotation.x = Math.PI / 2;
    body.rotation.y = Math.PI / 4;
    body.position.y = 0.5;
    body.castShadow = true;

    const wings = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.15, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
    );
    wings.position.set(0, 0.35, 0.25);
    wings.castShadow = true;

    const glowThruster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.2, 8),
      new THREE.MeshBasicMaterial({ color })
    );
    glowThruster.rotation.x = Math.PI / 2;
    glowThruster.position.set(0, 0.4, -0.65);

    group.add(body, wings, glowThruster);
  } 
  else if (variant === 'collect') {
    // Floating sphere drone with rotating neon blades
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 16, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.6 })
    );
    body.position.y = 0.85;
    body.castShadow = true;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.08, 6, 24),
      new THREE.MeshStandardMaterial({ color: 0x151515, emissive: color, emissiveIntensity: 0.5 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.85;
    ring.castShadow = true;

    group.add(body, ring);
  } 
  else if (variant === 'tag') {
    // Cyber ninja agent (capsule with dynamic neon visor)
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.55, 1.0, 4, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 })
    );
    body.position.y = 0.95;
    body.castShadow = true;

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.16, 0.62),
      new THREE.MeshBasicMaterial({ color: 0x00ffd4 })
    );
    visor.position.set(0, 1.28, 0.25);

    group.add(body, visor);
  } 
  else if (variant === 'zone') {
    // Hover craft (flat plate chassis with glowing exhaust plates)
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.9, 0.22, 6),
      new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.7 })
    );
    plate.position.y = 0.4;
    plate.castShadow = true;

    const enginePod = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.3, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    enginePod.position.set(0, 0.5, -0.45);
    
    group.add(plate, enginePod);
  } 
  else if (variant === 'bomb') {
    // bulky hazard-suit (double capsule chassis)
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.62, 0.85, 6, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.15 })
    );
    body.position.y = 0.9;
    body.castShadow = true;

    const mask = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.1, metalness: 0.95 })
    );
    mask.position.set(0, 1.18, 0.32);
    group.add(body, mask);
  } 
  else {
    // Heavy armored mech tank (boxy structure)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.75, 1.15),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.85 })
    );
    body.position.y = 0.55;
    body.castShadow = true;

    const turret = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.35, 0.75),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7 })
    );
    turret.position.set(0, 0.95, 0.15);
    turret.castShadow = true;

    group.add(body, turret);
  }

  return group;
}

function makeOrb(color, radius = 0.5) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 20, 20),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.2 })
  );
  mesh.castShadow = true;
  return mesh;
}

function rankingText(scores) {
  return scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score)
    .map((entry, rank) => `${rank + 1}. ${PLAYER_LABELS[entry.index]} - ${Math.round(entry.score)}`)
    .join(' | ');
}

// DYNAMIC 3D WORLD AND SCENERY ENGINE FOR EVERY GAME VARIANT
function generateGameWorld(engine, variant) {
  const scene = engine.scene;
  const worldAssets = [];
  engine.worldAssets = worldAssets;

  if (variant === 'tag') {
    // 1. Neon Tag Arena - Glowing Pillars & Center Holographic Tower
    const pillarGeo = new THREE.BoxGeometry(2.5, 7.5, 2.5);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x0984e3,
      emissive: 0x0984e3,
      emissiveIntensity: 0.2,
      roughness: 0.1,
      metalness: 0.95
    });

    const coords = [[11, 11], [-11, 11], [11, -11], [-11, -11]];
    coords.forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 3.75, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);
      
      const neonBorder = new THREE.Mesh(
        new THREE.BoxGeometry(2.7, 0.3, 2.7),
        new THREE.MeshBasicMaterial({ color: 0x00f5d4 })
      );
      neonBorder.position.set(px, 7.6, pz);
      scene.add(neonBorder);

      worldAssets.push(pillar, neonBorder);
      engine.obstacles.push({
        position: new THREE.Vector3(px, 0.5, pz),
        radius: 1.8
      });
    });

    // Central Spinning Holographic Database
    const centerTorus = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.22, 10, 36),
      new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.85 })
    );
    centerTorus.rotation.x = Math.PI / 2;
    centerTorus.position.set(0, 4.0, 0);
    scene.add(centerTorus);
    worldAssets.push(centerTorus);

    engine.activeEffects.push({
      mesh: centerTorus,
      update: (dt) => {
        centerTorus.rotation.z += dt * 1.6;
        centerTorus.position.y = 4.0 + Math.sin(engine.elapsed * 2.2) * 0.75;
        return false;
      }
    });

    engine.obstacles.push({ position: new THREE.Vector3(0, 0.5, 0), radius: 1.4 });
  } 
  else if (variant === 'collect') {
    // 2. Crystal Comet Clash - Low Poly Floating Asteroids & Glowing Crystals
    const crystalGeo = new THREE.ConeGeometry(0.35, 1.8, 5);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xf472b6,
      emissiveIntensity: 0.65,
      roughness: 0.05
    });

    const crystalPositions = [[7, 5], [-8, 6], [5, -9], [-6, -7], [0, 8], [0, -8]];
    crystalPositions.forEach(([px, pz], idx) => {
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.set(px, 0.8, pz);
      crystal.rotation.x = (Math.random() - 0.5) * 0.45;
      crystal.rotation.z = (Math.random() - 0.5) * 0.45;
      crystal.castShadow = true;
      scene.add(crystal);
      worldAssets.push(crystal);
      engine.obstacles.push({ position: new THREE.Vector3(px, 0.5, pz), radius: 0.85 });
    });

    // Floating asteroids drifting in background
    const asteroidGeo = new THREE.DodecahedronGeometry(1.6, 1);
    const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.96 });
    for (let i = 0; i < 4; i++) {
      const asteroid = new THREE.Mesh(asteroidGeo, asteroidMat);
      const angle = (i * Math.PI) / 2 + 0.35;
      asteroid.position.set(Math.cos(angle) * 31, 5.5 + Math.random() * 4, Math.sin(angle) * 31);
      scene.add(asteroid);
      worldAssets.push(asteroid);

      const rotateSpeed = new THREE.Vector3(Math.random() * 0.15, Math.random() * 0.15, Math.random() * 0.15);
      engine.activeEffects.push({
        mesh: asteroid,
        update: (dt) => {
          asteroid.rotation.x += rotateSpeed.x * dt;
          asteroid.rotation.y += rotateSpeed.y * dt;
          asteroid.rotation.z += rotateSpeed.z * dt;
          return false;
        }
      });
    }
  } 
  else if (variant === 'bomb') {
    // 3. Volcanic Magma Chamber - Shifting Lava Plane, Obsidian Spires, Heat Embers
    const lavaGeo = new THREE.PlaneGeometry(150, 150, 16, 16);
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0.8, wireframe: false });
    const lava = new THREE.Mesh(lavaGeo, lavaMat);
    lava.rotation.x = -Math.PI / 2;
    lava.position.y = -4.5;
    scene.add(lava);
    worldAssets.push(lava);

    // Dark Spire Volcanoes
    const spireGeo = new THREE.ConeGeometry(1.5, 8.5, 6);
    const spireMat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.92 });
    const spirePositions = [[14, 0], [-14, 0], [0, 14], [0, -14]];
    spirePositions.forEach(([px, pz]) => {
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.set(px, 3.8, pz);
      spire.castShadow = true;
      scene.add(spire);
      worldAssets.push(spire);
      engine.obstacles.push({ position: new THREE.Vector3(px, 0.5, pz), radius: 1.85 });
    });

    // Subterranean glowing heat embers
    const emberCount = 50;
    const emberGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 75;
      positions[i * 3 + 1] = -4 + Math.random() * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 75;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const emberMat = new THREE.PointsMaterial({ color: 0xffa000, size: 0.35, transparent: true, opacity: 0.85 });
    const embers = new THREE.Points(emberGeo, emberMat);
    scene.add(embers);
    worldAssets.push(embers);

    engine.activeEffects.push({
      mesh: embers,
      update: (dt) => {
        const posAttr = emberGeo.getAttribute('position');
        for (let i = 0; i < emberCount; i++) {
          let y = posAttr.getY(i);
          y += dt * 3.8;
          if (y > 22) y = -4.0;
          posAttr.setY(i, y);

          let x = posAttr.getX(i);
          x += Math.sin(engine.elapsed + i) * 0.06;
          posAttr.setX(i, x);
        }
        posAttr.needsUpdate = true;

        // Wave magma shifting
        lava.position.y = -4.5 + Math.sin(engine.elapsed * 1.8) * 0.35;
        return false;
      }
    });
  } 
  else if (variant === 'zone') {
    // 4. Underwater Neon Dome - Swaying Seaweed & Oxygen Rising Bubbles
    const weedGeo = new THREE.PlaneGeometry(1.2, 7.5, 1, 8);
    const weedMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      roughness: 0.85
    });

    const weedPositions = [[11, 7], [-11, -7], [7, -11], [-7, 11]];
    weedPositions.forEach(([px, pz], idx) => {
      const weed = new THREE.Mesh(weedGeo, weedMat);
      weed.position.set(px, 3.2, pz);
      scene.add(weed);
      worldAssets.push(weed);
      engine.obstacles.push({ position: new THREE.Vector3(px, 0.5, pz), radius: 1.0 });

      engine.activeEffects.push({
        mesh: weed,
        update: (dt) => {
          weed.rotation.y = Math.sin(engine.elapsed * 1.35 + idx) * 0.3;
          weed.rotation.z = Math.cos(engine.elapsed * 0.9 + idx) * 0.16;
          return false;
        }
      });
    });

    // Bubbles generator
    const bubbleCount = 45;
    const bubbleGeo = new THREE.BufferGeometry();
    const bubblePositions = new Float32Array(bubbleCount * 3);
    for (let i = 0; i < bubbleCount; i++) {
      bubblePositions[i * 3] = (Math.random() - 0.5) * 65;
      bubblePositions[i * 3 + 1] = -4 + Math.random() * 24;
      bubblePositions[i * 3 + 2] = (Math.random() - 0.5) * 65;
    }
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePositions, 3));
    const bubbleMat = new THREE.PointsMaterial({ color: 0x81ecec, size: 0.3, transparent: true, opacity: 0.65 });
    const bubbles = new THREE.Points(bubbleGeo, bubbleMat);
    scene.add(bubbles);
    worldAssets.push(bubbles);

    engine.activeEffects.push({
      mesh: bubbles,
      update: (dt) => {
        const posAttr = bubbleGeo.getAttribute('position');
        for (let i = 0; i < bubbleCount; i++) {
          let y = posAttr.getY(i);
          y += dt * 4.2;
          if (y > 22) y = -4.0;
          posAttr.setY(i, y);
        }
        posAttr.needsUpdate = true;
        return false;
      }
    });
  } 
  else if (variant === 'meteor') {
    // 5. Sky-Dock Cloud Platform - Drifting Clouds Under Stage & Steel Girders
    const cloudGroup = new THREE.Group();
    scene.add(cloudGroup);
    worldAssets.push(cloudGroup);

    const cMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.88, transparent: true, opacity: 0.38 });
    const cloudGeo = new THREE.SphereGeometry(6, 8, 8);
    for (let i = 0; i < 6; i++) {
      const cloud = new THREE.Mesh(cloudGeo, cMat);
      cloud.position.set((Math.random() - 0.5) * 80, -9 - Math.random() * 5, (Math.random() - 0.5) * 80);
      cloud.scale.set(1.9, 0.42, 1.35);
      cloudGroup.add(cloud);

      engine.activeEffects.push({
        mesh: cloud,
        update: (dt) => {
          cloud.position.x += dt * 3.2;
          if (cloud.position.x > 80) cloud.position.x = -80;
          return false;
        }
      });
    }

    // Steel structure columns
    const girderGeo = new THREE.BoxGeometry(0.35, 7.5, 0.35);
    const girderMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.88, roughness: 0.35 });
    const girderCoords = [[13, 9], [-13, -9]];
    girderCoords.forEach(([px, pz]) => {
      const girder = new THREE.Mesh(girGeo, girderMat);
      girder.position.set(px, 3.6, pz);
      girder.rotation.z = Math.PI / 4;
      scene.add(girder);
      worldAssets.push(girder);
      engine.obstacles.push({ position: new THREE.Vector3(px, 0.5, pz), radius: 1.0 });
    });
  } 
  else if (variant === 'dash') {
    // 6. Synthwave Grandstand - Starting Gate Arches
    const arch = new THREE.Group();
    scene.add(arch);
    worldAssets.push(arch);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.85, roughness: 0.2 });
    const neonBarMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });

    const leftCol = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 5.8, 8), pillarMat);
    leftCol.position.set(-5.5, 2.9, 0);
    const rightCol = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 5.8, 8), pillarMat);
    rightCol.position.set(5.5, 2.9, 0);
    
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.35, 0.35), neonBarMat);
    crossbar.position.set(0, 5.8, 0);

    arch.add(leftCol, rightCol, crossbar);
    arch.position.set(0, 0, 13); // Setup racetrack gate
    worldAssets.push(leftCol, rightCol, crossbar);

    engine.obstacles.push(
      { position: new THREE.Vector3(-5.5, 0.5, 13), radius: 0.85 },
      { position: new THREE.Vector3(5.5, 0.5, 13), radius: 0.85 }
    );
  }
}

export default function PartyArenaCore({ config }) {
  const merged = useMemo(() => ({ ...DEFAULTS, ...config, palette: { ...DEFAULTS.palette, ...(config.palette || {}) } }), [config]);
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const keyStateRef = useRef({});
  const consumedActionRef = useRef({});

  const [playerCount, setPlayerCount] = useState(4);
  const [phase, setPhase] = useState('menu');
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [timeLeft, setTimeLeft] = useState(merged.roundSeconds);
  const [statusText, setStatusText] = useState(merged.objective || 'Score the most points before time runs out.');

  // Ability text readouts
  const abilityLabel = useMemo(() => {
    if (merged.variant === 'tag') return 'DASH (Speed Forward)';
    if (merged.variant === 'zone') return 'PULSE SHOCKWAVE (Push Opponents)';
    if (merged.variant === 'collect') return 'GRAVITY MAGNET (Pull Nearby Orbs)';
    if (merged.variant === 'bomb') return 'DEFLECT SHIELD (Immunity)';
    if (merged.variant === 'dash') return 'NITRO OVERDRIVE (Super Boost)';
    if (merged.variant === 'meteor') return 'THRUSTER JUMP (Dodge Meteors)';
    return 'DASH';
  }, [merged.variant]);

  useEffect(() => {
    const onKeyDown = e => {
      keyStateRef.current[e.code] = true;
    };
    const onKeyUp = e => {
      keyStateRef.current[e.code] = false;
      consumedActionRef.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (engineRef.current?.dispose) {
        engineRef.current.dispose();
      }
    };
  }, []);

  function spawnPickups(engine, count = 1) {
    const radius = merged.arenaSize * 0.38;
    for (let i = 0; i < count; i += 1) {
      const pickup = {
        mesh: makeOrb(merged.palette.accent, 0.5),
        radius: 0.92,
      };
      pickup.mesh.position.copy(circlePoint(radius * (0.2 + Math.random() * 0.8), Math.random() * Math.PI * 2));
      pickup.mesh.position.y = 0.85;
      pickup.spin = Math.random() * 2 + 0.8;
      engine.scene.add(pickup.mesh);
      engine.pickups.push(pickup);
    }
  }

  function createHazard(engine) {
    const hazard = {
      mesh: new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.32, 12, 22),
        new THREE.MeshStandardMaterial({ color: 0xff5d73, emissive: 0xff1b44, emissiveIntensity: 0.35 })
      ),
      radius: 1.2,
      drift: new THREE.Vector3((Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5),
    };
    hazard.mesh.rotation.x = Math.PI / 2;
    hazard.mesh.position.copy(circlePoint(merged.arenaSize * 0.3, Math.random() * Math.PI * 2));
    hazard.mesh.position.y = 0.3;
    engine.scene.add(hazard.mesh);
    engine.hazards.push(hazard);
  }

  function setupEngine(count) {
    if (!mountRef.current) return null;
    if (engineRef.current?.dispose) {
      engineRef.current.dispose();
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(merged.palette.background);
    scene.fog = new THREE.FogExp2(merged.palette.fog, 0.015);

    // Dynamic Camera View depending on Variant
    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 250);
    if (merged.variant === 'dash') {
      camera.position.set(0, 32, 34); // Closer chase angle for racing
    } else if (merged.variant === 'bomb') {
      camera.position.set(0, 42, 22); // High bird's eye cage view for bomb
    } else {
      camera.position.set(0, 38, 30);
    }
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    const directional = new THREE.DirectionalLight(0xffffff, 1.25);
    directional.position.set(24, 45, 18);
    directional.castShadow = true;
    directional.shadow.mapSize.set(1024, 1024);
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 140;
    scene.add(ambient, directional);

    // DYNAMIC FLOOR DESIGNS
    let floorMat;
    if (merged.variant === 'meteor') {
      // Meteor arena - cracked dark stone with glowing red undertones
      floorMat = new THREE.MeshStandardMaterial({
        color: 0x1d1326,
        roughness: 0.9,
        emissive: 0xaa2200,
        emissiveIntensity: 0.15
      });
    } else if (merged.variant === 'zone') {
      // Hollowed metallic ring grid for zone bump
      floorMat = new THREE.MeshStandardMaterial({
        color: 0x0a1f24,
        roughness: 0.7,
        metalness: 0.6
      });
    } else {
      floorMat = new THREE.MeshStandardMaterial({
        color: merged.palette.floor,
        roughness: 0.8,
        metalness: 0.1
      });
    }

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(merged.arenaSize, merged.arenaSize, 1, 48),
      floorMat
    );
    floor.receiveShadow = true;
    scene.add(floor);

    // Glowing Neon Boundary Fences
    const wall = new THREE.Mesh(
      new THREE.TorusGeometry(merged.arenaSize + 0.35, 1.3, 20, 64),
      new THREE.MeshStandardMaterial({ color: merged.palette.wall, emissive: merged.palette.wall, emissiveIntensity: 0.25 })
    );
    wall.rotation.x = Math.PI / 2;
    wall.position.y = 1.2;
    scene.add(wall);

    // BUILD VARIANT SPECIFIC SCENERY / OBSTACLES
    const activeObstacles = [];

    const players = [];
    const scoresRef = [0, 0, 0, 0];
    const startRadius = merged.arenaSize * 0.58;
    for (let i = 0; i < count; i += 1) {
      const mesh = createPlayerMesh(PLAYER_COLORS[i], merged.variant);
      mesh.position.copy(circlePoint(startRadius, (i / count) * Math.PI * 2));
      mesh.position.y = 0.5;
      scene.add(mesh);

      // Add dynamic glowing ring shield mesh around the player, hidden initially
      const shieldMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshBasicMaterial({ color: PLAYER_COLORS[i], transparent: true, opacity: 0.28, wireframe: true })
      );
      shieldMesh.visible = false;
      mesh.add(shieldMesh);

      players.push({
        index: i,
        mesh,
        shieldMesh,
        radius: 0.92,
        velocity: new THREE.Vector3(),
        alive: true,
        
        // Ability state values
        actionCooldown: 0,
        actionTime: 0,
        yVelocity: 0, // for jump physics
        
        colorHex: PLAYER_COLORS_HEX[i],
      });
    }

    const zoneMesh = new THREE.Mesh(
      new THREE.RingGeometry((merged.zoneRadius || 5) - 0.4, merged.zoneRadius || 5, 40),
      new THREE.MeshBasicMaterial({ color: merged.palette.accent, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    zoneMesh.rotation.x = -Math.PI / 2;
    zoneMesh.position.set(0, 0.08, 0);
    zoneMesh.visible = merged.variant === 'zone';
    scene.add(zoneMesh);

    const crownMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.2, 7),
      new THREE.MeshStandardMaterial({ color: 0xffe169, emissive: 0xffbd2e, emissiveIntensity: 0.35 })
    );
    crownMesh.position.y = 2.8;
    crownMesh.visible = merged.variant === 'tag';
    scene.add(crownMesh);

    const checkpointMesh = makeOrb(0x99f6e4, 0.65);
    checkpointMesh.visible = merged.variant === 'dash';
    checkpointMesh.position.set(0, 1.1, 0);
    scene.add(checkpointMesh);

    const bombMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xff5d5d, emissive: 0xff0000, emissiveIntensity: 0.35 })
    );
    bombMesh.visible = merged.variant === 'bomb';
    scene.add(bombMesh);

    const meteorGeo = new THREE.IcosahedronGeometry(1.0, 1);
    const meteorMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12, emissiveIntensity: 0.35 });

    const activeEffects = [];

    const engine = {
      scene,
      camera,
      renderer,
      floor,
      wall,
      players,
      zoneMesh,
      crownMesh,
      checkpointMesh,
      bombMesh,
      obstacles: activeObstacles,
      pickups: [],
      hazards: [],
      meteors: [],
      activeEffects,
      meteorGeo,
      meteorMat,
      scoresRef,
      crownHolder: 0,
      zoneCenter: new THREE.Vector3(),
      checkpointPos: circlePoint(merged.arenaSize * 0.45, Math.PI * 0.25),
      bombHolder: 0,
      bombTimer: 4.8,
      elapsed: 0,
      lastTime: 0,
      active: true,
      over: false,
      dispose: () => {
        engine.active = false;
        cancelAnimationFrame(engine.animFrame);
        window.removeEventListener('resize', engine.handleResize);
        if (renderer.domElement.parentElement === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }

        // Clean up custom world assets to prevent memory leaks
        if (engine.worldAssets) {
          engine.worldAssets.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
              if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
              else mesh.material.dispose();
            }
            scene.remove(mesh);
          });
        }

        renderer.dispose();
      },
    };

    if (merged.variant === 'collect' || merged.variant === 'dash' || merged.variant === 'zone') {
      spawnPickups(engine, 6);
    }
    if (merged.hazardEnabled) {
      for (let i = 0; i < 3; i += 1) {
        createHazard(engine);
      }
    }

    engine.handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    window.addEventListener('resize', engine.handleResize);
    engine.handleResize();

    // Invoke dedicated World Scenery builder before returning
    generateGameWorld(engine, merged.variant);

    engineRef.current = engine;
    return engine;
  }

  // TRIGGER SPECIAL ABILITY MECHANIC
  function triggerSpecialAction(engine, player, idx) {
    if (player.actionCooldown > 0) return;

    if (merged.variant === 'tag') {
      // 1. DASH - forward burst speed
      player.actionTime = 0.25;
      player.actionCooldown = 2.0; // 2 seconds cooldown
      setStatusText(`${PLAYER_LABELS[idx]} activated super DASH!`);
      spawnPulseEffect(engine, player.mesh.position, player.colorHex, 1.2);
    } 
    else if (merged.variant === 'zone') {
      // 2. SHOCKWAVE PULSE - knocks back all players
      player.actionCooldown = 3.2;
      setStatusText(`${PLAYER_LABELS[idx]} fired EMP SHOCKWAVE!`);
      spawnPulseEffect(engine, player.mesh.position, '#00f5d4', 6.2);

      // Physical knockback calculations on rivals
      engine.players.forEach(rival => {
        if (!rival.alive || rival.index === idx) return;
        const dx = rival.mesh.position.x - player.mesh.position.x;
        const dz = rival.mesh.position.z - player.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 6.8) {
          const power = (6.8 - dist) * 3.5;
          const pushX = (dx / (dist || 0.001)) * power;
          const pushZ = (dz / (dist || 0.001)) * power;
          rival.mesh.position.x += pushX;
          rival.mesh.position.z += pushZ;
        }
      });
    } 
    else if (merged.variant === 'collect') {
      // 3. GRAVITY MAGNET - pulls nearby orbs
      player.actionTime = 1.8;
      player.actionCooldown = 4.0;
      setStatusText(`${PLAYER_LABELS[idx]} activated GRAVITY MAGNET!`);
      spawnPulseEffect(engine, player.mesh.position, player.colorHex, 3.5);
    } 
    else if (merged.variant === 'bomb') {
      // 4. DEFLECT SHIELD - temporary immunity
      player.actionTime = 1.4;
      player.actionCooldown = 3.6;
      player.shieldMesh.visible = true;
      setStatusText(`${PLAYER_LABELS[idx]} raised immunity DEFLECT SHIELD!`);
    } 
    else if (merged.variant === 'dash') {
      // 5. NITRO OVERDRIVE - huge speed burst
      player.actionTime = 1.0;
      player.actionCooldown = 3.5;
      setStatusText(`${PLAYER_LABELS[idx]} engaged NITRO OVERDRIVE!`);
      spawnPulseEffect(engine, player.mesh.position, '#ff9f1c', 2.0);
    } 
    else if (merged.variant === 'meteor') {
      // 6. THRUSTER JUMP - vertical jump into the air
      if (player.mesh.position.y <= 0.55) {
        player.yVelocity = 16.5;
        player.actionCooldown = 1.2;
        setStatusText(`${PLAYER_LABELS[idx]} fired vertical JUMP THRUSTERS!`);
        spawnPulseEffect(engine, player.mesh.position, '#2196f3', 1.6);
      }
    }
  }

  // Visual shockwave ring mesh in 3D scene
  function spawnPulseEffect(engine, position, color, maxRadius) {
    const ringGeo = new THREE.RingGeometry(0.1, 0.3, 30);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    ring.position.y = 0.58;
    engine.scene.add(ring);

    engine.activeEffects.push({
      mesh: ring,
      radius: 0.1,
      maxRadius,
      color,
      update: (dt) => {
        ring.scale.addScalar(dt * (maxRadius * 3.8));
        ringMat.opacity = Math.max(0, ringMat.opacity - dt * 2.6);
        return ringMat.opacity <= 0.02;
      }
    });
  }

  function movePlayers(engine, dt) {
    const boundary = merged.arenaSize - 1.2;
    for (let i = 0; i < playerCount; i += 1) {
      const player = engine.players[i];
      if (!player || !player.alive) continue;
      const ctl = CONTROL_SETS[i];

      // Decrement Ability timers
      if (player.actionCooldown > 0) player.actionCooldown -= dt;
      if (player.actionTime > 0) {
        player.actionTime -= dt;
        if (player.actionTime <= 0) {
          player.shieldMesh.visible = false; // Disable shield
        }
      }

      // Check ability trigger
      if (keyStateRef.current[ctl.action] && !consumedActionRef.current[ctl.action]) {
        consumedActionRef.current[ctl.action] = true;
        triggerSpecialAction(engine, player, i);
      }

      // Movement vectors
      let x = 0;
      let z = 0;
      if (keyStateRef.current[ctl.left]) x -= 1;
      if (keyStateRef.current[ctl.right]) x += 1;
      if (keyStateRef.current[ctl.up]) z -= 1;
      if (keyStateRef.current[ctl.down]) z += 1;
      const len = Math.hypot(x, z);
      if (len > 0) {
        x /= len;
        z /= len;
      }

      // Speed boosting abilities
      let abilityMultiplier = 1.0;
      if (merged.variant === 'tag' && player.actionTime > 0) {
        abilityMultiplier = 2.4; // Tag Super Dash
      } else if (merged.variant === 'dash' && player.actionTime > 0) {
        abilityMultiplier = 2.0; // Nitro Overdrive
      }

      // Floor Speed Chevrons Check (Dash Variant Only)
      let padBoost = 1.0;
      if (merged.variant === 'dash' && engineRef.current_chevrons) {
        engineRef.current_chevrons.forEach(pad => {
          if (player.mesh.position.distanceTo(pad.position) < pad.radius) {
            padBoost = 1.85; // Speed Pad boost
          }
        });
      }

      const speed = merged.baseSpeed * abilityMultiplier * padBoost;
      player.velocity.x = x * speed;
      player.velocity.z = z * speed;
      
      player.mesh.position.x += player.velocity.x * dt;
      player.mesh.position.z += player.velocity.z * dt;

      // Thruster Jump Physics (Y Position gravity simulation)
      if (merged.variant === 'meteor' || player.yVelocity > 0 || player.mesh.position.y > 0.5) {
        player.mesh.position.y += player.yVelocity * dt;
        player.yVelocity -= 36 * dt; // Gravity
        if (player.mesh.position.y <= 0.5) {
          player.mesh.position.y = 0.5;
          player.yVelocity = 0;
        }
      }

      // Arena boundary limits
      const dist = Math.hypot(player.mesh.position.x, player.mesh.position.z);
      if (dist > boundary) {
        const scale = boundary / Math.max(0.001, dist);
        player.mesh.position.x *= scale;
        player.mesh.position.z *= scale;
      }

      // Rotate model towards heading
      if (len > 0) {
        player.mesh.rotation.y = Math.atan2(player.velocity.x, player.velocity.z);
      }

      // Scenery Collisions (Tag corner towers)
      if (engine.obstacles && engine.obstacles.length > 0) {
        engine.obstacles.forEach(obs => {
          if (!obs.position) return;
          const dx = player.mesh.position.x - obs.position.x;
          const dz = player.mesh.position.z - obs.position.z;
          const d = Math.hypot(dx, dz);
          const minD = player.radius + obs.radius;
          if (d < minD) {
            const overlap = minD - d;
            player.mesh.position.x += (dx / (d || 0.001)) * overlap;
            player.mesh.position.z += (dz / (d || 0.001)) * overlap;
          }
        });
      }
    }
  }

  function resolveBumps(engine) {
    const players = engine.players;
    for (let i = 0; i < playerCount; i += 1) {
      const a = players[i];
      if (!a?.alive) continue;
      for (let j = i + 1; j < playerCount; j += 1) {
        const b = players[j];
        if (!b?.alive) continue;
        const dx = b.mesh.position.x - a.mesh.position.x;
        const dz = b.mesh.position.z - a.mesh.position.z;
        const d = Math.hypot(dx, dz);
        const minDist = a.radius + b.radius;
        if (d > 0 && d < minDist) {
          const overlap = (minDist - d) * 0.5;
          const nx = dx / d;
          const nz = dz / d;
          a.mesh.position.x -= nx * overlap;
          a.mesh.position.z -= nz * overlap;
          b.mesh.position.x += nx * overlap;
          b.mesh.position.z += nz * overlap;

          // TAG - Steal the crown, unless immune by abilities
          if (merged.variant === 'tag') {
            if (engine.crownHolder === a.index) {
              engine.crownHolder = b.index;
              setStatusText(`${PLAYER_LABELS[b.index]} stole the crown.`);
            } else if (engine.crownHolder === b.index) {
              engine.crownHolder = a.index;
              setStatusText(`${PLAYER_LABELS[a.index]} stole the crown.`);
            }
          }

          // BOMB - Pass the bomb, unless immune by Deflect Shield
          if (merged.variant === 'bomb') {
            if (engine.bombHolder === a.index && b.actionTime <= 0) {
              engine.bombHolder = b.index;
              setStatusText(`BOMB passed to ${PLAYER_LABELS[b.index]}!`);
            } else if (engine.bombHolder === b.index && a.actionTime <= 0) {
              engine.bombHolder = a.index;
              setStatusText(`BOMB passed to ${PLAYER_LABELS[a.index]}!`);
            }
          }
        }
      }
    }
  }

  function updatePickups(engine, dt) {
    for (let i = engine.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = engine.pickups[i];
      pickup.mesh.rotation.y += pickup.spin * dt;
      pickup.mesh.position.y = 0.9 + Math.sin(engine.elapsed * 2.8 + i) * 0.15;
      
      // Pull towards player if GRAVITY MAGNET is engaged
      for (let p = 0; p < playerCount; p += 1) {
        const player = engine.players[p];
        if (!player?.alive) continue;

        if (merged.variant === 'collect' && player.actionTime > 0) {
          const distToMagnet = player.mesh.position.distanceTo(pickup.mesh.position);
          if (distToMagnet < 12.0) {
            const pullDir = new THREE.Vector3().subVectors(player.mesh.position, pickup.mesh.position).normalize();
            pickup.mesh.position.addScaledVector(pullDir, dt * 14);
          }
        }
      }

      // Check pickup grab collision
      for (let p = 0; p < playerCount; p += 1) {
        const player = engine.players[p];
        if (!player?.alive) continue;
        const d = player.mesh.position.distanceTo(pickup.mesh.position);
        if (d < player.radius + pickup.radius) {
          engine.scene.remove(pickup.mesh);
          engine.pickups.splice(i, 1);
          engine.scoresRef[p] += merged.collectPoints || 4;
          setStatusText(`${PLAYER_LABELS[p]} gathered an orb.`);
          spawnPickups(engine, 1);
          break;
        }
      }
    }
  }

  function updateHazards(engine, dt) {
    for (const hazard of engine.hazards) {
      hazard.mesh.rotation.z += dt * 2;
      hazard.mesh.rotation.x += dt * 1.1;
      hazard.mesh.position.x += hazard.drift.x * dt;
      hazard.mesh.position.z += hazard.drift.z * dt;

      const dist = Math.hypot(hazard.mesh.position.x, hazard.mesh.position.z);
      if (dist > merged.arenaSize * 0.72) {
        hazard.drift.multiplyScalar(-1);
      }

      for (let p = 0; p < playerCount; p += 1) {
        const player = engine.players[p];
        if (!player?.alive) continue;
        const d = player.mesh.position.distanceTo(hazard.mesh.position);
        if (d < player.radius + hazard.radius) {
          engine.scoresRef[p] = Math.max(0, engine.scoresRef[p] - 5 * dt);
        }
      }
    }
  }

  function updateZone(engine, dt) {
    const wave = engine.elapsed * 0.35;
    engine.zoneCenter.set(
      Math.cos(wave) * merged.arenaSize * 0.35,
      0,
      Math.sin(wave * 1.35) * merged.arenaSize * 0.35
    );
    engine.zoneMesh.position.set(engine.zoneCenter.x, 0.08, engine.zoneCenter.z);

    for (let p = 0; p < playerCount; p += 1) {
      const player = engine.players[p];
      if (!player?.alive) continue;
      const d = player.mesh.position.distanceTo(engine.zoneCenter);
      if (d <= (merged.zoneRadius || 5)) {
        engine.scoresRef[p] += (merged.zoneRate || 4) * dt;
      }
    }
  }

  function updateTag(engine, dt) {
    const holder = engine.players[engine.crownHolder];
    if (!holder) return;
    engine.crownMesh.visible = true;
    engine.crownMesh.position.set(holder.mesh.position.x, 3.05, holder.mesh.position.z);
    engine.crownMesh.rotation.y += dt * 2.4;
    engine.scoresRef[engine.crownHolder] += (merged.tagRate || 4) * dt;

    // ACTIVE CAMERA FOCUS (Tag variant tracks the crown carrier organically)
    engine.camera.position.x += (holder.mesh.position.x - engine.camera.position.x) * 0.06;
    engine.camera.lookAt(holder.mesh.position);
  }

  function updateDash(engine, dt) {
    engine.checkpointMesh.visible = true;
    engine.checkpointMesh.rotation.y += dt * 2.1;
    engine.checkpointMesh.position.x = engine.checkpointPos.x;
    engine.checkpointMesh.position.z = engine.checkpointPos.z;
    engine.checkpointMesh.position.y = 1 + Math.sin(engine.elapsed * 3.2) * 0.24;

    for (let p = 0; p < playerCount; p += 1) {
      const player = engine.players[p];
      if (!player?.alive) continue;
      const d = player.mesh.position.distanceTo(engine.checkpointMesh.position);
      if (d < 1.75) {
        engine.scoresRef[p] += merged.checkpointPoints || 6;
        const angle = Math.random() * Math.PI * 2;
        engine.checkpointPos = circlePoint(merged.arenaSize * (0.22 + Math.random() * 0.55), angle);
        setStatusText(`${PLAYER_LABELS[p]} reached the checkpoint.`);
        break;
      }
    }
  }

  function updateBomb(engine, dt) {
    const holder = engine.players[engine.bombHolder];
    if (!holder) return;

    engine.bombTimer -= dt;
    engine.bombMesh.visible = true;
    engine.bombMesh.position.set(holder.mesh.position.x, 2.6, holder.mesh.position.z);
    engine.bombMesh.scale.setScalar(1 + Math.max(0, 1.2 - engine.bombTimer) * 0.15);

    if (engine.bombTimer <= 0) {
      const idx = engine.bombHolder;
      engine.scoresRef[idx] = Math.max(0, engine.scoresRef[idx] - (merged.bombPenalty || 16));
      engine.bombTimer = 4.8;
      
      // Pass the bomb randomly, avoiding shielded immune players
      const validTargets = engine.players.slice(0, playerCount).filter(p => p.alive && p.actionTime <= 0);
      if (validTargets.length > 0) {
        engine.bombHolder = validTargets[Math.floor(Math.random() * validTargets.length)].index;
      } else {
        engine.bombHolder = Math.floor(Math.random() * playerCount);
      }
      
      setStatusText(`${PLAYER_LABELS[idx]} got bombed!`);
      spawnPulseEffect(engine, holder.mesh.position, '#ff1b44', 3.8);
    }
  }

  function updateMeteor(engine, dt) {
    if (!engine.meteorSpawnClock) engine.meteorSpawnClock = 0;
    engine.meteorSpawnClock -= dt;
    if (engine.meteorSpawnClock <= 0) {
      engine.meteorSpawnClock = merged.meteorEvery || 1;
      const meteor = {
        mesh: new THREE.Mesh(engine.meteorGeo, engine.meteorMat),
        velocity: new THREE.Vector3(0, -14 - Math.random() * 7, 0),
      };
      meteor.mesh.position.set(
        (Math.random() - 0.5) * merged.arenaSize * 1.2,
        20 + Math.random() * 8,
        (Math.random() - 0.5) * merged.arenaSize * 1.2
      );
      meteor.mesh.castShadow = true;
      engine.scene.add(meteor.mesh);
      engine.meteors.push(meteor);
    }

    for (let i = engine.meteors.length - 1; i >= 0; i -= 1) {
      const meteor = engine.meteors[i];
      meteor.mesh.position.addScaledVector(meteor.velocity, dt);
      meteor.mesh.rotation.x += dt * 3;
      meteor.mesh.rotation.z += dt * 1.7;

      for (let p = 0; p < playerCount; p += 1) {
        const player = engine.players[p];
        if (!player?.alive) continue;
        
        // Skip check if player is jumping high in the air
        if (player.mesh.position.y > 2.0) continue;

        const d = player.mesh.position.distanceTo(meteor.mesh.position);
        if (d < 1.6) {
          player.alive = false;
          player.mesh.visible = false;
          setStatusText(`${PLAYER_LABELS[p]} was hit by a meteor.`);
          spawnPulseEffect(engine, player.mesh.position, '#ff5252', 2.0);
        }
      }

      if (meteor.mesh.position.y <= -1.5) {
        engine.scene.remove(meteor.mesh);
        engine.meteors.splice(i, 1);
      }
    }

    for (let p = 0; p < playerCount; p += 1) {
      const player = engine.players[p];
      if (!player?.alive) continue;
      engine.scoresRef[p] += (merged.survivalRate || 2.4) * dt;
    }

    const alive = engine.players.slice(0, playerCount).filter(p => p.alive).length;
    if (alive <= 1 && !engine.over) {
      endRound(engine);
    }
  }

  function updateVariant(engine, dt) {
    if (merged.variant === 'collect') {
      updatePickups(engine, dt);
      if (merged.hazardEnabled) {
        updateHazards(engine, dt);
      }
      return;
    }
    if (merged.variant === 'zone') {
      updateZone(engine, dt);
      updatePickups(engine, dt * 0.25);
      return;
    }
    if (merged.variant === 'tag') {
      updateTag(engine, dt);
      return;
    }
    if (merged.variant === 'dash') {
      updateDash(engine, dt);
      return;
    }
    if (merged.variant === 'bomb') {
      updateBomb(engine, dt);
      return;
    }
    if (merged.variant === 'meteor') {
      updateMeteor(engine, dt);
    }
  }

  function endRound(engine) {
    if (engine.over) return;
    engine.over = true;
    engine.active = false;
    setPhase('over');
    setStatusText(`Final: ${rankingText(engine.scoresRef)}`);
  }

  function animate(timestamp) {
    const engine = engineRef.current;
    if (!engine || !engine.active) return;

    if (!engine.lastTime) {
      engine.lastTime = timestamp;
    }
    const dt = clamp((timestamp - engine.lastTime) / 1000, 0, 0.05);
    engine.lastTime = timestamp;
    engine.elapsed += dt;

    // Scenic rotation adjustments (comet portal rotation)
    if (engine.obstacles) {
      engine.obstacles.forEach(obs => {
        if (obs.portal) {
          obs.portal.rotation.z += dt * obs.rotationSpeed;
          obs.portal.rotation.y += dt * 0.2;
        }
      });
    }

    // Update floating neon abilities (Visual effects)
    for (let i = engine.activeEffects.length - 1; i >= 0; i -= 1) {
      const fx = engine.activeEffects[i];
      const finished = fx.update(dt);
      if (finished) {
        engine.scene.remove(fx.mesh);
        engine.activeEffects.splice(i, 1);
      }
    }

    movePlayers(engine, dt);
    resolveBumps(engine);
    updateVariant(engine, dt);

    if (!engine.over && merged.variant !== 'meteor') {
      const time = Math.max(0, merged.roundSeconds - engine.elapsed);
      setTimeLeft(time);
      if (time <= 0) {
        endRound(engine);
      }
    } else if (!engine.over && merged.variant === 'meteor') {
      const time = Math.max(0, merged.roundSeconds - engine.elapsed);
      setTimeLeft(time);
      if (time <= 0) {
        endRound(engine);
      }
    }

    engine.scoresRef.forEach((value, index) => {
      if (Number.isNaN(value)) {
        engine.scoresRef[index] = 0;
      }
    });
    setScores([...engine.scoresRef]);

    engine.renderer.render(engine.scene, engine.camera);
    engine.animFrame = requestAnimationFrame(animate);
  }

  function startRound() {
    const engine = setupEngine(playerCount);
    if (!engine) return;
    engine.crownHolder = Math.floor(Math.random() * playerCount);
    engine.bombHolder = Math.floor(Math.random() * playerCount);
    engine.bombTimer = 4.8;
    setScores([0, 0, 0, 0]);
    setTimeLeft(merged.roundSeconds);
    setStatusText(merged.objective || 'Score the most points before time runs out.');
    setPhase('playing');
    engine.animFrame = requestAnimationFrame(animate);
  }

  function resetToMenu() {
    if (engineRef.current?.dispose) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    setScores([0, 0, 0, 0]);
    setTimeLeft(merged.roundSeconds);
    setStatusText(merged.objective || 'Score the most points before time runs out.');
    setPhase('menu');
  }

  return (
    <div className="m3-root font-mono">
      <div className="m3-canvas-wrap" ref={mountRef} />

      {phase === 'menu' && (
        <div className="m3-overlay bg-[#07070f]/90 border border-cyan-500/20 backdrop-blur-md rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)]">
          <span className="text-[10px] text-cyan-400 tracking-[0.4em]">// DYNAMIC_ARCADE_PROTOCOL</span>
          <h1 className="text-3xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mt-2 mb-2">{merged.title}</h1>
          <p className="text-xs text-gray-400 tracking-wider mb-2">{merged.subtitle}</p>
          <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-sm text-cyan-300 italic mb-4 max-w-lg">
            Objective: {merged.objective}
          </div>
          
          <div className="m3-player-count mb-4">
            <span className="text-xs text-gray-400 mr-4">PLAYER CONFIG:</span>
            <button className={`px-4 py-1.5 rounded-l border border-cyan-500/20 ${playerCount === 3 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-transparent text-gray-400 hover:bg-white/5'}`} onClick={() => setPlayerCount(3)}>3P</button>
            <button className={`px-4 py-1.5 rounded-r border-t border-b border-r border-cyan-500/20 ${playerCount === 4 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-transparent text-gray-400 hover:bg-white/5'}`} onClick={() => setPlayerCount(4)}>4P</button>
          </div>

          <div className="bg-black/30 border border-white/5 p-4 rounded-xl mb-6 text-left max-w-md w-full">
            <h4 className="text-[10px] text-purple-400 tracking-widest uppercase mb-2">// TELEMETRY_CONTROLS</h4>
            <div className="grid grid-cols-1 gap-1 text-[11px] text-gray-300">
              {CONTROL_SETS.slice(0, playerCount).map(control => (
                <div key={control.label} className="flex justify-between border-b border-white/5 pb-1">
                  <span>{control.label.split(' [')[0]}</span>
                  <span className="text-cyan-400">{control.label.includes('[') ? `[${control.label.split('[')[1]}` : ''}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-cyan-400/70 text-center font-bold uppercase mt-3 tracking-wider">
              Special Ability: {abilityLabel}
            </p>
          </div>

          <button className="relative group px-8 py-3 text-cyan-400 hover:text-white uppercase transition-colors duration-300 tracking-widest font-black" onClick={startRound}>
            <span className="relative z-10">INITIALIZE MATCH</span>
            <span className="absolute inset-0 border border-cyan-500 group-hover:border-cyan-400 rounded bg-cyan-950/20 group-hover:bg-cyan-950/40 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="m3-hud pointer-events-none">
          <div className="m3-time bg-black/60 border border-cyan-500/20 text-cyan-400 px-4 py-2 rounded-xl backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            SYSTEM_TIME: {Math.ceil(timeLeft)}s
          </div>
          <div className="m3-score-row">
            {scores.slice(0, playerCount).map((value, index) => (
              <div key={PLAYER_LABELS[index]} className="m3-score-card bg-black/60 border border-cyan-500/10 rounded-xl px-4 py-2 backdrop-blur-sm text-center">
                <span style={{ color: PLAYER_COLORS_HEX[index] }} className="font-bold text-[10px] block uppercase">
                  {PLAYER_LABELS[index]}
                </span>
                <strong className="text-lg text-white font-black">{Math.round(value)}</strong>
              </div>
            ))}
          </div>
          <div className="m3-status bg-purple-950/40 border border-purple-500/20 text-purple-300 text-xs px-6 py-2.5 rounded-full backdrop-blur-sm uppercase tracking-wider animate-pulse max-w-md text-center">
            // {statusText}
          </div>
          <button className="m3-mini-btn pointer-events-auto bg-black/60 border border-white/10 hover:border-white/40 text-gray-400 hover:text-white text-xs px-4 py-2 rounded-xl transition-all" onClick={resetToMenu}>
            ABORT
          </button>
        </div>
      )}

      {phase === 'over' && (
        <div className="m3-overlay bg-[#07070f]/90 border border-red-500/20 backdrop-blur-md rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <span className="text-[10px] text-red-500 tracking-[0.4em]">// ROUND_TERMINATED</span>
          <h2 className="text-3xl font-black uppercase text-white mt-2 mb-4">MATCH COMPLETE</h2>
          <div className="bg-black/40 border border-white/5 p-4 rounded-xl mb-6 text-sm text-cyan-300 uppercase tracking-wide">
            {statusText}
          </div>
          <div className="flex gap-4">
            <button className="relative group px-6 py-2.5 text-cyan-400 hover:text-white uppercase transition-colors tracking-widest text-xs font-bold" onClick={startRound}>
              <span className="relative z-10">RE-ENGAGE</span>
              <span className="absolute inset-0 border border-cyan-500 group-hover:border-cyan-400 rounded bg-cyan-950/20 transition-all duration-300" />
            </button>
            <button className="relative group px-6 py-2.5 text-gray-400 hover:text-white uppercase transition-colors tracking-widest text-xs font-bold" onClick={resetToMenu}>
              <span className="relative z-10">TERMINATE</span>
              <span className="absolute inset-0 border border-white/10 group-hover:border-white/30 rounded bg-white/5 transition-all duration-300" />
            </button>
          </div>
        </div>
      )}

      <BackButton />
    </div>
  );
}
