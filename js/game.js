// js/game.js
import { db, auth, updateGameStatus } from './firebase.js';
import { ref, update, get } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-database.js';
import { getRandomRoles, isWerewolfTeam } from './roles.js';

let currentGame = null;
let currentPlayer = null;

// タイマー管理クラス
class GameTimer {
  constructor() {
    this.timers = {
      phase: null,  // 夜フェーズなどのフェーズ用タイマー
      discussion: null, // 議論用タイマー
      other: null   // その他のタイマー用
    };
  }

  // フェーズタイマーの開始
  startPhaseTimer(seconds, timerDisplay, callback) {
    // 既存のタイマーをクリア
    this.stopPhaseTimer();
    
    let remainingTime = seconds;
    
    this.timers.phase = setInterval(() => {
      remainingTime--;
      
      if (timerDisplay) {
        timerDisplay.textContent = `残り時間: ${remainingTime}秒`;
      }
      
      if (remainingTime <= 0) {
        this.stopPhaseTimer();
        if (callback) callback();
      }
    }, 1000);
    
    return this.timers.phase;
  }
  
  // 議論タイマーの開始
  startDiscussionTimer(seconds, callback) {
    // 既存のタイマーをクリア
    this.stopDiscussionTimer();
    
    const timerDisplay = document.getElementById('timerDisplay');
    if (!timerDisplay) return null;
    
    let remainingTime = seconds;
    
    this.timers.discussion = setInterval(() => {
      remainingTime--;
      
      // 時間表示の更新
      const minutes = Math.floor(remainingTime / 60);
      const secs = remainingTime % 60;
      timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
      
      if (remainingTime <= 0) {
        this.stopDiscussionTimer();
        if (callback) callback();
      }
    }, 1000);
    
    return this.timers.discussion;
  }
  
  // 各種タイマーの停止関数
  stopPhaseTimer() {
    if (this.timers.phase) {
      clearInterval(this.timers.phase);
      this.timers.phase = null;
    }
  }
  
  stopDiscussionTimer() {
    if (this.timers.discussion) {
      clearInterval(this.timers.discussion);
      this.timers.discussion = null;
    }
  }
  
  // 全てのタイマーを停止
  stopAllTimers() {
    this.stopPhaseTimer();
    this.stopDiscussionTimer();
    
    if (this.timers.other) {
      clearInterval(this.timers.other);
      this.timers.other = null;
    }
  }
}

// タイマー管理インスタンスの作成
const gameTimer = new GameTimer();

// ゲームの初期化
function initGame(gameData, playerId) {
  currentGame = gameData;
  currentPlayer = {
    id: playerId,
    data: gameData.players[playerId]
  };
}

// ゲーム開始処理
async function startGame(gameId) {
  try {
    // カードの配布処理
    await distributeRoles(gameId);
    
    // ゲームステータスを夜に変更
    await updateGameStatus(gameId, 'night');
    await updateGamePhase(gameId, 'seer');
  } catch (error) {
    console.error("ゲーム開始エラー:", error);
    alert("ゲーム開始に失敗しました。");
  }
}

// 役職の配布
async function distributeRoles(gameId) {
  const gameRef = ref(db, `games/${gameId}`);
  const snapshot = await get(gameRef);
  const gameData = snapshot.val();
  
  if (!gameData || !gameData.players) return;
  
  const playerIds = Object.keys(gameData.players);
  if (playerIds.length < 4) return;
  
  // 役職の選択
  const selectedRoles = getRandomRoles(playerIds.length);
  
  // プレイヤーに役職を割り当て
  const playerRoles = selectedRoles.slice(0, playerIds.length);
  const fieldCards = selectedRoles.slice(playerIds.length, playerIds.length + 2);
  
  const shuffledPlayerIds = [...playerIds].sort(() => 0.5 - Math.random());
  
  // プレイヤーごとに役職を更新
  const updates = {};
  for (let i = 0; i < shuffledPlayerIds.length; i++) {
    const playerId = shuffledPlayerIds[i];
    updates[`players/${playerId}/role`] = playerRoles[i];
  }
  
  // 場札を設定
  updates.field_cards = fieldCards;
  
  // データベース更新
  await update(gameRef, updates);
}

// フェーズの処理
function handlePhase(phase, gameData) {
  // 全てのタイマーを停止してから新しいフェーズを開始
  gameTimer.stopAllTimers();
  
  switch (phase) {
    case 'night':
      handleNightPhase(gameData);
      break;
    case 'day':
      handleDayPhase(gameData);
      break;
    case 'voting':
      handleVotingPhase(gameData);
      break;
    case 'result':
      handleResultPhase(gameData);
      break;
  }
}

// 夜フェーズの処理
function handleNightPhase(gameData) {
  // 役職に応じた能力UIの表示
  const currentPhase = gameData.current_phase;
  const gameId = gameData.gameId; // 追加したプロパティを使用
  
  console.log(`夜フェーズ処理中: 現在のフェーズ=${currentPhase}, ゲームID=${gameId}`);
  
  // まず共通のUI部分を構築
  const gameContainer = document.getElementById('gameStatus');
  let phaseTitle = '';
  let phaseTime = 15; // 秒
  
  // 各役職のターン処理
  if (currentPhase === 'seer') {
    phaseTitle = '占いフェーズ';
    // 占い師系の処理
    showSeerUI(gameData);
  } else if (currentPhase === 'werewolf') {
    phaseTitle = '人狼フェーズ';
    // 人狼系の処理
    showWerewolfUI(gameData);
  } else if (currentPhase === 'thief') {
    phaseTitle = '怪盗フェーズ';
    // 怪盗の処理
    showThiefUI(gameData);
  }
  
  // ホストプレイヤーの場合はフェーズ制御ボタンを追加
  if (currentPlayer && currentPlayer.data && currentPlayer.data.isHost) {
    // 次のフェーズへの移行制御を追加
    let nextPhaseText = '';
    let nextPhase = '';
    let isStatusChange = false;
    
    if (currentPhase === 'seer') {
      nextPhase = 'werewolf';
      nextPhaseText = '人狼フェーズへ';
    } else if (currentPhase === 'werewolf') {
      nextPhase = 'thief';
      nextPhaseText = '怪盗フェーズへ';
    } else if (currentPhase === 'thief') {
      nextPhase = null;
      nextPhaseText = '日中フェーズへ';
      isStatusChange = true;
    }
    
    // フェーズ制御UI追加
    const phaseControlDiv = document.createElement('div');
    phaseControlDiv.className = 'phase-control';
    phaseControlDiv.style.marginTop = '20px';
    phaseControlDiv.style.padding = '10px';
    phaseControlDiv.style.backgroundColor = '#f0f0f0';
    phaseControlDiv.style.borderRadius = '5px';
    
    phaseControlDiv.innerHTML = `
      <p><strong>ホスト操作パネル</strong></p>
      <p>現在: ${phaseTitle} (${phaseTime}秒後に自動で次へ)</p>
      <div id="phaseTimer" style="margin: 10px 0;">残り時間: ${phaseTime}秒</div>
    `;
    
    // フェーズスキップボタン
    const skipButton = document.createElement('button');
    skipButton.className = 'btn primary';
    skipButton.textContent = `今すぐ${nextPhaseText}`;
    skipButton.addEventListener('click', () => {
      console.log(`手動でフェーズを進めます: ${nextPhase || '日中フェーズ'}`);
      gameTimer.stopAllTimers(); // タイマーがあれば停止
      
      if (isStatusChange) {
        updateGameStatus(gameId, 'day');
      } else {
        updateGamePhase(gameId, nextPhase);
      }
    });
    
    phaseControlDiv.appendChild(skipButton);
    
    // 既存のUI要素の下部に追加
    gameContainer.appendChild(phaseControlDiv);
    
    // タイマー開始
    const timerDisplay = document.getElementById('phaseTimer');
    
    // フェーズタイマー開始
    gameTimer.startPhaseTimer(phaseTime, timerDisplay, () => {
      console.log(`${phaseTitle}終了、次のフェーズへ移行します (${gameId})`);
      
      if (isStatusChange) {
        updateGameStatus(gameId, 'day');
      } else {
        updateGamePhase(gameId, nextPhase);
      }
    });
  }
}

// フェーズをスキップするボタンを追加（デバッグ用）
function addPhaseSkipButton(gameId, nextPhase, buttonText, isStatusChange = false) {
  const gameStatus = document.getElementById('gameStatus');
  if (!gameStatus) return;
  
  // 既存のスキップボタンを削除
  const existingBtn = document.getElementById('phaseSkipBtn');
  if (existingBtn) {
    existingBtn.remove();
  }
  
  // スキップボタンの追加
  const skipBtn = document.createElement('button');
  skipBtn.id = 'phaseSkipBtn';
  skipBtn.className = 'btn secondary';
  skipBtn.textContent = buttonText;
  skipBtn.style.marginTop = '10px';
  
  skipBtn.addEventListener('click', () => {
    console.log(`手動でフェーズを進めます: ${nextPhase || '日中フェーズ'}`);
    gameTimer.stopAllTimers();
    
    if (isStatusChange) {
      updateGameStatus(gameId, 'day');
    } else {
      updateGamePhase(gameId, nextPhase);
    }
  });
  
  gameStatus.appendChild(skipBtn);
}

// 日中フェーズの処理
function handleDayPhase(gameData) {
  // 議論タイマーの表示
  const gameContainer = document.getElementById('gameStatus');
  gameContainer.innerHTML = `
    <h3>議論フェーズ</h3>
    <p>外部のボイスチャットを使って議論してください。</p>
    <div class="timer">残り時間: <span id="timerDisplay">3:00</span></div>
    ${currentPlayer.data.isHost ? 
      `<button id="skipTimer" class="btn primary">スキップ</button>` : ''}
  `;
  
  // 議論タイマー開始
  gameTimer.startDiscussionTimer(180, () => {
    const gameId = gameData.id || getGameId(gameData);
    updateGameStatus(gameId, 'voting');
  });
  
  // スキップボタンの処理（ホストのみ）
  if (currentPlayer.data.isHost) {
    document.getElementById('skipTimer').addEventListener('click', () => {
      gameTimer.stopAllTimers();
      const gameId = gameData.id || getGameId(gameData);
      updateGameStatus(gameId, 'voting');
    });
  }
}

// 投票フェーズの処理
function handleVotingPhase(gameData) {
  // 投票UI表示
  const gameContainer = document.getElementById('gameStatus');
  gameContainer.innerHTML = `
    <h3>投票フェーズ</h3>
    <p>処刑するプレイヤーを選択してください：</p>
    <div id="votingOptions" class="voting-options"></div>
  `;
  
  // 投票オプション生成
  const votingOptions = document.getElementById('votingOptions');
  
  // 自分以外のプレイヤーを表示
  Object.entries(gameData.players).forEach(([id, player]) => {
    if (id !== currentPlayer.id) {
      const btn = document.createElement('button');
      btn.className = 'btn vote-btn';
      btn.textContent = player.name;
      btn.addEventListener('click', () => {
        voteForPlayer(gameData.id || getGameId(gameData), id);
      });
      votingOptions.appendChild(btn);
    }
  });
}

// 投票処理
function voteForPlayer(gameId, targetId) {
  const voteRef = ref(db, `games/${gameId}/votes/${currentPlayer.id}`);
  update(voteRef, { target: targetId })
    .then(() => {
      // 投票後UI更新
      const votingOptions = document.getElementById('votingOptions');
      votingOptions.innerHTML = '<p>投票が完了しました。他のプレイヤーの投票を待っています...</p>';
      
      // 全プレイヤーが投票したか確認
      checkAllVoted(gameId);
    })
    .catch(error => {
      console.error('投票エラー:', error);
    });
}

// 全プレイヤーの投票確認
async function checkAllVoted(gameId) {
  const gameRef = ref(db, `games/${gameId}`);
  const snapshot = await get(gameRef);
  const gameData = snapshot.val();
  
  if (!gameData) return;
  
  const playerCount = Object.keys(gameData.players).length;
  const voteCount = Object.keys(gameData.votes || {}).length;
  
  // 全員投票したら結果フェーズへ
  if (voteCount >= playerCount && currentPlayer.data.isHost) {
    // 票の集計
    const votes = {};
    Object.values(gameData.votes).forEach(vote => {
      votes[vote.target] = (votes[vote.target] || 0) + 1;
    });
    
    // 最多票のプレイヤーを特定
    let maxVote = 0;
    let executedPlayers = [];
    
    Object.entries(votes).forEach(([playerId, count]) => {
      if (count > maxVote) {
        maxVote = count;
        executedPlayers = [playerId];
      } else if (count === maxVote) {
        executedPlayers.push(playerId);
      }
    });
    
    // 勝敗判定
    let werewolfExecuted = false;
    executedPlayers.forEach(id => {
      if (isWerewolfTeam(gameData.players[id].role)) {
        werewolfExecuted = true;
      }
    });
    
    // 結果更新
    update(ref(db, `games/${gameId}`), {
      status: 'result',
      executed_players: executedPlayers,
      winning_team: werewolfExecuted ? 'village' : 'werewolf',
      points_updated: false // 持ち点更新フラグをリセット
    });
  }
}

// 結果フェーズの処理
function handleResultPhase(gameData) {
  // 勝敗結果表示
  const gameContainer = document.getElementById('gameStatus');
  
  const executedPlayers = gameData.executed_players || [];
  const executedNames = executedPlayers.map(id => gameData.players[id].name).join('、');
  
  // 投票情報の整理
  let voteInfo = '<h4>投票結果:</h4><ul>';
  if (gameData.votes) {
    Object.entries(gameData.votes).forEach(([voterId, voteData]) => {
      const voterName = gameData.players[voterId]?.name || '不明';
      const targetName = gameData.players[voteData.target]?.name || '不明';
      voteInfo += `<li>${voterName} → ${targetName}</li>`;
    });
  }
  voteInfo += '</ul>';
  
  // 役職交換情報の表示（怪盗が役職交換した場合）
  let exchangeInfo = '';
  if (gameData.role_exchanges) {
    const thiefName = gameData.players[gameData.role_exchanges.thief_id]?.name || '不明';
    const targetName = gameData.players[gameData.role_exchanges.target_id]?.name || '不明';
    exchangeInfo = `
      <div class="role-exchange-info">
        <h4>役職交換情報:</h4>
        <p>怪盗 ${thiefName} が ${targetName} の役職「${gameData.role_exchanges.target_role}」を盗みました。</p>
      </div>
    `;
  }
  
  gameContainer.innerHTML = `
    <h3>ゲーム結果</h3>
    <p>処刑されたプレイヤー: ${executedNames}</p>
    <p class="result-text">${gameData.winning_team === 'village' ? '市民陣営' : '人狼陣営'}の勝利です！</p>
    
    <div class="votes-container">
      ${voteInfo}
    </div>
    
    ${exchangeInfo}
    
    <div class="all-roles">
      <h4>全プレイヤーの役職:</h4>
      <ul>
        ${Object.entries(gameData.players).map(([id, player]) => {
          return `<li>${player.name}: ${player.role ? player.role.name : '役職なし'} (${player.role ? (player.role.team === 'village' ? '市民陣営' : '人狼陣営') : ''})</li>`;
        }).join('')}
      </ul>
    </div>
    
    ${currentPlayer.data.isHost ? `
      <button id="nextGameBtn" class="btn primary">次のゲームへ</button>
    ` : ''}
  `;
  
  // 次のゲームボタン
  if (currentPlayer.data.isHost) {
    document.getElementById('nextGameBtn').addEventListener('click', () => {
      resetGame(gameData.id || getGameId(gameData));
    });
  }
  
  // 持ち点の更新
  updatePlayerPoints(gameData);
}

// 持ち点の更新
function updatePlayerPoints(gameData) {
  const gameId = gameData.id || getGameId(gameData);
  const winningTeam = gameData.winning_team;
  
  if (!winningTeam) return;
  
  // 既に更新済みかどうかを確認
  if (gameData.points_updated) {
    console.log('持ち点は既に更新済みです');
    return;
  }
  
  const updates = {};
  
  // 敗北チームのプレイヤー持ち点を減らす
  Object.entries(gameData.players).forEach(([id, player]) => {
    if (player.role && player.role.team !== winningTeam) {
      const newPoints = player.points - player.role.cost;
      updates[`players/${id}/points`] = newPoints;
    }
  });
  
  // 更新済みフラグを設定
  updates.points_updated = true;
  
  // 更新実行
  if (Object.keys(updates).length > 0) {
    console.log('持ち点を更新します');
    update(ref(db, `games/${gameId}`), updates);
  }
}

// 次のゲームのリセット
function resetGame(gameId) {
  console.log(`リセット処理を開始: ゲームID=${gameId}`);
  
  // ゲーム終了条件の確認
  const anyPlayerLost = Object.values(currentGame.players).some(player => player.points <= 0);
  
  if (anyPlayerLost) {
    // ゲーム終了処理
    showGameOver();
  } else {
    // プレイヤーの準備状態をリセット
    const resetData = {};
    
    // ベースとなるゲーム状態のリセット
    resetData.status = 'waiting';
    resetData.current_phase = null;
    resetData.field_cards = [];
    resetData.votes = {};
    resetData.executed_players = null;
    resetData.winning_team = null;
    resetData.points_updated = false; // 持ち点更新フラグをリセット
    resetData.role_exchanges = null;  // 役職交換情報のリセット
    
    // プレイヤーごとのデータリセット
    Object.keys(currentGame.players).forEach(id => {
      resetData[`players/${id}/role`] = null;
      resetData[`players/${id}/ready`] = false;
    });
    
    // 一度にすべての更新を送信
    console.log('ゲーム状態をリセットします');
    update(ref(db, `games/${gameId}`), resetData)
      .then(() => {
        console.log('ゲーム状態のリセットが完了しました');
      })
      .catch(error => {
        console.error('リセットエラー:', error);
        alert('次のゲームへの移行に失敗しました。ページを再読み込みしてください。');
      });
  }
}

// ゲーム終了表示
function showGameOver() {
  // プレイヤーを持ち点順にソート
  const sortedPlayers = Object.entries(currentGame.players)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.points - a.points);
  
  const gameContainer = document.getElementById('gameStatus');
  gameContainer.innerHTML = `
    <h3>ゲーム終了</h3>
    <p>いずれかのプレイヤーの持ち点が0以下になりました。</p>
    
    <div class="final-ranking">
      <h4>最終ランキング:</h4>
      <ol>
        ${sortedPlayers.map(player => `
          <li>${player.name}: ${player.points}点</li>
        `).join('')}
      </ol>
    </div>
    
    <p>勝者: ${sortedPlayers[0].name}!</p>
    <button id="returnHomeBtn" class="btn primary">ホームに戻る</button>
  `;
  
  document.getElementById('returnHomeBtn').addEventListener('click', () => {
    window.location.reload();
  });
}

// 占い師UIの表示
function showSeerUI(gameData) {
  const role = currentPlayer.data.role;
  if (!role) return;
  
  // 占い系の役職の場合のみUI表示
  if (role.name === '占い師' || role.name === '占い師の弟子' || role.name === '占い人狼') {
    const gameContainer = document.getElementById('gameStatus');
    gameContainer.innerHTML = `
      <h3>占いフェーズ</h3>
      <p>あなたの役職: ${role.name}</p>
      <p>占う対象を選択してください:</p>
      <div class="action-targets">
        ${role.name === '占い師' || role.name === '占い人狼' ? 
          `<button id="checkFieldCards" class="btn action">場札を占う</button>` : ''}
        <div class="player-targets">
          ${Object.entries(gameData.players).map(([id, player]) => {
            if (id !== currentPlayer.id) {
              return `<button class="btn player-target" data-id="${id}">${player.name}を占う</button>`;
            }
            return '';
          }).join('')}
        </div>
      </div>
    `;
    
    // 場札占いボタンのイベント
    setTimeout(() => {
      const checkFieldBtn = document.getElementById('checkFieldCards');
      if (checkFieldBtn) {
        checkFieldBtn.addEventListener('click', () => {
          // 場札確認表示
          const fieldCards = gameData.field_cards || [];
          alert(`場札の役職:\n1枚目: ${fieldCards[0].name}\n2枚目: ${fieldCards[1].name}`);
        });
      }
      
      // プレイヤー占いボタンのイベント
      document.querySelectorAll('.player-target').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const targetId = e.target.dataset.id;
          const targetPlayer = gameData.players[targetId];
          alert(`${targetPlayer.name}の役職: ${targetPlayer.role.name}`);
        });
      });
    }, 100); // DOMが確実に更新された後にイベントをバインド
  } else {
    // 占い系役職でない場合
    const gameContainer = document.getElementById('gameStatus');
    gameContainer.innerHTML = `
      <h3>占いフェーズ</h3>
      <p>あなたの役職: ${role.name}</p>
      <p>占い系の役職のプレイヤーがいれば、能力を使用しています。</p>
    `;
  }
}

// 人狼UIの表示
function showWerewolfUI(gameData) {
  const role = currentPlayer.data.role;
  if (!role) return;
  
  // 人狼系の役職の場合のみUI表示
  if (role.name === '大熊' || role.name === '占い人狼' || role.name === 'やっかいな豚男' || 
      role.name === '蛇女' || role.name === '博識な子犬') {
    const gameContainer = document.getElementById('gameStatus');
    
    // 人狼共通UI
    gameContainer.innerHTML = `
      <h3>人狼フェーズ</h3>
      <p>あなたの役職: ${role.name}</p>
    `;
    
    // 役職別の特殊UI
    if (role.name === '占い人狼') {
      // 占い人狼は他の人狼と確認できない
      gameContainer.innerHTML += `<p>あなたは一匹狼です。他の人狼と確認することはできません。</p>`;
    } else {
      // 他の人狼役職の表示
      const werewolves = Object.entries(gameData.players)
        .filter(([id, player]) => 
          player.role && 
          player.role.team === 'werewolf' && 
          id !== currentPlayer.id &&
          player.role.name !== '占い人狼'
        )
        .map(([id, player]) => player.name);
      
      if (werewolves.length > 0) {
        gameContainer.innerHTML += `
          <p>あなたの仲間: ${werewolves.join('、')}</p>
        `;
      } else {
        gameContainer.innerHTML += `<p>他の人狼は見つかりませんでした。</p>`;
      }
    }
    
    // 役職固有の能力UI
    if (role.name === 'やっかいな豚男') {
      gameContainer.innerHTML += `
        <p>★マークを付与するプレイヤーを選択してください:</p>
        <div class="player-targets">
          ${Object.entries(gameData.players).map(([id, player]) => {
            if (id !== currentPlayer.id) {
              return `<button class="btn player-target" data-id="${id}">${player.name}に★を付ける</button>`;
            }
            return '';
          }).join('')}
        </div>
      `;
      
      // ★マーク付与のイベント
      setTimeout(() => {
        document.querySelectorAll('.player-target').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const targetId = e.target.dataset.id;
            const targetPlayer = gameData.players[targetId];
            // ★マークの付与処理
            alert(`${targetPlayer.name}に★マークを付与しました！（1分後に消えます）`);
          });
        });
      }, 100);
    }
  } else {
    // 人狼系役職でない場合
    const gameContainer = document.getElementById('gameStatus');
    gameContainer.innerHTML = `
      <h3>人狼フェーズ</h3>
      <p>あなたの役職: ${role.name}</p>
      <p>人狼陣営のプレイヤーが自分たちを確認しています。</p>
    `;
  }
}

// 怪盗UIの表示
function showThiefUI(gameData) {
  const role = currentPlayer.data.role;
  if (!role) return;
  
  // 怪盗役職の場合のみUI表示
  if (role.name === '怪盗') {
    const gameContainer = document.getElementById('gameStatus');
    gameContainer.innerHTML = `
      <h3>怪盗フェーズ</h3>
      <p>あなたの役職: ${role.name}</p>
      <p>役職を交換するプレイヤーを選択するか、交換しないを選べます:</p>
      <div class="action-targets">
        <button id="noExchangeBtn" class="btn action">交換しない</button>
        <div class="player-targets">
          ${Object.entries(gameData.players).map(([id, player]) => {
            if (id !== currentPlayer.id) {
              return `<button class="btn player-target" data-id="${id}">${player.name}と交換する</button>`;
            }
            return '';
          }).join('')}
        </div>
      </div>
    `;
    
    // 交換しないボタンのイベント
    document.getElementById('noExchangeBtn').addEventListener('click', () => {
      alert('役職の交換をしませんでした。');
    });
    
    // 役職交換ボタンのイベント
    document.querySelectorAll('.player-target').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.target.dataset.id;
        const targetPlayer = gameData.players[targetId];
        
        // 自分の画面だけに表示（相手には通知しない）
        alert(`${targetPlayer.name}との役職交換: あなたは「${targetPlayer.role.name}」になりました！`);
        
        // 役職交換情報を記録する（実際の役職は交換するが、交換情報も保持）
        exchangeRoles(gameData.id || getGameId(gameData), currentPlayer.id, targetId);
      });
    });
  } else {
    // 怪盗役職でない場合
    const gameContainer = document.getElementById('gameStatus');
    gameContainer.innerHTML = `
      <h3>怪盗フェーズ</h3>
      <p>あなたの役職: ${role.name}</p>
      <p>怪盗がいれば、他のプレイヤーと役職を交換している可能性があります。</p>
    `;
  }
}

// フェーズの更新
function updateGamePhase(gameId, phase) {
  return update(ref(db, `games/${gameId}`), {
    current_phase: phase
  });
}

// ゲームIDの取得
function getGameId(gameData) {
  // gameDataに追加されたgameIdプロパティを使用
  if (gameData.gameId) {
    return gameData.gameId;
  }
  
  console.error('gameDataにgameIdがありません', gameData);
  return null; // IDが見つからない場合
}

// 役職交換処理の関数を追加
function exchangeRoles(gameId, playerId1, playerId2) {
  const updates = {};
  
  // Firebaseで役職を交換
  const gameRef = ref(db, `games/${gameId}`);
  get(gameRef).then((snapshot) => {
    const gameData = snapshot.val();
    if (!gameData) return;
    
    const role1 = gameData.players[playerId1].role;
    const role2 = gameData.players[playerId2].role;
    
    // 役職の交換
    updates[`players/${playerId1}/role`] = role2;
    updates[`players/${playerId2}/role`] = role1;
    
    // 役職交換の情報を保存（結果フェーズで使用）
    updates[`role_exchanges`] = {
      thief_id: playerId1,
      target_id: playerId2,
      original_thief_role: role1.name,
      target_role: role2.name
    };
    
    update(ref(db, `games/${gameId}`), updates);
  });
}

export { initGame, startGame, handlePhase };