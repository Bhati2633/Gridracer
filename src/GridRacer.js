import React, { useState, useEffect } from 'react';

const DEFAULT_GRID_SIZE = 10;
const MIN_GRID_SIZE = 4;
const MAX_GRID_SIZE = 10;

const createGrid = (size) => {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      row,
      col,
      type: Math.random() < 0.2 ? 'building' : 'road',
      weight: Math.floor(Math.random() * 5) + 1,
    }))
  );
};

const neighbors = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

const dijkstra = (grid, start, end) => {
  const size = grid.length;
  const dist = Array(size).fill(null).map(() => Array(size).fill(Infinity));
  const visited = Array(size).fill(null).map(() => Array(size).fill(false));
  const prev = Array(size).fill(null).map(() => Array(size).fill(null));

  dist[start.row][start.col] = 0;

  for (let count = 0; count < size * size; count++) {
    let minDist = Infinity;
    let u = null;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!visited[r][c] && dist[r][c] < minDist && grid[r][c].type !== 'building') {
          minDist = dist[r][c];
          u = { row: r, col: c };
        }
      }
    }

    if (!u) break;
    visited[u.row][u.col] = true;

    for (const [dr, dc] of neighbors) {
      const nr = u.row + dr;
      const nc = u.col + dc;
      if (
        nr >= 0 && nr < size &&
        nc >= 0 && nc < size &&
        !visited[nr][nc] &&
        grid[nr][nc].type !== 'building'
      ) {
        const alt = dist[u.row][u.col] + grid[nr][nc].weight;
        if (alt < dist[nr][nc]) {
          dist[nr][nc] = alt;
          prev[nr][nc] = u;
        }
      }
    }
  }

  const path = [];
  let curr = end;
  while (curr) {
    path.unshift(curr);
    curr = prev[curr.row][curr.col];
  }
  return path;
};

export default function GridRacer() {
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [grid, setGrid] = useState(createGrid(DEFAULT_GRID_SIZE));
  const [userPath, setUserPath] = useState([]);
  const [bestPath, setBestPath] = useState([]);
  const [showBest, setShowBest] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [userScore, setUserScore] = useState(null);
  const [bestScore, setBestScore] = useState(null);

  const start = { row: 0, col: 0 };
  const end = { row: gridSize - 1, col: gridSize - 1 };

  useEffect(() => {
    const newPath = dijkstra(grid, start, end);
    setBestPath(newPath);
    const weightSum = newPath.reduce((sum, cell) => sum + grid[cell.row][cell.col].weight, 0);
    setBestScore(100 - weightSum);
  }, [grid]);

  const handleSizeChange = (e) => {
    let value = parseInt(e.target.value);
    if (value >= MIN_GRID_SIZE && value <= MAX_GRID_SIZE) {
      setGridSize(value);
      const newGrid = createGrid(value);
      setGrid(newGrid);
      setUserPath([]);
      setShowBest(false);
      setUserScore(null);
      setBestScore(null);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 2) {
      e.preventDefault();
      setIsSelecting(true);
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const handleCellEnter = (row, col) => {
    if (isSelecting) {
      const cell = grid[row][col];
      if (cell.type === 'road') {
        setUserPath(prev => {
          if (!prev.some(p => p.row === row && p.col === col)) {
            return [...prev, { row, col }];
          }
          return prev;
        });
      }
    }
  };

  const calculateUserScore = () => {
    const weightSum = userPath.reduce((sum, cell) => sum + grid[cell.row][cell.col].weight, 0);
    setUserScore(100 - weightSum);
  };

  const resetUserPath = () => {
    setUserPath([]);
    setShowBest(false);
    setUserScore(null);
    setBestScore(null);
    setGrid(createGrid(gridSize));
  };

  return (
    <div
      style={{ padding: '20px' }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <h1>GridRacer: Optimize the Fastest Delivery Path!</h1>
      <div>
        <label>Select Grid Size (4 to 10): </label>
        <input
          type="number"
          value={gridSize}
          min={MIN_GRID_SIZE}
          max={MAX_GRID_SIZE}
          onChange={handleSizeChange}
        />
      </div>
      <p><strong>Instruction:</strong> Hold right-click and drag over cells to draw your path. Then check its score!</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, 30px)`, gap: '2px' }}>
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const inUserPath = userPath.some(p => p.row === rowIndex && p.col === colIndex);
            const inBestPath = bestPath.some(p => p.row === rowIndex && p.col === colIndex);
            const isStart = rowIndex === start.row && colIndex === start.col;
            const isEnd = rowIndex === end.row && colIndex === end.col;

            let bgColor = cell.type === 'building' ? '#444' : 'lightgray';
            if (inUserPath) bgColor = 'skyblue';
            if (showBest && inBestPath) bgColor = 'limegreen';
            if (isStart) bgColor = 'blue';
            if (isEnd) bgColor = 'red';

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onMouseEnter={() => handleCellEnter(rowIndex, colIndex)}
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  border: '1px solid #ccc',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {cell.type === 'road' ? cell.weight : ''}
              </div>
            );
          })
        )}
      </div>
      <div style={{ marginTop: '20px' }}>
        <button onClick={resetUserPath}>Reset Grid</button>
        <button onClick={() => setShowBest(true)} style={{ marginLeft: '10px' }}>Show Best Path</button>
        <button onClick={calculateUserScore} style={{ marginLeft: '10px' }}>Check My Path Score</button>
      </div>
      <div style={{ marginTop: '10px' }}>
        {userScore !== null && <p><strong>Your Path Score:</strong> {userScore}</p>}
        {showBest && bestScore !== null && <p><strong>Best Path Score:</strong> {bestScore}</p>}
      </div>
    </div>
  );
}
