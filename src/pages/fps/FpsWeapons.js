// src/pages/fps/FpsWeapons.js
import * as THREE from 'three';

export const WEAPONS = {
  ar: {
    id: 'ar',
    name: 'Assault Rifle',
    fireRate: 0.13, // 130ms cooldown
    damage: 28,
    ammoMax: 30,
    reserveMax: 90,
    recoil: 0.022,
    spread: 0.02,
    range: 120,
    isAutomatic: true,
    hasScope: false,
    soundPitch: 800,
    soundDuration: 0.12,
  },
  smg: {
    id: 'smg',
    name: 'SMG',
    fireRate: 0.08, // 80ms cooldown
    damage: 18,
    ammoMax: 40,
    reserveMax: 120,
    recoil: 0.012,
    spread: 0.045,
    range: 60,
    isAutomatic: true,
    hasScope: false,
    soundPitch: 950,
    soundDuration: 0.08,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    fireRate: 0.85, // 850ms cooldown
    damage: 15, // per pellet
    pellets: 8,
    ammoMax: 7,
    reserveMax: 21,
    recoil: 0.08,
    spread: 0.14, // wide cone
    range: 25,
    isAutomatic: false,
    hasScope: false,
    soundPitch: 450,
    soundDuration: 0.22,
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper Rifle',
    fireRate: 1.4, // 1400ms cooldown
    damage: 110, // one shot kill torso/head
    ammoMax: 5,
    reserveMax: 15,
    recoil: 0.12,
    spread: 0.002, // perfect accuracy unscoped (or maybe scoped?)
    range: 200,
    isAutomatic: false,
    hasScope: true,
    soundPitch: 300,
    soundDuration: 0.35,
  },
  pistol: {
    id: 'pistol',
    name: 'Pistol',
    fireRate: 0.25, // 250ms cooldown
    damage: 24,
    ammoMax: 12,
    reserveMax: 36,
    recoil: 0.018,
    spread: 0.015,
    range: 45,
    isAutomatic: false,
    hasScope: false,
    soundPitch: 700,
    soundDuration: 0.15,
  }
};

// Procedural 3D Weapon Mesh Generator in Three.js
export function createWeaponModel(type, teamColor = 0x00e5ff) {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.85, roughness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });
  const glowMat = new THREE.MeshBasicMaterial({ color: teamColor });

  if (type === 'ar') {
    // Assault Rifle: Longer barrel, handguard, magazine
    // Barrel
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.42), metalMat);
    barrel.position.z = -0.18;
    group.add(barrel);
    
    // Handguard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.22), darkMat);
    guard.position.z = -0.12;
    group.add(guard);

    // Magazine (Curved box)
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.05), darkMat);
    mag.position.set(0, -0.08, -0.1);
    mag.rotation.x = -0.25;
    group.add(mag);

    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.15), darkMat);
    stock.position.set(0, -0.01, 0.08);
    group.add(stock);

    // Laser core strip
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.015, 0.28), glowMat);
    strip.position.set(0, 0.022, -0.16);
    group.add(strip);
  }
  else if (type === 'smg') {
    // SMG: Compact, double barrel or short boxy shape
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.22), metalMat);
    body.position.z = -0.06;
    group.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.2);
    group.add(barrel);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.15, 0.035), darkMat);
    mag.position.set(0, -0.1, -0.06);
    group.add(mag);

    // Small laser emitter
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.12), glowMat);
    strip.position.set(0, 0.032, -0.1);
    group.add(strip);
  }
  else if (type === 'shotgun') {
    // Shotgun: Heavy dual cylindrical barrels
    const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.38), metalMat);
    barrel1.rotation.x = Math.PI / 2;
    barrel1.position.set(-0.018, 0, -0.16);
    group.add(barrel1);

    const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.38), metalMat);
    barrel2.rotation.x = Math.PI / 2;
    barrel2.position.set(0.018, 0, -0.16);
    group.add(barrel2);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.2), darkMat);
    stock.position.set(0, -0.02, 0.08);
    group.add(stock);

    // Dual laser strips
    const strip1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.25), glowMat);
    strip1.position.set(-0.018, 0.022, -0.14);
    group.add(strip1);

    const strip2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.25), glowMat);
    strip2.position.set(0.018, 0.022, -0.14);
    group.add(strip2);
  }
  else if (type === 'sniper') {
    // Sniper: Long thin barrel, huge scope on top
    // Main Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.065, 0.3), darkMat);
    body.position.z = -0.05;
    group.add(body);

    // Extremely long barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.65), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.008, -0.42);
    group.add(barrel);

    // Scope Cylinder
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.16), darkMat);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.065, -0.08);
    group.add(scope);

    // Scope mounts
    const mount1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.035, 0.015), darkMat);
    mount1.position.set(0, 0.04, -0.13);
    group.add(mount1);
    const mount2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.035, 0.015), darkMat);
    mount2.position.set(0, 0.04, -0.03);
    group.add(mount2);

    // Neon highlight strip
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.4), glowMat);
    strip.position.set(0, -0.026, -0.22);
    group.add(strip);
  }
  else if (type === 'pistol') {
    // Pistol: Light compact handgun
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.035, 0.18), metalMat);
    slide.position.set(0, 0.01, -0.05);
    group.add(slide);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.09, 0.035), darkMat);
    grip.position.set(0, -0.045, -0.02);
    grip.rotation.x = -0.25;
    group.add(grip);

    // Tiny laser dot generator
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.05), glowMat);
    dot.position.set(0, 0.028, -0.1);
    group.add(dot);
  }

  // Gun grip handle (reusable grip for weapon anchor)
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.11, 0.035), darkMat);
  handle.position.set(0, -0.07, -0.03);
  handle.rotation.x = -0.2;
  group.add(handle);

  return group;
}
