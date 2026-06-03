// src/pages/fps/FpsPhysics.js
import * as THREE from 'three';

// Construct player bounding box and test collision against environment, dummies, and bots
export function testMovementCollision(st, newPos) {
  // Construct player bounding box around proposed position
  // Start position Y is 0.9 (torso centered at y=0.45)
  const pBox = new THREE.Box3(
    newPos.clone().sub(new THREE.Vector3(0.35, 0.9, 0.35)),
    newPos.clone().add(new THREE.Vector3(0.35, 0.9, 0.35))
  );

  // 1. Check boundary obstacles
  for (const box of st.boundingBoxes) {
    if (pBox.intersectsBox(box)) return true;
  }

  // 2. Check target dummies
  for (const dummy of st.dummies) {
    if (pBox.intersectsBox(dummy.box)) return true;
  }

  // 3. Check AI bots
  for (const bot of st.bots) {
    if (!bot.isDead && pBox.intersectsBox(bot.box)) return true;
  }

  return false;
}

// Construct bot bounding box and check collision with environment
export function testBotCollision(pos, boundingBoxes) {
  const bBox = new THREE.Box3(
    pos.clone().sub(new THREE.Vector3(0.35, 0.9, 0.35)),
    pos.clone().add(new THREE.Vector3(0.35, 0.9, 0.35))
  );
  for (const box of boundingBoxes) {
    if (bBox.intersectsBox(box)) return true;
  }
  return false;
}

// Raycasts from shootOrigin along lookDir to check hitscan impacts on players/bots/dummies/walls
export function castPlayerRaycast(st, shootOrigin, lookDir, weaponConfig) {
  const ray = new THREE.Ray(shootOrigin, lookDir);
  let closestHit = null;
  let closestDist = weaponConfig.range || 120;
  let hitType = ''; // 'wall' | 'dummy' | 'bot' | 'opponent'
  let hitObject = null;
  let headshot = false;

  // 1. Check boundary walls
  st.boundingBoxes.forEach((box) => {
    const pt = new THREE.Vector3();
    if (ray.intersectBox(box, pt)) {
      const d = shootOrigin.distanceTo(pt);
      if (d < closestDist) {
        closestDist = d;
        closestHit = pt.clone();
        hitType = 'wall';
        headshot = false;
      }
    }
  });

  // 2. Check target dummies
  st.dummies.forEach((dummy) => {
    const pt = new THREE.Vector3();
    if (ray.intersectBox(dummy.box, pt)) {
      const d = shootOrigin.distanceTo(pt);
      if (d < closestDist) {
        closestDist = d;
        closestHit = pt.clone();
        hitType = 'dummy';
        hitObject = dummy;
        // Head check: Y coordinate of dummy is up to 1.4, head starts at 1.05
        headshot = (pt.y - dummy.group.position.y > 1.05);
      }
    }
  });

  // 3. Check AI bots
  st.bots.forEach((bot) => {
    if (bot.isDead) return;
    const pt = new THREE.Vector3();
    if (ray.intersectBox(bot.box, pt)) {
      const d = shootOrigin.distanceTo(pt);
      if (d < closestDist) {
        closestDist = d;
        closestHit = pt.clone();
        hitType = 'bot';
        hitObject = bot;
        // Head height check: bot torso is up to y=1.4, head starts at 1.33
        headshot = (pt.y - bot.group.position.y > 1.33);
      }
    }
  });

  // 4. Check opponent guest player
  if (st.connected && st.oppMesh && st.oppMesh.visible) {
    const oppCenter = st.oppPos.clone();
    const oppAABB = new THREE.Box3(
      oppCenter.clone().sub(new THREE.Vector3(0.4, 0.9, 0.4)),
      oppCenter.clone().add(new THREE.Vector3(0.4, 0.9, 0.4))
    );
    const pt = new THREE.Vector3();
    if (ray.intersectBox(oppAABB, pt)) {
      const d = shootOrigin.distanceTo(pt);
      if (d < closestDist) {
        closestDist = d;
        closestHit = pt.clone();
        hitType = 'opponent';
        // Opponent head starts at Y offset 1.0
        headshot = (pt.y - oppCenter.y > 0.65);
      }
    }
  }

  return { closestDist, closestHit, hitType, hitObject, headshot };
}
