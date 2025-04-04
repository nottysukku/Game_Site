import React from 'react';
import './Button.css';

const Button = () => {
const handleClick = () => {
    window.location.href = 'https://tic-tac-toe-bad.vercel.app/';
};

  return (
    <div className='w-full h-screen bg-black flex items-center justify-center'>
      <button 
        className="absolute text-glow cursor-pointer px-6 py-2 border border-glow rounded-md bg-transparent text-base font-extrabold tracking-widest shadow-glow animate-border-flicker group transform transition-transform duration-500 hover:scale-105"
        onClick={handleClick}
      >
        <span className="relative float-left -mr-4 text-shadow animate-text-flicker">
          P<span className="faulty-letter animate-faulty-flicker">L</span>AY Tic Tac Toe
        </span>
        <div className="absolute inset-0 opacity-70 blur-md transform translate-y-20 rotate-x-95 scale-y-35 bg-glow pointer-events-none"></div>
        <div className="absolute inset-0 opacity-0 z-[-1] bg-glow shadow-glowHover transition-opacity duration-100 animate-scale-up"></div>

      </button>
      <div onClick={()=>{
        window.location.href = 'https://gamesite-sc.netlify.app/';
      }} className='text-white flex relative top-56  text-glow cursor-pointer px-6 py-2 border border-glow rounded-md bg-transparent text-base font-extrabold tracking-widest shadow-glow animate-border-flicker group transform transition-transform duration-500 hover:scale-105'>Back Home?</div>
    </div>
  );
}

export default Button;
