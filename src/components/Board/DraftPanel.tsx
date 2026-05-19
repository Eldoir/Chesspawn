import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import type { Color, PieceType } from '../../types/game';
import { PIECE_LABELS } from '../../engine/chesspawn';
import PieceIcon from './PieceIcon';

interface DraftPanelProps {
  color: Color;
  pool: PieceType[];
  isActive: boolean;
  selectedPiece: PieceType | null;
  onSelectPiece: (p: PieceType) => void;
  kingPlaced: boolean;
  label: string;
}

// Piece order for display
export const DISPLAY_ORDER: PieceType[] = ['r', 'n', 'b', 'q', 'p', 'k'];

const DraftPanel: React.FC<DraftPanelProps> = ({
  color,
  pool,
  isActive,
  selectedPiece,
  onSelectPiece,
  kingPlaced,
  label,
}) => {
  // Count pieces in pool
  const counts = pool.reduce<Record<string, number>>((acc, p) => {
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});

  const pieces: PieceType[] = DISPLAY_ORDER.filter((p) => {
    if (p === 'k') return !kingPlaced && isActive && pool.length === 0; // only when pool is empty
    return (counts[p] ?? 0) > 0;
  });

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        backgroundColor: isActive ? 'rgba(129,182,76,0.1)' : 'rgba(255,255,255,0.03)',
        border: isActive ? '1px solid rgba(129,182,76,0.4)' : '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.2s',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: isActive ? 'primary.main' : 'text.secondary',
          mb: 1,
          display: 'block',
        }}
      >
        {label} {isActive ? '— your turn' : ''}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {pieces.map((p) => {
          const count = p === 'k' ? 1 : (counts[p] ?? 0);
          const isSelected = selectedPiece === p;
          return (
            <Tooltip
              key={p}
              title={`${PIECE_LABELS[p]}${count > 1 ? ` ×${count}` : ''}`}
              placement="top"
            >
              <Box
                onClick={() => isActive && onSelectPiece(p)}
                sx={{
                  position: 'relative',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  cursor: isActive ? 'pointer' : 'default',
                  backgroundColor: isSelected ? 'rgba(129,182,76,0.3)' : 'rgba(255,255,255,0.05)',
                  border: isSelected ? '2px solid #81b64c' : '2px solid transparent',
                  '&:hover': isActive ? { backgroundColor: 'rgba(129,182,76,0.15)' } : {},
                  transition: 'all 0.15s',
                  opacity: isActive ? 1 : 0.5,
                }}
              >
                <PieceIcon type={p} color={color} size={34} />
                {count > 1 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 1,
                      right: 3,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: 'text.secondary',
                      lineHeight: 1,
                    }}
                  >
                    {count}
                  </Box>
                )}
              </Box>
            </Tooltip>
          );
        })}
        {pieces.length === 0 && !kingPlaced && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {isActive ? 'Place your king!' : 'Waiting…'}
          </Typography>
        )}
        {pieces.length === 0 && kingPlaced && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            All placed
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default DraftPanel;
