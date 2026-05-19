import { useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

// A sample famous game (Immortal Game, Anderssen vs Kieseritzky 1851)
const FAMOUS_MOVES = [
  'e4',
  'e5',
  'f4',
  'exf4',
  'Bc4',
  'Qh4+',
  'Kf1',
  'b5',
  'Bxb5',
  'Nf6',
  'Nf3',
  'Qh6',
  'd3',
  'Nh5',
  'Nh4',
  'Qg5',
  'Nf5',
  'c6',
  'g4',
  'Nf6',
  'Rg1',
  'cxb5',
  'h4',
  'Qg6',
  'h5',
  'Qg5',
  'Qf3',
  'Ng8',
  'Bxf4',
  'Qf6',
  'Nc3',
  'Bc5',
  'Nd5',
  'Qxb2',
  'Bd6',
  'Bxg1',
  'e5',
  'Qxa1+',
  'Ke2',
  'Na6',
  'Nxg7+',
  'Kd8',
  'Qf6+',
  'Nxf6',
  'Be7#',
];

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const LIGHT = '#f0d9b5';
const DARK = '#b58863';

// Piece SVG paths (simplified unicode fallback)
const PIECE_UNICODE: Record<string, string> = {
  wk: '♔',
  wq: '♕',
  wr: '♖',
  wb: '♗',
  wn: '♘',
  wp: '♙',
  bk: '♚',
  bq: '♛',
  br: '♜',
  bb: '♝',
  bn: '♞',
  bp: '♟',
};

const AnimatedBoard: React.FC<{ opacity?: number }> = ({ opacity = 0.25 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{ chess: Chess; moveIdx: number; fen: string }>({
    chess: new Chess(),
    moveIdx: 0,
    fen: new Chess().fen(),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      const size = Math.max(window.innerWidth, window.innerHeight);
      canvas!.width = size;
      canvas!.height = size;
      draw();
    }

    function draw() {
      if (!canvas || !ctx) return;
      const sq = canvas.width / 8;
      const chess = stateRef.current.chess;

      for (let rank = 7; rank >= 0; rank--) {
        for (let file = 0; file < 8; file++) {
          const x = file * sq;
          const y = (7 - rank) * sq;
          const isLight = (file + rank) % 2 === 0;
          ctx.fillStyle = isLight ? LIGHT : DARK;
          ctx.fillRect(x, y, sq, sq);

          const sqName = `${FILES[file]}${rank + 1}`;
          const piece = chess.get(sqName as any);
          if (piece) {
            const key = `${piece.color}${piece.type}`;
            ctx.font = `${sq * 0.75}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = piece.color === 'w' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)';
            ctx.fillText(PIECE_UNICODE[key] ?? '', x + sq / 2, y + sq / 2);
          }
        }
      }
    }

    function playNextMove() {
      const { moveIdx } = stateRef.current;
      if (moveIdx >= FAMOUS_MOVES.length) {
        // Reset
        stateRef.current.chess = new Chess();
        stateRef.current.moveIdx = 0;
      } else {
        try {
          stateRef.current.chess.move(FAMOUS_MOVES[stateRef.current.moveIdx]);
          stateRef.current.moveIdx++;
        } catch {
          stateRef.current.chess = new Chess();
          stateRef.current.moveIdx = 0;
        }
      }
      draw();
    }

    resize();
    window.addEventListener('resize', resize);
    const interval = setInterval(playNextMove, 1200);

    return () => {
      window.removeEventListener('resize', resize);
      clearInterval(interval);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
};

export default AnimatedBoard;
