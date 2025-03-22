// js/modules/timer-manager.js

/**
 * タイマー管理モジュール
 * フェーズ間でのタイマーの競合を防ぐための中央管理
 */
const TimerManager = {
  // アクティブなタイマーのIDを保存
  activeTimers: {},
  
  /**
   * 新しいタイマーを設定
   * @param {string} name - タイマーの名前（識別子）
   * @param {Function} callback - タイムアウト時に実行する関数
   * @param {number} delay - タイムアウトの遅延（ミリ秒）
   * @returns {number} タイマーID
   */
  setTimeout(name, callback, delay) {
    // 以前のタイマーがあれば削除
    this.clearTimeout(name);
    
    // 新しいタイマーを設定
    const timerId = setTimeout(() => {
      callback();
      // コールバック実行後、アクティブタイマーのリストから削除
      delete this.activeTimers[name];
    }, delay);
    
    // タイマーIDを記録
    this.activeTimers[name] = timerId;
    
    return timerId;
  },
  
  /**
   * タイマーをクリア
   * @param {string} name - タイマーの名前（識別子）
   */
  clearTimeout(name) {
    if (this.activeTimers[name]) {
      clearTimeout(this.activeTimers[name]);
      delete this.activeTimers[name];
    }
  },
  
  /**
   * すべてのタイマーをクリア
   */
  clearAll() {
    Object.entries(this.activeTimers).forEach(([name, id]) => {
      clearTimeout(id);
      delete this.activeTimers[name];
    });
  },
  
  /**
   * 特定のカテゴリのタイマーをクリア
   * @param {string} prefix - タイマー名のプレフィックス
   */
  clearCategory(prefix) {
    Object.keys(this.activeTimers).forEach(name => {
      if (name.startsWith(prefix)) {
        this.clearTimeout(name);
      }
    });
  }
};

export default TimerManager;