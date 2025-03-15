// js/app.js
import { auth, signInAnonymouslyAuth, createGame, joinGame, listenGameState, updatePlayerReady, leaveGame, isOnline } from './firebase.js';
import { initGame, startGame, handlePhase } from './modules/game-core.js';
import { notificationSystem } from './ui.js';
import { initGameUtils } from './modules/game-utils.js';
import LoadingIndicator from './modules/loading.js';
import Tutorial from './modules/tutorial.js';
import DataManager from './modules/data-manager.js';

// 利用可能なアイコン
const ICONS = ['icon1', 'icon2', 'icon3', 'icon4'];

// アプリ初期化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // ローディングインジケーターの初期化
    LoadingIndicator.init();
    LoadingIndicator.show('ゲームを準備しています...');
    
    // 通知システム初期化
    notificationSystem.init();
    
    // チュートリアル初期化
    Tutorial.init();
    
    // 匿名認証
    await signInAnonymouslyAuth();
    LoadingIndicator.hide();
    showHomeScreen();
  } catch (error) {
    console.error("初期化エラー:", error);
    LoadingIndicator.hide();
    notificationSystem.error("アプリケーションの初期化に失敗しました");
  }
});

// ホーム画面表示
function showHomeScreen() {
  const appContainer = document.getElementById('app');
  appContainer.innerHTML = `
    <div class="home-container">
      <h1>多能力一夜人狼</h1>
      <div class="player-form">
        <div class="form-group">
          <label for="playerName">プレイヤー名:</label>
          <input type="text" id="playerName" placeholder="名前を入力してください">
        </div>
        
        <div class="form-group">
          <label>アイコン選択:</label>
          <div class="icon-selection">
            ${ICONS.map((icon, index) => `
              <div class="icon-option ${index === 0 ? 'selected' : ''}" data-icon="${icon}">
                <img src="assets/images/${icon}.png" alt="アイコン">
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="buttons">
          <button id="createGameBtn" class="btn primary">ゲームを作成</button>
          
          <div class="form-group">
            <label for="gameId">ゲームID:</label>
            <input type="text" id="gameId" placeholder="ゲームIDを入力">
          </div>
          
          <button id="joinGameBtn" class="btn secondary">ゲームに参加</button>
        </div>
      </div>
      
      <div class="home-actions">
        <button id="showTutorialBtn" class="btn info">遊び方を見る</button>
      </div>
      
      <div class="connection-status ${isOnline ? 'online' : 'offline'}">
        <span class="status-indicator"></span>
        <span class="status-text">${isOnline ? 'オンライン' : 'オフライン'}</span>
      </div>
    </div>
  `;
  
  // アイコン選択のイベント
  const iconOptions = document.querySelectorAll('.icon-option');
  iconOptions.forEach(option => {
    option.addEventListener('click', () => {
      iconOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
    });
  });
  
  // チュートリアル表示ボタン
  document.getElementById('showTutorialBtn').addEventListener('click', () => {
    Tutorial.show();
  });
  
  // ゲーム作成ボタン
  document.getElementById('createGameBtn').addEventListener('click', async () => {
    const playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
      notificationSystem.error('プレイヤー名を入力してください');
      return;
    }
    
    const selectedIcon = document.querySelector('.icon-option.selected').dataset.icon;
    
    // ローディング表示を使用してゲーム作成
    const gameId = await LoadingIndicator.withLoading(
      async () => await createGame(playerName, selectedIcon),
      'ゲームを作成しています...'
    );
    
    if (gameId) {
      enterGameRoom(gameId);
    } else {
      notificationSystem.error('ゲーム作成に失敗しました');
    }
  });
  
  // ゲーム参加ボタン
  document.getElementById('joinGameBtn').addEventListener('click', async () => {
    const playerName = document.getElementById('playerName').value.trim();
    const gameId = document.getElementById('gameId').value.trim();
    
    if (!playerName || !gameId) {
      notificationSystem.error('プレイヤー名とゲームIDを入力してください');
      return;
    }
    
    const selectedIcon = document.querySelector('.icon-option.selected').dataset.icon;
    
    // ローディング表示を使用してゲーム参加
    const success = await LoadingIndicator.withLoading(
      async () => await joinGame(gameId, playerName, selectedIcon),
      'ゲームに参加しています...'
    );
    
    if (success) {
      enterGameRoom(gameId);
    } else {
      notificationSystem.error('ゲームへの参加に失敗しました');
    }
  });
  
  // キーボードアクセシビリティの追加
  const playerNameInput = document.getElementById('playerName');
  const gameIdInput = document.getElementById('gameId');
  const createBtn = document.getElementById('createGameBtn');
  const joinBtn = document.getElementById('joinGameBtn');
  
  playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      createBtn.click();
    }
  });
  
  gameIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      joinBtn.click();
    }
  });
}

// ゲームルーム画面表示
function enterGameRoom(gameId) {
  LoadingIndicator.show('ゲームルームに入室しています...');
  
  const appContainer = document.getElementById('app');
  appContainer.innerHTML = `
    <div class="game-container">
      <div class="game-header">
        <h2>ゲームID: ${gameId}</h2>
        <div id="timer" class="timer"></div>
      </div>
      
      <div class="game-board">
        <div class="field-cards">
          <div class="card field-card">?</div>
          <div class="card field-card">?</div>
        </div>
        
        <div id="playersContainer" class="players-container"></div>
        
        <div id="playerHand" class="player-hand"></div>
      </div>
      
      <div id="gameStatus" class="game-status">ゲーム開始を待っています...</div>
      
      <div class="game-controls">
        <button id="readyBtn" class="btn secondary">準備完了</button>
        <button id="helpBtn" class="btn info">遊び方</button>
        <button id="leaveBtn" class="btn danger">退出する</button>
      </div>
      
      <div class="connection-status ${isOnline ? 'online' : 'offline'}">
        <span class="status-indicator"></span>
        <span class="status-text">${isOnline ? 'オンライン' : 'オフライン'}</span>
      </div>
    </div>
  `;
  
  // データマネージャーを使用してゲーム状態を監視
  DataManager.unsubscribeAll(); // 先に既存のリスナーをクリア
  DataManager.listenToData(`games/${gameId}`, (gameData) => {
    LoadingIndicator.hide();
    
    if (!gameData) {
      notificationSystem.error('ゲームが見つかりません');
      showHomeScreen();
      return;
    }
    
    // ゲームデータに重要な変更があった場合、UIを更新
    updateGameUI(gameData, gameId);
  });
  
  // 準備完了ボタン
  document.getElementById('readyBtn').addEventListener('click', () => {
    const currentUserId = auth.currentUser.uid;
    const isReady = document.getElementById('readyBtn').classList.contains('active');
    updatePlayerReady(gameId, currentUserId, !isReady);
  });
  
  // 遊び方ボタン
  document.getElementById('helpBtn').addEventListener('click', () => {
    Tutorial.show();
  });
  
  // 退出ボタン
  document.getElementById('leaveBtn').addEventListener('click', async () => {
    // ゲーム退出処理
    if (auth.currentUser) {
      await LoadingIndicator.withLoading(
        async () => await leaveGame(gameId, auth.currentUser.uid),
        'ゲームから退出しています...'
      );
    }
    DataManager.unsubscribeAll();
    showHomeScreen();
  });
  
  // キーボードアクセシビリティの追加
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
      e.preventDefault();
      document.getElementById('helpBtn').click();
    } else if (e.key === 'Escape') {
      if (document.querySelector('.tutorial-overlay.visible')) {
        // チュートリアルが表示されている場合は、そちらを閉じる
        Tutorial.hide();
      }
    }
  });
}

// ゲームUI更新
function updateGameUI(gameData, gameId) {
  console.log(`UIを更新: ゲーム状態=${gameData.status}`);
  
  // ゲームIDをgameDataに追加
  gameData.gameId = gameId;
  
  const currentUserId = auth.currentUser.uid;
  const currentPlayer = gameData.players[currentUserId];
  
  if (!currentPlayer) {
    console.error('現在のプレイヤーがゲームに参加していません');
    return;
  }
  
  // オンラインステータスを更新
  const connectionStatus = document.querySelector('.connection-status');
  if (connectionStatus) {
    connectionStatus.className = `connection-status ${isOnline ? 'online' : 'offline'}`;
    const statusText = connectionStatus.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = isOnline ? 'オンライン' : 'オフライン';
    }
  }
  
  // プレイヤー表示の更新
  const playersContainer = document.getElementById('playersContainer');
  playersContainer.innerHTML = '';
  
  Object.entries(gameData.players).forEach(([id, player]) => {
    const playerElement = document.createElement('div');
    playerElement.className = `player ${player.isHost ? 'host' : ''} ${player.ready ? 'ready' : ''}`;
    playerElement.setAttribute('aria-label', `プレイヤー: ${player.name} ${player.isHost ? 'ホスト' : ''} ${player.ready ? '準備完了' : '準備中'} 持ち点: ${player.points}`);
    playerElement.innerHTML = `
      <div class="player-icon">
        <img src="assets/images/${player.icon}.png" alt="${player.name}">
      </div>
      <div class="player-name">${player.name}</div>
      <div class="player-status">
        ${player.isHost ? '<span class="host-icon" title="ホスト">👑</span>' : ''}
        ${player.ready ? '<span class="ready-icon" title="準備完了">✅</span>' : ''}
      </div>
      <div class="player-points">持ち点: ${player.points}</div>
    `;
    playersContainer.appendChild(playerElement);
    
    // 自分のプレイヤーに複読機能で読み上げてもらえるようにマーク
    if (id === currentUserId) {
      playerElement.setAttribute('aria-current', 'true');
      playerElement.classList.add('current-player');
    }
  });
  
  // 自分の手札表示（役職があるときのみ）
  const playerHand = document.getElementById('playerHand');
  playerHand.innerHTML = ''; // 一旦クリア
  
  if (currentPlayer.role) {
    const roleCard = document.createElement('div');
    roleCard.className = 'card my-role';
    roleCard.setAttribute('aria-label', `あなたの役職: ${currentPlayer.role.name}, 陣営: ${currentPlayer.role.team === 'village' ? '市民陣営' : '人狼陣営'}, コスト: ${currentPlayer.role.cost}`);
    roleCard.innerHTML = `
      <div class="role-name">${currentPlayer.role.name}</div>
      <div class="role-team">${currentPlayer.role.team === 'village' ? '市民陣営' : '人狼陣営'}</div>
      <div class="role-cost">コスト: ${currentPlayer.role.cost}</div>
      <div class="role-description">${currentPlayer.role.description}</div>
    `;
    playerHand.appendChild(roleCard);
  }
  
  // 準備完了ボタンの状態更新
  const readyBtn = document.getElementById('readyBtn');
  if (currentPlayer.ready) {
    readyBtn.textContent = '準備取消';
    readyBtn.classList.add('active');
    readyBtn.setAttribute('aria-pressed', 'true');
  } else {
    readyBtn.textContent = '準備完了';
    readyBtn.classList.remove('active');
    readyBtn.setAttribute('aria-pressed', 'false');
  }
  
  // ゲーム状態に基づいたUI更新
  if (gameData.status === 'waiting') {
    // 待機状態の場合
    const statusArea = document.getElementById('gameStatus');
    statusArea.innerHTML = 'ゲーム開始を待っています...';
    statusArea.setAttribute('aria-live', 'polite');
    
    // 待機中のプレイヤー数と準備完了数を表示
    const players = Object.values(gameData.players);
    const readyCount = players.filter(p => p.ready).length;
    statusArea.innerHTML += `<p>プレイヤー: ${players.length}人中${readyCount}人が準備完了</p>`;
    
    // ホストプレイヤーの場合、開始ボタンを表示
    if (currentPlayer.isHost) {
      showStartGameButton(gameData);
    } else {
      // ホストでない場合、開始ボタンが残っていれば削除
      const startBtn = document.getElementById('startGameBtn');
      if (startBtn) {
        startBtn.remove();
      }
    }
  } else {
    // ゲーム中の場合
    // 状態変化を通知する
    const previousStatus = document.getElementById('gameStatus').getAttribute('data-status');
    if (previousStatus !== gameData.status) {
      const statusMessages = {
        'night': '夜フェーズが始まりました',
        'day': '日中フェーズが始まりました',
        'voting': '投票フェーズが始まりました',
        'result': '結果発表フェーズです'
      };
      
      if (statusMessages[gameData.status]) {
        notificationSystem.info(statusMessages[gameData.status]);
      }
      
      document.getElementById('gameStatus').setAttribute('data-status', gameData.status);
    }
    
    initGame(gameData, currentUserId);
    // ゲームユーティリティモジュールの初期化
    initGameUtils(gameData);
    handlePhase(gameData.status, gameData);
  }
}

// ゲーム開始ボタンの表示
function showStartGameButton(gameData) {
  // すべてのプレイヤーが準備完了しているか確認
  const allReady = Object.values(gameData.players).every(player => player.ready);
  const playerCount = Object.keys(gameData.players).length;
  
  // ゲーム開始ボタンの追加（または更新）
  let startBtn = document.getElementById('startGameBtn');
  
  if (!startBtn) {
    const gameControls = document.querySelector('.game-controls');
    if (!gameControls) return;
    
    startBtn = document.createElement('button');
    startBtn.id = 'startGameBtn';
    startBtn.className = 'btn primary';
    startBtn.textContent = 'ゲーム開始';
    startBtn.setAttribute('aria-label', 'ゲームを開始する');
    
    gameControls.prepend(startBtn);
    
    startBtn.addEventListener('click', async () => {
      await LoadingIndicator.withLoading(
        async () => await startGame(gameData.gameId),
        'ゲームを開始しています...'
      );
    });
  }
  
  // 4人以上かつ全員準備完了している場合のみ有効
  const canStart = playerCount >= 4 && allReady;
  startBtn.disabled = !canStart;
  
  if (!canStart) {
    let reason = '';
    if (playerCount < 4) {
      reason = '4人以上のプレイヤーが必要です';
    } else if (!allReady) {
      reason = '全員が準備完了になるまで待ってください';
    }
    startBtn.title = reason;
    startBtn.setAttribute('aria-disabled', 'true');
    startBtn.setAttribute('aria-label', `ゲームを開始する - ${reason}`);
  } else {
    startBtn.title = 'ゲームを開始する';
    startBtn.setAttribute('aria-disabled', 'false');
    startBtn.setAttribute('aria-label', 'ゲームを開始する - 準備完了');
  }
}

export { showHomeScreen };