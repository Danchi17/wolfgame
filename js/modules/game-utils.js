// js/modules/game-utils.js
import { ref, update } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-database.js';
import { db } from '../firebase.js';
import { notificationSystem } from './ui-components.js';
import { showHomeScreen } from '../app.js';

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
    // プレイヤーの役職を取得（既に交換後の役職になっている）
    const playerRole = player.role;
    if (!playerRole) return;
    
    // 蛇女特殊勝利の場合
    if (winningTeam === 'snake_woman') {
      // 蛇女以外の全員が敗北
      if (playerRole.name !== '蛇女') {
        const newPoints = player.points - playerRole.cost;
        updates[`players/${id}/points`] = newPoints;
      }
    } 
    // 全員同陣営特殊勝利の場合は点数を減らさない
    else if (winningTeam === 'all_team_one_vote') {
      // 点数変更なし
    }
    // 通常の勝敗
    else if (playerRole.team !== winningTeam) {
      const newPoints = player.points - playerRole.cost;
      updates[`players/${id}/points`] = newPoints;
    }
  });
  
  // スパイ通報失敗の場合、追加で2点減少
  if (gameData.spy_report && !gameData.spy_report.is_correct) {
    const spyId = gameData.spy_report.reporter;
    const spyPlayer = gameData.players[spyId];
    const currentPoints = updates[`players/${spyId}/points`] !== undefined ? 
      updates[`players/${spyId}/points`] : spyPlayer.points;
    updates[`players/${spyId}/points`] = currentPoints - 2;
  }
  
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
  
  if (!gameId) {
    console.error('リセット処理エラー: ゲームIDが未定義です');
    notificationSystem.error('ゲームIDが見つかりませんでした。ページを再読み込みしてください。');
    return;
  }
  
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
    resetData.votes = null; // nullを使用して確実に削除
    resetData.vote_counts = null; // 投票集計データも確実に削除
    resetData.executed_players = null;
    resetData.winning_team = null;
    resetData.points_updated = false;
    resetData.role_exchanges = null;
    resetData.outlaw_exchanges = null;
    resetData.forced_vote_target = null;
    resetData.forced_vote_by = null;
    resetData.forced_vote_to = null; // 追加：投票先の強制指定も削除
    resetData.spy_report = null;
    resetData.puppy_guessed = null;
    resetData.puppy_guessed_correct = null;
    resetData.special_victory = null;
    resetData.hidden_roles = null;
    
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
        notificationSystem.success('ゲーム状態のリセットが完了しました');
      })
      .catch(error => {
        console.error('リセットエラー:', error);
        notificationSystem.error('次のゲームへの移行に失敗しました。ページを再読み込みしてください。');
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

// グローバル参照用（リファクタリング中の一時的な対応）
let currentGame = null;

// モジュール初期化関数
function initGameUtils(gameInstance) {
  currentGame = gameInstance;
}

// ゲームIDを取得する関数
function getGameId(gameData) {
  // gameDataに追加されたgameIdプロパティを使用
  if (gameData && gameData.gameId) {
    return gameData.gameId;
  }
  
  console.error('gameDataにgameIdがありません', gameData);
  return null; // IDが見つからない場合
}

export { updatePlayerPoints, resetGame, showGameOver, initGameUtils, getGameId };