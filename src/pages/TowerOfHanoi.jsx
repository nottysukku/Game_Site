import React, { useState } from 'react';
import BackButton from './BackButton';
import './TowerOfHanoi.css';

function initPegs(n) { return [Array.from({length:n},(_,i)=>i+1), [], []]; }

export default function TowerOfHanoi() {
  const [diskCount, setDiskCount] = useState(4);
  const [pegs, setPegs] = useState(() => initPegs(4));
  const [selected, setSelected] = useState(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const optimal = (1 << diskCount) - 1;

  const restart = (n) => {
    const count = n || diskCount;
    setDiskCount(count);
    setPegs(initPegs(count));
    setSelected(null);
    setMoves(0);
    setWon(false);
  };

  const handlePegClick = (pegIdx) => {
    if (won) return;
    if (selected === null) {
      if (pegs[pegIdx].length > 0) setSelected(pegIdx);
    } else {
      if (pegIdx === selected) { setSelected(null); return; }
      const fromDisk = pegs[selected][0];
      const toDisk = pegs[pegIdx].length > 0 ? pegs[pegIdx][0] : Infinity;
      if (fromDisk < toDisk) {
        const np = pegs.map(p => [...p]);
        np[pegIdx].unshift(np[selected].shift());
        setPegs(np);
        setMoves(m => m + 1);
        setSelected(null);
        if (np[2].length === diskCount) setWon(true);
      } else {
        setSelected(pegIdx); // re-select if invalid
      }
    }
  };

  const COLORS = ['#ff5252','#ff6e40','#ffd740','#69f0ae','#00e5ff','#448aff','#ce93d8','#f48fb1'];

  return (
    <div className="toh-root">
      <h1>🗼 Tower of Hanoi</h1>
      <div className="toh-hud">
        <span>Moves: <strong>{moves}</strong></span>
        <span>Optimal: <strong>{optimal}</strong></span>
        <div className="toh-disk-sel">
          {[3,4,5,6,7].map(n => (
            <button key={n} className={n === diskCount ? 'active' : ''} onClick={() => restart(n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="toh-board">
        {pegs.map((peg, pi) => (
          <div key={pi} className={`toh-peg ${selected === pi ? 'selected' : ''}`} onClick={() => handlePegClick(pi)}>
            <div className="toh-rod" />
            <div className="toh-disks">
              {peg.map((disk, di) => (
                <div
                  key={disk}
                  className={`toh-disk ${selected === pi && di === 0 ? 'lifting' : ''}`}
                  style={{
                    width: `${30 + disk * 25}px`,
                    background: COLORS[disk - 1],
                    boxShadow: `0 0 10px ${COLORS[disk - 1]}44`,
                  }}
                />
              ))}
            </div>
            <div className="toh-base" />
            <span className="toh-peg-label">{['A','B','C'][pi]}</span>
          </div>
        ))}
      </div>
      {won && (
        <div className="toh-won">
          <h2>🎉 Solved!</h2>
          <p>{moves} moves {moves === optimal ? '(Optimal! 🏆)' : `(Optimal is ${optimal})`}</p>
          <button onClick={() => restart()}>Play Again</button>
        </div>
      )}
      <button className="toh-restart" onClick={() => restart()}>Reset</button>
      <BackButton />
    </div>
  );
}
