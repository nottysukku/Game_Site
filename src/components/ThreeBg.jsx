import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBg() {
  const containerRef = useRef(null);
  const scrollYRef = useRef(0);
  const targetScrollYRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Setup Scene, Camera, Renderer
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scene = new THREE.Scene();

    // Subtle dark cosmic background
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.FogExp2(0x020205, 0.015);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // 2. Create Glowing Particle Galaxy
    const particleCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const color1 = new THREE.Color('#3b82f6'); // Neon Blue
    const color2 = new THREE.Color('#a855f7'); // Neon Purple
    const color3 = new THREE.Color('#06b6d4'); // Neon Cyan

    for (let i = 0; i < particleCount; i++) {
      // Form a beautiful layered galaxy / torus-like shell
      const r = 10 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.6; // slightly flattened
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color distribution based on radius
      let mixedColor = color1.clone();
      if (r < 18) {
        mixedColor.lerp(color3, r / 18);
      } else {
        mixedColor.lerp(color2, (r - 18) / 17);
      }

      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;

      // Dynamic sizing
      sizes[i] = 1.0 + Math.random() * 3.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom shader material for soft glowing round particles
    const material = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Create a circular gradient canvas texture for glowing particles
    const createParticleTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(128, 200, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 16, 16);
      return new THREE.CanvasTexture(canvas);
    };

    material.map = createParticleTexture();

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 3. Create Cybernet Grid Lines (underneath the galaxy)
    const gridGeometry = new THREE.PlaneGeometry(80, 80, 24, 24);
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x1e1e38,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -18;
    scene.add(grid);

    // 4. Interactive Mouse Variables
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      mouseX = (e.clientX - width / 2) / 100;
      mouseY = (e.clientY - height / 2) / 100;
    };

    const handleScroll = () => {
      targetScrollYRef.current = window.scrollY;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    // 5. Animation Loop
    let clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerping
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Camera parallax
      camera.position.x = targetX * 1.5;
      camera.position.y = -targetY * 1.5 + 2;
      camera.lookAt(scene.position);

      // Smooth scroll lerping
      scrollYRef.current += (targetScrollYRef.current - scrollYRef.current) * 0.1;

      // Rotate galaxy organically
      particles.rotation.y = elapsedTime * 0.04 + scrollYRef.current * 0.0008;
      particles.rotation.x = Math.sin(elapsedTime * 0.02) * 0.15 + scrollYRef.current * 0.0003;

      // Animate grid grid underneath
      grid.position.z = (elapsedTime * 1.5) % (80 / 24);
      grid.position.y = -18 + Math.sin(elapsedTime * 0.5) * 0.5;

      renderer.render(scene, camera);
    };

    animate();

    // 6. Resize Handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      gridGeometry.dispose();
      gridMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 w-full h-full -z-20 pointer-events-none overflow-hidden bg-[#020205]"
    />
  );
}
