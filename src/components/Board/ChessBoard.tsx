import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { Chess } from 'chess.js';
import type { Color, GameState, Piece, PieceType, PlacedPiece, Square } from '../../types/game';
import SquareCell from './SquareCell';
import PieceIcon from './PieceIcon';

// ---------------------------------------------------------------------------
// Promotion picker overlay
// ---------------------------------------------------------------------------

const PROMOTION_PIECES: PieceType[] = ['q', 'r', 'b', 'n'];

interface PromotionPickerProps {
  color: Color;
  toSquare: Square;
  flipped: boolean;
  onPick: (piece: PieceType) => void;
  onCancel: () => void;
}

const PromotionPicker: React.FC<PromotionPickerProps> = ({
  color,
  toSquare,
  flipped,
  onPick,
  onCancel,
}) => {
  const { x } = sqToPercent(toSquare, flipped);
  // Pieces stack downward for white (promoting to rank 8, top of board),
  // upward for black (promoting to rank 1, bottom of board).
  const stackDown = (color === 'w' && !flipped) || (color === 'b' && flipped);

  return (
    <>
      {/* Backdrop — click outside cancels */}
      <Box
        onClick={onCancel}
        sx={{ position: 'absolute', inset: 0, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.35)' }}
      />
      {/* Piece column */}
      <Box
        sx={{
          position: 'absolute',
          left: `${x}%`,
          top: stackDown ? 0 : 'auto',
          bottom: stackDown ? 'auto' : 0,
          width: '12.5%',
          display: 'flex',
          flexDirection: stackDown ? 'column' : 'column-reverse',
          zIndex: 21,
        }}
      >
        {PROMOTION_PIECES.map((p) => (
          <Box
            key={p}
            onClick={() => onPick(p)}
            sx={{
              width: '100%',
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#81b64c' },
              transition: 'background-color 0.1s',
            }}
          >
            <PieceIcon type={p} color={color} style={{ width: '85%', height: '85%' }} />
          </Box>
        ))}
      </Box>
    </>
  );
};

function sqToPercent(sq: Square, flipped: boolean): { x: number; y: number } {
  const f = sq.charCodeAt(0) - 'a'.charCodeAt(0);
  const r = parseInt(sq[1]) - 1;
  return {
    x: (flipped ? 7 - f : f) * 12.5,
    y: (flipped ? r : 7 - r) * 12.5,
  };
}

interface MovingPieceProps {
  piece: Piece;
  from: Square;
  to: Square;
  flipped: boolean;
}

const MovingPiece: React.FC<MovingPieceProps> = ({ piece, from, to, flipped }) => {
  const fromPct = sqToPercent(from, flipped);
  const toPct = sqToPercent(to, flipped);
  const [pos, setPos] = useState(fromPct);

  useEffect(() => {
    let r1: number, r2: number;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setPos(toPct));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box
      sx={{
        position: 'absolute',
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: '12.5%',
        height: '12.5%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'left 0.15s ease, top 0.15s ease',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <PieceIcon type={piece.type} color={piece.color} style={{ width: '85%', height: '85%' }} />
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Animated sliding piece overlay
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------
interface ChessBoardProps {
  state: GameState;
  myColor?: Color;
  onDraftPlace?: (square: Square) => void;
  onChessMove?: (san: string) => void;
  selectedDraftPiece?: PieceType | null;
  legalDraftSquares?: Square[];
  readOnly?: boolean;
  size?: number | string;
  flipped?: boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function squareFromCoords(file: number, rank: number): Square {
  return `${FILES[file]}${rank + 1}`;
}

const ChessBoard: React.FC<ChessBoardProps> = ({
  state,
  myColor,
  onDraftPlace,
  onChessMove,
  selectedDraftPiece,
  legalDraftSquares = [],
  readOnly = false,
  size,
  flipped = false,
}) => {
  const [selectedChessSq, setSelectedChessSq] = useState<Square | null>(null);
  const [legalChessMoves, setLegalChessMoves] = useState<Square[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(
    null,
  );

  interface AnimState {
    piece: Piece;
    from: Square;
    to: Square;
    key: number;
  }
  const [anim, setAnim] = useState<AnimState | null>(null);
  const animKeyRef = useRef(0);

  const placementMap = useMemo(() => {
    const map = new Map<Square, PlacedPiece>();
    for (const p of state.placements) map.set(p.square, p);
    return map;
  }, [state.placements]);

  const chessPlacementMap = useMemo(() => {
    if (state.phase !== 'chess' || !state.chessFen) return null;
    const chess = new Chess(state.chessFen);
    const map = new Map<Square, PlacedPiece>();
    for (const file of FILES) {
      for (let rank = 1; rank <= 8; rank++) {
        const sq = `${file}${rank}` as Square;
        const p = chess.get(sq as any);
        if (p)
          map.set(sq, {
            square: sq,
            piece: { type: p.type as PieceType, color: p.color as Color },
          });
      }
    }
    return map;
  }, [state.phase, state.chessFen]);

  const chessMapRef = useRef(chessPlacementMap);
  chessMapRef.current = chessPlacementMap;

  useEffect(() => {
    if (state.phase !== 'chess' || !state.lastMoveFrom || !state.lastMoveTo) return;
    const piece = chessMapRef.current?.get(state.lastMoveTo)?.piece;
    if (!piece) return;
    animKeyRef.current += 1;
    setAnim({ piece, from: state.lastMoveFrom, to: state.lastMoveTo, key: animKeyRef.current });
    const t = setTimeout(() => setAnim(null), 200);
    return () => clearTimeout(t);
  }, [state.lastMoveFrom, state.lastMoveTo, state.phase]);

  const handleSquareClick = useCallback(
    (sq: Square) => {
      if (readOnly) return;

      if (state.phase === 'draft') {
        if (selectedDraftPiece && legalDraftSquares.includes(sq)) onDraftPlace?.(sq);
        return;
      }

      if (state.phase !== 'chess' || !state.chessFen) return;

      const chess = new Chess(state.chessFen);
      const currentTurn = chess.turn() as Color;
      if (myColor && currentTurn !== myColor) return;

      const pieceOnSq = chess.get(sq as any);

      if (selectedChessSq) {
        const moves = chess.moves({ square: selectedChessSq as any, verbose: true });
        const move = moves.find((m) => m.to === sq);
        if (move) {
          if (move.flags.includes('p')) {
            // Pawn promotion — show picker instead of auto-queening
            setPendingPromotion({ from: selectedChessSq, to: sq });
            setSelectedChessSq(null);
            setLegalChessMoves([]);
          } else {
            onChessMove?.(move.san);
            setSelectedChessSq(null);
            setLegalChessMoves([]);
          }
        } else if (pieceOnSq && pieceOnSq.color === currentTurn) {
          setSelectedChessSq(sq);
          setLegalChessMoves(
            chess.moves({ square: sq as any, verbose: true }).map((m) => m.to as Square),
          );
        } else {
          setSelectedChessSq(null);
          setLegalChessMoves([]);
        }
      } else if (pieceOnSq && pieceOnSq.color === currentTurn) {
        setSelectedChessSq(sq);
        setLegalChessMoves(
          chess.moves({ square: sq as any, verbose: true }).map((m) => m.to as Square),
        );
      }
    },
    [
      readOnly,
      state,
      selectedDraftPiece,
      legalDraftSquares,
      onDraftPlace,
      selectedChessSq,
      myColor,
      onChessMove,
    ],
  );

  useEffect(() => {
    setSelectedChessSq(null);
    setLegalChessMoves([]);
    setPendingPromotion(null);
  }, [state.chessFen]);

  const handlePromotionPick = useCallback(
    (piece: PieceType) => {
      if (!pendingPromotion || !state.chessFen) return;
      const chess = new Chess(state.chessFen);
      const result = chess.move({
        from: pendingPromotion.from,
        to: pendingPromotion.to,
        promotion: piece,
      });
      if (result?.san) onChessMove?.(result.san);
      setPendingPromotion(null);
    },
    [pendingPromotion, state.chessFen, onChessMove],
  );

  const activeMap = chessPlacementMap ?? placementMap;
  const ranks = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexWrap: 'wrap',
        width: size ?? '100%',
        aspectRatio: '1',
        borderRadius: 1,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {ranks.map((rankIdx) =>
        files.map((fileIdx) => {
          const sq = squareFromCoords(fileIdx, rankIdx) as Square;
          const isLight = (fileIdx + rankIdx) % 2 === 0;
          const piece = sq === anim?.to ? null : (activeMap.get(sq) ?? null);
          const isLegal =
            state.phase === 'draft' ? legalDraftSquares.includes(sq) : legalChessMoves.includes(sq);
          const isSelected = state.phase === 'chess' ? selectedChessSq === sq : false;
          const isLastMove = sq === state.lastMoveFrom || sq === state.lastMoveTo;

          return (
            <SquareCell
              key={sq}
              square={sq}
              file={fileIdx}
              rank={7 - rankIdx}
              piece={piece}
              isLight={isLight}
              isLegal={isLegal}
              isSelected={isSelected}
              isLastMove={isLastMove}
              onClick={handleSquareClick}
              flipped={flipped}
            />
          );
        }),
      )}

      {anim && (
        <MovingPiece
          key={anim.key}
          piece={anim.piece}
          from={anim.from}
          to={anim.to}
          flipped={flipped}
        />
      )}

      {pendingPromotion && state.chessFen && (
        <PromotionPicker
          color={new Chess(state.chessFen).turn() as Color}
          toSquare={pendingPromotion.to}
          flipped={flipped}
          onPick={handlePromotionPick}
          onCancel={() => setPendingPromotion(null)}
        />
      )}
    </Box>
  );
};

export default ChessBoard;
