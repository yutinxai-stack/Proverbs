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

const WORLD_TOUR_NODES: TourNode[] = [
  { level: 1, name: "台北", english: "Taipei", prev: "松山", prevEng: "Songshan", next: "板橋", nextEng: "Banqiao", prevDist: 6.4, nextDist: 7.8 },
  { level: 2, name: "板橋", english: "Banqiao", prev: "台北", prevEng: "Taipei", next: "樹林", nextEng: "Shulin", prevDist: 7.8, nextDist: 6.1 },
  { level: 3, name: "樹林", english: "Shulin", prev: "板橋", prevEng: "Banqiao", next: "鶯歌", nextEng: "Yingge", prevDist: 6.1, nextDist: 7.3 },
  { level: 4, name: "鶯歌", english: "Yingge", prev: "樹林", prevEng: "Shulin", next: "桃園", nextEng: "Taoyuan", prevDist: 7.3, nextDist: 8.2 },
  { level: 5, name: "桃園", english: "Taoyuan", prev: "鶯歌", prevEng: "Yingge", next: "中壢", nextEng: "Zhongli", prevDist: 8.2, nextDist: 9.5 },
  { level: 6, name: "中壢", english: "Zhongli", prev: "桃園", prevEng: "Taoyuan", next: "楊梅", nextEng: "Yangmei", prevDist: 9.5, nextDist: 8.8 },
  { level: 7, name: "楊梅", english: "Yangmei", prev: "中壢", prevEng: "Zhongli", next: "新竹", nextEng: "Hsinchu", prevDist: 8.8, nextDist: 21.3 },
  { level: 8, name: "新竹", english: "Hsinchu", prev: "楊梅", prevEng: "Yangmei", next: "竹南", nextEng: "Zhunan", prevDist: 21.3, nextDist: 15.6 },
  { level: 9, name: "竹南", english: "Zhunan", prev: "新竹", prevEng: "Hsinchu", next: "苗栗", nextEng: "Miaoli", prevDist: 15.6, nextDist: 15.0 },
  { level: 10, name: "苗栗", english: "Miaoli", prev: "竹南", prevEng: "Zhunan", next: "豐原", nextEng: "Fengyuan", prevDist: 15.0, nextDist: 43.5 },
  { level: 11, name: "豐原", english: "Fengyuan", prev: "苗栗", prevEng: "Miaoli", next: "台中", nextEng: "Taichung", prevDist: 43.5, nextDist: 11.2 },
  { level: 12, name: "台中", english: "Taichung", prev: "豐原", prevEng: "Fengyuan", next: "彰化", nextEng: "Changhua", prevDist: 11.2, nextDist: 17.5 },
  { level: 13, name: "彰化", english: "Changhua", prev: "台中", prevEng: "Taichung", next: "員林", nextEng: "Yuanlin", prevDist: 17.5, nextDist: 15.8 },
  { level: 14, name: "員林", english: "Yuanlin", prev: "彰化", prevEng: "Changhua", next: "田中", nextEng: "Tianzhong", prevDist: 15.8, nextDist: 11.4 },
  { level: 15, name: "田中", english: "Tianzhong", prev: "員林", prevEng: "Yuanlin", next: "斗六", nextEng: "Douliu", prevDist: 11.4, nextDist: 19.3 },
  { level: 16, name: "斗六", english: "Douliu", prev: "田中", prevEng: "Tianzhong", next: "嘉義", nextEng: "Chiayi", prevDist: 19.3, nextDist: 28.5 },
  { level: 17, name: "嘉義", english: "Chiayi", prev: "斗六", prevEng: "Douliu", next: "新營", nextEng: "Xinying", prevDist: 28.5, nextDist: 28.1 },
  { level: 18, name: "新營", english: "Xinying", prev: "嘉義", prevEng: "Chiayi", next: "台南", nextEng: "Tainan", prevDist: 28.1, nextDist: 41.7 },
  { level: 19, name: "台南", english: "Tainan", prev: "新營", prevEng: "Xinying", next: "岡山", nextEng: "Gangshan", prevDist: 41.7, nextDist: 31.2 },
  { level: 20, name: "岡山", english: "Gangshan", prev: "台南", prevEng: "Tainan", next: "新左營", nextEng: "Xinzuoying", prevDist: 31.2, nextDist: 11.8 },
  { level: 21, name: "新左營", english: "Xinzuoying", prev: "岡山", prevEng: "Gangshan", next: "高雄", nextEng: "Kaohsiung", prevDist: 11.8, nextDist: 6.8 },
  { level: 22, name: "高雄", english: "Kaohsiung", prev: "新左營", prevEng: "Kaohsiung", next: "鳳山", nextEng: "Fengshan", prevDist: 6.8, nextDist: 6.2 },
  { level: 23, name: "鳳山", english: "Fengshan", prev: "高雄", prevEng: "Kaohsiung", next: "屏東", nextEng: "Pingtung", prevDist: 6.2, nextDist: 15.0 },
  { level: 24, name: "屏東", english: "Pingtung", prev: "鳳山", prevEng: "Fengshan", next: "潮州", nextEng: "Chaozhou", prevDist: 15.0, nextDist: 15.2 },
  { level: 25, name: "潮州", english: "Chaozhou", prev: "屏東", prevEng: "Pingtung", next: "枋寮", nextEng: "Fangliao", prevDist: 15.2, nextDist: 20.1 },
  { level: 26, name: "枋寮", english: "Fangliao", prev: "潮州", prevEng: "Chaozhou", next: "大武", nextEng: "Dawu", prevDist: 20.1, nextDist: 46.2 },
  { level: 27, name: "大武", english: "Dawu", prev: "枋寮", prevEng: "Fangliao", next: "太麻里", nextEng: "Taimali", prevDist: 46.2, nextDist: 28.5 },
  { level: 28, name: "太麻里", english: "Taimali", prev: "大武", prevEng: "Dawu", next: "知本", nextEng: "Zhiben", prevDist: 28.5, nextDist: 11.7 },
  { level: 29, name: "知本", english: "Zhiben", prev: "太麻里", prevEng: "Taimali", next: "台東", nextEng: "Taitung", prevDist: 11.7, nextDist: 11.0 },
  { level: 30, name: "台東", english: "Taitung", prev: "知本", prevEng: "Zhiben", next: "關山", nextEng: "Guanshan", prevDist: 11.0, nextDist: 42.1 },
  { level: 31, name: "關山", english: "Guanshan", prev: "台東", prevEng: "Taitung", next: "池上", nextEng: "Chishang", prevDist: 42.1, nextDist: 14.1 },
  { level: 32, name: "池上", english: "Chishang", prev: "關山", prevEng: "Guanshan", next: "玉里", nextEng: "Yuli", prevDist: 14.1, nextDist: 25.1 },
  { level: 33, name: "玉里", english: "Yuli", prev: "池上", prevEng: "Chishang", next: "瑞穗", nextEng: "Ruisui", prevDist: 25.1, nextDist: 23.4 },
  { level: 34, name: "瑞穗", english: "Ruisui", prev: "玉里", prevEng: "Yuli", next: "光復", nextEng: "Guangfu", prevDist: 23.4, nextDist: 19.5 },
  { level: 35, name: "光復", english: "Guangfu", prev: "瑞穗", prevEng: "Ruisui", next: "鳳林", nextEng: "Fenglin", prevDist: 19.5, nextDist: 14.2 },
  { level: 36, name: "鳳林", english: "Fenglin", prev: "光復", prevEng: "Guangfu", next: "壽豐", nextEng: "Shoufeng", prevDist: 14.2, nextDist: 11.2 },
  { level: 37, name: "壽豐", english: "Shoufeng", prev: "鳳林", prevEng: "Fenglin", next: "花蓮", nextEng: "Hualien", prevDist: 11.2, nextDist: 17.1 },
  { level: 38, name: "花蓮", english: "Hualien", prev: "壽豐", prevEng: "Shoufeng", next: "新城", nextEng: "Xincheng", prevDist: 17.1, nextDist: 16.9 },
  { level: 39, name: "新城", english: "Xincheng", prev: "花蓮", prevEng: "Hualien", next: "南澳", nextEng: "Nanao", prevDist: 16.9, nextDist: 46.2 },
  { level: 40, name: "南澳", english: "Nanao", prev: "新城", prevEng: "Xincheng", next: "東澳", nextEng: "Dongao", prevDist: 46.2, nextDist: 11.0 },
  { level: 41, name: "東澳", english: "Dongao", prev: "南澳", prevEng: "Nanao", next: "蘇澳新", nextEng: "Suaoxin", prevDist: 11.0, nextDist: 8.2 },
  { level: 42, name: "蘇澳新", english: "Suaoxin", prev: "東澳", prevEng: "Dongao", next: "羅東", nextEng: "Luodong", prevDist: 8.2, nextDist: 8.3 },
  { level: 43, name: "羅東", english: "Luodong", prev: "蘇澳新", prevEng: "Suaoxin", next: "宜蘭", nextEng: "Yilan", prevDist: 8.3, nextDist: 7.9 },
  { level: 44, name: "宜蘭", english: "Yilan", prev: "羅東", prevEng: "Luodong", next: "礁溪", nextEng: "Jiaoxi", prevDist: 7.9, nextDist: 9.0 },
  { level: 45, name: "礁溪", english: "Jiaoxi", prev: "宜蘭", prevEng: "Yilan", next: "頭城", nextEng: "Toucheng", prevDist: 9.0, nextDist: 5.6 },
  { level: 46, name: "頭城", english: "Toucheng", prev: "礁溪", prevEng: "Jiaoxi", next: "福隆", nextEng: "Fulong", prevDist: 5.6, nextDist: 32.1 },
  { level: 47, name: "福隆", english: "Fulong", prev: "頭城", prevEng: "Toucheng", next: "瑞芳", nextEng: "Ruifang", prevDist: 32.1, nextDist: 21.0 },
  { level: 48, name: "瑞芳", english: "Ruifang", prev: "福隆", prevEng: "Fulong", next: "基隆", nextEng: "Keelung", prevDist: 21.0, nextDist: 12.0 },
  { level: 49, name: "基隆", english: "Keelung", prev: "瑞芳", prevEng: "Ruifang", next: "松山", nextEng: "Songshan", prevDist: 12.0, nextDist: 20.3 },
  { level: 50, name: "松山", english: "Songshan", prev: "基隆", prevEng: "Keelung", next: "台北", nextEng: "Taipei", prevDist: 20.3, nextDist: 6.4 }
];

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

  // Auto scroll to active station card in railway view
  useEffect(() => {
    if (viewMode === "map" && !showAuth) {
      const timer = setTimeout(() => {
        const activeCard = document.querySelector(".train-station-card.active");
        if (activeCard) {
          activeCard.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      }, 150);
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
    
    // Get all stations in the current round
    const stations = WORLD_TOUR_NODES.map((station, i) => {
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

    return (
      <div className="train-map-container" ref={mapContainerRef}>
        <div className="train-map-header">
          <div className="train-map-title">🚂 溫馨台鐵環島鐵路之旅</div>
          <p className="train-map-subtitle">
            目前火車停靠在：<strong>第 {maxUnlockedLevel} 站 【{activeStation.name}】</strong>，請點選大站牌進入關卡！
          </p>
        </div>

        {/* Horizontal scrollable track area */}
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
                    <span className="steam-train-emoji">🚂💨</span>
                  </div>
                )}

                {/* Taiwan Railway Style Station Board Card */}
                <button
                  className={`train-station-card ${station.isActive ? "active" : ""} ${station.isPlayable ? "unlocked" : "locked"}`}
                  onClick={() => station.isPlayable && handlePlayLevel(station.levelNumber)}
                  disabled={!station.isPlayable}
                >
                  {/* Top part: Logo and Station names */}
                  <div className="card-top">
                    <svg className="tra-badge-logo" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#002d62" strokeWidth="8" />
                      <path d="M 25 50 L 75 50 M 50 25 L 50 75 M 32 32 L 68 68 M 32 68 L 68 32" stroke="#002d62" strokeWidth="6" />
                      <circle cx="50" cy="50" r="22" fill="#ffffff" />
                      <path d="M 40 38 L 60 38 M 50 38 L 50 62 M 35 62 L 65 62" stroke="#002d62" strokeWidth="7" strokeLinecap="round" />
                    </svg>
                    
                    <div className="station-titles">
                      <span className="station-name-zh">{station.name}</span>
                      <span className="station-name-en">{station.english}</span>
                    </div>
                  </div>

                  {/* Middle part: classic green bar with arrows */}
                  <div className="card-middle">
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
