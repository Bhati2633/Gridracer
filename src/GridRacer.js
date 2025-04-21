import React, { useState, useEffect } from 'react';

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
  [0, 1], [1, 0], [0, -1], [-1, 0],
];

const dijkstra = (grid, start, end) => {
  const size = grid.length;
  const dist = Array(size).fill(null).map(() => Array(size).fill(Infinity));
  const visited = Array(size).fill(null).map(() => Array(size).fill(false));
  const prev = Array(size).fill(null).map(() => Array(size).fill(null));
  const steps = [];

  dist[start.row][start.col] = grid[start.row][start.col].weight;
  steps.push({
    visited: JSON.parse(JSON.stringify(visited)),
    dist: JSON.parse(JSON.stringify(dist)),
    current: null,
    neighbors: [],
    path: []
  });

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
    const currentNeighbors = [];
    
    for (const [dr, dc] of neighbors) {
      const nr = u.row + dr;
      const nc = u.col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc] && grid[nr][nc].type !== 'building') {
        currentNeighbors.push({ row: nr, col: nc });
        const alt = dist[u.row][u.col] + grid[nr][nc].weight;
        if (alt < dist[nr][nc]) {
          dist[nr][nc] = alt;
          prev[nr][nc] = u;
        }
      }
    }
    
    // Calculate current path to end (if reachable)
    let currentPath = [];
    if (dist[end.row][end.col] < Infinity) {
      let curr = end;
      while (curr && !(curr.row === start.row && curr.col === start.col)) {
        currentPath.unshift(curr);
        curr = prev[curr.row][curr.col];
      }
      currentPath.unshift(start);
    }
    
    steps.push({
      visited: JSON.parse(JSON.stringify(visited)),
      dist: JSON.parse(JSON.stringify(dist)),
      current: u,
      neighbors: currentNeighbors,
      path: currentPath
    });

    if (u.row === end.row && u.col === end.col) break;
  }

  const path = [];
  let curr = end;
  while (curr && !(curr.row === start.row && curr.col === start.col)) {
    path.unshift(curr);
    curr = prev[curr.row][curr.col];
  }
  path.unshift(start);
  
  return { path, steps };
};

const getHighScore = (level) => {
  const scores = JSON.parse(localStorage.getItem('gridRacerHighScores') || '{}');
  return scores[level] || null;
};

const setHighScore = (level, weight) => {
  const scores = JSON.parse(localStorage.getItem('gridRacerHighScores') || '{}');
  if ((scores[level] === undefined) || weight < scores[level]) {
    scores[level] = weight;
    localStorage.setItem('gridRacerHighScores', JSON.stringify(scores));
    return true;
  }
  return false;
};

export default function GridRacer() {
  const [level, setLevel] = useState(0);
  const [grid, setGrid] = useState(() => createGrid(LEVELS[0].size, LEVELS[0].buildingDensity, LEVELS[0].weightRange));
  const [userPath, setUserPath] = useState([]);
  const [pathHistory, setPathHistory] = useState([]);
  const [bestPath, setBestPath] = useState([]);
  const [showBest, setShowBest] = useState(false);
  const [liveScore, setLiveScore] = useState(0);
  const [bestScore, setBestScore] = useState(null);
  const [bestWeightSum, setBestWeightSum] = useState(null);
  const [highScore, setHighScoreState] = useState(getHighScore(0));
  const [isValidPath, setIsValidPath] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dijkstraSteps, setDijkstraSteps] = useState([]);
  const [currentAnimationStep, setCurrentAnimationStep] = useState(0);
  const [showAlgorithmSteps, setShowAlgorithmSteps] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(500);

  const currentLevel = LEVELS[level];
  const start = { row: 0, col: 0 };
  const end = { row: currentLevel.size - 1, col: currentLevel.size - 1 };

  useEffect(() => {
    const { path, steps } = dijkstra(grid, start, end);
    setBestPath(path);
    setDijkstraSteps(steps);
    const weightSum = path.reduce((sum, cell) => sum + grid[cell.row][cell.col].weight, 0);
    setBestScore(Math.max(0, 100 - weightSum));
    setBestWeightSum(weightSum);
    setHighScoreState(getHighScore(level));
    setAnimationStep(0);
    setIsAnimating(false);
    setCurrentAnimationStep(0);
    setShowAlgorithmSteps(false);
    setAutoPlay(false);
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
        const prevCell = userPath[i-1];
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

  const animateBestPath = () => {
    setShowAlgorithmSteps(true);
    setCurrentAnimationStep(0);
    setIsAnimating(true);
    if (autoPlay) {
      const interval = setInterval(() => {
        setCurrentAnimationStep(prev => {
          if (prev >= dijkstraSteps.length - 1) {
            clearInterval(interval);
            setIsAnimating(false);
            return prev;
          }
          return prev + 1;
        });
      }, autoPlaySpeed);
      return () => clearInterval(interval);
    }
  };

  useEffect(() => {
    if (autoPlay && isAnimating && showAlgorithmSteps) {
      const interval = setInterval(() => {
        setCurrentAnimationStep(prev => {
          if (prev >= dijkstraSteps.length - 1) {
            clearInterval(interval);
            setIsAnimating(false);
            return prev;
          }
          return prev + 1;
        });
      }, autoPlaySpeed);
      return () => clearInterval(interval);
    }
  }, [autoPlay, isAnimating, showAlgorithmSteps, autoPlaySpeed, dijkstraSteps]);

  const handleNextStep = () => {
    if (currentAnimationStep < dijkstraSteps.length - 1) {
      setCurrentAnimationStep(prev => prev + 1);
    } else {
      setIsAnimating(false);
    }
  };

  const handlePrevStep = () => {
    if (currentAnimationStep > 0) {
      setCurrentAnimationStep(prev => prev - 1);
    }
  };

  const handleLevelChange = (newLevel) => {
    setLevel(newLevel);
    const levelConfig = LEVELS[newLevel];
    const newGrid = createGrid(levelConfig.size, levelConfig.buildingDensity, levelConfig.weightRange);
    setGrid(newGrid);
    setUserPath([]);
    setPathHistory([]);
    setShowBest(false);
    setLiveScore(0);
    setBestScore(null);
    setBestWeightSum(null);
    setHighScoreState(getHighScore(newLevel));
    setIsValidPath(false);
    setShowAlgorithmSteps(false);
    setAutoPlay(false);
  };

  const handleMouseDown = (e, row, col) => {
    if (e.button === 2) {
      e.preventDefault();
      setIsSelecting(true);
      setPathHistory([...pathHistory, userPath]);
      if (userPath.length === 0 && row === start.row && col === start.col) {
        setUserPath([{ row, col }]);
      } else {
        setUserPath([]);
      }
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

  const calculateFinalScore = () => {
    if (!isValidPath) return;
    const weightSum = userPath.reduce((sum, cell) => sum + grid[cell.row][cell.col].weight, 0);
    if (setHighScore(level, weightSum)) {
      setHighScoreState(weightSum);
    }
  };

  const resetUserPath = () => {
    setUserPath([]);
    setPathHistory([]);
    setShowBest(false);
    setLiveScore(0);
    setIsValidPath(false);
    setShowAlgorithmSteps(false);
  };

  const regenerateGrid = () => {
    const newGrid = createGrid(currentLevel.size, currentLevel.buildingDensity, currentLevel.weightRange);
    setGrid(newGrid);
    resetUserPath();
  };

  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
    if (!autoPlay && showAlgorithmSteps) {
      setIsAnimating(true);
    }
  };

  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: '20px' }}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <h1>GridRacer: Optimize the Fastest Delivery Path!</h1>
      <div style={{ marginBottom: '1rem' }}>
        <label>Select Level: </label>
        {LEVELS.map((_, idx) => (
          <button key={idx} onClick={() => handleLevelChange(idx)} style={{ margin: '0 5px', fontWeight: level === idx ? 'bold' : 'normal' }}>
            Level {idx + 1}
          </button>
        ))}
      </div>
      <p><strong>Instruction:</strong> Right-click and drag from start (blue) to end (red) to draw your path.</p>
      <div style={{ marginBottom: '1rem' }}>
        <p><strong>Level {level + 1}:</strong> Size: {currentLevel.size}x{currentLevel.size} | Buildings: {Math.round(currentLevel.buildingDensity * 100)}% | Weights: {currentLevel.weightRange[0]}-{currentLevel.weightRange[1]}</p>
      </div>
      <div
        style={{ display: 'grid', gridTemplateColumns: `repeat(${currentLevel.size}, ${CELL_SIZE}px)`, gridTemplateRows: `repeat(${currentLevel.size}, ${CELL_SIZE}px)`, gap: '2px', margin: '1rem auto' }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const inUserPath = userPath.some(p => p.row === rowIndex && p.col === colIndex);
            const inBestPath = showBest && bestPath.some(p => p.row === rowIndex && p.col === colIndex);
            const isStart = rowIndex === start.row && colIndex === start.col;
            const isEnd = rowIndex === end.row && colIndex === end.col;
            
            // Dijkstra visualization states
            const isVisited = showAlgorithmSteps && dijkstraSteps[currentAnimationStep]?.visited[rowIndex][colIndex];
            const isCurrent = showAlgorithmSteps && dijkstraSteps[currentAnimationStep]?.current?.row === rowIndex && dijkstraSteps[currentAnimationStep]?.current?.col === colIndex;
            const isNeighbor = showAlgorithmSteps && dijkstraSteps[currentAnimationStep]?.neighbors.some(n => n.row === rowIndex && n.col === colIndex);
            const hasDistance = showAlgorithmSteps && dijkstraSteps[currentAnimationStep]?.dist[rowIndex][colIndex] < Infinity;
            const inAlgorithmPath = showAlgorithmSteps && dijkstraSteps[currentAnimationStep]?.path.some(p => p.row === rowIndex && p.col === colIndex);
            
            let bgColor = cell.type === 'building' ? '#444' : 'lightgray';
            if (inUserPath) bgColor = 'skyblue';
            if (inBestPath) bgColor = 'limegreen';
            if (isStart) bgColor = 'blue';
            if (isEnd) bgColor = 'red';
            
            // Dijkstra visualization colors
            if (showAlgorithmSteps) {
              if (inAlgorithmPath) bgColor = 'purple';
              else if (isCurrent) bgColor = 'orange';
              else if (isNeighbor) bgColor = 'yellow';
              else if (isVisited) bgColor = 'lightgreen';
            }
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onMouseDown={(e) => handleMouseDown(e, rowIndex, colIndex)}
                onMouseEnter={() => handleCellEnter(rowIndex, colIndex)}
                style={{
                  width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px`, backgroundColor: bgColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 'bold', border: '1px solid #ccc',
                  color: cell.type === 'building' ? 'white' : 'black', cursor: 'pointer',
                  position: 'relative'
                }}
              >
                {cell.type === 'road' ? cell.weight : 'X'}
                {showAlgorithmSteps && hasDistance && (
                  <div style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    fontSize: '10px',
                    color: 'darkblue'
                  }}>
                    {dijkstraSteps[currentAnimationStep].dist[rowIndex][colIndex]}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div style={{ marginTop: '10px' }}>
        <button onClick={regenerateGrid}>New Grid</button>
        <button onClick={resetUserPath} style={{ marginLeft: '10px' }}>Clear Path</button>
        <button onClick={undoLastStep} style={{ marginLeft: '10px' }} disabled={pathHistory.length === 0}>Undo</button>
        <button onClick={() => setShowBest(!showBest)} style={{ marginLeft: '10px' }}>
          {showBest ? 'Hide Best Path' : 'Show Best Path'}
        </button>
        <button onClick={animateBestPath} style={{ marginLeft: '10px' }} disabled={isAnimating || showAlgorithmSteps}>
          Show Algorithm
        </button>
        {showAlgorithmSteps && (
          <>
            <button onClick={handlePrevStep} style={{ marginLeft: '10px' }} disabled={currentAnimationStep === 0}>
              Previous Step
            </button>
            <button onClick={handleNextStep} style={{ marginLeft: '10px' }} disabled={currentAnimationStep >= dijkstraSteps.length - 1}>
              Next Step
            </button>
            <button onClick={toggleAutoPlay} style={{ marginLeft: '10px', backgroundColor: autoPlay ? '#4CAF50' : '#f44336' }}>
              {autoPlay ? 'Stop Auto' : 'Auto Play'}
            </button>
            <select 
              value={autoPlaySpeed} 
              onChange={(e) => setAutoPlaySpeed(Number(e.target.value))}
              style={{ marginLeft: '10px' }}
              disabled={!autoPlay}
            >
              <option value={1000}>Slow</option>
              <option value={500}>Medium</option>
              <option value={200}>Fast</option>
            </select>
            <span style={{ marginLeft: '10px' }}>
              Step {currentAnimationStep + 1} of {dijkstraSteps.length}
            </span>
          </>
        )}
        <button onClick={calculateFinalScore} style={{ marginLeft: '10px' }} disabled={!isValidPath}>Submit Path</button>
      </div>
      <div style={{ marginTop: '10px', textAlign: 'center' }}>
        <p><strong>Current Weight:</strong> {liveScore}</p>
        {!isValidPath && userPath.length > 0 && <p style={{ color: 'red' }}>Your path must start at blue and end at red with no jumps!</p>}
        {bestScore !== null && <p><strong>Minimum Total Weight:</strong> {bestWeightSum}</p>}
      </div>
      {showAlgorithmSteps && (
        <div style={{ marginTop: '20px', maxWidth: '600px', textAlign: 'left', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
          <h3>Algorithm Visualization:</h3>
          <p>
            Dijkstra's algorithm finds the shortest path by systematically exploring all possible routes.
          </p>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li><span style={{ backgroundColor: 'lightgreen', padding: '2px 5px', marginRight: '5px' }}> </span> Visited cells</li>
            <li><span style={{ backgroundColor: 'orange', padding: '2px 5px', marginRight: '5px' }}> </span> Current cell being processed</li>
            <li><span style={{ backgroundColor: 'yellow', padding: '2px 5px', marginRight: '5px' }}> </span> Neighbors being evaluated</li>
            <li><span style={{ backgroundColor: 'purple', padding: '2px 5px', marginRight: '5px' }}> </span> Current shortest path to end</li>
            <li><span style={{ color: 'darkblue', padding: '2px 5px', marginRight: '5px' }}>#</span> Distance from start</li>
          </ul>
          <p>
            The algorithm keeps updating the shortest path (purple) as it discovers better routes.
          </p>
        </div>
      )}
    </div>
  );
}