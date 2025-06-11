// js/modules/game-history.js
import { db, ref, push, update, get, auth } from '../firebase.js';
import { notificationSystem } from '../ui.js';

/**
 * ゲーム履歴管理モジュール
 * プレイヤーのゲーム履歴と統計を管理
 */
const GameHistory = {
  /**
   * ゲーム結果を記録
   * @param {Object} gameData - ゲームデータ
   * @param {string} gameId - ゲームID
   */
  async recordGameResult(gameData, gameId) {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const playerData = gameData.players[userId];
      if (!playerData) return;

      // ゲーム履歴データの構造
      const historyData = {
        gameId: gameId,
        timestamp: Date.now(),
        playerName: playerData.name,
        role: playerData.role?.name || '不明',
        team: playerData.role?.team || 'unknown',
        isWinner: this.isPlayerWinner(playerData, gameData.winning_team),
        pointsChange: this.calculatePointsChange(playerData, gameData),
        finalPoints: playerData.points,
        playerCount: Object.keys(gameData.players).length,
        winningTeam: gameData.winning_team,
        specialVictory: gameData.special_victory || null
      };

      // 履歴を保存
      await push(ref(db, `users/${userId}/gameHistory`), historyData);

      // 統計を更新
      await this.updateStatistics(userId, historyData);

    } catch (error) {
      console.error('ゲーム履歴の記録エラー:', error);
    }
  },

  /**
   * プレイヤーが勝者かどうかを判定
   */
  isPlayerWinner(playerData, winningTeam) {
    // 特殊勝利の場合
    if (winningTeam === 'snake_woman') {
      return playerData.role?.name === '蛇女';
    }
    
    // 通常の勝利判定
    return playerData.role?.team === winningTeam;
  },

  /**
   * ポイントの変化を計算
   */
  calculatePointsChange(playerData, gameData) {
    const isWinner = this.isPlayerWinner(playerData, gameData.winning_team);
    
    if (isWinner) {
      return 0; // 勝者はポイントを失わない
    } else {
      let pointLoss = playerData.role?.cost || 0;
      
      // スパイ誤通報のペナルティ
      if (gameData.spy_report && 
          !gameData.spy_report.is_correct && 
          gameData.spy_report.reporter === auth.currentUser?.uid) {
        pointLoss += 2;
      }
      
      return -pointLoss;
    }
  },

  /**
   * 統計情報を更新
   */
  async updateStatistics(userId, historyData) {
    try {
      const statsRef = ref(db, `users/${userId}/statistics`);
      const snapshot = await get(statsRef);
      const currentStats = snapshot.val() || {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPointsGained: 0,
        totalPointsLost: 0,
        favoriteRole: {},
        roleWinRate: {}
      };

      // 基本統計の更新
      currentStats.totalGames++;
      if (historyData.isWinner) {
        currentStats.wins++;
      } else {
        currentStats.losses++;
      }
      currentStats.winRate = Math.round((currentStats.wins / currentStats.totalGames) * 100);

      // ポイント統計
      if (historyData.pointsChange > 0) {
        currentStats.totalPointsGained += historyData.pointsChange;
      } else {
        currentStats.totalPointsLost += Math.abs(historyData.pointsChange);
      }

      // 役職別統計
      const role = historyData.role;
      if (!currentStats.favoriteRole[role]) {
        currentStats.favoriteRole[role] = 0;
      }
      currentStats.favoriteRole[role]++;

      if (!currentStats.roleWinRate[role]) {
        currentStats.roleWinRate[role] = { wins: 0, games: 0 };
      }
      currentStats.roleWinRate[role].games++;
      if (historyData.isWinner) {
        currentStats.roleWinRate[role].wins++;
      }

      // 統計を保存
      await update(statsRef, currentStats);

    } catch (error) {
      console.error('統計更新エラー:', error);
    }
  },

  /**
   * プレイヤーの統計情報を取得
   */
  async getPlayerStatistics() {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return null;

      const snapshot = await get(ref(db, `users/${userId}/statistics`));
      return snapshot.val();
    } catch (error) {
      console.error('統計取得エラー:', error);
      return null;
    }
  },

  /**
   * プレイヤーのゲーム履歴を取得
   */
  async getGameHistory(limit = 10) {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return [];

      const snapshot = await get(ref(db, `users/${userId}/gameHistory`));
      const history = snapshot.val() || {};

      // オブジェクトを配列に変換し、新しい順にソート
      const historyArray = Object.entries(history)
        .map(([key, value]) => ({ id: key, ...value }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      return historyArray;
    } catch (error) {
      console.error('履歴取得エラー:', error);
      return [];
    }
  },

  /**
   * 統計画面を表示
   */
  async showStatisticsModal() {
    const stats = await this.getPlayerStatistics();
    const history = await this.getGameHistory(5);

    if (!stats) {
      notificationSystem.info('まだゲームをプレイしていません');
      return;
    }

    // 最も使用した役職を計算
    const favoriteRole = Object.entries(stats.favoriteRole || {})
      .sort((a, b) => b[1] - a[1])[0];

    // モーダルのHTML
    const modalHtml = `
      <div class="statistics-modal">
        <h2>プレイヤー統計</h2>
        
        <div class="stats-grid">
          <div class="stat-card">
            <h3>総ゲーム数</h3>
            <p class="stat-value">${stats.totalGames}</p>
          </div>
          
          <div class="stat-card">
            <h3>勝率</h3>
            <p class="stat-value">${stats.winRate}%</p>
            <p class="stat-detail">${stats.wins}勝 ${stats.losses}敗</p>
          </div>
          
          <div class="stat-card">
            <h3>獲得/喪失ポイント</h3>
            <p class="stat-value">+${stats.totalPointsGained} / -${stats.totalPointsLost}</p>
          </div>
          
          <div class="stat-card">
            <h3>最も使用した役職</h3>
            <p class="stat-value">${favoriteRole ? favoriteRole[0] : '---'}</p>
            <p class="stat-detail">${favoriteRole ? favoriteRole[1] + '回' : ''}</p>
          </div>
        </div>
        
        <div class="recent-games">
          <h3>最近のゲーム</h3>
          <div class="game-history-list">
            ${history.map(game => `
              <div class="history-item ${game.isWinner ? 'win' : 'loss'}">
                <span class="role">${game.role}</span>
                <span class="result">${game.isWinner ? '勝利' : '敗北'}</span>
                <span class="points">${game.pointsChange > 0 ? '+' : ''}${game.pointsChange}pt</span>
                <span class="date">${new Date(game.timestamp).toLocaleDateString('ja-JP')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // infoPanel が利用可能か確認
    if (window.infoPanel) {
      window.infoPanel.show(modalHtml, {
        title: 'ゲーム統計',
        width: 600,
        showClose: true
      });
    } else {
      // 簡易的なモーダル表示
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <button class="modal-close" onclick="this.parentElement.parentElement.remove()">×</button>
          ${modalHtml}
        </div>
      `;
      document.body.appendChild(modal);
    }
  }
};

export default GameHistory;
