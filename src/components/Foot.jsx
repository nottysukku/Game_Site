// components/Foot.jsx
import React from 'react';

function Foot() {
  return (
    <footer className="relative bg-[#020205] text-white py-12 overflow-hidden border-t border-purple-500/20 font-mono">
      {/* Laser Scanning Line on Top */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-cyan-500 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>

      <div className="relative z-10 container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-xs uppercase tracking-widest text-cyan-400 mb-2">// INTEL TRANSMISSION</p>
            <div className="flex gap-4 justify-center md:justify-start text-sm">
              <a
                href="https://www.linkedin.com/in/sukrit-chopra-5923a9215/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 flex items-center gap-1"
              >
                <span className="text-[10px] text-cyan-400/60">&lt;</span> LINKEDIN <span className="text-[10px] text-cyan-400/60">&gt;</span>
              </a>
              <a
                href="https://x.com/SukritChopra_03"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-purple-400 transition-colors duration-300 flex items-center gap-1"
              >
                <span className="text-[10px] text-purple-400/60">&lt;</span> TWITTER <span className="text-[10px] text-purple-400/60">&gt;</span>
              </a>
            </div>
          </div>
          
          <div className="text-center text-xs tracking-wider text-gray-500">
            <p>&copy; {new Date().getFullYear()} SUKRIT CHOPRA. ALL CHANNELS SECURED.</p>
          </div>

          <div className="text-center md:text-right">
            <p className="text-xs text-gray-400">
              SYS_BUILT WITH <span className="text-purple-500 animate-ping inline-block">♥</span> BY SUKRIT CHOPRA
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Foot;
