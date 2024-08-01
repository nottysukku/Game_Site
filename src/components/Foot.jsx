// components/Foot.jsx
import React from 'react';

function Foot() {
  return (
    <footer className="bg-gray-800 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-lg font-semibold">Connect with me</p>
            <a
              href="https://www.linkedin.com/in/sukrit-chopra-5923a9215/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition duration-300"
            >
              LinkedIn
            </a>
            <a
              href="https://x.com/SukritChopra_03"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 p-2 hover:text-blue-300 transition duration-300"
            >
              Twitter
            </a>
          </div>
          <div className="text-center mb-4 md:mb-0">
            <p>&copy; {new Date().getFullYear()} Sukrit Chopra. All rights reserved.</p>
          </div>
          <div className="text-center">
            <p className="text-sm">Designed with <span className="text-red-500">&hearts;</span> by Sukrit Chopra</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Foot;
