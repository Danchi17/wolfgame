'use strict';

let gameState = {
    players: [],
    currentPlayerId: null,
    phase: '待機中',
    assignedRoles: {},
    centerCards: [],
    actions: {},
    votes: {},
    result: '',
};

window.getGameState = () => {
    console.log('Getting game state:', gameState);
    return {...gameState};
};

window.addPlayer = (player) => {
    const existingPlayerIndex = gameState.players.findIndex(p => p.id === player.id);
    if (existingPlayerIndex !== -1) {
        // プレイヤーが既に存在する場合は更新
        gameState.players[existingPlayerIndex] = player;
    } else {
        // 新しいプレイヤーを追加
        gameState.players.push(player);
    }
    console.log('Player added or updated in game state:', player);
    console.log('Updated game state:', gameState);
    window.dispatchEvent(new Event('gameStateUpdated'));
};

window.updateGameState = (newState) => {
    gameState = { ...gameState, ...newState };
    console.log('Game state updated:', gameState);
    window.dispatchEvent(new Event('gameStateUpdated'));
};

window.resetGameState = () => {
    gameState = {
        players: [],
        currentPlayerId: null,
        phase: '待機中',
        assignedRoles: {},
        centerCards: [],
        actions: {},
        votes: {},
        result: '',
    };
    console.log('Game state reset:', gameState);
    window.dispatchEvent(new Event('gameStateUpdated'));
};

window.setPhase = (phase) => {
    gameState.phase = phase;
    console.log('Game phase set to:', phase);
    window.dispatchEvent(new Event('gameStateUpdated'));
};

window.assignRoles = (roles) => {
    gameState.assignedRoles = roles;
    console.log('Roles assigned:', roles);
    window.dispatchEvent(new Event('gameStateUpdated'));
};

window.setCenterCards = (cards) => {
    gameState.centerCards = cards;
    console.log('Center cards set:', cards);
    window.dispatchEvent(new Event('gameStateUpdated'));
};

window.performAction = (playerId, action, target) => {
    gameState.actions[playerId] = { action, target };
    console.log('Action performed:', playerId, action, target);
    window.dispatchEvent(new Event('gameStateUpdated'));
    return `${action} action performed on ${target}`;
};

window.castVote = (voterId, targetId) => {
    gameState.votes[voterId] = targetId;
    console.log('Vote cast:', voterId, 'voted for', targetId);
    window.dispatchEvent(new Event('gameStateUpdated'));
};

window.setResult = (result) => {
    gameState.result = result;
    console.log('Game result set:', result);
    window.dispatchEvent(new Event('gameStateUpdated'));
};

window.initializeGame = () => {
    window.resetGameState();
    return gameState;
};

window.removePlayer = (playerId) => {
    gameState.players = gameState.players.filter(player => player.id !== playerId);
    delete gameState.assignedRoles[playerId];
    delete gameState.actions[playerId];
    delete gameState.votes[playerId];
    console.log('Player removed:', playerId);
    console.log('Updated game state:', gameState);
    window.dispatchEvent(new Event('gameStateUpdated'));
};

window.updatePlayerRole = (playerId, role) => {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
        gameState.players[playerIndex].role = role;
        gameState.assignedRoles[playerId] = role;
        console.log('Player role updated:', playerId, role);
        window.dispatchEvent(new Event('gameStateUpdated'));
    }
};

window.debugGameState = () => {
    console.log('Current game state:', gameState);
};

window.getPlayerById = (playerId) => {
    return gameState.players.find(player => player.id === playerId);
};

window.updatePlayerInfo = (playerId, info) => {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
        gameState.players[playerIndex] = { ...gameState.players[playerIndex], ...info };
        console.log('Player info updated:', playerId, info);
        window.dispatchEvent(new Event('gameStateUpdated'));
    }
};

window.isGameReady = () => {
    return gameState.players.length >= 2; // 最小プレイヤー数を2人と仮定
};

window.startGame = () => {
    if (window.isGameReady()) {
        window.setPhase('役職確認');
        // ここで役職の割り当てなどの初期化処理を行う
        console.log('Game started');
    } else {
        console.log('Not enough players to start the game');
    }
};
