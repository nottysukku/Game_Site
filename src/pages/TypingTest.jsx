import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from './BackButton';
import './TypingTest.css';

const TEXTS = [
  "The quick brown fox jumps over the lazy dog and runs across the field at sunset.",
  "Programming is the art of telling a computer what to do in a language it understands.",
  "In the middle of difficulty lies opportunity, and every challenge is a stepping stone.",
  "Technology is best when it brings people together and makes the world a smaller place.",
  "A journey of a thousand miles begins with a single step and endless determination.",
  "The only way to do great work is to love what you do and never stop learning new things.",
  "Science fiction of today is the science fact of tomorrow if we dare to dream bigger.",
  "Success is not final and failure is not fatal, it is the courage to continue that counts.",
];

export default function TypingTest() {
  const [text, setText] = useState('');
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [errors, setErrors] = useState(0);
  const [duration, setDuration] = useState(30);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const start = useCallback(() => {
    const t = TEXTS[Math.floor(Math.random() * TEXTS.length)];
    setText(t);
    setInput('');
    setStarted(true);
    setFinished(false);
    setStartTime(Date.now());
    setElapsed(0);
    setErrors(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (!started || finished) return;
    timerRef.current = setInterval(() => {
      const e = (Date.now() - startTime) / 1000;
      setElapsed(e);
      if (e >= duration) {
        setFinished(true);
        clearInterval(timerRef.current);
      }
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [started, finished, startTime, duration]);

  const handleInput = (e) => {
    if (finished) return;
    const val = e.target.value;
    // Count new errors
    if (val.length > input.length) {
      const lastChar = val[val.length - 1];
      if (lastChar !== text[val.length - 1]) setErrors(err => err + 1);
    }
    setInput(val);
    if (val === text) {
      setFinished(true);
      clearInterval(timerRef.current);
    }
  };

  const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
  const timeUsed = finished ? (input === text ? (Date.now() - startTime) / 1000 : elapsed) : elapsed;
  const wpm = timeUsed > 0 ? Math.round((wordCount / timeUsed) * 60) : 0;
  const accuracy = input.length > 0 ? Math.max(0, Math.round(((input.length - errors) / input.length) * 100)) : 100;
  const remaining = Math.max(0, duration - Math.floor(elapsed));

  const restart = () => { setStarted(false); setFinished(false); setInput(''); clearInterval(timerRef.current); };

  return (
    <div className="tt-root">
      <h1>⌨️ Typing Test</h1>
      {!started ? (
        <div className="tt-start-box">
          <p>Test your typing speed!</p>
          <div className="tt-dur-btns">
            {[15, 30, 60].map(d => (
              <button key={d} className={d === duration ? 'active' : ''} onClick={() => setDuration(d)}>{d}s</button>
            ))}
          </div>
          <button className="tt-start-btn" onClick={start}>Start</button>
        </div>
      ) : (
        <div className="tt-game">
          <div className="tt-hud">
            <span className="tt-timer">{remaining}s</span>
            <span>WPM: <strong>{wpm}</strong></span>
            <span>Accuracy: <strong>{accuracy}%</strong></span>
            <span>Errors: <strong>{errors}</strong></span>
          </div>
          <div className="tt-text">
            {text.split('').map((ch, i) => {
              let cls = '';
              if (i < input.length) cls = input[i] === ch ? 'correct' : 'wrong';
              else if (i === input.length) cls = 'cursor';
              return <span key={i} className={`tt-char ${cls}`}>{ch}</span>;
            })}
          </div>
          <textarea
            ref={inputRef}
            className="tt-input"
            value={input}
            onChange={handleInput}
            disabled={finished}
            placeholder="Start typing here..."
            spellCheck={false}
            autoComplete="off"
          />
          {finished && (
            <div className="tt-results">
              <h2>Results</h2>
              <div className="tt-res-grid">
                <div className="tt-res-item"><span className="tt-res-val">{wpm}</span><span>WPM</span></div>
                <div className="tt-res-item"><span className="tt-res-val">{accuracy}%</span><span>Accuracy</span></div>
                <div className="tt-res-item"><span className="tt-res-val">{errors}</span><span>Errors</span></div>
                <div className="tt-res-item"><span className="tt-res-val">{Math.round(timeUsed)}s</span><span>Time</span></div>
              </div>
              <button className="tt-start-btn" onClick={restart}>Try Again</button>
            </div>
          )}
        </div>
      )}
      <BackButton />
    </div>
  );
}
