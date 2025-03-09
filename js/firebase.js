// js/firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js';
import { getDatabase, ref, set, onValue, push, update, remove } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-database.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js';

// Firebaseの設定
const firebaseConfig = {
  apiKey: "AIzaSyBGN2sXbblEZNxjviwDCGsgmE2wiL34ZEY",
  authDomain: "wolfgame-2745f.firebaseapp.com",
  databaseURL: "https://wolfgame-2745f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wolfgame-2745f",
  storageBucket: "wolfgame-2745f.firebasestorage.app",
  messagingSenderId: "883873033291",
  appId: "1:883873033291:web:57f19afb2a69e40150f1ce",
  measurementId: "G-GXBTWW29Z4"
};
// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// 匿名認証
async function signInAnonymouslyAuth() {
  // 開発モードかどうかを判定
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.protocol === 'file:';
  
  if (isDevelopment) {
    console.warn("開発モード: モックユーザーを使用します");
    // 開発用のモックユーザーを返す
    return {
      uid: "dev-user-" + Math.floor(Math.random() * 1000000),
      isAnonymous: true,
      displayName: "開発ユーザー"
    };
  }
  
  try {
    const userCredential = await signInAnonymously(auth);
    console.log("認証成功:", userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error("匿名サインインエラー:", error);
    
    // エラー発生時もモックユーザーを返す
    console.warn("認証エラー: モックユーザーを使用します");
    return {
      uid: "error-user-" + Math.floor(Math.random() * 1000000),
      isAnonymous: true,
      displayName: "エラーユーザー"
    };
  }
}

// ゲームの作成
async function createGame(hostName, hostIcon) {
  const user = auth.currentUser;
  if (!user) return null;

  const gameRef = push(ref(db, 'games'));
  const gameId = gameRef.key;
  const playerId = user.uid;

  const gameData = {
    status: 'waiting',
    host: playerId,
    created_at: Date.now(),
    players: {
      [playerId]: {
        name: hostName,
        icon: hostIcon,
        isHost: true,
        points: 10,
        role: null,
        ready: false
      }
    },
    field_cards: [],
    current_phase: null,
    timer: {
      duration: 180,
      start_time: null
    },
    votes: {}
  };

  await set(gameRef, gameData);
  return gameId;
}

// ゲームに参加
async function joinGame(gameId, playerName, playerIcon) {
  const user = auth.currentUser;
  if (!user) return false;

  const playerId = user.uid;
  const playerData = {
    name: playerName,
    icon: playerIcon,
    isHost: false,
    points: 10,
    role: null,
    ready: false
  };

  try {
    await update(ref(db, `games/${gameId}/players/${playerId}`), playerData);
    return true;
  } catch (error) {
    console.error("ゲーム参加エラー:", error);
    return false;
  }
}

// ゲームの状態をリスニング
function listenGameState(gameId, callback) {
  const gameRef = ref(db, `games/${gameId}`);
  return onValue(gameRef, (snapshot) => {
    const gameData = snapshot.val();
    if (gameData) {
      callback(gameData);
    } else {
      callback(null);
    }
  });
}

// プレイヤーの準備状態を更新
function updatePlayerReady(gameId, playerId, isReady) {
  return update(ref(db, `games/${gameId}/players/${playerId}`), {
    ready: isReady
  });
}

// ゲームの状態を更新
function updateGameStatus(gameId, status) {
  return update(ref(db, `games/${gameId}`), {
    status: status
  });
}

// ゲームから退出
function leaveGame(gameId, playerId) {
  return remove(ref(db, `games/${gameId}/players/${playerId}`));
}

export {
  db, auth, signInAnonymouslyAuth,
  createGame, joinGame, listenGameState,
  updatePlayerReady, updateGameStatus, leaveGame
};
