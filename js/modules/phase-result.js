// js/modules/phase-result.js
import { currentPlayer, getGameId } from './game-core.js';
import { updatePlayerPoints, resetGame } from './game-utils.js';

// 結果フェーズの処理
function handleResultPhase(gameData) {
  // 怪盗の役職交換を結果表示時に反映
  if (gameData.role_exchanges && gameData.hidden_roles) {
    const thiefId = gameData.role_exchanges.thief_id;
    const targetId = gameData.role_exchanges.target_id;
    
    if (gameData.hidden_roles[thiefId]) {
      gameData.players[thiefId].role = gameData.hidden_roles[thiefId];
    }
    
    if (gameData.hidden_roles[targetId]) {
      gameData.players[targetId].role = gameData.hidden_roles[targetId];
    }
  }

  // 無法者の役職交換も反映
  if (gameData.outlaw_exchanges && gameData.hidden_roles) {
    Object.entries(gameData.outlaw_exchanges).forEach(([outlawId, exchange]) => {
      const targetId = exchange.target_id;
      
      if (gameData.hidden_roles[outlawId]) {
        gameData.players[outlawId].role = gameData.hidden_roles[outlawId];
      }
      
      if (gameData.hidden_roles[targetId]) {
        gameData.players[targetId].role = gameData.hidden_roles[targetId];
      }
    });
  }
  
  // 役職交換後に持ち点の更新を行う
  updatePlayerPoints(gameData);
  
  // 勝敗結果表示
  const gameContainer = document.getElementById('gameStatus');
  
  const executedPlayers = gameData.executed_players || [];
  const executedNames = executedPlayers.map(id => gameData.players[id]?.name || '不明').join('、');
  
  // 投票集計を計算
  const voteSummary = {};
  if (gameData.votes) {
    Object.entries(gameData.votes).forEach(([voterId, voteData]) => {
      const targetId = voteData.target;
      const voteValue = voteData.value || 1;
      
      if (!voteSummary[targetId]) {
        voteSummary[targetId] = {
          name: gameData.players[targetId]?.name || '不明',
          count: 0
        };
      }
      
      voteSummary[targetId].count += voteValue;
    });
  }
  
  // 投票情報の整理（個別の投票内容）
  let voteInfo = '<h4>投票結果:</h4>';
  
  // 合計票数を表示（新規追加）
  voteInfo += '<div class="vote-summary">';
  voteInfo += '<h5>合計投票数:</h5>';
  voteInfo += '<ul>';
  Object.entries(voteSummary).sort((a, b) => b[1].count - a[1].count).forEach(([targetId, summary]) => {
    voteInfo += `<li>${summary.name}: <strong>${summary.count}票</strong></li>`;
  });
  voteInfo += '</ul>';
  voteInfo += '</div>';
  
  // 個別投票内容
  voteInfo += '<h5>個別投票:</h5><ul>';
  if (gameData.votes) {
    Object.entries(gameData.votes).forEach(([voterId, voteData]) => {
      const voterName = gameData.players[voterId]?.name || '不明';
      const targetName = gameData.players[voteData.target]?.name || '不明';
      const voteValue = voteData.value || 1;
      voteInfo += `<li>${voterName} → ${targetName} (${voteValue}票)</li>`;
    });
  }
  voteInfo += '</ul>';
  
  // 役職交換情報の表示
  let exchangeInfo = '';

  // 怪盗の役職交換情報
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

  // 無法者の役職交換情報
  if (gameData.outlaw_exchanges) {
    exchangeInfo += `<div class="outlaw-exchange-info"><h4>無法者の役職交換:</h4><ul>`;
    
    Object.entries(gameData.outlaw_exchanges).forEach(([outlawId, exchange]) => {
      const outlawName = gameData.players[outlawId]?.name || '不明';
      const targetName = gameData.players[exchange.target_id]?.name || '不明';
      
      exchangeInfo += `
        <li>無法者 ${outlawName} が ${targetName} と役職を交換しました。
        (${outlawName}:「無法者」→「${exchange.target_role}」, ${targetName}:「${exchange.target_role}」→「無法者」)</li>
      `;
    });
    
    exchangeInfo += `</ul></div>`;
  }
  
  // 特殊勝利情報
  let specialVictoryInfo = '';
  if (gameData.special_victory) {
    switch (gameData.special_victory) {
      case 'snake_woman':
        specialVictoryInfo = '<p class="special-victory">蛇女の同数投票による単独勝利！</p>';
        break;
      case 'big_bear':
        specialVictoryInfo = '<p class="special-victory">大熊処刑時の人狼陣営過半数による強制勝利！</p>';
        break;
      case 'spy_reported':
        const spyName = gameData.players[gameData.spy_report.reporter]?.name || '不明';
        const reportedName = gameData.players[gameData.spy_report.reported]?.name || '不明';
        specialVictoryInfo = `<p class="special-victory">スパイ(${reportedName})が人狼(${spyName})に通報されました！市民陣営強制敗北！</p>`;
        break;
      case 'puppy_correct':
        // 推測した博識な子犬を特定
        const puppyId = Object.keys(gameData.players).find(id => {
          const player = gameData.players[id];
          return player.role && player.role.name === '博識な子犬';
        });
        const puppyName = gameData.players[puppyId]?.name || '不明';
        specialVictoryInfo = `<p class="special-victory">博識な子犬(${puppyName})が正しく役職を推測しました！人狼陣営勝利！</p>`;
        break;
      case 'all_team_one_vote':
        specialVictoryInfo = '<p class="special-victory">全員同陣営による全員1票ずつの投票による特殊勝利！</p>';
        break;
    }
  }
  
  // スパイ通報失敗情報
  let spyReportFailInfo = '';
  if (gameData.spy_report && !gameData.spy_report.is_correct) {
    const spyName = gameData.players[gameData.spy_report.reporter]?.name || '不明';
    const reportedName = gameData.players[gameData.spy_report.reported]?.name || '不明';
    spyReportFailInfo = `<p class="spy-report-fail">人狼(${spyName})は誤って${reportedName}をスパイと通報しました。通報者の持ち点が追加で2点減少します。</p>`;
  }
  
  gameContainer.innerHTML = `
    <h3>ゲーム結果</h3>
    ${executedPlayers.length > 0 ? `<p>処刑されたプレイヤー: ${executedNames}</p>` : '<p>処刑されたプレイヤーはいません。</p>'}
    ${specialVictoryInfo}
    <p class="result-text">${gameData.winning_team === 'village' ? '市民陣営' : 
                             gameData.winning_team === 'snake_woman' ? '蛇女の単独' : '人狼陣営'}の勝利です！</p>
    
    ${spyReportFailInfo}
    
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
    
    <div class="field-cards-reveal">
      <h4>場札:</h4>
      <ul>
        ${(gameData.field_cards || []).map((card, index) => {
          return `<li>場札${index + 1}: ${card.name} (${card.team === 'village' ? '市民陣営' : '人狼陣営'})</li>`;
        }).join('')}
      </ul>
    </div>
    
    <div class="points-info">
      <h4>ポイント状況:</h4>
      <ul>
        ${Object.entries(gameData.players).map(([id, player]) => {
          return `<li>${player.name}: ${player.points}点</li>`;
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
}

export { handleResultPhase };