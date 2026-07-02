import React from "react";

export interface PoolWord {
  id: string;   // 唯一識別碼，格式如 "char-0", "char-1"
  char: string; // 字元本身 (e.g. "毛")
  isUsed: boolean;
}

interface WordBoardProps {
  words: PoolWord[];
  onWordClick: (word: PoolWord) => void;
  onBackspace: () => void;
  onHint: () => void;
  hasInput: boolean; // 是否有已填入但未鎖定的字元，用以控制清除按鈕是否啟用
}

export const WordBoard: React.FC<WordBoardProps> = ({
  words,
  onWordClick,
  onBackspace,
  onHint,
  hasInput
}) => {
  return (
    <div className="word-board">
      <div className="board-header">
        <span>🎨 備選字盤 (點選大字填入上方空格)</span>
      </div>
      
      <div className="words-grid">
        {words.map((word) => (
          <button
            key={word.id}
            className={`word-tile ${word.isUsed ? "used" : ""}`}
            onClick={() => !word.isUsed && onWordClick(word)}
            disabled={word.isUsed}
          >
            {word.char}
          </button>
        ))}
      </div>

      <div className="board-actions">
        <button 
          className="btn btn-secondary btn-large" 
          onClick={onBackspace}
          disabled={!hasInput}
        >
          ⌫ 刪除最後一字
        </button>
        <button 
          className="btn btn-accent btn-large" 
          onClick={onHint}
        >
          💡 提示一字
        </button>
      </div>
    </div>
  );
};
