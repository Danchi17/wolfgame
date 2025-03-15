// js/modules/data-manager.js
import { db, ref, get, onValue } from '../firebase.js';
import { notificationSystem } from '../ui.js';

/**
 * データ管理モジュール
 * Firebaseからのデータ取得とキャッシュを管理
 */
const DataManager = {
  /**
   * データのキャッシュ
   */
  cache: {},
  
  /**
   * リスナーの登録情報
   */
  listeners: {},
  
  /**
   * キャッシュからデータを取得
   * @param {string} path - データパス
   * @returns {Object|null} キャッシュされたデータまたはnull
   */
  getFromCache(path) {
    return this.cache[path] || null;
  },
  
  /**
   * キャッシュにデータを保存
   * @param {string} path - データパス
   * @param {Object} data - 保存するデータ
   */
  saveToCache(path, data) {
    this.cache[path] = {
      data: data,
      timestamp: Date.now()
    };
  },
  
  /**
   * キャッシュが有効か確認
   * @param {string} path - データパス
   * @param {number} maxAgeMs - 最大库存時間（ミリ秒）
   * @returns {boolean} キャッシュが有効ならtrue
   */
  isCacheValid(path, maxAgeMs = 5000) {
    const cache = this.cache[path];
    if (!cache) return false;
    
    // 一定時間経過したキャッシュは無効とする
    const now = Date.now();
    return (now - cache.timestamp) < maxAgeMs;
  },
  
  /**
   * 非同期データ取得（キャッシュ使用）
   * @param {string} path - データパス
   * @param {boolean} forceRefresh - 強制的に再取得するか
   * @returns {Promise<Object>} 取得したデータ
   */
  async fetchData(path, forceRefresh = false) {
    // キャッシュが有効で強制再取得でない場合はキャッシュから返す
    if (!forceRefresh && this.isCacheValid(path)) {
      return this.getFromCache(path).data;
    }
    
    try {
      const snapshot = await get(ref(db, path));
      const data = snapshot.val();
      
      if (data) {
        this.saveToCache(path, data);
      }
      
      return data;
    } catch (error) {
      console.error(`データ取得エラー (${path}):`, error);
      notificationSystem.error(`データの取得に失敗しました: ${path}`);
      
      // エラー時はキャッシュがあればそれを返す
      const cachedData = this.getFromCache(path);
      return cachedData ? cachedData.data : null;
    }
  },
  
  /**
   * データのリアルタイムリスニングを設定
   * @param {string} path - データパス
   * @param {Function} callback - データ受信時のコールバック
   * @returns {Function} リスナー解除関数
   */
  listenToData(path, callback) {
    // 既存のリスナーがあれば解除
    if (this.listeners[path]) {
      this.listeners[path]();
    }
    
    const dataRef = ref(db, path);
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.saveToCache(path, data);
        callback(data);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`データリスニングエラー (${path}):`, error);
      notificationSystem.error(`データの監視中にエラーが発生しました`);
      
      // エラー時はキャッシュがあればそれを返す
      const cachedData = this.getFromCache(path);
      if (cachedData) {
        callback(cachedData.data);
      }
    });
    
    // リスナーを保存
    this.listeners[path] = unsubscribe;
    
    return unsubscribe;
  },
  
  /**
   * リスナーを解除
   * @param {string} path - データパス
   */
  unsubscribe(path) {
    if (this.listeners[path]) {
      this.listeners[path]();
      delete this.listeners[path];
    }
  },
  
  /**
   * 全てのリスナーを解除
   */
  unsubscribeAll() {
    Object.keys(this.listeners).forEach(path => {
      this.unsubscribe(path);
    });
  },
  
  /**
   * キャッシュをクリア
   * @param {string} path - オプション: 特定のパスのみクリア
   */
  clearCache(path = null) {
    if (path) {
      delete this.cache[path];
    } else {
      this.cache = {};
    }
  }
};

export default DataManager;