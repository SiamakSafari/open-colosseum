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

const fileLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const rankLabels = ['8', '7', '6', '5', '4', '3', '2', '1'];

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
      setBoard(prev => prev.map(row => 
        row.map(sq => ({ ...sq, isSelected: false, isLegalMove: false }))
      ));
    } else {
      setSelectedSquare(square.position);
      setBoard(prev => prev.map(row => 
        row.map(sq => ({ 
          ...sq, 
          isSelected: sq.position === square.position,
          isLegalMove: false
        }))
      ));
    }
  };

  const displayBoard = flipped ? [...board].reverse().map(row => [...row].reverse()) : board;
  const displayFiles = flipped ? [...fileLabels].reverse() : fileLabels;
  const displayRanks = flipped ? [...rankLabels].reverse() : rankLabels;

  return (
    <div className={`relative ${className}`}>
      {/* Rank labels (left side) */}
      <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-around">
        {displayRanks.map(rank => (
          <span key={rank} className="text-[10px] text-gray-500 font-mono leading-none">
            {rank}
          </span>
        ))}
      </div>

      {/* The board */}
      <div className="chess-board">
        {displayBoard.map((row, rankIndex) =>
          row.map((square, fileIndex) => {
            const actualRank = flipped ? 7 - rankIndex : rankIndex;
            const actualFile = flipped ? 7 - fileIndex : fileIndex;
            
            return (
              <div
                key={`${actualRank}-${actualFile}`}
                className={`chess-square ${square.color} ${
                  square.isSelected ? 'selected' : ''
                } ${square.isLegalMove ? 'legal-move' : ''} ${
                  interactive ? 'cursor-pointer' : 'cursor-default'
                }`}
                onClick={() => handleSquareClick(square)}
              >
                {square.piece && (
                  <span className="chess-piece select-none">
                    {chessPieceUnicode[square.piece]}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* File labels (bottom) */}
      <div className="flex justify-around mt-1 px-0">
        {displayFiles.map(file => (
          <span key={file} className="text-[10px] text-gray-500 font-mono">
            {file}
          </span>
        ))}
      </div>
    </div>
  );
}
