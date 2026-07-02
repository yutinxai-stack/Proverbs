import { useState, useEffect, useRef } from "react";
import { generateLevel } from "./utils/levelGenerator";
import type { GameLevel, GridCell } from "./types";
import { WordBoard } from "./components/WordBoard";
import type { PoolWord } from "./components/WordBoard";
import { AuthModal } from "./components/AuthModal";
import { Leaderboard } from "./components/Leaderboard";
import { AdminPanel } from "./components/AdminPanel";
import { isFirebaseConfigured, db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";

interface TourNode {
  level: number;
  name: string;
  left: number; // 0-100%
  top: number;  // 0-100%
}

const WORLD_TOUR_NODES: TourNode[] = [
  { level: 1, name: "台北", left: 77, top: 50 },
  { level: 2, name: "高雄", left: 74, top: 57 },
  { level: 3, name: "沖繩", left: 81, top: 48 },
  { level: 4, name: "東京", left: 86, top: 40 },
  { level: 5, name: "首爾", left: 81, top: 36 },
  { level: 6, name: "北京", left: 74, top: 30 },
  { level: 7, name: "上海", left: 75, top: 42 },
  { level: 8, name: "香港", left: 69, top: 50 },
  { level: 9, name: "馬尼拉", left: 73, top: 62 },
  { level: 10, name: "胡志明", left: 66, top: 60 },
  { level: 11, name: "曼谷", left: 60, top: 55 },
  { level: 12, name: "新加坡", left: 62, top: 70 },
  { level: 13, name: "吉隆坡", left: 56, top: 67 },
  { level: 14, name: "雅加達", left: 60, top: 80 },
  { level: 15, name: "峇里島", left: 67, top: 82 },
  { level: 16, name: "伯斯", left: 69, top: 92 },
  { level: 17, name: "雪梨", left: 80, top: 90 },
  { level: 18, name: "奧克蘭", left: 89, top: 91 },
  { level: 19, name: "斐濟", left: 93, top: 78 },
  { level: 20, name: "夏威夷", left: 96, top: 50 },
  { level: 21, name: "關島", left: 88, top: 58 },
  { level: 22, name: "新德里", left: 52, top: 46 },
  { level: 23, name: "孟買", left: 48, top: 56 },
  { level: 24, name: "杜拜", left: 41, top: 48 },
  { level: 25, name: "開羅", left: 31, top: 48 },
  { level: 26, name: "奈洛比", left: 33, top: 66 },
  { level: 27, name: "開普敦", left: 23, top: 84 },
  { level: 28, name: "馬達加斯加", left: 41, top: 76 },
  { level: 29, name: "雅典", left: 27, top: 36 },
  { level: 30, name: "羅馬", left: 19, top: 34 },
  { level: 31, name: "巴黎", left: 11, top: 26 },
  { level: 32, name: "倫敦", left: 9, top: 18 },
  { level: 33, name: "雷克雅維克", left: 4, top: 10 },
  { level: 34, name: "格陵蘭", left: 14, top: 8 },
  { level: 35, name: "紐約", left: 24, top: 20 },
  { level: 36, name: "華盛頓", left: 22, top: 28 },
  { level: 37, name: "邁阿密", left: 26, top: 40 },
  { level: 38, name: "哈瓦那", left: 20, top: 44 },
  { level: 39, name: "里約", left: 35, top: 72 },
  { level: 40, name: "布宜諾斯", left: 29, top: 82 },
  { level: 41, name: "復活節島", left: 19, top: 70 },
  { level: 42, name: "利馬", left: 12, top: 58 },
  { level: 43, name: "墨西哥城", left: 6, top: 46 },
  { level: 44, name: "洛杉磯", left: 4, top: 36 },
  { level: 45, name: "舊金山", left: 3, top: 28 },
  { level: 46, name: "溫哥華", left: 5, top: 18 },
  { level: 47, name: "阿拉斯加", left: 94, top: 18 },
  { level: 48, name: "海參崴", left: 88, top: 28 },
  { level: 49, name: "花蓮", left: 79, top: 53 },
  { level: 50, name: "玉山", left: 76, top: 55 }
];

function App() {
  const [levelNumber, setLevelNumber] = useState<number>(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(1);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [levelData, setLevelData] = useState<GameLevel | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // View states: "map" (Candy Crush S-map) or "game" (crossword playfield)
  const [viewMode, setViewMode] = useState<"map" | "game">("map");

  // Game states
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [activeIdiomIdx, setActiveIdiomIdx] = useState<number | null>(null); // 當前正在編輯的成語索引
  const [activeDirection, setActiveDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [poolWords, setPoolWords] = useState<PoolWord[]>([]);
  
  // Modals
  const [showAuth, setShowAuth] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [levelCleared, setLevelCleared] = useState(false);

  // User Auth status
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // 1. Initial Load: Auto login guest or get from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("idiom_user");
    if (savedUser) {
      setCurrentUser(savedUser);
      const savedLevel = Number(localStorage.getItem(`idiom_level_${savedUser}`)) || 1;
      const savedScore = Number(localStorage.getItem(`idiom_score_${savedUser}`)) || 0;
      setLevelNumber(savedLevel);
      setMaxUnlockedLevel(savedLevel);
      setTotalScore(savedScore);
    } else {
      setShowAuth(true);
    }
  }, []);

  // Auto scroll to active level node on map view load (robust retry system)
  useEffect(() => {
    if (viewMode === "map" && mapContainerRef.current && !showAuth) {
      const levelInRound = ((maxUnlockedLevel - 1) % 50) + 1;
      const activeNode = WORLD_TOUR_NODES.find(n => n.level === levelInRound);
      if (activeNode) {
        const container = mapContainerRef.current;
        const canvasWidth = 1300;
        const canvasHeight = 750;
        const targetX = (activeNode.left / 100) * canvasWidth;
        const targetY = (activeNode.top / 100) * canvasHeight;

        // 瞬間瞬移定位，完全不進行任何滑動
        container.style.scrollBehavior = "auto";
        container.scrollLeft = targetX - container.clientWidth / 2;
        container.scrollTop = targetY - container.clientHeight / 2;

        let retries = 0;
        const intervalId = setInterval(() => {
          if (container && container.clientWidth > 0) {
            container.scrollLeft = targetX - container.clientWidth / 2;
            container.scrollTop = targetY - container.clientHeight / 2;
            
            retries++;
            if (retries >= 15) {
              clearInterval(intervalId);
            }
          }
        }, 100);

        return () => clearInterval(intervalId);
      }
    }
  }, [viewMode, maxUnlockedLevel, showAuth]);

  // 2. Load Level whenever levelNumber changes
  useEffect(() => {
    const data = generateLevel(levelNumber);
    setLevelData(data);
    setLevelCleared(false);

    // Find first empty cell to auto select
    let firstEmpty: { x: number; y: number } | null = null;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const cell = data.grid[y][x];
        if (cell && !cell.isSystemRevealed) {
          firstEmpty = { x, y };
          break;
        }
      }
      if (firstEmpty) break;
    }

    setSelectedCell(firstEmpty);
    if (firstEmpty) {
      const cell = data.grid[firstEmpty.y][firstEmpty.x];
      if (cell && cell.idiomIndices.length > 0) {
        const idx = cell.idiomIndices[0];
        const pi = data.placedIdioms[idx];
        setActiveIdiomIdx(idx);
        setActiveDirection(pi.isHorizontal ? "horizontal" : "vertical");
      } else {
        setActiveIdiomIdx(null);
      }
    } else {
      setActiveIdiomIdx(null);
    }

    // Initialize character pool words
    const words = data.charPool.map((char, index) => ({
      id: `char-${index}`,
      char,
      isUsed: false
    }));
    setPoolWords(words);
  }, [levelNumber]);

  // Sync progress
  const saveProgress = async (newMaxLevel: number, newScore: number) => {
    if (currentUser) {
      localStorage.setItem(`idiom_level_${currentUser}`, String(newMaxLevel));
      localStorage.setItem(`idiom_score_${currentUser}`, String(newScore));
      
      if (isFirebaseConfigured) {
        try {
          const userDocRef = doc(db, "users", currentUser);
          await updateDoc(userDocRef, {
            currentLevel: newMaxLevel,
            totalScore: newScore,
            updatedAt: Date.now()
          });
        } catch (err) {
          console.error("Firebase sync failed, saved to local cache:", err);
        }
      }
    }
  };

  const handleLoginSuccess = (username: string, score: number, level: number) => {
    setCurrentUser(username);
    setTotalScore(score);
    setLevelNumber(level);
    setMaxUnlockedLevel(level);
    setViewMode("map"); // Go to map after login
  };

  const handleLogout = () => {
    localStorage.removeItem("idiom_user");
    setCurrentUser(null);
    setLevelNumber(1);
    setMaxUnlockedLevel(1);
    setTotalScore(0);
    setViewMode("map");
    setShowAuth(false);
  };

  if (!levelData) {
    return <div className="loading-screen">遊戲載入中，請稍候...</div>;
  }

  // Get cell helper
  const getCell = (x: number, y: number): GridCell | null => {
    if (x < 0 || x >= 10 || y < 0 || y >= 10) return null;
    return levelData.grid[y][x];
  };


  // Click on a cell in the grid
  const handleCellSelect = (x: number, y: number) => {
    const cell = getCell(x, y);
    if (!cell) return;

    // Toggle direction if clicking the same cell
    if (selectedCell && selectedCell.x === x && selectedCell.y === y) {
      if (cell.idiomIndices.length > 1) {
        const nextDir = activeDirection === "horizontal" ? "vertical" : "horizontal";
        setActiveDirection(nextDir);
        // Find which placedIdiom matches this new direction
        const matchingIdiomIdx = cell.idiomIndices.find(idx => {
          const pi = levelData.placedIdioms[idx];
          return pi.isHorizontal === (nextDir === "horizontal");
        });
        if (matchingIdiomIdx !== undefined) {
          setActiveIdiomIdx(matchingIdiomIdx);
        }
      }
      return;
    }

    setSelectedCell({ x, y });
    
    // Choose active idiom index
    if (cell.idiomIndices.length > 0) {
      // Prefer current direction if matching, else pick first
      const currentDirIsHorizontal = activeDirection === "horizontal";
      const matchingIdx = cell.idiomIndices.find(idx => {
        const pi = levelData.placedIdioms[idx];
        return pi.isHorizontal === currentDirIsHorizontal;
      });

      const selectedIdx = matchingIdx !== undefined ? matchingIdx : cell.idiomIndices[0];
      const pi = levelData.placedIdioms[selectedIdx];
      
      setActiveIdiomIdx(selectedIdx);
      setActiveDirection(pi.isHorizontal ? "horizontal" : "vertical");
    }
  };

  const handleWordClick = (word: PoolWord) => {
    if (!selectedCell || activeIdiomIdx === null) return;
    
    const { x, y } = selectedCell;
    const cell = getCell(x, y);
    if (!cell || cell.isSystemRevealed || cell.isUserCorrect) return;

    // 1. Update grid and cell
    const updatedGrid = [...levelData.grid.map(row => [...row])];
    const targetCell = { ...cell };
    
    // If this slot was already filled by user, return that tile to pool first
    const previousTileId = (targetCell as any).tileId;
    let updatedPool = [...poolWords];
    if (previousTileId) {
      updatedPool = updatedPool.map(w => w.id === previousTileId ? { ...w, isUsed: false } : w);
    }
    
    targetCell.userChar = word.char;
    (targetCell as any).tileId = word.id;
    updatedGrid[y][x] = targetCell;

    // 2. Mark the new tile as used
    updatedPool = updatedPool.map(w => w.id === word.id ? { ...w, isUsed: true } : w);
    setPoolWords(updatedPool);

    // 3. Update level data state
    const currentIdiom = levelData.placedIdioms[activeIdiomIdx];
    
    // Determine the next empty cell in this idiom to auto-jump
    let nextCellToJump: { x: number; y: number } | null = null;
    const startIdx = currentIdiom.isHorizontal ? x - currentIdiom.x : y - currentIdiom.y;
    
    // Scan forward from the current slot inside the active idiom
    for (let offset = 1; offset < 4; offset++) {
      const idxInIdiom = (startIdx + offset) % 4;
      const tx = currentIdiom.isHorizontal ? currentIdiom.x + idxInIdiom : currentIdiom.x;
      const ty = currentIdiom.isHorizontal ? currentIdiom.y : currentIdiom.y + idxInIdiom;
      
      const nextCell = updatedGrid[ty][tx];
      if (nextCell && !nextCell.isSystemRevealed && !nextCell.isUserCorrect && nextCell.userChar === "") {
        nextCellToJump = { x: tx, y: ty };
        break;
      }
    }

    // If no forward empty cells, scan backward from current slot
    if (!nextCellToJump) {
      for (let offset = 3; offset > 0; offset--) {
        const idxInIdiom = (startIdx + offset) % 4;
        const tx = currentIdiom.isHorizontal ? currentIdiom.x + idxInIdiom : currentIdiom.x;
        const ty = currentIdiom.isHorizontal ? currentIdiom.y : currentIdiom.y + idxInIdiom;
        
        const nextCell = updatedGrid[ty][tx];
        if (nextCell && !nextCell.isSystemRevealed && !nextCell.isUserCorrect && nextCell.userChar === "") {
          nextCellToJump = { x: tx, y: ty };
          break;
        }
      }
    }

    // Set selected Cell
    if (nextCellToJump) {
      setSelectedCell(nextCellToJump);
    } else {
      // All cells in this idiom are filled! Verify if the idiom is correct.
      verifyAndLockIdiom(activeIdiomIdx, updatedGrid, updatedPool);
      return;
    }

    setLevelData({
      ...levelData,
      grid: updatedGrid
    });
  };

  // Verify and unlock an idiom if all 4 characters are correct
  const verifyAndLockIdiom = (idiomIdx: number, currentGrid: (GridCell | null)[][], currentPool: PoolWord[]) => {
    const placed = levelData!.placedIdioms[idiomIdx];
    
    // Assemble filled chars
    const chars: string[] = [];
    for (let i = 0; i < 4; i++) {
      const cx = placed.isHorizontal ? placed.x + i : placed.x;
      const cy = placed.isHorizontal ? placed.y : placed.y + i;
      const cell = currentGrid[cy][cx];
      chars.push(cell ? (cell.isSystemRevealed ? cell.char : cell.userChar) : "");
    }
    const assembled = chars.join("");
    const isCorrect = assembled === placed.idiom;

    const updatedPlacedIdioms = [...levelData!.placedIdioms];

    if (isCorrect) {
      // 1. Unlock this idiom
      updatedPlacedIdioms[idiomIdx] = {
        ...placed,
        isUnlocked: true
      };

      // 2. Lock its cells (convert them to user correct so they can't be edited)
      for (let i = 0; i < 4; i++) {
        const cx = placed.isHorizontal ? placed.x + i : placed.x;
        const cy = placed.isHorizontal ? placed.y : placed.y + i;
        const cell = currentGrid[cy][cx];
        if (cell) {
          cell.isUserCorrect = true;
          cell.userChar = cell.char;
        }
      }

      // 3. Award Score
      const scoreGain = 100;
      const newScore = totalScore + scoreGain;
      setTotalScore(newScore);

      setSelectedCell(null);
      setActiveIdiomIdx(null);

      // Check if all idioms in level are unlocked
      const levelComplete = updatedPlacedIdioms.every(pi => pi.isUnlocked);
      
      setLevelData({
        ...levelData!,
        placedIdioms: updatedPlacedIdioms,
        grid: currentGrid
      });

      if (levelComplete) {
        setLevelCleared(true);
        const levelClearedBonus = 200;
        const finalScore = newScore + levelClearedBonus;
        setTotalScore(finalScore);
        
        let newMax = maxUnlockedLevel;
        if (levelNumber === maxUnlockedLevel && levelNumber < 1300) {
          newMax = levelNumber + 1;
          setMaxUnlockedLevel(newMax);
        }
        saveProgress(newMax, finalScore);
      } else {
        saveProgress(maxUnlockedLevel, newScore);
      }
    } else {
      // Incorrect! Clear player's inputs for this idiom to avoid frustration, restore tiles to pool
      alert(`拼出的「${assembled}」不是正確答案喔，請再試試看！`);
      
      let restoredPool = [...currentPool];
      for (let i = 0; i < 4; i++) {
        const cx = placed.isHorizontal ? placed.x + i : placed.x;
        const cy = placed.isHorizontal ? placed.y : placed.y + i;
        const cell = currentGrid[cy][cx];
        
        if (cell && !cell.isSystemRevealed && !cell.isUserCorrect) {
          const tileId = (cell as any).tileId;
          if (tileId) {
            restoredPool = restoredPool.map(w => w.id === tileId ? { ...w, isUsed: false } : w);
          }
          cell.userChar = "";
          (cell as any).tileId = "";
        }
      }
      setPoolWords(restoredPool);
      
      // Auto select the first slot of this idiom for re-entry
      for (let i = 0; i < 4; i++) {
        const cx = placed.isHorizontal ? placed.x + i : placed.x;
        const cy = placed.isHorizontal ? placed.y : placed.y + i;
        const cell = currentGrid[cy][cx];
        if (cell && !cell.isSystemRevealed && !cell.isUserCorrect) {
          setSelectedCell({ x: cx, y: cy });
          break;
        }
      }

      setLevelData({
        ...levelData!,
        grid: currentGrid
      });
    }
  };

  const handleBackspace = () => {
    if (activeIdiomIdx === null || !levelData) return;

    const placed = levelData.placedIdioms[activeIdiomIdx];
    const updatedGrid = [...levelData.grid.map(row => [...row])];
    
    // Find the cell to delete
    let targetCell: GridCell | null = null;
    let targetX = 0;
    let targetY = 0;

    // 1. If currently selected cell has a user input, delete it
    if (selectedCell) {
      const cell = updatedGrid[selectedCell.y][selectedCell.x];
      if (cell && !cell.isSystemRevealed && !cell.isUserCorrect && cell.userChar !== "") {
        targetCell = cell;
        targetX = selectedCell.x;
        targetY = selectedCell.y;
      }
    }

    // 2. Otherwise, search backward in the current idiom for the last filled slot
    if (!targetCell) {
      for (let i = 3; i >= 0; i--) {
        const cx = placed.isHorizontal ? placed.x + i : placed.x;
        const cy = placed.isHorizontal ? placed.y : placed.y + i;
        const cell = updatedGrid[cy][cx];
        if (cell && !cell.isSystemRevealed && !cell.isUserCorrect && cell.userChar !== "") {
          targetCell = cell;
          targetX = cx;
          targetY = cy;
          break;
        }
      }
    }

    if (!targetCell) return;

    const deletedTileId = (targetCell as any).tileId;

    // Clear input
    targetCell.userChar = "";
    (targetCell as any).tileId = "";
    
    // Restore tile in pool
    if (deletedTileId) {
      const restoredPool = poolWords.map(w => w.id === deletedTileId ? { ...w, isUsed: false } : w);
      setPoolWords(restoredPool);
    }

    // Auto focus on the deleted slot so the user can easily re-type
    setSelectedCell({ x: targetX, y: targetY });

    setLevelData({
      ...levelData,
      grid: updatedGrid
    });
  };

  const handleHint = () => {
    if (activeIdiomIdx === null || !levelData) return;

    const placed = levelData.placedIdioms[activeIdiomIdx];
    const updatedGrid = [...levelData.grid.map(row => [...row])];
    
    // Find the first unfilled / incorrect cell in the active idiom
    let targetCell: GridCell | null = null;

    for (let i = 0; i < 4; i++) {
      const cx = placed.isHorizontal ? placed.x + i : placed.x;
      const cy = placed.isHorizontal ? placed.y : placed.y + i;
      const cell = updatedGrid[cy][cx];
      if (cell && !cell.isSystemRevealed && !cell.isUserCorrect) {
        targetCell = cell;
        break;
      }
    }

    if (!targetCell) return;

    // Fill in correct character and lock it immediately to build confidence
    targetCell.userChar = targetCell.char;
    targetCell.isUserCorrect = true; // Lock immediately
    
    // Find the corresponding character tile in poolWords and mark it as isUsed
    let poolUpdated = false;
    const updatedPool = poolWords.map(w => {
      if (!poolUpdated && w.char === targetCell!.char && !w.isUsed) {
        poolUpdated = true;
        // Associate cell with tileId
        (targetCell as any).tileId = w.id;
        return { ...w, isUsed: true };
      }
      return w;
    });

    setPoolWords(updatedPool);

    // Check if the idiom is fully filled
    let isAllFilled = true;
    for (let i = 0; i < 4; i++) {
      const cx = placed.isHorizontal ? placed.x + i : placed.x;
      const cy = placed.isHorizontal ? placed.y : placed.y + i;
      const cell = updatedGrid[cy][cx];
      if (cell && !cell.isSystemRevealed && !cell.isUserCorrect && cell.userChar === "") {
        isAllFilled = false;
        break;
      }
    }

    if (isAllFilled) {
      verifyAndLockIdiom(activeIdiomIdx, updatedGrid, updatedPool);
    } else {
      // Select the next empty cell
      for (let i = 0; i < 4; i++) {
        const cx = placed.isHorizontal ? placed.x + i : placed.x;
        const cy = placed.isHorizontal ? placed.y : placed.y + i;
        const cell = updatedGrid[cy][cx];
        if (cell && !cell.isSystemRevealed && !cell.isUserCorrect && cell.userChar === "") {
          setSelectedCell({ x: cx, y: cy });
          break;
        }
      }

      setLevelData({
        ...levelData,
        grid: updatedGrid
      });
    }
  };

  const handleNextLevel = () => {
    if (levelNumber < 1300) {
      const nextLvl = levelNumber + 1;
      setLevelNumber(nextLvl);
      
      let newMax = maxUnlockedLevel;
      if (levelNumber === maxUnlockedLevel) {
        newMax = nextLvl;
        setMaxUnlockedLevel(newMax);
      }
      saveProgress(newMax, totalScore);
      setLevelCleared(false);
      setViewMode("map"); // Go back to map first to see unlocked node
    } else {
      alert("恭喜您！已完成了所有 1300 個關卡！您是真正的成語至尊！");
    }
  };

  // Render Candy Crush style map path
  const renderMap = () => {
    const currentRound = Math.floor((maxUnlockedLevel - 1) / 50);
    const activeIndexInRound = (maxUnlockedLevel - 1) % 50;

    // Generate flight connection paths for unlocked levels in the current round
    const unlockedNodes = WORLD_TOUR_NODES.slice(0, activeIndexInRound + 1);
    const unlockedD = unlockedNodes.map((n, i) => `${i === 0 ? 'M' : 'L'} ${n.left} ${n.top}`).join(" ");

    // Only render node buttons that have been unlocked or are currently active in current round
    const mapNodes = WORLD_TOUR_NODES
      .map((node, i) => {
        const nodeLevel = currentRound * 50 + (i + 1);
        if (nodeLevel > maxUnlockedLevel) return null;

        const isPlayable = nodeLevel <= maxUnlockedLevel;
        const isActive = nodeLevel === maxUnlockedLevel;

        return (
          <button
            key={nodeLevel}
            className={`map-node ${isActive ? "active" : ""} ${isPlayable ? "unlocked" : "locked"}`}
            style={{ left: `${node.left}%`, top: `${node.top}%` }}
            onClick={() => isPlayable && handlePlayLevel(nodeLevel)}
            disabled={!isPlayable}
          >
            <span className="level-num">{nodeLevel}</span>
            <span className="node-city-name">{nodeLevel}. {node.name}</span>
          </button>
        );
      })
      .filter(Boolean);

    return (
      <div className="map-view-container" ref={mapContainerRef}>
        <div className="map-scroll-panel">
          <div className="map-title-bar">
            <div className="map-title">🌍 世界環球旅行地圖</div>
            <p className="map-subtitle">從台灣出發環遊世界各地，挑戰成語大師！最高解鎖：第 {maxUnlockedLevel} 關</p>
          </div>
          
          <div className="map-track-canvas world-map">
            {/* SVG Flight Lines */}
            <svg className="map-connection-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Unlocked Route (Glowing Solid Line) */}
              {unlockedD && (
                <path
                  d={unlockedD}
                  fill="none"
                  className="route-unlocked"
                  strokeWidth="0.6"
                />
              )}
            </svg>

            {/* Landmark nodes */}
            {mapNodes}
          </div>
        </div>
      </div>
    );
  };

  const handlePlayLevel = (num: number) => {
    setLevelNumber(num);
    setViewMode("game");
  };

  // Determine if selected cell has user inputs
  const hasUserSelectedInput = (): boolean => {
    if (activeIdiomIdx === null) return false;
    const placed = levelData.placedIdioms[activeIdiomIdx];
    
    for (let i = 0; i < 4; i++) {
      const cx = placed.isHorizontal ? placed.x + i : placed.x;
      const cy = placed.isHorizontal ? placed.y : placed.y + i;
      const cell = getCell(cx, cy);
      if (cell && !cell.isSystemRevealed && cell.userChar !== "") {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="game-header">
        <div className="header-logo">
          <h1>🏮 溫馨成語接龍 🏮</h1>
          <p className="subtitle">字大清晰、溫馨好玩！</p>
        </div>
        <div className="header-user-status">
          <div className="header-score">🏆 積分：{totalScore} 分</div>
          {viewMode === "game" && (
            <button className="btn btn-header btn-secondary" onClick={() => setViewMode("map")}>
              🗺 返回地圖
            </button>
          )}
          {currentUser ? (
            <div className="user-info">
              <span>👤 <strong>{currentUser}</strong></span>
              <button className="btn btn-header btn-accent" onClick={() => setShowAuth(true)}>更換</button>
            </div>
          ) : (
            <button className="btn btn-header btn-primary" onClick={() => setShowAuth(true)}>🔑 登入存檔</button>
          )}
          <button className="btn btn-header btn-secondary" onClick={() => setShowLeaderboard(true)}>🏆 榮譽榜</button>
        </div>
      </header>

      {/* Main Area */}
      <main className="game-main">
        {currentUser === "owner" ? (
          <AdminPanel onLogout={handleLogout} tourNodes={WORLD_TOUR_NODES} />
        ) : viewMode === "map" ? (
          /* Candy Crush map */
          renderMap()
        ) : (
          /* Crossword game board */
          <>
            {/* Crossword 10x10 Board Grid */}
            <section className="crossword-board-section">
              <div className="crossword-grid">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(y => (
                  <div key={y} className="crossword-row">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(x => {
                      const cell = getCell(x, y);
                      if (!cell) {
                        return <div key={x} className="grid-cell empty-slot"></div>;
                      }

                      const isSelected = selectedCell !== null && selectedCell.x === x && selectedCell.y === y;
                      const hasUserChar = cell.userChar !== "";
                      const isRevealed = cell.isSystemRevealed;
                      const isCorrect = cell.isUserCorrect;
                      
                      return (
                        <button
                          key={x}
                          className={`grid-cell letter-slot 
                            ${isRevealed ? "revealed" : ""} 
                            ${isCorrect ? "user-correct" : ""} 
                            ${isSelected ? "selected" : ""} 
                            ${hasUserChar && !isRevealed && !isCorrect ? "user-filled" : ""}
                          `}
                          onClick={() => handleCellSelect(x, y)}
                        >
                          {isRevealed || isCorrect ? cell.char : cell.userChar}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>

            {/* Word Board (Tiles Area) */}
            <section className="wordboard-section">
              {selectedCell !== null ? (
                <>
                  <WordBoard
                    words={poolWords}
                    onWordClick={handleWordClick}
                    onBackspace={handleBackspace}
                    onHint={handleHint}
                    hasInput={hasUserSelectedInput()}
                  />
                  
                  {/* Bottom Explanation Panel (成語說明放在最下面) */}
                  <div className="bottom-explanation-panel">
                    {activeIdiomIdx !== null ? (
                      <>
                        <div className="explanation-title">📖 成語提示</div>
                        <div className="explanation-def">💡 意思：{levelData.placedIdioms[activeIdiomIdx].definition}</div>
                      </>
                    ) : (
                      <div className="explanation-empty">💡 點選格子以查看對應的成語釋義說明。</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="select-card-prompt">
                  💡 請先點擊上方 **填字棋盤中的格子**，即可開始填字！
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="game-footer">
        <p>溫馨提示：字體超大、點擊好選。完成整張填字棋盤即可過關！</p>
      </footer>

      {/* Level Cleared Modal overlay */}
      {levelCleared && (
        <div className="modal-overlay level-clear">
          <div className="modal-content text-center animate-bounce">
            <div className="clear-emoji">🎉</div>
            <h2>第 {levelNumber} 關挑戰成功！</h2>
            <div className="score-bonus">+100 分 (答對成語) + 200 分 (過關獎勵)</div>
            <div className="modal-actions">
              <button className="btn btn-primary btn-large" onClick={handleNextLevel}>
                確定 ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {(showAuth || !currentUser) && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLoginSuccess={handleLoginSuccess}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {showLeaderboard && (
        <Leaderboard
          onClose={() => setShowLeaderboard(false)}
          currentUsername={currentUser}
          currentScore={totalScore}
        />
      )}
    </div>
  );
}

export default App;
