// js/modules/role-abilities/werewolf.js
import { currentPlayer, nextPhase, getGameId } from '../game-core.js';
import { notificationSystem } from '../../ui.js';
import { db, ref, update, get } from '../../firebase.js';

/**
 * 人狼の能力処理
 * @param {Object} gameData - ゲームデータ
 */
export function handleWerewolfAbility(gameData) {
  const gameStatus = document.getElementById('gameStatus');
  const gameId = getGameId(gameData);
  
  // 人狼陣営かどうか確認（"占い人狼"は除外、個別に確認処理が必要）
  const isWerewolf = currentPlayer.data?.role?.team === 'werewolf' && currentPlayer.data?.role?.name !== '占い人狼';
  
  // ゲーム状態表示の基本情報
  let statusHtml = `
    <h3>夜フェーズ - 人狼の確認</h3>
    <p>人狼陣営のプレイヤーはお互いを確認します。</p>
  `;
  
  if (isWerewolf) {
    // 他の人狼プレイヤーを取得
    const otherWerewolves = Object.entries(gameData.players)
      .filter(([id, player]) => 
        id !== currentPlayer.id && 
        player.role && 
        player.role.team === 'werewolf' &&
        player.role.name !== '占い人狼' && // 占い人狼は他の人狼と確認し合えない
        player.role.name !== 'スパイ' // スパイは通常の人狼と確認し合えない
      )
      .map(([id, player]) => ({
        id,
        name: player.name,
        role: player.role.name
      }));
    
    if (otherWerewolves.length > 0) {
      // 他の人狼がいる場合
      statusHtml += `
        <div class="werewolf-info">
          <h4>人狼陣営の仲間</h4>
          <ul>
            ${otherWerewolves.map(wolf => `<li>${wolf.name} [役職: ${wolf.role}]</li>`).join('')}
          </ul>
        </div>
      `;
      
      // 通知
      const werewolfInfo = otherWerewolves.map(wolf => `${wolf.name} [役職: ${wolf.role}]`).join('\n');
      notificationSystem.info(`【人狼情報】人狼陣営の仲間:\n${werewolfInfo}`, 10000);
    } else {
      // 他の人狼がいない場合
      statusHtml += `
        <div class="werewolf-info">
          <h4>人狼陣営の仲間</h4>
          <p>他の人狼陣営のプレイヤーはいません。場札に人狼陣営がある可能性があります。</p>
        </div>
      `;
      
      notificationSystem.info('【人狼情報】他の人狼陣営のプレイヤーはいません。場札に人狼陣営がある可能性があります。', 10000);
    }
    
    // スパイの存在をチェック（誰かはわからない）
    const spyExists = Object.values(gameData.players).some(player => 
      player.role && player.role.name === 'スパイ' && player.id !== currentPlayer.id
    );
    
    if (spyExists) {
      statusHtml += `
        <div class="spy-warning">
          <h4>注意: スパイの存在</h4>
          <p>市民陣営プレイヤーの中にスパイがいる可能性があります。投票フェーズでスパイを見つけて通報できます。</p>
        </div>
      `;
      
      notificationSystem.warning('【注意】市民陣営の中にスパイがいる可能性があります。投票フェーズでスパイを通報できます。', 10000);
    }
    
    // やっかいな豚男の能力
    if (currentPlayer.data.role.name === 'やっかいな豚男') {
      addTroublesomePigAbility(gameData, statusHtml);
      return; // 別途処理するので関数を終了
    }
    
    // 能力の有無に関わらず次のフェーズに進むボタン
    statusHtml += `
      <button id="nextPhaseBtn" class="btn action-btn">次のフェーズへ</button>
    `;
  } else if (currentPlayer.data?.role?.name === '占い人狼') {
    // 占い人狼の場合（特殊処理）
    statusHtml += `
      <div class="werewolf-info">
        <h4>占い人狼情報</h4>
        <p>あなたは占い人狼です。他の人狼とは互いを確認できません。占い師の能力で他のプレイヤーを確認してください。</p>
      </div>
      <button id="nextPhaseBtn" class="btn action-btn">次のフェーズへ</button>
    `;
    
    notificationSystem.info('【占い人狼情報】あなたは占い人狼です。他の人狼とは互いを確認できません。', 8000);
  } else {
    // 人狼陣営でない場合は待機メッセージ
    statusHtml += `
      <p>あなたは人狼陣営ではありません。他のプレイヤーのアクションを待っています...</p>
      <p>役職：${currentPlayer.data?.role?.name || '不明'}</p>
    `;
    
    // 30秒後に自動で次のフェーズへ（実際のゲームではホストが管理）
    setTimeout(() => {
      nextPhase(gameId, 'werewolf');
    }, 30000);
  }
  
  // UI表示更新
  gameStatus.innerHTML = statusHtml;
  
  // ボタンにイベントリスナーを追加
  if (isWerewolf || currentPlayer.data?.role?.name === '占い人狼') {
    const nextPhaseBtn = document.getElementById('nextPhaseBtn');
    if (nextPhaseBtn) {
      nextPhaseBtn.addEventListener('click', () => {
        nextPhase(gameId, 'werewolf');
      });
    }
  }
}

/**
 * やっかいな豚男の能力処理
 * @param {Object} gameData - ゲームデータ
 * @param {string} baseHtml - 基本HTML
 */
function addTroublesomePigAbility(gameData, baseHtml) {
  const gameStatus = document.getElementById('gameStatus');
  const gameId = getGameId(gameData);
  
  // プレイヤー選択用HTML
  let playerOptions = '';
  Object.entries(gameData.players).forEach(([id, player]) => {
    if (id !== currentPlayer.id) { // 自分以外のプレイヤー
      playerOptions += `
        <button class="btn player-target" data-player-id="${id}" data-player-name="${player.name}">
          ${player.name}を選択
        </button>
      `;
    }
  });
  
  // 能力説明と選択肢を表示
  const abilityHtml = `
    ${baseHtml}
    <div class="pig-ability">
      <h4>投票先強制指定能力</h4>
      <p>あなたはやっかいな豚男です。他のプレイヤーの投票先を強制指定できますが、自身は投票権を失います。</p>
      <p>誰の投票先を指定しますか？</p>
      <div class="action-targets">
        <div class="player-targets">${playerOptions}</div>
      </div>
      <button id="skipAbilityBtn" class="btn secondary">能力を使用しない</button>
    </div>
  `;
  
  gameStatus.innerHTML = abilityHtml;
  
  // プレイヤー選択ボタンのイベント
  const playerButtons = document.querySelectorAll('.player-target');
  playerButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.playerId;
      const targetName = button.dataset.playerName;
      
      // 投票先指定対象の選択後、投票先選択画面を表示
      showVoteTargetOptions(gameData, targetId, targetName);
    });
  });
  
  // 能力スキップボタンのイベント
  const skipButton = document.getElementById('skipAbilityBtn');
  skipButton.addEventListener('click', () => {
    notificationSystem.info('やっかいな豚男の能力を使用せず、次のフェーズに進みます。');
    nextPhase(gameId, 'werewolf');
  });
}

/**
 * 投票先選択画面を表示
 * @param {Object} gameData - ゲームデータ
 * @param {string} targetId - 対象プレイヤーID
 * @param {string} targetName - 対象プレイヤー名
 */
function showVoteTargetOptions(gameData, targetId, targetName) {
  const gameStatus = document.getElementById('gameStatus');
  const gameId = getGameId(gameData);
  
  // 投票先プレイヤー選択肢
  let voteTargetOptions = '';
  Object.entries(gameData.players).forEach(([id, player]) => {
    if (id !== targetId) { // 投票対象自身以外
      voteTargetOptions += `
        <button class="btn vote-target" data-vote-id="${id}" data-vote-name="${player.name}">
          ${player.name}
        </button>
      `;
    }
  });
  
  // 投票先選択画面
  gameStatus.innerHTML = `
    <h3>投票先強制指定</h3>
    <p>${targetName}の投票先を指定します。誰に投票させますか？</p>
    <div class="vote-options">
      ${voteTargetOptions}
    </div>
    <button id="backBtn" class="btn secondary">戻る</button>
  `;
  
  // 投票先ボタンのイベント
  const voteButtons = document.querySelectorAll('.vote-target');
  voteButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const voteId = button.dataset.voteId;
      const voteName = button.dataset.voteName;
      
      try {
        // 強制投票情報をデータベースに保存
        await update(ref(db, `games/${gameId}`), {
          forced_vote_target: targetId,
          forced_vote_by: currentPlayer.id,
          forced_vote_to: voteId
        });
        
        notificationSystem.success(`${targetName}の投票先を${voteName}に強制指定しました。あなたは投票権を失います。`, 8000);
        
        // 次のフェーズへ
        gameStatus.innerHTML = `
          <h3>投票先強制指定完了</h3>
          <p>${targetName}の投票先を${voteName}に強制指定しました。</p>
          <p>あなたは投票権を失います。</p>
          <p>次のフェーズに進みます...</p>
        `;
        
        setTimeout(() => {
          nextPhase(gameId, 'werewolf');
        }, 3000);
      } catch (error) {
        console.error('投票先指定エラー:', error);
        notificationSystem.error('投票先の指定に失敗しました');
      }
    });
  });
  
  // 戻るボタンのイベント
  const backBtn = document.getElementById('backBtn');
  backBtn.addEventListener('click', () => {
    // 人狼能力画面を再表示
    handleWerewolfAbility(gameData);
  });
}