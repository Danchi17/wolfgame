'use strict';

window.createInitialState = () => ({
    players: [],
    phase: '待機中',
    assignedRoles: {},
    centerCards: [],
    actions: {},
    votes: {},
    result: '',
});

let gameState = window.createInitialState();

window.getGameState = () => gameState;

window.updateGameState = (newState) => {
    gameState = { ...gameState, ...newState };
    return gameState;
};

window.resetGameState = () => {
    gameState = window.createInitialState();
    return gameState;
};

window.initializeGame = () => {
    window.resetGameState();
    return gameState;
};

window.addPlayer = (player) => {
    gameState.players.push(player);
    return gameState;
};

window.assignRoles = (roles) => {
    gameState.assignedRoles = roles;
    return gameState;
};

window.setCenterCards = (cards) => {
    gameState.centerCards = cards;
    return gameState;
};

window.setPhase = (phase) => {
    gameState.phase = phase;
    return gameState;
};

window.addAction = (playerId, action) => {
    gameState.actions[playerId] = action;
    return gameState;
};

window.addVote = (voterId, targetId) => {
    gameState.votes[voterId] = targetId;
    return gameState;
};

window.setResult = (result) => {
    gameState.result = result;
    return gameState;
};
