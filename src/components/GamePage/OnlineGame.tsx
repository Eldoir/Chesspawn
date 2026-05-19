import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import { useOnlineGame } from '../../hooks/useOnlineGame';
import type { Color } from '../../types/game';
import GameView from './GameView';

interface OnlineGameProps {
  gameId: string;
  myColor: Color;
}

const OnlineGame: React.FC<OnlineGameProps> = ({ gameId, myColor }) => {
  const { state, placePiece, makeChessMove, legalSquares, syncing, error, isMyTurn } =
    useOnlineGame(gameId, myColor);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Consider ready once we've loaded a state
    if (state.placements.length > 0 || state.chessFen || state.draftHistory.length > 0) {
      setReady(true);
    } else {
      // Give it 1.5s before showing the board anyway
      const t = setTimeout(() => setReady(true), 1500);
      return () => clearTimeout(t);
    }
  }, [state]);

  if (!ready) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', pt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
          {error}
        </Alert>
      )}
      {!isMyTurn && state.phase !== 'finished' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <CircularProgress size={12} /> Waiting for opponent…
          </Typography>
        </Box>
      )}
      <GameView
        state={state}
        myColor={myColor}
        onPlacePiece={placePiece}
        onChessMove={makeChessMove}
        legalSquares={legalSquares}
        readOnly={!isMyTurn}
        syncing={syncing}
      />
    </Box>
  );
};

export default OnlineGame;
