import React from 'react';
import './Button1.css';

const Button1 = () => {
  return (
    <div className='w-full h-screen bg-black flex items-center justify-center'>
      <button onClick={()=>{
        window.location.href = 'https://snake-js-vert.vercel.app/';
      }} className="relative left-24 text-glow cursor-pointer px-6 py-2 border border-glow rounded-md bg-transparent text-base font-extrabold tracking-widest shadow-glow animate-border-flicker group transform transition-transform duration-500 hover:scale-105">
        <span className=" float-left -mr-4 text-shadow animate-text-flicker">
          P<span className="faulty-letter animate-faulty-flicker">L</span>AY Snake
        </span>
        <div className="absolute inset-0 opacity-70 blur-md transform translate-y-20 rotate-x-95 scale-y-35 bg-glow pointer-events-none"></div>
        <div className="absolute inset-0 opacity-0 z-[-1] bg-glow shadow-glowHover transition-opacity duration-100 animate-scale-up"></div>
      </button>
      <div onClick={()=>{
        window.location.href = 'https://game-site-orpin.vercel.app/';
      }} className='text-white flex relative right-40 top-56  text-glow cursor-pointer px-6 py-2 border border-glow rounded-md bg-transparent text-base font-extrabold tracking-widest shadow-glow animate-border-flicker group transform transition-transform duration-500 hover:scale-105'>Back Home?</div>
    </div>
  );
}

export default Button1;
