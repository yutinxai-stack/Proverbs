import React, { useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword

} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../firebase";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (username: string, score: number, level: number) => void;
  currentUser: string | null;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  onClose, 
  onLoginSuccess,
  currentUser,
  onLogout
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Convert username to a mock email for Firebase Auth
  const getEmailFromUsername = (user: string) => {
    return `${user.trim().toLowerCase()}@idiom-game.com`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("請填寫所有欄位");
      return;
    }
    if (password.length < 6) {
      setError("密碼長度需至少 6 個字元");
      return;
    }

    const addToLocalUsersList = (user: string) => {
      if (user === "owner") return;
      try {
        const listJson = localStorage.getItem("idiom_users_list");
        const list: string[] = listJson ? JSON.parse(listJson) : [];
        if (!list.includes(user)) {
          list.push(user);
          localStorage.setItem("idiom_users_list", JSON.stringify(list));
        }
      } catch (e) {
        console.error("Error updating idiom_users_list", e);
      }
    };

    setError("");
    setLoading(true);

    // Intercept owner admin login (case-insensitive, supports owner and admin)
    const normUser = username.trim().toLowerCase();
    const isAdminAccount = normUser === "owner" || normUser === "admin";
    if (isAdminAccount) {
      if (password === "123321") {
        setLoading(false);
        onLoginSuccess(normUser, 0, 1);
        onClose();
        return;
      } else {
        setLoading(false);
        setError("管理員密碼錯誤，請重新輸入");
        return;
      }
    }

    if (!isFirebaseConfigured) {
      // Offline mode backup
      setLoading(false);
      localStorage.setItem("idiom_user", username);
      addToLocalUsersList(username);
      const savedLevel = Number(localStorage.getItem(`idiom_level_${username}`)) || 1;
      const savedScore = Number(localStorage.getItem(`idiom_score_${username}`)) || 0;
      onLoginSuccess(username, savedScore, savedLevel);
      onClose();
      return;
    }

    const email = getEmailFromUsername(username);

    try {
      if (isSignUp) {
        // 1. Check if username is already taken in Firestore
        const userDocRef = doc(db, "users", username.trim());
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          throw new Error("此使用者名稱已被註冊，請換一個");
        }

        // 2. Create user in Firebase Auth
        await createUserWithEmailAndPassword(auth, email, password);
        
        // 3. Initialize user progress in Firestore
        await setDoc(userDocRef, {
          username: username.trim(),
          currentLevel: 1,
          totalScore: 0,
          updatedAt: Date.now()
        });

        addToLocalUsersList(username.trim());
        onLoginSuccess(username.trim(), 0, 1);
      } else {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
        
        // Fetch progress from Firestore
        const userDocRef = doc(db, "users", username.trim());
        const userDoc = await getDoc(userDocRef);
        
        let score = 0;
        let level = 1;
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          score = data.totalScore || 0;
          level = data.currentLevel || 1;
        } else {
          // If Firestore doc doesn't exist for some reason, create it
          await setDoc(userDocRef, {
            username: username.trim(),
            currentLevel: 1,
            totalScore: 0,
            updatedAt: Date.now()
          });
        }
        
        addToLocalUsersList(username.trim());
        onLoginSuccess(username.trim(), score, level);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("使用者名稱或密碼錯誤");
      } else if (err.code === "auth/email-already-in-use") {
        setError("此名稱已被註冊，請嘗試直接登入或更換名稱");
      } else {
        setError(err.message || "發生錯誤，請稍後再試");
      }
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div className="modal-overlay">
        <div className="modal-content text-center">
          <h2>已登入帳號</h2>
          <p className="user-welcome">目前登入：<strong>{currentUser}</strong></p>
          <div className="modal-actions">
            <button className="btn btn-danger btn-large" onClick={onLogout}>登出帳號</button>
            <button className="btn btn-secondary btn-large" onClick={onClose}>關閉</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{isSignUp ? "註冊新帳號" : "登入存檔"}</h2>
        
        {!isFirebaseConfigured && (
          <div className="alert-banner warning">
            ⚠️ 雲端功能未啟用（未設定 Firebase Config），將自動使用本機快取模式。
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">使用者名稱 (免輸入 Email)</label>
            <input 
              type="text" 
              id="username" 
              placeholder="請輸入名字或暱稱"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">密碼 (至少 6 個字)</label>
            <input 
              type="password" 
              id="password" 
              placeholder="請輸入密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="auth-buttons">
            <button type="submit" className="btn btn-primary btn-large" style={{ width: "100%" }} disabled={loading}>
              {loading ? "處理中..." : isSignUp ? "註冊並登入" : "登入"}
            </button>
          </div>
        </form>

        <div className="auth-toggle">
          <button 
            className="toggle-link" 
            onClick={() => { setError(""); setIsSignUp(!isSignUp); }}
            disabled={loading}
          >
            {isSignUp ? "已有帳號？點此登入" : "還沒有帳號？點此註冊新帳號"}
          </button>
        </div>

        {currentUser && <button className="modal-close" onClick={onClose} disabled={loading}>×</button>}
      </div>
    </div>
  );
};
