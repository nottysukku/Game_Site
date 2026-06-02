import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import BackButton from './BackButton';
import './Racing.css';

// WAYPOINTS FOR RACETRACK splines (closed loop)
const TRACK_WAYPOINTS = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(38, 0, -22),
  new THREE.Vector3(82, 0, 8),
  new THREE.Vector3(112, 0, -32),
  new THREE.Vector3(98, 0, -82),
  new THREE.Vector3(52, 0, -112),
  new THREE.Vector3(0, 0, -92),
  new THREE.Vector3(-42, 0, -122),
  new THREE.Vector3(-88, 0, -82),
  new THREE.Vector3(-72, 0, -32),
  new THREE.Vector3(-42, 0, -12),
  new THREE.Vector3(-18, 0, 22),
];

const TRACK_CURVE = new THREE.CatmullRomCurve3(TRACK_WAYPOINTS, true);
const TRACK_WIDTH = 9.2;
const TOTAL_SPLINE_STEPS = 400;
const CURVE_POINTS = TRACK_CURVE.getPoints(TOTAL_SPLINE_STEPS);

// Team colors and name lists for rivals
const RIVAL_CONFIGS = [
  { name: 'CyberDrift (CPU)', color: 0xffd166, startOffset: 1.4 },
  { name: 'TurboBot (CPU)', color: 0x06b6d4, startOffset: -1.4 },
  { name: 'NeonRider (CPU)', color: 0x10b981, startOffset: 2.8 },
];

export default function Racing() {
  const containerRef = useRef(null);
  const stateRef = useRef({ restart: null, cleanup: null });

  // Game UI States
  const [phase, setPhase] = useState('menu'); // menu | playing | over
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [lap, setLap] = useState(1);
  const [speed, setSpeed] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rankText, setRankText] = useState('4th');
  const [score, setScore] = useState(0);
  const [lapTimes, setLapTimes] = useState([]);

  useEffect(() => {
    if (!containerRef.current) return;

    let scene, camera, renderer, clock;
    let mainKartGroup, mainKartWheels = [];
    let rivals = []; // array of rival karts
    let particleSystems = []; // boost trails, drift sparks, exhaust smoke
    let trackItems = []; // boost zippers, hazard crates, coins
    let roadMesh, gridHelper;
    let ambientLight, dirLight;
    
    // Physics parameters for Player
    let playerPhysics = {
      pos: new THREE.Vector3(0, 0, 5),
      angle: Math.PI * 0.9,
      speed: 0,
      velocity: new THREE.Vector3(),
      driftAngle: 0,
      isDrifting: false,
      driftSide: 0, // -1 or 1
      boostTimer: 0,
      spinTimer: 0,
      lap: 1,
      checkpointPassed: false,
      splineProgressIndex: 0,
      score: 0,
    };

    const keys = { w: false, s: false, a: false, d: false, space: false };
    let cameraShake = 0;
    let animId;
    let lapStartTime = 0;
    let gameStartTime = 0;
    let currentLapTimes = [];

    // Screen Dimensions
    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // 1. SCENE SETUP
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05020c);
    scene.fog = new THREE.FogExp2(0x05020c, 0.012);

    camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // 2. LIGHTING (Cyberpunk Theme)
    ambientLight = new THREE.AmbientLight(0x1a1230, 0.85);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xff00ff, 1.45);
    dirLight.position.set(40, 80, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 280;
    dirLight.shadow.camera.left = -90;
    dirLight.shadow.camera.right = 90;
    dirLight.shadow.camera.top = 90;
    dirLight.shadow.camera.bottom = -90;
    scene.add(dirLight);

    const helperLight = new THREE.DirectionalLight(0x00ffff, 0.85);
    helperLight.position.set(-40, 40, -40);
    scene.add(helperLight);

    // 3. SYNTHWAVE GRID GROUND
    const gridGeo = new THREE.PlaneGeometry(1000, 1000, 40, 40);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x1c0f3d, wireframe: true, transparent: true, opacity: 0.28 });
    const gridFloor = new THREE.Mesh(gridGeo, gridMat);
    gridFloor.rotation.x = -Math.PI / 2;
    gridFloor.position.y = -0.05;
    scene.add(gridFloor);

    // Huge dark ocean floor underneath
    const oceanGeo = new THREE.PlaneGeometry(1200, 1200);
    const oceanMat = new THREE.MeshStandardMaterial({ color: 0x030107, roughness: 0.95 });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.15;
    ocean.receiveShadow = true;
    scene.add(ocean);

    // 4. ROAD PROCEDURAL CREATION (TRIANGLE MESH RIBBON)
    const roadGeometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const indices = [];

    // Curbs array (red and white)
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
      const p = TRACK_CURVE.getPointAt(u % 1.0);
      const tangent = TRACK_CURVE.getTangentAt(u % 1.0);
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const leftPt = p.clone().addScaledVector(normal, -TRACK_WIDTH / 2);
      const rightPt = p.clone().addScaledVector(normal, TRACK_WIDTH / 2);

      vertices.push(leftPt.x, leftPt.y + 0.01, leftPt.z);
      vertices.push(rightPt.x, rightPt.y + 0.01, rightPt.z);

      // Dark asphalt color
      colors.push(0.08, 0.07, 0.12);
      colors.push(0.08, 0.07, 0.12);

      // Curb quads
      const leftCurbOuter = p.clone().addScaledVector(normal, -TRACK_WIDTH / 2 - 0.45);
      const rightCurbOuter = p.clone().addScaledVector(normal, TRACK_WIDTH / 2 + 0.45);

      curbVertsL.push(leftCurbOuter.x, leftCurbOuter.y + 0.02, leftCurbOuter.z);
      curbVertsL.push(leftPt.x, leftPt.y + 0.02, leftPt.z);

      curbVertsR.push(rightPt.x, rightPt.y + 0.02, rightPt.z);
      curbVertsR.push(rightCurbOuter.x, rightCurbOuter.y + 0.02, rightCurbOuter.z);

      // Alternating red/white stripes
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

    const roadMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.1 });
    roadMesh = new THREE.Mesh(roadGeometry, roadMat);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Curbs Addition
    const curbMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 });
    
    curbGeometryL.setAttribute('position', new THREE.Float32BufferAttribute(curbVertsL, 3));
    curbGeometryL.setAttribute('color', new THREE.Float32BufferAttribute(curbColorsL, 3));
    curbGeometryL.setIndex(curbIndicesL);
    curbGeometryL.computeVertexNormals();
    const curbMeshL = new THREE.Mesh(curbGeometryL, curbMat);
    scene.add(curbMeshL);

    curbGeometryR.setAttribute('position', new THREE.Float32BufferAttribute(curbVertsR, 3));
    curbGeometryR.setAttribute('color', new THREE.Float32BufferAttribute(curbColorsR, 3));
    curbGeometryR.setIndex(curbIndicesR);
    curbGeometryR.computeVertexNormals();
    const curbMeshR = new THREE.Mesh(curbGeometryR, curbMat);
    scene.add(curbMeshR);

    // Center lane guideline (neon dotted strip)
    const splineGeo = new THREE.BufferGeometry().setFromPoints(CURVE_POINTS);
    const splineMat = new THREE.LineBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.5 });
    const centerLine = new THREE.LineLoop(splineGeo, splineMat);
    centerLine.position.y = 0.03;
    scene.add(centerLine);

    // 5. PROCEDURAL KART MESH GENERATOR
    function buildGoKart(colorHex) {
      const kart = new THREE.Group();

      // Main Chassis Plate
      const chassisMat = new THREE.MeshStandardMaterial({ color: 0x222226, metalness: 0.85, roughness: 0.3 });
      const basePlate = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.16, 2.3), chassisMat);
      basePlate.position.y = 0.28;
      basePlate.castShadow = true;
      basePlate.receiveShadow = true;
      kart.add(basePlate);

      // Colored Body Shell
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.62, roughness: 0.15 });

      // Pointy Synthwave nosecone
      const noseGeo = new THREE.BoxGeometry(0.9, 0.22, 0.65);
      const nose = new THREE.Mesh(noseGeo, bodyMat);
      nose.position.set(0, 0.36, -0.95);
      nose.castShadow = true;
      kart.add(nose);

      // Low aerodynamics front spoiler wing
      const fWing = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 0.32), bodyMat);
      fWing.position.set(0, 0.22, -1.35);
      fWing.castShadow = true;
      kart.add(fWing);

      // Right and Left Side Pods
      const lPod = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 1.25), bodyMat);
      lPod.position.set(-0.64, 0.36, 0);
      lPod.castShadow = true;
      kart.add(lPod);

      const rPod = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 1.25), bodyMat);
      rPod.position.set(0.64, 0.36, 0);
      rPod.castShadow = true;
      kart.add(rPod);

      // Bucket Racing Seat
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.85 });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 0.52), seatMat);
      seat.position.set(0, 0.58, 0.35);
      kart.add(seat);

      // Steering Wheel Column and Torus Wheel
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.72), chassisMat);
      column.rotation.x = -Math.PI / 5;
      column.position.set(0, 0.52, -0.32);
      kart.add(column);

      const sWheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.028, 8, 16), seatMat);
      sWheel.rotation.x = -Math.PI / 5;
      sWheel.position.set(0, 0.78, -0.46);
      kart.add(sWheel);

      // Heavy Engine Block
      const engineMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7c, metalness: 0.9, roughness: 0.1 });
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.44), engineMat);
      block.position.set(0, 0.56, 0.9);
      block.castShadow = true;
      kart.add(block);

      const tailpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45), engineMat);
      tailpipe.rotation.x = Math.PI / 3;
      tailpipe.position.set(0.18, 0.68, 1.18);
      kart.add(tailpipe);

      // Spoiler struts and high spoiler wing
      const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), engineMat);
      strutL.position.set(-0.38, 0.82, 1.15);
      kart.add(strutL);

      const strutR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), engineMat);
      strutR.position.set(0.38, 0.82, 1.15);
      kart.add(strutR);

      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 0.48), bodyMat);
      spoiler.position.set(0, 1.2, 1.15);
      spoiler.castShadow = true;
      kart.add(spoiler);

      // Wheels
      const wheelsList = [];
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.88 });
      const rimMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.85, roughness: 0.2 });

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
        tire.castShadow = true;
        wGroup.add(tire);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, thickness + 0.03, 12), rimMat);
        rim.rotation.z = Math.PI / 2;
        wGroup.add(rim);

        kart.add(wGroup);
        wheelsList.push({ mesh: wGroup, isFront: wp.isFront, isLeft: wp.x < 0, radius });
      });

      scene.add(kart);
      return { model: kart, wheels: wheelsList };
    }

    // 6. BUILD KART INSTANCES (Player & 3 CPUs)
    const playerBuild = buildGoKart(0xff007f); // Neon Pink
    mainKartGroup = playerBuild.model;
    mainKartWheels = playerBuild.wheels;

    mainKartGroup.position.copy(playerPhysics.pos);
    mainKartGroup.rotation.y = playerPhysics.angle;

    // AI rivals configuration
    RIVAL_CONFIGS.forEach((cfg, idx) => {
      const build = buildGoKart(cfg.color);
      
      const startSeg = 4;
      const startPt = TRACK_CURVE.getPointAt(startSeg / TOTAL_SPLINE_STEPS);
      const tangent = TRACK_CURVE.getTangentAt(startSeg / TOTAL_SPLINE_STEPS);
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      
      const aiPos = startPt.clone().addScaledVector(normal, cfg.startOffset);

      build.model.position.copy(aiPos);
      build.model.rotation.y = Math.PI * 0.9;

      rivals.push({
        name: cfg.name,
        colorHex: cfg.color,
        model: build.model,
        wheels: build.wheels,
        pos: aiPos,
        angle: Math.PI * 0.9,
        speed: 0,
        velocity: new THREE.Vector3(),
        lap: 1,
        checkpointPassed: false,
        splineProgressIndex: startSeg,
        spinTimer: 0,
        skill: 0.82 + idx * 0.06, // unique speed/turn capabilities
        targetNode: 15,
      });
    });

    // 7. TRACK ASSETS & DYNAMIC ITEMS SPINNER
    // Place boost arrows (zippers), spinning coins and red hazard boxes
    const spawnPositions = [
      { step: 18, type: 'zipper', side: 0 },
      { step: 32, type: 'coin', side: -1.6 },
      { step: 34, type: 'coin', side: 0 },
      { step: 36, type: 'coin', side: 1.6 },
      { step: 55, type: 'crate', side: -1.2 },
      { step: 57, type: 'crate', side: 1.2 },
      { step: 80, type: 'zipper', side: 1.8 },
      { step: 110, type: 'coin', side: -2.0 },
      { step: 115, type: 'coin', side: 2.0 },
      { step: 135, type: 'crate', side: 0 },
      { step: 160, type: 'zipper', side: -1.8 },
      { step: 190, type: 'coin', side: 0 },
      { step: 193, type: 'coin', side: 0 },
      { step: 215, type: 'crate', side: 1.5 },
      { step: 245, type: 'zipper', side: 0 },
      { step: 275, type: 'coin', side: -1.5 },
      { step: 278, type: 'coin', side: 1.5 },
      { step: 305, type: 'crate', side: -1.5 },
      { step: 325, type: 'zipper', side: 1.4 },
      { step: 360, type: 'coin', side: 0 },
      { step: 365, type: 'coin', side: 0 },
    ];

    spawnPositions.forEach((sp) => {
      const p = TRACK_CURVE.getPointAt(sp.step / TOTAL_SPLINE_STEPS);
      const tangent = TRACK_CURVE.getTangentAt(sp.step / TOTAL_SPLINE_STEPS);
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      const pos = p.clone().addScaledVector(normal, sp.side);
      pos.y = 0.05;

      let itemMesh;

      if (sp.type === 'zipper') {
        // Glowing Neon Arrow Plane
        const shape = new THREE.BufferGeometry();
        const pts = [
          new THREE.Vector3(0, 0.02, -0.9),
          new THREE.Vector3(-0.9, 0.02, 0.5),
          new THREE.Vector3(-0.4, 0.02, 0.5),
          new THREE.Vector3(-0.4, 0.02, 0.9),
          new THREE.Vector3(0.4, 0.02, 0.9),
          new THREE.Vector3(0.4, 0.02, 0.5),
          new THREE.Vector3(0.9, 0.02, 0.5)
        ];
        shape.setFromPoints(pts);
        
        // Custom simple indices for arrow
        const zipperIndices = [
          0, 1, 6,
          2, 3, 4,
          2, 4, 5
        ];
        shape.setIndex(zipperIndices);
        shape.computeVertexNormals();

        const zipMat = new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide });
        itemMesh = new THREE.Mesh(shape, zipMat);
        itemMesh.position.copy(pos);
        
        // Align arrow forward along road tangent
        const lookTarget = pos.clone().add(tangent);
        itemMesh.lookAt(lookTarget);
        scene.add(itemMesh);
      } 
      else if (sp.type === 'coin') {
        // Floating Gold Dodecahedron Coin
        const coinGeo = new THREE.DodecahedronGeometry(0.44, 0);
        const coinMat = new THREE.MeshStandardMaterial({
          color: 0xffd166,
          emissive: 0xffa800,
          emissiveIntensity: 0.35,
          roughness: 0.15,
          metalness: 0.95
        });
        itemMesh = new THREE.Mesh(coinGeo, coinMat);
        itemMesh.position.copy(pos);
        itemMesh.position.y = 0.65;
        scene.add(itemMesh);
      } 
      else if (sp.type === 'crate') {
        // Warning Hazard red block
        const crateGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
        const crateMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.52 });
        itemMesh = new THREE.Mesh(crateGeo, crateMat);
        itemMesh.position.copy(pos);
        itemMesh.position.y = 0.44;
        itemMesh.castShadow = true;
        scene.add(itemMesh);
        
        // Add neon glowing stripes around warning box
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(crateGeo),
          new THREE.LineBasicMaterial({ color: 0xffa000, linewidth: 2 })
        );
        itemMesh.add(outline);
      }

      trackItems.push({
        type: sp.type,
        mesh: itemMesh,
        pos: pos,
        radius: sp.type === 'zipper' ? 1.6 : 0.9,
        active: true,
      });
    });

    // 8. SCENERY BACKGROUND DECOR (NEON ARCHES, FLOATING OBJECTS)
    // Add glowing synthwave starting arches and structures
    const archPoints = [0, 100, 200, 300];
    archPoints.forEach((step) => {
      const p = TRACK_CURVE.getPointAt(step / TOTAL_SPLINE_STEPS);
      const tangent = TRACK_CURVE.getTangentAt(step / TOTAL_SPLINE_STEPS);
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const archGroup = new THREE.Group();
      archGroup.position.copy(p);
      archGroup.lookAt(p.clone().add(tangent));

      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x18181c, metalness: 0.8, roughness: 0.3 });
      const neonBeamMat = new THREE.MeshBasicMaterial({ color: step === 0 ? 0xff00ff : 0x00ffff });

      const lPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 7.8, 8), pillarMat);
      lPillar.position.set(-TRACK_WIDTH / 2 - 0.9, 3.9, 0);
      archGroup.add(lPillar);

      const rPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 7.8, 8), pillarMat);
      rPillar.position.set(TRACK_WIDTH / 2 + 0.9, 3.9, 0);
      archGroup.add(rPillar);

      const beam = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH + 2.2, 0.38, 0.38), neonBeamMat);
      beam.position.set(0, 7.8, 0);
      archGroup.add(beam);

      scene.add(archGroup);
    });

    // Giant neon directional turns arrows
    const curveDirections = [
      { step: 52, lookAngle: -Math.PI / 4 },
      { step: 104, lookAngle: Math.PI / 2 },
      { step: 260, lookAngle: 0 },
      { step: 345, lookAngle: -Math.PI / 3 }
    ];

    curveDirections.forEach((cd) => {
      const p = TRACK_CURVE.getPointAt(cd.step / TOTAL_SPLINE_STEPS);
      const tangent = TRACK_CURVE.getTangentAt(cd.step / TOTAL_SPLINE_STEPS);
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      
      const billboardPos = p.clone().addScaledVector(normal, -TRACK_WIDTH / 2 - 4.2);
      billboardPos.y = 3.6;

      const arrowGeo = new THREE.BoxGeometry(3.5, 1.8, 0.2);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.82 });
      const billboard = new THREE.Mesh(arrowGeo, arrowMat);
      billboard.position.copy(billboardPos);
      billboard.rotation.y = cd.lookAngle;
      scene.add(billboard);
    });

    // 9. DYNAMIC EXHAUST PARTICLES SYSTEM
    function spawnExhaustBubble(sourcePos, colorHex = 0xffffff) {
      const pGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const pMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.65
      });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.position.copy(sourcePos);
      
      scene.add(mesh);
      particleSystems.push({
        mesh: mesh,
        type: 'exhaust',
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.4),
        age: 0,
        maxAge: 0.42
      });
    }

    // Spark particles for drifting tires
    function spawnDriftSparks(sourcePos, colorHex = 0xff53a0) {
      const pGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
      const pMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.position.copy(sourcePos);
      scene.add(mesh);
      
      particleSystems.push({
        mesh: mesh,
        type: 'spark',
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3.4,
          1.2 + Math.random() * 2.2,
          (Math.random() - 0.5) * 3.4
        ),
        age: 0,
        maxAge: 0.35
      });
    }

    // 10. DRIVING ANIMATION ENGINE LOOP
    let lapCountChecked = 1;
    gameStartTime = clock.getElapsedTime();
    lapStartTime = gameStartTime;

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.03, clock.getDelta());

      // Decrease Screen Shake
      if (cameraShake > 0) cameraShake -= dt * 1.5;

      // Update particle ages and movements
      for (let i = particleSystems.length - 1; i >= 0; i--) {
        const p = particleSystems[i];
        p.age += dt;
        p.mesh.position.addScaledVector(p.velocity, dt);

        if (p.type === 'exhaust') {
          // grow larger and fade out
          p.mesh.scale.multiplyScalar(1.04);
          p.mesh.material.opacity = 0.65 * (1 - p.age / p.maxAge);
        } else if (p.type === 'spark') {
          // fall back due to gravity
          p.velocity.y -= 9.8 * dt;
        }

        if (p.age >= p.maxAge) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          particleSystems.splice(i, 1);
        }
      }

      // Track item rotators
      trackItems.forEach((item) => {
        if (!item.active) return;
        if (item.type === 'coin') {
          item.mesh.rotation.y += dt * 3.2;
          item.mesh.position.y = 0.65 + Math.sin(clock.getElapsedTime() * 4) * 0.12;
        } else if (item.type === 'crate') {
          item.mesh.rotation.y += dt * 0.8;
        }
      });

      // --- PLAYER PHYSICS LOOP ---
      if (phaseRef.current === 'playing') {
        // Spin Timer
        if (playerPhysics.spinTimer > 0) {
          playerPhysics.spinTimer -= dt;
          playerPhysics.speed = Math.max(0, playerPhysics.speed - dt * 25);
          mainKartGroup.rotation.y += dt * 14.5;
        } 
        else {
          // Acceleration / Reverse
          if (keys.w) {
            const acc = playerPhysics.boostTimer > 0 ? 25 : 12;
            const topSpd = playerPhysics.boostTimer > 0 ? 34 : 22;
            playerPhysics.speed = Math.min(topSpd, playerPhysics.speed + acc * dt);
          } else if (keys.s) {
            playerPhysics.speed = Math.max(-10, playerPhysics.speed - 15 * dt);
          } else {
            // Friction decay
            playerPhysics.speed -= playerPhysics.speed * 1.8 * dt;
          }

          // Steering Turn Rate
          let steerFactor = 1.0;
          if (Math.abs(playerPhysics.speed) < 2) steerFactor = 0.28; // slow turn
          else if (playerPhysics.isDrifting) steerFactor = 1.55; // tight drift steering

          if (keys.a) {
            playerPhysics.angle += 2.2 * steerFactor * dt;
            playerPhysics.driftSide = -1;
          } else if (keys.d) {
            playerPhysics.angle -= 2.2 * steerFactor * dt;
            playerPhysics.driftSide = 1;
          }

          // Drift trigger Space key
          if (keys.space && (keys.a || keys.d) && playerPhysics.speed > 10) {
            playerPhysics.isDrifting = true;
          } else {
            playerPhysics.isDrifting = false;
          }

          // Visual Wheel orientation angles
          mainKartWheels.forEach((wheel) => {
            // Wheel spin matching velocity
            wheel.mesh.rotation.x += (playerPhysics.speed * dt) / wheel.radius;
            // Front steering angle
            if (wheel.isFront) {
              const targetSteer = keys.a ? 0.35 : keys.d ? -0.35 : 0;
              wheel.mesh.rotation.y = THREE.MathUtils.lerp(wheel.mesh.rotation.y, targetSteer, dt * 10);
            }
          });

          // Drift physics adjustment
          if (playerPhysics.isDrifting) {
            playerPhysics.driftAngle = THREE.MathUtils.lerp(playerPhysics.driftAngle, -playerPhysics.driftSide * 0.44, dt * 6);
            
            // Emit Drift Sparks dynamically
            const leftRearWheel = mainKartWheels[2].mesh.localToWorld(new THREE.Vector3());
            const rightRearWheel = mainKartWheels[3].mesh.localToWorld(new THREE.Vector3());
            spawnDriftSparks(leftRearWheel, 0xff00ff);
            spawnDriftSparks(rightRearWheel, 0x00ffff);
          } else {
            playerPhysics.driftAngle = THREE.MathUtils.lerp(playerPhysics.driftAngle, 0, dt * 8);
          }

          // Vector calculation
          const finalHeading = playerPhysics.angle + playerPhysics.driftAngle;
          const targetVelocity = new THREE.Vector3(Math.sin(finalHeading) * playerPhysics.speed, 0, Math.cos(finalHeading) * playerPhysics.speed);
          
          // Smooth slide interpolation
          const slipFactor = playerPhysics.isDrifting ? 2.2 : 8.5;
          playerPhysics.velocity.lerp(targetVelocity, dt * slipFactor);
          playerPhysics.pos.addScaledVector(playerPhysics.velocity, dt);

          // Tilt vehicle model slightly when steering/drifting
          let rollAngle = 0;
          if (keys.a) rollAngle = 0.08;
          else if (keys.d) rollAngle = -0.08;
          if (playerPhysics.isDrifting) rollAngle *= 2.2;
          
          mainKartGroup.children[0].rotation.z = THREE.MathUtils.lerp(mainKartGroup.children[0].rotation.z, rollAngle, dt * 10);

          mainKartGroup.position.copy(playerPhysics.pos);
          mainKartGroup.rotation.y = playerPhysics.angle + playerPhysics.driftAngle;
        }

        // Exhaust gas particle bubbles
        if (Math.abs(playerPhysics.speed) > 1 && Math.random() < 0.35) {
          const pipeOutlet = mainKartGroup.localToWorld(new THREE.Vector3(0.18, 0.68, 1.18));
          spawnExhaustBubble(pipeOutlet, 0xff00cc);
        }

        // Boost countdown timer
        if (playerPhysics.boostTimer > 0) {
          playerPhysics.boostTimer -= dt;
          if (Math.random() < 0.45) {
            spawnExhaustBubble(mainKartGroup.localToWorld(new THREE.Vector3(0, 0.4, 1.0)), 0xffd166);
          }
        }

        // --- BOUNDARIES ON/OFF TRACK DISTANCE CHECK ---
        let minDistance = 9999;
        let closestIndex = 0;
        CURVE_POINTS.forEach((pt, idx) => {
          const dist = playerPhysics.pos.distanceTo(pt);
          if (dist < minDistance) {
            minDistance = dist;
            closestIndex = idx;
          }
        });

        playerPhysics.splineProgressIndex = closestIndex;

        // grass slow penalizer
        const roadLimit = TRACK_WIDTH / 2;
        if (minDistance > roadLimit) {
          // Off-road grass limit max speed
          const capSpeed = 5.2;
          if (playerPhysics.speed > capSpeed) {
            playerPhysics.speed = THREE.MathUtils.lerp(playerPhysics.speed, capSpeed, dt * 4);
          }
        }

        // --- ITEM COLLISION HANDLERS ---
        trackItems.forEach((item) => {
          if (!item.active) return;
          const dist = playerPhysics.pos.distanceTo(item.pos);
          if (dist < item.radius) {
            if (item.type === 'coin') {
              item.active = false;
              scene.remove(item.mesh);
              playerPhysics.score += 150;
              setScore(playerPhysics.score);
            } 
            else if (item.type === 'zipper') {
              playerPhysics.boostTimer = 1.35;
              playerPhysics.speed = 34; // boost zip speed
              cameraShake = 0.28;
            } 
            else if (item.type === 'crate') {
              item.active = false;
              scene.remove(item.mesh);
              playerPhysics.spinTimer = 0.65;
              cameraShake = 0.55;
            }
          }
        });

        // --- CHECKPOINT AND LAP TRACKINGS ---
        // Checkpoint placed at halfway index 200
        if (closestIndex > 180 && closestIndex < 220) {
          playerPhysics.checkpointPassed = true;
        }

        // Starting gate line placed around step 0
        if (closestIndex > 385 && playerPhysics.checkpointPassed) {
          playerPhysics.checkpointPassed = false;
          const now = clock.getElapsedTime();
          const lapTime = now - lapStartTime;
          lapStartTime = now;
          
          currentLapTimes.push(lapTime.toFixed(2));
          setLapTimes([...currentLapTimes]);

          if (playerPhysics.lap >= 3) {
            setPhase('over');
          } else {
            playerPhysics.lap += 1;
            setLap(playerPhysics.lap);
          }
        }

        setSpeed(Math.floor(playerPhysics.speed * 7));
      }

      // --- CPU AI COMPETITORS LOOP ---
      rivals.forEach((ai) => {
        if (phaseRef.current === 'playing') {
          // Spin mechanics
          if (ai.spinTimer > 0) {
            ai.spinTimer -= dt;
            ai.speed = Math.max(0, ai.speed - dt * 20);
            ai.model.rotation.y += dt * 14.5;
          } 
          else {
            // Find closest spline point to evaluate progress
            let closestPtDist = 9999;
            let aiClosestIdx = 0;
            CURVE_POINTS.forEach((pt, idx) => {
              const d = ai.pos.distanceTo(pt);
              if (d < closestPtDist) {
                closestPtDist = d;
                aiClosestIdx = idx;
              }
            });
            ai.splineProgressIndex = aiClosestIdx;

            // Simple Waypoint target following
            // target node lies 12 steps ahead on the loop
            const targetSeg = (aiClosestIdx + 12) % TOTAL_SPLINE_STEPS;
            const targetPt = CURVE_POINTS[targetSeg];

            const dirToTarget = targetPt.clone().sub(ai.pos).normalize();
            const headingAngle = Math.atan2(dirToTarget.x, dirToTarget.z);

            // Steer interpolation
            let angleDiff = headingAngle - ai.angle;
            // angle wraparound correction
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            ai.angle += THREE.MathUtils.clamp(angleDiff, -2.5 * dt, 2.5 * dt);

            // target speed with minor random variance
            const maxAISpeed = (16.2 + ai.skill * 4) * (closestPtDist > TRACK_WIDTH / 2 ? 0.35 : 1.0);
            ai.speed = THREE.MathUtils.lerp(ai.speed, maxAISpeed, dt * 3);

            ai.velocity.set(Math.sin(ai.angle) * ai.speed, 0, Math.cos(ai.angle) * ai.speed);
            ai.pos.addScaledVector(ai.velocity, dt);

            ai.model.position.copy(ai.pos);
            ai.model.rotation.y = ai.angle;
          }

          // Spin wheel mesh
          ai.wheels.forEach((wheel) => {
            wheel.mesh.rotation.x += (ai.speed * dt) / wheel.radius;
          });

          // exhaust particles for CPU karts
          if (Math.random() < 0.12) {
            spawnExhaustBubble(ai.model.localToWorld(new THREE.Vector3(0.18, 0.68, 1.18)), ai.colorHex);
          }

          // CPU vs Player simple push collision
          const collDist = ai.pos.distanceTo(playerPhysics.pos);
          if (collDist < 1.62) {
            const pushDir = playerPhysics.pos.clone().sub(ai.pos).normalize();
            playerPhysics.velocity.addScaledVector(pushDir, ai.speed * 0.48);
            ai.speed *= 0.65;
            cameraShake = 0.35;
          }

          // CPU vs CPU push collisions
          rivals.forEach((other) => {
            if (other.name === ai.name) return;
            const d = ai.pos.distanceTo(other.pos);
            if (d < 1.62) {
              const p = other.pos.clone().sub(ai.pos).normalize();
              other.pos.addScaledVector(p, 0.18);
              other.speed *= 0.7;
              ai.speed *= 0.7;
            }
          });

          // Crate collisions for CPU AI
          trackItems.forEach((item) => {
            if (!item.active || item.type !== 'crate') return;
            const d = ai.pos.distanceTo(item.pos);
            if (d < item.radius) {
              item.active = false;
              scene.remove(item.mesh);
              ai.spinTimer = 0.6;
            }
          });

          // Laps tracking for CPU AI
          if (ai.splineProgressIndex > 180 && ai.splineProgressIndex < 220) {
            ai.checkpointPassed = true;
          }
          if (ai.splineProgressIndex > 385 && ai.checkpointPassed) {
            ai.checkpointPassed = false;
            ai.lap += 1;
          }
        }
      });

      // --- DYNAMIC LEADERSTAND Standings TRACKINGS ---
      // Calculate standings at every frame
      const standings = [
        { name: 'PLAYER', lap: playerPhysics.lap, progress: playerPhysics.splineProgressIndex, color: '#ff007f' },
        ...rivals.map((ai) => ({
          name: ai.name,
          lap: ai.lap,
          progress: ai.splineProgressIndex,
          color: ai.colorHex === 0xffd166 ? '#ffd166' : ai.colorHex === 0x06b6d4 ? '#06b6d4' : '#10b981',
        })),
      ];

      // Sort racers by: lap * 1000 + progress
      standings.sort((a, b) => {
        const scoreA = a.lap * 2000 + a.progress;
        const scoreB = b.lap * 2000 + b.progress;
        return scoreB - scoreA;
      });

      setLeaderboard(standings.map((r, i) => `${i + 1}. ${r.name} (L${r.lap})`));

      const rankIndex = standings.findIndex((r) => r.name === 'PLAYER');
      const rankings = ['1st', '2nd', '3rd', '4th'];
      setRankText(rankings[rankIndex] || '4th');

      // --- CHASE ENGINE CAMERA VIEW ---
      if (mainKartGroup) {
        // High stretch camera FOV during boosts
        const targetFOV = playerPhysics.boostTimer > 0 ? 82 : 65;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, dt * 5);
        camera.updateProjectionMatrix();

        // Calculate back coordinates offset matching yaw angle
        const backOffset = -4.5;
        const upOffset = 2.1;

        const heading = playerPhysics.angle;
        const idealCamPos = playerPhysics.pos.clone().add(new THREE.Vector3(
          Math.sin(heading) * backOffset,
          upOffset,
          Math.cos(heading) * backOffset
        ));

        // Smooth camera lerp tracking
        camera.position.lerp(idealCamPos, dt * 6.5);
        
        // Target target offset forward
        const targetLook = playerPhysics.pos.clone().add(new THREE.Vector3(
          Math.sin(heading) * 4.5,
          0.8,
          Math.cos(heading) * 4.5
        ));

        // Apply visual screen vibration offset
        if (cameraShake > 0) {
          camera.position.x += (Math.random() - 0.5) * cameraShake;
          camera.position.y += (Math.random() - 0.5) * cameraShake;
        }

        camera.lookAt(targetLook);
      }

      renderer.render(scene, camera);
    }

    animate();

    // 11. KEYBOARD LISTENERS
    const onKeyDown = (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keys.w = true;
      if (code === 'KeyS' || code === 'ArrowDown') keys.s = true;
      if (code === 'KeyA' || code === 'ArrowLeft') keys.a = true;
      if (code === 'KeyD' || code === 'ArrowRight') keys.d = true;
      if (code === 'Space' || code === 'ShiftLeft') keys.space = true;
    };

    const onKeyUp = (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keys.w = false;
      if (code === 'KeyS' || code === 'ArrowDown') keys.s = false;
      if (code === 'KeyA' || code === 'ArrowLeft') keys.a = false;
      if (code === 'KeyD' || code === 'ArrowRight') keys.d = false;
      if (code === 'Space' || code === 'ShiftLeft') keys.space = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Dynamic resize
    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 12. EXPOSED hooks restart/cleanup
    stateRef.current.restart = () => {
      // Clean and reset physics
      playerPhysics = {
        pos: new THREE.Vector3(0, 0, 5),
        angle: Math.PI * 0.9,
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
      };

      setLap(1);
      setScore(0);
      setSpeed(0);
      setLapTimes([]);
      currentLapTimes = [];

      mainKartGroup.position.copy(playerPhysics.pos);
      mainKartGroup.rotation.y = playerPhysics.angle;

      // Re-place AI rivals
      rivals.forEach((ai, idx) => {
        const startSeg = 4;
        const startPt = TRACK_CURVE.getPointAt(startSeg / TOTAL_SPLINE_STEPS);
        const tangent = TRACK_CURVE.getTangentAt(startSeg / TOTAL_SPLINE_STEPS);
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        const aiPos = startPt.clone().addScaledVector(normal, RIVAL_CONFIGS[idx].startOffset);

        ai.pos.copy(aiPos);
        ai.angle = Math.PI * 0.9;
        ai.speed = 0;
        ai.lap = 1;
        ai.checkpointPassed = false;
        ai.splineProgressIndex = startSeg;
        ai.spinTimer = 0;

        ai.model.position.copy(aiPos);
        ai.model.rotation.y = ai.angle;
      });

      // Reset and recreate items
      trackItems.forEach((item) => {
        scene.remove(item.mesh);
      });
      trackItems = [];

      spawnPositions.forEach((sp) => {
        const p = TRACK_CURVE.getPointAt(sp.step / TOTAL_SPLINE_STEPS);
        const tangent = TRACK_CURVE.getTangentAt(sp.step / TOTAL_SPLINE_STEPS);
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        const pos = p.clone().addScaledVector(normal, sp.side);
        pos.y = 0.05;

        let itemMesh;
        if (sp.type === 'zipper') {
          const shape = new THREE.BufferGeometry();
          const pts = [
            new THREE.Vector3(0, 0.02, -0.9),
            new THREE.Vector3(-0.9, 0.02, 0.5),
            new THREE.Vector3(-0.4, 0.02, 0.5),
            new THREE.Vector3(-0.4, 0.02, 0.9),
            new THREE.Vector3(0.4, 0.02, 0.9),
            new THREE.Vector3(0.4, 0.02, 0.5),
            new THREE.Vector3(0.9, 0.02, 0.5)
          ];
          shape.setFromPoints(pts);
          const zipperIndices = [0, 1, 6, 2, 3, 4, 2, 4, 5];
          shape.setIndex(zipperIndices);
          shape.computeVertexNormals();

          const zipMat = new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide });
          itemMesh = new THREE.Mesh(shape, zipMat);
          itemMesh.position.copy(pos);
          itemMesh.lookAt(pos.clone().add(tangent));
          scene.add(itemMesh);
        } else if (sp.type === 'coin') {
          const coinGeo = new THREE.DodecahedronGeometry(0.44, 0);
          const coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd166,
            emissive: 0xffa800,
            emissiveIntensity: 0.35,
            roughness: 0.15,
            metalness: 0.95
          });
          itemMesh = new THREE.Mesh(coinGeo, coinMat);
          itemMesh.position.copy(pos);
          itemMesh.position.y = 0.65;
          scene.add(itemMesh);
        } else if (sp.type === 'crate') {
          const crateGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
          const crateMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.52 });
          itemMesh = new THREE.Mesh(crateGeo, crateMat);
          itemMesh.position.copy(pos);
          itemMesh.position.y = 0.44;
          itemMesh.castShadow = true;
          scene.add(itemMesh);

          const outline = new THREE.LineSegments(
            new THREE.EdgesGeometry(crateGeo),
            new THREE.LineBasicMaterial({ color: 0xffa000, linewidth: 2 })
          );
          itemMesh.add(outline);
        }

        trackItems.push({
          type: sp.type,
          mesh: itemMesh,
          pos: pos,
          radius: sp.type === 'zipper' ? 1.6 : 0.9,
          active: true,
        });
      });

      // Reset particles
      particleSystems.forEach((p) => scene.remove(p.mesh));
      particleSystems = [];

      lapStartTime = clock.getElapsedTime();
      setPhase('playing');
    };

    stateRef.current.cleanup = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);

      // Dispose Three geometries and materials
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });

      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };

    return () => {
      stateRef.current.cleanup?.();
    };
  }, []);

  return (
    <div className="racing-root relative overflow-hidden bg-[#05020c]">
      {/* 3D Canvas Box */}
      <div ref={containerRef} className="racing-container w-full h-full" />

      {/* Main Menu Overlay */}
      {phase === 'menu' && (
        <div className="racing-overlay absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 font-mono text-center px-4">
          <span className="text-xs text-pink-500 tracking-[0.4em]">// 3D_GO_KART_GRAND_PRIX</span>
          <h1 className="text-4xl md:text-6xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 mt-2 mb-4 drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            Kart Racer 3D
          </h1>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md mb-8 text-left text-sm text-gray-300 backdrop-blur-md shadow-2xl">
            <h3 className="text-cyan-400 font-bold mb-2 uppercase tracking-wider">// DRIVER MANUAL</h3>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>STEER: <b className="text-white">A / D</b> or <b className="text-white">← / →</b> keys</li>
              <li>ACCELERATE: <b className="text-white">W</b> or <b className="text-white">↑ Arrow</b></li>
              <li>BRAKE / REVERSE: <b className="text-white">S</b> or <b className="text-white">↓ Arrow</b></li>
              <li>DRIFT: <b className="text-white">SPACEBAR</b> while turning hard at speed</li>
              <li className="text-pink-400">Drift past track edge limits onto grass to avoid wall crash!</li>
              <li className="text-yellow-400">Drive over yellow ZIPPERS for Speed Boosts!</li>
            </ul>
          </div>
          <button
            onClick={(e) => {
              e.currentTarget.blur();
              setPhase('playing');
              stateRef.current.restart?.();
            }}
            className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold tracking-widest uppercase rounded-xl transition-all duration-300 shadow-[0_0_25px_rgba(236,72,153,0.4)] hover:scale-105 active:scale-95"
          >
            ENGAGE ENGINES [SPACE]
          </button>
        </div>
      )}

      {/* Main HUD overlay during gameplay */}
      {phase === 'playing' && (
        <>
          {/* Standing List on left side */}
          <div className="absolute top-6 left-6 flex flex-col gap-2 z-20 font-mono pointer-events-none max-w-xs w-full">
            <div className="bg-black/60 border border-white/10 p-3 rounded-2xl backdrop-blur-md shadow-lg">
              <span className="text-[10px] text-pink-500 font-black tracking-widest block mb-2 uppercase">// RACERS STANDINGS</span>
              <div className="space-y-1 text-sm">
                {leaderboard.map((r, i) => (
                  <div key={i} className={`flex justify-between ${r.includes('PLAYER') ? 'text-pink-400 font-black' : 'text-gray-300'}`}>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Laps time list */}
            {lapTimes.length > 0 && (
              <div className="bg-black/60 border border-white/10 p-3 rounded-2xl backdrop-blur-md text-xs text-cyan-400 space-y-0.5">
                <span className="font-bold text-white uppercase block mb-1 text-[10px] tracking-wider">LAP TIMES</span>
                {lapTimes.map((lt, idx) => (
                  <div key={idx}>Lap {idx + 1}: {lt}s</div>
                ))}
              </div>
            )}
          </div>

          {/* Center/Right Dynamic HUD stats */}
          <div className="absolute top-6 right-6 flex flex-col items-end gap-3 z-20 font-mono pointer-events-none">
            {/* Dynamic Rank Standings badges */}
            <div className="flex items-center gap-2">
              <div className="bg-black/60 border border-pink-500/20 px-5 py-2.5 rounded-2xl backdrop-blur-md shadow-lg text-right">
                <div className="text-[9px] text-pink-400 tracking-wider">CURRENT RANK</div>
                <div className="text-4xl font-black text-white">{rankText}</div>
              </div>

              <div className="bg-black/60 border border-cyan-500/20 px-5 py-2.5 rounded-2xl backdrop-blur-md shadow-lg text-right">
                <div className="text-[9px] text-cyan-400 tracking-wider">LAP</div>
                <div className="text-4xl font-black text-white">{lap}<span className="text-lg text-gray-500">/3</span></div>
              </div>
            </div>

            {/* Speeds and Scores dashboard widgets */}
            <div className="flex gap-2">
              <div className="bg-black/60 border border-white/5 px-4 py-2 rounded-xl backdrop-blur-md text-right text-sm text-yellow-400">
                SCORE: {score}
              </div>
              <div className="bg-black/60 border border-white/5 px-4 py-2 rounded-xl backdrop-blur-md text-right text-sm text-cyan-400">
                SPEED: {speed} KM/H
              </div>
            </div>
          </div>
        </>
      )}

      {/* Finished Standings Podium screen */}
      {phase === 'over' && (
        <div className="racing-gameover absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#06030c]/95 border border-pink-500/30 p-8 md:p-12 rounded-3xl text-center z-30 font-mono shadow-[0_0_60px_rgba(236,72,153,0.2)] max-w-sm w-full">
          <span className="text-[10px] text-pink-500 tracking-[0.4em]">// SESSION_COMPLETED</span>
          <h2 className="text-3xl font-black text-white mt-2 mb-4 uppercase">RACE FINISHED</h2>
          
          <div className="bg-black/40 border border-white/5 p-4 rounded-2xl mb-6 text-left space-y-2 text-sm">
            <div className="text-cyan-400 font-bold uppercase tracking-wider text-xs border-b border-white/10 pb-1.5 mb-1.5">// FINAL PLACEMENTS</div>
            {leaderboard.map((r, i) => (
              <div key={i} className={`flex justify-between ${r.includes('PLAYER') ? 'text-pink-400 font-black text-base' : 'text-gray-400'}`}>
                <span>{r}</span>
              </div>
            ))}
          </div>

          <div className="bg-black/40 border border-white/5 p-4 rounded-xl mb-6 text-center text-yellow-400 uppercase font-black text-sm tracking-widest">
            Total Score: {score}
          </div>
          
          <button
            onClick={(e) => {
              e.currentTarget.blur();
              stateRef.current.restart?.();
            }}
            className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold tracking-widest uppercase rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            RE-ENGAGE ENGINES
          </button>
        </div>
      )}

      <BackButton />
    </div>
  );
}
