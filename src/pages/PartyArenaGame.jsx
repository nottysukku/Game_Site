import React from 'react';
import PartyArenaCore from './PartyArenaCore';
import { PARTY_GAME_CONFIGS } from './partyGamesConfig';

export default function PartyArenaGame({ gameId }) {
  const config = PARTY_GAME_CONFIGS[gameId] || PARTY_GAME_CONFIGS.neontagarena;
  return <PartyArenaCore config={config} />;
}
