import type { RawIdiom, GameLevel, PlacedIdiom, GridCell, LevelOverride } from "../types";
import idiomsData from "../data/idioms.json";
// Seeded random generator (SFC32)
function createRng(seed: number) {
  let a = (seed * 15485863) >>> 0;
  let b = (seed * 32452843) >>> 0;
  let c = (seed * 49612547) >>> 0;
  let d = (seed * 86028121) >>> 0;
  
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle using seeded RNG
function shuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// -------------------------------------------------------------
// Pre-process and shuffle idioms globally (deterministic seed 42)
// -------------------------------------------------------------
const rawIdiomsAll: RawIdiom[] = idiomsData as RawIdiom[];

// Separate into Main (m=1) and Sub (m=0) pools
// Separate into Main (m=1) pool
const mainIdiomsPool = rawIdiomsAll.filter(x => x.m === 1);

// Global shuffled sequences (guarantees uniform distribution and no duplication before round is complete)
const globalRng = createRng(42);
const shuffledMainList = shuffle(mainIdiomsPool, globalRng);
const shuffledAllList = shuffle(rawIdiomsAll, globalRng);

let levelOverrides: Record<number, LevelOverride> = {};

export function setLevelOverrides(overrides: Record<number, LevelOverride>) {
  levelOverrides = overrides;
}

export function generateLevel(levelNumber: number): GameLevel {
  const gridSize = 10;

  // Check if custom level override exists
  if (levelOverrides && levelOverrides[levelNumber]) {
    const overrideData = levelOverrides[levelNumber];
    const placedIdioms: PlacedIdiom[] = JSON.parse(JSON.stringify(overrideData.placedIdioms));
    let grid: (GridCell | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));

    // Place overrides in grid cells
    placedIdioms.forEach((pi, idiomIdx) => {
      for (let i = 0; i < 4; i++) {
        const cellX = pi.isHorizontal ? pi.x + i : pi.x;
        const cellY = pi.isHorizontal ? pi.y : pi.y + i;

        if (cellX >= 0 && cellX < gridSize && cellY >= 0 && cellY < gridSize) {
          const existing = grid[cellY][cellX];
          if (existing) {
            if (!existing.idiomIndices.includes(idiomIdx)) {
              existing.idiomIndices.push(idiomIdx);
            }
          } else {
            grid[cellY][cellX] = {
              x: cellX,
              y: cellY,
              char: pi.idiom[i],
              userChar: "",
              isSystemRevealed: false,
              idiomIndices: [idiomIdx]
            };
          }
        }
      }
    });

    // 4. Reveal clues (characters) to players
    const allCells: GridCell[] = [];
    grid.forEach(row => row.forEach(cell => {
      if (cell) allCells.push(cell);
    }));

    const cellShuffleRng = createRng(levelNumber + 999);
    const shuffledCells = shuffle(allCells, cellShuffleRng);

    // Reveal intersection cells
    allCells.forEach(cell => {
      if (cell.idiomIndices.length > 1) {
        cell.isSystemRevealed = true;
      }
    });

    // Calculate target reveal count based on level ratio
    let revealRatio = 0.35;
    if (levelNumber <= 5) revealRatio = 0.55;
    else if (levelNumber <= 10) revealRatio = 0.45;

    const targetRevealCount = Math.floor(allCells.length * revealRatio);
    let currentRevealCount = allCells.filter(c => c.isSystemRevealed).length;

    for (let i = 0; i < shuffledCells.length; i++) {
      if (currentRevealCount >= targetRevealCount) break;
      const cell = shuffledCells[i];
      if (!cell.isSystemRevealed) {
        cell.isSystemRevealed = true;
        currentRevealCount++;
      }
    }

    // Fill in userChar for revealed cells
    allCells.forEach(cell => {
      if (cell.isSystemRevealed) {
        cell.userChar = cell.char;
      }
    });

    // 5. Generate character pool (tiles)
    const hiddenChars: string[] = [];
    allCells.forEach(cell => {
      if (!cell.isSystemRevealed) {
        hiddenChars.push(cell.char);
      }
    });

    const poolRng = createRng(levelNumber + 777);
    const charPool = shuffle([...hiddenChars], poolRng);

    return {
      levelNumber,
      placedIdioms,
      grid,
      charPool
    };
  }

  const rng = createRng(levelNumber + 500); // Shift seed offset
  
  // 1. Calculate Main and Sub offsets from previous levels to ensure no repeats
  let mainOffset = 0;
  let subOffset = 0;

  for (let l = 1; l < levelNumber; l++) {
    const lRng = createRng(l + 500);
    let count = 2;
    if (l > 1 && l <= 5) count = 3;
    else if (l > 5 && l <= 10) count = 4;
    else if (l > 10 && l <= 25) count = 5 + Math.floor(lRng() * 2);
    else if (l > 25) count = 7 + Math.floor(lRng() * 3);

    // Difficulty ratio: 
    // L1-10: 100% main
    // L11-25: 80% main, 20% sub
    // L26+: 60% main, 40% sub
    let mainCount = count;
    let subCount = 0;
    if (l > 10 && l <= 25) {
      subCount = Math.floor(count * 0.2);
      mainCount = count - subCount;
    } else if (l > 25) {
      subCount = Math.floor(count * 0.4);
      mainCount = count - subCount;
    }
    
    mainOffset += mainCount;
    subOffset += subCount;
  }
  
  // Determine idiom count for current level
  let targetIdiomCount = 2;
  if (levelNumber > 1 && levelNumber <= 5) targetIdiomCount = 3;
  else if (levelNumber > 5 && levelNumber <= 10) targetIdiomCount = 4;
  else if (levelNumber > 10 && levelNumber <= 25) targetIdiomCount = 5 + Math.floor(rng() * 2);
  else if (levelNumber > 25) targetIdiomCount = 7 + Math.floor(rng() * 3);

  let grid: (GridCell | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
  let placedIdioms: PlacedIdiom[] = [];
  const selectedIdiomStrings = new Set<string>();

  // 2. Select starting raw idiom (first node)
  let startRaw: RawIdiom;
  if (levelNumber <= 10) {
    // Front 10 levels: strictly main idioms
    const idx = mainOffset % shuffledMainList.length;
    startRaw = shuffledMainList[idx];
  } else {
    // Normal progression
    const idx = (mainOffset + subOffset) % shuffledAllList.length;
    startRaw = shuffledAllList[idx];
  }

  // Place first idiom in the center
  const startX = 3;
  const startY = 4;
  
  placedIdioms.push({
    idiom: startRaw.i,
    zhuyin: startRaw.p,
    definition: startRaw.d,
    x: startX,
    y: startY,
    isHorizontal: true,
    isUnlocked: false
  });
  
  selectedIdiomStrings.add(startRaw.i);
  
  for (let i = 0; i < 4; i++) {
    grid[startY][startX + i] = {
      x: startX + i,
      y: startY,
      char: startRaw.i[i],
      userChar: "",
      isSystemRevealed: false,
      idiomIndices: [0]
    };
  }

  const inBounds = (x: number, y: number) => x >= 0 && x < gridSize && y >= 0 && y < gridSize;

  // 3. Try to branch and place additional idioms
  let branchAttempts = 0;
  while (placedIdioms.length < targetIdiomCount && branchAttempts < 500) {
    branchAttempts++;
    
    const parentIdx = Math.floor(rng() * placedIdioms.length);
    const parent = placedIdioms[parentIdx];
    
    const parentCharIdx = Math.floor(rng() * 4);
    const parentCharX = parent.isHorizontal ? parent.x + parentCharIdx : parent.x;
    const parentCharY = parent.isHorizontal ? parent.y : parent.y + parentCharIdx;
    
    const branchChar = parent.idiom[parentCharIdx];
    
    // Choose search pool based on level difficulty
    // L1-10: strictly main idioms, L11+: all idioms
    const searchPool = levelNumber <= 10 ? mainIdiomsPool : rawIdiomsAll;
    const candidates = searchPool.filter(item => 
      item.i.includes(branchChar) && 
      !selectedIdiomStrings.has(item.i)
    );
    
    if (candidates.length === 0) continue;
    
    const chosenRaw = candidates[Math.floor(rng() * candidates.length)];
    const childCharIdx = chosenRaw.i.indexOf(branchChar);
    if (childCharIdx === -1) continue;

    const childIsHorizontal = !parent.isHorizontal;
    
    const childX = childIsHorizontal ? parentCharX - childCharIdx : parentCharX;
    const childY = childIsHorizontal ? parentCharY : parentCharY - childCharIdx;
    
    let canPlace = true;
    
    const xEnd = childIsHorizontal ? childX + 3 : childX;
    const yEnd = childIsHorizontal ? childY : childY + 3;
    
    if (!inBounds(childX, childY) || !inBounds(xEnd, yEnd)) continue;
    
    for (let i = 0; i < 4; i++) {
      const cellX = childIsHorizontal ? childX + i : childX;
      const cellY = childIsHorizontal ? childY : childY + i;
      
      const existing = grid[cellY][cellX];
      
      if (existing) {
        if (existing.char !== chosenRaw.i[i]) {
          canPlace = false;
          break;
        }
      } else {
        if (!childIsHorizontal) {
          const left = grid[cellY][cellX - 1];
          const right = grid[cellY][cellX + 1];
          if (left || right) {
            canPlace = false;
            break;
          }
        } else {
          const top = grid[cellY - 1] ? grid[cellY - 1][cellX] : null;
          const bottom = grid[cellY + 1] ? grid[cellY + 1][cellX] : null;
          if (top || bottom) {
            canPlace = false;
            break;
          }
        }
      }
    }
    
    const prevX = childIsHorizontal ? childX - 1 : childX;
    const prevY = childIsHorizontal ? childY : childY - 1;
    const nextX = childIsHorizontal ? childX + 4 : childX;
    const nextY = childIsHorizontal ? childY : childY + 4;
    
    if (inBounds(prevX, prevY) && grid[prevY][prevX]) canPlace = false;
    if (inBounds(nextX, nextY) && grid[nextY][nextX]) canPlace = false;
    
    if (canPlace) {
      const newIdiomIdx = placedIdioms.length;
      placedIdioms.push({
        idiom: chosenRaw.i,
        zhuyin: chosenRaw.p,
        definition: chosenRaw.d,
        x: childX,
        y: childY,
        isHorizontal: childIsHorizontal,
        isUnlocked: false
      });
      selectedIdiomStrings.add(chosenRaw.i);
      
      for (let i = 0; i < 4; i++) {
        const cellX = childIsHorizontal ? childX + i : childX;
        const cellY = childIsHorizontal ? childY : childY + i;
        
        const existing = grid[cellY][cellX];
        if (existing) {
          existing.idiomIndices.push(newIdiomIdx);
        } else {
          grid[cellY][cellX] = {
            x: cellX,
            y: cellY,
            char: chosenRaw.i[i],
            userChar: "",
            isSystemRevealed: false,
            idiomIndices: [newIdiomIdx]
          };
        }
      }
    }
  }

  // 4. Reveal clues (characters) to players
  const allCells: GridCell[] = [];
  grid.forEach(row => row.forEach(cell => {
    if (cell) allCells.push(cell);
  }));

  const cellShuffleRng = createRng(levelNumber + 999);
  const shuffledCells = shuffle(allCells, cellShuffleRng);

  // Reveal intersection cells
  allCells.forEach(cell => {
    if (cell.idiomIndices.length > 1) {
      cell.isSystemRevealed = true;
    }
  });

  // Calculate target reveal count based on level ratio
  let revealRatio = 0.35;
  if (levelNumber <= 5) revealRatio = 0.55;
  else if (levelNumber <= 10) revealRatio = 0.45;

  const targetRevealCount = Math.floor(allCells.length * revealRatio);
  let currentRevealCount = allCells.filter(c => c.isSystemRevealed).length;

  for (let i = 0; i < shuffledCells.length; i++) {
    if (currentRevealCount >= targetRevealCount) break;
    const cell = shuffledCells[i];
    if (!cell.isSystemRevealed) {
      cell.isSystemRevealed = true;
      currentRevealCount++;
    }
  }

  // Fill in userChar for revealed cells
  allCells.forEach(cell => {
    if (cell.isSystemRevealed) {
      cell.userChar = cell.char;
    }
  });

  // 5. Generate character pool (tiles)
  const hiddenChars: string[] = [];
  allCells.forEach(cell => {
    if (!cell.isSystemRevealed) {
      hiddenChars.push(cell.char);
    }
  });

  const poolRng = createRng(levelNumber + 777);
  const charPool = shuffle([...hiddenChars], poolRng);

  return {
    levelNumber,
    placedIdioms,
    grid,
    charPool
  };
}
