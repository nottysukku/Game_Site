import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import BackButton from './BackButton';
import './Multiplayer3D.css';

const PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4'];
const TANK_COLORS = [0x22d3ee, 0xfb7185, 0x60a5fa, 0xfacc15];

const ROCKET_TYPES = [
  {
    id: 'standard',
    name: 'Standard',
    speed: 30,
    radius: 6.4,
    damage: 42,
    crater: 2.2,
    color: 0xffffff,
  },
  {
    id: 'heavy',
    name: 'Heavy',
    speed: 26,
    radius: 8.4,
    damage: 56,
    crater: 2.8,
    color: 0xff9f1c,
  },
  {
    id: 'split',
    name: 'Split',
    speed: 31,
    radius: 4.8,
    damage: 26,
    crater: 1.7,
    splitAt: 0.72,
    color: 0xa3e635,
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createTank(color) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 1.05, 1.8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.25 })
  );
  base.castShadow = true;
  base.receiveShadow = true;

  const turret = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.5, 14),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25 })
  );
  turret.rotation.z = Math.PI / 2;
  turret.position.set(0, 0.85, 0);
  turret.castShadow = true;

  const barrelPivot = new THREE.Group();
  barrelPivot.position.set(0.65, 0.95, 0);
  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.22, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.55 })
  );
  barrel.position.x = 1.05;
  barrel.castShadow = true;
  barrelPivot.add(barrel);

  group.add(base, turret, barrelPivot);
  return { group, barrelPivot };
}

function createExplosionMesh(radius, color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
  );
}

/* ---------- AI logic ---------- */
function computeAIMove(aiTank, targetTank, terrainHeightAt, rules) {
  const dx = targetTank.x - aiTank.x;
  const targetY = terrainHeightAt(targetTank.x) + 1.2;
  const originY = terrainHeightAt(aiTank.x) + 1.2;
  const dy = targetY - originY;
  const absDx = Math.abs(dx);
  const gravity = rules.gravity;

  // Try to find a good angle/power combo using projectile motion equations
  // We'll iterate a few candidate angles and pick the best power
  let bestAngle = 45;
  let bestPower = 30;
  let bestError = Infinity;

  for (let angleDeg = 20; angleDeg <= 80; angleDeg += 2) {
    const angleRad = (angleDeg * Math.PI) / 180;
    // Adjust angle direction based on target position
    const fireAngle = dx > 0 ? angleRad : Math.PI - angleRad;
    const cosA = Math.cos(fireAngle);
    const sinA = Math.sin(fireAngle);

    if (Math.abs(cosA) < 0.01) continue;

    // projectile: x = v*cosA*t, y = v*sinA*t - 0.5*g*t^2
    // At impact x = dx: t = dx / (v * cosA)
    // dy = v*sinA*t - 0.5*g*t^2
    // dy = sinA/cosA * dx - 0.5*g*(dx/(v*cosA))^2
    // Solve for v:
    // 0.5*g*dx^2/(v^2*cos^2A) = sinA/cosA * dx - dy
    // v^2 = 0.5*g*dx^2 / (cos^2A * (tanA * dx - dy))

    const tanA = sinA / cosA;
    const denom = tanA * dx - dy;
    if (denom <= 0.5) continue; // no valid solution

    const vSquared = (0.5 * gravity * dx * dx) / (cosA * cosA * denom);
    if (vSquared <= 0) continue;

    const v = Math.sqrt(vSquared);
    // Convert velocity to power: speed = type.speed * (power/30), we use standard rocket
    const rocketSpeed = ROCKET_TYPES[0].speed;
    const power = (v / rocketSpeed) * 30;

    if (power < 12 || power > 44) continue;

    // Simulate to check actual landing
    const simDt = 0.02;
    let sx = 0, sy = 0;
    let svx = v * cosA, svy = v * sinA;
    let landX = null;
    for (let step = 0; step < 500; step++) {
      svy -= gravity * simDt;
      sx += svx * simDt;
      sy += svy * simDt;
      const worldX = aiTank.x + sx;
      const worldY = originY + sy;
      const groundY = terrainHeightAt(worldX) + 0.2;
      if (worldY <= groundY || Math.abs(worldX) > rules.terrainWidth * 0.58) {
        landX = worldX;
        break;
      }
    }

    if (landX !== null) {
      const error = Math.abs(landX - targetTank.x);
      if (error < bestError) {
        bestError = error;
        bestAngle = dx > 0 ? angleDeg : 180 - angleDeg;
        bestPower = power;
      }
    }
  }

  // Add slight randomness for realism
  const angleNoise = (Math.random() - 0.5) * 8; // ±4 degrees
  const powerNoise = (Math.random() - 0.5) * 4; // ±2 power

  return {
    angle: clamp(bestAngle + angleNoise, 8, 172),
    power: clamp(bestPower + powerNoise, 12, 44),
    rocketIndex: Math.random() < 0.3 ? 1 : Math.random() < 0.4 ? 2 : 0,
  };
}

export default function PocketTanks3D() {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const keyRef = useRef({});
  const pressLatchRef = useRef({});

  const [phase, setPhase] = useState('menu');
  const [gameMode, setGameMode] = useState(null); // '1p' or '2p' or 'multi'
  const [playerCount, setPlayerCount] = useState(2);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [turnClock, setTurnClock] = useState(20);
  const [rocketName, setRocketName] = useState(ROCKET_TYPES[0].name);
  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(30);
  const [health, setHealth] = useState([100, 100, 100, 100]);
  const [status, setStatus] = useState('Turn-based artillery battle.');

  const rules = useMemo(
    () => ({
      roundTurnSeconds: 20,
      terrainWidth: 94,
      terrainDepth: 16,
      gravity: 20,
    }),
    []
  );

  useEffect(() => {
    const onKeyDown = e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
      keyRef.current[e.code] = true;
    };

    const onKeyUp = e => {
      keyRef.current[e.code] = false;
      pressLatchRef.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
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

  function pressedOnce(code) {
    if (keyRef.current[code] && !pressLatchRef.current[code]) {
      pressLatchRef.current[code] = true;
      return true;
    }
    return false;
  }

  function makeTerrainData() {
    const segments = 110;
    const heights = [];
    for (let i = 0; i <= segments; i += 1) {
      const x = (-rules.terrainWidth / 2) + (i * rules.terrainWidth) / segments;
      const ridge = Math.sin(x * 0.1) * 2.4 + Math.sin(x * 0.045 + 1.2) * 2.1;
      const noise = Math.sin(x * 0.23 + i * 0.17) * 0.8;
      heights.push(7.2 + ridge + noise);
    }
    return { segments, heights };
  }

  function createSkyGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a3a5c');     // deep blue sky top
    gradient.addColorStop(0.3, '#3a7bd5');   // medium blue
    gradient.addColorStop(0.6, '#6bb7e0');   // light blue
    gradient.addColorStop(0.85, '#b5d8f0');  // pale horizon
    gradient.addColorStop(1, '#e8dcc8');     // warm ground horizon
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
  }

  function buildEngine(count, mode) {
    if (!mountRef.current) return null;
    if (engineRef.current?.dispose) {
      engineRef.current.dispose();
    }

    const scene = new THREE.Scene();

    // Sky gradient background
    const skyTexture = createSkyGradient();
    scene.background = skyTexture;
    scene.fog = new THREE.FogExp2(0x8ab4d6, 0.008);

    // Camera: elevated isometric angle for clear view of terrain and both tanks
    const w = mountRef.current.clientWidth || window.innerWidth;
    const h = mountRef.current.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(50, w / Math.max(1, h), 0.1, 400);
    camera.position.set(0, 38, 65);
    camera.lookAt(0, 6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // === LIGHTING OVERHAUL ===
    // Bright ambient light for overall visibility
    const amb = new THREE.AmbientLight(0xffffff, 0.6);

    // Strong directional sunlight with shadows
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.4);
    sun.position.set(30, 55, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -10;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 120;
    sun.shadow.bias = -0.001;

    // Hemisphere light for natural sky/ground lighting
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.5);

    // Fill light from the opposite side to reduce harsh shadows
    const fill = new THREE.DirectionalLight(0xb0d4f1, 0.3);
    fill.position.set(-25, 30, -15);

    scene.add(amb, sun, hemi, fill);

    const terrainData = makeTerrainData();
    const terrainGeo = new THREE.PlaneGeometry(
      rules.terrainWidth,
      rules.terrainDepth,
      terrainData.segments,
      1
    );
    terrainGeo.rotateX(-Math.PI / 2);

    function terrainHeightAt(x) {
      const width = rules.terrainWidth;
      const t = clamp((x + width / 2) / width, 0, 1) * terrainData.segments;
      const i = Math.floor(t);
      const frac = t - i;
      const a = terrainData.heights[i];
      const b = terrainData.heights[Math.min(terrainData.segments, i + 1)];
      return a + (b - a) * frac;
    }

    function applyHeightsToGeometry() {
      const pos = terrainGeo.attributes.position;
      for (let i = 0; i <= terrainData.segments; i += 1) {
        const y = terrainData.heights[i];
        const topIndex = i;
        const bottomIndex = i + (terrainData.segments + 1);
        pos.setY(topIndex, y);
        pos.setY(bottomIndex, y);
      }
      pos.needsUpdate = true;
      terrainGeo.computeVertexNormals();
    }

    applyHeightsToGeometry();

    // Bright, visible terrain material - earthy green/brown
    const terrain = new THREE.Mesh(
      terrainGeo,
      new THREE.MeshStandardMaterial({
        color: 0x5a8a3c,
        roughness: 0.85,
        metalness: 0.05,
      })
    );
    terrain.receiveShadow = true;
    terrain.castShadow = false;
    scene.add(terrain);

    // Bedrock/ground base - visible brown earth
    const bedrock = new THREE.Mesh(
      new THREE.BoxGeometry(rules.terrainWidth + 4, 8, rules.terrainDepth + 3),
      new THREE.MeshStandardMaterial({ color: 0x6b4e2e, roughness: 0.9 })
    );
    bedrock.position.set(0, 2.8, 0);
    bedrock.receiveShadow = true;
    scene.add(bedrock);

    // Ground plane extending to horizon
    const groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x4a7a2e, roughness: 1.0 })
    );
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = 0.5;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    const tanks = [];
    for (let i = 0; i < count; i += 1) {
      const spread = count === 1 ? 0.5 : i / (count - 1);
      const x = -rules.terrainWidth * 0.4 + spread * (rules.terrainWidth * 0.8);
      const y = terrainHeightAt(x) + 1.2;
      const tank = createTank(TANK_COLORS[i]);
      tank.group.position.set(x, y, 0);
      tank.group.castShadow = true;
      scene.add(tank.group);
      tanks.push({
        index: i,
        x,
        health: 100,
        alive: true,
        angle: i % 2 === 0 ? 46 : 132,
        power: 30,
        rocketIndex: 0,
        ...tank,
      });
    }

    const engine = {
      scene,
      camera,
      renderer,
      terrain,
      terrainGeo,
      terrainData,
      terrainHeightAt,
      applyHeightsToGeometry,
      tanks,
      count,
      mode, // '1p', '2p', or 'multi'
      currentTurn: 0,
      turnClock: rules.roundTurnSeconds,
      projectile: null,
      projectileQueue: [],
      explosions: [],
      active: true,
      over: false,
      lastTime: 0,
      uiTick: 0,
      aiPending: false,
      aiTimer: 0,
      aiHasFired: false,
      dispose: () => {
        engine.active = false;
        cancelAnimationFrame(engine.anim);
        window.removeEventListener('resize', engine.onResize);
        if (renderer.domElement.parentElement === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
      },
    };

    engine.onResize = () => {
      if (!mountRef.current) return;
      const rw = mountRef.current.clientWidth || window.innerWidth;
      const rh = mountRef.current.clientHeight || window.innerHeight;
      camera.aspect = rw / Math.max(1, rh);
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh, false);
    };
    window.addEventListener('resize', engine.onResize);
    engine.onResize();

    engineRef.current = engine;
    return engine;
  }

  function aliveIndices(engine) {
    return engine.tanks.filter(tank => tank.alive).map(tank => tank.index);
  }

  function syncTankMesh(tank, terrainHeightAt) {
    tank.group.position.x = tank.x;
    tank.group.position.y = terrainHeightAt(tank.x) + 1.2;
    const angleRad = THREE.MathUtils.degToRad(tank.angle);
    tank.barrelPivot.rotation.z = angleRad;
  }

  function nextLivingTurn(engine) {
    const living = aliveIndices(engine);
    if (living.length <= 1) {
      engine.over = true;
      engine.active = false;
      const winner = living.length === 1 ? living[0] : null;
      if (winner === null) {
        setStatus('Draw: all tanks destroyed.');
      } else {
        if (engine.mode === '1p') {
          setStatus(winner === 0 ? 'You win the battle!' : 'CPU wins the battle.');
        } else {
          setStatus(`${PLAYER_LABELS[winner]} wins the battle.`);
        }
      }
      setPhase('over');
      return;
    }

    let next = engine.currentTurn;
    for (let step = 0; step < engine.count + 1; step += 1) {
      next = (next + 1) % engine.count;
      if (engine.tanks[next].alive) {
        engine.currentTurn = next;
        engine.turnClock = rules.roundTurnSeconds;
        const tank = engine.tanks[next];
        setCurrentPlayer(next);
        setAngle(Math.round(tank.angle));
        setPower(Math.round(tank.power));
        setRocketName(ROCKET_TYPES[tank.rocketIndex].name);

        // Check if this is an AI turn
        const isAI = engine.mode === '1p' && next !== 0;
        if (isAI) {
          engine.aiPending = true;
          engine.aiTimer = 0;
          engine.aiHasFired = false;
          setStatus('CPU is aiming...');
        } else {
          engine.aiPending = false;
          const label = engine.mode === '1p' ? 'Your' : `${PLAYER_LABELS[next]}`;
          setStatus(`${label} turn. Move, aim, and fire.`);
        }
        return;
      }
    }
  }

  function deformTerrain(engine, impactX, radius, depth) {
    const segments = engine.terrainData.segments;
    for (let i = 0; i <= segments; i += 1) {
      const x = -rules.terrainWidth / 2 + (i * rules.terrainWidth) / segments;
      const dx = Math.abs(x - impactX);
      if (dx > radius) continue;
      const drop = Math.cos((dx / radius) * Math.PI * 0.5) * depth;
      engine.terrainData.heights[i] = Math.max(1.5, engine.terrainData.heights[i] - drop);
    }
    engine.applyHeightsToGeometry();
    for (const tank of engine.tanks) {
      if (!tank.alive) continue;
      syncTankMesh(tank, engine.terrainHeightAt);
    }
  }

  function damageTanks(engine, impact, type, ownerIndex) {
    for (const tank of engine.tanks) {
      if (!tank.alive) continue;
      const dx = Math.abs(tank.x - impact.x);
      const dy = Math.abs(tank.group.position.y - impact.y);
      const dist = Math.hypot(dx, dy * 0.5);
      if (dist > type.radius) continue;
      const ratio = 1 - dist / type.radius;
      const damage = Math.round(type.damage * ratio);
      tank.health = Math.max(0, tank.health - damage);
      if (tank.health <= 0) {
        tank.alive = false;
        tank.group.visible = false;
      }
      if (ownerIndex !== tank.index && damage > 0) {
        const owner = engine.tanks[ownerIndex];
        if (owner && owner.alive) {
          owner.health = clamp(owner.health + Math.round(damage * 0.07), 0, 100);
        }
      }
    }
    setHealth(engine.tanks.map(tank => tank.health));
  }

  function spawnExplosion(engine, impact, radius, color) {
    const mesh = createExplosionMesh(Math.max(1, radius * 0.12), color);
    mesh.position.copy(impact);
    engine.scene.add(mesh);
    engine.explosions.push({ mesh, life: 0.45, maxLife: 0.45, radius });
  }

  function fireProjectile(engine, tank) {
    const type = ROCKET_TYPES[tank.rocketIndex];
    const angleRad = THREE.MathUtils.degToRad(tank.angle);
    const dir = new THREE.Vector3(Math.cos(angleRad), Math.sin(angleRad), 0).normalize();

    const projectileMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 16),
      new THREE.MeshStandardMaterial({ color: type.color, emissive: type.color, emissiveIntensity: 0.25 })
    );

    const origin = tank.group.position.clone();
    origin.y += 1.1;
    origin.addScaledVector(dir, 2);
    projectileMesh.position.copy(origin);
    projectileMesh.castShadow = true;
    engine.scene.add(projectileMesh);

    engine.projectileQueue.push({
      mesh: projectileMesh,
      velocity: dir.multiplyScalar(type.speed * (tank.power / 30)),
      ownerIndex: tank.index,
      typeIndex: tank.rocketIndex,
      age: 0,
      hasSplit: false,
      splitChild: false,
    });

    const label = engine.mode === '1p' && tank.index === 0 ? 'You' :
                  engine.mode === '1p' ? 'CPU' : PLAYER_LABELS[tank.index];
    setStatus(`${label} fired ${type.name}.`);
  }

  function processImpact(engine, projectile) {
    const type = ROCKET_TYPES[projectile.typeIndex];
    const impact = projectile.mesh.position.clone();

    spawnExplosion(engine, impact, type.radius, type.color);
    deformTerrain(engine, impact.x, type.radius, type.crater);
    damageTanks(engine, impact, type, projectile.ownerIndex);

    engine.scene.remove(projectile.mesh);
    nextLivingTurn(engine);
  }

  function updateProjectiles(engine, dt) {
    for (let i = engine.projectileQueue.length - 1; i >= 0; i -= 1) {
      const projectile = engine.projectileQueue[i];
      const type = ROCKET_TYPES[projectile.typeIndex];
      projectile.age += dt;
      projectile.velocity.y -= rules.gravity * dt;
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      projectile.mesh.rotation.x += dt * 8;
      projectile.mesh.rotation.y += dt * 6;

      if (type.id === 'split' && !projectile.splitChild && !projectile.hasSplit && projectile.age >= type.splitAt) {
        projectile.hasSplit = true;
        const base = projectile.velocity.clone();
        const left = base.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.24);
        const right = base.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), -0.24);
        const variants = [left, right];

        for (const velocity of variants) {
          const childMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.24, 14, 14),
            new THREE.MeshStandardMaterial({ color: 0xd9f99d, emissive: 0x84cc16, emissiveIntensity: 0.22 })
          );
          childMesh.position.copy(projectile.mesh.position);
          childMesh.castShadow = true;
          engine.scene.add(childMesh);
          engine.projectileQueue.push({
            mesh: childMesh,
            velocity,
            ownerIndex: projectile.ownerIndex,
            typeIndex: projectile.typeIndex,
            age: 0,
            hasSplit: true,
            splitChild: true,
          });
        }
      }

      const x = projectile.mesh.position.x;
      const y = projectile.mesh.position.y;
      const floor = engine.terrainHeightAt(x) + 0.2;
      const out = Math.abs(x) > rules.terrainWidth * 0.58 || y < -8 || y > 140;

      if (out || y <= floor) {
        engine.projectileQueue.splice(i, 1);
        processImpact(engine, projectile);
        continue;
      }
    }
  }

  function updateExplosions(engine, dt) {
    for (let i = engine.explosions.length - 1; i >= 0; i -= 1) {
      const explosion = engine.explosions[i];
      explosion.life -= dt;
      const t = 1 - explosion.life / explosion.maxLife;
      const s = 1 + t * (explosion.radius * 0.35);
      explosion.mesh.scale.setScalar(s);
      explosion.mesh.material.opacity = clamp(explosion.life / explosion.maxLife, 0, 1) * 0.7;
      if (explosion.life <= 0) {
        engine.scene.remove(explosion.mesh);
        engine.explosions.splice(i, 1);
      }
    }
  }

  function handleAITurn(engine, dt) {
    const tank = engine.tanks[engine.currentTurn];
    if (!tank || !tank.alive) {
      nextLivingTurn(engine);
      return;
    }

    engine.aiTimer += dt;

    // AI thinks for ~1.2 seconds then fires
    if (!engine.aiHasFired && engine.aiTimer >= 0.4) {
      // Find a living opponent (target the player primarily)
      const living = engine.tanks.filter(t => t.alive && t.index !== tank.index);
      if (living.length === 0) return;
      // Prefer targeting the human player (index 0), else pick random
      const target = living.find(t => t.index === 0) || living[Math.floor(Math.random() * living.length)];

      const move = computeAIMove(tank, target, engine.terrainHeightAt, rules);
      tank.angle = move.angle;
      tank.power = move.power;
      tank.rocketIndex = move.rocketIndex;
      syncTankMesh(tank, engine.terrainHeightAt);

      // Update UI to show AI's chosen values
      setAngle(Math.round(tank.angle));
      setPower(Math.round(tank.power));
      setRocketName(ROCKET_TYPES[tank.rocketIndex].name);
    }

    if (!engine.aiHasFired && engine.aiTimer >= 1.2) {
      engine.aiHasFired = true;
      engine.aiPending = false;
      fireProjectile(engine, tank);
    }
  }

  function handleTurnControls(engine, dt) {
    const tank = engine.tanks[engine.currentTurn];
    if (!tank || !tank.alive) {
      nextLivingTurn(engine);
      return;
    }

    // If it's an AI turn, delegate to AI handler
    if (engine.aiPending) {
      handleAITurn(engine, dt);
      return;
    }

    const moveSpeed = 12;
    if (keyRef.current.KeyA) tank.x -= moveSpeed * dt;
    if (keyRef.current.KeyD) tank.x += moveSpeed * dt;
    tank.x = clamp(tank.x, -rules.terrainWidth * 0.47, rules.terrainWidth * 0.47);

    if (keyRef.current.KeyJ) tank.angle += 65 * dt;
    if (keyRef.current.KeyL) tank.angle -= 65 * dt;
    tank.angle = clamp(tank.angle, 8, 172);

    if (keyRef.current.KeyW) tank.power += 24 * dt;
    if (keyRef.current.KeyS) tank.power -= 24 * dt;
    tank.power = clamp(tank.power, 12, 44);

    if (pressedOnce('KeyQ')) {
      tank.rocketIndex = (tank.rocketIndex + ROCKET_TYPES.length - 1) % ROCKET_TYPES.length;
      setRocketName(ROCKET_TYPES[tank.rocketIndex].name);
    }
    if (pressedOnce('KeyE')) {
      tank.rocketIndex = (tank.rocketIndex + 1) % ROCKET_TYPES.length;
      setRocketName(ROCKET_TYPES[tank.rocketIndex].name);
    }

    if (pressedOnce('Space')) {
      fireProjectile(engine, tank);
    }

    syncTankMesh(tank, engine.terrainHeightAt);
  }

  function animate(timestamp) {
    const engine = engineRef.current;
    if (!engine || !engine.active) return;

    if (!engine.lastTime) {
      engine.lastTime = timestamp;
    }
    const dt = clamp((timestamp - engine.lastTime) / 1000, 0, 0.05);
    engine.lastTime = timestamp;

    const hasProjectile = engine.projectileQueue.length > 0;

    if (!engine.over) {
      if (!hasProjectile) {
        if (!engine.aiPending) {
          engine.turnClock -= dt;
        }
        handleTurnControls(engine, dt);
        if (!engine.aiPending && engine.turnClock <= 0) {
          const label = engine.mode === '1p' && engine.currentTurn === 0 ? 'You' :
                        engine.mode === '1p' ? 'CPU' : PLAYER_LABELS[engine.currentTurn];
          setStatus(`${label} timed out.`);
          nextLivingTurn(engine);
        }
      }

      if (hasProjectile) {
        updateProjectiles(engine, dt);
      }

      updateExplosions(engine, dt);
    }

    engine.uiTick += dt;
    if (engine.uiTick >= 0.1) {
      engine.uiTick = 0;
      const activeTank = engine.tanks[engine.currentTurn];
      if (activeTank) {
        setCurrentPlayer(engine.currentTurn);
        setTurnClock(engine.turnClock);
        setAngle(activeTank.angle);
        setPower(activeTank.power);
        setRocketName(ROCKET_TYPES[activeTank.rocketIndex].name);
      }
      setHealth(engine.tanks.map(tank => tank.health));
    }

    engine.renderer.render(engine.scene, engine.camera);
    engine.anim = requestAnimationFrame(animate);
  }

  function startGame(mode, count) {
    setGameMode(mode);
    setPlayerCount(count);
    const engine = buildEngine(count, mode);
    if (!engine) return;
    engine.currentTurn = 0;
    while (!engine.tanks[engine.currentTurn].alive) {
      engine.currentTurn += 1;
      if (engine.currentTurn >= engine.count) {
        engine.currentTurn = 0;
        break;
      }
    }
    engine.turnClock = rules.roundTurnSeconds;

    const activeTank = engine.tanks[engine.currentTurn];
    setCurrentPlayer(engine.currentTurn);
    setTurnClock(engine.turnClock);
    setAngle(activeTank.angle);
    setPower(activeTank.power);
    setRocketName(ROCKET_TYPES[activeTank.rocketIndex].name);
    setHealth(engine.tanks.map(tank => tank.health));

    if (mode === '1p') {
      setStatus('Your turn. Move, aim, and fire.');
    } else {
      setStatus(`${PLAYER_LABELS[engine.currentTurn]} turn. Fire when ready.`);
    }

    setPhase('playing');
    engine.anim = requestAnimationFrame(animate);
  }

  function backToMenu() {
    if (engineRef.current?.dispose) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    setPhase('menu');
    setGameMode(null);
    setCurrentPlayer(0);
    setTurnClock(rules.roundTurnSeconds);
    setAngle(45);
    setPower(30);
    setRocketName(ROCKET_TYPES[0].name);
    setHealth([100, 100, 100, 100]);
    setStatus('Turn-based artillery battle.');
  }

  function getPlayerLabel(index) {
    if (gameMode === '1p') {
      return index === 0 ? 'You' : 'CPU';
    }
    return PLAYER_LABELS[index];
  }

  return (
    <div className="m3-root">
      <div ref={mountRef} className="m3-canvas-wrap" />

      {phase === 'menu' && (
        <div className="m3-overlay">
          <h1>Pocket Tanks 3D</h1>
          <p>Turn-by-turn artillery battle. Move tanks, aim, set power, and fire!</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
            <button className="m3-main-btn" onClick={() => startGame('1p', 2)}>
              🎮 1 Player vs CPU
            </button>
            <button className="m3-main-btn" onClick={() => startGame('2p', 2)}>
              👥 2 Players Local
            </button>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="m3-alt-btn" onClick={() => startGame('multi', 3)}>
                3 Players
              </button>
              <button className="m3-alt-btn" onClick={() => startGame('multi', 4)}>
                4 Players
              </button>
            </div>
          </div>

          <div className="m3-controls-list" style={{ marginTop: '16px' }}>
            <span>A/D move tank</span>
            <span>J/L aim</span>
            <span>W/S power</span>
            <span>Q/E rocket type</span>
            <span>Space fire</span>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <>
          <div className="m3-top-right">
            <div className="m3-panel">
              <h3>
                {gameMode === '1p'
                  ? (currentPlayer === 0 ? '🎮 Your Turn' : '🤖 CPU Turn')
                  : `${PLAYER_LABELS[currentPlayer]} Turn`}
              </h3>
              <p>Timer: {Math.ceil(turnClock)}</p>
              <p>Rocket: {rocketName}</p>
              <p>Angle: {Math.round(angle)}°</p>
              <p>Power: {Math.round(power)}</p>
            </div>
            <div className="m3-panel">
              <h3>Health</h3>
              <div className="m3-health-grid">
                {health.slice(0, playerCount).map((value, index) => (
                  <div key={PLAYER_LABELS[index]} className={`m3-health-item ${value <= 0 ? 'dead' : ''}`}>
                    <span>{getPlayerLabel(index)}</span>
                    <strong>{Math.max(0, Math.round(value))}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="m3-hud">
            <div className="m3-status">{status}</div>
            <button className="m3-mini-btn" onClick={backToMenu}>Menu</button>
          </div>
        </>
      )}

      {phase === 'over' && (
        <div className="m3-overlay">
          <h2>Battle Over</h2>
          <p>{status}</p>
          <button className="m3-main-btn" onClick={() => startGame(gameMode, playerCount)}>Rematch</button>
          <button className="m3-alt-btn" onClick={backToMenu}>Main Menu</button>
        </div>
      )}

      <BackButton />
    </div>
  );
}
