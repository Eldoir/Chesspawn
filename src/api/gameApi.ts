import axios from 'axios';
import type { GameState } from '../types/game';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export interface ApiGame {
  game_id: string;
  game_data: string; // JSON serialized GameState
}

export async function createGame(gameId: string, state: GameState): Promise<void> {
  await axios.post(`${BASE_URL}/api.php`, {
    action: 'create',
    game_id: gameId,
    game_data: JSON.stringify(state),
  });
}

export async function fetchGame(gameId: string): Promise<GameState | null> {
  const res = await axios.get<{ game_data: string } | { error: string }>(
    `${BASE_URL}/api.php?action=get&game_id=${encodeURIComponent(gameId)}`,
  );
  if ('error' in res.data) return null;
  return JSON.parse(res.data.game_data) as GameState;
}

export async function updateGame(gameId: string, state: GameState): Promise<void> {
  await axios.post(`${BASE_URL}/api.php`, {
    action: 'update',
    game_id: gameId,
    game_data: JSON.stringify(state),
  });
}

export async function checkGameExists(gameId: string): Promise<boolean> {
  const state = await fetchGame(gameId);
  return state !== null;
}

export function generateGameId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
