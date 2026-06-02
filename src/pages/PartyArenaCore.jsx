import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import BackButton from './BackButton';
import './Multiplayer3D.css';

const PLAYER_COLORS = [0x34d399, 0x60a5fa, 0xf472b6, 0xf59e0b];
const PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4'];
const CONTROL_SETS = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', action: 'KeyQ', label: 'P1 WASD + Q' },
  { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', action: 'KeyU', label: 'P2 IJKL + U' },
  { up: 'KeyT', down: 'KeyG', left: 'KeyF', right: 'KeyH', action: 'KeyR', label: 'P3 TFGH + R' },
  {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    action: 'Slash',
    label: 'P4 Arrows + /',
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

function createPlayerMesh(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.68, 1.25, 5, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.15 })
  );
  body.castShadow = true;
  body.position.y = 1.2;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.92, 0.3, 16),
    new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.8 })
  );
  base.position.y = 0.15;
  base.receiveShadow = true;
  group.add(body, base);
  return group;
}

function makeOrb(color, radius = 0.5) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 20, 20),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.25 })
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
        new THREE.MeshStandardMaterial({ color: 0xff5d73, emissive: 0xff1b44, emissiveIntensity: 0.3 })
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
    scene.fog = new THREE.FogExp2(merged.palette.fog, 0.02);

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 200);
    camera.position.set(0, 38, 30);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    const directional = new THREE.DirectionalLight(0xffffff, 1.15);
    directional.position.set(24, 42, 18);
    directional.castShadow = true;
    directional.shadow.mapSize.set(1024, 1024);
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 140;
    scene.add(ambient, directional);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(merged.arenaSize, merged.arenaSize, 1, 48),
      new THREE.MeshStandardMaterial({ color: merged.palette.floor, roughness: 0.85 })
    );
    floor.receiveShadow = true;
    scene.add(floor);

    const wall = new THREE.Mesh(
      new THREE.TorusGeometry(merged.arenaSize + 0.35, 1.3, 20, 64),
      new THREE.MeshStandardMaterial({ color: merged.palette.wall, emissive: merged.palette.wall, emissiveIntensity: 0.18 })
    );
    wall.rotation.x = Math.PI / 2;
    wall.position.y = 1.2;
    scene.add(wall);

    const players = [];
    const scoresRef = [0, 0, 0, 0];
    const startRadius = merged.arenaSize * 0.58;
    for (let i = 0; i < count; i += 1) {
      const mesh = createPlayerMesh(PLAYER_COLORS[i]);
      mesh.position.copy(circlePoint(startRadius, (i / count) * Math.PI * 2));
      mesh.position.y = 0;
      scene.add(mesh);
      players.push({
        index: i,
        mesh,
        radius: 0.92,
        velocity: new THREE.Vector3(),
        alive: true,
      });
    }

    const zoneMesh = new THREE.Mesh(
      new THREE.RingGeometry((merged.zoneRadius || 5) - 0.4, merged.zoneRadius || 5, 40),
      new THREE.MeshBasicMaterial({ color: merged.palette.accent, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    zoneMesh.rotation.x = -Math.PI / 2;
    zoneMesh.position.set(0, 0.08, 0);
    zoneMesh.visible = merged.variant === 'zone';
    scene.add(zoneMesh);

    const crownMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.2, 7),
      new THREE.MeshStandardMaterial({ color: 0xffe169, emissive: 0xffbd2e, emissiveIntensity: 0.25 })
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
      new THREE.MeshStandardMaterial({ color: 0xff5d5d, emissive: 0xff0000, emissiveIntensity: 0.28 })
    );
    bombMesh.visible = merged.variant === 'bomb';
    scene.add(bombMesh);

    const meteorGeo = new THREE.IcosahedronGeometry(0.9, 1);
    const meteorMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12, emissiveIntensity: 0.2 });

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
      pickups: [],
      hazards: [],
      meteors: [],
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

    engineRef.current = engine;
    return engine;
  }

  function movePlayers(engine, dt) {
    const boundary = merged.arenaSize - 1.2;
    for (let i = 0; i < playerCount; i += 1) {
      const player = engine.players[i];
      if (!player || !player.alive) continue;
      const ctl = CONTROL_SETS[i];
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
      const dashDown = keyStateRef.current[ctl.action] ? 1.42 : 1;
      const speed = merged.baseSpeed * dashDown;
      player.velocity.x = x * speed;
      player.velocity.z = z * speed;
      player.mesh.position.x += player.velocity.x * dt;
      player.mesh.position.z += player.velocity.z * dt;

      const dist = Math.hypot(player.mesh.position.x, player.mesh.position.z);
      if (dist > boundary) {
        const scale = boundary / Math.max(0.001, dist);
        player.mesh.position.x *= scale;
        player.mesh.position.z *= scale;
      }

      if (len > 0) {
        player.mesh.rotation.y = Math.atan2(player.velocity.x, player.velocity.z);
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

          if (merged.variant === 'tag' && engine.crownHolder === a.index) {
            engine.crownHolder = b.index;
            setStatusText(`${PLAYER_LABELS[b.index]} stole the crown.`);
          } else if (merged.variant === 'tag' && engine.crownHolder === b.index) {
            engine.crownHolder = a.index;
            setStatusText(`${PLAYER_LABELS[a.index]} stole the crown.`);
          }
          if (merged.variant === 'bomb' && engine.bombHolder === a.index) {
            engine.bombHolder = b.index;
          } else if (merged.variant === 'bomb' && engine.bombHolder === b.index) {
            engine.bombHolder = a.index;
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
      for (let p = 0; p < playerCount; p += 1) {
        const player = engine.players[p];
        if (!player?.alive) continue;
        const d = player.mesh.position.distanceTo(pickup.mesh.position);
        if (d < player.radius + pickup.radius) {
          engine.scene.remove(pickup.mesh);
          engine.pickups.splice(i, 1);
          engine.scoresRef[p] += merged.collectPoints || 4;
          setStatusText(`${PLAYER_LABELS[p]} captured an orb.`);
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
      engine.bombHolder = Math.floor(Math.random() * playerCount);
      setStatusText(`${PLAYER_LABELS[idx]} got bombed.`);
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
        const d = player.mesh.position.distanceTo(meteor.mesh.position);
        if (d < 1.6) {
          player.alive = false;
          player.mesh.visible = false;
          setStatusText(`${PLAYER_LABELS[p]} was hit by a meteor.`);
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
    <div className="m3-root">
      <div className="m3-canvas-wrap" ref={mountRef} />

      {phase === 'menu' && (
        <div className="m3-overlay">
          <h1>{merged.title}</h1>
          <p>{merged.subtitle}</p>
          <p>{merged.objective}</p>
          <div className="m3-player-count">
            <span>Players:</span>
            <button className={playerCount === 3 ? 'active' : ''} onClick={() => setPlayerCount(3)}>3</button>
            <button className={playerCount === 4 ? 'active' : ''} onClick={() => setPlayerCount(4)}>4</button>
          </div>
          <div className="m3-controls-list">
            {CONTROL_SETS.slice(0, playerCount).map(control => (
              <span key={control.label}>{control.label}</span>
            ))}
          </div>
          <button className="m3-main-btn" onClick={startRound}>Start Match</button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="m3-hud">
          <div className="m3-time">Time: {Math.ceil(timeLeft)}</div>
          <div className="m3-score-row">
            {scores.slice(0, playerCount).map((value, index) => (
              <div key={PLAYER_LABELS[index]} className="m3-score-card">
                <span>{PLAYER_LABELS[index]}</span>
                <strong>{Math.round(value)}</strong>
              </div>
            ))}
          </div>
          <div className="m3-status">{statusText}</div>
          <button className="m3-mini-btn" onClick={resetToMenu}>Menu</button>
        </div>
      )}

      {phase === 'over' && (
        <div className="m3-overlay">
          <h2>Round Over</h2>
          <p>{statusText}</p>
          <button className="m3-main-btn" onClick={startRound}>Play Again</button>
          <button className="m3-alt-btn" onClick={resetToMenu}>Main Menu</button>
        </div>
      )}

      <BackButton />
    </div>
  );
}
