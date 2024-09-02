// gameState.js

const createInitialState = () => ({
    players: [],
    phase: '待機中',
    assignedRoles: {},
    centerCards: [],
    actions: {},
    votes: {},
    result: '',
});

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

export const initializeGame = () => {
    resetGameState();
    return gameState;
};

// 他の必要な関数をここに追加
export const addPlayer = (player) => {
    gameState.players.push(player);
    return gameState;
};

export const assignRoles = (roles) => {
    gameState.assignedRoles = roles;
    return gameState;
};

export const setCenterCards = (cards) => {
    gameState.centerCards = cards;
    return gameState;
};

export const setPhase = (phase) => {
    gameState.phase = phase;
    return gameState;
};

export const addAction = (playerId, action) => {
    gameState.actions[playerId] = action;
    return gameState;
};

export const addVote = (voterId, targetId) => {
    gameState.votes[voterId] = targetId;
    return gameState;
};

export const setResult = (result) => {
    gameState.result = result;
    return gameState;
};
