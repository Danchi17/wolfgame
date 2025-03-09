'use strict';

document.addEventListener('DOMContentLoaded', () => {
    try {
        const gameState = window.initializeGame();
        if (typeof window.setupNetwork === 'function') {
            window.setupNetwork();
            console.log('ネットワーク設定が完了しました');
        } else {
            console.error('setupNetwork関数が見つかりません');
        }
        
        if (typeof window.renderUI === 'function') {
            window.renderUI(gameState);
            console.log('UIのレンダリングが完了しました');
        } else {
            console.warn('renderUI関数が見つかりません');
        }
    } catch (error) {
        console.error('初期化エラー:', error);
        alert('ゲームの初期化中にエラーが発生しました。ページをリロードしてください。');
    }
});

// ゲーム状態が更新されたときに発火するカスタムイベント
const gameStateUpdatedEvent = new Event('gameStateUpdated');

// updateGameState 関数をオーバーライド
const originalUpdateGameState = window.updateGameState;
window.updateGameState = (newState) => {
    const updatedState = originalUpdateGameState(newState);
    window.dispatchEvent(gameStateUpdatedEvent);
    return updatedState;
};

// window.renderUI が定義されていない場合に備えて、フォールバックの定義を追加
if (typeof window.renderUI !== 'function') {
    window.renderUI = () => {
        console.warn('window.renderUI is not properly defined. Please check ui.js file.');
    };
}
