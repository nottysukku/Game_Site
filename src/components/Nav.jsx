import React from 'react';

function Nav({ onContactClick, onTicTacToeClick, onSnakeClick }) {
  return (
    <nav className="flex flex-col md:flex-row items-center justify-center md:justify-end space-y-4 md:space-y-0 md:space-x-6 p-4">
      <a href="#" onClick={onTicTacToeClick} className="text-xl md:text-2xl font-bold text-gray-100 active:text-gray-300 hover:text-black transition duration-300">Tic Tac Toe</a>
      <a href="#" onClick={onSnakeClick} className="text-xl md:text-2xl font-bold text-gray-100 active:text-gray-300 hover:text-black transition duration-300">Snake</a>
      <a href="#" onClick={onContactClick} className="text-xl md:text-2xl font-bold text-gray-100 active:text-gray-300 hover:text-black transition duration-300">Contact Us</a>
    </nav>
  );
}

export default Nav;
