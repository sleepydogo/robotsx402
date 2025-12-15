'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Video, VideoOff, Maximize, Volume2, VolumeX,
  Clock, Activity, Wifi, Power, AlertTriangle,
  RotateCcw, ArrowLeft, Flag, Settings, MessageSquare,
  User, Crown
} from 'lucide-react';
import Link from 'next/link';

// Chess piece types
type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
type PieceColor = 'white' | 'black';

interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

interface ChessSquare {
  piece: ChessPiece | null;
  row: number;
  col: number;
}

interface Move {
  from: string;
  to: string;
  piece: string;
  notation: string;
  moveNumber: number;
}

// Unicode chess pieces (better styled)
const PIECES = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
};

// Initial chess board setup
const initializeBoard = (): ChessSquare[][] => {
  const board: ChessSquare[][] = [];

  // Initialize empty board
  for (let row = 0; row < 8; row++) {
    board[row] = [];
    for (let col = 0; col < 8; col++) {
      board[row][col] = { piece: null, row, col };
    }
  }

  // Black pieces (top)
  const blackPieces: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  blackPieces.forEach((type, col) => {
    board[0][col].piece = { type, color: 'black' };
  });
  for (let col = 0; col < 8; col++) {
    board[1][col].piece = { type: 'pawn', color: 'black' };
  }

  // White pieces (bottom)
  const whitePieces: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let col = 0; col < 8; col++) {
    board[6][col].piece = { type: 'pawn', color: 'white' };
  }
  whitePieces.forEach((type, col) => {
    board[7][col].piece = { type, color: 'white' };
  });

  return board;
};

// Convert row/col to chess notation
const toChessNotation = (row: number, col: number): string => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const rank = 8 - row;
  return `${files[col]}${rank}`;
};

// Convert piece type to notation letter
const pieceToNotation = (type: PieceType): string => {
  const notation: Record<PieceType, string> = {
    king: 'K',
    queen: 'Q',
    rook: 'R',
    bishop: 'B',
    knight: 'N',
    pawn: '',
  };
  return notation[type];
};

export default function RobotControlPage() {
  const params = useParams();
  const router = useRouter();
  const robotId = params.id as string;

  const [board, setBoard] = useState<ChessSquare[][]>(initializeBoard());
  const [selectedSquare, setSelectedSquare] = useState<{row: number; col: number} | null>(null);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('white');
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [highlightedSquares, setHighlightedSquares] = useState<{row: number; col: number}[]>([]);

  // Player times (in seconds) - 10 minutes each
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [isWhiteActive, setIsWhiteActive] = useState(true);

  // Video controls
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Connection info
  const [latency, setLatency] = useState(45);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');

  // Chess clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (isWhiteActive && whiteTime > 0) {
        setWhiteTime((prev) => prev - 1);
      } else if (!isWhiteActive && blackTime > 0) {
        setBlackTime((prev) => prev - 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isWhiteActive, whiteTime, blackTime]);

  // Simulate latency updates
  useEffect(() => {
    const latencyInterval = setInterval(() => {
      setLatency(Math.floor(40 + Math.random() * 20));
    }, 2000);

    return () => clearInterval(latencyInterval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSquareClick = (row: number, col: number) => {
    const clickedSquare = board[row][col];

    if (selectedSquare === null) {
      // First click - select piece
      if (clickedSquare.piece && clickedSquare.piece.color === currentTurn) {
        setSelectedSquare({ row, col });
        // In a real implementation, calculate valid moves here
        setHighlightedSquares([]);
      }
    } else {
      // Second click - attempt move
      if (selectedSquare.row === row && selectedSquare.col === col) {
        // Clicked same square - deselect
        setSelectedSquare(null);
        setHighlightedSquares([]);
        return;
      }

      const piece = board[selectedSquare.row][selectedSquare.col].piece;

      if (clickedSquare.piece?.color === currentTurn) {
        // Clicked another piece of same color - select it instead
        setSelectedSquare({ row, col });
        return;
      }

      if (piece) {
        // Make the move
        const newBoard = board.map(r => r.map(sq => ({ ...sq, piece: sq.piece ? { ...sq.piece } : null })));
        const capturedPiece = newBoard[row][col].piece;

        newBoard[selectedSquare.row][selectedSquare.col].piece = null;
        newBoard[row][col].piece = piece;

        setBoard(newBoard);

        // Create move notation
        const from = toChessNotation(selectedSquare.row, selectedSquare.col);
        const to = toChessNotation(row, col);
        const pieceNotation = pieceToNotation(piece.type);
        const capture = capturedPiece ? 'x' : '';
        const notation = `${pieceNotation}${capture}${to}`;

        const moveNumber = Math.floor(moveHistory.length / 2) + 1;

        setMoveHistory([...moveHistory, {
          from,
          to,
          piece: piece.type,
          notation,
          moveNumber,
        }]);

        // Switch turn and clock
        const nextTurn = currentTurn === 'white' ? 'black' : 'white';
        setCurrentTurn(nextTurn);
        setIsWhiteActive(nextTurn === 'white');
      }

      setSelectedSquare(null);
      setHighlightedSquares([]);
    }
  };

  const resetBoard = () => {
    if (confirm('¿Reiniciar la partida?')) {
      setBoard(initializeBoard());
      setSelectedSquare(null);
      setCurrentTurn('white');
      setMoveHistory([]);
      setWhiteTime(600);
      setBlackTime(600);
      setIsWhiteActive(true);
    }
  };

  const handleResign = () => {
    if (confirm('¿Estás seguro de que quieres rendirte?')) {
      router.push(`/robots/${robotId}`);
    }
  };

  // Group moves by pairs (white + black)
  const movePairs: Move[][] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push([moveHistory[i], moveHistory[i + 1]].filter(Boolean));
  }

  return (
    <div className="min-h-screen bg-[#262421] text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#1c1916] sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/robots/${robotId}`} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold">ChessBot Pro X1</h1>
                <p className="text-xs text-gray-500">Robot ID: {robotId}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <Wifi className={`w-4 h-4 ${latency < 50 ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className="text-sm">{latency}ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className={`w-4 h-4 ${connectionStatus === 'connected' ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span className="text-xs uppercase">{connectionStatus}</span>
                </div>
              </div>

              <button
                onClick={handleResign}
                className="px-4 py-2 bg-[#2f2b28] hover:bg-[#3a3530] rounded-lg text-sm transition-all flex items-center gap-2"
              >
                <Power className="w-4 h-4" />
                Terminar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-[1fr_500px_350px] gap-6">

          {/* Left Column - Video Stream */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1c1916] rounded-lg overflow-hidden border border-white/10"
            >
              <div className="aspect-video bg-black relative">
                {videoEnabled ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
                      <div className="text-center">
                        <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 text-sm">Transmisión en vivo</p>
                        <p className="text-gray-600 text-xs mt-2">1080p • 30 FPS</p>
                      </div>
                    </div>

                    <div className="absolute top-4 left-4 px-2.5 py-1 bg-red-500 rounded flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      <span className="text-xs font-semibold">EN VIVO</span>
                    </div>

                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded">
                      <p className="text-xs">
                        <span className="text-gray-400">Latencia:</span>{' '}
                        <span className={latency < 50 ? 'text-emerald-400' : 'text-amber-400'}>{latency}ms</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="text-center">
                      <VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500">Video desactivado</p>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setVideoEnabled(!videoEnabled)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
                      >
                        {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
                      >
                        {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                      </button>
                    </div>
                    <button className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors">
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Game Info Bar */}
            <div className="flex items-center gap-3">
              <button
                onClick={resetBoard}
                className="px-4 py-2 bg-[#2f2b28] hover:bg-[#3a3530] rounded-lg transition-all flex items-center gap-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Nueva partida
              </button>
              <button className="px-4 py-2 bg-[#2f2b28] hover:bg-[#3a3530] rounded-lg transition-all flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4" />
                Configuración
              </button>
            </div>
          </div>

          {/* Center Column - Chess Board */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1c1916] rounded-lg p-6 border border-white/10"
            >
              {/* Black Player Info */}
              <div className="mb-4 flex items-center justify-between p-3 bg-[#2f2b28] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">ChessBot Pro</p>
                    <p className="text-xs text-gray-400">ELO: 2400</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg font-mono text-xl font-semibold ${!isWhiteActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#262421] text-gray-400'}`}>
                  {formatTime(blackTime)}
                </div>
              </div>

              {/* Chess Board */}
              <div className="relative">
                {/* Rank numbers (left) */}
                <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-around">
                  {[8, 7, 6, 5, 4, 3, 2, 1].map((rank) => (
                    <span key={rank} className="text-sm text-gray-500 font-semibold">
                      {rank}
                    </span>
                  ))}
                </div>

                {/* The board */}
                <div className="border-4 border-[#2f2b28] rounded-lg overflow-hidden shadow-2xl">
                  <div className="grid grid-cols-8 gap-0">
                    {board.map((row, rowIndex) =>
                      row.map((square, colIndex) => {
                        const isLight = (rowIndex + colIndex) % 2 === 0;
                        const isSelected = selectedSquare?.row === rowIndex && selectedSquare?.col === colIndex;
                        const isHighlighted = highlightedSquares.some(s => s.row === rowIndex && s.col === colIndex);
                        const isLastMove = moveHistory.length > 0 && (
                          (moveHistory[moveHistory.length - 1].from === toChessNotation(rowIndex, colIndex)) ||
                          (moveHistory[moveHistory.length - 1].to === toChessNotation(rowIndex, colIndex))
                        );

                        return (
                          <button
                            key={`${rowIndex}-${colIndex}`}
                            onClick={() => handleSquareClick(rowIndex, colIndex)}
                            className={`
                              aspect-square flex items-center justify-center text-5xl transition-all relative
                              ${isLight ? 'bg-[#ebecd0]' : 'bg-[#779556]'}
                              ${isSelected ? 'ring-4 ring-yellow-400 ring-inset z-10' : ''}
                              ${isLastMove ? 'bg-opacity-70' : ''}
                              ${isHighlighted ? 'after:absolute after:w-3 after:h-3 after:bg-black/30 after:rounded-full' : ''}
                              hover:brightness-95
                            `}
                          >
                            {square.piece && (
                              <span className={`${square.piece.color === 'white' ? 'drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]' : 'drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)]'}`}>
                                {PIECES[square.piece.color][square.piece.type]}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* File letters (bottom) */}
                <div className="flex justify-around mt-1">
                  {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((file) => (
                    <span key={file} className="text-sm text-gray-500 font-semibold w-[12.5%] text-center">
                      {file}
                    </span>
                  ))}
                </div>
              </div>

              {/* White Player Info */}
              <div className="mt-4 flex items-center justify-between p-3 bg-[#2f2b28] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Usuario</p>
                    <p className="text-xs text-gray-400">ELO: 1800</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg font-mono text-xl font-semibold ${isWhiteActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#262421] text-gray-400'}`}>
                  {formatTime(whiteTime)}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Move History & Controls */}
          <div className="space-y-4">
            {/* Move History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1c1916] rounded-lg border border-white/10 overflow-hidden"
            >
              <div className="p-4 border-b border-white/10">
                <h3 className="font-semibold text-sm">Movimientos</h3>
              </div>
              <div className="p-4 max-h-[500px] overflow-y-auto">
                {movePairs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No hay movimientos aún</p>
                ) : (
                  <div className="space-y-1">
                    {movePairs.map((pair, index) => (
                      <div key={index} className="flex items-center gap-3 py-2 px-3 hover:bg-white/5 rounded transition-colors">
                        <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                        <div className="flex-1 flex gap-3">
                          <span className="flex-1 text-sm font-medium">{pair[0]?.notation || ''}</span>
                          <span className="flex-1 text-sm font-medium text-gray-400">{pair[1]?.notation || '...'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <button
                onClick={handleResign}
                className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 transition-all flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <Flag className="w-4 h-4" />
                Rendirse
              </button>
              <button className="w-full px-4 py-3 bg-[#2f2b28] hover:bg-[#3a3530] rounded-lg transition-all flex items-center justify-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
            </motion.div>

            {/* Time Warning */}
            {(whiteTime < 60 || blackTime < 60) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-400">¡Tiempo crítico!</p>
                  <p className="text-xs text-amber-300/80 mt-1">
                    {whiteTime < 60 ? 'Blancas' : 'Negras'} tiene menos de 1 minuto
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
