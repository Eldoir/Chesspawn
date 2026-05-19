import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
  Switch,
  Alert,
  Divider,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AnimatedBoard from './AnimatedBoard';
import { generateGameId, createGame, checkGameExists } from '../../api/gameApi';
import { createInitialGameState } from '../../engine/chesspawn';
import { LS_LANG_KEY } from '../../i18n';

const GAME_ID_RE = /^[A-Z0-9]{6}$/;
const LS_GAME_KEY = 'chesspawn_last_game';
const LS_COLOR_KEY = 'chesspawn_last_color';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();

  const [joinId, setJoinId] = useState('');
  const [remember, setRemember] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [hosting, setHosting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [normalMode, setNormalMode] = useState(
    () => localStorage.getItem('chesspawn_mode') === 'normal',
  );

  const handleNormalModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setNormalMode(val);
    localStorage.setItem('chesspawn_mode', val ? 'normal' : 'draft');
  };

  const handleLanguageChange = (_: React.MouseEvent<HTMLElement>, lang: string | null) => {
    if (!lang) return;
    i18n.changeLanguage(lang);
    localStorage.setItem(LS_LANG_KEY, lang);
  };

  // Pre-fill from ?join= param
  useEffect(() => {
    const id = searchParams.get('join');
    if (id) setJoinId(id.toUpperCase().slice(0, 6));
  }, [searchParams]);

  // Auto-restore remembered game
  useEffect(() => {
    const savedId = localStorage.getItem(LS_GAME_KEY);
    const savedColor = localStorage.getItem(LS_COLOR_KEY);
    if (savedId && savedColor) {
      setJoinId(savedId);
      setRemember(true);
    }
  }, []);

  const handlePlayLocal = () => {
    navigate(normalMode ? '/local?mode=normal' : '/local');
  };

  const handleHost = async () => {
    setHosting(true);
    try {
      let newId = generateGameId();
      // Ensure uniqueness (retry up to 5 times)
      for (let i = 0; i < 5; i++) {
        const exists = await checkGameExists(newId);
        if (!exists) break;
        newId = generateGameId();
      }

      const initialState = createInitialGameState();
      await createGame(newId, initialState);

      // Copy invite link to clipboard
      const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${newId}`;
      try {
        await navigator.clipboard.writeText(inviteUrl);
      } catch {
        // clipboard not available — silent
      }

      navigate(`/online/${newId}/w`);
    } catch (e) {
      console.error(e);
    } finally {
      setHosting(false);
    }
  };

  const handleJoin = async () => {
    const id = joinId.trim().toUpperCase();
    if (!GAME_ID_RE.test(id)) {
      setJoinError(t('home.invalidId'));
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const exists = await checkGameExists(id);
      if (!exists) {
        setJoinError(t('home.gameNotFound'));
        return;
      }
      if (remember) {
        localStorage.setItem(LS_GAME_KEY, id);
        localStorage.setItem(LS_COLOR_KEY, 'b');
      } else {
        localStorage.removeItem(LS_GAME_KEY);
        localStorage.removeItem(LS_COLOR_KEY);
      }
      navigate(`/online/${id}/b`);
    } catch {
      setJoinError(t('home.connectionError'));
    } finally {
      setJoining(false);
    }
  };

  const joinValid = GAME_ID_RE.test(joinId.trim().toUpperCase());

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background animated chess board */}
      <AnimatedBoard opacity={0.18} />

      {/* Dark overlay gradient */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, rgba(26,26,26,0.6) 0%, rgba(26,26,26,0.9) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Content card */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2.5,
          px: { xs: 3, sm: 5 },
          py: 5,
          maxWidth: 420,
          width: '100%',
        }}
      >
        {/* Language switcher */}
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <ToggleButtonGroup
            value={i18n.language}
            exclusive
            onChange={handleLanguageChange}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 1.2,
                py: 0.3,
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'text.secondary',
                borderColor: 'rgba(255,255,255,0.15)',
                '&.Mui-selected': {
                  color: 'primary.main',
                  backgroundColor: 'rgba(129,182,76,0.12)',
                },
              },
            }}
          >
            <ToggleButton value="fr">FR</ToggleButton>
            <ToggleButton value="en">EN</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Title */}
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '3rem', sm: '4rem' },
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #f0d9b5 0%, #81b64c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
            }}
          >
            Chesspawn
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            {t('home.subtitle')}
          </Typography>
        </Box>

        {/* Play Local */}
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handlePlayLocal}
          sx={{ py: 1.5, fontSize: '1rem' }}
        >
          {t('home.playLocal')}
        </Button>

        <FormControlLabel
          control={
            <Switch
              checked={normalMode}
              onChange={handleNormalModeChange}
              size="small"
              sx={{ ml: 0.5 }}
            />
          }
          label={
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('home.normalMode')}
            </Typography>
          }
          sx={{ alignSelf: 'flex-start', ml: 0.5, mt: -1 }}
        />

        <Divider sx={{ width: '100%', borderColor: 'rgba(255,255,255,0.1)' }} />

        {/* Host */}
        <Button
          variant="outlined"
          size="large"
          fullWidth
          onClick={handleHost}
          disabled={hosting}
          sx={{ py: 1.5, fontSize: '1rem' }}
          startIcon={hosting ? <CircularProgress size={18} /> : null}
        >
          {hosting ? t('home.creating') : t('home.host')}
        </Button>

        {/* Join */}
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder={t('home.gameIdPlaceholder')}
              value={joinId}
              onChange={(e) => {
                setJoinId(e.target.value.toUpperCase().slice(0, 6));
                setJoinError(null);
              }}
              slotProps={{
                htmlInput: {
                  maxLength: 6,
                  style: { letterSpacing: '0.15em', fontWeight: 700, textTransform: 'uppercase' },
                },
              }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              onClick={handleJoin}
              disabled={!joinValid || joining}
              startIcon={joining ? <CircularProgress size={16} /> : null}
            >
              {t('home.join')}
            </Button>
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('home.rememberGame')}
              </Typography>
            }
          />
          {joinError && (
            <Alert severity="error" sx={{ py: 0.5 }}>
              {joinError}
            </Alert>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
