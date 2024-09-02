import { createInitialState } from './gameSetup.js';

let gameState = createInitialState();

export const getGameState = () => gameState;

export const updateGameState = (newState) => {
    gameState = { ...gameState, ...newState };
    return gameState;
};

export const resetGameState = () => {
    gameState = createInitialState();
    return gameState;
};
