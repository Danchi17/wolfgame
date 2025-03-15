// js/modules/loading.js

/**
 * ローディングインジケーター管理クラス
 * アプリ全体で共通して使用するローディング表示機能
 */
const LoadingIndicator = {
  /**
   * ローディングインジケーターの要素
   */
  element: null,

  /**
   * ローディングインジケーターを初期化
   */
  init() {
    // 既存のローディングを削除
    this.remove();

    // ローディング要素を作成
    this.element = document.createElement('div');
    this.element.id = 'loading-indicator';
    this.element.classList.add('loading-overlay');

    // HTMLを設定
    this.element.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div class="loading-text">読み込み中...</div>
      </div>
    `;

    // 非表示の状態でDOMに追加
    this.element.style.display = 'none';
    document.body.appendChild(this.element);

    // CSSスタイルを追加パーテラルロードしないため
    const style = document.createElement('style');
    style.textContent = `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }
      
      .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      .spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
      }
      
      .loading-text {
        font-size: 16px;
        font-weight: bold;
        color: #333;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * ローディング表示を開始
   * @param {string} message - ローディング時に表示するメッセージ (オプション)
   */
  show(message = '読み込み中...') {
    if (!this.element) {
      this.init();
    }

    // メッセージを設定
    const textElement = this.element.querySelector('.loading-text');
    if (textElement) {
      textElement.textContent = message;
    }

    // 表示
    this.element.style.display = 'flex';
  },

  /**
   * ローディング表示を終了
   */
  hide() {
    if (this.element) {
      this.element.style.display = 'none';
    }
  },

  /**
   * ローディング要素を削除
   */
  remove() {
    const existingLoader = document.getElementById('loading-indicator');
    if (existingLoader) {
      existingLoader.remove();
    }
    this.element = null;
  },

  /**
   * 非同期処理をローディング表示付きで実行
   * @param {Function} asyncFunction - 非同期処理の関数
   * @param {string} message - 表示するメッセージ
   * @returns {Promise} 非同期処理の結果
   */
  async withLoading(asyncFunction, message = '読み込み中...') {
    this.show(message);
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      this.hide();
    }
  }
};

export default LoadingIndicator;