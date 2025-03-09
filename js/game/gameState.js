'use strict';

// ゲーム状態の初期値
let gameState = {
    players: [],
    currentPlayerId: null,
    phase: '待機中',
    assignedRoles: {},
    centerCards: [],
    actions: {},
    votes: {},
    result: '',
    gameId: null
};

// ゲーム状態の取得
window.getGameState = () => {
    return {...gameState};
};

// プレイヤー追加
window.addPlayer = (player) => {
    if (!player || !player.id) return;
    
    // 既存のプレイヤーか確認
    const index = gameState.players.findIndex(p => p.id === player.id);
    
    if (index >= 0) {
        // 既存プレイヤーの更新
        gameState.players[index] = {...gameState.players[index], ...player};
    } else {
        // 新規プレイヤーの追加
        gameState.players.push(player);
    }
    
    // イベント発火
    dispatchStateUpdate();
};

// ゲーム状態の更新
window.updateGameState = (newState) => {
    if (!newState) return {...gameState};
    
    // 現在のプレイヤーIDを保存
    const myId = gameState.currentPlayerId;
    
    // 状態を更新
    gameState = { 
        ...gameState, 
        ...newState,
        // 自分のIDは常に保持
        currentPlayerId: myId || newState.currentPlayerId
    };
    
    // イベント発火
    dispatchStateUpdate();
    
    return {...gameState};
};

// プレイヤー削除
window.removePlayer = (playerId) => {
    if (!playerId) return;
    
    // プレイヤーを削除
    gameState.players = gameState.players.filter(p => p.id !== playerId);
    
    // 関連データも削除
    delete gameState.assignedRoles[playerId];
    delete gameState.actions[playerId];
    delete gameState.votes[playerId];
    
    // イベント発火
    dispatchStateUpdate();
};

// ゲーム状態リセット
window.resetGameState = () => {
    const currentId = gameState.currentPlayerId;
    
    gameState = {
        players: [],
        currentPlayerId: currentId,
        phase: '待機中',
        assignedRoles: {},
        centerCards: [],
        actions: {},
        votes: {},
        result: '',
        gameId: gameState.gameId
    };
    
    dispatchStateUpdate();
};

// 役職設定
window.setupRoles = (playerIds) => {
    if (!Array.isArray(playerIds) || playerIds.length === 0) return null;
    
    const shuffledRoles = window.shuffleArray([...window.roles]);
    const playerRoles = shuffledRoles.slice(0, playerIds.length);
    const centerCards = shuffledRoles.slice(playerIds.length, playerIds.length + 2);
    
    const assignedRoles = {};
    playerIds.forEach((id, index) => {
        assignedRoles[id] = playerRoles[index].name;
    });
    
    gameState.assignedRoles = assignedRoles;
    gameState.centerCards = centerCards;
    
    dispatchStateUpdate();
    return { assignedRoles, centerCards };
};

// イベント発火
const dispatchStateUpdate = () => {
    try {
        window.dispatchEvent(new Event('gameStateUpdated'));
    } catch (e) {
        console.error('イベント発火エラー:', e);
    }
};

// ゲーム初期化
window.initializeGame = () => {
    window.resetGameState();
    return {...gameState};
};
