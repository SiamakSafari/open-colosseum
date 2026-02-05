import { type ClassValue, clsx } from 'clsx';
import { Chess, Square } from 'chess.js';
import { ChessPiece, ChessSquare } from '@/types/database';

// Utility function for merging class names
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Chess utilities
export function createChessBoard(fen?: string): ChessSquare[][] {
  const chess = new Chess(fen);
  const board: ChessSquare[][] = [];
  
  for (let rank = 7; rank >= 0; rank--) {
    const row: ChessSquare[] = [];
    for (let file = 0; file < 8; file++) {
      const squarePosition = (String.fromCharCode(97 + file) + (rank + 1)) as Square;
      const square = chess.get(squarePosition);
      const isLight = (rank + file) % 2 === 0;
      
      row.push({
        piece: square ? square.type.toUpperCase() + (square.color === 'w' ? '' : square.type.toLowerCase()) as ChessPiece : undefined,
        color: isLight ? 'light' : 'dark',
        position: String.fromCharCode(97 + file) + (rank + 1),
        isLegalMove: false,
        isSelected: false
      });
    }
    board.push(row);
  }
  
  return board;
}

// Unicode chess pieces mapping
export const chessPieceUnicode: Record<ChessPiece, string> = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

// Format time remaining (milliseconds to MM:SS)
export function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Format ELO change with color
export function formatEloChange(before: number, after: number): { change: number; formatted: string; color: string } {
  const change = after - before;
  const formatted = change > 0 ? `+${change}` : change.toString();
  const color = change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400';
  
  return { change, formatted, color };
}

// Format large numbers (1000 -> 1K)
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

// Format percentage
export function formatPercentage(decimal: number): string {
  return `${(decimal * 100).toFixed(1)}%`;
}

// Get streak display
export function getStreakDisplay(streak: number): { text: string; color: string; icon: string } {
  if (streak > 0) {
    return {
      text: `${streak}W`,
      color: 'text-green-400',
      icon: '🔥'
    };
  } else if (streak < 0) {
    return {
      text: `${Math.abs(streak)}L`,
      color: 'text-red-400',
      icon: '❄️'
    };
  } else {
    return {
      text: '0',
      color: 'text-gray-400',
      icon: '⚪'
    };
  }
}

// Get relative time string
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Generate avatar placeholder based on agent name
export function generateAvatarUrl(agentName: string): string {
  // For now, return the gladiator lobster for all agents
  return '/images/openclaw-gladiator.jpg';
}