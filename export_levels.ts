import { generateLevel } from "./src/utils/levelGenerator";
import { generateWorldTourNodes } from "./src/utils/railway";
import fs from "fs";
import path from "path";

// Main runner
function main() {
  const dataDir = path.resolve("./data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created directory: ${dataDir}`);
  }

  console.log("Generating 1000 global railway stations...");
  const stations = generateWorldTourNodes();

  console.log("Starting levels export (1 to 1000)...");

  for (let lvl = 1; lvl <= 1000; lvl++) {
    const levelData = generateLevel(lvl);
    const station = stations[lvl - 1];

    let content = "";
    content += `==================================================\n`;
    content += `              成語接龍 - 第 ${lvl} 關\n`;
    content += `==================================================\n\n`;

    // 1. Station Info
    content += `【鐵路之旅停靠站資訊】\n`;
    content += `• 車站名稱：${station.name} (${station.english})\n`;
    content += `• 前一站：${station.prev} (${station.prevEng}) - 距離 ${station.prevDist} 公里\n`;
    content += `• 下一站：${station.next} (${station.nextEng}) - 距離 ${station.nextDist} 公里\n\n`;

    // 2. Playable Tile Pool
    content += `【下方字盤待選字】\n`;
    content += `[ ${levelData.charPool.join(" , ")} ]\n\n`;

    // 3. Grid representation (Question & Answer)
    content += `【題目網格 (空格用？表示)】\n`;
    for (let y = 0; y < 10; y++) {
      let rowStr = "  ";
      for (let x = 0; x < 10; x++) {
        const cell = levelData.grid[y][x];
        if (!cell) {
          rowStr += " ． ";
        } else {
          rowStr += cell.isSystemRevealed ? ` ${cell.char} ` : " ？ ";
        }
      }
      content += rowStr + "\n";
    }
    content += `\n`;

    content += `【解答網格 (漢字全數顯示)】\n`;
    for (let y = 0; y < 10; y++) {
      let rowStr = "  ";
      for (let x = 0; x < 10; x++) {
        const cell = levelData.grid[y][x];
        if (!cell) {
          rowStr += " ． ";
        } else {
          rowStr += ` ${cell.char} `;
        }
      }
      content += rowStr + "\n";
    }
    content += `\n`;

    // 4. Detailed Idioms info
    content += `【本關收錄成語答案清單】\n`;
    levelData.placedIdioms.forEach((pi, idx) => {
      content += `${idx + 1}. ${pi.idiom}\n`;
      content += `   • 注音/拼音：${pi.zhuyin}\n`;
      content += `   • 成語釋義：${pi.definition}\n`;
      content += `   • 網格坐標：${pi.isHorizontal ? "水平" : "垂直"}，起點 X:${pi.x + 1}, Y:${pi.y + 1}\n`;
    });
    content += `\n`;

    // Write file
    const filePath = path.join(dataDir, `level_${lvl}.txt`);
    fs.writeFileSync(filePath, content, "utf8");
  }

  console.log("SUCCESS: 1000 levels successfully exported to data directory!");
}

main();
