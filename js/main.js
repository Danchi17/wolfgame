'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const gameState = window.createInitialState();
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
