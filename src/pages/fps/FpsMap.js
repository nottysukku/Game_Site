// src/pages/fps/FpsMap.js
import * as THREE from 'three';
import { createWeaponModel } from './FpsWeapons';

// Builds boundary walls and central courtyard obstacle configurations
export function buildEnvironment(scene, boundingBoxes, MAP_SIZE) {
  const wallH = 6;
  const wallT = 2;
  
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.65,
    metalness: 0.35
  });

  const obstacles = [
    // Outer boundaries
    { x: 0, z: -55, w: 110, d: wallT, h: wallH },
    { x: 0, z: 55, w: 110, d: wallT, h: wallH },
    { x: -55, z: 0, w: wallT, d: 110, h: wallH },
    { x: 55, z: 0, w: wallT, d: 110, h: wallH },

    // Middle core cover walls
    { x: -15, z: -15, w: 6, d: 2, h: 3.5, color: 0x221a36 },
    { x: 15, z: -15, w: 6, d: 2, h: 3.5, color: 0x221a36 },
    { x: -15, z: 15, w: 6, d: 2, h: 3.5, color: 0x221a36 },
    { x: 15, z: 15, w: 6, d: 2, h: 3.5, color: 0x221a36 },
    
    // Concrete dividers
    { x: -22, z: 0, w: 2, d: 12, h: 3.0, color: 0x272235 },
    { x: 22, z: 0, w: 2, d: 12, h: 3.0, color: 0x272235 }
  ];

  obstacles.forEach((obs) => {
    const geom = new THREE.BoxGeometry(obs.w, obs.h, obs.d);
    const mat = obs.color ? new THREE.MeshStandardMaterial({ color: obs.color, roughness: 0.7 }) : wallMat;
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(obs.x, obs.h / 2, obs.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    boundingBoxes.push(box);
  });

  // Build Bomb Site A (Elevated platform with ramps and covers)
  buildSiteA(scene, boundingBoxes);
  
  // Build Bomb Site B (Shipping containers and crates layout)
  buildSiteB(scene, boundingBoxes);

  // Build Scenery details (Trees, Rocks, Fences)
  buildScenery(scene, boundingBoxes);
}

// Bomb Site A: Elevated Concrete platform (15x15) at x=-20, z=-20
function buildSiteA(scene, boundingBoxes) {
  const pColor = 0x334155;
  const pMat = new THREE.MeshStandardMaterial({ color: pColor, roughness: 0.8, metalness: 0.2 });

  // Main platform
  const baseGeom = new THREE.BoxGeometry(15, 1.8, 15);
  const baseMesh = new THREE.Mesh(baseGeom, pMat);
  baseMesh.position.set(-20, 0.9, -20);
  baseMesh.receiveShadow = true;
  baseMesh.castShadow = true;
  scene.add(baseMesh);
  boundingBoxes.push(new THREE.Box3().setFromObject(baseMesh));

  // Glowing Site A sign
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 2.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide })
  );
  marker.rotation.x = Math.PI / 2;
  marker.position.set(-20, 1.81, -20);
  scene.add(marker);

  // Ramps (wooden planks)
  const rampMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.9 });
  const ramp1 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 5), rampMat);
  ramp1.position.set(-20, 0.9, -10);
  ramp1.rotation.x = 0.35; // Slope up
  scene.add(ramp1);

  const ramp2 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 5), rampMat);
  ramp2.position.set(-20, 0.9, -30);
  ramp2.rotation.x = -0.35; // Slope up
  scene.add(ramp2);

  // Cover blocks on platform
  const crateMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
  const crate1 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), crateMat);
  crate1.position.set(-24, 2.8, -24);
  scene.add(crate1);
  boundingBoxes.push(new THREE.Box3().setFromObject(crate1));

  const crate2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), crateMat);
  crate2.position.set(-16, 2.7, -16);
  scene.add(crate2);
  boundingBoxes.push(new THREE.Box3().setFromObject(crate2));
}

// Bomb Site B: Industrial shipping containers at x=20, z=20
function buildSiteB(scene, boundingBoxes) {
  const containerColors = [0x0369a1, 0xb91c1c, 0x15803d];

  const buildContainer = (x, y, z, w, h, d, color, rotY = 0) => {
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.6 });
    const geom = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y + h/2, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    boundingBoxes.push(new THREE.Box3().setFromObject(mesh));
  };

  // Stack of 3 containers forming a defensive maze around B
  buildContainer(20, 0, 20, 10, 4, 4, containerColors[0], 0);
  buildContainer(25, 0, 26, 10, 4, 4, containerColors[1], Math.PI/2);
  buildContainer(20, 4, 20, 10, 4, 4, containerColors[2], 0.25); // Top stacked skewed

  // Center Site B neon marker ring
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 2.5, 32),
    new THREE.MeshBasicMaterial({ color: 0xff00b7, side: THREE.DoubleSide })
  );
  marker.rotation.x = Math.PI / 2;
  marker.position.set(16, 0.01, 16);
  scene.add(marker);

  // Concrete cover barriers
  const bMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  const barrier1 = new THREE.Mesh(new THREE.BoxGeometry(4, 1.8, 1.2), bMat);
  barrier1.position.set(12, 0.9, 16);
  scene.add(barrier1);
  boundingBoxes.push(new THREE.Box3().setFromObject(barrier1));
}

// Spawns natural decorative elements in the central courtyard garden area
function buildScenery(scene, boundingBoxes) {
  // Trees (Spiky cylinders + brown trunks)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.95 });
  const leavesMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.9 });

  const spawnTree = (x, z) => {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 2.2), trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Foliage (double cone)
    const leaves1 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 8), leavesMat);
    leaves1.position.y = 2.8;
    leaves1.castShadow = true;
    treeGroup.add(leaves1);

    const leaves2 = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.8, 8), leavesMat);
    leaves2.position.y = 3.9;
    leaves2.castShadow = true;
    treeGroup.add(leaves2);

    scene.add(treeGroup);

    // Tree collision box around the trunk
    const colBox = new THREE.Box3(
      new THREE.Vector3(x - 0.35, 0, z - 0.35),
      new THREE.Vector3(x + 0.35, 3.5, z + 0.35)
    );
    boundingBoxes.push(colBox);
  };

  // Rocks (Dodecahedrons / lumpy spheres)
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.9 });
  const spawnRock = (x, y, z, scale = 1.0) => {
    const geom = new THREE.DodecahedronGeometry(scale, 1);
    const mesh = new THREE.Mesh(geom, rockMat);
    mesh.position.set(x, y + scale/2, z);
    mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    boundingBoxes.push(new THREE.Box3().setFromObject(mesh));
  };

  // Place trees and rocks in natural non-symmetrical spots in the garden
  spawnTree(-12, 10);
  spawnTree(14, -8);
  spawnTree(-5, -25);
  spawnTree(8, 22);

  spawnRock(-8, 0, -4, 1.4);
  spawnRock(12, 0, 6, 1.1);
  spawnRock(-18, 0, 14, 1.6);
  spawnRock(6, 0, -28, 1.3);

  // Neon Lampposts
  const spawnLamppost = (x, z) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.0), trunkMat);
    pole.position.set(x, 2.5, z);
    scene.add(pole);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
    head.position.set(x, 5.1, z);
    scene.add(head);

    const light = new THREE.PointLight(0x00e5ff, 1.5, 15);
    light.position.set(x, 4.9, z);
    scene.add(light);

    boundingBoxes.push(new THREE.Box3().setFromObject(pole));
  };

  spawnLamppost(-25, 25);
  spawnLamppost(25, -25);
}

// Builds the 8 spawning cabins (houses) and details their interiors
export function buildCabins(scene, boundingBoxes, dummies, CABIN_CONFIGS) {
  const wallH = 5.5;
  const wallT = 0.4;
  const cabinSize = 10;
  const doorW = 3;

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x221a36, roughness: 0.7, metalness: 0.2 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x161226, roughness: 0.8 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 }); // furniture wood
  const bedSheetMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 }); // Blue sheet

  const addFurniture = (cx, cz, doorFace) => {
    // 1. Bed (Box frame + blue sheet + pillow) at the back relative to doorway
    const bedGroup = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 2.5), woodMat);
    frame.position.y = 0.2;
    bedGroup.add(frame);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 2.4), bedSheetMat);
    mattress.position.set(0, 0.4, 0);
    bedGroup.add(mattress);

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
    pillow.position.set(0, 0.52, -0.8);
    bedGroup.add(pillow);

    // Position bed in back corner
    if (doorFace === 'E') bedGroup.position.set(cx - 3.8, 0, cz - 3.2);
    else if (doorFace === 'W') bedGroup.position.set(cx + 3.8, 0, cz + 3.2);
    else if (doorFace === 'S') bedGroup.position.set(cx + 3.2, 0, cz - 3.8);
    else if (doorFace === 'N') bedGroup.position.set(cx - 3.2, 0, cz + 3.8);
    
    scene.add(bedGroup);
    boundingBoxes.push(new THREE.Box3().setFromObject(frame));

    // 2. Small Table (Box top + 4 thin legs)
    const tableGroup = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.2), woodMat);
    top.position.y = 0.8;
    tableGroup.add(top);

    const legGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.8);
    for (let lx of [-0.65, 0.65]) {
      for (let lz of [-0.5, 0.5]) {
        const leg = new THREE.Mesh(legGeom, woodMat);
        leg.position.set(lx, 0.4, lz);
        tableGroup.add(leg);
      }
    }

    if (doorFace === 'E') tableGroup.position.set(cx - 3.8, 0, cz + 3.5);
    else if (doorFace === 'W') tableGroup.position.set(cx + 3.8, 0, cz - 3.5);
    else if (doorFace === 'S') tableGroup.position.set(cx - 3.5, 0, cz - 3.8);
    else if (doorFace === 'N') tableGroup.position.set(cx + 3.5, 0, cz + 3.8);

    scene.add(tableGroup);
    boundingBoxes.push(new THREE.Box3().setFromObject(top));

    // 3. Weapon Rack (Back wooden board + spinning floating gun meshes)
    const rackGroup = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 2.2), woodMat);
    board.position.y = 1.0;
    rackGroup.add(board);

    // Floating Assault Rifle mesh
    const displayRifle = createWeaponModel('ar', 0x00e5ff);
    displayRifle.position.set(0.1, 1.1, 0);
    displayRifle.rotation.y = Math.PI / 2;
    displayRifle.scale.set(1.4, 1.4, 1.4);
    rackGroup.add(displayRifle);

    if (doorFace === 'E') {
      rackGroup.position.set(cx - 4.4, 0, cz);
      rackGroup.rotation.y = 0;
    } else if (doorFace === 'W') {
      rackGroup.position.set(cx + 4.4, 0, cz);
      rackGroup.rotation.y = Math.PI;
    } else if (doorFace === 'S') {
      rackGroup.position.set(cx, 0, cz - 4.4);
      rackGroup.rotation.y = Math.PI / 2;
    } else if (doorFace === 'N') {
      rackGroup.position.set(cx, 0, cz + 4.4);
      rackGroup.rotation.y = -Math.PI / 2;
    }

    scene.add(rackGroup);
    boundingBoxes.push(new THREE.Box3().setFromObject(board));

    // Store rackGroup ref for spinning animation in loops
    return displayRifle;
  };

  const createCabinShell = (cx, cz, doorFace) => {
    // Floor
    const fGeom = new THREE.BoxGeometry(cabinSize, 0.08, cabinSize);
    const fMesh = new THREE.Mesh(fGeom, floorMat);
    fMesh.position.set(cx, -0.04, cz);
    fMesh.receiveShadow = true;
    scene.add(fMesh);

    // Ceiling
    const cGeom = new THREE.BoxGeometry(cabinSize, 0.15, cabinSize);
    const cMesh = new THREE.Mesh(cGeom, floorMat);
    cMesh.position.set(cx, wallH + 0.08, cz);
    cMesh.castShadow = true;
    scene.add(cMesh);

    const addWall = (x, z, w, d) => {
      const wGeom = new THREE.BoxGeometry(w, wallH, d);
      const wMesh = new THREE.Mesh(wGeom, wallMat);
      wMesh.position.set(x, wallH / 2, z);
      wMesh.castShadow = true;
      wMesh.receiveShadow = true;
      scene.add(wMesh);
      
      const wBox = new THREE.Box3().setFromObject(wMesh);
      boundingBoxes.push(wBox);
    };

    const splitW = (cabinSize - doorW) / 2; // 3.5

    // North Wall (z = cz - 5)
    if (doorFace === 'N') {
      addWall(cx - cabinSize/2 + splitW/2, cz - 5, splitW, wallT);
      addWall(cx + cabinSize/2 - splitW/2, cz - 5, splitW, wallT);
    } else {
      addWall(cx, cz - 5, cabinSize, wallT);
    }

    // South Wall (z = cz + 5)
    if (doorFace === 'S') {
      addWall(cx - cabinSize/2 + splitW/2, cz + 5, splitW, wallT);
      addWall(cx + cabinSize/2 - splitW/2, cz + 5, splitW, wallT);
    } else {
      addWall(cx, cz + 5, cabinSize, wallT);
    }

    // West Wall (x = cx - 5)
    if (doorFace === 'W') {
      addWall(cx - 5, cz - cabinSize/2 + splitW/2, wallT, splitW);
      addWall(cx - 5, cz + cabinSize/2 - splitW/2, wallT, splitW);
    } else {
      addWall(cx - 5, cz, wallT, cabinSize);
    }

    // East Wall (x = cx + 5)
    if (doorFace === 'E') {
      addWall(cx + 5, cz - cabinSize/2 + splitW/2, wallT, splitW);
      addWall(cx + 5, cz + cabinSize/2 - splitW/2, wallT, splitW);
    } else {
      addWall(cx + 5, cz, wallT, cabinSize);
    }
  };

  const spinningGunsList = [];

  CABIN_CONFIGS.forEach((cabin) => {
    // 1. Build walls & shell
    createCabinShell(cabin.cx, cabin.cz, cabin.door);

    // 2. Add furniture interior
    const spinRifle = addFurniture(cabin.cx, cabin.cz, cabin.door);
    spinningGunsList.push(spinRifle);

    // 3. Spawns 3 target dummies opposite to doorway
    let relativePts = [];
    if (cabin.door === 'E') {
      relativePts = [{ dx: -3.5, dz: -2 }, { dx: -3.5, dz: 0 }, { dx: -3.5, dz: 2 }];
    } else if (cabin.door === 'W') {
      relativePts = [{ dx: 3.5, dz: -2 }, { dx: 3.5, dz: 0 }, { dx: 3.5, dz: 2 }];
    } else if (cabin.door === 'S') {
      relativePts = [{ dx: -2, dz: -3.5 }, { dx: 0, dz: -3.5 }, { dx: 2, dz: -3.5 }];
    } else if (cabin.door === 'N') {
      relativePts = [{ dx: -2, dz: 3.5 }, { dx: 0, dz: 3.5 }, { dx: 2, dz: 3.5 }];
    }

    relativePts.forEach((pt, dummyIdx) => {
      const dummyX = cabin.cx + pt.dx;
      const dummyZ = cabin.cz + pt.dz;
      const dummyY = 0;

      const dummyGroup = new THREE.Group();
      dummyGroup.position.set(dummyX, dummyY, dummyZ);
      scene.add(dummyGroup);

      // Cylinder Torso (Red)
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 1.1, 12),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 })
      );
      torso.position.y = 0.55;
      torso.castShadow = true;
      torso.receiveShadow = true;
      dummyGroup.add(torso);

      // Head Sphere (White)
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
      );
      head.position.y = 1.22;
      head.castShadow = true;
      head.receiveShadow = true;
      dummyGroup.add(head);

      const dummyBox = new THREE.Box3(
        new THREE.Vector3(dummyX - 0.25, dummyY, dummyZ - 0.25),
        new THREE.Vector3(dummyX + 0.25, dummyY + 1.4, dummyZ + 0.25)
      );

      dummies.push({
        id: `dummy_${cabin.id}_${dummyIdx}`,
        group: dummyGroup,
        torsoMesh: torso,
        headMesh: head,
        box: dummyBox,
        pos: new THREE.Vector3(dummyX, 0.7, dummyZ),
        flashTimer: 0,
        hp: 100
      });
    });
  });

  return spinningGunsList;
}
