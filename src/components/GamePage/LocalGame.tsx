import React from 'react';
import { Box } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useGame } from '../../hooks/useGame';
import { createStandardGameState } from '../../engine/chesspawn';
import GameView from './GameView';

const LocalGame: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialState =
    searchParams.get('mode') === 'normal' ? createStandardGameState() : undefined;
  const { state, placePiece, makeChessMove, legalSquares } = useGame(initialState);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', pt: 2 }}>
      <GameView
        state={state}
        onPlacePiece={placePiece}
        onChessMove={makeChessMove}
        legalSquares={legalSquares}
      />
    </Box>
  );
};

export default LocalGame;
