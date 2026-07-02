import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import type { LeaderboardEntry } from "../types";

interface LeaderboardProps {
  onClose: () => void;
  currentUsername: string | null;
  currentScore: number;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ 
  onClose, 
  currentUsername, 
  currentScore 
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!isFirebaseConfigured) {
        // Fallback to local storage records if offline
        const localList: LeaderboardEntry[] = [];
        try {
          const listJson = localStorage.getItem("idiom_users_list");
          let usersList: string[] = listJson ? JSON.parse(listJson) : [];
          
          if (currentUsername && !usersList.includes(currentUsername)) {
            usersList.push(currentUsername);
          }

          usersList.forEach(name => {
            if (name === "owner") return;
            const level = Number(localStorage.getItem(`idiom_level_${name}`)) || 1;
            const score = Number(localStorage.getItem(`idiom_score_${name}`)) || 0;
            localList.push({
              username: name,
              currentLevel: level,
              totalScore: score,
              updatedAt: Date.now()
            });
          });
        } catch (e) {
          console.error(e);
          // Fallback if JSON parsing fails
          if (currentUsername) {
            localList.push({
              username: currentUsername,
              currentLevel: Number(localStorage.getItem(`idiom_level_${currentUsername}`)) || 1,
              totalScore: currentScore,
              updatedAt: Date.now()
            });
          }
        }
        
        localList.sort((a, b) => b.totalScore - a.totalScore);
        setEntries(localList.slice(0, 10));
        setLoading(false);
        return;
      }

      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("totalScore", "desc"), limit(10));
        const querySnapshot = await getDocs(q);
        
        const leaderboardData: LeaderboardEntry[] = [];
        querySnapshot.forEach((doc: any) => {
          const data = doc.data();
          leaderboardData.push({
            username: data.username,
            currentLevel: data.currentLevel || 1,
            totalScore: data.totalScore || 0,
            updatedAt: data.updatedAt || 0
          });
        });
        
        setEntries(leaderboardData);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentUsername, currentScore]);

  return (
    <div className="modal-overlay">
      <div className="modal-content leaderboard-modal">
        <h2 className="text-center">🏆 榮譽金榜 (排行榜)</h2>
        <p className="subtitle text-center">看看誰是成語接龍大師！</p>

        {loading ? (
          <div className="loading-spinner text-center">載入金榜中...</div>
        ) : (
          <div className="leaderboard-table-container">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th style={{ width: "20%" }}>名次</th>
                  <th style={{ width: "40%" }}>玩家</th>
                  <th style={{ width: "20%" }}>關卡</th>
                  <th style={{ width: "20%" }}>總積分</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const isCurrentUser = entry.username === currentUsername;
                  let medal = "";
                  if (index === 0) medal = "🥇";
                  else if (index === 1) medal = "🥈";
                  else if (index === 2) medal = "🥉";
                  else medal = `${index + 1}`;

                  return (
                    <tr key={index} className={isCurrentUser ? "row-current-user" : ""}>
                      <td className="rank-col">{medal}</td>
                      <td className="username-col">
                        {entry.username} {isCurrentUser && <span className="tag-you">(你)</span>}
                      </td>
                      <td className="level-col">第 {entry.currentLevel} 關</td>
                      <td className="score-col">{entry.totalScore} 分</td>
                    </tr>
                  );
                })}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center">目前尚無紀錄</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions text-center">
          <button className="btn btn-secondary btn-large" onClick={onClose}>
            返回遊戲
          </button>
        </div>
        
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
    </div>
  );
};
