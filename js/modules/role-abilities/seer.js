// js/modules/role-abilities/seer.js
import { currentPlayer, nextPhase, getGameId, setPhaseTimer } from '../game-core.js';
import { notificationSystem } from '../../ui.js';
import { db, ref, update, get } from '../../firebase.js';
// 占星術師の能力をインポート
import { handleFortuneTellerAbility } from './fortune-teller.js';

/**
 * 占い師の能力処理
 * @param {Object} gameData - ゲームデータ
 */
export function handleSeerAbility(gameData) {
  // 占星術師の能力を呼び出す（自動発動させる）
  handleFortuneTellerAbility(gameData);

  const gameStatus = document.getElementById('gameStatus');
  const gameId = getGameId(gameData);
  
  // 現在のプレイヤーが占い師かどうか
  const isSeer = currentPlayer.data?.role?.name === '占い師' || currentPlayer.data?.role?.name === '占い人狼' || currentPlayer.data?.role?.name === '占い師の弟子';
  
  // ゲーム状態表示の基本情報
  let statusHtml = `
    <h3>夜フェーズ - 占い師の能力</h3>
    <p>占い師は他のプレイヤーまたは場札の役職を確認できます。</p>
  `;
  
  // 占い師と"占い人狼"、"占い師の弟子"の場合
  if (isSeer) {
    let playerOptions = '';
    let canCheckFieldCards = currentPlayer.data?.role?.name !== '占い師の弟子'; // 占い師の弟子は場札を見られない
    
    // プレイヤー対象オプション
    Object.entries(gameData.players).forEach(([id, player]) => {
      if (id !== currentPlayer.id) { // 自分以外のプレイヤー
        playerOptions += `
          <button class="btn player-target" data-player-id="${id}" data-player-name="${player.name}">
            ${player.name}を占う
          </button>
        `;
      }
    });
    
    // 場札オプション（占い師と占い人狼のみ）
    let fieldCardsOption = '';
    if (canCheckFieldCards) {
      fieldCardsOption = `
        <button class="btn player-target" data-field-cards="true">
          場札を占う
        </button>
      `;
    }
    
    statusHtml += `
      <div class="ability-description">
        <p>あなたは${currentPlayer.data.role.name}です。誰を占いますか？</p>
      </div>
      <div class="action-targets">
        <div class="player-targets">
          ${playerOptions}
          ${fieldCardsOption}
        </div>
      </div>
    `;
  } else {
    // 占い師でない場合は待機メッセージ
    statusHtml += `
      <p>あなたは占い師ではありません。他のプレイヤーのアクションを待っています...</p>
      <p>役職：${currentPlayer.data?.role?.name || '不明'}</p>
    `;
    
    // 30秒後に自動で次のフェーズへ（実際のゲームではホストが管理）
    // setTimeout の代わりに setPhaseTimer を使用（一元管理）
    setPhaseTimer('seer', () => {
      nextPhase(gameId, 'seer');
    }, 30000);
  }
  
  // UI表示更新
  gameStatus.innerHTML = statusHtml;
  
  // 占い師の場合、ボタンにイベントリスナーを追加
  if (isSeer) {
    // プレイヤーを占う
    const playerTargetButtons = document.querySelectorAll('.player-target[data-player-id]');
    playerTargetButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const targetId = button.dataset.playerId;
        const targetName = button.dataset.playerName;
        await checkPlayerRole(gameId, targetId, targetName);
      });
    });
    
    // 場札を占う
    const fieldCardsButton = document.querySelector('.player-target[data-field-cards]');
    if (fieldCardsButton) {
      fieldCardsButton.addEventListener('click', async () => {
        await checkFieldCards(gameId);
      });
    }
  }
}

/**
 * プレイヤーの役職を確認
 * @param {string} gameId - ゲームID
 * @param {string} targetId - 対象プレイヤーID
 * @param {string} targetName - 対象プレイヤー名
 */
async function checkPlayerRole(gameId, targetId, targetName) {
  try {
    // 対象プレイヤーの役職を取得
    const snapshot = await get(ref(db, `games/${gameId}/players/${targetId}/role`));
    const role = snapshot.val();
    
    if (role) {
      // 結果を表示
      notificationSystem.info(`【占い結果】${targetName}の役職は「${role.name}」（${role.team === 'village' ? '市民陣営' : '人狼陣営'}）です。`, 10000);
      
      // UI更新
      const gameStatus = document.getElementById('gameStatus');
      gameStatus.innerHTML = `
        <h3>夜フェーズ - 占い師の能力</h3>
        <div class="fortune-result">
          <h4>占い結果</h4>
          <p>${targetName}の役職は「${role.name}」（${role.team === 'village' ? '市民陣営' : '人狼陣営'}）です。</p>
        </div>
        <p>次のフェーズに進みます...</p>
      `;
      
      // 次のフェーズへ - setPhaseTimerに変更
      setPhaseTimer('seer_next', () => {
        nextPhase(gameId, 'seer');
      }, 5000);
    }
  } catch (error) {
    console.error('役職確認エラー:', error);
    notificationSystem.error('役職の確認に失敗しました');
  }
}

/**
 * 場札の役職を確認
 * @param {string} gameId - ゲームID 
 */
async function checkFieldCards(gameId) {
  try {
    // 場札の役職を取得
    const snapshot = await get(ref(db, `games/${gameId}/field_cards`));
    const fieldCards = snapshot.val();
    
    if (fieldCards && fieldCards.length > 0) {
      // 結果を表示
      let resultText = '【占い結果】場札の役職:\n';
      fieldCards.forEach((card, index) => {
        resultText += `場札${index + 1}: ${card.name}（${card.team === 'village' ? '市民陣営' : '人狼陣営'}）\n`;
      });
      
      notificationSystem.info(resultText, 10000);
      
      // UI更新
      const gameStatus = document.getElementById('gameStatus');
      gameStatus.innerHTML = `
        <h3>夜フェーズ - 占い師の能力</h3>
        <div class="fortune-result">
          <h4>占い結果</h4>
          <p>場札の役職:</p>
          <ul>
            ${fieldCards.map((card, index) => `
              <li>場札${index + 1}: ${card.name}（${card.team === 'village' ? '市民陣営' : '人狼陣営'}）</li>
            `).join('')}
          </ul>
        </div>
        <p>次のフェーズに進みます...</p>
      `;
      
      // 次のフェーズへ - setPhaseTimerに変更
      setPhaseTimer('seer_next', () => {
        nextPhase(gameId, 'seer');
      }, 5000);
    }
  } catch (error) {
    console.error('場札確認エラー:', error);
    notificationSystem.error('場札の確認に失敗しました');
  }
}