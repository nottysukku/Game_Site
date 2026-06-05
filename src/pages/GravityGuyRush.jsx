import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import BackButton from './BackButton';
import './Multiplayer3D.css';

const PLAYER_COLORS = [0x22d3ee, 0x60a5fa, 0xfb7185, 0xfacc15];
const PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4'];
const ACTION_KEYS = ['KeyQ', 'KeyU', 'KeyR', 'Slash'];
const ACTION_LABELS = ['P1 Q', 'P2 U', 'P3 R', 'P4 /'];

const BASE_SPEED = 10.2;
const MAX_SPEED = 24;
const SPEED_RAMP = 0.23;
const PLAYER_X = -11.2;
const SPAWN_X = 25;
const OFFSCREEN_X = -28;
const WORLD_HEIGHT = 18;
const SHARED_SURFACE_OFFSET = 6.25;
const TROOPER_START_X = -18.2;
const TROOPER_CATCH_X = PLAYER_X - 0.82;
const FLIP_DURATION = 0.22;
const PLAYER_HALF_WIDTH = 0.58;
const DEFAULT_OBS_HALF_WIDTH = 0.62;
const DEFAULT_OBS_HALF_HEIGHT = 0.56;
const OBSTACLE_CLEARANCE_X = 3.8;
const SCENERY_RESET_X = 44;

const OBSTACLE_TYPES = {
  block: {
    width: 1.26,
    height: 1.12,
    speedMul: 1,
    passBonus: 2.8,
    floorColor: 0xff5f7e,
    ceilColor: 0x57d6ff,
    floorEmissive: 0x63172b,
    ceilEmissive: 0x12475e,
  },
  spike: {
    width: 0.98,
    height: 1.26,
    speedMul: 1.08,
    passBonus: 3.2,
    floorColor: 0xff7f7f,
    ceilColor: 0x76f3ff,
    floorEmissive: 0x6a1f2b,
    ceilEmissive: 0x1a5563,
  },
  wall: {
    width: 1.84,
    height: 0.92,
    speedMul: 0.93,
    passBonus: 3.7,
    floorColor: 0xff9f53,
    ceilColor: 0x74b9ff,
    floorEmissive: 0x6a3e12,
    ceilEmissive: 0x1a3760,
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function cubicEaseInOut(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function laneLayout(count) {
  return {
    worldHeight: WORLD_HEIGHT,
    laneBand: WORLD_HEIGHT,
    centers: Array(count).fill(0),
    stripHeight: WORLD_HEIGHT * 0.76,
    sideOffset: SHARED_SURFACE_OFFSET,
  };
}

function laneCenter() {
  return 0;
}

function sideY(layout, lane, side) {
  return laneCenter(layout, lane) + (side === 'floor' ? -layout.sideOffset : layout.sideOffset);
}

function scoreLine(scores, count) {
  return scores
    .slice(0, count)
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value)
    .map((entry, rank) => `${rank + 1}. ${PLAYER_LABELS[entry.index]} ${Math.round(entry.value)}`)
    .join(' | ');
}

function createRunner(color) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 });
  const limbMat = new THREE.MeshStandardMaterial({ color: 0xe9f5ff, roughness: 0.52, metalness: 0.08 });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.72, 0.5),
    bodyMat
  );
  body.castShadow = true;
  body.position.z = 0.12;

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.34, 0.42),
    bodyMat
  );
  head.position.set(0.43, 0.24, 0.02);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.24, 0.52),
    new THREE.MeshStandardMaterial({ color: 0xe6faff, emissive: 0x2f86d8, emissiveIntensity: 0.45 })
  );
  visor.position.set(0.5, 0.24, 0.06);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.16, -0.28, 0.03);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), limbMat);
  leftLeg.position.y = -0.28;
  leftLeg.castShadow = true;
  leftLegPivot.add(leftLeg);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.2, -0.28, 0.03);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), limbMat);
  rightLeg.position.y = -0.28;
  rightLeg.castShadow = true;
  rightLegPivot.add(rightLeg);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.24, 0.08, 0.12);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.42, 0.16), limbMat);
  leftArm.position.y = -0.22;
  leftArm.castShadow = true;
  leftArmPivot.add(leftArm);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.28, 0.08, 0.12);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.42, 0.16), limbMat);
  rightArm.position.y = -0.22;
  rightArm.castShadow = true;
  rightArmPivot.add(rightArm);

  const trail = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.16, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.45 })
  );
  trail.position.set(-0.66, 0, -0.05);

  group.add(body, head, visor, leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot, trail);
  return {
    group,
    parts: {
      body,
      trail,
      leftLegPivot,
      rightLegPivot,
      leftArmPivot,
      rightArmPivot,
    },
  };
}

function createTrooper() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    emissive: 0x5f0f1a,
    emissiveIntensity: 0.55,
    roughness: 0.36,
    metalness: 0.35,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.3,
    roughness: 0.42,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.92, 0.72), bodyMat);
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.46, 0.52), bodyMat);
  head.position.set(0.48, 0.48, 0.02);
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.18, 0.56),
    new THREE.MeshBasicMaterial({ color: 0xffd5d5 })
  );
  visor.position.set(0.62, 0.49, 0.05);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.7, 0.24), darkMat);
  const rightBoot = leftBoot.clone();
  leftBoot.position.set(-0.26, -0.68, 0.02);
  rightBoot.position.set(0.28, -0.68, 0.02);

  const baton = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.18, 1.35),
    new THREE.MeshBasicMaterial({ color: 0xff3b3b })
  );
  baton.position.set(-0.68, 0.04, 0.22);
  baton.rotation.z = 0.24;

  const warning = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.1, 0.14),
    new THREE.MeshBasicMaterial({ color: 0xff1f55 })
  );
  warning.position.set(-0.82, 0.02, -0.1);

  group.add(torso, head, visor, leftBoot, rightBoot, baton, warning);
  return { group, warning };
}

function obstacleTypeForTime(elapsed) {
  const roll = Math.random();
  if (elapsed > 34 && roll < 0.26) return 'wall';
  if (elapsed > 14 && roll < 0.62) return 'spike';
  return 'block';
}

function createObstacleMesh(typeKey, side) {
  const type = OBSTACLE_TYPES[typeKey] || OBSTACLE_TYPES.block;
  const color = side === 'floor' ? type.floorColor : type.ceilColor;
  const emissive = side === 'floor' ? type.floorEmissive : type.ceilEmissive;

  const group = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.BoxGeometry(type.width, type.height, 0.58),
    new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.3, roughness: 0.52 })
  );
  core.castShadow = true;

  group.add(core);

  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(type.width * 0.45, 0.24, 0.62),
    new THREE.MeshStandardMaterial({ color: 0xe8f7ff, emissive: color, emissiveIntensity: 0.25 })
  );
  cap.position.y = side === 'floor' ? type.height * 0.54 : -type.height * 0.54;
  cap.castShadow = true;

  group.add(cap);

  if (typeKey === 'spike') {
    for (let i = -1; i <= 1; i += 1) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.35, 5),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.35 })
      );
      spike.position.set(i * 0.28, side === 'floor' ? type.height * 0.58 : -type.height * 0.58, 0.06);
      spike.rotation.x = side === 'floor' ? -Math.PI / 2 : Math.PI / 2;
      group.add(spike);
    }
  }

  if (typeKey === 'wall') {
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x111827, emissive: 0x20314b, emissiveIntensity: 0.2 });
    const stripeA = new THREE.Mesh(new THREE.BoxGeometry(type.width * 0.92, 0.12, 0.62), stripeMat);
    const stripeB = new THREE.Mesh(new THREE.BoxGeometry(type.width * 0.92, 0.12, 0.62), stripeMat);
    stripeA.position.y = 0.2;
    stripeB.position.y = -0.2;
    group.add(stripeA, stripeB);
  }

  return {
    mesh: group,
    halfWidth: type.width * 0.5 + 0.05,
    halfHeight: type.height * 0.5 + 0.06,
    speedMul: type.speedMul,
    passBonus: type.passBonus,
  };
}

function gameSpeed(elapsed) {
  return clamp(BASE_SPEED + elapsed * SPEED_RAMP, BASE_SPEED, MAX_SPEED);
}

function disposeMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach(entry => entry?.dispose?.());
    return;
  }
  material?.dispose?.();
}

function disposeScene(scene) {
  scene.traverse(object => {
    if (object.isMesh) {
      object.geometry?.dispose?.();
      disposeMaterial(object.material);
    }
  });
}

function buildScenery(scene, layout) {
  const items = [];
  const halfWorld = layout.worldHeight / 2;

  const addChunk = ({ width, x, anchor, margin, baseHeight, scaleY, speedMul, color, emissive, z }) => {
    const chunk = new THREE.Mesh(
      new THREE.BoxGeometry(width, baseHeight, 0.42),
      new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.2, roughness: 0.7 })
    );
    chunk.scale.y = scaleY;
    const height = baseHeight * scaleY;
    chunk.position.set(
      x,
      anchor === 'top' ? halfWorld - height / 2 - margin : -halfWorld + height / 2 + margin,
      z
    );
    scene.add(chunk);
    items.push({
      mesh: chunk,
      width,
      anchor,
      margin,
      baseHeight,
      speedMul,
      scaleMin: 0.8,
      scaleMax: 3.3,
      z,
      jitterY: 0.2,
    });
  };

  for (let i = 0; i < 20; i += 1) {
    const x = -30 + i * 3.7 + randRange(-0.6, 0.6);
    addChunk({
      width: randRange(2.2, 4.6),
      x,
      anchor: 'bottom',
      margin: 0.08,
      baseHeight: 1,
      scaleY: randRange(0.9, 3.1),
      speedMul: 0.58,
      color: 0x21314f,
      emissive: 0x103152,
      z: -1.45,
    });
  }

  for (let i = 0; i < 20; i += 1) {
    const x = -28 + i * 3.8 + randRange(-0.8, 0.8);
    addChunk({
      width: randRange(2.1, 4.4),
      x,
      anchor: 'top',
      margin: 0.08,
      baseHeight: 1,
      scaleY: randRange(0.9, 3.1),
      speedMul: 0.58,
      color: 0x412447,
      emissive: 0x3a1636,
      z: -1.45,
    });
  }

  const addBuilding = ({ x, anchor, color, emissive }) => {
    const width = randRange(1.5, 3.4);
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width, 1, 0.32),
      new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.25, roughness: 0.62 })
    );

    const scaleY = randRange(2.2, 6.2);
    building.scale.y = scaleY;
    const height = scaleY;
    building.position.set(
      x,
      anchor === 'top' ? halfWorld - height / 2 - 1.1 : -halfWorld + height / 2 + 1.1,
      -2.35
    );

    const windows = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.82, 0.12, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xd9f2ff, emissive: 0x80d8ff, emissiveIntensity: 0.35 })
    );
    windows.position.y = anchor === 'top' ? -0.26 : 0.26;
    building.add(windows);

    scene.add(building);
    items.push({
      mesh: building,
      width,
      anchor,
      margin: 1.1,
      baseHeight: 1,
      speedMul: 0.25,
      scaleMin: 2,
      scaleMax: 6.4,
      z: -2.35,
      jitterY: 0.5,
    });
  };

  for (let i = 0; i < 14; i += 1) {
    addBuilding({
      x: -34 + i * 5 + randRange(-1, 1),
      anchor: 'bottom',
      color: 0x233d66,
      emissive: 0x1a4270,
    });
  }

  for (let i = 0; i < 14; i += 1) {
    addBuilding({
      x: -32 + i * 5.1 + randRange(-1, 1),
      anchor: 'top',
      color: 0x5c2f58,
      emissive: 0x4c2347,
    });
  }

  return items;
}

function recycleScenery(item, layout) {
  const halfWorld = layout.worldHeight / 2;
  item.mesh.position.x = SCENERY_RESET_X + randRange(0, 16);
  item.mesh.scale.y = randRange(item.scaleMin, item.scaleMax);
  const height = item.baseHeight * item.mesh.scale.y;
  const jitter = randRange(-item.jitterY, item.jitterY);
  item.mesh.position.y =
    item.anchor === 'top'
      ? halfWorld - height / 2 - item.margin + jitter
      : -halfWorld + height / 2 + item.margin + jitter;
}

export default function GravityGuyRush() {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const keysRef = useRef({});
  const latchRef = useRef({});

  const [phase, setPhase] = useState('menu');
  const [playerCount, setPlayerCount] = useState(4);
  const [timeLeft, setTimeLeft] = useState(4);
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [speed, setSpeed] = useState(BASE_SPEED);
  const [distance, setDistance] = useState(0);
  const [status, setStatus] = useState('All runners share one path. Last runner standing wins.');
  const hudThrottleRef = useRef(0);

  useEffect(() => {
    const onKeyDown = e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      keysRef.current[e.code] = true;
    };
    const onKeyUp = e => {
      keysRef.current[e.code] = false;
      latchRef.current[e.code] = false;
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

  function setupGame(count) {
    if (!mountRef.current) return null;

    if (engineRef.current?.dispose) {
      engineRef.current.dispose();
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a15);

    const camera = new THREE.OrthographicCamera(-16, 16, 10, -10, 0.1, 80);
    camera.position.set(0, 0, 22);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xcfe7ff, 0.66);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.92);
    keyLight.position.set(0, 13, 12);
    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.4);
    rimLight.position.set(-16, -8, 9);
    scene.add(ambient, keyLight, rimLight);

    const layout = laneLayout(count);

    const laneLength = 74;
    const laneStrip = new THREE.Mesh(
      new THREE.BoxGeometry(laneLength, layout.stripHeight, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x0d1528 })
    );
    laneStrip.position.set(0, 0, -0.2);

    const floorRail = new THREE.Mesh(
      new THREE.BoxGeometry(laneLength, 0.24, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x7ec6ff })
    );
    floorRail.position.set(0, -layout.sideOffset, -0.1);

    const ceilingRail = new THREE.Mesh(
      new THREE.BoxGeometry(laneLength, 0.24, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xff9fc7 })
    );
    ceilingRail.position.set(0, layout.sideOffset, -0.1);

    const centerGlow = new THREE.Mesh(
      new THREE.BoxGeometry(laneLength, 0.05, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x1f3256 })
    );
    centerGlow.position.set(0, 0, -0.09);

    scene.add(laneStrip, floorRail, ceilingRail, centerGlow);

    const scenery = buildScenery(scene, layout);

    const players = [];
    for (let i = 0; i < count; i += 1) {
      const runner = createRunner(PLAYER_COLORS[i]);
      const y = sideY(layout, 0, 'floor');
      const visualOffset = (i - (count - 1) / 2) * 0.18;
      runner.group.position.set(PLAYER_X, y + visualOffset, 0.45 + i * 0.035);
      scene.add(runner.group);

      players.push({
        index: i,
        mesh: runner.group,
        parts: runner.parts,
        lane: 0,
        side: 'floor',
        y,
        targetY: y,
        visualOffset,
        alive: true,
        flipCooldown: 0,
        flipClock: 0,
        flipFromY: y,
        flipToY: y,
        rotFrom: 0,
        rotTo: 0,
        runClock: Math.random() * Math.PI * 2,
        score: 0,
      });
    }

    const trooper = createTrooper();
    trooper.group.position.set(TROOPER_START_X, sideY(layout, 0, 'floor'), 0.62);
    scene.add(trooper.group);

    const engine = {
      scene,
      camera,
      renderer,
      layout,
      scenery,
      players,
      trooper,
      trooperX: TROOPER_START_X,
      obstacles: [],
      pendingSpawns: [],
      elapsed: 0,
      speed: BASE_SPEED,
      spawnClock: 0.9,
      laneCount: 1,
      playerCount: count,
      scoresRef: [0, 0, 0, 0],
      lastTime: 0,
      active: true,
      over: false,
      dispose: () => {
        engine.active = false;
        cancelAnimationFrame(engine.animFrame);
        window.removeEventListener('resize', engine.onResize);

        if (renderer.domElement.parentElement === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }

        renderer.dispose();
        disposeScene(scene);
      },
    };

    engine.onResize = () => {
      if (!mountRef.current) return;

      const width = mountRef.current.clientWidth || window.innerWidth;
      const height = mountRef.current.clientHeight || window.innerHeight;
      const worldHeight = layout.worldHeight;
      const worldWidth = worldHeight * (width / Math.max(1, height));

      camera.left = -worldWidth / 2;
      camera.right = worldWidth / 2;
      camera.top = worldHeight / 2;
      camera.bottom = -worldHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    window.addEventListener('resize', engine.onResize);
    engine.onResize();

    engineRef.current = engine;
    return engine;
  }

  function canSpawnInLane(engine) {
    return !engine.obstacles.some(
      obstacle => obstacle.mesh.position.x > SPAWN_X - OBSTACLE_CLEARANCE_X
    );
  }

  function enqueueSpawn(engine, delay, lane, side, typeKey) {
    engine.pendingSpawns.push({
      delay,
      lane,
      side,
      typeKey,
      retries: 0,
    });
  }

  function scheduleObstaclePattern(engine) {
    const side = Math.random() > 0.5 ? 'floor' : 'ceiling';
    const typeKey = obstacleTypeForTime(engine.elapsed);
    enqueueSpawn(engine, 0, 0, side, typeKey);

    if (engine.elapsed > 8 && Math.random() < 0.45) {
      enqueueSpawn(engine, 0.34, 0, side === 'floor' ? 'ceiling' : 'floor', obstacleTypeForTime(engine.elapsed));
    }

    if (engine.elapsed > 16 && Math.random() < 0.34) {
      enqueueSpawn(engine, 0.72, 0, Math.random() > 0.5 ? 'floor' : 'ceiling', obstacleTypeForTime(engine.elapsed + 4));
    }

    if (engine.elapsed > 28 && Math.random() < 0.26) {
      enqueueSpawn(engine, 0.12, 0, side === 'floor' ? 'ceiling' : 'floor', 'wall');
    }
  }

  function spawnObstacleNow(engine, lane, side, typeKey) {
    const obstacle = createObstacleMesh(typeKey, side);
    obstacle.mesh.position.set(SPAWN_X, sideY(engine.layout, 0, side), 0.58);
    engine.scene.add(obstacle.mesh);
    engine.obstacles.push({
      lane,
      side,
      mesh: obstacle.mesh,
      halfWidth: obstacle.halfWidth,
      halfHeight: obstacle.halfHeight,
      speedMul: obstacle.speedMul,
      passBonus: obstacle.passBonus,
      bobOffset: Math.random() * Math.PI * 2,
      passed: false,
    });
  }

  function scheduleSpawnWave(engine) {
    scheduleObstaclePattern(engine);
  }

  function endRound(engine) {
    if (engine.over) return;

    engine.over = true;
    engine.active = false;
    const alivePlayers = engine.players
      .slice(0, engine.playerCount)
      .filter(player => player.alive)
      .map(player => player.index);
    setPhase('over');
    if (engine.playerCount === 1) {
      setStatus(alivePlayers.length ? 'You outran the Gravity Trooper.' : 'The Gravity Trooper caught the runner.');
    } else if (alivePlayers.length === 1) {
      setStatus(`${PLAYER_LABELS[alivePlayers[0]]} wins as the last runner standing.`);
    } else {
      setStatus('No runners survived the shared path.');
    }
  }

  function animateFrame(timestamp) {
    const engine = engineRef.current;
    if (!engine || !engine.active) return;

    if (!engine.lastTime) {
      engine.lastTime = timestamp;
    }

    const dt = clamp((timestamp - engine.lastTime) / 1000, 0, 0.045);
    engine.lastTime = timestamp;
    engine.elapsed += dt;

    engine.speed = gameSpeed(engine.elapsed);
    engine.spawnClock -= dt;

    if (engine.spawnClock <= 0) {
      scheduleSpawnWave(engine);
      const nextSpawn = 0.98 - engine.elapsed * 0.007 - (engine.speed - BASE_SPEED) * 0.022;
      engine.spawnClock = clamp(nextSpawn, 0.22, 0.98);
    }

    for (let i = engine.pendingSpawns.length - 1; i >= 0; i -= 1) {
      const pending = engine.pendingSpawns[i];
      pending.delay -= dt;
      if (pending.delay > 0) continue;

      if (!canSpawnInLane(engine, pending.lane)) {
        pending.retries += 1;
        if (pending.retries > 14) {
          engine.pendingSpawns.splice(i, 1);
        } else {
          pending.delay = 0.08;
        }
        continue;
      }

      spawnObstacleNow(engine, pending.lane, pending.side, pending.typeKey);
      engine.pendingSpawns.splice(i, 1);
    }

    for (let i = 0; i < engine.scenery.length; i += 1) {
      const item = engine.scenery[i];
      item.mesh.position.x -= engine.speed * dt * item.speedMul;
      if (item.mesh.position.x < OFFSCREEN_X - item.width) {
        recycleScenery(item, engine.layout);
      }
    }

    for (let i = 0; i < engine.playerCount; i += 1) {
      const player = engine.players[i];
      if (!player || !player.alive) continue;

      const actionCode = ACTION_KEYS[i];
      const onSurface = player.flipClock <= 0 && Math.abs(player.y - player.targetY) < 0.08;
      if (keysRef.current[actionCode] && !latchRef.current[actionCode] && player.flipCooldown <= 0 && onSurface) {
        player.side = player.side === 'floor' ? 'ceiling' : 'floor';
        player.targetY = sideY(engine.layout, 0, player.side);
        player.flipCooldown = 0.12;
        player.flipClock = FLIP_DURATION;
        player.flipFromY = player.y;
        player.flipToY = player.targetY;
        player.rotFrom = player.mesh.rotation.z;
        player.rotTo = player.rotFrom + Math.PI;
        latchRef.current[actionCode] = true;
      }

      player.flipCooldown = Math.max(0, player.flipCooldown - dt);

      if (player.flipClock > 0) {
        player.flipClock = Math.max(0, player.flipClock - dt);
        const t = 1 - player.flipClock / FLIP_DURATION;
        const eased = cubicEaseInOut(clamp(t, 0, 1));
        player.y = THREE.MathUtils.lerp(player.flipFromY, player.flipToY, eased);
        player.mesh.rotation.z = THREE.MathUtils.lerp(player.rotFrom, player.rotTo, eased);
        player.mesh.position.z = 0.45 + Math.sin(t * Math.PI) * 0.38;
      } else {
        player.y += (player.targetY - player.y) * clamp(dt * 17, 0, 1);
        player.mesh.rotation.z = player.side === 'floor' ? 0 : Math.PI;
        player.mesh.position.z = 0.45;
      }

      player.runClock += dt * (7.5 + engine.speed * 0.55);
      const swing = Math.sin(player.runClock) * 0.8;
      const armSwing = Math.sin(player.runClock + Math.PI) * 0.56;
      player.parts.leftLegPivot.rotation.x = swing;
      player.parts.rightLegPivot.rotation.x = -swing;
      player.parts.leftArmPivot.rotation.x = armSwing;
      player.parts.rightArmPivot.rotation.x = -armSwing;
      player.parts.body.rotation.x = Math.sin(player.runClock * 2) * 0.08;
      player.parts.trail.scale.x = 0.9 + Math.sin(player.runClock * 1.7) * 0.1;

      const bob = player.flipClock > 0 ? 0 : Math.sin(player.runClock * 2) * 0.07;
      player.mesh.position.y = player.y + player.visualOffset + bob;
      if (player.alive) {
        player.score += engine.speed * dt;
        engine.scoresRef[i] = player.score;
      }
    }

    const deadCount = engine.players.slice(0, engine.playerCount).filter(player => !player.alive).length;
    const alivePlayers = engine.players.slice(0, engine.playerCount).filter(player => player.alive);
    engine.trooperX = Math.min(
      TROOPER_CATCH_X,
      engine.trooperX + dt * (0.055 + engine.elapsed * 0.006 + deadCount * 0.014)
    );
    engine.trooper.group.position.x = engine.trooperX;
    // Trooper follows the gravity side of the first alive player for visual coherence
    const trooperSide = alivePlayers.length > 0 ? alivePlayers[0].side : 'floor';
    const trooperTargetY = sideY(engine.layout, 0, trooperSide);
    engine.trooper.group.position.y = trooperTargetY + Math.sin(engine.elapsed * 8) * 0.08;
    engine.trooper.group.rotation.z = trooperSide === 'floor' ? 0 : Math.PI;
    engine.trooper.warning.scale.x = 0.85 + Math.sin(engine.elapsed * 10) * 0.15;

    if (engine.trooperX >= TROOPER_CATCH_X - 0.02 && !engine.trooperCaught) {
      engine.trooperCaught = true;
      for (let p = 0; p < engine.playerCount; p += 1) {
        const player = engine.players[p];
        if (player?.alive) {
          player.alive = false;
          player.mesh.visible = false;
        }
      }
      setStatus('The Gravity Trooper swept the path.');
    }

    for (let i = engine.obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = engine.obstacles[i];
      obstacle.mesh.position.x -= engine.speed * obstacle.speedMul * dt;
      obstacle.mesh.position.z = 0.58 + Math.sin(engine.elapsed * 4.6 + obstacle.bobOffset) * 0.05;

      for (let p = 0; p < engine.playerCount; p += 1) {
        const player = engine.players[p];
        if (!player?.alive) continue;

        const closeX = Math.abs(player.mesh.position.x - obstacle.mesh.position.x) < PLAYER_HALF_WIDTH + (obstacle.halfWidth || DEFAULT_OBS_HALF_WIDTH);
        const closeY = Math.abs(player.y - obstacle.mesh.position.y) < 0.34 + (obstacle.halfHeight || DEFAULT_OBS_HALF_HEIGHT);
        if (closeX && closeY) {
          player.alive = false;
          player.mesh.visible = false;
          setStatus(`${PLAYER_LABELS[p]} crashed at distance ${Math.round(player.score)}.`);
        }
      }

      if (!obstacle.passed && obstacle.mesh.position.x < PLAYER_X - 1) {
        obstacle.passed = true;
        engine.players.forEach((player) => {
          if (player?.alive) {
            player.score += obstacle.passBonus;
          }
        });
      }

      if (obstacle.mesh.position.x < OFFSCREEN_X) {
        engine.scene.remove(obstacle.mesh);
        engine.obstacles.splice(i, 1);
      }
    }

    const aliveCount = alivePlayers.length;

    // Throttle HUD state updates to ~10fps to avoid excessive React re-renders
    hudThrottleRef.current -= dt;
    if (hudThrottleRef.current <= 0) {
      hudThrottleRef.current = 0.1;
      setTimeLeft(aliveCount);
      setScores(engine.players.map(p => Math.round(p.score)));
      setSpeed(engine.speed);
      setDistance(Math.round(engine.elapsed * engine.speed * 0.5));
    }

    engine.renderer.render(engine.scene, engine.camera);

    const knockout = engine.playerCount === 1 ? aliveCount === 0 : aliveCount <= 1;
    if (knockout) {
      endRound(engine);
      return;
    }

    engine.animFrame = requestAnimationFrame(animateFrame);
  }

  function startGame() {
    const engine = setupGame(playerCount);
    if (!engine) return;

    latchRef.current = {};
    hudThrottleRef.current = 0;
    setPhase('playing');
    setTimeLeft(playerCount);
    setScores(Array(playerCount).fill(0));
    setSpeed(BASE_SPEED);
    setDistance(0);
    setStatus('Race live. Flip only on a surface, dodge shared blockers, and outrun the trooper.');

    engine.animFrame = requestAnimationFrame(animateFrame);
  }

  function resetToMenu() {
    if (engineRef.current?.dispose) {
      engineRef.current.dispose();
      engineRef.current = null;
    }

    setPhase('menu');
    setTimeLeft(playerCount);
    setScores([0, 0, 0, 0]);
    setSpeed(BASE_SPEED);
    setDistance(0);
    setStatus('All runners share one path. Last runner standing wins.');
  }

  return (
    <div className="m3-root">
      <div ref={mountRef} className="m3-canvas-wrap" />

      {phase === 'menu' && (
        <div className="m3-overlay">
          <h1>Gravity Guy Rush 2D</h1>
          <p>Side-view gravity flip race for 1-4 players on one keyboard.</p>
          <p>Everyone runs on the same floor and ceiling path. Crash or get caught and you are out.</p>
          <div className="m3-player-count">
            <span>Players:</span>
            <button className={playerCount === 1 ? 'active' : ''} onClick={() => setPlayerCount(1)}>1</button>
            <button className={playerCount === 2 ? 'active' : ''} onClick={() => setPlayerCount(2)}>2</button>
            <button className={playerCount === 3 ? 'active' : ''} onClick={() => setPlayerCount(3)}>3</button>
            <button className={playerCount === 4 ? 'active' : ''} onClick={() => setPlayerCount(4)}>4</button>
          </div>
          <div className="m3-controls-list">
            {ACTION_LABELS.slice(0, playerCount).map(label => (
              <span key={label}>{label} flip gravity</span>
            ))}
          </div>
          <button className="m3-main-btn" onClick={startGame}>Start Elimination Run</button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="m3-hud">
          <div className="m3-time">Alive: {timeLeft}/{playerCount} | Speed: {speed.toFixed(1)} | Dist: {distance}</div>
          <div className="m3-score-row">
            {scores.slice(0, playerCount).map((score, index) => (
              <div key={PLAYER_LABELS[index]} className="m3-score-card">
                <span>{PLAYER_LABELS[index]}</span>
                <strong>{score > 0 ? score : 'OUT'}</strong>
              </div>
            ))}
          </div>
          <div className="m3-status">{status}</div>
          <button className="m3-mini-btn" onClick={resetToMenu}>Menu</button>
        </div>
      )}

      {phase === 'over' && (
        <div className="m3-overlay">
          <h2>Race Complete</h2>
          <p>{status}</p>
          <p>Distance: {distance} | Best Score: {Math.max(...scores.slice(0, playerCount))}</p>
          <p>Shared path elimination with a pursuing Gravity Trooper.</p>
          <button className="m3-main-btn" onClick={startGame}>Rematch</button>
          <button className="m3-alt-btn" onClick={resetToMenu}>Main Menu</button>
        </div>
      )}

      <BackButton />
    </div>
  );
}
