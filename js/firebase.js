// js/firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js';
import { getDatabase, ref, set, onValue, push, update, remove } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-database.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js';

// Firebaseの設定
const firebaseConfig = {
  apiKey: "AIzaSyBGN2sXbblEZNqhwDCGsgmE2wiL34ZEY", // 画像2で確認したキー
  authDomain: "wolfgame-274sf.firebaseapp.com",
  projectId: "wolfgame-274sf",
  databaseURL: "https://wolfgame-274sf-default-rtdb.firebaseio.com", // 新しく追加
  storageBucket: "wolfgame-274sf.appspot.com",
  messagingSenderId: "883873633291",
  appId: "1:883873633291:web:57f19afb2a69e40150f1ce"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// 匿名認証
async function signInAnonymouslyAuth() {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error("匿名サインインエラー:", error);
    throw error;
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
