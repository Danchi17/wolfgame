// js/firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js';
import { getDatabase, ref, set, onValue, push, update, remove, onDisconnect } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js';
import { notificationSystem } from './ui.js';

// Firebaseの設定
// 注意: 実運用ではこれらのキーを環境変数に移動し、.envファイルなどで管理することを推奨します
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

// 認証状態のリスナー
let authStateListener = null;

// 接続状態管理
let connectionRef = null;
let isOnline = true;

// 接続状態のリスナーを設定
function setupConnectionListener() {
  const connectedRef = ref(db, '.info/connected');
  onValue(connectedRef, (snap) => {
    isOnline = !!snap.val();
    
    if (isOnline) {
      notificationSystem.success('サーバーに接続しました', 3000);
      
      // ユーザーがオンラインであることを記録
      if (auth.currentUser) {
        connectionRef = ref(db, `users/${auth.currentUser.uid}/online`);
        update(connectionRef, { status: true, timestamp: Date.now() });
        
        // 切断時の処理
        onDisconnect(connectionRef).update({ status: false, timestamp: Date.now() });
      }
    } else {
      notificationSystem.error('サーバーとの接続が切断されました', 0);
    }
  });
}

// 匿名認証
async function signInAnonymouslyAuth() {
  // 開発モードかどうかを判定
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.protocol === 'file:';
  
  // 既存のリスナーがあれば削除
  if (authStateListener) {
    authStateListener();
  }
  
  // 認証状態のリスナーを設定
  authStateListener = onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('認証状態変更: ログイン済み', user.uid);
      setupConnectionListener();
    } else {
      console.log('認証状態変更: 未ログイン');
    }
  });
  
  if (isDevelopment) {
    console.warn("開発モード: モックユーザーを使用します");
    // 開発用のモックユーザーを返す
    return {
      uid: "dev-user-" + Math.floor(Math.random() * 1000000),
      isAnonymous: true,
      displayName: "開発ユーザー"
    };
  }
  
  // 3回までリトライ
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const userCredential = await signInAnonymously(auth);
      console.log("認証成功:", userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error(`匿名サインインエラー (試行 ${attempt + 1}/3):`, error);
      
      if (attempt === 2) { // 最後の試行
        // エラー発生時もモックユーザーを返す
        console.warn("認証エラー: モックユーザーを使用します");
        notificationSystem.warning('ログインに失敗しました。オフラインモードで動作します', 5000);
        return {
          uid: "error-user-" + Math.floor(Math.random() * 1000000),
          isAnonymous: true,
          displayName: "エラーユーザー"
        };
      }
      
      // 少し待ってから再試行
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

// ゲームの作成
async function createGame(hostName, hostIcon) {
  const user = auth.currentUser;
  if (!user) return null;

  // オフライン時の処理
  if (!isOnline) {
    notificationSystem.error('サーバーに接続できません。ネットワークを確認してください', 5000);
    return null;
  }

  try {
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
      votes: {},
      points_updated: false,
      forced_vote_target: null,
      forced_vote_by: null,
      spy_report: null,
      puppy_guessed: null,
      puppy_guessed_correct: null,
      special_victory: null
    };

    await set(gameRef, gameData);
    return gameId;
  } catch (error) {
    console.error('ゲーム作成エラー:', error);
    notificationSystem.error('ゲームの作成に失敗しました');
    return null;
  }
}

// ゲームに参加
async function joinGame(gameId, playerName, playerIcon) {
  const user = auth.currentUser;
  if (!user) return false;

  // オフライン時の処理
  if (!isOnline) {
    notificationSystem.error('サーバーに接続できません。ネットワークを確認してください', 5000);
    return false;
  }

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
    // ゲームが存在するか確認
    const gameSnapshot = await get(ref(db, `games/${gameId}`));
    if (!gameSnapshot.exists()) {
      notificationSystem.error('指定されたゲームIDが存在しません');
      return false;
    }
    
    // ゲームが進行中でないか確認
    const gameData = gameSnapshot.val();
    if (gameData.status !== 'waiting') {
      notificationSystem.error('このゲームは既に開始されています');
      return false;
    }
    
    // プレイヤー数が上限に達していないか確認
    const playerCount = Object.keys(gameData.players || {}).length;
    if (playerCount >= 8) {
      notificationSystem.error('ゲームの定員数に達しました（8人まで）');
      return false;
    }

    await update(ref(db, `games/${gameId}/players/${playerId}`), playerData);
    return true;
  } catch (error) {
    console.error("ゲーム参加エラー:", error);
    notificationSystem.error('ゲームへの参加に失敗しました');
    return false;
  }
}

// ゲームの状態をリスニング
function listenGameState(gameId, callback) {
  const gameRef = ref(db, `games/${gameId}`);
  const unsubscribe = onValue(gameRef, (snapshot) => {
    const gameData = snapshot.val();
    if (gameData) {
      callback(gameData);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('ゲームデータの読み込みエラー', error);
    notificationSystem.error('ゲームデータの取得に失敗しました');
  });
  
  // リスナーの解除関数を返す
  return unsubscribe;
}

// プレイヤーの準備状態を更新
function updatePlayerReady(gameId, playerId, isReady) {
  return update(ref(db, `games/${gameId}/players/${playerId}`), {
    ready: isReady
  }).catch(error => {
    console.error('準備状態更新エラー:', error);
    notificationSystem.error('準備状態の更新に失敗しました');
  });
}

// ゲームの状態を更新
function updateGameStatus(gameId, status) {
  return update(ref(db, `games/${gameId}`), {
    status: status
  }).catch(error => {
    console.error('ゲーム状態更新エラー:', error);
    notificationSystem.error('ゲーム状態の更新に失敗しました');
  });
}

// ゲームから退出
function leaveGame(gameId, playerId) {
  return remove(ref(db, `games/${gameId}/players/${playerId}`)).then(() => {
    // ホストが退出した場合、新しいホストを決定
    return get(ref(db, `games/${gameId}/players`)).then((snapshot) => {
      const players = snapshot.val();
      if (!players) return; // プレイヤーがいない場合は終了
      
      const remainingPlayers = Object.entries(players);
      if (remainingPlayers.length > 0) {
        // 最初のプレイヤーを新しいホストに設定
        const [newHostId, _] = remainingPlayers[0];
        return update(ref(db, `games/${gameId}`), {
          host: newHostId
        }).then(() => {
          return update(ref(db, `games/${gameId}/players/${newHostId}`), {
            isHost: true
          });
        });
      }
    });
  }).catch(error => {
    console.error('ゲーム退出エラー:', error);
    notificationSystem.error('ゲームからの退出に失敗しました');
  });
}

// Firebaseのget関数を公開
import { get } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-database.js';

export {
  db, auth, get, signInAnonymouslyAuth,
  createGame, joinGame, listenGameState,
  updatePlayerReady, updateGameStatus, leaveGame,
  isOnline
};