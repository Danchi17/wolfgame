// js/app.js
import { auth, signInAnonymouslyAuth, createGame, joinGame, listenGameState, updatePlayerReady } from './firebase.js';
import { initGame, startGame, handlePhase } from './game.js';

// 利用可能なアイコン（仮）
const ICONS = ['icon1', 'icon2', 'icon3', 'icon4'];

// アプリ初期化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 匿名認証
    await signInAnonymouslyAuth();
    showHomeScreen();
  } catch (error) {
    console.error("初期化エラー:", error);
    alert("アプリケーションの初期化に失敗しました");
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
  
  // ゲーム作成ボタン
  document.getElementById('createGameBtn').addEventListener('click', async () => {
    const playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
      alert('プレイヤー名を入力してください');
      return;
    }
    
    const selectedIcon = document.querySelector('.icon-option.selected').dataset.icon;
    const gameId = await createGame(playerName, selectedIcon);
    
    if (gameId) {
      enterGameRoom(gameId);
    } else {
      alert('ゲーム作成に失敗しました');
    }
  });
  
  // ゲーム参加ボタン
  document.getElementById('joinGameBtn').addEventListener('click', async () => {
    const playerName = document.getElementById('playerName').value.trim();
    const gameId = document.getElementById('gameId').value.trim();
    
    if (!playerName || !gameId) {
      alert('プレイヤー名とゲームIDを入力してください');
      return;
    }
    
    const selectedIcon = document.querySelector('.icon-option.selected').dataset.icon;
    const success = await joinGame(gameId, playerName, selectedIcon);
    
    if (success) {
      enterGameRoom(gameId);
    } else {
      alert('ゲームへの参加に失敗しました');
    }
  });
}

// ゲームルーム画面表示
function enterGameRoom(gameId) {
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
        <button id="leaveBtn" class="btn danger">退出する</button>
      </div>
    </div>
  `;
  
  // ゲーム状態リスニング
  listenGameState(gameId, (gameData) => {
    if (!gameData) {
      alert('ゲームが見つかりません');
      showHomeScreen();
      return;
    }
    
    updateGameUI(gameData, gameId);
  });
  
  // 準備完了ボタン
  document.getElementById('readyBtn').addEventListener('click', () => {
    const currentUserId = auth.currentUser.uid;
    const isReady = document.getElementById('readyBtn').classList.contains('active');
    updatePlayerReady(gameId, currentUserId, !isReady);
  });
  
  // 退出ボタン
  document.getElementById('leaveBtn').addEventListener('click', () => {
    // ゲーム退出処理
    showHomeScreen();
  });
}

// ゲームUI更新
function updateGameUI(gameData, gameId) {
  // ゲームIDをgameDataに追加
  gameData.gameId = gameId;
  
  const currentUserId = auth.currentUser.uid;
  const currentPlayer = gameData.players[currentUserId];
  
  // プレイヤー表示の更新
  const playersContainer = document.getElementById('playersContainer');
  playersContainer.innerHTML = '';
  
  Object.entries(gameData.players).forEach(([id, player]) => {
    const playerElement = document.createElement('div');
    playerElement.className = `player ${player.isHost ? 'host' : ''} ${player.ready ? 'ready' : ''}`;
    playerElement.innerHTML = `
      <div class="player-icon">
        <img src="assets/images/${player.icon}.png" alt="${player.name}">
      </div>
      <div class="player-name">${player.name}</div>
      <div class="player-status">
        ${player.isHost ? '👑' : ''}
        ${player.ready ? '✅' : ''}
      </div>
      <div class="player-points">持ち点: ${player.points}</div>
    `;
    playersContainer.appendChild(playerElement);
  });
  
  // 自分の手札表示
  if (currentPlayer.role) {
    const playerHand = document.getElementById('playerHand');
    playerHand.innerHTML = `
      <div class="card my-role">
        <div class="role-name">${currentPlayer.role.name}</div>
        <div class="role-team">${currentPlayer.role.team === 'village' ? '市民陣営' : '人狼陣営'}</div>
        <div class="role-cost">コスト: ${currentPlayer.role.cost}</div>
        <div class="role-description">${currentPlayer.role.description}</div>
      </div>
    `;
  }
  
  // 準備完了ボタンの状態更新
  const readyBtn = document.getElementById('readyBtn');
  if (currentPlayer.ready) {
    readyBtn.textContent = '準備取消';
    readyBtn.classList.add('active');
  } else {
    readyBtn.textContent = '準備完了';
    readyBtn.classList.remove('active');
  }
  
  // ホストプレイヤーの場合、開始ボタンを表示
  if (currentPlayer.isHost && gameData.status === 'waiting') {
    // すべてのプレイヤーが準備完了しているか確認
    const allReady = Object.values(gameData.players).every(player => player.ready);
    const playerCount = Object.keys(gameData.players).length;
    
    // ゲーム開始ボタンの追加（または更新）
    let startBtn = document.getElementById('startGameBtn');
    
    if (!startBtn) {
      startBtn = document.createElement('button');
      startBtn.id = 'startGameBtn';
      startBtn.className = 'btn primary';
      startBtn.textContent = 'ゲーム開始';
      
      document.querySelector('.game-controls').prepend(startBtn);
      
      startBtn.addEventListener('click', () => {
        startGame(gameId);
      });
    }
    
    // 4人以上かつ全員準備完了している場合のみ有効
    startBtn.disabled = !(playerCount >= 4 && allReady);
  }
  
  // ゲーム状態に応じた表示更新
  if (gameData.status !== 'waiting') {
    initGame(gameData, currentUserId);
    handlePhase(gameData.status, gameData);
  }
}
export { showHomeScreen };
