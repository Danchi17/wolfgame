'use strict';

// ゲーム初期化時の安全な関数呼び出し
const safelyCallFunction = (functionName, ...args) => {
    if (typeof window[functionName] === 'function') {
        try {
            return window[functionName](...args);
        } catch (error) {
            console.error(`${functionName}関数の呼び出しエラー:`, error);
            return null;
        }
    } else {
        console.error(`${functionName}関数が定義されていません`);
        return null;
    }
};

// メインの初期化処理
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('ページが読み込まれました。初期化を開始します...');
        
        // ゲーム状態の初期化
        const gameState = safelyCallFunction('initializeGame');
        console.log('ゲーム状態を初期化しました:', gameState);
        
        // ネットワークのセットアップ
        const peerId = safelyCallFunction('setupNetwork');
        console.log('ネットワークセットアップ結果:', peerId);
        
        // UIのレンダリング
        safelyCallFunction('renderUI', gameState);
        console.log('UIのレンダリングが完了しました');
        
        // ゲーム状態の更新イベントをセットアップ
        window.gameStateUpdatedEvent = new Event('gameStateUpdated');
        
        // 初期化完了ログ
        console.log('ゲームの初期化が完了しました');
    } catch (error) {
        console.error('初期化中に重大なエラーが発生しました:', error);
        alert('ゲームの初期化中にエラーが発生しました。ページをリロードしてください。');
    }
});

// updateGameState関数をオーバーライド
const setupGameStateUpdater = () => {
    try {
        if (typeof window.updateGameState === 'function') {
            const originalUpdateGameState = window.updateGameState;
            window.updateGameState = (newState) => {
                try {
                    const updatedState = originalUpdateGameState(newState);
                    try {
                        window.dispatchEvent(window.gameStateUpdatedEvent || new Event('gameStateUpdated'));
                    } catch (e) {
                        console.error('イベント発火エラー:', e);
                    }
                    return updatedState;
                } catch (error) {
                    console.error('ゲーム状態更新エラー:', error);
                    return null;
                }
            };
            console.log('updateGameState関数を拡張しました');
        } else {
            console.warn('updateGameState関数が見つからないため、拡張できませんでした');
        }
    } catch (error) {
        console.error('updateGameState関数の拡張に失敗しました:', error);
    }
};

// renderUI関数のフォールバック
const setupRenderUIFallback = () => {
    if (typeof window.renderUI !== 'function') {
        window.renderUI = () => {
            console.warn('window.renderUI関数が正しく定義されていません。ui.jsファイルを確認してください。');
        };
        console.log('renderUI関数のフォールバックを設定しました');
    }
};

// 初期化後のセットアップ処理
setTimeout(() => {
    setupGameStateUpdater();
    setupRenderUIFallback();
}, 500);

// グローバルエラーハンドリング
window.addEventListener('error', (event) => {
    console.error('グローバルエラー:', event.error);
    // エラーログをコンソールに出力するだけで、ユーザー通知はしない
});

console.log('main.jsが読み込まれました');
