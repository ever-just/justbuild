"use client";

import { useState, useCallback } from "react";

type Player = 1 | 2;
type Cell = 0 | Player;
type Board = Cell[][];

const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER1 = 1;
const PLAYER2 = 2;

export default function Connect4() {
  const [board, setBoard] = useState<Board>(() => 
    Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>(PLAYER1);
  const [winner, setWinner] = useState<Player | null>(null);
  const [isDraw, setIsDraw] = useState(false);

  const checkWinner = useCallback((board: Board, row: number, col: number, player: Player): boolean => {
    // Check horizontal
    let count = 0;
    for (let c = 0; c < COLS; c++) {
      if (board[row][c] === player) {
        count++;
        if (count === 4) return true;
      } else {
        count = 0;
      }
    }

    // Check vertical
    count = 0;
    for (let r = 0; r < ROWS; r++) {
      if (board[r][col] === player) {
        count++;
        if (count === 4) return true;
      } else {
        count = 0;
      }
    }

    // Check diagonal (top-left to bottom-right)
    const startRow1 = Math.max(0, row - col);
    const startCol1 = Math.max(0, col - row);
    count = 0;
    for (let i = 0; i < Math.min(ROWS - startRow1, COLS - startCol1); i++) {
      if (board[startRow1 + i][startCol1 + i] === player) {
        count++;
        if (count === 4) return true;
      } else {
        count = 0;
      }
    }

    // Check diagonal (top-right to bottom-left)
    const startRow2 = Math.max(0, row - (COLS - 1 - col));
    const startCol2 = Math.min(COLS - 1, col + row);
    count = 0;
    for (let i = 0; i < Math.min(ROWS - startRow2, startCol2 + 1); i++) {
      if (board[startRow2 + i][startCol2 - i] === player) {
        count++;
        if (count === 4) return true;
      } else {
        count = 0;
      }
    }

    return false;
  }, []);

  const checkDraw = useCallback((board: Board): boolean => {
    return board[0].every(cell => cell !== EMPTY);
  }, []);

  const dropPiece = useCallback((col: number) => {
    if (winner || isDraw || board[0][col] !== EMPTY) return;

    const newBoard = board.map(row => [...row]);
    
    // Find the lowest empty row in the column
    let row = ROWS - 1;
    while (row >= 0 && newBoard[row][col] !== EMPTY) {
      row--;
    }

    if (row < 0) return;

    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    if (checkWinner(newBoard, row, col, currentPlayer)) {
      setWinner(currentPlayer);
    } else if (checkDraw(newBoard)) {
      setIsDraw(true);
    } else {
      setCurrentPlayer(currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1);
    }
  }, [board, currentPlayer, winner, isDraw, checkWinner, checkDraw]);

  const resetGame = useCallback(() => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY)));
    setCurrentPlayer(PLAYER1);
    setWinner(null);
    setIsDraw(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold text-white mb-8">Connect 4</h1>
      
      <div className="mb-6 text-center">
        {winner ? (
          <p className="text-2xl font-semibold text-white">
            Player {winner} ({winner === PLAYER1 ? "Red" : "Yellow"}) wins!
          </p>
        ) : isDraw ? (
          <p className="text-2xl font-semibold text-white">It&apos;s a draw!</p>
        ) : (
          <p className="text-xl text-white">
            Current player: {currentPlayer === PLAYER1 ? "Red" : "Yellow"}
          </p>
        )}
      </div>

      <div className="bg-blue-600 p-4 rounded-xl shadow-2xl">
        <div className="grid grid-cols-7 gap-2">
          {board.map((row, rowIndex) => 
            row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => dropPiece(colIndex)}
                className="w-16 h-16 bg-blue-800 rounded-full relative overflow-hidden hover:bg-blue-700 transition-colors"
                disabled={winner !== null || isDraw}
              >
                <div
                  className={`absolute inset-2 rounded-full transition-all duration-300 ${
                    cell === PLAYER1
                      ? "bg-red-500 shadow-inner"
                      : cell === PLAYER2
                      ? "bg-yellow-400 shadow-inner"
                      : "bg-blue-900"
                  }`}
                />
              </button>
            ))
          )}
        </div>
      </div>

      <button
        onClick={resetGame}
        className="mt-8 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg"
      >
        New Game
      </button>

      <a
        href="/"
        className="mt-4 text-blue-300 hover:text-blue-400 transition-colors"
      >
        ← Back to EverJust UI
      </a>
    </div>
  );
}