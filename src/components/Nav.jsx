import React from 'react';

function Nav({ onGamesClick, onContactClick }) {
  return (
    <nav className="flex flex-row items-center gap-6 md:gap-8 justify-end">
      <button
        onClick={onGamesClick}
        className="relative group px-4 py-2 font-mono text-sm tracking-widest text-cyan-400 hover:text-white uppercase transition-colors duration-300"
      >
        <span className="relative z-10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-cyan-400 group-hover:bg-white rounded-full animate-ping" />
          [ SELECT_GAME ]
        </span>
        <span className="absolute inset-0 border border-cyan-500/30 group-hover:border-cyan-400 rounded-md bg-cyan-950/10 group-hover:bg-cyan-950/30 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.1)] group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
      </button>

      <button
        onClick={onContactClick}
        className="relative group px-4 py-2 font-mono text-sm tracking-widest text-purple-400 hover:text-white uppercase transition-colors duration-300"
      >
        <span className="relative z-10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-purple-400 group-hover:bg-white rounded-full animate-pulse" />
          [ INTEL / CONTACT ]
        </span>
        <span className="absolute inset-0 border border-purple-500/30 group-hover:border-purple-400 rounded-md bg-purple-950/10 group-hover:bg-purple-950/30 transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.1)] group-hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]" />
      </button>
    </nav>
  );
}

export default Nav;
