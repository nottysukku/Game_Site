import React, { useState, useCallback, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import BackButton from './BackButton';
import './Chess.css';

/* ─── constants ──────────────────────────────────────────── */
const EMPTY = 0;
const WP = 1, WN = 2, WB = 3, WR = 4, WQ = 5, WK = 6;
const BP = 7, BN = 8, BB = 9, BR = 10, BQ = 11, BK = 12;

const PIECE_CHAR = {
  [WP]: '♙', [WN]: '♘', [WB]: '♗', [WR]: '♖', [WQ]: '♕', [WK]: '♔',
  [BP]: '♟', [BN]: '♞', [BB]: '♝', [BR]: '♜', [BQ]: '♛', [BK]: '♚',
};

const isWhite = (p) => p >= WP && p <= WK;
const isBlack = (p) => p >= BP && p <= BK;
const colorOf = (p) => (p === EMPTY ? null : isWhite(p) ? 'w' : 'b');

/* Piece-square tables */
const PST_PAWN = [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0];
const PST_KNIGHT = [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50];
const PST_BISHOP = [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20];
const PST_ROOK = [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0];
const PST_QUEEN = [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20];
const PST_KING = [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20];

function pstValue(piece, idx) {
  const type = isWhite(piece) ? piece : piece - 6;
  const i = isWhite(piece) ? idx : (7 - Math.floor(idx / 8)) * 8 + (idx % 8);
  switch (type) {
    case WP: return PST_PAWN[i]; case WN: return PST_KNIGHT[i]; case WB: return PST_BISHOP[i];
    case WR: return PST_ROOK[i]; case WQ: return PST_QUEEN[i]; case WK: return PST_KING[i];
    default: return 0;
  }
}

const PIECE_VALUE = { [WP]:100,[WN]:320,[WB]:330,[WR]:500,[WQ]:900,[WK]:20000,[BP]:100,[BN]:320,[BB]:330,[BR]:500,[BQ]:900,[BK]:20000 };

/* ─── initial board ──────────────────────────────────────── */
function initialBoard() {
  return [BR,BN,BB,BQ,BK,BB,BN,BR,BP,BP,BP,BP,BP,BP,BP,BP,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,WP,WP,WP,WP,WP,WP,WP,WP,WR,WN,WB,WQ,WK,WB,WN,WR];
}
function initialCastle() { return { wk: true, wq: true, bk: true, bq: true }; }
function buildSnapshot(board, castle, enPassant, turn, lastMove, moveHistory, capturedByW, capturedByB, status) {
  return {
    board: [...board],
    castle: { ...castle },
    enPassant,
    turn,
    lastMove: lastMove ? { ...lastMove } : null,
    moveHistory: [...moveHistory],
    capturedByW: [...capturedByW],
    capturedByB: [...capturedByB],
    status,
  };
}
function initialSnapshot() {
  const board = initialBoard();
  return buildSnapshot(board, initialCastle(), -1, 'w', null, [], [], [], 'playing');
}

/* ─── move generation ────────────────────────────────────── */
const rc = (i) => [Math.floor(i / 8), i % 8];
const idx = (r, c) => r * 8 + c;
const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

function generateMoves(board, turn, castle, enPassant) {
  const moves = [];
  const mine = turn === 'w' ? isWhite : isBlack;
  const enemy = turn === 'w' ? isBlack : isWhite;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!mine(p)) continue;
    const [r, c] = rc(i);
    const type = isWhite(p) ? p : p - 6;
    if (type === WP) {
      const dir = turn === 'w' ? -1 : 1;
      const startRow = turn === 'w' ? 6 : 1;
      const promoRow = turn === 'w' ? 0 : 7;
      const fr = r + dir;
      if (inBounds(fr, c) && board[idx(fr, c)] === EMPTY) {
        if (fr === promoRow) {
          for (const pp of (turn === 'w' ? [WQ,WR,WB,WN] : [BQ,BR,BB,BN]))
            moves.push({ from: i, to: idx(fr, c), promo: pp });
        } else {
          moves.push({ from: i, to: idx(fr, c) });
          if (r === startRow && board[idx(r + 2 * dir, c)] === EMPTY)
            moves.push({ from: i, to: idx(r + 2 * dir, c), double: true });
        }
      }
      for (const dc of [-1, 1]) {
        if (!inBounds(fr, c + dc)) continue;
        const ti = idx(fr, c + dc);
        if (enemy(board[ti]) || ti === enPassant) {
          if (fr === promoRow) {
            for (const pp of (turn === 'w' ? [WQ,WR,WB,WN] : [BQ,BR,BB,BN]))
              moves.push({ from: i, to: ti, promo: pp, ep: ti === enPassant });
          } else {
            moves.push({ from: i, to: ti, ep: ti === enPassant });
          }
        }
      }
    } else if (type === WN) {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && !mine(board[idx(nr, nc)])) moves.push({ from: i, to: idx(nr, nc) });
      }
    } else if (type === WB || type === WR || type === WQ) {
      const dirs = [];
      if (type === WB || type === WQ) dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
      if (type === WR || type === WQ) dirs.push([-1,0],[1,0],[0,-1],[0,1]);
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
          const ti = idx(nr, nc);
          if (mine(board[ti])) break;
          moves.push({ from: i, to: ti });
          if (enemy(board[ti])) break;
          nr += dr; nc += dc;
        }
      }
    } else if (type === WK) {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && !mine(board[idx(nr, nc)])) moves.push({ from: i, to: idx(nr, nc) });
      }
      if (turn === 'w') {
        if (castle.wk && board[61] === EMPTY && board[62] === EMPTY && board[63] === WR)
          moves.push({ from: i, to: 62, castle: 'wk' });
        if (castle.wq && board[59] === EMPTY && board[58] === EMPTY && board[57] === EMPTY && board[56] === WR)
          moves.push({ from: i, to: 58, castle: 'wq' });
      } else {
        if (castle.bk && board[5] === EMPTY && board[6] === EMPTY && board[7] === BR)
          moves.push({ from: i, to: 6, castle: 'bk' });
        if (castle.bq && board[3] === EMPTY && board[2] === EMPTY && board[1] === EMPTY && board[0] === BR)
          moves.push({ from: i, to: 2, castle: 'bq' });
      }
    }
  }
  return moves;
}

function isSquareAttacked(board, sq, byColor) {
  const attacker = byColor === 'w' ? isWhite : isBlack;
  const [r, c] = rc(sq);
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc)) { const p = board[idx(nr, nc)]; if (attacker(p) && (isWhite(p) ? p : p - 6) === WN) return true; }
  }
  const pawnDir = byColor === 'w' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const pr = r + pawnDir, pc = c + dc;
    if (inBounds(pr, pc)) { const p = board[idx(pr, pc)]; if (attacker(p) && (isWhite(p) ? p : p - 6) === WP) return true; }
  }
  for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc)) { const p = board[idx(nr, nc)]; if (attacker(p) && (isWhite(p) ? p : p - 6) === WK) return true; }
  }
  const slideDirs = [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
  for (let d = 0; d < 8; d++) {
    const [dr, dc] = slideDirs[d];
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[idx(nr, nc)];
      if (p !== EMPTY) {
        if (attacker(p)) {
          const t = isWhite(p) ? p : p - 6;
          if (t === WQ) return true;
          if (d < 4 && t === WB) return true;
          if (d >= 4 && t === WR) return true;
        }
        break;
      }
      nr += dr; nc += dc;
    }
  }
  return false;
}

function findKing(board, color) { return board.indexOf(color === 'w' ? WK : BK); }

function makeMove(board, castle, enPassant, move) {
  const nb = [...board], nc = { ...castle };
  let nep = -1;
  const piece = nb[move.from];
  nb[move.to] = move.promo || piece;
  nb[move.from] = EMPTY;
  if (move.ep) { nb[move.to + (colorOf(piece) === 'w' ? 1 : -1) * 8] = EMPTY; }
  if (move.double) nep = (move.from + move.to) / 2;
  if (move.castle === 'wk') { nb[61] = WR; nb[63] = EMPTY; }
  if (move.castle === 'wq') { nb[59] = WR; nb[56] = EMPTY; }
  if (move.castle === 'bk') { nb[5] = BR; nb[7] = EMPTY; }
  if (move.castle === 'bq') { nb[3] = BR; nb[0] = EMPTY; }
  if (move.from === 60 || move.to === 60) { nc.wk = false; nc.wq = false; }
  if (move.from === 4 || move.to === 4) { nc.bk = false; nc.bq = false; }
  if (move.from === 63 || move.to === 63) nc.wk = false;
  if (move.from === 56 || move.to === 56) nc.wq = false;
  if (move.from === 7 || move.to === 7) nc.bk = false;
  if (move.from === 0 || move.to === 0) nc.bq = false;
  return { board: nb, castle: nc, enPassant: nep };
}

function legalMoves(board, turn, castle, enPassant) {
  const pseudo = generateMoves(board, turn, castle, enPassant);
  const legal = [], opp = turn === 'w' ? 'b' : 'w';
  for (const m of pseudo) {
    if (m.castle) {
      const ki = findKing(board, turn);
      if (isSquareAttacked(board, ki, opp)) continue;
      const between = m.castle.endsWith('k') ? [ki + 1, ki + 2] : [ki - 1, ki - 2];
      if (between.some(sq => isSquareAttacked(board, sq, opp))) continue;
    }
    const { board: nb } = makeMove(board, castle, enPassant, m);
    const kingSq = findKing(nb, turn);
    if (kingSq === -1 || isSquareAttacked(nb, kingSq, opp)) continue;
    legal.push(m);
  }
  return legal;
}

function isInCheck(board, turn) {
  const kingSq = findKing(board, turn);
  return kingSq !== -1 && isSquareAttacked(board, kingSq, turn === 'w' ? 'b' : 'w');
}

/* ─── AI ─────────────────────────────────────────────────── */
function evaluate(board) {
  let s = 0;
  for (let i = 0; i < 64; i++) { const p = board[i]; if (p) { const v = PIECE_VALUE[p] + pstValue(p, i); s += isWhite(p) ? v : -v; } }
  return s;
}

function minimax(board, castle, ep, depth, alpha, beta, max, turn) {
  if (depth === 0) return { score: evaluate(board), move: null };
  const moves = legalMoves(board, turn, castle, ep);
  if (!moves.length) { if (isInCheck(board, turn)) return { score: max ? -99999 : 99999, move: null }; return { score: 0, move: null }; }
  moves.sort((a, b) => (PIECE_VALUE[board[b.to]] || 0) - (PIECE_VALUE[board[a.to]] || 0));
  let best = null;
  if (max) {
    let mx = -Infinity;
    for (const m of moves) {
      const { board: nb, castle: nc, enPassant: ne } = makeMove(board, castle, ep, m);
      const { score } = minimax(nb, nc, ne, depth - 1, alpha, beta, false, 'b');
      if (score > mx) { mx = score; best = m; } alpha = Math.max(alpha, score); if (beta <= alpha) break;
    }
    return { score: mx, move: best };
  } else {
    let mn = Infinity;
    for (const m of moves) {
      const { board: nb, castle: nc, enPassant: ne } = makeMove(board, castle, ep, m);
      const { score } = minimax(nb, nc, ne, depth - 1, alpha, beta, true, 'w');
      if (score < mn) { mn = score; best = m; } beta = Math.min(beta, score); if (beta <= alpha) break;
    }
    return { score: mn, move: best };
  }
}

/* ─── helpers ────────────────────────────────────────────── */
const ANIM_MS = 350;
const ROOM_PREFIX = 'arcadechess_';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode(n = 6) { let s = ''; for (let i = 0; i < n; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }

const DIFFICULTY = [
  { label: 'Beginner', depth: 1 },
  { label: 'Easy', depth: 2 },
  { label: 'Medium', depth: 3 },
  { label: 'Hard', depth: 5 },
];

/* ─── component ──────────────────────────────────────────── */
export default function Chess() {
  /* mode */
  const [mode, setMode] = useState(null);       // null | 'ai' | 'online'
  const [olPhase, setOlPhase] = useState('menu'); // menu | hosting | joining | playing

  /* game state */
  const [board, setBoard] = useState(initialBoard);
  const [castle, setCastle] = useState(initialCastle);
  const [enPassant, setEnPassant] = useState(-1);
  const [turn, setTurn] = useState('w');
  const [selected, setSelected] = useState(null);
  const [legalForSelected, setLegalForSelected] = useState([]);
  const [status, setStatus] = useState('playing');
  const [capturedByW, setCapturedByW] = useState([]);
  const [capturedByB, setCapturedByB] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [promoSquare, setPromoSquare] = useState(null);
  const [history, setHistory] = useState(() => [initialSnapshot()]);
  const [viewIdx, setViewIdx] = useState(0);

  /* player */
  const [playerColor, setPlayerColor] = useState('w');
  const [diffIdx, setDiffIdx] = useState(1);
  const [thinking, setThinking] = useState(false);
  const thinkingRef = useRef(false);

  /* online */
  const peerRef = useRef(null);
  const connRef = useRef(null);
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [peerErr, setPeerErr] = useState('');
  const [oppDisconnected, setOppDisconnected] = useState(false);

  /* animation */
  const [anim, setAnim] = useState(null);

  /* refs for peer callbacks */
  const boardRef = useRef(initialBoard());
  const castleRef = useRef(initialCastle());
  const epRef = useRef(-1);
  const turnRef = useRef('w');
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { castleRef.current = castle; }, [castle]);
  useEffect(() => { epRef.current = enPassant; }, [enPassant]);
  useEffect(() => { turnRef.current = turn; }, [turn]);

  const aiColor = playerColor === 'w' ? 'b' : 'w';
  const isViewingHistory = viewIdx < history.length - 1;

  /* ─── reset ─── */
  const resetGame = useCallback((color) => {
    const c = color || playerColor;
    const freshBoard = initialBoard();
    const freshCastle = initialCastle();
    setPlayerColor(c);
    setBoard(freshBoard); setCastle(freshCastle); setEnPassant(-1); setTurn('w');
    setSelected(null); setLegalForSelected([]); setStatus('playing');
    setCapturedByW([]); setCapturedByB([]);
    setLastMove(null); setMoveHistory([]); setPromoSquare(null);
    setHistory([buildSnapshot(freshBoard, freshCastle, -1, 'w', null, [], [], [], 'playing')]); setViewIdx(0);
    setThinking(false); setAnim(null); thinkingRef.current = false;
    boardRef.current = [...freshBoard]; castleRef.current = { ...freshCastle }; epRef.current = -1; turnRef.current = 'w';
  }, [playerColor]);

  /* ─── apply move (shared by AI, human, and online) ─── */
  const applyMove = useCallback((b, c, ep, move) => {
    const t = colorOf(b[move.from]) || turn;
    const captured = b[move.to];
    const newCapturedByW = [...capturedByW];
    const newCapturedByB = [...capturedByB];
    const { board: nb, castle: nc, enPassant: nep } = makeMove(b, c, ep, move);
    const nextTurn = t === 'w' ? 'b' : 'w';

    if (captured !== EMPTY) {
      if (t === 'w') newCapturedByW.push(captured);
      else newCapturedByB.push(captured);
    }
    if (move.ep) {
      const epP = t === 'w' ? BP : WP;
      if (t === 'w') newCapturedByW.push(epP);
      else newCapturedByB.push(epP);
    }

    /* animation data */
    const a = { movedFrom: move.from, movedTo: move.to };
    if (captured !== EMPTY) { a.capturedAt = move.to; a.capturedPiece = captured; }
    if (move.ep) { a.capturedAt = move.to + (t === 'w' ? 8 : -8); a.capturedPiece = t === 'w' ? BP : WP; }
    if (move.castle === 'wk') { a.rookFrom = 63; a.rookTo = 61; }
    if (move.castle === 'wq') { a.rookFrom = 56; a.rookTo = 59; }
    if (move.castle === 'bk') { a.rookFrom = 7; a.rookTo = 5; }
    if (move.castle === 'bq') { a.rookFrom = 0; a.rookTo = 3; }
    if (move.promo) a.isPromotion = true;
    setAnim(a);
    setTimeout(() => setAnim(null), ANIM_MS + 80);

    setBoard(nb); setCastle(nc); setEnPassant(nep); setTurn(nextTurn);
    setCapturedByW(newCapturedByW); setCapturedByB(newCapturedByB);
    setSelected(null); setLegalForSelected([]);
    boardRef.current = nb; castleRef.current = nc; epRef.current = nep; turnRef.current = nextTurn;

    const newLast = { from: move.from, to: move.to };
    const newMoveHistory = [...moveHistory, move];
    setLastMove(newLast);
    setMoveHistory(newMoveHistory);
    setViewIdx(prev => prev + 1);

    const nl = legalMoves(nb, nextTurn, nc, nep);
    const nextStatus = !nl.length ? (isInCheck(nb, nextTurn) ? 'checkmate' : 'stalemate') : (isInCheck(nb, nextTurn) ? 'check' : 'playing');
    setStatus(nextStatus);
    setHistory(prev => [...prev, buildSnapshot(nb, nc, nep, nextTurn, newLast, newMoveHistory, newCapturedByW, newCapturedByB, nextStatus)]);
  }, [turn, moveHistory, capturedByW, capturedByB]);

  const applyMoveRef = useRef(applyMove);
  applyMoveRef.current = applyMove;

  /* ─── AI effect ─── */
  useEffect(() => {
    if (mode !== 'ai') return;
    if (turn !== aiColor || status === 'checkmate' || status === 'stalemate' || thinkingRef.current) return;
    thinkingRef.current = true; setThinking(true);
    const timer = setTimeout(() => {
      const { move } = minimax(board, castle, enPassant, DIFFICULTY[diffIdx].depth, -Infinity, Infinity, aiColor === 'w', aiColor);
      if (move) applyMove(board, castle, enPassant, move);
      setThinking(false); thinkingRef.current = false;
    }, 50);
    return () => clearTimeout(timer);
  }, [mode, turn, board, castle, enPassant, status, diffIdx, applyMove, aiColor]);

  /* ─── online multiplayer ─── */
  const cleanupPeer = useCallback(() => {
    if (connRef.current) { try { connRef.current.close(); } catch(e){} connRef.current = null; }
    if (peerRef.current) { try { peerRef.current.destroy(); } catch(e){} peerRef.current = null; }
    setConnected(false); setPeerErr(''); setOppDisconnected(false);
  }, []);

  const wireConn = useCallback((conn) => {
    connRef.current = conn;
    conn.on('open', () => { setConnected(true); setOlPhase('playing'); });
    conn.on('data', (data) => {
      if (data.type === 'init') { setPlayerColor(data.hostColor === 'w' ? 'b' : 'w'); setOlPhase('playing'); }
      if (data.type === 'move') { applyMoveRef.current(boardRef.current, castleRef.current, epRef.current, data.move); }
      if (data.type === 'resign') { setStatus('opponent_resigned'); }
      if (data.type === 'rematch') {
        const freshBoard = initialBoard();
        const freshCastle = initialCastle();
        setBoard(freshBoard); setCastle(freshCastle); setEnPassant(-1); setTurn('w');
        setSelected(null); setLegalForSelected([]); setStatus('playing');
        setCapturedByW([]); setCapturedByB([]); setLastMove(null); setMoveHistory([]);
        setPromoSquare(null); setHistory([buildSnapshot(freshBoard, freshCastle, -1, 'w', null, [], [], [], 'playing')]); setViewIdx(0);
        setAnim(null);
        boardRef.current = [...freshBoard]; castleRef.current = { ...freshCastle }; epRef.current = -1; turnRef.current = 'w';
      }
    });
    conn.on('close', () => { setOppDisconnected(true); setConnected(false); });
  }, []);

  const createRoom = () => {
    cleanupPeer();
    const code = genCode();
    setRoomCode(code); setOlPhase('hosting'); setPeerErr('');
    const peer = new Peer(ROOM_PREFIX + code);
    peerRef.current = peer;
    peer.on('error', (err) => setPeerErr(err.type === 'unavailable-id' ? 'Code taken — try again' : `Error: ${err.type}`));
    peer.on('connection', (conn) => {
      wireConn(conn);
      conn.on('open', () => conn.send({ type: 'init', hostColor: playerColor }));
    });
  };

  const joinRoom = () => {
    const code = joinInput.toUpperCase().trim();
    if (code.length < 4) { setPeerErr('Enter a valid room code'); return; }
    cleanupPeer();
    setPeerErr(''); setOlPhase('joining');
    const peer = new Peer();
    peerRef.current = peer;
    peer.on('open', () => {
      const conn = peer.connect(ROOM_PREFIX + code);
      wireConn(conn);
      setRoomCode(code);
    });
    peer.on('error', (err) => { setPeerErr(err.type === 'peer-unavailable' ? 'Room not found' : `Error: ${err.type}`); setOlPhase('menu'); });
  };

  const sendMove = (move) => { if (connRef.current && connected) connRef.current.send({ type: 'move', move }); };
  const sendResign = () => { if (connRef.current && connected) connRef.current.send({ type: 'resign' }); setStatus('you_resigned'); };
  const sendRematch = () => {
    if (connRef.current && connected) connRef.current.send({ type: 'rematch' });
    resetGame(playerColor);
  };

  useEffect(() => { return () => cleanupPeer(); }, [cleanupPeer]);

  /* ─── history nav ─── */
  const goBack = () => setViewIdx(v => Math.max(0, v - 1));
  const goForward = () => setViewIdx(v => Math.min(history.length - 1, v + 1));
  const goToLatest = () => setViewIdx(history.length - 1);
  const openHistoryFromGameOver = () => {
    if (history.length > 1) setViewIdx(history.length - 2);
  };
  const setCurrentToViewedMove = useCallback(() => {
    const snap = history[viewIdx];
    if (!snap) return;

    const trimmedHistory = history.slice(0, viewIdx + 1).map(h => buildSnapshot(
      h.board,
      h.castle,
      h.enPassant,
      h.turn,
      h.lastMove,
      h.moveHistory,
      h.capturedByW,
      h.capturedByB,
      h.status,
    ));

    setBoard([...snap.board]);
    setCastle({ ...snap.castle });
    setEnPassant(snap.enPassant);
    setTurn(snap.turn);
    setSelected(null);
    setLegalForSelected([]);
    setStatus(snap.status);
    setCapturedByW([...snap.capturedByW]);
    setCapturedByB([...snap.capturedByB]);
    setLastMove(snap.lastMove ? { ...snap.lastMove } : null);
    setMoveHistory([...snap.moveHistory]);
    setPromoSquare(null);
    setAnim(null);
    setThinking(false);
    thinkingRef.current = false;
    setHistory(trimmedHistory);
    setViewIdx(trimmedHistory.length - 1);

    boardRef.current = [...snap.board];
    castleRef.current = { ...snap.castle };
    epRef.current = snap.enPassant;
    turnRef.current = snap.turn;
  }, [history, viewIdx]);

  /* ─── click handler ─── */
  const handleSquareClick = (i) => {
    if (isViewingHistory) return;
    if (turn !== playerColor || thinking || status === 'checkmate' || status === 'stalemate' || status === 'opponent_resigned' || status === 'you_resigned') return;
    if (promoSquare) return;
    const piece = board[i];
    if (selected !== null) {
      const move = legalForSelected.find(m => m.to === i);
      if (move) {
        const mp = board[selected];
        const [tr] = rc(i);
        if ((mp === WP && tr === 0) || (mp === BP && tr === 7)) { setPromoSquare({ from: selected, to: i }); return; }
        applyMove(board, castle, enPassant, move);
        if (mode === 'online') sendMove(move);
        return;
      }
      if (colorOf(piece) === playerColor) {
        setSelected(i); setLegalForSelected(legalMoves(board, playerColor, castle, enPassant).filter(m => m.from === i)); return;
      }
      setSelected(null); setLegalForSelected([]); return;
    }
    if (colorOf(piece) === playerColor) {
      setSelected(i); setLegalForSelected(legalMoves(board, playerColor, castle, enPassant).filter(m => m.from === i));
    }
  };

  const handlePromo = (pp) => {
    if (!promoSquare) return;
    const move = { from: promoSquare.from, to: promoSquare.to, promo: pp };
    setPromoSquare(null);
    applyMove(board, castle, enPassant, move);
    if (mode === 'online') sendMove(move);
  };

  const legalTargets = new Set(legalForSelected.map(m => m.to));

  /* ─── RENDER: mode selection ─── */
  if (!mode) {
    return (
      <div className="chess-mode-root">
        <div className="chess-mode-box">
          <h1>♚ Chess</h1>
          <p className="chess-mode-sub">Choose how to play</p>
          <div className="chess-mode-btns">
            <button onClick={() => { setMode('ai'); resetGame('w'); }}>
              <span className="chess-mode-icon">🤖</span>
              <span>Play vs AI</span>
            </button>
            <button onClick={() => { setMode('online'); setOlPhase('menu'); }}>
              <span className="chess-mode-icon">🌐</span>
              <span>Play Online</span>
            </button>
          </div>
        </div>
        <BackButton />
      </div>
    );
  }

  /* ─── RENDER: online lobby ─── */
  if (mode === 'online' && olPhase !== 'playing') {
    return (
      <div className="chess-mode-root">
        <div className="chess-mode-box">
          <h1>🌐 Online Chess</h1>
          {olPhase === 'menu' && (
            <>
              <p className="chess-mode-sub">Play against a friend</p>
              <div className="chess-lobby-side">
                <label>Your color</label>
                <div className="chess-side-btns">
                  <button className={playerColor === 'w' ? 'active' : ''} onClick={() => setPlayerColor('w')}>♔ White</button>
                  <button className={playerColor === 'b' ? 'active' : ''} onClick={() => setPlayerColor('b')}>♚ Black</button>
                </div>
              </div>
              <div className="chess-mode-btns">
                <button onClick={createRoom}><span className="chess-mode-icon">🏠</span><span>Create Room</span></button>
                <button onClick={() => setOlPhase('join_input')}><span className="chess-mode-icon">🔗</span><span>Join Room</span></button>
              </div>
            </>
          )}
          {olPhase === 'join_input' && (
            <div className="chess-join-box">
              <label>Enter Room Code</label>
              <input className="chess-join-input" value={joinInput} onChange={e => setJoinInput(e.target.value.toUpperCase())} maxLength={6} placeholder="ABCDEF" autoFocus />
              <button className="chess-join-btn" onClick={joinRoom}>Join</button>
            </div>
          )}
          {olPhase === 'hosting' && (
            <div className="chess-waiting">
              <p>Room Code:</p>
              <div className="chess-room-code">{roomCode}</div>
              <p className="chess-wait-sub">Share this code with your opponent</p>
              <div className="chess-wait-spinner" />
              <p className="chess-wait-txt">Waiting for opponent…</p>
            </div>
          )}
          {olPhase === 'joining' && (
            <div className="chess-waiting">
              <div className="chess-wait-spinner" />
              <p className="chess-wait-txt">Connecting…</p>
            </div>
          )}
          {peerErr && <p className="chess-peer-err">{peerErr}</p>}
          <button className="chess-lobby-back" onClick={() => { cleanupPeer(); setOlPhase('menu'); setMode(null); }}>← Back</button>
        </div>
        <BackButton />
      </div>
    );
  }

  /* ─── RENDER: game ─── */
  const displayBoard = isViewingHistory ? history[viewIdx].board : board;
  const displayLastMove = isViewingHistory ? history[viewIdx].lastMove : lastMove;
  const displayTurn = isViewingHistory ? history[viewIdx].turn : turn;
  const displayStatus = isViewingHistory ? history[viewIdx].status : status;
  const gameOver = (status === 'checkmate' || status === 'stalemate' || status === 'opponent_resigned' || status === 'you_resigned') && !isViewingHistory;

  let statusText = null;
  if (status === 'check') statusText = <span className="chess-check">Check!</span>;
  else if (status === 'checkmate') statusText = <span className="chess-mate">{turn === playerColor ? '♚ You lost!' : '♔ You win!'}</span>;
  else if (status === 'stalemate') statusText = <span className="chess-stale">Stalemate — Draw!</span>;
  else if (status === 'opponent_resigned') statusText = <span className="chess-mate">♔ Opponent resigned — You win!</span>;
  else if (status === 'you_resigned') statusText = <span className="chess-mate">♚ You resigned</span>;
  else if (thinking) statusText = <span className="chess-thinking">AI thinking…</span>;
  else if (turn === playerColor) statusText = <span className="chess-your-turn">Your turn ({playerColor === 'w' ? 'White' : 'Black'})</span>;
  else statusText = <span className="chess-ai-turn">{mode === 'ai' ? 'AI' : 'Opponent'} turn</span>;

  return (
    <div className="chess-root">
      <div className="chess-sidebar">
        <h1>♚ Chess</h1>

        {mode === 'ai' && (
          <>
            <div className="chess-side">
              <label>Your side</label>
              <div className="chess-side-btns">
                <button className={playerColor === 'w' ? 'active' : ''} onClick={() => resetGame('w')}>White</button>
                <button className={playerColor === 'b' ? 'active' : ''} onClick={() => resetGame('b')}>Black</button>
                <button onClick={() => resetGame(Math.random() < 0.5 ? 'w' : 'b')}>Random</button>
              </div>
            </div>
            <div className="chess-diff">
              <label>AI Difficulty</label>
              <div className="chess-diff-btns">
                {DIFFICULTY.map((d, i) => (
                  <button key={d.label} className={i === diffIdx ? 'active' : ''} onClick={() => { setDiffIdx(i); resetGame(); }}>{d.label}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {mode === 'online' && (
          <div className="chess-online-info">
            <span className="chess-online-badge">{connected ? '🟢 Connected' : oppDisconnected ? '🔴 Disconnected' : '⏳'}</span>
            <span className="chess-room-label">Room: {roomCode}</span>
            <span className="chess-color-label">You: {playerColor === 'w' ? '♔ White' : '♚ Black'}</span>
          </div>
        )}

        <div className="chess-captured">
          <div className="chess-cap-row">
            <span className="chess-cap-label">White captured:</span>
            <span className="chess-cap-pieces">{capturedByW.map((p, i) => <span key={i}>{PIECE_CHAR[p]}</span>)}</span>
          </div>
          <div className="chess-cap-row">
            <span className="chess-cap-label">Black captured:</span>
            <span className="chess-cap-pieces">{capturedByB.map((p, i) => <span key={i}>{PIECE_CHAR[p]}</span>)}</span>
          </div>
        </div>

        <div className="chess-status">{statusText}</div>
        <div className="chess-moves-log"><label>Moves: {moveHistory.length}</label></div>

        <div className="chess-history-nav">
          <button onClick={goBack} disabled={viewIdx === 0}>◀</button>
          <select className="chess-history-select" value={viewIdx} onChange={(e) => setViewIdx(Number(e.target.value))}>
            {history.map((_, i) => <option key={i} value={i}>Move {i}</option>)}
          </select>
          <span>{viewIdx} / {history.length - 1}</span>
          <button onClick={goForward} disabled={viewIdx >= history.length - 1}>▶</button>
          {isViewingHistory && <button className="chess-go-live" onClick={goToLatest}>Live</button>}
          <button className="chess-set-state" onClick={setCurrentToViewedMove} disabled={!isViewingHistory}>Use This Move</button>
        </div>

        {mode === 'online' && !gameOver && connected && (
          <button className="chess-resign-btn" onClick={sendResign}>🏳️ Resign</button>
        )}

        {mode === 'ai' && <button className="chess-reset" onClick={() => resetGame()}>New Game</button>}
        <button className="chess-back-menu" onClick={() => { cleanupPeer(); setMode(null); }}>← Menu</button>
      </div>

      <div className="chess-board-area">
        <div className="chess-board">
          {Array.from({ length: 64 }, (_, di) => {
            const li = playerColor === 'w' ? di : 63 - di;
            const piece = displayBoard[li];
            const dr = Math.floor(di / 8), dc2 = di % 8;
            const isDark = (dr + dc2) % 2 === 1;
            const isLegal = legalTargets.has(li);
            const isSel = selected === li;
            const isLF = displayLastMove?.from === li;
            const isLT = displayLastMove?.to === li;
            const inChk = (displayStatus === 'check' || displayStatus === 'checkmate') && ((piece === WK && displayTurn === 'w') || (piece === BK && displayTurn === 'b'));
            const rl = playerColor === 'w' ? 8 - dr : dr + 1;
            const fl = playerColor === 'w' ? 'abcdefgh'[dc2] : 'abcdefgh'[7 - dc2];

            /* animation offsets */
            const isMainSlide = anim && anim.movedTo === li;
            const isRookSlide = anim && anim.rookTo === li;
            const isCaptGhost = anim && anim.capturedAt === li;

            let animStyle = {}, animCls = '';
            if (isMainSlide || isRookSlide) {
              const fromL = isMainSlide ? anim.movedFrom : anim.rookFrom;
              const toL = isMainSlide ? anim.movedTo : anim.rookTo;
              const fd = playerColor === 'w' ? fromL : 63 - fromL;
              const td = playerColor === 'w' ? toL : 63 - toL;
              animStyle = { '--anim-dx': (fd % 8) - (td % 8), '--anim-dy': Math.floor(fd / 8) - Math.floor(td / 8) };
              animCls = isMainSlide && anim.isPromotion ? 'sliding promoting' : 'sliding';
            }

            return (
              <div key={di}
                className={`chess-sq ${isDark ? 'dark' : 'light'} ${isSel ? 'selected' : ''} ${isLF || isLT ? 'last-move' : ''} ${inChk ? 'in-check' : ''}`}
                onClick={() => handleSquareClick(li)}>
                {dc2 === 0 && <span className="chess-rank-label">{rl}</span>}
                {dr === 7 && <span className="chess-file-label">{fl}</span>}
                {isLegal && <div className={`chess-legal-dot ${piece !== EMPTY ? 'capture' : ''}`} />}
                {isCaptGhost && anim.capturedPiece != null && (
                  <span className={`chess-piece ${isWhite(anim.capturedPiece) ? 'white' : 'black'} capture-ghost`}>{PIECE_CHAR[anim.capturedPiece]}</span>
                )}
                {piece !== EMPTY && (
                  <span className={`chess-piece ${isWhite(piece) ? 'white' : 'black'} ${animCls}`} style={animStyle}>{PIECE_CHAR[piece]}</span>
                )}
              </div>
            );
          })}
        </div>

        {promoSquare && (
          <div className="chess-promo-overlay">
            <div className="chess-promo-dialog">
              <p>Promote to:</p>
              <div className="chess-promo-options">
                {(playerColor === 'w' ? [WQ,WR,WB,WN] : [BQ,BR,BB,BN]).map(pp => (
                  <button key={pp} onClick={() => handlePromo(pp)}>{PIECE_CHAR[pp]}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {gameOver && (
        <div className="chess-game-over">
          <h2>{status === 'checkmate' ? (turn === playerColor ? '♚ You Lost' : '♔ You Win!') : status === 'stalemate' ? '½ Draw' : status === 'opponent_resigned' ? '♔ You Win!' : '♚ You Resigned'}</h2>
          <p>{status === 'checkmate' ? 'Checkmate' : status === 'stalemate' ? 'Stalemate' : 'Resignation'}</p>
          {history.length > 1 && <button onClick={openHistoryFromGameOver}>Browse History</button>}
          {mode === 'ai' && <button onClick={() => resetGame()}>Play Again</button>}
          {mode === 'online' && connected && <button onClick={sendRematch}>Rematch</button>}
          <button onClick={() => { cleanupPeer(); setMode(null); }}>Main Menu</button>
        </div>
      )}

      <BackButton />
    </div>
  );
}
