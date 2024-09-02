import { updateGameState, currentPlayer, isHost, peer } from './game.js';
import { updateUI, showActionResult } from './ui.js';
import { handleAction, handleVote } from './actions.js';

let connections = [];

export function setupConnection(conn) {
    connections.push(conn);
    conn.on('open', () => {
        console.log('Connection opened');
        conn.on('data', data => {
            console.log('Received data:', data);
            handleReceivedData(data);
        });
    });
    conn.on('error', (error) => {
        console.error('Connection error:', error);
    });
}

export function handleReceivedData(data) {
    console.log('Handling received data:', data);
    switch (data.type) {
        case 'playerJoined':
            console.log('Player joined:', data.player);
            updateGameState(prevState => {
                if (!prevState.players.some(p => p.id === data.player.id)) {
                    return {
                        ...prevState,
                        players: [...prevState.players, data.player]
                    };
                }
                return prevState;
            });
            if (isHost) {
                sendToAll({ type: 'gameState', state: updateGameState(state => state) });
            }
            break;
        case 'gameState':
            console.log('Received game state:', data.state);
            updateGameState(data.state);
            break;
        case 'action':
            handleAction(data.action, data.playerId);
            break;
        case 'actionResult':
            if (data.playerId === currentPlayer.id) {
                showActionResult(data.result);
            }
            break;
        case 'vote':
            handleVote(data.voterId, data.targetId);
            break;
        case 'gameResult':
            updateGameState(prevState => ({
                ...prevState,
                result: data.result,
                winningTeam: data.winningTeam,
                voteResults: data.voteResults,
                voteDetails: data.voteDetails,
                players: data.updatedPlayers,
                phase: "結果",
                waitingForNextRound: true
            }));
            updateUI();
            break;
        case 'newRound':
            updateGameState(data.state);
            updateUI();
            break;
    }
    updateUI();
}

export function sendToAll(data) {
    console.log('Sending to all:', data);
    connections.forEach(conn => {
        if (conn.open) {
            conn.send(data);
        } else {
            console.warn('Attempted to send data to a closed connection');
        }
    });
}

export function sendToPlayer(playerId, data) {
    console.log(`Sending to player ${playerId}:`, data);
    const connection = connections.find(conn => conn.peer === playerId);
    if (connection && connection.open) {
        connection.send(data);
    } else {
        console.warn(`Attempted to send data to a closed or non-existent connection for player ${playerId}`);
    }
}

export function setupConnectionListener() {
    peer.on('connection', (conn) => {
        console.log('New connection received');
        setupConnection(conn);
    });
}

export function disconnectAll() {
    connections.forEach(conn => {
        if (conn.open) {
            conn.close();
        }
    });
    connections = [];
}

export function reconnect(gameId) {
    disconnectAll();
    const conn = peer.connect(gameId);
    setupConnection(conn);
    conn.on('open', () => {
        sendToAll({ type: 'playerReconnected', player: currentPlayer });
    });
}

export function handlePlayerDisconnect(playerId) {
    updateGameState(prevState => ({
        ...prevState,
        players: prevState.players.filter(p => p.id !== playerId)
    }));
    sendToAll({ type: 'playerDisconnected', playerId: playerId });
    updateUI();
}

export function handleNetworkError(error) {
    console.error('Network error:', error);
    // エラーメッセージをユーザーに表示するなどの処理をここに追加
}

export function monitorConnections() {
    setInterval(() => {
        connections.forEach(conn => {
            if (!conn.open) {
                handlePlayerDisconnect(conn.peer);
            }
        });
    }, 5000); // 5秒ごとにチェック
}

export function synchronizeGameStart() {
    if (isHost) {
        sendToAll({ type: 'gameStart', state: gameState });
    }
}

export function syncGameState() {
    if (isHost) {
        sendToAll({ type: 'syncGameState', state: gameState });
    }
}

export function reestablishConnection(gameId) {
    disconnectAll();
    reconnect(gameId);
}

export function logConnectionStatus() {
    console.log('Current connections:', connections.map(conn => ({
        peerId: conn.peer,
        isOpen: conn.open
    })));
}

export function initializeNetworking() {
    setupConnectionListener();
    monitorConnections();
    // その他の必要な初期化処理
}
