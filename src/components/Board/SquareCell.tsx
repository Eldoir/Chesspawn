import React from 'react';
import { Box } from '@mui/material';
import type { PlacedPiece, Square } from '../../types/game';
import PieceIcon from './PieceIcon';

interface SquareCellProps {
  square: Square;
  file: number; // 0-7
  rank: number; // 0-7 (0 = rank 8, 7 = rank 1)
  piece: PlacedPiece | null;
  isLight: boolean;
  isSelected?: boolean;
  isLastMove?: boolean;
  isLegal?: boolean;
  onClick: (sq: Square) => void;
  flipped?: boolean;
}

const LIGHT = '#f0d9b5';
const DARK = '#b58863';
const HIGHLIGHT_LEGAL = 'rgba(20,85,30,0.5)';
const HIGHLIGHT_SELECTED = 'rgba(20,85,30,0.8)';
const HIGHLIGHT_LAST = 'rgba(255,255,0,0.35)';

const SquareCell: React.FC<SquareCellProps> = ({
  square,
  file,
  rank,
  piece,
  isLight,
  isSelected,
  isLastMove,
  isLegal,
  onClick,
  flipped,
}) => {
  const base = isLight ? LIGHT : DARK;

  let overlay: string | undefined;
  if (isSelected) overlay = HIGHLIGHT_SELECTED;
  else if (isLastMove) overlay = HIGHLIGHT_LAST;

  const showRankLabel = flipped ? file === 7 : file === 0;
  const showFileLabel = flipped ? rank === 0 : rank === 7;

  const rankLabel = flipped ? String(rank + 1) : String(8 - rank);
  const fileLabel = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][file];

  return (
    <Box
      onClick={() => onClick(square)}
      sx={{
        position: 'relative',
        backgroundColor: base,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isLegal || piece ? 'pointer' : 'default',
        '&:hover': { filter: isLegal || piece ? 'brightness(1.1)' : 'none' },
        userSelect: 'none',
        aspectRatio: '1',
        width: '12.5%',
      }}
    >
      {/* Overlay for selection / last move */}
      {overlay && (
        <Box sx={{ position: 'absolute', inset: 0, backgroundColor: overlay, zIndex: 1 }} />
      )}

      {/* Legal move dot */}
      {isLegal && !piece && (
        <Box
          sx={{
            position: 'absolute',
            width: '32%',
            height: '32%',
            borderRadius: '50%',
            backgroundColor: HIGHLIGHT_LEGAL,
            zIndex: 2,
          }}
        />
      )}
      {isLegal && piece && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            border: `4px solid ${HIGHLIGHT_LEGAL}`,
            borderRadius: '50%',
            zIndex: 2,
          }}
        />
      )}

      {/* Piece */}
      {piece && (
        <Box
          sx={{
            position: 'relative',
            zIndex: 3,
            width: '85%',
            height: '85%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PieceIcon
            type={piece.piece.type}
            color={piece.piece.color}
            size={undefined}
            style={{ width: '100%', height: '100%' }}
          />
        </Box>
      )}

      {/* Rank label (left edge) */}
      {showRankLabel && (
        <Box
          sx={{
            position: 'absolute',
            top: 2,
            left: 3,
            fontSize: '0.65rem',
            fontWeight: 700,
            color: isLight ? DARK : LIGHT,
            lineHeight: 1,
            zIndex: 4,
          }}
        >
          {rankLabel}
        </Box>
      )}

      {/* File label (bottom edge) */}
      {showFileLabel && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 2,
            right: 3,
            fontSize: '0.65rem',
            fontWeight: 700,
            color: isLight ? DARK : LIGHT,
            lineHeight: 1,
            zIndex: 4,
          }}
        >
          {fileLabel}
        </Box>
      )}
    </Box>
  );
};

export default SquareCell;
