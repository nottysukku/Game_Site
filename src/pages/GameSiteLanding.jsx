import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import reactImage from '../assets/github.png';
import boyImage from '../assets/boy.png';
import newImage from '../assets/1269.png_860-removebg-preview.png';
import godofwar from '../assets/cartoongaming2-removebg-preview.png';
import callofduty from '../assets/cartoongaming-removebg-preview.png';
import Nav from '../components/Nav';
import Foot from '../components/Foot';
import Carousel from '../components/Carousel';
import ThreeBg from '../components/ThreeBg';

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

const FuturisticCarouselContainer = ({ children }) => {
  return (
    <div className="relative w-full max-w-7xl mx-auto my-12 z-20">
      {/* Dynamic Cyber Console Background Glow */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/10 to-blue-500/20 rounded-[2rem] opacity-60 blur-2xl"
        animate={{ scale: [1.01, 0.99, 1.01], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative rounded-[2rem] overflow-hidden border border-cyan-500/30 bg-[#07070f]/75 backdrop-blur-md p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        {/* Animated matrix cyber-scanline overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(6,182,212,0.02)_50%,rgba(0,0,0,0)_50%)] bg-[length:100%_4px] pointer-events-none" />
        
        {/* Holographic scanning laser line */}
        <motion.div
          className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/80 to-transparent pointer-events-none z-30"
          initial={{ top: "0%" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* HUD Telemetry Details */}
        <div className="absolute top-3 left-6 hidden md:flex gap-6 font-mono text-[9px] text-cyan-400/40 pointer-events-none">
          <span>SYS_STATUS: OPTIMAL</span>
          <span>FPS: 60 / WebGL_ACTIVE</span>
          <span>SECURE_CHANNELS: ENABLED</span>
        </div>
        <div className="absolute top-3 right-6 hidden md:flex gap-4 font-mono text-[9px] text-purple-400/40 pointer-events-none">
          <span>PLAYSPHERE_OS_v2.4</span>
        </div>

        <div className="relative z-10 pt-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function GameSiteLanding() {
  const footerRef = useRef(null);
  const carouselRef = useRef(null);
  
  // Refs for GSAP animation
  const headerRef = useRef(null);
  const heroGridRef = useRef(null);
  const carouselHeaderRef = useRef(null);
  const quoteRef = useRef(null);

  useEffect(() => {
    // 1. Mount animation on Hero section elements
    const ctx = gsap.context(() => {
      // Header staggers
      gsap.from(".hud-header-item", {
        y: -50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out"
      });

      // Hero Images - Cyber Grid Entrance
      gsap.from(".cyber-hero-card", {
        scale: 0.8,
        opacity: 0,
        y: 40,
        duration: 1,
        stagger: 0.15,
        ease: "back.out(1.4)"
      });

      // 2. ScrollTrigger Scroll animations
      // Carousel section fade-in
      gsap.from(carouselRef.current, {
        scrollTrigger: {
          trigger: carouselRef.current,
          start: "top 80%",
          end: "top 30%",
          toggleActions: "play none none reverse",
        },
        opacity: 0,
        y: 60,
        duration: 1,
        ease: "power2.out"
      });

      // Quote block reveal
      gsap.from(quoteRef.current, {
        scrollTrigger: {
          trigger: quoteRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse"
        },
        opacity: 0,
        scale: 0.95,
        y: 30,
        duration: 0.8,
        ease: "power3.out"
      });
    });

    return () => ctx.revert(); // clean up GSAP on unmount
  }, []);

  const handleReactImageClick = () => {
    window.open('https://github.com/nottysukku', '_blank');
  };

  const handleContactClick = (e) => {
    e.preventDefault();
    if (footerRef.current) {
      footerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGamesClick = (e) => {
    e.preventDefault();
    if (carouselRef.current) {
      carouselRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#020205] text-gray-100 overflow-hidden font-sans">
      {/* 3D WebGL Background Layer */}
      <ThreeBg />

      {/* Futuristic Grid Layer Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)] pointer-events-none z-10" />

      {/* ULTRA-PREMIUM HUD HEADER */}
      <header
        ref={headerRef}
        className="relative z-50 border-b border-cyan-500/20 bg-black/40 backdrop-blur-md px-6 py-4 shadow-[0_4px_30px_rgba(0,255,255,0.03)]"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Pulse Github Avatar Selector */}
          <div className="hud-header-item flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={handleReactImageClick}>
              <div className="absolute inset-0 bg-cyan-400 rounded-full blur-md opacity-40 group-hover:opacity-100 transition-all duration-300 animate-pulse" />
              <img
                src={reactImage}
                alt="react"
                className="relative z-10 w-12 h-12 rounded-full border border-cyan-400/50 group-hover:scale-105 transition-all duration-300"
              />
            </div>
            <div className="font-mono text-left hidden sm:block">
              <p className="text-[10px] text-cyan-400/70 tracking-widest uppercase font-bold">// PROFILE_LINK</p>
              <h4 className="text-xs text-white/90 font-bold group-hover:text-cyan-400">@NOTTYSUKKU</h4>
            </div>
          </div>

          {/* Glitch Styled Title */}
          <div className="hud-header-item text-center">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              PLAYSPHERE
            </h1>
            <p className="font-mono text-[9px] md:text-[10px] text-cyan-400/70 tracking-[0.4em] uppercase mt-1">
              [ DYNAMIC INTERACTIVE CORE v2.4.9 ]
            </p>
          </div>

          <div className="hud-header-item">
            <Nav onContactClick={handleContactClick} onGamesClick={handleGamesClick} />
          </div>
        </div>
      </header>

      {/* HERO SECTION / CHARACTER SELECT PANEL */}
      <main className="relative z-20 max-w-7xl mx-auto px-6 pt-12 pb-8 flex flex-col items-center">
        {/* Section Heading Tag */}
        <div className="font-mono text-[10px] text-purple-400/80 tracking-[0.3em] uppercase bg-purple-950/20 border border-purple-500/20 px-4 py-1.5 rounded-full mb-8 shadow-[0_0_10px_rgba(168,85,247,0.1)] animate-pulse">
          // CHOOSE_YOUR_CHAMPION
        </div>

        {/* Cyber Holographic Grid */}
        <div
          ref={heroGridRef}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl justify-center mb-16"
        >
          {/* Card 1: God of War */}
          <div className="cyber-hero-card relative group rounded-2xl overflow-hidden border border-red-500/30 bg-[#070101]/40 backdrop-blur-sm p-3 transition-all duration-500 hover:scale-105 hover:border-red-500/60 hover:shadow-[0_0_30px_rgba(239,68,68,0.25)]">
            <div className="absolute inset-0 bg-gradient-to-t from-red-950/20 to-transparent pointer-events-none" />
            <img src={godofwar} className="w-full h-auto rounded-xl filter brightness-90 group-hover:brightness-110 transition-all duration-500" alt="god of war" />
            <div className="font-mono text-center mt-3 text-red-400 text-xs tracking-widest uppercase">// WARRIOR_MODEL_01</div>
          </div>

          {/* Card 2: Boy */}
          <div className="cyber-hero-card relative group rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#010707]/40 backdrop-blur-sm p-3 transition-all duration-500 hover:scale-105 hover:border-cyan-500/60 hover:shadow-[0_0_30px_rgba(6,182,212,0.25)]">
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/20 to-transparent pointer-events-none" />
            <img src={boyImage} className="w-full h-auto rounded-xl filter brightness-90 group-hover:brightness-110 transition-all duration-500" alt="boy" />
            <div className="font-mono text-center mt-3 text-cyan-400 text-xs tracking-widest uppercase">// EXPLORER_MODEL_02</div>
          </div>

          {/* Card 3: Cyber Boy */}
          <div className="cyber-hero-card relative group rounded-2xl overflow-hidden border border-yellow-500/30 bg-[#070701]/40 backdrop-blur-sm p-3 transition-all duration-500 hover:scale-105 hover:border-yellow-500/60 hover:shadow-[0_0_30px_rgba(234,179,8,0.25)]">
            <div className="absolute inset-0 bg-gradient-to-t from-yellow-950/20 to-transparent pointer-events-none" />
            <img src={newImage} className="w-full h-auto rounded-xl filter brightness-90 group-hover:brightness-110 transition-all duration-500" alt="new" />
            <div className="font-mono text-center mt-3 text-yellow-500 text-xs tracking-widest uppercase">// AGENT_MODEL_03</div>
          </div>

          {/* Card 4: Call of Duty */}
          <div className="cyber-hero-card relative group rounded-2xl overflow-hidden border border-green-500/30 bg-[#010701]/40 backdrop-blur-sm p-3 transition-all duration-500 hover:scale-105 hover:border-green-500/60 hover:shadow-[0_0_30px_rgba(34,197,94,0.25)]">
            <div className="absolute inset-0 bg-gradient-to-t from-green-950/20 to-transparent pointer-events-none" />
            <img src={callofduty} className="w-full h-auto rounded-xl filter brightness-90 group-hover:brightness-110 transition-all duration-500" alt="call of duty" />
            <div className="font-mono text-center mt-3 text-green-400 text-xs tracking-widest uppercase">// VETERAN_MODEL_04</div>
          </div>
        </div>

        {/* CORE CAROUSEL SECTION */}
        <div ref={carouselRef} className="w-full px-2 md:px-6">
          <div ref={carouselHeaderRef} className="text-center mb-8">
            <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 tracking-wider drop-shadow-md">
              ARCADE PROTOCOLS
            </h2>
            <p className="font-mono text-xs text-cyan-400/60 tracking-[0.3em] uppercase mt-2">
              // SCROLL_LEFT_OR_RIGHT_TO_SELECT_GAME_SECTOR
            </p>
          </div>

          <FuturisticCarouselContainer>
            <Carousel />
          </FuturisticCarouselContainer>
        </div>

        {/* MOTIVATIONAL DIGITAL HUDBLOCK */}
        <div
          ref={quoteRef}
          className="relative z-20 mt-16 mb-24 max-w-4xl w-full text-center px-4"
        >
          {/* Cyber Digital Bracket Encasement */}
          <div className="absolute -top-4 -left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
          <div className="absolute -top-4 -right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
          <div className="absolute -bottom-4 -left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400" />
          <div className="absolute -bottom-4 -right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400" />

          <div className="relative rounded-2xl overflow-hidden border border-cyan-500/10 bg-[#07070f]/40 backdrop-blur-sm p-6 md:p-10 shadow-lg">
            <span className="font-mono text-[9px] text-cyan-400/50 uppercase tracking-[0.4em] block mb-4">
              [ INCOMING TRANSMISSION ]
            </span>
            <p className="text-lg md:text-2xl font-light italic leading-relaxed text-gray-300">
              "Every setback is a setup for a comeback. Embrace challenges as opportunities to grow. With each defeat, learn, adapt, and push harder. Remember, the road to victory is paved with persistence and skill. Keep grinding, and triumph will be yours. <strong className="text-cyan-400 font-bold tracking-widest drop-shadow-[0_0_5px_rgba(6,182,212,0.4)]">GAME ON!</strong>"
            </p>
            <span className="font-mono text-[9px] text-purple-400/50 uppercase tracking-[0.4em] block mt-6">
              // SECTOR_SECURE_OVER
            </span>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <div ref={footerRef}>
        <Foot />
      </div>
    </div>
  );
}
