// js/modules/error-handler.js
import { notificationSystem } from '../ui.js';
import LoadingIndicator from './loading.js';

/**
 * グローバルエラーハンドリングモジュール
 * アプリケーション全体のエラーを処理し、ユーザーに通知する
 */
const ErrorHandler = {
  /**
   * 最後に発生したエラー
   */
  lastError: null,
  
  /**
   * エラー画面の要素
   */
  errorScreen: null,
  
  /**
   * リトライコールバック
   */
  retryCallback: null,
  
  /**
   * 初期化
   */
  init() {
    // グローバルエラーハンドラーを設定
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    
    // エラー画面を作成
    this.createErrorScreen();
  },
  
  /**
   * エラー画面を作成
   */
  createErrorScreen() {
    // 既存のエラー画面を削除
    if (this.errorScreen) {
      this.errorScreen.remove();
    }
    
    // エラー画面を作成
    this.errorScreen = document.createElement('div');
    this.errorScreen.id = 'error-screen';
    this.errorScreen.className = 'error-overlay';
    this.errorScreen.style.display = 'none';
    
    // HTMLを設定
    this.errorScreen.innerHTML = `
      <div class="error-container">
        <div class="error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64">
            <path fill="none" d="M0 0h24v24H0z"/>
            <path fill="#e74c3c" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z"/>
          </svg>
        </div>
        <h2 class="error-title">エラーが発生しました</h2>
        <p class="error-message">アプリケーションの処理中に問題が発生しました。</p>
        <div class="error-details" style="display: none;">
          <pre class="error-stack"></pre>
        </div>
        <div class="error-actions">
          <button id="error-retry" class="btn primary">再試行</button>
          <button id="error-details-toggle" class="btn secondary">詳細を表示</button>
          <button id="error-reload" class="btn danger">ページを再読み込み</button>
        </div>
      </div>
    `;
    
    // DOMに追加
    document.body.appendChild(this.errorScreen);
    
    // イベントリスナーの設定
    document.getElementById('error-retry').addEventListener('click', () => {
      this.hideErrorScreen();
      if (this.retryCallback) {
        this.retryCallback();
      }
    });
    
    document.getElementById('error-details-toggle').addEventListener('click', () => {
      const details = this.errorScreen.querySelector('.error-details');
      const button = document.getElementById('error-details-toggle');
      if (details.style.display === 'none') {
        details.style.display = 'block';
        button.textContent = '詳細を非表示';
      } else {
        details.style.display = 'none';
        button.textContent = '詳細を表示';
      }
    });
    
    document.getElementById('error-reload').addEventListener('click', () => {
      window.location.reload();
    });
    
    // CSSスタイルを追加
    const style = document.createElement('style');
    style.textContent = `
      .error-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      }
      
      .error-container {
        background-color: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        max-width: 90%;
        width: 500px;
        text-align: center;
        animation: errorFadeIn 0.5s ease-out;
      }
      
      @keyframes errorFadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .error-icon {
        margin-bottom: 20px;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      
      .error-title {
        font-size: 24px;
        margin-bottom: 15px;
        color: #e74c3c;
      }
      
      .error-message {
        margin-bottom: 20px;
        color: #333;
      }
      
      .error-details {
        background-color: #f8f9fa;
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 20px;
        text-align: left;
        max-height: 150px;
        overflow-y: auto;
      }
      
      .error-stack {
        white-space: pre-wrap;
        font-size: 12px;
        color: #666;
        margin: 0;
      }
      
      .error-actions {
        display: flex;
        justify-content: center;
        gap: 10px;
      }
      
      @media (max-width: 480px) {
        .error-actions {
          flex-direction: column;
        }
        
        .error-container {
          padding: 20px;
        }
      }
    `;
    document.head.appendChild(style);
  },
  
  /**
   * グローバルエラーハンドラー
   * @param {ErrorEvent} event - エラーイベント
   */
  handleGlobalError(event) {
    // 重要なエラーのみ処理（画像読み込みエラーなどは除外）
    if (this.isIgnorableError(event)) {
      return;
    }
    
    console.error('Global error:', event.error || event.message);
    this.lastError = event.error || new Error(event.message);
    
    // ローディング画面が表示されていれば非表示
    LoadingIndicator.hide();
    
    // 通知とエラー画面を表示
    notificationSystem.error('エラーが発生しました');
    this.showErrorScreen('JavaScriptエラー', event.message, this.lastError?.stack);
    
    // イベントの伝播を止める
    event.preventDefault();
  },
  
  /**
   * Promiseリジェクションハンドラー
   * @param {PromiseRejectionEvent} event - Promiseリジェクションイベント
   */
  handlePromiseRejection(event) {
    // 重要なエラーのみ処理
    if (this.isIgnorablePromiseRejection(event)) {
      return;
    }
    
    console.error('Unhandled promise rejection:', event.reason);
    this.lastError = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    
    // ローディング画面が表示されていれば非表示
    LoadingIndicator.hide();
    
    // 通知とエラー画面を表示
    notificationSystem.error('非同期処理中にエラーが発生しました');
    this.showErrorScreen('非同期処理エラー', String(event.reason), this.lastError?.stack);
    
    // イベントの伝播を止める
    event.preventDefault();
  },
  
  /**
   * 無視できるエラーか判断
   * @param {ErrorEvent} event - エラーイベント
   * @returns {boolean} 無視できる場合true
   */
  isIgnorableError(event) {
    // 画像ロードエラーなどは無視
    if (event.target && (event.target.tagName === 'IMG' || event.target.tagName === 'SCRIPT')) {
      return true;
    }
    
    // 外部スクリプトのエラーは無視
    if (event.filename && (
      event.filename.includes('extension://') || 
      event.filename.includes('chrome-extension://') ||
      event.filename.includes('mozilla-extension://')
    )) {
      return true;
    }
    
    // CORS関連のエラーは無視（ただしログは出力）
    if (event.message && event.message.includes('Cross-Origin')) {
      console.warn('CORS error ignored:', event.message);
      return true;
    }
    
    return false;
  },
  
  /**
   * 無視できるPromiseリジェクションか判断
   * @param {PromiseRejectionEvent} event - Promiseリジェクションイベント
   * @returns {boolean} 無視できる場合true
   */
  isIgnorablePromiseRejection(event) {
    // 無視する特定のエラーパターン
    const reason = String(event.reason);
    
    // Firebaseの一部のエラーはアプリ内で個別に処理されるので無視
    if (reason.includes('Firebase') && reason.includes('permission_denied')) {
      console.warn('Firebase permission error ignored:', reason);
      return true;
    }
    
    // CORS関連のエラーは無視
    if (reason.includes('Cross-Origin')) {
      console.warn('CORS promise rejection ignored:', reason);
      return true;
    }
    
    return false;
  },
  
  /**
   * エラー画面を表示
   * @param {string} title - エラータイトル
   * @param {string} message - エラーメッセージ
   * @param {string} stack - スタックトレース（オプション）
   * @param {Function} retryCallback - 再試行時のコールバック（オプション）
   */
  showErrorScreen(title, message, stack = '', retryCallback = null) {
    if (!this.errorScreen) {
      this.createErrorScreen();
    }
    
    // エラー情報を設定
    const titleElement = this.errorScreen.querySelector('.error-title');
    const messageElement = this.errorScreen.querySelector('.error-message');
    const stackElement = this.errorScreen.querySelector('.error-stack');
    
    titleElement.textContent = title || 'エラーが発生しました';
    messageElement.textContent = message || 'アプリケーションの処理中に問題が発生しました。';
    stackElement.textContent = stack || '';
    
    // 再試行コールバックを設定
    this.retryCallback = retryCallback;
    
    // 再試行ボタンの表示制御
    const retryButton = document.getElementById('error-retry');
    if (retryCallback) {
      retryButton.style.display = 'inline-block';
    } else {
      retryButton.style.display = 'none';
    }
    
    // 詳細情報の表示制御
    const detailsContainer = this.errorScreen.querySelector('.error-details');
    const detailsButton = document.getElementById('error-details-toggle');
    
    if (stack) {
      detailsButton.style.display = 'inline-block';
      detailsContainer.style.display = 'none'; // 初期状態では非表示
      detailsButton.textContent = '詳細を表示';
    } else {
      detailsButton.style.display = 'none';
      detailsContainer.style.display = 'none';
    }
    
    // エラー画面を表示
    this.errorScreen.style.display = 'flex';
  },
  
  /**
   * エラー画面を非表示
   */
  hideErrorScreen() {
    if (this.errorScreen) {
      this.errorScreen.style.display = 'none';
    }
  },
  
  /**
   * エラーをハンドリングする関数
   * @param {Function} fn - 実行する関数
   * @param {Function} errorHandler - エラーハンドラー
   * @returns {Function} エラーハンドリングラップ関数
   */
  withErrorHandling(fn, errorHandler) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        console.error('Error caught in withErrorHandling:', error);
        this.lastError = error;
        
        if (errorHandler) {
          return errorHandler(error);
        } else {
          // デフォルトのエラー処理
          notificationSystem.error(`エラーが発生しました: ${error.message || '不明なエラー'}`);
          throw error; // 再スローすることで上流のハンドラーが処理可能
        }
      }
    };
  },
  
  /**
   * リトライ付きの関数実行
   * @param {Function} fn - 実行する関数
   * @param {number} maxRetries - 最大リトライ回数
   * @param {number} delay - リトライ間の遅延（ミリ秒）
   * @returns {Promise} 関数の実行結果
   */
  async withRetry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        console.warn(`リトライ中 (${attempt + 1}/${maxRetries}):`, error);
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          // 最後の試行でない場合は遅延して再試行
          await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
        }
      }
    }
    
    // 全てのリトライが失敗した場合
    throw lastError;
  }
};

export default ErrorHandler;