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
      <div class="logo-container">
        <img src="assets/images/game-logo.svg" alt="多能力一夜人狼" class="game-logo">
      </div>
      
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
          <button id="createGameBtn" class="btn primary">
            <span class="btn-icon">🎮</span>ゲームを作成
          </button>
          
          <div class="form-divider">または</div>
          
          <div class="form-group join-game-group">
            <label for="gameId">ゲームID:</label>
            <div class="input-with-button">
              <input type="text" id="gameId" placeholder="ゲームIDを入力">
              <button id="joinGameBtn" class="btn secondary">
                <span class="btn-icon">🚪</span>参加
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="home-actions">
        <button id="showTutorialBtn" class="btn info">
          <span class="btn-icon">📖</span>遊び方を見る
        </button>
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
      document.getElementById('playerName').focus();
      document.getElementById('playerName').classList.add('input-error');
      setTimeout(() => {
        document.getElementById('playerName').classList.remove('input-error');
      }, 1000);
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
    
    if (!playerName) {
      notificationSystem.error('プレイヤー名を入力してください');
      document.getElementById('playerName').focus();
      document.getElementById('playerName').classList.add('input-error');
      setTimeout(() => {
        document.getElementById('playerName').classList.remove('input-error');
      }, 1000);
      return;
    }
    
    if (!gameId) {
      notificationSystem.error('ゲームIDを入力してください');
      document.getElementById('gameId').focus();
      document.getElementById('gameId').classList.add('input-error');
      setTimeout(() => {
        document.getElementById('gameId').classList.remove('input-error');
      }, 1000);
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

  // 入力フォームにフォーカスアニメーション
  const inputs = document.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('focused');
    });
    input.addEventListener('blur', () => {
      input.parentElement.classList.remove('focused');
    });
  });
}

// ゲームルーム画面表示
function enterGameRoom(gameId) {
  LoadingIndicator.show('ゲームルームに入室しています...');
  
  const appContainer = document.getElementById('app');
  appContainer.innerHTML = `
    <div class="game-container">
      <div class="game-header">
        <div class="game-title">
          <img src="assets/images/game-logo.svg" alt="多能力一夜人狼" class="game-logo-small">
          <h2>ゲームID: <span class="game-id">${gameId}</span></h2>
        </div>
        <div id="timer" class="timer"></div>
      </div>
      
      <div class="game-board">
        <div class="field-cards">
          <div class="card field-card">
            <div class="card-front">?</div>
            <div class="card-back"></div>
          </div>
          <div class="card field-card">
            <div class="card-front">?</div>
            <div class="card-back"></div>
          </div>
        </div>
        
        <div id="playersContainer" class="players-container"></div>
        
        <div id="playerHand" class="player-hand"></div>
      </div>
      
      <div id="gameStatus" class="game-status">
        <h3>ゲーム開始を待っています...</h3>
        <div class="status-animation">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        <p>全員の準備が完了するとゲームが開始されます</p>
      </div>
      
      <div class="game-controls">
        <button id="readyBtn" class="btn secondary">準備完了</button>
        <button id="helpBtn" class="btn info">
          <span class="btn-icon">📖</span>遊び方
        </button>
        <button id="leaveBtn" class="btn danger">
          <span class="btn-icon">🚪</span>退出する
        </button>
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
    
    // ボタンにクリック効果のアニメーション
    const readyBtn = document.getElementById('readyBtn');
    readyBtn.classList.add('button-click');
    setTimeout(() => {
      readyBtn.classList.remove('button-click');
    }, 300);
    
    updatePlayerReady(gameId, currentUserId, !isReady);
  });
  
  // 遊び方ボタン
  document.getElementById('helpBtn').addEventListener('click', () => {
    Tutorial.show();
  });
  
  // 退出ボタン
  document.getElementById('leaveBtn').addEventListener('click', async () => {
    // 確認ダイアログ
    if (confirm('本当にゲームから退出しますか？')) {
      // ゲーム退出処理
      if (auth.currentUser) {
        await LoadingIndicator.withLoading(
          async () => await leaveGame(gameId, auth.currentUser.uid),
          'ゲームから退出しています...'
        );
      }
      DataManager.unsubscribeAll();
      showHomeScreen();
    }
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
    playerElement.className = `player ${player.isHost ? 'host' : ''} ${player.ready ? 'ready' : ''} ${id === currentUserId ? 'current-player' : ''}`;
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
    statusArea.innerHTML = `
      <h3>ゲーム開始を待っています...</h3>
      <div class="status-animation">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    `;
    statusArea.setAttribute('aria-live', 'polite');
    
    // 待機中のプレイヤー数と準備完了数を表示
    const players = Object.values(gameData.players);
    const readyCount = players.filter(p => p.ready).length;
    
    // 準備情報を視覚的に表示
    statusArea.innerHTML += `
      <div class="ready-status">
        <div class="ready-progress">
          <div class="ready-bar" style="width: ${(readyCount / players.length) * 100}%"></div>
          <span class="ready-text">${readyCount}/${players.length} 準備完了</span>
        </div>
      </div>
    `;
    
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
      
      const statusIcons = {
        'night': '🌙',
        'day': '☀️',
        'voting': '✍️',
        'result': '🏆'
      };
      
      if (statusMessages[gameData.status]) {
        notificationSystem.info(
          `${statusIcons[gameData.status]} ${statusMessages[gameData.status]}`
        );
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
    startBtn.innerHTML = '<span class="btn-icon">🎮</span>ゲーム開始';
    startBtn.setAttribute('aria-label', 'ゲームを開始する');
    
    gameControls.prepend(startBtn);
    
    startBtn.addEventListener('click', async () => {
      // クリックエフェクト
      startBtn.classList.add('button-click');
      setTimeout(() => {
        startBtn.classList.remove('button-click');
      }, 300);
      
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
    startBtn.classList.add('disabled');
    
    // 視覚的にヒントを表示
    const statusArea = document.getElementById('gameStatus');
    if (statusArea) {
      const hintElement = document.createElement('p');
      hintElement.className = 'start-hint';
      hintElement.textContent = reason;
      
      // 既存のヒントがあれば更新、なければ追加
      const existingHint = statusArea.querySelector('.start-hint');
      if (existingHint) {
        existingHint.textContent = reason;
      } else {
        statusArea.appendChild(hintElement);
      }
    }
  } else {
    startBtn.title = 'ゲームを開始する';
    startBtn.setAttribute('aria-disabled', 'false');
    startBtn.setAttribute('aria-label', 'ゲームを開始する - 準備完了');
    startBtn.classList.remove('disabled');
    
    // 準備完了メッセージ
    const statusArea = document.getElementById('gameStatus');
    if (statusArea) {
      const hintElement = document.createElement('p');
      hintElement.className = 'start-hint ready';
      hintElement.textContent = '全員の準備が完了しました！ゲームを開始できます';
      
      // 既存のヒントがあれば更新、なければ追加
      const existingHint = statusArea.querySelector('.start-hint');
      if (existingHint) {
        existingHint.textContent = '全員の準備が完了しました！ゲームを開始できます';
        existingHint.className = 'start-hint ready';
      } else {
        statusArea.appendChild(hintElement);
      }
    }
    
    // ボタンを強調
    startBtn.classList.add('pulse-animation');
  }
}

export { showHomeScreen };