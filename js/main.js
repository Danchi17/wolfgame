import { initializeGame, createGame, joinGame } from './game.js';
import { updateUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    
    const createGameButton = document.getElementById('createGameButton');
    const joinGameButton = document.getElementById('joinGameButton');

    createGameButton.addEventListener('click', createGame);
    joinGameButton.addEventListener('click', joinGame);

    updateUI();
});
