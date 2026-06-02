import React, { useState, useCallback } from 'react';
import BackButton from './BackButton';
import './Hangman.css';

const WORDS = [
  'JAVASCRIPT','PYTHON','ALGORITHM','VARIABLE','FUNCTION','COMPUTER','KEYBOARD','PROGRAM',
  'DATABASE','NETWORK','SECURITY','BROWSER','ELEMENT','LIBRARY','FRAMEWORK','COMPILE',
  'ABSTRACT','BOOLEAN','INTEGER','RECURSION','TERMINAL','DEBUGGER','PROTOCOL','HARDWARE',
  'SOFTWARE','MACHINE','QUANTUM','BINARY','DIGITAL','VIRTUAL','STORAGE','PIPELINE',
  'INTERFACE','COMPONENT','ITERATOR','OVERFLOW','REACTIVE','TEMPLATE','ENCODING','PROCESS',
];

const MAX_WRONG = 7;
const BODY_PARTS = [
  (ctx) => { ctx.beginPath(); ctx.arc(200,80,20,0,Math.PI*2); ctx.stroke(); }, // head
  (ctx) => { ctx.beginPath(); ctx.moveTo(200,100); ctx.lineTo(200,170); ctx.stroke(); }, // body
  (ctx) => { ctx.beginPath(); ctx.moveTo(200,120); ctx.lineTo(160,150); ctx.stroke(); }, // left arm
  (ctx) => { ctx.beginPath(); ctx.moveTo(200,120); ctx.lineTo(240,150); ctx.stroke(); }, // right arm
  (ctx) => { ctx.beginPath(); ctx.moveTo(200,170); ctx.lineTo(170,220); ctx.stroke(); }, // left leg
  (ctx) => { ctx.beginPath(); ctx.moveTo(200,170); ctx.lineTo(230,220); ctx.stroke(); }, // right leg
  (ctx) => { // face
    ctx.beginPath(); ctx.arc(192,76,2,0,Math.PI*2); ctx.fill(); // left eye
    ctx.beginPath(); ctx.arc(208,76,2,0,Math.PI*2); ctx.fill(); // right eye
    ctx.beginPath(); ctx.arc(200,88,6,0.1*Math.PI,0.9*Math.PI); ctx.stroke(); // mouth
  },
];

export default function Hangman() {
  const [word, setWord] = useState(() => WORDS[Math.floor(Math.random()*WORDS.length)]);
  const [guessed, setGuessed] = useState(new Set());
  const [wrong, setWrong] = useState(0);

  const won = word.split('').every(l => guessed.has(l));
  const lost = wrong >= MAX_WRONG;
  const gameOver = won || lost;

  const guess = useCallback((letter) => {
    if (gameOver || guessed.has(letter)) return;
    const ng = new Set(guessed);
    ng.add(letter);
    setGuessed(ng);
    if (!word.includes(letter)) setWrong(w => w + 1);
  }, [gameOver, guessed, word]);

  const restart = () => {
    setWord(WORDS[Math.floor(Math.random()*WORDS.length)]);
    setGuessed(new Set());
    setWrong(0);
  };

  const drawHangman = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,300,260);
    ctx.strokeStyle = '#ffd740';
    ctx.fillStyle = '#ffd740';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    // Gallows
    ctx.beginPath(); ctx.moveTo(40,240); ctx.lineTo(260,240); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(80,240); ctx.lineTo(80,30); ctx.lineTo(200,30); ctx.lineTo(200,60); ctx.stroke();
    // Body parts
    ctx.strokeStyle = lost ? '#ff5252' : '#eee';
    ctx.fillStyle = lost ? '#ff5252' : '#eee';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < wrong; i++) BODY_PARTS[i](ctx);
  };

  return (
    <div className="hm-root">
      <h1>Hangman</h1>
      <canvas ref={drawHangman} width={300} height={260} className="hm-canvas" />
      <div className="hm-word">
        {word.split('').map((l, i) => (
          <span key={i} className={`hm-letter ${guessed.has(l) ? 'revealed' : ''} ${lost && !guessed.has(l) ? 'missed' : ''}`}>
            {guessed.has(l) || lost ? l : '_'}
          </span>
        ))}
      </div>
      <div className="hm-keyboard">
        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
          <button
            key={l}
            className={`hm-key ${guessed.has(l) ? (word.includes(l) ? 'correct' : 'wrong') : ''}`}
            disabled={guessed.has(l) || gameOver}
            onClick={() => guess(l)}
          >{l}</button>
        ))}
      </div>
      <div className="hm-status">
        <span>Wrong: {wrong}/{MAX_WRONG}</span>
        {won && <span className="hm-win">You won! 🎉</span>}
        {lost && <span className="hm-lose">You lost! The word was: {word}</span>}
      </div>
      {gameOver && <button className="hm-restart" onClick={restart}>Play Again</button>}
      <BackButton />
    </div>
  );
}
