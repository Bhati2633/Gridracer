import React, { useState, useEffect, useRef } from 'react';

const LEVELS = [
  { size: 4, buildingDensity: 0.1, weightRange: [1, 3] },
  { size: 6, buildingDensity: 0.15, weightRange: [1, 4] },
  { size: 8, buildingDensity: 0.2, weightRange: [1, 5] },
  { size: 10, buildingDensity: 0.25, weightRange: [1, 6] }
];

const CELL_SIZE = 40;

const createGrid = (size, buildingDensity, weightRange) => {
  const grid = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      row,
      col,
      type: Math.random() < buildingDensity ? 'building' : 'road',
      weight: Math.floor(Math.random() * (weightRange[1] - weightRange[0] + 1)) + weightRange[0],
    }))
  );
  grid[size - 1][size - 1].type = 'road';
  return grid;
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
  const explored = [];

  dist[start.row][start.col] = grid[start.row][start.col].weight;

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

    if (!u || (u.row === end.row && u.col === end.col)) break;
    visited[u.row][u.col] = true;
    explored.push({ ...u });

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
  while (curr && !(curr.row === start.row && curr.col === start.col)) {
    path.unshift(curr);
    curr = prev[curr.row][curr.col];
  }
  path.unshift(start);
  return { path, explored };
};

export default function GridRacer() {
  const [level, setLevel] = useState(0);
  const [grid, setGrid] = useState(() => createGrid(
    LEVELS[0].size,
    LEVELS[0].buildingDensity,
    LEVELS[0].weightRange
  ));
  const [userPath, setUserPath] = useState([]);
  const [pathHistory, setPathHistory] = useState([]);
  const [bestPath, setBestPath] = useState([]);
  const [exploredNodes, setExploredNodes] = useState([]);
  const [animatedStep, setAnimatedStep] = useState(-1);
  const [showBest, setShowBest] = useState(false);
  const [liveScore, setLiveScore] = useState(0);
  const [bestWeightSum, setBestWeightSum] = useState(null);
  const [isValidPath, setIsValidPath] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const animationRef = useRef(null);

  const currentLevel = LEVELS[level];
  const start = { row: 0, col: 0 };
  const end = { row: currentLevel.size - 1, col: currentLevel.size - 1 };

  useEffect(() => {
    const { path, explored } = dijkstra(grid, start, end);
    setBestPath(path);
    setExploredNodes(explored);
    setAnimatedStep(-1);
    const weightSum = path.reduce((sum, cell) => sum + grid[cell.row][cell.col].weight, 0);
    setBestWeightSum(weightSum);
  }, [grid, level]);

  useEffect(() => {
    const weightSum = userPath.reduce((sum, cell) => sum + grid[cell.row][cell.col].weight, 0);
    setLiveScore(weightSum);

    if (userPath.length > 0) {
      const firstCell = userPath[0];
      const lastCell = userPath[userPath.length - 1];
      const startsCorrectly = firstCell.row === start.row && firstCell.col === start.col;
      const endsCorrectly = lastCell.row === end.row && lastCell.col === end.col;

      let isContinuous = true;
      for (let i = 1; i < userPath.length; i++) {
        const prevCell = userPath[i - 1];
        const currCell = userPath[i];
        const rowDiff = Math.abs(prevCell.row - currCell.row);
        const colDiff = Math.abs(prevCell.col - currCell.col);
        if (rowDiff + colDiff !== 1) {
          isContinuous = false;
          break;
        }
      }

      setIsValidPath(startsCorrectly && endsCorrectly && isContinuous);
    } else {
      setIsValidPath(false);
    }
  }, [userPath]);

  const startAnimation = () => {
    if (animationRef.current) clearInterval(animationRef.current);
    setAnimatedStep(0);
    animationRef.current = setInterval(() => {
      setAnimatedStep(prev => {
        if (prev >= exploredNodes.length - 1) {
          clearInterval(animationRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 100);
  };

  const handleLevelChange = (newLevel) => {
    setLevel(newLevel);
    const levelConfig = LEVELS[newLevel];
    const newGrid = createGrid(
      levelConfig.size,
      levelConfig.buildingDensity,
      levelConfig.weightRange
    );
    setGrid(newGrid);
    setUserPath([]);
    setPathHistory([]);
    setShowBest(false);
    setLiveScore(0);
    setAnimatedStep(-1);
    setBestWeightSum(null);
    setIsValidPath(false);
    clearInterval(animationRef.current);
  };

  const handleMouseDown = (e, row, col) => {
    if (e.button === 2) {
      e.preventDefault();
      setIsSelecting(true);
      setPathHistory([...pathHistory, userPath]);
      handleCellEnter(row, col);
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const handleCellEnter = (row, col) => {
    if (isSelecting) {
      const cell = grid[row][col];
      const isEndCell = row === end.row && col === end.col;
      if (cell.type === 'road' || isEndCell) {
        setUserPath(prev => {
          const last = prev[prev.length - 1];
          const isAdjacent = !last || (Math.abs(last.row - row) + Math.abs(last.col - col) === 1);
          const alreadySelected = prev.some(p => p.row === row && p.col === col);
          if (isAdjacent && !alreadySelected) {
            return [...prev, { row, col }];
          }
          return prev;
        });
      }
    }
  };

  const undoLastStep = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1];
      setUserPath(previousPath);
      setPathHistory(pathHistory.slice(0, -1));
    }
  };

  const regenerateGrid = () => {
    const newGrid = createGrid(
      currentLevel.size,
      currentLevel.buildingDensity,
      currentLevel.weightRange
    );
    setGrid(newGrid);
    setUserPath([]);
    setPathHistory([]);
    setShowBest(false);
    setLiveScore(0);
    setIsValidPath(false);
    clearInterval(animationRef.current);
  };

  return (
    <div style={{ width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1>GridRacer: Learn Dijkstra's Algorithm</h1>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${currentLevel.size}, ${CELL_SIZE}px)`, gap: '2px', marginBottom: '1rem' }}>
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const inUserPath = userPath.some(p => p.row === rowIndex && p.col === colIndex);
            const inBestPath = showBest && bestPath.some(p => p.row === rowIndex && p.col === colIndex);
            const isExplored = animatedStep >= 0 && exploredNodes.slice(0, animatedStep + 1).some(p => p.row === rowIndex && p.col === colIndex);
            const isCurrent = animatedStep >= 0 && exploredNodes[animatedStep]?.row === rowIndex && exploredNodes[animatedStep]?.col === colIndex;
            const isStart = rowIndex === start.row && colIndex === start.col;
            const isEnd = rowIndex === end.row && colIndex === end.col;

            let bgColor = cell.type === 'building' ? '#444' : 'lightgray';
            if (inUserPath) bgColor = 'skyblue';
            if (inBestPath) bgColor = 'limegreen';
            if (isExplored) bgColor = 'yellow';
            if (isCurrent) bgColor = 'orange';
            if (isStart) bgColor = 'blue';
            if (isEnd) bgColor = 'red';

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onMouseDown={(e) => handleMouseDown(e, rowIndex, colIndex)}
                onMouseEnter={() => handleCellEnter(rowIndex, colIndex)}
                style={{
                  width: `${CELL_SIZE}px`,
                  height: `${CELL_SIZE}px`,
                  backgroundColor: bgColor,
                  border: '1px solid #ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: cell.type === 'building' ? 'white' : 'black',
                }}
              >
                {cell.type === 'road' ? cell.weight : 'X'}
              </div>
            );
          })
        )}
      </div>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={regenerateGrid}>New Grid</button>
        <button onClick={undoLastStep} style={{ marginLeft: '10px' }}>Undo</button>
        <button onClick={() => setShowBest(!showBest)} style={{ marginLeft: '10px' }}>Show Best Path</button>
        <button onClick={startAnimation} style={{ marginLeft: '10px' }}>Start Step-by-Step</button>
      </div>
      <p><strong>Current Weight:</strong> {liveScore}</p>
      {bestWeightSum !== null && <p><strong>Optimal Weight:</strong> {bestWeightSum}</p>}
    </div>
  );
}
