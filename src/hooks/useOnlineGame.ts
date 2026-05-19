import { useCallback, useEffect, useRef, useState } from 'react';
import type { Color, GameState, PieceType, Square } from '../types/game';
import { useGame } from './useGame';
import { createGame, fetchGame, updateGame, generateGameId } from '../api/gameApi';
import { createInitialGameState } from '../engine/chesspawn';

const POLL_INTERVAL = 1000;

export function useOnlineGame(gameId: string, myColor: Color) {
  const { state, placePiece, makeChessMove, loadState, legalSquares } =
    useGame(createInitialGameState());
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFenRef = useRef<string>('');
  const isMyTurn = useCallback(
    (s: GameState) => {
      if (s.phase === 'draft') return s.draftTurn === myColor;
      if (s.phase === 'chess' && s.chessFen) {
        const turn = s.chessFen.split(' ')[1] as Color;
        return turn === myColor;
      }
      return false;
    },
    [myColor],
  );

  // Initial fetch
  useEffect(() => {
    fetchGame(gameId).then((s) => {
      if (s) loadState(s);
    });
  }, [gameId, loadState]);

  // Polling: only fetch when it's NOT our turn
  useEffect(() => {
    if (state.phase === 'finished') return;

    const interval = setInterval(async () => {
      if (isMyTurn(state)) return; // wait for us to move
      try {
        const remote = await fetchGame(gameId);
        if (!remote) return;
        const fingerprint =
          JSON.stringify(remote.chessMoves) + remote.chessFen + remote.draftHistory.length;
        if (fingerprint !== lastFenRef.current) {
          lastFenRef.current = fingerprint;
          loadState(remote);
        }
      } catch {
        // network error — silent
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [state, gameId, isMyTurn, loadState]);

  const doPlacePiece = useCallback(
    async (pieceType: PieceType, square: Square) => {
      if (!isMyTurn(state)) return;
      placePiece(pieceType, square);
    },
    [state, isMyTurn, placePiece],
  );

  // After any state change that was our action, push to backend
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;

    setSyncing(true);
    updateGame(gameId, state)
      .catch(() => setError('Sync failed'))
      .finally(() => setSyncing(false));
  }, [state, gameId]);

  const doMakeMove = useCallback(
    (san: string) => {
      if (!isMyTurn(state)) return;
      makeChessMove(san);
    },
    [state, isMyTurn, makeChessMove],
  );

  return {
    state,
    placePiece: doPlacePiece,
    makeChessMove: doMakeMove,
    legalSquares,
    syncing,
    error,
    isMyTurn: isMyTurn(state),
    myColor,
  };
}

export { generateGameId, createGame };
