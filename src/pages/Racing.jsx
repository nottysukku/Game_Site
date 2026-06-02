import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './Racing.css';

export default function Racing() {
  const containerRef = useRef(null);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [phase, setPhase] = useState('menu'); // menu | playing | over
  const [finalScore, setFinalScore] = useState(0);
  const stateRef = useRef({});

  useEffect(() => {
    let THREE;
    let scene, camera, renderer, car;
    let obstacles = [], roadMarkings = [];
    let gameStarted = false, gameOver = false;
    let sc = 0, spd = 0;
    let carX = 0;
    const roadWidth = 6;
    const laneWidth = roadWidth / 3;
    const keys = { left: false, right: false };
    let animId;

    async function setup() {
      THREE = await import('three');

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);
      scene.fog = new THREE.FogExp2(0x1a1a2e, 0.012);

      camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
      camera.position.set(0, 3.5, 6);
      camera.lookAt(0, 0, -10);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      containerRef.current.appendChild(renderer.domElement);

      // Lights
      scene.add(new THREE.AmbientLight(0x6666aa, 0.6));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
      dirLight.position.set(10, 20, 10);
      dirLight.castShadow = true;
      scene.add(dirLight);

      // Road
      const roadGeo = new THREE.PlaneGeometry(roadWidth, 300);
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x222233 });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.z = -150;
      road.receiveShadow = true;
      scene.add(road);

      // Road markings
      for (let i = 0; i < 60; i++) {
        const mGeo = new THREE.PlaneGeometry(0.15, 2);
        const mMat = new THREE.MeshBasicMaterial({ color: 0xffd740 });
        [-laneWidth, laneWidth].forEach(x => {
          const m = new THREE.Mesh(mGeo, mMat);
          m.rotation.x = -Math.PI / 2;
          m.position.set(x, 0.01, -i * 5);
          scene.add(m);
          roadMarkings.push(m);
        });
      }

      // Side barriers with neon
      const barrierGeo = new THREE.BoxGeometry(0.3, 0.5, 300);
      const barrierMatL = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x003344, emissiveIntensity: 0.5 });
      const barrierMatR = new THREE.MeshStandardMaterial({ color: 0xff5252, emissive: 0x330011, emissiveIntensity: 0.5 });
      const lBarrier = new THREE.Mesh(barrierGeo, barrierMatL);
      lBarrier.position.set(-roadWidth / 2 - 0.2, 0.25, -150);
      scene.add(lBarrier);
      const rBarrier = new THREE.Mesh(barrierGeo, barrierMatR);
      rBarrier.position.set(roadWidth / 2 + 0.2, 0.25, -150);
      scene.add(rBarrier);

      // Car
      car = new THREE.Group();
      const bodyGeo = new THREE.BoxGeometry(1, 0.5, 1.8);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff5252, metalness: 0.6, roughness: 0.3 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.45;
      body.castShadow = true;
      car.add(body);
      const topGeo = new THREE.BoxGeometry(0.8, 0.35, 0.9);
      const topMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, metalness: 0.5, roughness: 0.3 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(0, 0.85, -0.1);
      car.add(top);
      // Headlights
      const hlGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
      [[-0.35, 0.45, -0.92], [0.35, 0.45, -0.92]].forEach(p => {
        const hl = new THREE.Mesh(hlGeo, hlMat);
        hl.position.set(...p);
        car.add(hl);
        const plght = new THREE.PointLight(0xffffaa, 0.5, 8);
        plght.position.set(...p);
        car.add(plght);
      });
      // Wheels
      const wGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 12);
      const wMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      [[-0.5, 0.18, 0.6], [0.5, 0.18, 0.6], [-0.5, 0.18, -0.6], [0.5, 0.18, -0.6]].forEach(p => {
        const w = new THREE.Mesh(wGeo, wMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(...p);
        car.add(w);
      });
      scene.add(car);

      // Resize handler
      const onResize = () => {
        if (!containerRef.current) return;
        camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      };
      window.addEventListener('resize', onResize);

      stateRef.current.cleanup = () => {
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(animId);
        renderer.dispose();
        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
      };

      animate();
    }

    function createObstacle() {
      const THREE_MOD = THREE;
      const lanes = [-laneWidth, 0, laneWidth];
      const lane = lanes[Math.floor(Math.random() * 3)];
      const colors = [0x00e5ff, 0xffd740, 0xe040fb, 0x69f0ae];
      const geo = new THREE_MOD.BoxGeometry(0.9, 0.8, 1.5);
      const mat = new THREE_MOD.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        metalness: 0.3, roughness: 0.5
      });
      const obs = new THREE_MOD.Mesh(geo, mat);
      obs.position.set(lane, 0.4, -60);
      obs.castShadow = true;
      obstacles.push(obs);
      scene.add(obs);
    }

    function animate() {
      animId = requestAnimationFrame(animate);

      if (gameStarted && !gameOver) {
        spd = Math.min(0.5, spd + 0.0001);
        sc += Math.floor(spd * 100);
        setScore(sc);
        setSpeed(Math.floor(spd * 200));

        // Move markings
        roadMarkings.forEach(m => {
          m.position.z += spd;
          if (m.position.z > 10) m.position.z -= 300;
        });

        // Move / spawn obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
          obstacles[i].position.z += spd;
          if (obstacles[i].position.z > 5) {
            scene.remove(obstacles[i]);
            obstacles.splice(i, 1);
          }
        }
        if (Math.random() < 0.018) createObstacle();

        // Steer
        if (keys.left && carX > -laneWidth) carX -= 0.06;
        if (keys.right && carX < laneWidth) carX += 0.06;
        car.position.x = carX;
        car.rotation.y = (keys.left ? 0.1 : keys.right ? -0.1 : 0);

        // Collision
        for (const obs of obstacles) {
          const dx = Math.abs(car.position.x - obs.position.x);
          const dz = Math.abs(car.position.z - obs.position.z);
          if (dx < 0.85 && dz < 1.2) {
            gameOver = true;
            gameStarted = false;
            setFinalScore(sc);
            setPhase('over');
          }
        }
      }

      renderer.render(scene, camera);
    }

    const onKeyDown = e => {
      if ((e.code === 'Space' || e.code === 'Enter') && !gameStarted && !gameOver) {
        gameStarted = true;
        setPhase('playing');
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    };
    const onKeyUp = e => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    stateRef.current.restart = () => {
      gameOver = false; gameStarted = false;
      sc = 0; spd = 0; carX = 0;
      car.position.x = 0;
      obstacles.forEach(o => scene.remove(o));
      obstacles = [];
      setScore(0); setSpeed(0); setPhase('menu');
    };

    setup();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      stateRef.current.cleanup?.();
    };
  }, []);

  return (
    <div className="racing-root">
      <div ref={containerRef} className="racing-container" />
      {phase === 'menu' && (
        <div className="racing-overlay">
          <h1>🏎️ 3D Racing</h1>
          <p>Use ← / → or A/D to steer</p>
          <p>Press SPACE to start</p>
        </div>
      )}
      {phase === 'playing' && (
        <div className="racing-hud">
          <div className="rhud-item">Score: {score}</div>
          <div className="rhud-item speed">Speed: {speed}</div>
        </div>
      )}
      {phase === 'over' && (
        <div className="racing-gameover">
          <h2>Game Over!</h2>
          <p>Score: {finalScore}</p>
          <button onClick={() => stateRef.current.restart?.()}>Restart</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
