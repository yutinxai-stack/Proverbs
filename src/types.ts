export interface RawIdiom {
  i: string; // 成語字串 (e.g. "一毛不拔")
  p: string; // 注音 (e.g. "ㄧ ㄇㄠˊ ㄅㄨˋ ㄅㄚˊ")
  d: string; // 釋義
  m?: number; // 主條/非主條成語標記 (1 代表主條常用, 0 代表非主條)
}

export interface PlacedIdiom {
  idiom: string;         // 完整成語 (e.g. "一毛不拔")
  zhuyin: string;        // 注音
  definition: string;    // 釋義
  x: number;             // 在 10x10 網格中的起點 x 坐標 (0-9)
  y: number;             // 在 10x10 網格中的起點 y 坐標 (0-9)
  isHorizontal: boolean; // true 代表橫向，false 代表直向
  isUnlocked: boolean;   // 此成語是否已完全解開
}

export interface GridCell {
  x: number;
  y: number;
  char: string;          // 正確答案的字元
  userChar: string;      // 玩家目前填入的字元 (若為空字串 "" 代表未填)
  isSystemRevealed: boolean; // 是否為系統預設透露的字元
  isUserCorrect?: boolean;   // 玩家是否已經答對此格
  idiomIndices: number[]; // 這格字元所屬的 PlacedIdiom 索引 (可能橫直相交有兩個索引)
}

export interface GameLevel {
  levelNumber: number;
  placedIdioms: PlacedIdiom[]; // 這關的所有成語位置
  grid: (GridCell | null)[][]; // 10x10 的二維棋盤，null 代表空位
  charPool: string[];          // 這關底部備選字盤字元清單
}

export interface UserProgress {
  userId: string;
  username: string;
  currentLevel: number;
  totalScore: number;
  updatedAt: number;
}

export interface LeaderboardEntry {
  username: string;
  currentLevel: number;
  totalScore: number;
  updatedAt: number;
}

export interface LevelOverride {
  levelNumber: number;
  placedIdioms: PlacedIdiom[];
}
