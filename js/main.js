import { initializeGame } from './game/gameSetup.js';
import { renderUI } from './ui.js';
import { setupNetwork } from './network.js';

document.addEventListener('DOMContentLoaded', () => {
    const gameState = initializeGame();
    setupNetwork(gameState);
    renderUI(gameState);
});
