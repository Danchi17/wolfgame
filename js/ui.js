// js/ui.js
// UIコンポーネントを管理するモジュール

// メッセージ通知システム（ポップアップ代替）
export const notificationSystem = {
  container: null,
  
  // 初期化
  init() {
    // 既存のコンテナがあれば削除
    const existingContainer = document.getElementById('notification-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    // 新しいコンテナを作成
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.style.position = 'fixed';
    this.container.style.top = '10px';
    this.container.style.right = '10px';
    this.container.style.width = '300px';
    this.container.style.maxHeight = '90vh';
    this.container.style.overflowY = 'auto';
    this.container.style.zIndex = '1000';
    document.body.appendChild(this.container);
  },
  
  // 通知を表示
  show(message, type = 'info', duration = 5000) {
    if (!this.container) {
      this.init();
    }
    
    // メッセージアイテムを作成
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.margin = '5px';
    notification.style.padding = '10px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    
    // タイプによって背景色を変更
    switch (type) {
      case 'success':
        notification.style.backgroundColor = '#d4edda';
        notification.style.borderLeft = '5px solid #28a745';
        break;
      case 'error':
        notification.style.backgroundColor = '#f8d7da';
        notification.style.borderLeft = '5px solid #dc3545';
        break;
      case 'warning':
        notification.style.backgroundColor = '#fff3cd';
        notification.style.borderLeft = '5px solid #ffc107';
        break;
      default:
        notification.style.backgroundColor = '#e3f2fd';
        notification.style.borderLeft = '5px solid #007bff';
    }
    
    // 閉じるボタン
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.float = 'right';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#666';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    };
    
    // メッセージとボタンを追加
    notification.appendChild(closeBtn);
    notification.appendChild(document.createTextNode(message));
    
    // コンテナに通知を追加
    this.container.appendChild(notification);
    
    // フェードイン
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // 自動的に消える
    if (duration > 0) {
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, duration);
    }
    
    return notification;
  },
  
  // 情報通知
  info(message, duration = 5000) {
    return this.show(message, 'info', duration);
  },
  
  // 成功通知
  success(message, duration = 5000) {
    return this.show(message, 'success', duration);
  },
  
  // 警告通知
  warning(message, duration = 5000) {
    return this.show(message, 'warning', duration);
  },
  
  // エラー通知
  error(message, duration = 5000) {
    return this.show(message, 'error', duration);
  }
};

// インフォメーションパネル（役職情報表示用）
export const infoPanel = {
  panel: null,
  
  // 初期化
  init() {
    // 既存のパネルがあれば削除
    const existingPanel = document.getElementById('info-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
    
    // 新しいパネルを作成
    this.panel = document.createElement('div');
    this.panel.id = 'info-panel';
    this.panel.style.position = 'fixed';
    this.panel.style.left = '50%';
    this.panel.style.top = '50%';
    this.panel.style.transform = 'translate(-50%, -50%)';
    this.panel.style.backgroundColor = 'white';
    this.panel.style.padding = '20px';
    this.panel.style.borderRadius = '5px';
    this.panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    this.panel.style.maxWidth = '80%';
    this.panel.style.maxHeight = '80vh';
    this.panel.style.overflowY = 'auto';
    this.panel.style.zIndex = '2000';
    this.panel.style.display = 'none';
    
    // 閉じるボタン
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '閉じる';
    closeBtn.className = 'btn primary';
    closeBtn.style.marginTop = '15px';
    closeBtn.onclick = () => this.hide();
    
    this.contentArea = document.createElement('div');
    this.panel.appendChild(this.contentArea);
    this.panel.appendChild(closeBtn);
    
    document.body.appendChild(this.panel);
  },
  
  // パネルを表示
  show(content, title = '') {
    if (!this.panel) {
      this.init();
    }
    
    // コンテンツをセット
    this.contentArea.innerHTML = '';
    
    if (title) {
      const titleElement = document.createElement('h3');
      titleElement.textContent = title;
      titleElement.style.marginTop = '0';
      titleElement.style.marginBottom = '15px';
      this.contentArea.appendChild(titleElement);
    }
    
    if (typeof content === 'string') {
      const contentElement = document.createElement('div');
      contentElement.innerHTML = content;
      this.contentArea.appendChild(contentElement);
    } else {
      this.contentArea.appendChild(content);
    }
    
    // パネルを表示
    this.panel.style.display = 'block';
  },
  
  // パネルを非表示
  hide() {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
  }
};

// タイマー管理クラス
export class GameTimer {
  constructor() {
    this.timers = {
      phase: null,  // 夜フェーズなどのフェーズ用タイマー
      discussion: null, // 議論用タイマー
      other: null   // その他のタイマー用
    };
  }

  // フェーズタイマーの開始
  startPhaseTimer(seconds, timerDisplay, callback) {
    // 既存のタイマーをクリア
    this.stopPhaseTimer();
    
    let remainingTime = seconds;
    
    this.timers.phase = setInterval(() => {
      remainingTime--;
      
      if (timerDisplay) {
        timerDisplay.textContent = `残り時間: ${remainingTime}秒`;
      }
      
      if (remainingTime <= 0) {
        this.stopPhaseTimer();
        if (callback) callback();
      }
    }, 1000);
    
    return this.timers.phase;
  }
  
  // 議論タイマーの開始
  startDiscussionTimer(seconds, callback) {
    // 既存のタイマーをクリア
    this.stopDiscussionTimer();
    
    const timerDisplay = document.getElementById('timerDisplay');
    if (!timerDisplay) return null;
    
    let remainingTime = seconds;
    
    this.timers.discussion = setInterval(() => {
      remainingTime--;
      
      // 時間表示の更新
      const minutes = Math.floor(remainingTime / 60);
      const secs = remainingTime % 60;
      timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
      
      if (remainingTime <= 0) {
        this.stopDiscussionTimer();
        if (callback) callback();
      }
    }, 1000);
    
    return this.timers.discussion;
  }
  
  // 各種タイマーの停止関数
  stopPhaseTimer() {
    if (this.timers.phase) {
      clearInterval(this.timers.phase);
      this.timers.phase = null;
    }
  }
  
  stopDiscussionTimer() {
    if (this.timers.discussion) {
      clearInterval(this.timers.discussion);
      this.timers.discussion = null;
    }
  }
  
  // 全てのタイマーを停止
  stopAllTimers() {
    this.stopPhaseTimer();
    this.stopDiscussionTimer();
    
    if (this.timers.other) {
      clearInterval(this.timers.other);
      this.timers.other = null;
    }
  }
}

// ゲームUIの表示を更新
export function updateGameBoard(gameData, currentPlayer) {
  // 場札の表示更新
  const fieldCards = document.querySelectorAll('.field-card');
  
  // ゲーム状態に応じて場札を表示
  if (gameData.status !== 'waiting' && gameData.field_cards && gameData.field_cards.length === 2) {
    // 役職によって場札の見え方を変える（占い師は場札を見られる）
    const canSeeFieldCards = 
      currentPlayer.data.role && 
      (currentPlayer.data.role.name === '占い師' || currentPlayer.data.role.name === '占い人狼');
      
    if (canSeeFieldCards) {
      fieldCards[0].textContent = gameData.field_cards[0].name;
      fieldCards[1].textContent = gameData.field_cards[1].name;
    } else {
      fieldCards[0].textContent = '?';
      fieldCards[1].textContent = '?';
    }
  } else {
    fieldCards[0].textContent = '?';
    fieldCards[1].textContent = '?';
  }
}

// バージョン情報を表示
export function showVersionInfo() {
  const versionElement = document.createElement('div');
  versionElement.className = 'version-info';
  versionElement.textContent = 'v0.2.0 (2025/03/15)';
  versionElement.style.position = 'fixed';
  versionElement.style.bottom = '5px';
  versionElement.style.right = '5px';
  versionElement.style.fontSize = '10px';
  versionElement.style.color = '#999';
  document.body.appendChild(versionElement);
}