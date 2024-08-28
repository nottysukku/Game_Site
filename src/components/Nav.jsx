import React from 'react';

function Nav({onGamesClick, onContactClick }) {
  return (
    <nav className="flex flex-col gap-2 md:flex-row items-center justify-center md:justify-end space-y-4 md:space-y-0 md:space-x-6 p-4">
      <a href="#" onClick={onGamesClick} className="text-xl md:text-2xl font-bold text-blue-500 active:text-gray-300 hover:text-black transition duration-300">Games Here!</a>
      <a href="#" onClick={onContactClick} className="text-xl md:text-2xl font-bold text-red-500 active:text-gray-300 hover:text-black transition duration-300">Contact Us</a>
      
    </nav>
  );
}

export default Nav;
