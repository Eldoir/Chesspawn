import { useCallback, useReducer } from 'react';
import { Chess } from 'chess.js';
import type { Color, GameState, PieceType, Square } from '../types/game';
import {
  createInitialGameState,
  getLegalPlacementSquares,
  isKingBlocked,
  buildChessFromPlacements,
} from '../engine/chesspawn';

type Action =
  | { type: 'PLACE_PIECE'; pieceType: PieceType; square: Square }
  | { type: 'CHESS_MOVE'; san: string }
  | { type: 'LOAD_STATE'; state: GameState };

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.state;

    case 'PLACE_PIECE': {
      if (state.phase !== 'draft') return state;

      const color = state.draftTurn;
      const { pieceType, square } = action;

      // Validate pool
      const pool = [...state.pool[color]];
      const idx = pool.indexOf(pieceType);
      if (idx === -1 && pieceType !== 'k') return state;
      if (pieceType !== 'k') pool.splice(idx, 1);

      // Validate square
      const legal = getLegalPlacementSquares(state, pieceType);
      if (!legal.includes(square)) return state;

      const newPlacements = [...state.placements, { square, piece: { type: pieceType, color } }];

      const newKingPlaced = { ...state.kingPlaced };
      if (pieceType === 'k') newKingPlaced[color] = true;

      const newDraftHistory = [
        ...state.draftHistory,
        { color, piece: { type: pieceType, color }, square },
      ];

      const nextColor: Color = color === 'w' ? 'b' : 'w';

      const newState: GameState = {
        ...state,
        pool: { ...state.pool, [color]: pool },
        placements: newPlacements,
        draftHistory: newDraftHistory,
        kingPlaced: newKingPlaced,
        draftTurn: nextColor,
        lastMoveFrom: null,
        lastMoveTo: square,
      };

      // After placing king, check if the next player is blocked
      if (pieceType === 'k') {
        // Both kings placed → transition to chess phase
        if (newKingPlaced.w && newKingPlaced.b) {
          const chess = buildChessFromPlacements(newPlacements);
          return {
            ...newState,
            phase: 'chess',
            chessFen: chess.fen(),
            draftTurn: 'w',
          };
        }

        // Next player must place their king now — check if they're blocked
        if (isKingBlocked(newState)) {
          return {
            ...newState,
            phase: 'finished',
            winner: color, // the player who placed their king wins
            endReason: 'king-blocked',
          };
        }
      } else {
        // After a non-king placement, check if the next player will be forced
        // to place their king and is blocked (only relevant if pools are empty)
        const nextPool = newState.pool[nextColor];
        const nextKingPlaced = newState.kingPlaced[nextColor];
        if (!nextKingPlaced && nextPool.length === 0) {
          // Next player must place king — check if blocked
          if (isKingBlocked(newState)) {
            return {
              ...newState,
              phase: 'finished',
              winner: color,
              endReason: 'king-blocked',
            };
          }
        }
      }

      return newState;
    }

    case 'CHESS_MOVE': {
      if (state.phase !== 'chess' || !state.chessFen) return state;

      const chess = new Chess(state.chessFen);
      let moveResult;
      try {
        moveResult = chess.move(action.san);
      } catch {
        return state;
      }
      if (!moveResult) return state;

      const newMoves = [...state.chessMoves, action.san];
      const newFen = chess.fen();
      const lastMoveFrom = moveResult.from as Square;
      const lastMoveTo = moveResult.to as Square;

      if (chess.isCheckmate()) {
        const loserTurn = chess.turn(); // the player in checkmate
        const winner: Color = loserTurn === 'w' ? 'b' : 'w';
        return {
          ...state,
          chessFen: newFen,
          chessMoves: newMoves,
          lastMoveFrom,
          lastMoveTo,
          phase: 'finished',
          winner,
          endReason: 'checkmate',
        };
      }

      if (chess.isStalemate() || chess.isDraw()) {
        return {
          ...state,
          chessFen: newFen,
          chessMoves: newMoves,
          lastMoveFrom,
          lastMoveTo,
          phase: 'finished',
          winner: 'draw',
          endReason: chess.isStalemate() ? 'stalemate' : 'draw',
        };
      }

      return { ...state, chessFen: newFen, chessMoves: newMoves, lastMoveFrom, lastMoveTo };
    }

    default:
      return state;
  }
}

export function useGame(initialState?: GameState) {
  const [state, dispatch] = useReducer(gameReducer, initialState ?? createInitialGameState());

  const placePiece = useCallback((pieceType: PieceType, square: Square) => {
    dispatch({ type: 'PLACE_PIECE', pieceType, square });
  }, []);

  const makeChessMove = useCallback((san: string) => {
    dispatch({ type: 'CHESS_MOVE', san });
  }, []);

  const loadState = useCallback((newState: GameState) => {
    dispatch({ type: 'LOAD_STATE', state: newState });
  }, []);

  const legalSquares = useCallback(
    (pieceType: PieceType) => {
      if (state.phase !== 'draft') return [];
      return getLegalPlacementSquares(state, pieceType);
    },
    [state],
  );

  return { state, placePiece, makeChessMove, loadState, legalSquares };
}
