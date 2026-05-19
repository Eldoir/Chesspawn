import { Chess } from 'chess.js';
import type { Color, GameState, PieceType, PlacedPiece, Square } from '../types/game';

/** The ordered list of pieces each player places (excluding king, placed last). */
export const DRAFT_POOL: PieceType[] = [
  'r',
  'r',
  'n',
  'n',
  'b',
  'b',
  'q',
  'p',
  'p',
  'p',
  'p',
  'p',
  'p',
  'p',
  'p',
];

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Creates a game state that skips the draft and starts from the standard chess position. */
export function createStandardGameState(): GameState {
  return {
    phase: 'chess',
    pool: { w: [], b: [] },
    placements: [],
    draftHistory: [],
    draftTurn: 'w',
    kingPlaced: { w: true, b: true },
    chessFen: STANDARD_FEN,
    chessMoves: [],
    lastMoveFrom: null,
    lastMoveTo: null,
    winner: null,
    endReason: null,
  };
}

export function createInitialGameState(): GameState {
  return {
    phase: 'draft',
    pool: {
      w: [...DRAFT_POOL],
      b: [...DRAFT_POOL],
    },
    placements: [],
    draftHistory: [],
    draftTurn: 'w',
    kingPlaced: { w: false, b: false },
    chessFen: null,
    chessMoves: [],
    lastMoveFrom: null,
    lastMoveTo: null,
    winner: null,
    endReason: null,
  };
}

/** All squares on the board */
export const ALL_SQUARES: Square[] = [];
for (let rank = 1; rank <= 8; rank++) {
  for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    ALL_SQUARES.push(`${file}${rank}`);
  }
}

export function isOccupied(placements: PlacedPiece[], square: Square): boolean {
  return placements.some((p) => p.square === square);
}

/**
 * Returns squares where the current piece can legally be placed.
 * Pawns cannot be placed on ranks 1 or 8.
 * Kings cannot be placed if they would be in check from already-placed enemy pieces.
 * Kings cannot be placed such that no valid move exists for them (that would mean the
 * opponent wins — but we check that AFTER placement to determine if opponent can place king).
 */
export function getLegalPlacementSquares(state: GameState, pieceType: PieceType): Square[] {
  return ALL_SQUARES.filter((sq) => {
    if (isOccupied(state.placements, sq)) return false;
    if (pieceType === 'p') {
      const rank = parseInt(sq[1]);
      if (rank === 1 || rank === 8) return false;
    }
    if (pieceType === 'k') {
      // King can only be placed once the entire pool is exhausted
      if (state.pool[state.draftTurn].length > 0) return false;
      return !wouldKingBeInCheck(state, sq, state.draftTurn);
    }
    return true;
  });
}

/**
 * Check if placing a king of `color` on `sq` would put it in check.
 *
 * chess.js requires both kings in any valid FEN, which is impossible mid-draft.
 * Fix: place a dummy enemy king on a safe square, then load with skipValidation
 * to bypass the "side not to move must not be in check" rule, and use isAttacked().
 */
function wouldKingBeInCheck(state: GameState, sq: Square, color: Color): boolean {
  const enemyColor: Color = color === 'w' ? 'b' : 'w';

  // new Chess(fen) calls load() internally and also validates kings — use
  // skipValidation to start from an empty board without throwing.
  const chess = new Chess();
  chess.load('8/8/8/8/8/8/8/8 w - - 0 1', { skipValidation: true });

  for (const { square, piece } of state.placements) {
    chess.put({ type: piece.type, color: piece.color }, square as any);
  }
  chess.put({ type: 'k', color }, sq as any);

  // Only add a dummy enemy king if the enemy hasn't placed theirs yet.
  // If it's already in state.placements we must NOT add a second one.
  const enemyKingOnBoard = state.placements.some(
    (p) => p.piece.color === enemyColor && p.piece.type === 'k',
  );
  if (!enemyKingOnBoard) {
    const occupied = new Set([sq, ...state.placements.map((p) => p.square)]);
    const dummySq = findSafeDummySquare(sq, occupied);
    if (dummySq) chess.put({ type: 'k', color: enemyColor }, dummySq as any);
  }

  // skipValidation: bypass "side not to move must not be in check" — this
  // position is hypothetical, not a real game state.
  const [board] = chess.fen().split(' ');
  const testChess = new Chess();
  testChess.load(`${board} ${enemyColor} - - 0 1`, { skipValidation: true });

  return testChess.isAttacked(sq as any, enemyColor);
}

/** Return the first square that is empty and not adjacent to `avoidSq`. */
function findSafeDummySquare(avoidSq: Square, occupied: Set<Square>): Square | null {
  const af = avoidSq.charCodeAt(0) - 'a'.charCodeAt(0);
  const ar = parseInt(avoidSq[1]) - 1;
  for (const candidate of ALL_SQUARES) {
    if (occupied.has(candidate)) continue;
    const cf = candidate.charCodeAt(0) - 'a'.charCodeAt(0);
    const cr = parseInt(candidate[1]) - 1;
    if (Math.abs(cf - af) <= 1 && Math.abs(cr - ar) <= 1) continue; // adjacent — skip
    return candidate;
  }
  return null;
}

/**
 * Check if the player whose turn it is to place the king has NO valid square.
 * Returns true if that player loses (opponent wins).
 */
export function isKingBlocked(state: GameState): boolean {
  const squares = getLegalPlacementSquares(state, 'k');
  return squares.length === 0;
}

/**
 * Build a chess.js Chess instance from the draft placements.
 */
export function buildChessFromPlacements(placements: PlacedPiece[]): Chess {
  const builder = new Chess();
  builder.load('8/8/8/8/8/8/8/8 w - - 0 1', { skipValidation: true });
  for (const { square, piece } of placements) {
    builder.put({ type: piece.type, color: piece.color }, square as any);
  }
  // Both kings are on the board at this point — load normally (no castling
  // rights since pieces aren't in standard starting squares).
  const [board] = builder.fen().split(' ');
  const chess = new Chess();
  chess.load(`${board} w - - 0 1`);
  return chess;
}

/** Standard piece label for display */
export const PIECE_LABELS: Record<PieceType, string> = {
  k: 'King',
  q: 'Queen',
  r: 'Rook',
  b: 'Bishop',
  n: 'Knight',
  p: 'Pawn',
};
