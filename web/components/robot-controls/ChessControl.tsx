'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  RefreshCw,
  RotateCcw,
  Play,
  Video,
  Clock,
  Activity,
  Hash,
  Loader2,
  Users,
  Cpu,
  Copy,
  Check,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Chess pieces using Unicode symbols
const PIECES = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
};

// Initial chess board setup (standard chess starting position)
const INITIAL_BOARD = [
  ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],  // Row 0 (8th rank)
  ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],  // Row 1 (7th rank)
  ['', '', '', '', '', '', '', ''],                    // Row 2 (6th rank)
  ['', '', '', '', '', '', '', ''],                    // Row 3 (5th rank)
  ['', '', '', '', '', '', '', ''],                    // Row 4 (4th rank)
  ['', '', '', '', '', '', '', ''],                    // Row 5 (3rd rank)
  ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],  // Row 6 (2nd rank)
  ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']   // Row 7 (1st rank)
];

interface ChessMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  piece: string;
  captured: string | null;
  timestamp: Date | string;
  fen?: string;
}

interface GameState {
  board: string[][];
  currentTurn: 'w' | 'b';
  moveHistory: ChessMove[];
  lastMove: ChessMove | null;
  gameId: string;
  updatedAt: number;
}

interface ChessControlProps {
  robot: {
    id: string;
    name: string;
    control_api_url: string;
    video_stream_url?: string;
  };
}

type GameMode = 'pvp' | 'ai' | null;

export default function ChessControl({ robot }: ChessControlProps) {
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [gameId, setGameId] = useState<string>('');
  const [shareLink, setShareLink] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const [board, setBoard] = useState<string[][]>(INITIAL_BOARD);
  const [currentTurn, setCurrentTurn] = useState<'w' | 'b'>('w');
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ row: number; col: number }[]>([]);
  const [moveHistory, setMoveHistory] = useState<ChessMove[]>([]);
  const [lastMove, setLastMove] = useState<ChessMove | null>(null);
  const [executingOnRobot, setExecutingOnRobot] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // AI-specific state
  const [aiThinking, setAiThinking] = useState(false);
  const stockfishRef = useRef<Worker | null>(null);
  const aiMoveInProgressRef = useRef(false);

  // Generate unique game ID
  const generateGameId = () => {
    return `game-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  };

  // Initialize game mode
  const initializeGame = (mode: GameMode) => {
    const newGameId = mode === 'pvp' ? generateGameId() : `ai-${robot.id}`;
    setGameId(newGameId);
    setGameMode(mode);

    if (mode === 'pvp') {
      // Generate shareable link
      const link = `${window.location.origin}${window.location.pathname}?gameId=${newGameId}`;
      setShareLink(link);

      // Save initial game state
      const initialState: GameState = {
        board: INITIAL_BOARD.map(row => [...row]),
        currentTurn: 'w',
        moveHistory: [],
        lastMove: null,
        gameId: newGameId,
        updatedAt: Date.now()
      };
      localStorage.setItem(`chess-game-${newGameId}`, JSON.stringify(initialState));
      localStorage.setItem(`chess-mode-${robot.id}`, mode);
    } else if (mode === 'ai') {
      // Initialize Stockfish
      initializeStockfish();

      // Save initial game state for AI mode
      const initialState: GameState = {
        board: INITIAL_BOARD.map(row => [...row]),
        currentTurn: 'w',
        moveHistory: [],
        lastMove: null,
        gameId: newGameId,
        updatedAt: Date.now()
      };
      localStorage.setItem(`chess-game-${newGameId}`, JSON.stringify(initialState));
      localStorage.setItem(`chess-mode-${robot.id}`, mode);
    }
  };

  // Initialize Stockfish engine
  const initializeStockfish = () => {
    if (typeof window !== 'undefined') {
      const sf = new Worker('/stockfish.js');
      stockfishRef.current = sf;

      sf.postMessage('uci');
      sf.postMessage('setoption name Skill Level value 5'); // ~1200 ELO
      sf.postMessage('setoption name UCI_LimitStrength value true');
      sf.postMessage('setoption name UCI_Elo value 1200');
      sf.postMessage('isready');

      sf.onmessage = (event) => {
        const message = event.data;
        if (message.startsWith('bestmove')) {
          const parts = message.split(' ');
          const move = parts[1];
          if (move && move !== '(none)') {
            executeAIMove(move);
          } else {
            // No valid move found, reset state
            setAiThinking(false);
            aiMoveInProgressRef.current = false;
          }
        }
      };
    }
  };

  // Convert board to FEN notation
  const boardToFEN = (): string => {
    let fen = '';
    for (let row = 0; row < 8; row++) {
      let empty = 0;
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece === '') {
          empty++;
        } else {
          if (empty > 0) {
            fen += empty;
            empty = 0;
          }
          fen += piece[0] === 'w' ? piece[1] : piece[1].toLowerCase();
        }
      }
      if (empty > 0) fen += empty;
      if (row < 7) fen += '/';
    }

    const turn = currentTurn === 'w' ? 'w' : 'b';
    return `${fen} ${turn} KQkq - 0 1`;
  };

  // Request AI move
  const requestAIMove = () => {
    if (!stockfishRef.current || aiThinking) return;

    setAiThinking(true);
    const fen = boardToFEN();
    stockfishRef.current.postMessage(`position fen ${fen}`);
    stockfishRef.current.postMessage('go depth 8');
  };

  // Execute AI move (convert UCI to board coordinates)
  const executeAIMove = (uciMove: string) => {
    if (!aiMoveInProgressRef.current) {
      console.warn('AI move received but not in progress, ignoring');
      return;
    }

    // Parse UCI move (e.g., "e2e4")
    const fromFile = uciMove.charCodeAt(0) - 97; // a=0, b=1, etc.
    const fromRank = 8 - parseInt(uciMove[1]);
    const toFile = uciMove.charCodeAt(2) - 97;
    const toRank = 8 - parseInt(uciMove[3]);

    makeMove(fromRank, fromFile, toRank, toFile);

    // Reset AI state after move is complete
    setAiThinking(false);
    aiMoveInProgressRef.current = false;
  };

  // Check if it's AI's turn
  useEffect(() => {
    if (gameMode === 'ai' && currentTurn === 'b' && !aiThinking && !aiMoveInProgressRef.current) {
      // AI plays as black
      aiMoveInProgressRef.current = true;
      setTimeout(() => requestAIMove(), 500);
    }
  }, [currentTurn, gameMode]);

  // Load game from URL (PvP) or localStorage (AI/PvP)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlGameId = params.get('gameId');

    // Check for PvP game from URL
    if (urlGameId && !gameMode) {
      const savedGame = localStorage.getItem(`chess-game-${urlGameId}`);
      if (savedGame) {
        const state: GameState = JSON.parse(savedGame);
        // Convert timestamp strings back to Date objects
        const hydratedMoveHistory = state.moveHistory.map(move => ({
          ...move,
          timestamp: new Date(move.timestamp)
        }));
        const hydratedLastMove = state.lastMove ? {
          ...state.lastMove,
          timestamp: new Date(state.lastMove.timestamp)
        } : null;

        setBoard(state.board);
        setCurrentTurn(state.currentTurn);
        setMoveHistory(hydratedMoveHistory);
        setLastMove(hydratedLastMove);
        setGameId(urlGameId);
        setGameMode('pvp');
        setStatus({ type: 'info', message: 'Joined multiplayer game!' });
        return;
      }
    }

    // Check for saved game mode (AI or PvP without URL)
    if (!gameMode) {
      const savedMode = localStorage.getItem(`chess-mode-${robot.id}`) as GameMode;
      if (savedMode) {
        const savedGameId = savedMode === 'ai' ? `ai-${robot.id}` : null;
        if (savedGameId) {
          const savedGame = localStorage.getItem(`chess-game-${savedGameId}`);
          if (savedGame) {
            const state: GameState = JSON.parse(savedGame);
            // Convert timestamp strings back to Date objects
            const hydratedMoveHistory = state.moveHistory.map(move => ({
              ...move,
              timestamp: new Date(move.timestamp)
            }));
            const hydratedLastMove = state.lastMove ? {
              ...state.lastMove,
              timestamp: new Date(state.lastMove.timestamp)
            } : null;

            setBoard(state.board);
            setCurrentTurn(state.currentTurn);
            setMoveHistory(hydratedMoveHistory);
            setLastMove(hydratedLastMove);
            setGameId(savedGameId);
            setGameMode(savedMode);

            // Reset AI state when loading
            setAiThinking(false);
            aiMoveInProgressRef.current = false;

            // Reinitialize Stockfish for AI mode
            if (savedMode === 'ai') {
              initializeStockfish();
              setStatus({ type: 'info', message: 'AI game restored!' });
            } else {
              setStatus({ type: 'info', message: 'Game restored!' });
            }
          }
        }
      }
    }
  }, []);

  // Multiplayer: Poll for updates
  useEffect(() => {
    if (gameMode !== 'pvp' || !gameId) return;

    const interval = setInterval(() => {
      const savedGame = localStorage.getItem(`chess-game-${gameId}`);
      if (savedGame) {
        const state: GameState = JSON.parse(savedGame);
        // Only update if game state changed
        const lastMoveTime = lastMove ? ensureDate(lastMove.timestamp).getTime() : 0;
        if (state.updatedAt > lastMoveTime) {
          // Convert timestamp strings back to Date objects
          const hydratedMoveHistory = state.moveHistory.map(move => ({
            ...move,
            timestamp: new Date(move.timestamp)
          }));
          const hydratedLastMove = state.lastMove ? {
            ...state.lastMove,
            timestamp: new Date(state.lastMove.timestamp)
          } : null;

          setBoard(state.board);
          setCurrentTurn(state.currentTurn);
          setMoveHistory(hydratedMoveHistory);
          setLastMove(hydratedLastMove);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameMode, gameId]);

  // Copy share link
  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Ensure timestamp is a Date object
  const ensureDate = (timestamp: Date | string): Date => {
    return timestamp instanceof Date ? timestamp : new Date(timestamp);
  };

  // Get piece name for display
  const getPieceName = (piece: string): string => {
    const names: Record<string, string> = {
      'K': 'King', 'Q': 'Queen', 'R': 'Rook',
      'B': 'Bishop', 'N': 'Knight', 'P': 'Pawn'
    };
    const color = piece[0] === 'w' ? 'White' : 'Black';
    return `${color} ${names[piece[1]]}`;
  };

  // Get square name in chess notation
  const getSquareName = (row: number, col: number): string => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[col] + ranks[row];
  };

  // Check if position is within board bounds
  const isInBounds = (row: number, col: number): boolean => {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  };

  // Add line moves (for rook, bishop, queen)
  const addLineMoves = (
    row: number,
    col: number,
    color: string,
    moves: { row: number; col: number }[],
    directions: [number, number][]
  ) => {
    for (let [dr, dc] of directions) {
      let newRow = row + dr;
      let newCol = col + dc;

      while (isInBounds(newRow, newCol)) {
        if (!board[newRow][newCol]) {
          moves.push({ row: newRow, col: newCol });
        } else {
          if (board[newRow][newCol][0] !== color) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
        newRow += dr;
        newCol += dc;
      }
    }
  };

  // Get valid moves for a piece
  const getValidMovesForPiece = (row: number, col: number): { row: number; col: number }[] => {
    const piece = board[row][col];
    if (!piece) return [];

    const moves: { row: number; col: number }[] = [];
    const pieceType = piece[1];
    const color = piece[0];

    switch (pieceType) {
      case 'P': // Pawn
        const direction = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;

        if (isInBounds(row + direction, col) && !board[row + direction][col]) {
          moves.push({ row: row + direction, col });

          if (row === startRow && !board[row + 2 * direction][col]) {
            moves.push({ row: row + 2 * direction, col });
          }
        }

        for (let dc of [-1, 1]) {
          const newRow = row + direction;
          const newCol = col + dc;
          if (isInBounds(newRow, newCol) && board[newRow][newCol] && board[newRow][newCol][0] !== color) {
            moves.push({ row: newRow, col: newCol });
          }
        }
        break;

      case 'R':
        addLineMoves(row, col, color, moves, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
        break;

      case 'N':
        const knightMoves: [number, number][] = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (let [dr, dc] of knightMoves) {
          const newRow = row + dr;
          const newCol = col + dc;
          if (isInBounds(newRow, newCol) && (!board[newRow][newCol] || board[newRow][newCol][0] !== color)) {
            moves.push({ row: newRow, col: newCol });
          }
        }
        break;

      case 'B':
        addLineMoves(row, col, color, moves, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
        break;

      case 'Q':
        addLineMoves(row, col, color, moves, [
          [-1, 0], [1, 0], [0, -1], [0, 1],
          [-1, -1], [-1, 1], [1, -1], [1, 1]
        ]);
        break;

      case 'K':
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const newRow = row + dr;
            const newCol = col + dc;
            if (isInBounds(newRow, newCol) && (!board[newRow][newCol] || board[newRow][newCol][0] !== color)) {
              moves.push({ row: newRow, col: newCol });
            }
          }
        }
        break;
    }

    return moves;
  };

  // Check if a move is valid
  const isValidMove = (row: number, col: number): boolean => {
    return validMoves.some(move => move.row === row && move.col === col);
  };

  // Make a move
  const makeMove = (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];

    const move: ChessMove = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece: piece,
      captured: capturedPiece || null,
      timestamp: new Date()
    };

    const newBoard = board.map(row => [...row]);
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = '';

    setBoard(newBoard);
    setLastMove(move);
    setMoveHistory(prev => [move, ...prev]);
    setCurrentTurn(currentTurn === 'w' ? 'b' : 'w');
    setSelectedSquare(null);
    setValidMoves([]);

    // Save to localStorage for both PvP and AI
    if (gameMode && gameId) {
      const state: GameState = {
        board: newBoard,
        currentTurn: currentTurn === 'w' ? 'b' : 'w',
        moveHistory: [move, ...moveHistory],
        lastMove: move,
        gameId,
        updatedAt: Date.now()
      };
      localStorage.setItem(`chess-game-${gameId}`, JSON.stringify(state));
    }

    setStatus({
      type: 'success',
      message: `${getPieceName(piece)}: ${getSquareName(fromRow, fromCol)} → ${getSquareName(toRow, toCol)}`
    });
  };

  // Handle square click
  const handleSquareClick = (row: number, col: number) => {
    // In AI mode, prevent clicking when it's AI's turn or AI is thinking
    if (gameMode === 'ai' && (currentTurn === 'b' || aiThinking || aiMoveInProgressRef.current)) {
      return;
    }

    const piece = board[row][col];

    if (selectedSquare === null) {
      if (piece && piece[0] === currentTurn) {
        setSelectedSquare({ row, col });
        const moves = getValidMovesForPiece(row, col);
        setValidMoves(moves);
      }
    } else {
      if (selectedSquare.row === row && selectedSquare.col === col) {
        setSelectedSquare(null);
        setValidMoves([]);
      } else if (isValidMove(row, col)) {
        makeMove(selectedSquare.row, selectedSquare.col, row, col);
      } else if (piece && piece[0] === currentTurn) {
        setSelectedSquare({ row, col });
        const moves = getValidMovesForPiece(row, col);
        setValidMoves(moves);
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    }
  };

  // Reset board
  const resetBoard = () => {
    if (confirm('Are you sure you want to reset the board?')) {
      setBoard(INITIAL_BOARD.map(row => [...row]));
      setCurrentTurn('w');
      setSelectedSquare(null);
      setValidMoves([]);
      setMoveHistory([]);
      setLastMove(null);

      // Reset AI state
      setAiThinking(false);
      aiMoveInProgressRef.current = false;

      // Clear saved game state
      if (gameId) {
        localStorage.removeItem(`chess-game-${gameId}`);
      }
      localStorage.removeItem(`chess-mode-${robot.id}`);
      setGameMode(null);
      setGameId('');

      setStatus({ type: 'success', message: 'Board reset successfully' });
    }
  };

  // Undo last move
  const undoLastMove = () => {
    if (!lastMove) {
      setStatus({ type: 'error', message: 'No move to undo' });
      return;
    }

    const newBoard = board.map(row => [...row]);
    newBoard[lastMove.from.row][lastMove.from.col] = lastMove.piece;
    newBoard[lastMove.to.row][lastMove.to.col] = lastMove.captured || '';

    const newMoveHistory = moveHistory.slice(1);
    const newLastMove = moveHistory[1] || null;

    setBoard(newBoard);
    setCurrentTurn(currentTurn === 'w' ? 'b' : 'w');
    setMoveHistory(newMoveHistory);
    setLastMove(newLastMove);
    setSelectedSquare(null);
    setValidMoves([]);

    // Reset AI state in case we're undoing an AI move
    setAiThinking(false);
    aiMoveInProgressRef.current = false;

    // Save updated state to localStorage
    if (gameMode && gameId) {
      const state: GameState = {
        board: newBoard,
        currentTurn: currentTurn === 'w' ? 'b' : 'w',
        moveHistory: newMoveHistory,
        lastMove: newLastMove,
        gameId,
        updatedAt: Date.now()
      };
      localStorage.setItem(`chess-game-${gameId}`, JSON.stringify(state));
    }

    setStatus({ type: 'success', message: 'Move undone' });
  };

  // Execute move on robot
  const executeOnRobot = async () => {
    if (!lastMove) {
      setStatus({ type: 'error', message: 'No move to execute. Make a move first!' });
      return;
    }

    setExecutingOnRobot(true);
    setStatus({ type: 'info', message: 'Executing move on robot...' });

    try {
      const normalizedUrl = robot.control_api_url.replace(/\/+$/, '');
      const response = await fetch(`${normalizedUrl}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: {
            x: lastMove.from.row,
            y: lastMove.from.col
          },
          to: {
            x: lastMove.to.row,
            y: lastMove.to.col
          },
          action: lastMove.captured ? 'capture' : 'move'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'Robot executed move successfully!' });
      } else {
        setStatus({ type: 'error', message: `Robot error: ${data.detail || 'Unknown error'}` });
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: `Connection failed: ${error.message}` });
    } finally {
      setExecutingOnRobot(false);
    }
  };

  // Auto-dismiss status
  useEffect(() => {
    if (status && status.type === 'success') {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Cleanup Stockfish
  useEffect(() => {
    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
      }
    };
  }, []);

  // Game mode selection modal
  if (gameMode === null) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-2xl w-full"
        >
          <h2 className="text-3xl font-bold text-white mb-2 text-center font-mono">CHESS GAME MODE</h2>
          <p className="text-gray-400 text-center mb-8">Choose how you want to play</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player vs Player */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => initializeGame('pvp')}
              className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/40 hover:border-purple-500/60 rounded-xl p-8 text-left transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-10 h-10 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <h3 className="text-2xl font-bold text-white font-mono">PLAYER VS PLAYER</h3>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Play against another human player. Share a link with your opponent to start the game.
              </p>
              <div className="flex items-center gap-2 text-purple-400 text-sm font-mono">
                <Share2 size={16} />
                <span>Shareable Link</span>
              </div>
            </motion.button>

            {/* Player vs AI */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => initializeGame('ai')}
              className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-2 border-emerald-500/40 hover:border-emerald-500/60 rounded-xl p-8 text-left transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <Cpu className="w-10 h-10 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                <h3 className="text-2xl font-bold text-white font-mono">PLAYER VS AI</h3>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Challenge Stockfish AI at 1200 ELO rating. Perfect for practice and learning.
              </p>
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-mono">
                <Activity size={16} />
                <span>~1200 ELO Strength</span>
              </div>
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Stream - Full Width */}
      {robot.video_stream_url && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <Video className="text-neon-cyan" size={20} />
            <h3 className="text-white font-bold text-lg font-mono">ROBOT CAMERA - LIVE FEED</h3>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
              <span className="text-sm text-red-400 font-mono">LIVE</span>
            </div>
          </div>
          <div className="bg-black rounded-lg overflow-hidden border border-white/10" style={{ height: '500px' }}>
            <iframe
              src={robot.video_stream_url}
              className="w-full h-full"
              style={{ border: 'none' }}
              title="Robot camera feed"
              allow="autoplay; fullscreen; picture-in-picture; camera; microphone"
              allowFullScreen
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              loading="eager"
            />
          </div>
        </div>
      )}

      {/* Main Game Area */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Left Panel: Controls */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-white font-bold text-lg font-mono">CONTROL PANEL</h3>
            <div className="mt-2 flex items-center gap-2">
              {gameMode === 'pvp' ? (
                <>
                  <Users size={14} className="text-purple-400" />
                  <span className="text-xs text-purple-400 font-mono">MULTIPLAYER</span>
                </>
              ) : (
                <>
                  <Cpu size={14} className="text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-mono">VS AI (1200)</span>
                </>
              )}
            </div>
          </div>

        {/* Share Link for Multiplayer */}
        {gameMode === 'pvp' && shareLink && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Share2 size={14} className="text-purple-400" />
              <p className="text-xs text-purple-400 font-mono uppercase">Share with Opponent</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-xs font-mono"
              />
              <button
                onClick={copyShareLink}
                className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded px-3 py-1 text-purple-300 transition-all"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Current Turn */}
        <div className="bg-black/30 rounded-lg p-4 border border-white/5">
          <p className="text-xs text-gray-500 mb-2 font-mono uppercase">Current Turn</p>
          <div className={`px-4 py-2 rounded-lg text-center font-mono font-bold border ${
            currentTurn === 'w'
              ? 'bg-white/10 text-white border-white/20'
              : 'bg-black/40 text-gray-300 border-gray-700'
          }`}>
            {currentTurn === 'w' ? 'WHITE' : 'BLACK'}
            {gameMode === 'ai' && currentTurn === 'b' && aiThinking && (
              <span className="block text-xs text-emerald-400 mt-1">AI Thinking...</span>
            )}
          </div>
        </div>

        {/* Selected Piece */}
        <div className="bg-black/30 rounded-lg p-4 border border-white/5">
          <p className="text-xs text-gray-500 mb-2 font-mono uppercase">Selected Piece</p>
          <p className="text-white font-mono text-sm">
            {selectedSquare && board[selectedSquare.row][selectedSquare.col]
              ? `${getPieceName(board[selectedSquare.row][selectedSquare.col])} at ${getSquareName(selectedSquare.row, selectedSquare.col)}`
              : 'None'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={executeOnRobot}
            disabled={!lastMove || executingOnRobot}
            className="w-full bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/40 rounded-lg px-4 py-3 text-neon-cyan font-mono font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {executingOnRobot ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Executing...
              </>
            ) : (
              <>
                <Play size={18} />
                Execute on Robot
              </>
            )}
          </button>

          <button
            onClick={resetBoard}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white font-mono transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Reset Board
          </button>

          <button
            onClick={undoLastMove}
            disabled={!lastMove}
            className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg px-4 py-3 text-red-400 font-mono transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={18} />
            Undo Move
          </button>
        </div>

        {/* Move History */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-neon-cyan" />
            <p className="text-xs text-gray-500 font-semibold uppercase font-mono">Move History</p>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {moveHistory.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4 font-mono">No moves yet</p>
            ) : (
              moveHistory.map((move, index) => (
                <div key={index} className="bg-black/30 rounded p-2 text-xs border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-neon-cyan font-mono font-bold">#{moveHistory.length - index}</span>
                    <span className="text-gray-500 font-mono text-xs">
                      {ensureDate(move.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-white font-mono text-xs">
                    {getPieceName(move.piece)}: {getSquareName(move.from.row, move.from.col)} → {getSquareName(move.to.row, move.to.col)}
                  </div>
                  {move.captured && (
                    <div className="text-red-400 text-xs mt-1 font-mono">
                      ⚔️ {getPieceName(move.captured)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Center: Chess Board */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2 font-mono">INTERACTIVE CHESS BOARD</h2>
          <p className="text-gray-400 text-sm">Click pieces to select, then click valid squares to move</p>
        </div>

        {/* Status Message */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-3 ${
                status.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                status.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                'bg-blue-500/10 border border-blue-500/20 text-blue-400'
              }`}
            >
              <AlertCircle size={18} />
              <span className="text-sm font-mono">{status.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chessboard */}
        <div className="relative max-w-[600px] mx-auto">
          <div className="flex justify-around px-6 mb-2">
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(file => (
              <div key={file} className="text-gray-500 font-mono text-sm w-[12.5%] text-center">
                {file}
              </div>
            ))}
          </div>

          <div className="flex">
            <div className="flex flex-col justify-around pr-2">
              {['8', '7', '6', '5', '4', '3', '2', '1'].map(rank => (
                <div key={rank} className="text-gray-500 font-mono text-sm h-[12.5%] flex items-center">
                  {rank}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-8 gap-0 border-4 border-gray-800 rounded-lg overflow-hidden shadow-2xl">
              {board.map((row, rowIndex) =>
                row.map((piece, colIndex) => {
                  const isLight = (rowIndex + colIndex) % 2 === 0;
                  const isSelected = selectedSquare?.row === rowIndex && selectedSquare?.col === colIndex;
                  const isValidMoveSquare = validMoves.some(m => m.row === rowIndex && m.col === colIndex);
                  const isCapture = isValidMoveSquare && board[rowIndex][colIndex];

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      className={`
                        aspect-square flex items-center justify-center text-5xl cursor-pointer transition-all relative
                        ${isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
                        ${isSelected ? 'ring-4 ring-inset ring-neon-cyan' : ''}
                        hover:brightness-90
                      `}
                    >
                      {piece && (
                        <span className="select-none pointer-events-none">
                          {PIECES[piece as keyof typeof PIECES]}
                        </span>
                      )}

                      {isValidMoveSquare && !isCapture && (
                        <div className="absolute w-[30%] h-[30%] bg-neon-cyan/50 rounded-full" />
                      )}

                      {isCapture && (
                        <div className="absolute inset-2 border-4 border-red-500/70 rounded-full" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-black/30 rounded-lg p-4 text-center border border-white/5">
            <Hash size={16} className="text-neon-cyan mx-auto mb-2" />
            <p className="text-xs text-gray-500 mb-1 font-mono">MOVES</p>
            <p className="text-2xl font-bold text-white font-mono">{moveHistory.length}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-4 text-center border border-white/5">
            <Activity size={16} className="text-neon-cyan mx-auto mb-2" />
            <p className="text-xs text-gray-500 mb-1 font-mono">CAPTURES</p>
            <p className="text-2xl font-bold text-white font-mono">
              {moveHistory.filter(m => m.captured).length}
            </p>
          </div>
          <div className="bg-black/30 rounded-lg p-4 text-center border border-white/5">
            <Clock size={16} className="text-neon-cyan mx-auto mb-2" />
            <p className="text-xs text-gray-500 mb-1 font-mono">TIME</p>
            <p className="text-lg font-bold text-white font-mono">
              {moveHistory.length > 0
                ? Math.floor((Date.now() - ensureDate(moveHistory[moveHistory.length - 1].timestamp).getTime()) / 60000) + 'm'
                : '0m'}
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
