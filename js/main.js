'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const gameState = window.initializeGame();
    window.setupNetwork(gameState);
    window.renderUI(gameState);
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
