import { useState, useEffect, useRef } from "react";
import { generateLevel, setLevelOverrides } from "./utils/levelGenerator";
import { audioManager } from "./utils/audio";
import type { GameLevel, GridCell } from "./types";
import { WordBoard } from "./components/WordBoard";
import type { PoolWord } from "./components/WordBoard";
import { AuthModal } from "./components/AuthModal";
import { Leaderboard } from "./components/Leaderboard";
import { AdminPanel } from "./components/AdminPanel";
import { isFirebaseConfigured, db } from "./firebase";
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { generateWorldTourNodes } from "./utils/railway";

interface TourNode {
  level: number;
  name: string;
  english: string;
  prev: string;
  prevEng: string;
  next: string;
  nextEng: string;
  prevDist: number;
  nextDist: number;
}

const WORLD_TOUR_NODES: TourNode[] = generateWorldTourNodes();

function App() {
  const [levelNumber, setLevelNumber] = useState<number>(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(1);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleMute = () => {
    const nextMute = audioManager.toggleMute();
    setIsMuted(nextMute);
  };

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
  
  // Cache trigger state for level overrides reload
  const [overridesTrigger, setOverridesTrigger] = useState(0);

  const loadOverrides = async () => {
    const overrideMap: Record<number, any> = {};
    if (isFirebaseConfigured) {
      try {
        const querySnapshot = await getDocs(collection(db, "levelOverrides"));
        querySnapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          const lvl = Number(docSnap.id.replace("level_", "")) || data.levelNumber;
          if (lvl) {
            overrideMap[lvl] = data;
          }
        });
      } catch (e) {
        console.error("Error loading level overrides from firebase:", e);
      }
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("idiom_level_override_")) {
          const lvl = Number(key.replace("idiom_level_override_", ""));
          const dataJson = localStorage.getItem(key);
          if (lvl && dataJson) {
            overrideMap[lvl] = JSON.parse(dataJson);
          }
        }
      }
    } catch (e) {
      console.error("Error loading level overrides from localStorage:", e);
    }

    setLevelOverrides(overrideMap);
    setOverridesTrigger(prev => prev + 1);
  };

  // 1. Initial Load: Auto login guest or get from localStorage, and load level overrides
  useEffect(() => {
    loadOverrides();
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
  }, [levelNumber, overridesTrigger]);

  // Autoplay BGM on first user interaction (safari / chrome compatibility)
  useEffect(() => {
    const handleFirstInteraction = () => {
      audioManager.startBGM();
    };
    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  // Auto scroll and center the active station card in railway view
  useEffect(() => {
    if (viewMode === "map" && !showAuth) {
      const timer = setTimeout(() => {
        const activeCard = document.querySelector(".train-station-card.active") as HTMLElement;
        const scroller = document.querySelector(".train-track-scroller") as HTMLElement;
        if (activeCard && scroller) {
          const scrollerWidth = scroller.clientWidth;
          const cardWidth = activeCard.offsetWidth;
          const cardLeft = activeCard.offsetLeft;
          const targetScrollLeft = cardLeft - (scrollerWidth / 2) + (cardWidth / 2);
          scroller.scrollTo({
            left: targetScrollLeft,
            behavior: "smooth"
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [viewMode, maxUnlockedLevel, showAuth]);

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
    setTotalScore(Number(score) || 0);
    setLevelNumber(Number(level) || 1);
    setMaxUnlockedLevel(Number(level) || 1);
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

    audioManager.playClick();

    // 1. Update grid and cell
    const updatedGrid = [...levelData.grid.map(row => [...row])];
    const targetCell = { ...cell };
    
    // Determine if filled character is correct for this specific slot
    const isCharCorrect = word.char === targetCell.char;
    
    // If this slot was already filled by user, return that tile to pool first
    const previousTileId = (targetCell as any).tileId;
    let updatedPool = [...poolWords];
    if (previousTileId) {
      updatedPool = updatedPool.map(w => w.id === previousTileId ? { ...w, isUsed: false } : w);
    }
    
    targetCell.userChar = word.char;
    (targetCell as any).tileId = word.id;
    
    if (isCharCorrect) {
      targetCell.isError = false;
    } else {
      targetCell.isError = true;
    }
    
    updatedGrid[y][x] = targetCell;

    // 2. Mark the new tile as used
    updatedPool = updatedPool.map(w => w.id === word.id ? { ...w, isUsed: true } : w);
    setPoolWords(updatedPool);

    // 3. Update level data state
    const currentIdiom = levelData.placedIdioms[activeIdiomIdx];
    
    // Determine the next empty cell in this idiom to auto-jump
    let nextCellToJump: { x: number; y: number } | null = null;
    
    // ONLY auto-jump if the currently filled character is correct!
    // If incorrect, cursor stays here so user can easily overwrite it, and error shows immediately.
    if (isCharCorrect) {
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
    }

    // Set selected Cell or verify answer
    if (nextCellToJump) {
      setSelectedCell(nextCellToJump);
    } else {
      if (!isCharCorrect) {
        // Remain on the wrong cell
        setSelectedCell({ x, y });
      } else {
        // If correct and no empty cells left, verify the entire idiom
        verifyAndLockIdiom(activeIdiomIdx, updatedGrid);
        return;
      }
    }

    setLevelData({
      ...levelData,
      grid: updatedGrid
    });
  };

  // Verify and unlock an idiom if all 4 characters are correct
  const verifyAndLockIdiom = (idiomIdx: number, currentGrid: (GridCell | null)[][]) => {
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
        audioManager.playLevelClear();
        setLevelCleared(true);
        const levelClearedBonus = 200;
        const finalScore = newScore + levelClearedBonus;
        setTotalScore(finalScore);
        
        let newMax = Number(maxUnlockedLevel) || 1;
        const currentLvlNum = Number(levelNumber) || 1;
        if (currentLvlNum === newMax && currentLvlNum < 1300) {
          newMax = currentLvlNum + 1;
          setMaxUnlockedLevel(newMax);
        }
        saveProgress(newMax, finalScore);
      } else {
        audioManager.playCorrect();
        saveProgress(maxUnlockedLevel, newScore);
      }
    } else {
      audioManager.playWrong();
      
      let firstErrorCell: { x: number; y: number } | null = null;
      for (let i = 0; i < 4; i++) {
        const cx = placed.isHorizontal ? placed.x + i : placed.x;
        const cy = placed.isHorizontal ? placed.y : placed.y + i;
        const cell = currentGrid[cy][cx];
        
        if (cell && !cell.isSystemRevealed && !cell.isUserCorrect) {
          if (cell.userChar !== cell.char) {
            cell.isError = true;
            if (!firstErrorCell) {
              firstErrorCell = { x: cx, y: cy };
            }
          } else {
            cell.isError = false;
          }
        }
      }
      
      if (firstErrorCell) {
        setSelectedCell(firstErrorCell);
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

    audioManager.playClick();
    targetCell.userChar = "";
    (targetCell as any).tileId = "";
    targetCell.isError = false;
    
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
      verifyAndLockIdiom(activeIdiomIdx, updatedGrid);
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
      
      let newMax = Number(maxUnlockedLevel) || 1;
      const currentLvlNum = Number(levelNumber) || 1;
      if (currentLvlNum === newMax) {
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
    
    // Dynamic railway theme definitions
    const themes = [
      {
        title: "🚂 台灣環島鐵路之旅",
        badgeColor: "#007a33", // 台鐵經典綠
        trainEmoji: "🚂💨",
        logo: (
          <svg className="tra-badge-logo" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#002d62" strokeWidth="8" />
            <path d="M 25 50 L 75 50 M 50 25 L 50 75 M 32 32 L 68 68 M 32 68 L 68 32" stroke="#002d62" strokeWidth="6" />
            <circle cx="50" cy="50" r="22" fill="#ffffff" />
            <path d="M 40 38 L 60 38 M 50 38 L 50 62 M 35 62 L 65 62" stroke="#002d62" strokeWidth="7" strokeLinecap="round" />
          </svg>
        )
      },
      {
        title: "🚅 日本新幹線高鐵之旅",
        badgeColor: "#00539f", // 新幹線經典藍
        trainEmoji: "🚅💨",
        logo: (
          <svg className="tra-badge-logo" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="#00539f" />
            <path d="M 20 60 C 35 40, 65 40, 80 60 L 80 65 L 20 65 Z" fill="#ffffff" />
            <circle cx="35" cy="52" r="4" fill="#ffb703" />
            <line x1="20" y1="62" x2="80" y2="62" stroke="#00539f" strokeWidth="4" />
          </svg>
        )
      },
      {
        title: "🇺🇸 美國跨州美鐵特快",
        badgeColor: "#d90429", // 美鐵經典紅
        trainEmoji: "🚂💨",
        logo: (
          <svg className="tra-badge-logo" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="#002d62" />
            <polygon points="50,20 58,38 78,38 62,50 68,70 50,58 32,70 38,50 22,38 42,38" fill="#ffffff" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#d90429" strokeWidth="8" />
          </svg>
        )
      },
      {
        title: "🇪🇺 歐洲高鐵跨國漫遊",
        badgeColor: "#800020", // 歐洲優雅勃根地紅
        trainEmoji: "🚄💨",
        logo: (
          <svg className="tra-badge-logo" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="#003399" />
            <circle cx="50" cy="50" r="22" fill="none" stroke="#ffcc00" strokeWidth="4" strokeDasharray="6,8" />
          </svg>
        )
      }
    ];

    const themeId = currentRound % 4;
    const theme = themes[themeId];
    const startIndex = themeId * 50;
    const themeStations = WORLD_TOUR_NODES.slice(startIndex, startIndex + 50);

    // Get all stations in the current round
    const stations = themeStations.map((station, i) => {
      const nodeLevel = currentRound * 50 + (i + 1);
      const isPlayable = nodeLevel <= maxUnlockedLevel;
      const isActive = nodeLevel === maxUnlockedLevel;
      return {
        ...station,
        levelNumber: nodeLevel,
        isPlayable,
        isActive
      };
    });

    const activeStation = stations.find(s => s.isActive) || stations[0];

    // Horizontal navigation handler
    const scrollRailway = (direction: "left" | "right") => {
      const scroller = document.querySelector(".train-track-scroller");
      if (scroller) {
        const scrollAmount = 320; // 1 station card width + gap
        scroller.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth"
        });
      }
    };

    return (
      <div className="train-map-container" ref={mapContainerRef}>
        <div className="train-map-header">
          <div className="train-map-title">{theme.title}</div>
          <p className="train-map-subtitle">
            目前停靠在：<strong>第 {maxUnlockedLevel} 站 【{activeStation.name}】</strong>，請點選大站牌進入關卡！
          </p>
        </div>

        {/* Horizontal scrollable track area with navigation arrows */}
        <div className="railway-scroll-wrapper">
          <button className="railway-nav-btn prev-btn" onClick={() => scrollRailway("left")}>◀</button>

          <div className="train-track-scroller">
            <div className="railway-tracks">
              {stations.map(station => (
                <div 
                  key={station.levelNumber} 
                  className={`train-station-node ${station.isActive ? "active-node" : ""}`}
                >
                  {/* Cute train showing on top of the active station */}
                  {station.isActive && (
                    <div className="steam-train-container">
                      <div className="steam-puff">☁️</div>
                      <div className="steam-puff puff-delayed">☁️</div>
                      <span className="steam-train-emoji">{theme.trainEmoji}</span>
                    </div>
                  )}

                  {/* Style Station Board Card */}
                  <button
                    className={`train-station-card ${station.isActive ? "active" : ""} ${station.isPlayable ? "unlocked" : "locked"}`}
                    onClick={() => station.isPlayable && handlePlayLevel(station.levelNumber)}
                    disabled={!station.isPlayable}
                  >
                    {/* Top part: Logo and Station names */}
                    <div className="card-top">
                      {theme.logo}
                      
                      <div className="station-titles">
                        <span className="station-name-zh">{station.name}</span>
                        <span className="station-name-en">{station.english}</span>
                      </div>
                    </div>

                    {/* Middle part: dynamic colored bar with arrows */}
                    <div 
                      className="card-middle" 
                      style={{ backgroundColor: station.isPlayable ? theme.badgeColor : "#adb5bd" }}
                    >
                      <span className="arrow-left">◀ {station.prevDist} 公里</span>
                      <span className="arrow-right">{station.nextDist} 公里 ▶</span>
                    </div>

                    {/* Bottom part: adjacent stations */}
                    <div className="card-bottom">
                      <div className="side-station prev-side">
                        <span className="side-zh">{station.prev}</span>
                        <span className="side-en">{station.prevEng}</span>
                      </div>
                      <div className="side-station next-side">
                        <span className="side-zh">{station.next}</span>
                        <span className="side-en">{station.nextEng}</span>
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div className="station-status-badge">
                      {station.isActive ? (
                        <span className="badge-txt active">挑戰中 🔥</span>
                      ) : station.isPlayable ? (
                        <span className="badge-txt cleared">已通關 ✓</span>
                      ) : (
                        <span className="badge-txt locked">未抵達 🔒</span>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button className="railway-nav-btn next-btn" onClick={() => scrollRailway("right")}>▶</button>
        </div>
      </div>
    );
  };

  const handlePlayLevel = (num: number) => {
    setLevelNumber(num);
    setViewMode("game");
    audioManager.startBGM();
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
          <h1>🏮 成語接龍 🏮</h1>
          <p className="subtitle">字大清晰、好玩！</p>
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
          <button className="btn btn-header btn-secondary" onClick={handleToggleMute}>
            {isMuted ? "🔇 音效/音樂：關" : "🔊 音效/音樂：開"}
          </button>
        </div>
      </header>

      {/* Main Area */}
      <main className="game-main">
        {currentUser === "owner" ? (
          <AdminPanel onLogout={handleLogout} tourNodes={WORLD_TOUR_NODES} onRefreshOverrides={loadOverrides} />
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
                            ${cell.isError ? "has-error" : ""}
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
        <p>提示：字體超大、點擊好選。完成整張填字棋盤即可過關！</p>
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
