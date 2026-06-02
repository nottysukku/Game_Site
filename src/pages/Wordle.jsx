import React, { useState, useCallback, useEffect } from 'react';
import BackButton from './BackButton';
import './Wordle.css';

const WORDS = [
  'ABOUT','ABOVE','ABUSE','ACTOR','ACUTE','ADMIT','ADOPT','ADULT','AFTER','AGAIN',
  'AGENT','AGREE','AHEAD','ALARM','ALBUM','ALERT','ALIEN','ALIGN','ALIVE','ALLOW',
  'ALONE','ALTER','AMONG','ANGER','ANGLE','ANGRY','APART','APPLE','APPLY','ARENA',
  'ARGUE','ARISE','ASIDE','ASSET','AUDIO','AVOID','AWARD','AWARE','BASIC','BASIS',
  'BEACH','BEGIN','BEING','BELOW','BENCH','BIRTH','BLACK','BLADE','BLAME','BLAND',
  'BLANK','BLAST','BLAZE','BLEED','BLEND','BLIND','BLOCK','BLOOD','BLOWN','BOARD',
  'BONUS','BOUND','BRAIN','BRAND','BRAVE','BREAD','BREAK','BREED','BRIEF','BRING',
  'BROAD','BROKE','BROWN','BRUSH','BUILD','BUNCH','BURST','BUYER','CABIN','CARRY',
  'CATCH','CAUSE','CHAIN','CHAIR','CHAOS','CHARM','CHART','CHASE','CHEAP','CHECK',
  'CHEST','CHIEF','CHILD','CHINA','CHUNK','CLAIM','CLASS','CLEAN','CLEAR','CLICK',
  'CLIMB','CLING','CLOCK','CLONE','CLOSE','CLOUD','COACH','COAST','COLOR','COUCH',
  'COUNT','COURT','COVER','CRACK','CRAFT','CRASH','CREAM','CRIME','CROSS','CROWD',
  'CROWN','CRUEL','CRUSH','CURVE','CYCLE','DAILY','DANCE','DEATH','DEBUT','DELAY',
  'DEPTH','DIRTY','DOUBT','DRAFT','DRAIN','DRAMA','DRANK','DRAWN','DREAM','DRESS',
  'DRINK','DRIVE','EAGER','EARLY','EARTH','EIGHT','ELECT','ELITE','EMPTY','ENEMY',
  'ENJOY','ENTER','ENTRY','EQUAL','ERROR','EVENT','EVERY','EXACT','EXERT','EXIST',
  'EXTRA','FAITH','FALSE','FATAL','FAULT','FEAST','FIBER','FIELD','FIGHT','FINAL',
  'FLAME','FLASH','FLEET','FLESH','FLOAT','FLOOD','FLOOR','FLUID','FOCUS','FORCE',
  'FORGE','FORTH','FOUND','FRAME','FRAUD','FRESH','FRONT','FROST','FRUIT','FULLY',
  'GIANT','GIVEN','GLASS','GLOBE','GLOOM','GLORY','GRACE','GRADE','GRAIN','GRAND',
  'GRANT','GRAPH','GRASP','GRASS','GRAVE','GREAT','GREEN','GREET','GRIEF','GROSS',
  'GROUP','GROWN','GUARD','GUESS','GUEST','GUIDE','GUILD','HAPPY','HARSH','HEART',
  'HEAVY','HENCE','HOBBY','HORSE','HOTEL','HOUSE','HUMAN','HUMOR','IDEAL','IMAGE',
  'IMPLY','INDEX','CHINA','INNER','INPUT','ISSUE','IVORY','JAPAN','JEWEL','JOINT',
  'JUDGE','JUICE','KNIFE','KNOWN','LABEL','LARGE','LASER','LATER','LAUGH','LAYER',
  'LEARN','LEASE','LEAVE','LEGAL','LEVEL','LIGHT','LIMIT','LINEN','LIVES','LOCAL',
  'LODGE','LOGIC','LOOSE','LOVER','LOWER','LUCKY','LUNCH','MAGIC','MAJOR','MAKER',
  'MANOR','MARCH','MATCH','MAYBE','MAYOR','MEDAL','MEDIA','MERGE','MERIT','METAL',
  'MIGHT','MINOR','MIXED','MODEL','MONEY','MONTH','MORAL','MOTOR','MOUNT','MOUSE',
  'MOUTH','MOVIE','MUSIC','NAIVE','NERVE','NEVER','NIGHT','NOBLE','NOISE','NORTH',
  'NOTED','NOVEL','NURSE','OCCUR','OCEAN','OFFER','OFTEN','ORDER','OTHER','OUGHT',
  'OUTER','OWNER','PAINT','PANEL','PANIC','PAPER','PARTY','PATCH','PAUSE','PEACE',
  'PENNY','PHASE','PHONE','PHOTO','PIANO','PIECE','PILOT','PITCH','PLACE','PLAIN',
  'PLANE','PLANT','PLATE','PLAZA','PLEAD','POINT','POUND','POWER','PRESS','PRICE',
  'PRIDE','PRIME','PRINT','PRIOR','PRIZE','PROOF','PROUD','PROVE','PUPIL','QUEEN',
  'QUEST','QUICK','QUIET','QUITE','QUOTA','QUOTE','RADAR','RADIO','RAISE','RANGE',
  'RAPID','RATIO','REACH','READY','REALM','REBEL','REIGN','RELAX','REPLY','RIGHT',
  'RIGID','RIVAL','RIVER','ROBOT','ROGER','ROUGH','ROUND','ROUTE','ROYAL','RULER',
  'RURAL','SADLY','SAINT','SALAD','SCALE','SCENE','SCOPE','SCORE','SENSE','SERVE',
  'SEVEN','SHALL','SHAPE','SHARE','SHARP','SHELF','SHELL','SHIFT','SHINE','SHIRT',
  'SHOCK','SHOOT','SHORT','SHOUT','SIGHT','SILLY','SINCE','SIXTH','SIXTY','SIZED',
  'SKILL','SLAVE','SLEEP','SLIDE','SMALL','SMART','SMELL','SMILE','SMOKE','SOLAR',
  'SOLID','SOLVE','SORRY','SOUND','SOUTH','SPACE','SPARE','SPEAK','SPEED','SPEND',
  'SPENT','SPIKE','SPINE','SPLIT','SPOKE','SPORT','SPRAY','SQUAD','STACK','STAFF',
  'STAGE','STAKE','STALE','STAND','STARE','START','STATE','STEAL','STEAM','STEEL',
  'STEEP','STEER','STERN','STICK','STIFF','STILL','STOCK','STONE','STOOD','STORE',
  'STORM','STORY','STRIP','STUCK','STUDY','STUFF','STYLE','SUGAR','SUITE','SUNNY',
  'SUPER','SURGE','SWAMP','SWEAR','SWEET','SWEPT','SWIFT','SWING','SWORD','SWORE',
  'TASTE','TEACH','TEETH','THANK','THEME','THICK','THING','THINK','THIRD','THOSE',
  'THREE','THREW','THROW','THUMB','TIGHT','TIRED','TITLE','TODAY','TOKEN','TOTAL',
  'TOUCH','TOUGH','TOWEL','TOWER','TOXIC','TRACE','TRACK','TRADE','TRAIL','TRAIN',
  'TRAIT','TRASH','TREAT','TREND','TRIAL','TRICK','TRIED','TROOP','TRUCK','TRULY',
  'TRUST','TRUTH','TUMOR','TWICE','TWIST','ULTRA','UNCLE','UNDER','UNION','UNITE',
  'UNITY','UNTIL','UPPER','UPSET','URBAN','USAGE','USUAL','VALID','VALUE','VIDEO',
  'VIGOR','VIRAL','VIRUS','VISIT','VITAL','VIVID','VOCAL','VOICE','VOTER','WASTE',
  'WATCH','WATER','WEAVE','WEIGH','WEIRD','WHEAT','WHERE','WHICH','WHILE','WHITE',
  'WHOLE','WHOSE','WOMAN','WORLD','WORRY','WORSE','WORST','WORTH','WOULD','WOUND',
  'WRITE','WRONG','WROTE','YIELD','YOUNG','YOUTH',
];

const VALID_SET = new Set(WORDS);

export default function Wordle() {
  const [answer, setAnswer] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [guesses, setGuesses] = useState([]);
  const [current, setCurrent] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shake, setShake] = useState(false);
  const [msg, setMsg] = useState('');

  const maxGuesses = 6;

  const getColors = useCallback((guess) => {
    const colors = Array(5).fill('absent');
    const ansArr = answer.split('');
    const guessArr = guess.split('');
    // First pass: correct
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === ansArr[i]) { colors[i] = 'correct'; ansArr[i] = '_'; guessArr[i] = '*'; }
    }
    // Second pass: present
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === '*') continue;
      const idx = ansArr.indexOf(guessArr[i]);
      if (idx !== -1) { colors[i] = 'present'; ansArr[idx] = '_'; }
    }
    return colors;
  }, [answer]);

  const submit = useCallback(() => {
    if (current.length !== 5) return;
    if (!VALID_SET.has(current)) {
      setShake(true); setMsg('Not in word list');
      setTimeout(() => { setShake(false); setMsg(''); }, 600);
      return;
    }
    const ng = [...guesses, current];
    setGuesses(ng); setCurrent('');
    if (current === answer) { setWon(true); setGameOver(true); setMsg('Genius!'); }
    else if (ng.length >= maxGuesses) { setGameOver(true); setMsg(answer); }
  }, [current, guesses, answer]);

  useEffect(() => {
    const handler = (e) => {
      if (gameOver) return;
      if (e.key === 'Enter') { submit(); return; }
      if (e.key === 'Backspace') { setCurrent(c => c.slice(0, -1)); return; }
      if (/^[a-zA-Z]$/.test(e.key) && current.length < 5) {
        setCurrent(c => c + e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameOver, current, submit]);

  const keyboardClick = (key) => {
    if (gameOver) return;
    if (key === 'ENTER') { submit(); return; }
    if (key === '⌫') { setCurrent(c => c.slice(0, -1)); return; }
    if (current.length < 5) setCurrent(c => c + key);
  };

  // Build keyboard colors
  const keyColors = {};
  guesses.forEach(g => {
    const colors = getColors(g);
    g.split('').forEach((ch, i) => {
      const prev = keyColors[ch] || 'unused';
      if (colors[i] === 'correct') keyColors[ch] = 'correct';
      else if (colors[i] === 'present' && prev !== 'correct') keyColors[ch] = 'present';
      else if (prev === 'unused') keyColors[ch] = 'absent';
    });
  });

  const reset = () => {
    setAnswer(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setGuesses([]); setCurrent(''); setGameOver(false); setWon(false); setMsg('');
  };

  const KEYBOARD = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','⌫'],
  ];

  return (
    <div className="wl-root">
      <h1>Wordle</h1>
      {msg && <div className="wl-msg">{msg}</div>}
      <div className="wl-grid">
        {Array.from({ length: maxGuesses }).map((_, ri) => {
          const guess = guesses[ri];
          const isCurrent = ri === guesses.length && !gameOver;
          const word = guess || (isCurrent ? current : '');
          const colors = guess ? getColors(guess) : null;
          return (
            <div key={ri} className={`wl-row ${isCurrent && shake ? 'shake' : ''}`}>
              {Array.from({ length: 5 }).map((_, ci) => (
                <div key={ci} className={`wl-cell ${colors ? colors[ci] : word[ci] ? 'filled' : ''} ${guess ? 'flip' : ''}`}
                  style={guess ? { animationDelay: `${ci * 0.15}s` } : {}}>
                  {word[ci] || ''}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="wl-keyboard">
        {KEYBOARD.map((row, ri) => (
          <div key={ri} className="wl-kb-row">
            {row.map(k => (
              <button key={k} className={`wl-key ${keyColors[k] || ''}`} onClick={() => keyboardClick(k)}>{k}</button>
            ))}
          </div>
        ))}
      </div>
      {gameOver && <button className="wl-again" onClick={reset}>{won ? 'Play Again' : 'New Word'}</button>}
      <BackButton />
    </div>
  );
}
