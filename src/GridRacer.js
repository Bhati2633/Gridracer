import React, { useState, useEffect } from 'react';

const GRID_SIZE = 10;

const createGrid = () => {
  return Array.from({ length: GRID_SIZE }, (_, row) =>
    Array.from({ length: GRID_SIZE }, (_, col) => ({
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
  const dist = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(Infinity));
  const visited = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
  const prev = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

  dist[start.row][start.col] = 0;

  for (let count = 0; count < GRID_SIZE * GRID_SIZE; count++) {
    let minDist = Infinity;
    let u = null;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
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
        nr >= 0 && nr < GRID_SIZE &&
        nc >= 0 && nc < GRID_SIZE &&
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

const levels = [
  { start: { row: 0, col: 0 }, end: { row: 9, col: 9 } },
  { start: { row: 2, col: 2 }, end: { row: 7, col: 7 } },
];

export default function GridRacer() {
  const [grid, setGrid] = useState(createGrid());
  const [userPath, setUserPath] = useState([]);
  const [bestPath, setBestPath] = useState([]);
  const [showBest, setShowBest] = useState(false);
  const [level, setLevel] = useState(0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [score, setScore] = useState(null);

  const start = levels[level].start;
  const end = levels[level].end;

  useEffect(() => {
    const interval = setInterval(() => {
      setGrid(prevGrid =>
        prevGrid.map(row =>
          row.map(cell => ({
            ...cell,
            weight: cell.type === 'road' ? Math.floor(Math.random() * 5) + 1 : cell.weight,
          }))
        )
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const newPath = dijkstra(grid, start, end);
    setBestPath(newPath);
  }, [grid, level]);

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
    setScore(100 - weightSum);
  };

  const resetUserPath = () => {
    setUserPath([]);
    setShowBest(false);
    setScore(null);
  };

  return (
    <div
      style={{ padding: '20px' }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <h1>GridRacer: Optimize the Fastest Delivery Path!</h1>
      <p><strong>Level:</strong> {level + 1}</p>
      <p><strong>Instruction:</strong> Hold right-click and drag over cells to draw your path. Then check its score!</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, 30px)`, gap: '2px' }}>
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
        <button onClick={resetUserPath}>Reset Path</button>
        <button onClick={() => setShowBest(true)} style={{ marginLeft: '10px' }}>Show Best Path</button>
        <button onClick={() => setLevel((prev) => (prev + 1) % levels.length)} style={{ marginLeft: '10px' }}>Next Level</button>
        <button onClick={calculateUserScore} style={{ marginLeft: '10px' }}>Check My Path Score</button>
      </div>
      <div style={{ marginTop: '10px' }}>
        {score !== null && (
          <p><strong>Your Path Score:</strong> {score}</p>
        )}
      </div>
    </div>
  );
}
