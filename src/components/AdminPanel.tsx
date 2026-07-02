import React, { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
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
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout, tourNodes }) => {
  const [users, setUsers] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"Firebase 雲端" | "LocalStorage 本地">("LocalStorage 本地");
  const [activeTab, setActiveTab] = useState<"users" | "levels">("users");
  
  // Collapse state for level details, key: levelNumber, value: boolean
  const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>({});
  const [selectedRound, setSelectedRound] = useState<number>(0);

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
  }, []);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "無紀錄";
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
                      <th style={{ padding: "12px", textAlign: "left", width: "10%" }}>名次</th>
                      <th style={{ padding: "12px", textAlign: "left", width: "35%" }}>玩家帳號 (名稱)</th>
                      <th style={{ padding: "12px", textAlign: "center", width: "20%" }}>當前最高關卡</th>
                      <th style={{ padding: "12px", textAlign: "right", width: "15%" }}>總積分</th>
                      <th style={{ padding: "12px", textAlign: "right", width: "20%" }}>最後更新時間</th>
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
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#999" }}>目前尚無任何玩家資料</td>
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
