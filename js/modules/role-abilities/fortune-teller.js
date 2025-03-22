// js/modules/role-abilities/fortune-teller.js
import { currentPlayer } from '../game-core.js';
import { notificationSystem } from '../ui-components.js';

/**
 * 占星術師の能力処理
 * 占い師のターンで使用される
 * @param {Object} gameData - ゲームデータ
 */
function handleFortuneTellerAbility(gameData) {
  // プレイヤーが占星術師でない場合は何もしない
  if (currentPlayer.data.role?.name !== '占星術師') {
    return;
  }
  
  // 場札を含む全役職のうち、人狼陣営の数をカウント
  let werewolfCount = 0;
  
  // プレイヤーの役職をチェック
  Object.values(gameData.players).forEach(player => {
    if (player.role && player.role.team === 'werewolf') {
      werewolfCount++;
    }
  });
  
  // 場札の役職をチェック
  (gameData.field_cards || []).forEach(card => {
    if (card.team === 'werewolf') {
      werewolfCount++;
    }
  });
  
  // 占星術師に情報を表示
  notificationSystem.info(
    `【占星術師情報】場にある人狼陣営の数は合計${werewolfCount}個です。`, 
    15000
  );
  
  // ゲーム状態表示に情報を追加
  const gameContainer = document.getElementById('gameStatus');
  if (gameContainer) {
    gameContainer.innerHTML = `
      <h3>占い師フェーズ</h3>
      <p>あなたの役職: 占星術師</p>
      <div class="fortune-teller-info">
        <h4>占星術師情報</h4>
        <p>場にある役職のうち、人狼陣営の数は合計<strong>${werewolfCount}</strong>個です。</p>
        <p>（プレイヤーの手札と場札を含む全6枚の役職カードを調査しました）</p>
      </div>
    `;
  }
}

export { handleFortuneTellerAbility };
