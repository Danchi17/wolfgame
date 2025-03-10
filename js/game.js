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
  
  // スパイ通報ボタン用のUI要素
  let spyReportUI = '';
  
  // 自分がスパイの場合、通報ボタンを表示
  if (currentPlayer.data.role && currentPlayer.data.role.name === 'スパイ') {
    spyReportUI = `
      <div class="spy-report">
        <h4>スパイ通報</h4>
        <p>人狼だと思うプレイヤーを通報できます。通報が当たれば市民陣営強制敗北、外れた場合はあなたの持ち点が追加で2点減少します。</p>
        <div id="spyReportTargets" class="spy-report-targets"></div>
      </div>
    `;
  }
  
  // 博識な子犬の役職推測UI
  let puppyGuessUI = '';
  if (currentPlayer.data.role && currentPlayer.data.role.name === '博識な子犬') {
    const villageRoles = [
      '占い師', '占星術師', '占い師の弟子', '無法者', '村長', '怪盗', 'スパイ'
    ];
    
    puppyGuessUI = `
      <div class="puppy-guess">
        <h4>役職推測</h4>
        <p>場札に含まれる市民陣営の役職を当ててみましょう。正解すると持ち点が2点回復します。</p>
        <div class="role-guess-options">
          ${villageRoles.map(role => `
            <button class="btn guess-role" data-role="${role}">${role}</button>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // やっかいな豚男に投票先を指定されている場合のメッセージ
  let forcedVoteMessage = '';
  if (gameData.forced_vote_target && gameData.forced_vote_by) {
    if (currentPlayer.id === gameData.forced_vote_target) {
      const forcer = gameData.players[gameData.forced_vote_by];
      forcedVoteMessage = `
        <div class="forced-vote-message" style="background-color: #ffcccc; padding: 10px; margin-bottom: 15px; border-radius: 5px;">
          <p><strong>注意:</strong> ${forcer.name}によって投票先が強制的に指定されています！</p>
        </div>
      `;
    }
  }
  
  // 村長かどうかを判定
  const isMayor = currentPlayer.data.role && currentPlayer.data.role.name === '村長';
  
  // やっかいな豚男かどうかを判定し、投票権があるかチェック
  const isPig = currentPlayer.data.role && currentPlayer.data.role.name === 'やっかいな豚男';
  const hasVoteRight = !(isPig && gameData.forced_vote_by === currentPlayer.id);
  
  gameContainer.innerHTML = `
    <h3>投票フェーズ</h3>
    ${forcedVoteMessage}
    <p>処刑するプレイヤーを選択してください${isMayor ? '（あなたは2票の投票権があります）' : ''}:</p>
    ${hasVoteRight ? `<div id="votingOptions" class="voting-options"></div>` : 
      `<p style="color: red;">あなたは投票権を失っています（やっかいな豚男の能力使用）</p>`}
    ${puppyGuessUI}
    ${spyReportUI}
  `;
  
  // 投票権がある場合のみオプション生成
  if (hasVoteRight) {
    const votingOptions = document.getElementById('votingOptions');
    
    // 自分以外のプレイヤーを表示
    Object.entries(gameData.players).forEach(([id, player]) => {
      // 自分自身または既に投票済みのプレイヤーは表示しない
      if (id !== currentPlayer.id) {
        // 強制投票対象がある場合、その対象のみ表示
        if (gameData.forced_vote_target === currentPlayer.id && id !== gameData.forced_vote_by) {
          const forcedTargetId = Object.keys(gameData.players).find(playerId => 
            playerId !== currentPlayer.id && playerId !== gameData.forced_vote_by
          );
          
          if (id === forcedTargetId) {
            const btn = document.createElement('button');
            btn.className = 'btn vote-btn forced';
            btn.textContent = `${player.name}（強制）`;
            btn.style.backgroundColor = '#ffcccc';
            btn.addEventListener('click', () => {
              voteForPlayer(gameData.gameId || getGameId(gameData), id, isMayor);
            });
            votingOptions.appendChild(btn);
          }
        } else {
          const btn = document.createElement('button');
          btn.className = 'btn vote-btn';
          btn.textContent = player.name;
          btn.addEventListener('click', () => {
            voteForPlayer(gameData.gameId || getGameId(gameData), id, isMayor);
          });
          votingOptions.appendChild(btn);
        }
      }
    });
  }
  
  // 博識な子犬の役職推測イベント
  if (currentPlayer.data.role && currentPlayer.data.role.name === '博識な子犬') {
    setTimeout(() => {
      document.querySelectorAll('.guess-role').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const guessedRole = e.target.dataset.role;
          checkPuppyGuess(gameData, guessedRole);
        });
      });
    }, 100);
  }
  
  // スパイ通報ボタンのイベント
  if (currentPlayer.data.role && currentPlayer.data.role.name === 'スパイ') {
    const spyReportTargets = document.getElementById('spyReportTargets');
    if (spyReportTargets) {
      // 通報対象を表示（自分以外の全プレイヤー）
      Object.entries(gameData.players).forEach(([id, player]) => {
        if (id !== currentPlayer.id) {
          const reportBtn = document.createElement('button');
          reportBtn.className = 'btn report-btn';
          reportBtn.textContent = `${player.name}を人狼として通報`;
          reportBtn.dataset.id = id;
          
          reportBtn.addEventListener('click', () => {
            reportAsWerewolf(gameData.gameId || getGameId(gameData), id);
          });
          
          spyReportTargets.appendChild(reportBtn);
        }
      });
    }
  }
}

// 投票処理（村長の2票対応）
function voteForPlayer(gameId, targetId, isMayor) {
  const voteValue = isMayor ? 2 : 1; // 村長なら2票、それ以外は1票
  
  const voteRef = ref(db, `games/${gameId}/votes/${currentPlayer.id}`);
  update(voteRef, { 
    target: targetId,
    value: voteValue
  })
    .then(() => {
      // 投票後UI更新
      const votingOptions = document.getElementById('votingOptions');
      if (votingOptions) {
        votingOptions.innerHTML = '<p>投票が完了しました。他のプレイヤーの投票を待っています...</p>';
      }
      
      // 全プレイヤーが投票したか確認
      checkAllVoted(gameId);
    })
    .catch(error => {
      console.error('投票エラー:', error);
    });
}

// 博識な子犬の役職推測チェック
function checkPuppyGuess(gameData, guessedRole) {
  const gameId = gameData.gameId || getGameId(gameData);
  const fieldCards = gameData.field_cards || [];
  
  // 場札に指定された市民陣営の役職があるかチェック
  const isCorrect = fieldCards.some(card => card.name === guessedRole && card.team === 'village');
  
  if (isCorrect) {
    // 正解の場合、持ち点を2点回復
    alert(`正解！場札に「${guessedRole}」がありました。持ち点が2点回復します。`);
    
    // 持ち点更新
    const currentPoints = currentPlayer.data.points || 0;
    update(ref(db, `games/${gameId}/players/${currentPlayer.id}`), {
      points: currentPoints + 2
    });
    
    // 正解フラグを保存
    update(ref(db, `games/${gameId}`), {
      puppy_guessed_correct: true
    });
  } else {
    alert(`不正解...場札に「${guessedRole}」はありませんでした。`);
  }
  
  // 推測ボタンを無効化
  document.querySelectorAll('.guess-role').forEach(btn => {
    btn.disabled = true;
  });
}

// スパイの通報処理
function reportAsWerewolf(gameId, reportedId) {
  // 通報対象が本当に人狼陣営かチェック
  get(ref(db, `games/${gameId}/players/${reportedId}`)).then((snapshot) => {
    const reportedPlayer = snapshot.val();
    const isWerewolf = reportedPlayer && reportedPlayer.role && reportedPlayer.role.team === 'werewolf';
    
    // 通報情報を保存
    update(ref(db, `games/${gameId}`), {
      spy_report: {
        reporter: currentPlayer.id,
        reported: reportedId,
        is_correct: isWerewolf
      }
    });
    
    // UI更新
    const spyReportTargets = document.getElementById('spyReportTargets');
    if (spyReportTargets) {
      spyReportTargets.innerHTML = '<p>通報が完了しました。結果は処刑フェーズで発表されます。</p>';
    }
    
    alert(`${reportedPlayer.name}を人狼として通報しました。結果は処刑フェーズで発表されます。`);
  });
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
        <p>投票先を強制的に指定するプレイヤーを選択してください:</p>
        <div class="player-targets">
          ${Object.entries(gameData.players).map(([id, player]) => {
            if (id !== currentPlayer.id) {
              return `<button class="btn player-target" data-id="${id}">${player.name}を指定</button>`;
            }
            return '';
          }).join('')}
        </div>
      `;
      
      // 投票先指定のイベント
      setTimeout(() => {
        document.querySelectorAll('.player-target').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const targetId = e.target.dataset.id;
            const targetPlayer = gameData.players[targetId];
            
            // 投票先指定対象の保存
            const gameId = gameData.gameId || getGameId(gameData);
            update(ref(db, `games/${gameId}`), {
              forced_vote_target: targetId,
              forced_vote_by: currentPlayer.id
            });
            
            alert(`${targetPlayer.name}の投票先を強制的に指定します。あなたは投票権を失います。`);
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