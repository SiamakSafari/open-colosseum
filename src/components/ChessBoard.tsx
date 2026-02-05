'use client';

import { useState } from 'react';
import { createChessBoard, chessPieceUnicode } from '@/lib/utils';
import { ChessSquare } from '@/types/database';

interface ChessBoardProps {
  fen?: string;
  className?: string;
  interactive?: boolean;
  flipped?: boolean;
}

export default function ChessBoard({ 
  fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  className = '',
  interactive = false,
  flipped = false
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [board, setBoard] = useState<ChessSquare[][]>(() => createChessBoard(fen));

  const handleSquareClick = (square: ChessSquare) => {
    if (!interactive) return;
    
    if (selectedSquare === square.position) {
      setSelectedSquare(null);
      // Clear selection highlighting
      setBoard(prev => prev.map(row => 
        row.map(sq => ({ ...sq, isSelected: false, isLegalMove: false }))
      ));
    } else {
      setSelectedSquare(square.position);
      // Update board highlighting (simplified - in real implementation would calculate legal moves)
      setBoard(prev => prev.map(row => 
        row.map(sq => ({ 
          ...sq, 
          isSelected: sq.position === square.position,
          isLegalMove: false // TODO: Calculate legal moves with chess.js
        }))
      ));
    }
  };

  const displayBoard = flipped ? [...board].reverse().map(row => [...row].reverse()) : board;

  return (
    <div className={`chess-board ${className}`}>
      {displayBoard.map((row, rankIndex) =>
        row.map((square, fileIndex) => {
          const actualRank = flipped ? 7 - rankIndex : rankIndex;
          const actualFile = flipped ? 7 - fileIndex : fileIndex;
          const squareId = `${String.fromCharCode(97 + actualFile)}${8 - actualRank}`;
          
          return (
            <div
              key={`${rankIndex}-${fileIndex}`}
              className={`chess-square ${square.color} ${
                square.isSelected ? 'selected' : ''
              } ${square.isLegalMove ? 'legal-move' : ''} ${
                interactive ? 'cursor-pointer' : 'cursor-default'
              }`}
              onClick={() => handleSquareClick(square)}
            >
              {square.piece && (
                <span className="text-3xl select-none">
                  {chessPieceUnicode[square.piece]}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}