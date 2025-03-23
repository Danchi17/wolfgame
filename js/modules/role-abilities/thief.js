// js/modules/role-abilities/thief.js
import { currentPlayer, nextPhase, getGameId, setPhaseTimer } from '../game-core.js';
import { notificationSystem } from '../../ui.js';
import { db, ref, update, get } from '../../firebase.js';

/**
 * 怪盗の能力処理
 * @param {Object} gameData - ゲームデータ
 */
export function handleThiefAbility(gameData) {
  const gameStatus = document.getElementById('gameStatus');
  const gameId = getGameId(gameData);
  
  // 現在のプレイヤーが怪盗かどうか
  const isThief = currentPlayer.data?.role?.name === '怪盗';
  
  // ゲーム状態表示の基本情報
  let statusHtml = `
    <h3>夜フェーズ - 怪盗の能力</h3>
    <p>怪盗は他のプレイヤーと役職を交換することができます。</p>
  `;
  
  // 怪盗の場合
  if (isThief) {
    let playerOptions = '';
    
    // 交換対象のプレイヤーオプション
    Object.entries(gameData.players).forEach(([id, player]) => {
      if (id !== currentPlayer.id) { // 自分以外のプレイヤー
        playerOptions += `
          <button class="btn player-target" data-player-id="${id}" data-player-name="${player.name}">
            ${player.name}と交換する
          </button>
        `;
      }
    });
    
    statusHtml += `
      <div class="ability-description">
        <p>あなたは怪盗です。誰と役職を交換しますか？</p>
      </div>
      <div class="action-targets">
        <div class="player-targets">
          ${playerOptions}
        </div>
        <button id="skipAbilityBtn" class="btn secondary">交換しない</button>
      </div>
    `;
  } else {
    // 怪盗でない場合は待機メッセージ
    statusHtml += `
      <p>あなたは怪盗ではありません。他のプレイヤーのアクションを待っています...</p>
      <p>役職：${currentPlayer.data?.role?.name || '不明'}</p>
    `;
    
    // 30秒後に自動で次のフェーズへ（実際のゲームではホストが管理）
    // setPhaseTimerに変更して一元管理
    setPhaseTimer('thief', () => {
      nextPhase(gameId, 'thief');
    }, 30000);
  }
  
  // UI表示更新
  gameStatus.innerHTML = statusHtml;
  
  // 怪盗の場合、ボタンにイベントリスナーを追加
  if (isThief) {
    // プレイヤーと交換する
    const playerTargetButtons = document.querySelectorAll('.player-target');
    playerTargetButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const targetId = button.dataset.playerId;
        const targetName = button.dataset.playerName;
        await exchangeRole(gameId, targetId, targetName);
      });
    });
    
    // 交換をスキップする
    const skipButton = document.getElementById('skipAbilityBtn');
    skipButton.addEventListener('click', () => {
      notificationSystem.info('役職交換をせずに次のフェーズに進みます。');
      
      // UI更新
      gameStatus.innerHTML = `
        <h3>夜フェーズ - 怪盗の能力</h3>
        <p>役職交換をしませんでした。</p>
        <p>次のフェーズに進みます...</p>
      `;
      
      // 次のフェーズへ - setPhaseTimerに変更
      setPhaseTimer('thief_skip', () => {
        nextPhase(gameId, 'thief');
      }, 3000);
    });
  }
}

/**
 * 役職を交換
 * @param {string} gameId - ゲームID
 * @param {string} targetId - 対象プレイヤーID
 * @param {string} targetName - 対象プレイヤー名
 */
async function exchangeRole(gameId, targetId, targetName) {
  try {
    // 現在のプレイヤーと対象プレイヤーの役職を取得
    const thiefRole = currentPlayer.data.role;
    
    // 対象プレイヤーの役職を取得
    const snapshot = await get(ref(db, `games/${gameId}/players/${targetId}/role`));
    const targetRole = snapshot.val();
    
    if (!targetRole) {
      notificationSystem.error('対象プレイヤーの役職情報を取得できませんでした');
      return;
    }
    
    // 役職交換情報を記録
    const roleExchangeData = {
      role_exchanges: {
        thief_id: currentPlayer.id,
        target_id: targetId,
        thief_original_role: thiefRole.name,
        target_role: targetRole.name
      },
      // 元の役職情報を保存（結果フェーズで使用）
      hidden_roles: {
        [currentPlayer.id]: targetRole,
        [targetId]: thiefRole
      }
    };
    
    // 実際の役職交換は行わず、結果フェーズで適用する
    await update(ref(db, `games/${gameId}`), roleExchangeData);
    
    // 通知
    notificationSystem.success(`${targetName}と役職を交換しました。あなたの新しい役職は「${targetRole.name}」です。`, 10000);
    
    // UI更新
    const gameStatus = document.getElementById('gameStatus');
    gameStatus.innerHTML = `
      <h3>夜フェーズ - 怪盗の能力</h3>
      <div class="exchange-result">
        <h4>役職交換結果</h4>
        <p>${targetName}と役職を交換しました。</p>
        <p>あなたの元の役職: ${thiefRole.name}</p>
        <p>あなたの新しい役職: ${targetRole.name} (${targetRole.team === 'village' ? '市民陣営' : '人狼陣営'})</p>
        <p>※ 役職の入れ替えは結果発表時に反映されます。</p>
      </div>
      <p>次のフェーズに進みます...</p>
    `;
    
    // 次のフェーズへ - setPhaseTimerに変更
    setPhaseTimer('thief_exchange', () => {
      nextPhase(gameId, 'thief');
    }, 5000);
    
  } catch (error) {
    console.error('役職交換エラー:', error);
    notificationSystem.error('役職の交換に失敗しました');
  }
}
