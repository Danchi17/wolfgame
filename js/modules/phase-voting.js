// js/modules/phase-voting.js
import { currentPlayer, nextPhase, getGameId } from './game-core.js';
import { notificationSystem } from '../ui.js';
import { db, ref, update, get } from '../firebase.js';
import { reportAsWerewolf } from './role-abilities/spy.js';

/**
 * 投票フェーズの処理
 * @param {Object} gameData - ゲームデータ
 */
export function handleVotingPhase(gameData) {
  const gameStatus = document.getElementById('gameStatus');
  const gameId = getGameId(gameData);
  
  // 既に投票済みかどうか
  const hasVoted = gameData.votes && gameData.votes[currentPlayer.id];
  
  // 投票権がないかどうか（やっかいな豚男が能力を使用した場合）
  const forcedVoteBy = gameData.forced_vote_by;
  const hasNoVotingRight = forcedVoteBy === currentPlayer.id;
  
  // 強制投票対象かどうか
  const forcedVoteTarget = gameData.forced_vote_target;
  const isForcedVoteTarget = forcedVoteTarget === currentPlayer.id;
  const forcedVoteTo = gameData.forced_vote_to;
  
  // 投票フェーズの表示内容
  let statusHtml = `
    <h3>投票フェーズ</h3>
    <p>人狼だと思うプレイヤーを投票で選びます。最も多く投票されたプレイヤーが処刑されます。</p>
  `;
  
  // 投票不可のパターンを処理
  if (hasVoted) {
    // 既に投票済みの場合
    const targetId = gameData.votes[currentPlayer.id].target;
    const targetName = gameData.players[targetId]?.name || '不明';
    
    statusHtml += `
      <div class="voting-info">
        <p>あなたは既に${targetName}に投票しています。</p>
        <p>他のプレイヤーの投票を待っています...</p>
      </div>
    `;
  } else if (hasNoVotingRight) {
    // 投票権がない場合（やっかいな豚男）
    statusHtml += `
      <div class="voting-info warning-info">
        <p>あなたはやっかいな豚男の能力を使用したため、投票権を失いました。</p>
        <p>他のプレイヤーの投票を待っています...</p>
      </div>
    `;
  } else {
    // 投票可能な場合
    let votingOptions = '';
    
    // 強制投票の場合
    if (isForcedVoteTarget && forcedVoteTo) {
      const targetName = gameData.players[forcedVoteTo]?.name || '不明';
      
      statusHtml += `
        <div class="voting-info warning-info">
          <p class="forced-vote-message">あなたの投票先は強制的に指定されています！</p>
          <p>${targetName}に投票します。</p>
        </div>
        <div class="voting-options">
          <button class="btn vote-btn forced" data-player-id="${forcedVoteTo}">
            ${targetName}に投票する（強制）
          </button>
        </div>
      `;
    } else {
      // 通常の投票
      // 投票対象オプション生成
      Object.entries(gameData.players).forEach(([id, player]) => {
        if (id !== currentPlayer.id) { // 自分以外のプレイヤー
          votingOptions += `
            <button class="btn vote-btn" data-player-id="${id}">
              ${player.name}に投票
            </button>
          `;
        }
      });
      
      statusHtml += `
        <div class="voting-info">
          <p>投票するプレイヤーを選んでください:</p>
        </div>
        <div class="voting-options">
          ${votingOptions}
        </div>
      `;
    }
  }
  
  // スパイの通報機能（人狼陣営プレイヤー向け）
  if (currentPlayer.data?.role?.team === 'werewolf' && 
      currentPlayer.data?.role?.name !== 'スパイ' &&
      currentPlayer.data?.role?.name !== '占い人狼' &&
      !hasVoted) {
    statusHtml += addSpyReportUI(gameData);
  }
  
  // ホストの場合、次のフェーズボタンを表示（全員投票済みの場合）
  const allVoted = checkAllVoted(gameData);
  if (currentPlayer.data?.isHost && allVoted) {
    statusHtml += `
      <div class="phase-control">
        <p>全員が投票を完了しました。</p>
        <button id="nextPhaseBtn" class="btn primary">結果発表フェーズへ進む</button>
      </div>
    `;
  } else if (allVoted) {
    statusHtml += `
      <div class="phase-control">
        <p>全員が投票を完了しました。結果発表を待っています...</p>
      </div>
    `;
  }
  
  // UI表示更新
  gameStatus.innerHTML = statusHtml;
  
  // 投票ボタンにイベントリスナーを追加
  if (!hasVoted && !hasNoVotingRight) {
    const voteButtons = document.querySelectorAll('.vote-btn');
    voteButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const targetId = button.dataset.playerId;
        await vote(gameId, targetId);
      });
    });
  }
  
  // スパイ通報ボタンにイベントリスナーを追加（人狼陣営プレイヤー向け）
  if (currentPlayer.data?.role?.team === 'werewolf' && 
      currentPlayer.data?.role?.name !== 'スパイ' &&
      currentPlayer.data?.role?.name !== '占い人狼') {
    const reportButtons = document.querySelectorAll('.report-btn');
    reportButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const targetId = button.dataset.playerId;
        // 第三引数以降はFirebase関数の参照
        await reportAsWerewolf(gameId, targetId, update, get, ref);
      });
    });
  }
  
  // ホストの場合、次のフェーズボタンにイベントリスナーを追加
  if (currentPlayer.data?.isHost && allVoted) {
    const nextPhaseBtn = document.getElementById('nextPhaseBtn');
    if (nextPhaseBtn) {
      nextPhaseBtn.addEventListener('click', async () => {
        try {
          // ボタンを無効化して複数回クリックを防止
          nextPhaseBtn.disabled = true;
          nextPhaseBtn.textContent = "処理中...";
          
          // 投票結果を処理
          await processVotingResults(gameId);
          
          // 明示的に状態をログに出力
          console.log("投票結果処理完了、resultフェーズへ移行します");
          notificationSystem.info("投票結果を計算しました。結果発表フェーズに移行します。");
          
          // 重要: 'voting'ではなく'result'を渡す
          await nextPhase(gameId, 'voting');
          
          // 直接移行に失敗した場合に備えて追加対応
          setTimeout(() => {
            // 3秒後にUIを更新
            const gameStatus = document.getElementById('gameStatus');
            if (gameStatus && gameStatus.innerHTML.includes('投票フェーズ')) {
              notificationSystem.warning("フェーズ移行に問題が発生した可能性があります。ページを更新してください。");
            }
          }, 3000);
        } catch (error) {
          console.error("投票フェーズ移行エラー:", error);
          notificationSystem.error("結果フェーズへの移行中にエラーが発生しました。");
          
          // ボタンを再度有効化
          nextPhaseBtn.disabled = false;
          nextPhaseBtn.textContent = "結果発表フェーズへ進む";
        }
      });
    }
  }
}

/**
 * 投票処理
 * @param {string} gameId - ゲームID
 * @param {string} targetId - 投票対象プレイヤーID
 */
async function vote(gameId, targetId) {
  try {
    // 村長の場合は2票
    const voteValue = currentPlayer.data?.role?.name === '村長' ? 2 : 1;
    
    // 投票情報を保存
    await update(ref(db, `games/${gameId}/votes/${currentPlayer.id}`), {
      target: targetId,
      value: voteValue
    });
    
    const targetName = (await get(ref(db, `games/${gameId}/players/${targetId}/name`))).val();
    
    // 通知
    notificationSystem.success(`${targetName}に投票しました。`, 5000);
    
    // UI更新
    const gameStatus = document.getElementById('gameStatus');
    gameStatus.innerHTML = `
      <h3>投票フェーズ</h3>
      <div class="voting-info">
        <p>あなたは${targetName}に投票しました。</p>
        <p>他のプレイヤーの投票を待っています...</p>
      </div>
    `;
    
  } catch (error) {
    console.error('投票エラー:', error);
    notificationSystem.error('投票に失敗しました');
  }
}

/**
 * 全員が投票済みかチェック
 * @param {Object} gameData - ゲームデータ
 * @returns {boolean} 全員投票済みならtrue
 */
function checkAllVoted(gameData) {
  const playerCount = Object.keys(gameData.players).length;
  let votesCount = 0;
  
  // 投票データがあるか確認
  if (!gameData.votes) return false;
  
  // 投票済みプレイヤー数をカウント
  votesCount = Object.keys(gameData.votes).length;
  
  // やっかいな豚男がいる場合、-1
  if (gameData.forced_vote_by) {
    return votesCount >= playerCount - 1;
  }
  
  return votesCount >= playerCount;
}

/**
 * スパイの通報UI追加（人狼陣営プレイヤー向け）
 * @param {Object} gameData - ゲームデータ
 * @returns {string} HTML文字列
 */
function addSpyReportUI(gameData) {
  // すべてのプレイヤーから自分以外を抽出（スパイかどうかは表示しない）
  const otherPlayers = Object.entries(gameData.players)
    .filter(([id, player]) => 
      id !== currentPlayer.id && 
      player.role && 
      player.role.team === 'village' // 市民陣営のみ表示
    )
    .map(([id, player]) => ({ id, name: player.name }));
  
  if (otherPlayers.length === 0) {
    return '';
  }
  
  // 通報対象オプション生成
  let reportOptions = '';
  otherPlayers.forEach(player => {
    reportOptions += `
      <button class="btn report-btn" data-player-id="${player.id}">
        ${player.name}をスパイとして通報
      </button>
    `;
  });
  
  return `
    <div id="spyReportTargets" class="spy-report">
      <h4>スパイ通報機能</h4>
      <p>あなたは人狼陣営です。スパイを見つけて通報できます。正解なら市民陣営の強制敗北となります。誤った通報をすると追加で2点減点されます。</p>
      <div class="spy-report-targets">
        ${reportOptions}
      </div>
    </div>
  `;
}

/**
 * 投票結果の処理
 * @param {string} gameId - ゲームID
 */
async function processVotingResults(gameId) {
  try {
    // ゲームデータを取得
    const snapshot = await get(ref(db, `games/${gameId}`));
    const gameData = snapshot.val();
    
    if (!gameData || !gameData.votes) {
      notificationSystem.error('投票データの取得に失敗しました');
      return;
    }
    
    // 投票集計
    const voteCounts = {};
    Object.entries(gameData.votes).forEach(([voterId, voteData]) => {
      const targetId = voteData.target;
      const voteValue = voteData.value || 1;
      
      if (!voteCounts[targetId]) {
        voteCounts[targetId] = 0;
      }
      
      voteCounts[targetId] += voteValue;
    });
    
    // 最多得票者を特定
    let maxVotes = 0;
    let executedPlayers = [];
    
    Object.entries(voteCounts).forEach(([playerId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        executedPlayers = [playerId];
      } else if (votes === maxVotes) {
        executedPlayers.push(playerId);
      }
    });
    
    // 特殊勝利条件チェック
    let specialVictory = null;
    
    // 蛇女の同数投票処刑時の単独勝利
    if (executedPlayers.length > 1) {
      const snakeWomanPlayer = executedPlayers.find(id => 
        gameData.players[id]?.role?.name === '蛇女'
      );
      
      if (snakeWomanPlayer) {
        specialVictory = 'snake_woman';
        executedPlayers = [snakeWomanPlayer];
      }
    }
    
    // 大熊処刑時の人狼陣営過半数による強制勝利
    const bigBearPlayer = executedPlayers.find(id => 
      gameData.players[id]?.role?.name === '大熊'
    );
    
    if (bigBearPlayer) {
      // 人狼陣営のプレイヤー数をカウント
      const werewolfCount = Object.values(gameData.players).filter(player => 
        player.role && player.role.team === 'werewolf' && player.role.name !== 'スパイ'
      ).length;
      
      const playerCount = Object.keys(gameData.players).length;
      
      if (werewolfCount > playerCount / 2) {
        specialVictory = 'big_bear';
      }
    }
    
    // スパイ通報の処理
    if (gameData.spy_report && gameData.spy_report.is_correct) {
      specialVictory = 'spy_reported';
    }
    
    // 博識な子犬の正解
    if (gameData.puppy_guessed_correct) {
      specialVictory = 'puppy_correct';
    }
    
    // 全員が同陣営で、全員が1票ずつ投票した場合の特殊勝利
    const allTeamOneVote = checkAllTeamOneVote(gameData);
    if (allTeamOneVote) {
      specialVictory = 'all_team_one_vote';
    }
    
    // 勝利チーム判定
    let winningTeam;
    
    if (specialVictory === 'snake_woman') {
      winningTeam = 'snake_woman'; // 蛇女の単独勝利
    } else if (specialVictory === 'big_bear' || specialVictory === 'puppy_correct') {
      winningTeam = 'werewolf'; // 人狼陣営勝利
    } else if (specialVictory === 'spy_reported') {
      winningTeam = 'werewolf'; // スパイ通報成功で人狼陣営勝利
    } else if (specialVictory === 'all_team_one_vote') {
      // 全員同陣営特殊勝利の場合はそのチームが勝利
      const firstPlayerId = Object.keys(gameData.players)[0];
      winningTeam = gameData.players[firstPlayerId]?.role?.team || 'village';
    } else {
      // 通常の勝利判定
      const anyWerewolfExecuted = executedPlayers.some(id => 
        gameData.players[id]?.role?.team === 'werewolf' && 
        gameData.players[id]?.role?.name !== 'スパイ'
      );
      
      winningTeam = anyWerewolfExecuted ? 'village' : 'werewolf';
    }
    
    // 結果をデータベースに保存
    await update(ref(db, `games/${gameId}`), {
      executed_players: executedPlayers,
      winning_team: winningTeam,
      special_victory: specialVictory
    });
    
    // 無法者の役職交換処理
    await handleOutlawExchanges(gameData, executedPlayers, winningTeam);
    
    console.log("投票処理が完了しました", {
      executed: executedPlayers.map(id => gameData.players[id]?.name || 'unknown'),
      winningTeam,
      specialVictory
    });
    
  } catch (error) {
    console.error('投票結果処理エラー:', error);
    notificationSystem.error('投票結果の処理に失敗しました');
    throw error; // エラーを再スローして呼び出し元で処理できるようにする
  }
}

/**
 * 無法者の役職交換処理
 * @param {Object} gameData - ゲームデータ
 * @param {Array} executedPlayers - 処刑されたプレイヤーID配列
 * @param {string} winningTeam - 勝利チーム
 */
async function handleOutlawExchanges(gameData, executedPlayers, winningTeam) {
  const gameId = getGameId(gameData);
  
  // 無法者プレイヤーを抽出
  const outlawPlayers = Object.entries(gameData.players)
    .filter(([id, player]) => 
      player.role && 
      player.role.name === '無法者' && 
      !executedPlayers.includes(id) && // 処刑されていない
      player.role.team !== winningTeam // 敗北している
    )
    .map(([id, player]) => id);
  
  if (outlawPlayers.length === 0) return; // 無法者がいない場合
  
  const outlawExchanges = {};
  
  // 各無法者について役職交換
  for (const outlawId of outlawPlayers) {
    // 交換対象を決定（ランダムに他プレイヤーを選択）
    const availableTargets = Object.keys(gameData.players)
      .filter(id => id !== outlawId && !executedPlayers.includes(id));
    
    if (availableTargets.length === 0) continue; // 交換対象がいない場合
    
    // ランダムに選択
    const targetId = availableTargets[Math.floor(Math.random() * availableTargets.length)];
    const targetPlayer = gameData.players[targetId];
    
    // 交換情報を記録
    outlawExchanges[outlawId] = {
      target_id: targetId,
      target_role: targetPlayer.role.name
    };
    
    // 実際の役職交換は行わず、結果フェーズで適用する
    if (!gameData.hidden_roles) {
      gameData.hidden_roles = {};
    }
    
    gameData.hidden_roles[outlawId] = targetPlayer.role;
    gameData.hidden_roles[targetId] = { name: '無法者', team: 'village', cost: 1, description: '無法者の説明' };
  }
  
  // 交換情報をデータベースに保存
  if (Object.keys(outlawExchanges).length > 0) {
    await update(ref(db, `games/${gameId}`), {
      outlaw_exchanges: outlawExchanges,
      hidden_roles: gameData.hidden_roles || {}
    });
  }
}

/**
 * 全員同陣営で1票ずつ投票の特殊勝利条件チェック
 * @param {Object} gameData - ゲームデータ
 * @returns {boolean} 条件を満たす場合true
 */
function checkAllTeamOneVote(gameData) {
  // 全員が同じ陣営か確認
  const firstPlayerId = Object.keys(gameData.players)[0];
  const firstTeam = gameData.players[firstPlayerId]?.role?.team;
  
  const allSameTeam = Object.values(gameData.players).every(player => 
    player.role && player.role.team === firstTeam
  );
  
  if (!allSameTeam) return false;
  
  // 全員が1票ずつ投票したか確認（村長を除く）
  const playerIds = Object.keys(gameData.players);
  
  // 各プレイヤーが1人だけに投票したか
  const votedCounts = {};
  playerIds.forEach(id => {
    votedCounts[id] = 0;
  });
  
  Object.entries(gameData.votes || {}).forEach(([voterId, voteData]) => {
    const targetId = voteData.target;
    const voteValue = voteData.value || 1;
    
    // 村長は2票の場合がある
    if (voteValue > 1) return false;
    
    votedCounts[targetId] += 1;
  });
  
  // 全員が1票ずつ受け取ったか
  return playerIds.every(id => votedCounts[id] === 1);
}