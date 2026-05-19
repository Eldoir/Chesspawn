export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Square = string; // e.g. 'e4'

export interface PlacedPiece {
  square: Square;
  piece: Piece;
}

/** One entry in the draft order. */
export interface DraftTurn {
  color: Color;
  piece: Piece;
  square: Square;
}

export type GamePhase = 'draft' | 'chess' | 'finished';

export interface GameState {
  phase: GamePhase;
  /** Pieces available to each player during draft. Indexed by color. */
  pool: Record<Color, PieceType[]>;
  /** Placed pieces so far in draft phase. */
  placements: PlacedPiece[];
  /** Draft turn history */
  draftHistory: DraftTurn[];
  /** Current player in draft phase */
  draftTurn: Color;
  /** Whether king has been placed by each player */
  kingPlaced: Record<Color, boolean>;
  /** chess.js FEN when chess phase starts */
  chessFen: string | null;
  /** chess.js move history in chess phase (SAN) */
  chessMoves: string[];
  /** Last move from/to squares (chess phase) or last placed square (draft) */
  lastMoveFrom: Square | null;
  lastMoveTo: Square | null;
  /** Winner if finished */
  winner: Color | 'draw' | null;
  /** How the game ended */
  endReason: 'king-blocked' | 'checkmate' | 'stalemate' | 'draw' | null;
}

export type GameMode = 'local' | 'online';

export interface OnlineGameMeta {
  gameId: string;
  myColor: Color;
}
