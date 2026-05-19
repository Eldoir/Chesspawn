import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import theme from './theme';
import type { Color } from './types/game';

const HomePage = lazy(() => import('./components/HomePage/HomePage'));
const LocalGame = lazy(() => import('./components/GamePage/LocalGame'));
const OnlineGame = lazy(() => import('./components/GamePage/OnlineGame'));

const OnlineGameRoute: React.FC = () => {
  const { gameId, color } = useParams<{ gameId: string; color: string }>();
  if (!gameId || (color !== 'w' && color !== 'b')) return null;
  return <OnlineGame gameId={gameId} myColor={color as Color} />;
};

const Loader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/local" element={<LocalGame />} />
            <Route path="/online/:gameId/:color" element={<OnlineGameRoute />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
