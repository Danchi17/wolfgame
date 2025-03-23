// js/modules/phase-day.js
import { currentPlayer, nextPhase, getRemainingTime, getGameId } from './game-core.js';
import { notificationSystem } from '../ui.js';
import { db, ref, update, get } from '../firebase.js';

/**
 * 日中フェーズの処理
 * @param {Object} gameData - ゲームデータ
 */
export function handleDayPhase(gameData) {
  const gameStatus = document.getElementById('gameStatus');
  const gameId = getGameId(gameData);
  
  // タイマー初期化
  let timer = gameData.timer || { duration: 180, start_time: Date.now() };
  let timerInterval;
  
  // 残り時間計算
  let remainingTime = getRemainingTime(timer);
  
  // 日中フェーズの表示内容
  let statusHtml = `
    <h3>日中フェーズ</h3>
    <p>プレイヤーと議論して、人狼だと思われる人を探してください。</p>
    <div class="day-info">
      <p>残り時間: <span id="timer">${formatTime(remainingTime)}</span></p>
      <p>※DiscordやZoomなどで会話することを推奨します</p>
    </div>
  `;
  
  // 博識な子犬の能力
  if (currentPlayer.data?.role?.name === '博識な子犬') {
    statusHtml += addKnowledgeablePuppyAbility(gameData);
  }
  
  // ホストの場合、次のフェーズボタンを表示
  if (currentPlayer.data?.isHost) {
    statusHtml += `
      <div class="phase-control">
        <button id="nextPhaseBtn" class="btn primary">投票フェーズへ進む</button>
      </div>
    `;
  }
  
  // UI表示更新
  gameStatus.innerHTML = statusHtml;
  
  // タイマー更新
  timerInterval = setInterval(() => {
    remainingTime = getRemainingTime(timer);
    const timerElement = document.getElementById('timer');
    
    if (timerElement) {
      timerElement.textContent = formatTime(remainingTime);
      
      // 残り時間が少なくなったら警告
      if (remainingTime <= 30) {
        timerElement.style.color = 'red';
      }
      
      // タイマー終了
      if (remainingTime <= 0) {
        clearInterval(timerInterval);
        // グローバル参照を削除
        if (window.gameIntervals && window.gameIntervals.dayPhase === timerInterval) {
          window.gameIntervals.dayPhase = null;
        }
        timerElement.textContent = '00:00';
        
        if (currentPlayer.data?.isHost) {
          notificationSystem.warning('時間が経過しました。投票フェーズに進んでください。');
        } else {
          notificationSystem.warning('時間が経過しました。投票フェーズを待っています...');
        }
      }
    }
  }, 1000);
  
  // グローバル参照を保存（他の場所でもクリアできるように）
  if (window.gameIntervals) {
    window.gameIntervals.dayPhase = timerInterval;
  }
  
  // ホストの場合、次のフェーズボタンにイベントリスナーを追加
  if (currentPlayer.data?.isHost) {
    const nextPhaseBtn = document.getElementById('nextPhaseBtn');
    if (nextPhaseBtn) {
      nextPhaseBtn.addEventListener('click', async () => {
        clearInterval(timerInterval);
        // グローバル参照を削除
        if (window.gameIntervals && window.gameIntervals.dayPhase === timerInterval) {
          window.gameIntervals.dayPhase = null;
        }
        await nextPhase(gameId, 'day');
      });
    }
  }
  
  // 博識な子犬の能力用のイベントリスナー
  if (currentPlayer.data?.role?.name === '博識な子犬') {
    setupPuppyGuessAbility(gameData);
  }
}

/**
 * 時間をフォーマット（分:秒）
 * @param {number} seconds - 秒数
 * @returns {string} フォーマットされた時間
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 博識な子犬の能力UIを追加
 * @param {Object} gameData - ゲームデータ
 * @returns {string} HTML文字列
 */
function addKnowledgeablePuppyAbility(gameData) {
  // 既に推測済みかどうか確認
  if (gameData.puppy_guessed) {
    // 推測済みの場合、結果を表示
    const isCorrect = gameData.puppy_guessed_correct || false;
    return `
      <div class="puppy-guess">
        <h4>博識な子犬の能力</h4>
        <p>あなたは既に役職を推測しています。</p>
        <p>推測結果: ${isCorrect ? '正解！持ち点が2点回復します。' : '不正解...'}</p>
      </div>
    `;
  }
  
  // 村人陣営の役職一覧を取得（固定リスト）
  const villageRoles = [
    '占い師', '占星術師', '占い師の弟子', '無法者', '村長', '怪盗', 'スパイ'
  ];
  
  // 役職選択ボタン
  const roleButtons = villageRoles.map(role => `
    <button class="btn guess-role" data-role="${role}">${role}</button>
  `).join('');
  
  return `
    <div class="puppy-guess">
      <h4>博識な子犬の能力</h4>
      <p>あなたは博識な子犬です。場札のどちらかに含まれる市民陣営の役職を当てると、持ち点が2点回復します。</p>
      <p>場札に含まれる市民陣営の役職はどれだと思いますか？</p>
      <div class="role-guess-options">
        ${roleButtons}
      </div>
    </div>
  `;
}

/**
 * 博識な子犬の能力イベントリスナーを設定
 * @param {Object} gameData - ゲームデータ
 */
function setupPuppyGuessAbility(gameData) {
  const gameId = getGameId(gameData);
  
  // 既に推測済みならイベントを設定しない
  if (gameData.puppy_guessed) return;
  
  // 推測ボタンにイベントリスナーを追加
  const guessButtons = document.querySelectorAll('.guess-role');
  guessButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const guessedRole = button.dataset.role;
      await checkPuppyGuess(gameId, guessedRole);
    });
  });
}

/**
 * 博識な子犬の推測を確認
 * @param {string} gameId - ゲームID
 * @param {string} guessedRole - 推測した役職名
 */
async function checkPuppyGuess(gameId, guessedRole) {
  try {
    // 場札を取得
    const snapshot = await get(ref(db, `games/${gameId}/field_cards`));
    const fieldCards = snapshot.val() || [];
    
    // 推測が正しいかチェック
    const isCorrect = fieldCards.some(card => 
      card.name === guessedRole && card.team === 'village'
    );
    
    // 推測情報を保存
    const updates = {
      puppy_guessed: true,
      puppy_guessed_correct: isCorrect,
      puppy_guessed_role: guessedRole,
      puppy_guessed_by: currentPlayer.id
    };
    
    // 正解の場合、プレイヤーの持ち点を2点回復
    if (isCorrect) {
      const playerSnapshot = await get(ref(db, `games/${gameId}/players/${currentPlayer.id}`));
      const currentPoints = playerSnapshot.val()?.points || 0;
      updates[`players/${currentPlayer.id}/points`] = currentPoints + 2;
    }
    
    await update(ref(db, `games/${gameId}`), updates);
    
    // 通知
    if (isCorrect) {
      notificationSystem.success(`正解！場札に${guessedRole}が含まれています。持ち点が2点回復しました。`, 10000);
    } else {
      notificationSystem.error(`不正解...場札に${guessedRole}は含まれていません。`, 8000);
    }
    
    // UI更新
    const puppyGuessElement = document.querySelector('.puppy-guess');
    if (puppyGuessElement) {
      puppyGuessElement.innerHTML = `
        <h4>博識な子犬の能力</h4>
        <p>あなたは「${guessedRole}」と推測しました。</p>
        <p>推測結果: ${isCorrect ? '正解！持ち点が2点回復します。' : '不正解...'}</p>
      `;
    }
    
  } catch (error) {
    console.error('博識な子犬の推測エラー:', error);
    notificationSystem.error('役職の推測に失敗しました');
  }
}
