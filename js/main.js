import { initializeGame, createGame, joinGame, startGame, nextPhase, resetGame } from './game.js';
import { updateUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    
    const createGameButton = document.getElementById('createGameButton');
    const joinGameButton = document.getElementById('joinGameButton');
    const startGameButton = document.getElementById('startGame');
    const nextPhaseButton = document.getElementById('nextPhase');
    const resetGameButton = document.getElementById('resetGame');

    if (createGameButton) createGameButton.addEventListener('click', createGame);
    if (joinGameButton) joinGameButton.addEventListener('click', joinGame);
    if (startGameButton) startGameButton.addEventListener('click', startGame);
    if (nextPhaseButton) nextPhaseButton.addEventListener('click', nextPhase);
    if (resetGameButton) resetGameButton.addEventListener('click', resetGame);

    updateUI();
});
