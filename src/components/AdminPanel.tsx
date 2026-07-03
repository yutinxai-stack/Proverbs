import React, { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { generateLevel } from "../utils/levelGenerator";

interface UserProgress {
  username: string;
  currentLevel: number;
  totalScore: number;
  updatedAt: number;
}

interface TourNode {
  level: number;
  name: string;
  left: number;
  top: number;
}

interface AdminPanelProps {
  onLogout: () => void;
  tourNodes: TourNode[];
  onRefreshOverrides: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout, tourNodes, onRefreshOverrides }) => {
  const [users, setUsers] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"Firebase 雲端" | "LocalStorage 本地">("LocalStorage 本地");
  const [activeTab, setActiveTab] = useState<"users" | "levels">("users");
  
  // Collapse state for level details, key: levelNumber, value: boolean
  const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>({});
  const [selectedRound, setSelectedRound] = useState<number>(0);

  // Edit states for user progress modification
  const [editingUser, setEditingUser] = useState<UserProgress | null>(null);
  const [editLevelVal, setEditLevelVal] = useState<number>(1);
  const [editScoreVal, setEditScoreVal] = useState<number>(0);

  // Edit states for level custom overrides
  const [editingLevelNum, setEditingLevelNum] = useState<number | null>(null);
  const [customIdiomsStr, setCustomIdiomsStr] = useState<string>("");
  const [customDefs, setCustomDefs] = useState<Record<string, { definition: string; zhuyin: string }>>({});
  const [overriddenLevels, setOverriddenLevels] = useState<Record<number, boolean>>({});

  const fetchOverriddenLevels = async () => {
    const list: Record<number, boolean> = {};
    if (isFirebaseConfigured) {
      try {
        const querySnapshot = await getDocs(collection(db, "levelOverrides"));
        querySnapshot.forEach((docSnap: any) => {
          const lvl = Number(docSnap.id.replace("level_", ""));
          if (lvl) list[lvl] = true;
        });
      } catch (e) {
        console.error(e);
      }
    }
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("idiom_level_override_")) {
          const lvl = Number(key.replace("idiom_level_override_", ""));
          if (lvl) list[lvl] = true;
        }
      }
    } catch (e) {
      console.error(e);
    }
    setOverriddenLevels(list);
  };

  const fetchUsers = async () => {
    setLoading(true);
    if (!isFirebaseConfigured) {
      setMode("LocalStorage 本地");
      loadLocalUsers();
      setLoading(false);
      return;
    }

    setMode("Firebase 雲端");
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("totalScore", "desc"));
      const querySnapshot = await getDocs(q);
      
      const list: UserProgress[] = [];
      querySnapshot.forEach((doc: any) => {
        const data = doc.data();
        list.push({
          username: data.username || doc.id,
          currentLevel: data.currentLevel || 1,
          totalScore: data.totalScore || 0,
          updatedAt: data.updatedAt || 0
        });
      });
      setUsers(list);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      loadLocalUsers();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalUsers = () => {
    try {
      const listJson = localStorage.getItem("idiom_users_list");
      const usersList: string[] = listJson ? JSON.parse(listJson) : [];
      
      const list: UserProgress[] = usersList
        .filter(name => name !== "owner")
        .map(name => {
          const level = Number(localStorage.getItem(`idiom_level_${name}`)) || 1;
          const score = Number(localStorage.getItem(`idiom_score_${name}`)) || 0;
          return {
            username: name,
            currentLevel: level,
            totalScore: score,
            updatedAt: Date.now()
          };
        });
      list.sort((a, b) => b.totalScore - a.totalScore);
      setUsers(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearLocalData = () => {
    if (window.confirm("⚠️ 確定要清除這台電腦上的所有玩家紀錄嗎？此動作無法復原！")) {
      try {
        const listJson = localStorage.getItem("idiom_users_list");
        const usersList: string[] = listJson ? JSON.parse(listJson) : [];
        usersList.forEach(name => {
          localStorage.removeItem(`idiom_level_${name}`);
          localStorage.removeItem(`idiom_score_${name}`);
        });
        localStorage.removeItem("idiom_users_list");
        localStorage.removeItem("idiom_user");
        setUsers([]);
        alert("已清除所有本地資料");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const toggleLevelExpand = (levelNum: number) => {
    setExpandedLevels(prev => ({
      ...prev,
      [levelNum]: !prev[levelNum]
    }));
  };

  useEffect(() => {
    fetchUsers();
    fetchOverriddenLevels();
  }, []);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "無紀錄";
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  // ==========================================
  // 1. 玩家進度編輯與刪除邏輯
  // ==========================================
  const handleStartEditUser = (u: UserProgress) => {
    setEditingUser(u);
    setEditLevelVal(u.currentLevel);
    setEditScoreVal(u.totalScore);
  };

  const handleSaveUserProgress = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        const userDocRef = doc(db, "users", editingUser.username);
        await updateDoc(userDocRef, {
          currentLevel: editLevelVal,
          totalScore: editScoreVal,
          updatedAt: Date.now()
        });
      } else {
        localStorage.setItem(`idiom_level_${editingUser.username}`, String(editLevelVal));
        localStorage.setItem(`idiom_score_${editingUser.username}`, String(editScoreVal));
      }
      alert("儲存成功！");
      setEditingUser(null);
      await fetchUsers();
    } catch (e) {
      console.error(e);
      alert("儲存時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(`⚠️ 確定要刪除玩家「${username}」嗎？此動作無法復原！`)) return;
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        await deleteDoc(doc(db, "users", username));
      } else {
        localStorage.removeItem(`idiom_level_${username}`);
        localStorage.removeItem(`idiom_score_${username}`);
        const listJson = localStorage.getItem("idiom_users_list");
        const list: string[] = listJson ? JSON.parse(listJson) : [];
        const newList = list.filter(x => x !== username);
        localStorage.setItem("idiom_users_list", JSON.stringify(newList));
      }
      alert("已刪除該玩家！");
      await fetchUsers();
    } catch (e) {
      console.error(e);
      alert("刪除時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. 關卡自訂與重置邏輯
  // ==========================================
  const handleStartEditLevel = (levelNum: number) => {
    setEditingLevelNum(levelNum);
    // 試圖載入目前關卡的成語以供編輯
    let currentLevelData: any = null;
    try {
      currentLevelData = generateLevel(levelNum);
    } catch (e) {
      // ignore
    }
    
    if (currentLevelData) {
      const idioms = currentLevelData.placedIdioms.map((pi: any) => pi.idiom).join(", ");
      setCustomIdiomsStr(idioms);
      const defs: Record<string, { definition: string; zhuyin: string }> = {};
      currentLevelData.placedIdioms.forEach((pi: any) => {
        defs[pi.idiom] = { definition: pi.definition, zhuyin: pi.zhuyin };
      });
      setCustomDefs(defs);
    } else {
      setCustomIdiomsStr("");
      setCustomDefs({});
    }
  };

  const handleUpdateDef = (idiom: string, field: "definition" | "zhuyin", val: string) => {
    setCustomDefs(prev => ({
      ...prev,
      [idiom]: {
        ...prev[idiom],
        [field]: val
      }
    }));
  };

  // 100% 絕對成功且極度容錯的平行/交錯網格排版生成器
  const layoutCustomIdioms = (idioms: string[]) => {
    const placed: any[] = [];
    const gridSize = 10;
    
    // 只保留四字成語
    const validIdioms = idioms.map(x => x.trim()).filter(x => x.length === 4);
    if (validIdioms.length === 0) return null;
    
    // 1. 第一個成語橫放在中心
    const firstIdiom = validIdioms[0];
    placed.push({
      idiom: firstIdiom,
      zhuyin: customDefs[firstIdiom]?.zhuyin || "",
      definition: customDefs[firstIdiom]?.definition || "自訂成語說明",
      x: 3,
      y: 4,
      isHorizontal: true,
      isUnlocked: false
    });
    
    // 2. 剩餘成語嘗試進行十字交叉
    for (let idx = 1; idx < validIdioms.length; idx++) {
      const idiom = validIdioms[idx];
      let placedSuccess = false;
      
      for (let pIdx = 0; pIdx < placed.length; pIdx++) {
        const p = placed[pIdx];
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            if (p.idiom[i] === idiom[j]) {
              const crossIsHorizontal = !p.isHorizontal;
              const intersectX = p.isHorizontal ? p.x + i : p.x;
              const intersectY = p.isHorizontal ? p.y : p.y + i;
              const startX = crossIsHorizontal ? intersectX - j : intersectX;
              const startY = crossIsHorizontal ? intersectY : intersectY - j;
              
              if (startX >= 0 && startX + (crossIsHorizontal ? 3 : 0) < gridSize &&
                  startY >= 0 && startY + (crossIsHorizontal ? 0 : 3) < gridSize) {
                placed.push({
                  idiom,
                  zhuyin: customDefs[idiom]?.zhuyin || "",
                  definition: customDefs[idiom]?.definition || "自訂成語說明",
                  x: startX,
                  y: startY,
                  isHorizontal: crossIsHorizontal,
                  isUnlocked: false
                });
                placedSuccess = true;
                break;
              }
            }
          }
          if (placedSuccess) break;
        }
        if (placedSuccess) break;
      }
      
      // 3. 無法交叉時，平行放置在不同行 (y = idx * 2)，保證 100% 成功
      if (!placedSuccess) {
        const targetY = (idx * 2) % gridSize;
        placed.push({
          idiom,
          zhuyin: customDefs[idiom]?.zhuyin || "",
          definition: customDefs[idiom]?.definition || "自訂成語說明",
          x: 2,
          y: targetY,
          isHorizontal: true,
          isUnlocked: false
        });
      }
    }
    
    return placed;
  };

  const handleSaveCustomLevel = async () => {
    if (editingLevelNum === null) return;
    
    // 解析成語輸入（支援英文逗號、中文逗號、頓號）
    const idioms = customIdiomsStr.split(/[,，、]+/).map(x => x.trim()).filter(Boolean);
    const placedIdioms = layoutCustomIdioms(idioms);
    
    if (!placedIdioms) {
      alert("請至少輸入一個四字成語！");
      return;
    }
    
    setLoading(true);
    try {
      const overrideData = {
        levelNumber: editingLevelNum,
        placedIdioms
      };
      
      if (isFirebaseConfigured) {
        await setDoc(doc(db, "levelOverrides", `level_${editingLevelNum}`), overrideData);
      } else {
        localStorage.setItem(`idiom_level_override_${editingLevelNum}`, JSON.stringify(overrideData));
      }
      
      alert(`第 ${editingLevelNum} 關自訂成功！`);
      setEditingLevelNum(null);
      await fetchOverriddenLevels();
      await onRefreshOverrides(); // 刷新 App 全域關卡快取
    } catch (e) {
      console.error(e);
      alert("儲存關卡時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  const handleResetLevel = async (levelNum: number) => {
    if (!window.confirm(`确定要將第 ${levelNum} 關恢復為系統預設成語嗎？`)) return;
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        await deleteDoc(doc(db, "levelOverrides", `level_${levelNum}`));
      } else {
        localStorage.removeItem(`idiom_level_override_${levelNum}`);
      }
      alert("已重置恢復預設關卡！");
      await fetchOverriddenLevels();
      await onRefreshOverrides(); // 刷新 App 全域關卡快取
    } catch (e) {
      console.error(e);
      alert("重置關卡時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="game-container" style={{ maxWidth: "900px", margin: "30px auto", padding: "10px" }}>
      <div className="card admin-card" style={{ background: "rgba(255, 255, 255, 0.95)", borderRadius: "16px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", padding: "25px" }}>
        
        {/* Title Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #8b5a2b", paddingBottom: "15px", marginBottom: "20px" }}>
          <h1 style={{ color: "#8b5a2b", margin: 0, fontSize: "2.2rem" }}>⚙️ 系統管理後台</h1>
          <span className="badge" style={{ backgroundColor: "#8b5a2b", color: "#fff", padding: "6px 12px", borderRadius: "20px", fontSize: "0.9rem" }}>
            系統模式：{mode}
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button 
            className={`btn ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("users")}
            style={{ flex: 1, padding: "12px", fontSize: "1.1rem" }}
          >
            👥 玩家遊戲進度 ({users.length})
          </button>
          <button 
            className={`btn ${activeTab === "levels" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("levels")}
            style={{ flex: 1, padding: "12px", fontSize: "1.1rem" }}
          >
            📖 關卡成語清單 (50 關)
          </button>
        </div>

        {/* Tab 1: Users Progress */}
        {activeTab === "users" && (
          <div>
            <p style={{ fontSize: "1.1rem", color: "#666", marginBottom: "15px" }}>
              所有註冊並有遊玩進度的玩家清冊：
            </p>
            
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", fontSize: "1.2rem", color: "#8b5a2b" }}>讀取玩家資料中...</div>
            ) : (
              <div style={{ overflowX: "auto", marginBottom: "30px" }}>
                <table className="leaderboard-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f5e6d3", borderBottom: "2px solid #8b5a2b" }}>
                      <th style={{ padding: "12px", textAlign: "left", width: "8%" }}>名次</th>
                      <th style={{ padding: "12px", textAlign: "left", width: "27%" }}>玩家帳號 (名稱)</th>
                      <th style={{ padding: "12px", textAlign: "center", width: "15%" }}>當前最高關卡</th>
                      <th style={{ padding: "12px", textAlign: "right", width: "15%" }}>總積分</th>
                      <th style={{ padding: "12px", textAlign: "right", width: "17%" }}>最後更新時間</th>
                      <th style={{ padding: "12px", textAlign: "center", width: "18%" }}>管理操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.username} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "12px" }}>{i + 1}</td>
                        <td style={{ padding: "12px", fontWeight: "bold", color: "#222" }}>{u.username}</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>第 {u.currentLevel} 關</td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: "bold", color: "#2e7d32" }}>{u.totalScore} 分</td>
                        <td style={{ padding: "12px", textAlign: "right", fontSize: "0.85rem", color: "#666" }}>{formatDate(u.updatedAt)}</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <button 
                            className="btn" 
                            onClick={() => handleStartEditUser(u)} 
                            style={{ padding: "4px 8px", fontSize: "0.85rem", marginRight: "5px", backgroundColor: "#ff9f1c", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                          >
                            ✏️ 修改
                          </button>
                          <button 
                            className="btn" 
                            onClick={() => handleDeleteUser(u.username)} 
                            style={{ padding: "4px 8px", fontSize: "0.85rem", backgroundColor: "#e71d36", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                          >
                            🗑️ 刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#999" }}>目前尚無任何玩家資料</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "10px" }}>
              <button className="btn btn-danger" onClick={handleClearLocalData} style={{ padding: "10px 20px" }}>
                🗑️ 清除本地所有玩家資料
              </button>
            </div>
            
            {/* 修改玩家進度 Modal 彈窗 */}
            {editingUser && (
              <div className="auth-modal-overlay" style={{ zIndex: 100, position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="auth-modal-card" style={{ maxWidth: "400px", width: "90%", padding: "25px", borderRadius: "16px", backgroundColor: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                  <h2 style={{ color: "#8b5a2b", borderBottom: "3px solid #8b5a2b", paddingBottom: "10px", margin: "0 0 20px 0", fontSize: "1.5rem" }}>✏️ 修改玩家進度</h2>
                  <div style={{ marginBottom: "15px" }}>
                    <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px", color: "#5d3e21" }}>玩家帳號：</label>
                    <input type="text" value={editingUser.username} disabled style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", backgroundColor: "#f0f0f0", fontSize: "1rem" }} />
                  </div>
                  <div style={{ marginBottom: "15px" }}>
                    <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px", color: "#5d3e21" }}>當前最高關卡 (1-1300)：</label>
                    <input 
                      type="number" 
                      value={editLevelVal} 
                      onChange={(e) => setEditLevelVal(Math.max(1, Math.min(1300, Number(e.target.value))))} 
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "2px solid #8b5a2b", fontSize: "1rem", outline: "none" }} 
                    />
                  </div>
                  <div style={{ marginBottom: "25px" }}>
                    <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px", color: "#5d3e21" }}>總積分：</label>
                    <input 
                      type="number" 
                      value={editScoreVal} 
                      onChange={(e) => setEditScoreVal(Math.max(0, Number(e.target.value)))} 
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "2px solid #8b5a2b", fontSize: "1rem", outline: "none" }} 
                    />
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn btn-primary" onClick={handleSaveUserProgress} style={{ flex: 1, padding: "10px" }}>儲存變更</button>
                    <button className="btn btn-secondary" onClick={() => setEditingUser(null)} style={{ flex: 1, padding: "10px" }}>取消</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Levels Idioms */}
        {activeTab === "levels" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", gap: "15px", flexWrap: "wrap" }}>
              <p style={{ fontSize: "1.1rem", color: "#666", margin: 0 }}>
                點擊各關卡可展開查閱詳細成語釋義（提示說明）：
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label htmlFor="round-select" style={{ fontWeight: "bold", color: "#8b5a2b", fontSize: "0.95rem" }}>切換關卡區段：</label>
                <select 
                  id="round-select" 
                  value={selectedRound} 
                  onChange={(e) => {
                    setSelectedRound(Number(e.target.value));
                    setExpandedLevels({}); // Clear expand state on switch
                  }}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "2px solid #8b5a2b", fontSize: "0.95rem", outline: "none", cursor: "pointer", backgroundColor: "#fff" }}
                >
                  {Array.from({ length: 26 }).map((_, idx) => (
                    <option key={idx} value={idx}>
                      第 {idx * 50 + 1} - {(idx + 1) * 50} 關 (第 {idx + 1} 輪)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ maxHeight: "480px", overflowY: "auto", border: "1px solid #ddd", borderRadius: "8px", padding: "10px", backgroundColor: "#fafafa" }}>
              {tourNodes.map(node => {
                const actualLevel = selectedRound * 50 + node.level;

                // Generate level data dynamically
                let idiomsList: string[] = [];
                let levelDetails: any = null;
                try {
                  levelDetails = generateLevel(actualLevel);
                  idiomsList = levelDetails.placedIdioms.map((pi: any) => pi.idiom);
                } catch (e) {
                  idiomsList = ["載入中..."];
                }

                const isExpanded = !!expandedLevels[actualLevel];

                return (
                  <div 
                    key={actualLevel} 
                    style={{ 
                      borderBottom: "1px solid #e0e0e0", 
                      padding: "12px 8px", 
                      backgroundColor: isExpanded ? "#fffdfa" : "transparent"
                    }}
                  >
                    {/* Collapsed Header */}
                    <div 
                      onClick={() => toggleLevelExpand(actualLevel)} 
                      style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ fontWeight: "bold", fontSize: "1.1rem", color: "#8b5a2b" }}>
                        第 {actualLevel} 關. {node.name}
                        {overriddenLevels[actualLevel] && (
                          <span style={{ fontSize: "0.8rem", marginLeft: "8px", backgroundColor: "#ff9f1c", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>已自訂</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ backgroundColor: "#e2d2c2", padding: "3px 10px", borderRadius: "4px", fontSize: "0.9rem", color: "#5d3e21" }}>
                          {idiomsList.join(" 、 ")}
                        </div>
                        <span style={{ fontSize: "1.2rem", color: "#8b5a2b" }}>
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && levelDetails && (
                      <div 
                        style={{ 
                          marginTop: "12px", 
                          padding: "12px", 
                          backgroundColor: "#fcf8f2", 
                          borderLeft: "4px solid #8b5a2b", 
                          borderRadius: "4px" 
                        }}
                      >
                        <h4 style={{ margin: "0 0 8px 0", color: "#8b5a2b" }}>📖 關卡成語詳細釋義：</h4>
                        <ul style={{ margin: 0, paddingLeft: "20px" }}>
                          {levelDetails.placedIdioms.map((pi: any, idx: number) => (
                            <li key={idx} style={{ marginBottom: "6px", fontSize: "0.95rem" }}>
                              <strong style={{ color: "#2e7d32" }}>{pi.idiom}</strong>：
                              <span style={{ color: "#555" }}>{pi.definition || "暫無說明"}</span>
                            </li>
                          ))}
                        </ul>
                        
                        <div style={{ marginTop: "15px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                          <button 
                            className="btn" 
                            onClick={(e) => { e.stopPropagation(); handleStartEditLevel(actualLevel); }}
                            style={{ padding: "6px 12px", fontSize: "0.9rem", backgroundColor: "#ff9f1c", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                          >
                            ✏️ 自訂此關成語
                          </button>
                          {overriddenLevels[actualLevel] && (
                            <button 
                              className="btn" 
                              onClick={(e) => { e.stopPropagation(); handleResetLevel(actualLevel); }}
                              style={{ padding: "6px 12px", fontSize: "0.9rem", backgroundColor: "#e71d36", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            >
                              🗑️ 恢復系統預設
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 自訂關卡 Modal 彈窗 */}
            {editingLevelNum !== null && (
              <div className="auth-modal-overlay" style={{ zIndex: 100, position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="auth-modal-card" style={{ maxWidth: "600px", width: "95%", maxHeight: "90vh", overflowY: "auto", padding: "25px", borderRadius: "16px", backgroundColor: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                  <h2 style={{ color: "#8b5a2b", borderBottom: "3px solid #8b5a2b", paddingBottom: "10px", margin: "0 0 20px 0", fontSize: "1.5rem" }}>✏️ 自訂第 {editingLevelNum} 關成語</h2>
                  
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px", color: "#5d3e21" }}>輸入四字成語（最多 5 個，用逗號或頓號隔開）：</label>
                    <input 
                      type="text" 
                      value={customIdiomsStr} 
                      onChange={(e) => setCustomIdiomsStr(e.target.value)} 
                      placeholder="例如：一心一意、三心二意、雙管齊下" 
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "2px solid #8b5a2b", fontSize: "1rem", outline: "none" }} 
                    />
                    <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "5px" }}>提示：成語會自動在 10x10 格子中進行交錯或平行排列。</p>
                  </div>

                  {/* 各個成語的釋義與注音修改 */}
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "1.1rem", color: "#8b5a2b", marginBottom: "10px", borderBottom: "1px solid #ddd", paddingBottom: "5px" }}>📝 編輯成語釋義（提示長輩用）：</h3>
                    {customIdiomsStr.split(/[,，、]+/).map(x => x.trim()).filter(x => x.length === 4).map(idiom => (
                      <div key={idiom} style={{ padding: "12px", border: "1px solid #eee", borderRadius: "8px", marginBottom: "10px", backgroundColor: "#fafafa" }}>
                        <div style={{ fontWeight: "bold", color: "#2e7d32", fontSize: "1.1rem", marginBottom: "8px" }}>{idiom}</div>
                        <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: "0.85rem", color: "#666", display: "block" }}>注音：</label>
                            <input 
                              type="text" 
                              value={customDefs[idiom]?.zhuyin || ""} 
                              onChange={(e) => handleUpdateDef(idiom, "zhuyin", e.target.value)} 
                              style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }} 
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: "0.85rem", color: "#666", display: "block" }}>釋義說明（口語好讀）：</label>
                          <textarea 
                            value={customDefs[idiom]?.definition || ""} 
                            onChange={(e) => handleUpdateDef(idiom, "definition", e.target.value)} 
                            rows={2} 
                            style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem", resize: "none" }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn btn-primary" onClick={handleSaveCustomLevel} style={{ flex: 1, padding: "10px", fontSize: "1.05rem" }}>儲存變更</button>
                    <button className="btn btn-secondary" onClick={() => setEditingLevelNum(null)} style={{ flex: 1, padding: "10px", fontSize: "1.05rem" }}>取消</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ borderTop: "2px solid #8b5a2b", marginTop: "25px", paddingTop: "20px", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary btn-large" onClick={onLogout} style={{ fontSize: "1.1rem", padding: "10px 30px" }}>
            🚪 登出管理後台
          </button>
        </div>

      </div>
    </div>
  );
};
