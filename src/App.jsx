import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';

const GameSiteLanding = lazy(() => import('./pages/GameSiteLanding'));

const Pong = lazy(() => import('./pages/Pong'));
const TicTacToe = lazy(() => import('./pages/TicTacToe'));
const RPS = lazy(() => import('./pages/RPS'));
const Snake = lazy(() => import('./pages/Snake'));
const Racing = lazy(() => import('./pages/Racing'));
const TempleRunner = lazy(() => import('./pages/TempleRunner2'));
const StickFighter = lazy(() => import('./pages/StickFighter'));
const Solitaire = lazy(() => import('./pages/Solitaire'));
const FlappyBird = lazy(() => import('./pages/FlappyBird'));
const Breakout = lazy(() => import('./pages/Breakout'));
const Chess = lazy(() => import('./pages/Chess'));
const TeenPatti = lazy(() => import('./pages/TeenPatti'));
const Rummy = lazy(() => import('./pages/Rummy'));
const GoFish = lazy(() => import('./pages/GoFish'));
const Checkers = lazy(() => import('./pages/Checkers'));
const Minesweeper = lazy(() => import('./pages/Minesweeper'));
const Game2048 = lazy(() => import('./pages/Game2048'));
const Wordle = lazy(() => import('./pages/Wordle'));
const ConnectFour = lazy(() => import('./pages/ConnectFour'));
const Sudoku = lazy(() => import('./pages/Sudoku'));
const MemoryMatch = lazy(() => import('./pages/MemoryMatch'));
const Tetris = lazy(() => import('./pages/Tetris'));
const SpaceInvaders = lazy(() => import('./pages/SpaceInvaders'));
const Hangman = lazy(() => import('./pages/Hangman'));
const TypingTest = lazy(() => import('./pages/TypingTest'));
const WhackAMole = lazy(() => import('./pages/WhackAMole'));
const SimonSays = lazy(() => import('./pages/SimonSays'));
const TowerOfHanoi = lazy(() => import('./pages/TowerOfHanoi'));
const Reversi = lazy(() => import('./pages/Reversi'));
const DoodleJump = lazy(() => import('./pages/DoodleJump'));
const ReactionTest = lazy(() => import('./pages/ReactionTest'));
const GravityGuyRush = lazy(() => import('./pages/GravityGuyRush'));
const PocketTanks3D = lazy(() => import('./pages/PocketTanks3D'));
const NeonTagArena = lazy(() => import('./pages/NeonTagArena'));
const CrystalCometClash = lazy(() => import('./pages/CrystalCometClash'));
const BombRelay3D = lazy(() => import('./pages/BombRelay3D'));
const ZoneControl3D = lazy(() => import('./pages/ZoneControl3D'));
const MeteorMayhem3D = lazy(() => import('./pages/MeteorMayhem3D'));
const QuadDashCircuit = lazy(() => import('./pages/QuadDashCircuit'));
const LaserLootArena = lazy(() => import('./pages/LaserLootArena'));
const CrownRush3D = lazy(() => import('./pages/CrownRush3D'));
const OrbHarvest3D = lazy(() => import('./pages/OrbHarvest3D'));
const HoverBump3D = lazy(() => import('./pages/HoverBump3D'));
const PulsePit3D = lazy(() => import('./pages/PulsePit3D'));
const TurboTotem3D = lazy(() => import('./pages/TurboTotem3D'));
const VaultRaid3D = lazy(() => import('./pages/VaultRaid3D'));
const Badminton = lazy(() => import('./pages/Badminton'));
const SoccerHeads = lazy(() => import('./pages/SoccerHeads'));
const Racing4P = lazy(() => import('./pages/Racing4P'));
const FpsShooter3D = lazy(() => import('./pages/FpsShooter3D'));


function Loader() {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-black text-white">
      <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-xl font-bold tracking-widest text-cyan-400 animate-pulse">LOADING...</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<GameSiteLanding />} />
          <Route path="/pong" element={<Pong />} />
          <Route path="/tictactoe" element={<TicTacToe />} />
          <Route path="/rps" element={<RPS />} />
          <Route path="/snake" element={<Snake />} />
          <Route path="/racing" element={<Racing />} />
          <Route path="/templerunner" element={<TempleRunner />} />
          <Route path="/stickfighter" element={<StickFighter />} />
          <Route path="/solitaire" element={<Solitaire />} />
          <Route path="/flappybird" element={<FlappyBird />} />
          <Route path="/breakout" element={<Breakout />} />
          <Route path="/chess" element={<Chess />} />
          <Route path="/teenpatti" element={<TeenPatti />} />
          <Route path="/rummy" element={<Rummy />} />
          <Route path="/gofish" element={<GoFish />} />
          <Route path="/checkers" element={<Checkers />} />
          <Route path="/minesweeper" element={<Minesweeper />} />
          <Route path="/2048" element={<Game2048 />} />
          <Route path="/wordle" element={<Wordle />} />
          <Route path="/connectfour" element={<ConnectFour />} />
          <Route path="/sudoku" element={<Sudoku />} />
          <Route path="/memorymatch" element={<MemoryMatch />} />
          <Route path="/tetris" element={<Tetris />} />
          <Route path="/spaceinvaders" element={<SpaceInvaders />} />
          <Route path="/hangman" element={<Hangman />} />
          <Route path="/typingtest" element={<TypingTest />} />
          <Route path="/whackamole" element={<WhackAMole />} />
          <Route path="/simonsays" element={<SimonSays />} />
          <Route path="/towerofhanoi" element={<TowerOfHanoi />} />
          <Route path="/reversi" element={<Reversi />} />
          <Route path="/doodlejump" element={<DoodleJump />} />
          <Route path="/reactiontest" element={<ReactionTest />} />
          <Route path="/gravityguyrush" element={<GravityGuyRush />} />
          <Route path="/pockettanks3d" element={<PocketTanks3D />} />
          <Route path="/neontagarena" element={<NeonTagArena />} />
          <Route path="/crystalcometclash" element={<CrystalCometClash />} />
          <Route path="/bombrelay3d" element={<BombRelay3D />} />
          <Route path="/zonecontrol3d" element={<ZoneControl3D />} />
          <Route path="/meteormayhem3d" element={<MeteorMayhem3D />} />
          <Route path="/quaddashcircuit" element={<QuadDashCircuit />} />
          <Route path="/laserlootarena" element={<LaserLootArena />} />
          <Route path="/crownrush3d" element={<CrownRush3D />} />
          <Route path="/orbharvest3d" element={<OrbHarvest3D />} />
          <Route path="/hoverbump3d" element={<HoverBump3D />} />
          <Route path="/pulsepit3d" element={<PulsePit3D />} />
          <Route path="/turbototem3d" element={<TurboTotem3D />} />
          <Route path="/vaultraid3d" element={<VaultRaid3D />} />
          <Route path="/badminton" element={<Badminton />} />
          <Route path="/soccerheads" element={<SoccerHeads />} />
          <Route path="/racing4p" element={<Racing4P />} />
          <Route path="/fps3d" element={<FpsShooter3D />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}