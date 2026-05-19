import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Color, GameState, PieceType } from '../../types/game';
import ChessBoard from '../Board/ChessBoard';
import DraftPanel, { DISPLAY_ORDER } from '../Board/DraftPanel';

interface GameViewProps {
  state: GameState;
  myColor?: Color; // undefined = local (controls both)
  onPlacePiece: (pieceType: PieceType, square: string) => void;
  onChessMove: (san: string) => void;
  legalSquares: (p: PieceType) => string[];
  readOnly?: boolean;
  syncing?: boolean;
}

const GameView: React.FC<GameViewProps> = ({
  state,
  myColor,
  onPlacePiece,
  onChessMove,
  legalSquares,
  readOnly = false,
  syncing = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const colorLabel = (c: Color) => (c === 'w' ? t('game.white') : t('game.black'));
  // Each player keeps their own selection independently
  const [selectedPiece, setSelectedPiece] = useState<Record<Color, PieceType | null>>({
    w: null,
    b: null,
  });

  const isLocal = myColor === undefined;
  const activeColor =
    state.phase === 'draft'
      ? state.draftTurn
      : (state.chessFen?.split(' ')[1] as Color | undefined);
  const flipped = !isLocal && myColor === 'b';

  // Determine if each panel is "active"
  const wActive = isLocal ? state.draftTurn === 'w' : myColor === 'w' && state.draftTurn === 'w';
  const bActive = isLocal ? state.draftTurn === 'b' : myColor === 'b' && state.draftTurn === 'b';

  // Auto-select the first available piece when a player has no selection
  // (game start, after placing the last piece of a given type, etc.)
  useEffect(() => {
    if (state.phase !== 'draft') return;
    setSelectedPiece((prev) => {
      const next = { ...prev };
      for (const color of ['w', 'b'] as Color[]) {
        if (next[color] !== null) continue;
        const { pool, kingPlaced } = {
          pool: state.pool[color],
          kingPlaced: state.kingPlaced[color],
        };
        const poolSet = new Set(pool);
        next[color] =
          pool.length === 0
            ? kingPlaced
              ? null
              : 'k'
            : (DISPLAY_ORDER.find((p) => p !== 'k' && poolSet.has(p)) ?? null);
      }
      return next;
    });
  }, [state.phase, state.pool, state.kingPlaced]);

  const handleSelectPiece = (color: Color, p: PieceType) => {
    if (state.phase !== 'draft') return;
    if (!isLocal && myColor !== color) return;
    setSelectedPiece((prev) => ({ ...prev, [color]: prev[color] === p ? null : p }));
  };

  const handleDraftPlace = (square: string) => {
    const color = state.draftTurn;
    const piece = selectedPiece[color];
    if (!piece) return;
    onPlacePiece(piece, square);
    // Deselect only if the pool will be empty for that piece after placement
    const remaining = state.pool[color].filter((p) => p === piece).length;
    if (remaining <= 1) {
      setSelectedPiece((prev) => ({ ...prev, [color]: null }));
    }
  };

  // The active piece for highlighting legal squares is the current player's selection
  const activePiece = selectedPiece[state.draftTurn] ?? null;
  const legalSqs = activePiece ? legalSquares(activePiece) : [];

  const isMyChessTurn =
    state.phase === 'chess' && activeColor && (isLocal || myColor === activeColor);

  // Status text
  let statusText = '';
  if (state.phase === 'draft') {
    const mustPlaceKing =
      state.pool[state.draftTurn].length === 0 && !state.kingPlaced[state.draftTurn];
    const action = mustPlaceKing ? t('game.actionPlaceKing') : t('game.actionPlacePiece');
    if (isLocal) {
      statusText = t('game.draftStatusLocal', { color: colorLabel(state.draftTurn), action });
    } else if (state.draftTurn === myColor) {
      statusText = t('game.draftStatusMine', { action });
    } else {
      statusText = t('game.draftStatusOpponent', { action });
    }
  } else if (state.phase === 'chess') {
    if (isLocal) {
      statusText = t('game.chessTurnLocal', { color: colorLabel(activeColor!) });
    } else if (activeColor === myColor) {
      statusText = t('game.chessTurnMine');
    } else {
      statusText = t('game.chessTurnOpponent');
    }
  } else if (state.phase === 'finished') {
    if (state.winner === 'draw') {
      statusText = t('game.draw');
    } else if (state.winner) {
      const reason =
        state.endReason === 'king-blocked'
          ? t('game.reasonKingBlocked')
          : state.endReason === 'checkmate'
            ? t('game.reasonCheckmate')
            : '';
      if (isLocal) {
        statusText = t('game.winsLocal', { color: colorLabel(state.winner), reason });
      } else if (state.winner === myColor) {
        statusText = t('game.winsMine', { reason });
      } else {
        statusText = t('game.winsOpponent', { reason });
      }
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        alignItems: { xs: 'stretch', md: 'flex-start' },
        justifyContent: 'center',
        width: '100%',
        maxWidth: 1000,
        mx: 'auto',
        p: 2,
      }}
    >
      {/* Board */}
      <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: 560 }, maxWidth: 560 }}>
        <ChessBoard
          state={state}
          myColor={myColor}
          onDraftPlace={handleDraftPlace}
          onChessMove={onChessMove}
          selectedDraftPiece={activePiece}
          legalDraftSquares={legalSqs}
          readOnly={readOnly || (!isLocal && !isMyChessTurn && state.phase === 'chess')}
          flipped={flipped}
        />
      </Box>

      {/* Sidebar */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          minWidth: 0,
        }}
      >
        {/* Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={
              state.phase === 'draft'
                ? t('game.draftPhase')
                : state.phase === 'chess'
                  ? t('game.chessPhase')
                  : t('game.gameOver')
            }
            color={
              state.phase === 'draft'
                ? 'secondary'
                : state.phase === 'chess'
                  ? 'primary'
                  : 'default'
            }
            size="small"
          />
          {syncing && <Chip label={t('game.syncing')} size="small" variant="outlined" />}
        </Box>

        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {statusText}
        </Typography>

        {state.phase === 'finished' && (
          <Alert severity={state.winner === 'draw' ? 'info' : 'success'} sx={{ mt: 1 }}>
            {statusText}
          </Alert>
        )}

        {/* Draft panels */}
        {state.phase === 'draft' && (
          <>
            {/* Show opponent's panel on top when flipped */}
            {flipped ? (
              <>
                <DraftPanel
                  color="w"
                  pool={state.pool.w}
                  isActive={wActive}
                  selectedPiece={selectedPiece.w}
                  onSelectPiece={(p) => handleSelectPiece('w', p)}
                  kingPlaced={state.kingPlaced.w}
                  label={t('game.white')}
                />
                <DraftPanel
                  color="b"
                  pool={state.pool.b}
                  isActive={bActive}
                  selectedPiece={selectedPiece.b}
                  onSelectPiece={(p) => handleSelectPiece('b', p)}
                  kingPlaced={state.kingPlaced.b}
                  label={t('game.black')}
                />
              </>
            ) : (
              <>
                <DraftPanel
                  color="b"
                  pool={state.pool.b}
                  isActive={bActive}
                  selectedPiece={selectedPiece.b}
                  onSelectPiece={(p) => handleSelectPiece('b', p)}
                  kingPlaced={state.kingPlaced.b}
                  label={t('game.black')}
                />
                <DraftPanel
                  color="w"
                  pool={state.pool.w}
                  isActive={wActive}
                  selectedPiece={selectedPiece.w}
                  onSelectPiece={(p) => handleSelectPiece('w', p)}
                  kingPlaced={state.kingPlaced.w}
                  label={t('game.white')}
                />
              </>
            )}
          </>
        )}

        {/* Chess phase move count */}
        {state.phase === 'chess' && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('game.moveCount', { count: Math.ceil(state.chessMoves.length / 2) })}
          </Typography>
        )}

        {/* Restart / Home */}
        <Box sx={{ mt: 'auto', pt: 2 }}>
          <Button variant="outlined" size="small" onClick={() => navigate('/')}>
            {t('game.home')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default GameView;
