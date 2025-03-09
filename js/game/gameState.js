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

// updateGameState関数を修正して、プレイヤー配列を正しくマージするようにする
window.updateGameState = (newState) => {
    // デバッグログの追加
    console.log('updateGameState 呼び出し前の状態:', {...gameState});
    console.log('新しく適用する状態:', newState);
    
    // 特別な処理が必要な配列プロパティを処理
    const updatedPlayers = newState.players 
        ? mergePlayersArrays(gameState.players || [], newState.players)
        : gameState.players;
    
    // 新しい状態を元の状態とマージ
    gameState = { 
        ...gameState, 
        ...newState,
        // マージしたプレイヤー配列を使用（newStateに配列がある場合のみ）
        players: updatedPlayers
    };
    
    console.log('Game state updated:', gameState);
    console.log('更新後のプレイヤー:', gameState.players);
    window.dispatchEvent(new Event('gameStateUpdated'));
    return {...gameState}; // 更新された状態のコピーを返す
};

// プレイヤー配列を重複なくマージする関数
function mergePlayersArrays(currentPlayers, newPlayers) {
    // プレイヤーIDをキーとして現在のプレイヤーのマップを作成
    const playerMap = {};
    currentPlayers.forEach(player => {
        if (player && player.id) {
            playerMap[player.id] = player;
        }
    });
    
    // 新しいプレイヤーでマップを更新（既存のプレイヤーは上書き）
    newPlayers.forEach(player => {
        if (player && player.id) {
            playerMap[player.id] = player;
        }
    });
    
    // マップの値を配列に変換して返す
    return Object.values(playerMap);
}

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
