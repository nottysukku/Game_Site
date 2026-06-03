import React from 'react';
import BackButton from './BackButton';
import './SnakesAndLadders.css';

export default function SnakesAndLadders() {
  return (
    <div className="sal-root">
      <BackButton />
      <div className="sal-iframe-container">
        <iframe
          src="/snakes-ladders/index.html"
          title="Snakes and Ladders"
          className="sal-iframe"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
