// js/modules/ui-components.js

/**
 * 通知システム
 * アプリケーション全体で使用する通知表示機能
 */
export const notificationSystem = {
  /**
   * 通知コンテナ要素
   */
  container: null,
  
  /**
   * 通知リスト
   */
  notifications: [],
  
  /**
   * 通知IDカウンター
   */
  idCounter: 0,
  
  /**
   * 初期化
   */
  init() {
    // 既存のコンテナを削除
    this.removeContainer();
    
    // 通知コンテナを作成
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    document.body.appendChild(this.container);
  },
  
  /**
   * 通知コンテナを削除
   */
  removeContainer() {
    const existingContainer = document.getElementById('notification-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    this.container = null;
  },
  
  /**
   * 通知を表示
   * @param {string} message - 通知内容
   * @param {string} type - 通知タイプ（info, success, warning, error）
   * @param {number} duration - 表示時間（ミリ秒）、0の場合は自動非表示しない
   * @returns {number} 通知ID
   */
  show(message, type = 'info', duration = 5000) {
    if (!this.container) {
      this.init();
    }
    
    // 通知要素を作成
    const id = ++this.idCounter;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-message">${message}</div>
        <button class="notification-close" aria-label="閉じる">✕</button>
      </div>
    `;
    
    // 閉じるボタンにイベントを追加
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
      this.hide(id);
    });
    
    // コンテナに追加
    this.container.appendChild(notification);
    
    // 通知情報を保存
    this.notifications.push({
      id,
      element: notification,
      timeout: duration > 0 ? setTimeout(() => this.hide(id), duration) : null
    });
    
    // 表示アニメーション
    setTimeout(() => {
      notification.classList.add('visible');
    }, 10);
    
    return id;
  },
  
  /**
   * 通知を非表示
   * @param {number} id - 通知ID
   */
  hide(id) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return;
    
    const notification = this.notifications[index];
    
    // タイムアウトをクリア
    if (notification.timeout) {
      clearTimeout(notification.timeout);
    }
    
    // 非表示アニメーション
    notification.element.classList.remove('visible');
    notification.element.classList.add('hiding');
    
    // アニメーション後に削除
    setTimeout(() => {
      if (notification.element && notification.element.parentNode) {
        notification.element.remove();
      }
      this.notifications.splice(index, 1);
    }, 300);
  },
  
  /**
   * 全ての通知を非表示
   */
  hideAll() {
    [...this.notifications].forEach(notification => {
      this.hide(notification.id);
    });
  },
  
  /**
   * 情報通知を表示
   * @param {string} message - 通知内容
   * @param {number} duration - 表示時間（ミリ秒）
   * @returns {number} 通知ID
   */
  info(message, duration = 5000) {
    return this.show(message, 'info', duration);
  },
  
  /**
   * 成功通知を表示
   * @param {string} message - 通知内容
   * @param {number} duration - 表示時間（ミリ秒）
   * @returns {number} 通知ID
   */
  success(message, duration = 5000) {
    return this.show(message, 'success', duration);
  },
  
  /**
   * 警告通知を表示
   * @param {string} message - 通知内容
   * @param {number} duration - 表示時間（ミリ秒）
   * @returns {number} 通知ID
   */
  warning(message, duration = 5000) {
    return this.show(message, 'warning', duration);
  },
  
  /**
   * エラー通知を表示
   * @param {string} message - 通知内容
   * @param {number} duration - 表示時間（ミリ秒）
   * @returns {number} 通知ID
   */
  error(message, duration = 8000) {
    return this.show(message, 'error', duration);
  }
};

/**
 * 情報パネル
 * モーダルウィンドウとして情報を表示する
 */
export const infoPanel = {
  /**
   * パネル要素
   */
  panel: null,
  
  /**
   * オーバーレイ要素
   */
  overlay: null,
  
  /**
   * 初期化
   */
  init() {
    // 既存のパネルを削除
    this.removePanel();
    
    // オーバーレイを作成
    this.overlay = document.createElement('div');
    this.overlay.id = 'info-panel-overlay';
    this.overlay.className = 'info-panel-overlay';
    
    // パネルを作成
    this.panel = document.createElement('div');
    this.panel.id = 'info-panel';
    this.panel.className = 'info-panel';
    
    // DOMに追加
    this.overlay.appendChild(this.panel);
    document.body.appendChild(this.overlay);
    
    // 初期状態は非表示
    this.overlay.style.display = 'none';
    
    // クリックでパネルを閉じる
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
    
    // ESCキーでパネルを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible()) {
        this.hide();
      }
    });
  },
  
  /**
   * パネルを削除
   */
  removePanel() {
    const existingOverlay = document.getElementById('info-panel-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    this.overlay = null;
    this.panel = null;
  },
  
  /**
   * パネルを表示
   * @param {string|HTMLElement} content - 表示するコンテンツ
   * @param {Object} options - オプション設定
   */
  show(content, options = {}) {
    if (!this.panel) {
      this.init();
    }
    
    // デフォルトオプション
    const defaultOptions = {
      title: '',
      width: 'auto',
      height: 'auto',
      showClose: true,
      onClose: null
    };
    
    const settings = { ...defaultOptions, ...options };
    
    // パネルコンテンツを設定
    let panelContent = `
      ${settings.title ? `<div class="info-panel-header">
        <h2 class="info-panel-title">${settings.title}</h2>
        ${settings.showClose ? '<button class="info-panel-close" aria-label="閉じる">×</button>' : ''}
      </div>` : ''}
      <div class="info-panel-content"></div>
    `;
    
    this.panel.innerHTML = panelContent;
    
    // コンテンツを追加
    const contentContainer = this.panel.querySelector('.info-panel-content');
    if (typeof content === 'string') {
      contentContainer.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      contentContainer.appendChild(content);
    }
    
    // スタイルを設定
    if (settings.width !== 'auto') {
      this.panel.style.width = typeof settings.width === 'number' ? `${settings.width}px` : settings.width;
    }
    
    if (settings.height !== 'auto') {
      this.panel.style.height = typeof settings.height === 'number' ? `${settings.height}px` : settings.height;
    }
    
    // 閉じるボタンのイベント設定
    const closeButton = this.panel.querySelector('.info-panel-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hide();
        if (typeof settings.onClose === 'function') {
          settings.onClose();
        }
      });
    }
    
    // 表示
    this.overlay.style.display = 'flex';
    
    // アニメーション
    setTimeout(() => {
      this.overlay.classList.add('visible');
    }, 10);
  },
  
  /**
   * パネルを非表示
   */
  hide() {
    if (this.overlay) {
      this.overlay.classList.remove('visible');
      setTimeout(() => {
        this.overlay.style.display = 'none';
      }, 300);
    }
  },
  
  /**
   * パネルの表示状態を取得
   * @returns {boolean} 表示されていればtrue
   */
  isVisible() {
    return this.overlay && this.overlay.style.display !== 'none';
  }
};
