// js/modules/role-abilities/spy.js
import { currentPlayer } from '../game-core.js';
import { notificationSystem } from '../../ui.js';

/**
 * スパイの人狼陣営確認機能
 * 人狼フェーズで使用される
 * @param {Object} gameData - ゲームデータ
 */
function handleSpyAbility(gameData) {
  // プレイヤーがスパイでない場合は何もしない
  if (currentPlayer.data.role?.name !== 'スパイ') {
    return;
  }
  
  // 人狼陣営のプレイヤーを特定
  const werewolves = Object.entries(gameData.players)
    .filter(([id, player]) => 
      player.role && 
      player.role.team === 'werewolf' && 
      player.role.name !== 'スパイ' && // スパイは除外
      player.role.name !== '占い人狼' && // 占い人狼は除外（変更点）
      id !== currentPlayer.id
    )
    .map(([id, player]) => ({ id, name: player.name, role: player.role.name }));
  
  // スパイ情報表示
  if (werewolves.length > 0) {
    const werewolfInfo = werewolves.map(wolf => `${wolf.name}[役職: ${wolf.role}]`).join('\n');
    notificationSystem.info(
      `【スパイ情報】人狼陣営のメンバーを確認しました:\n${werewolfInfo}\n\n投票フェーズでは人狼陣営プレイヤーがあなたをスパイとして通報できます。`, 
      15000
    );
  } else {
    notificationSystem.info('【スパイ情報】人狼陣営のプレイヤーがいません。場札に人狼陣営がある可能性があります。', 10000);
  }
  
  // 人狼陣営にスパイの存在を通知
  const gameContainer = document.getElementById('gameStatus');
  if (gameContainer) {
    gameContainer.innerHTML = `
      <h3>人狼フェーズ</h3>
      <p>あなたの役職: スパイ</p>
      <div class="spy-info">
        <h4>スパイ情報</h4>
        ${werewolves.length > 0 ? `
          <p>人狼陣営のメンバー:</p>
          <ul>
            ${werewolves.map(wolf => `<li>${wolf.name} [役職: ${wolf.role}]</li>`).join('')}
          </ul>
        ` : `
          <p>人狼陣営のプレイヤーがいません。場札に人狼陣営がある可能性があります。</p>
        `}
        <p>投票フェーズでは、人狼陣営プレイヤーがあなたをスパイとして通報できます。通報されると市民陣営の強制敗北になります。</p>
      </div>
    `;
  }
  
  // 人狼にスパイの存在を通知する
  showSpyToWerewolves(gameData);
}

/**
 * 人狼陣営のプレイヤーにスパイの存在を表示
 * @param {Object} gameData - ゲームデータ
 */
function showSpyToWerewolves(gameData) {
  // スパイプレイヤーを特定
  const spyPlayer = Object.entries(gameData.players).find(([id, player]) => 
    player.role && player.role.name === 'スパイ'
  );
  
  if (!spyPlayer) return;
  
  const [spyId, spy] = spyPlayer;
  
  // 現在のプレイヤーが人狼陣営ならスパイの存在を表示
  if (currentPlayer.data.role && 
      currentPlayer.data.role.team === 'werewolf' && 
      currentPlayer.data.role.name !== 'スパイ' && // スパイ自身は除外
      currentPlayer.data.role.name !== '占い人狼') { // 占い人狼は除外
    
    notificationSystem.warning(`【警告】スパイが存在します: ${spy.name} がスパイであなたたち人狼陣営を確認しています。`, 15000);
    
    // スパイ情報を追加表示
    const gameStatus = document.getElementById('gameStatus');
    if (gameStatus && gameStatus.innerHTML.includes('人狼フェーズ')) {
      const spyWarning = document.createElement('div');
      spyWarning.className = 'spy-warning';
      spyWarning.innerHTML = `
        <h4>警告: スパイの存在</h4>
        <p>${spy.name} がスパイです。投票フェーズで${spy.name}をスパイとして通報できます。通報が成功すれば、市民陣営の強制敗北となります。</p>
      `;
      
      // 既存の警告がない場合のみ追加
      if (!gameStatus.querySelector('.spy-warning')) {
        gameStatus.appendChild(spyWarning);
      }
    }
  }
}

/**
 * 人狼によるスパイ通報処理
 * 投票フェーズで使用される
 * @param {string} gameId - ゲームID
 * @param {string} reportedId - 通報されたプレイヤーID（スパイと疑われるプレイヤー）
 * @param {Function} updateFunction - Firebase更新関数
 * @param {Function} getFunction - Firebase取得関数
 * @param {Function} dbRef - Firebaseリファレンス関数
 */
async function reportAsWerewolf(gameId, reportedId, updateFunction, getFunction, dbRef) {
  try {
    // 通報対象が本当にスパイかチェック（変更点）
    const snapshot = await getFunction(dbRef(`games/${gameId}/players/${reportedId}`));
    const reportedPlayer = snapshot.val();
    
    if (!reportedPlayer) {
      notificationSystem.error('通報対象のプレイヤー情報が見つかりません');
      return;
    }
    
    const isSpy = reportedPlayer && reportedPlayer.role && reportedPlayer.role.name === 'スパイ';
    
    // 通報情報を保存
    await updateFunction(dbRef(`games/${gameId}`), {
      spy_report: {
        reporter: currentPlayer.id,
        reported: reportedId,
        is_correct: isSpy
      }
    });
    
    // UI更新
    const spyReportTargets = document.getElementById('spyReportTargets');
    if (spyReportTargets) {
      spyReportTargets.innerHTML = '<p>通報が完了しました。結果は処刑フェーズで発表されます。</p>';
    }
    
    // 通知表示
    notificationSystem.info(`${reportedPlayer.name}をスパイとして通報しました。結果は処刑フェーズで発表されます。`);
    
  } catch (error) {
    console.error('スパイ通報エラー:', error);
    notificationSystem.error('通報処理中にエラーが発生しました');
  }
}

// 関数のエクスポート
export { handleSpyAbility, showSpyToWerewolves, reportAsWerewolf };
