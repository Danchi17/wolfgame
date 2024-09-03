'use strict';

let peer;
let connections = {};
let gameId = null;
let isHost = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const CONNECTION_TIMEOUT = 10000; // 10 seconds
let connectionTimer;

window.setupNetwork = () => {
    const peerOptions = {
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        },
        debug: 3
    };

    peer = new Peer(window.generateId(), peerOptions);
    
    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        window.updateGameState({ currentPlayerId: id });
    });

    peer.on('connection', (conn) => {
        setupConnection(conn);
    });

    peer.on('error', (error) => {
        console.error('PeerJS error:', error);
        handlePeerError(error);
    });

    return peer.id;
};

const setupConnection = (conn) => {
    connections[conn.peer] = conn;
    conn.on('open', () => {
        console.log('Connection opened with:', conn.peer);
        clearTimeout(connectionTimer);
        sendFullGameState(conn);
        conn.on('data', (data) => handleReceivedData(data, conn));
    });
    conn.on('close', () => {
        console.log('Connection closed with:', conn.peer);
        delete connections[conn.peer];
        handlePlayerDisconnection(conn.peer);
    });
    conn.on('error', (error) => {
        console.error('Connection error:', error);
        handleConnectionError(error, conn.peer);
    });
};

const sendFullGameState = (conn) => {
    const fullState = window.getGameState();
    console.log('Sending full game state:', fullState);
    conn.send({ type: 'fullGameState', state: fullState });
};

const handleReceivedData = (data, conn) => {
    console.log('Received data:', data);
    try {
        switch (data.type) {
            case 'fullGameState':
                window.updateGameState(data.state);
                console.log('Full game state received and updated:', data.state);
                break;
            case 'playerJoined':
                handlePlayerJoined(data.player, conn);
                break;
            case 'gameState':
                window.updateGameState(data.state);
                console.log('Game state updated:', data.state);
                broadcastGameState(data.state, conn);
                break;
            case 'action':
                const result = window.performAction(data.playerId, data.action, data.target);
                window.processActionResult(data.action, result);
                console.log('Action performed:', data.action, 'Result:', result);
                broadcastGameState(window.getGameState(), conn);
                break;
            case 'vote':
                window.castVote(data.voterId, data.targetId);
                console.log('Vote cast:', data.voterId, 'voted for', data.targetId);
                broadcastGameState(window.getGameState(), conn);
                break;
            default:
                console.warn('Unknown data type received:', data.type);
        }
        console.log('Current game state after handling data:', window.getGameState());
        window.dispatchEvent(new Event('gameStateUpdated'));
    } catch (error) {
        console.error('Error handling received data:', error);
    }
};

const handlePlayerJoined = (player, conn) => {
    const currentState = window.getGameState();
    if (!currentState.players.some(p => p.id === player.id)) {
        window.addPlayer(player);
        console.log('Player joined:', player);
        broadcastGameState(window.getGameState(), conn);
    }
};

const broadcastGameState = (state, excludeConn) => {
    Object.values(connections).forEach(conn => {
        if (conn !== excludeConn && conn.open) {
            conn.send({ type: 'gameState', state: state });
        }
    });
};

window.createGame = (playerName) => {
    isHost = true;
    gameId = window.generateId(); // ユニークなゲームIDを生成
    const newPlayer = { id: peer.id, name: playerName };
    window.addPlayer(newPlayer);
    window.updateGameState({ currentPlayerId: peer.id, gameId: gameId });
    console.log('Game created with ID:', gameId);
    return gameId;
};

window.joinGame = (gameId, playerName) => {
    if (!gameId) {
        console.error('Game ID is required to join a game');
        return;
    }
    console.log('Attempting to join game:', gameId, 'as', playerName);
    connectionAttempts = 0;
    attemptConnection(gameId, playerName);
};

const attemptConnection = (gameId, playerName) => {
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        alert('接続を確立できませんでした。ゲームIDを確認して再試行してください。');
        return;
    }

    connectionAttempts++;
    const conn = peer.connect(gameId, { reliable: true });
    
    connectionTimer = setTimeout(() => {
        console.log('Connection attempt timed out');
        conn.close();
        retryConnection(gameId, playerName);
    }, CONNECTION_TIMEOUT);

    conn.on('open', () => {
        clearTimeout(connectionTimer);
        console.log('Connected to host. Sending player info.');
        setupConnection(conn);
        const newPlayer = { id: peer.id, name: playerName };
        conn.send({ type: 'playerJoined', player: newPlayer });
        window.addPlayer(newPlayer);
        window.updateGameState({ currentPlayerId: peer.id, gameId: gameId });
        console.log('Updated game state after joining:', window.getGameState());
        window.dispatchEvent(new Event('gameStateUpdated'));
    });

    conn.on('error', (error) => {
        console.error('Connection error:', error);
        clearTimeout(connectionTimer);
        retryConnection(gameId, playerName);
    });
};

const retryConnection = (gameId, playerName) => {
    console.log('Retrying connection...');
    setTimeout(() => attemptConnection(gameId, playerName), 1000);
};

const handlePeerError = (error) => {
    console.error('Peer error:', error);
    if (error.type === 'network' || error.type === 'server-error') {
        alert('ネットワークエラーが発生しました。ページをリロードして再接続してください。');
    } else if (error.type === 'peer-unavailable') {
        alert('指定されたゲームIDが見つかりません。ゲームIDを確認して再試行してください。');
    } else {
        alert('エラーが発生しました: ' + error.message);
    }
};

const handlePlayerDisconnection = (peerId) => {
    console.log('Player disconnected:', peerId);
    window.removePlayer(peerId);
    broadcastGameState(window.getGameState());
};

const handleConnectionError = (error, peerId) => {
    console.error('Connection error with peer:', peerId, error);
    handlePlayerDisconnection(peerId);
};

window.sendToAll = (data, excludeConnections = []) => {
    console.log('Sending data to all:', data);
    Object.values(connections).forEach(conn => {
        if (conn.open && !excludeConnections.includes(conn)) {
            conn.send(data);
        }
    });
};

window.isHostPlayer = () => isHost;

window.debugConnections = () => {
    console.log('Is host:', isHost);
    console.log('Game ID:', gameId);
    console.log('Connections:', connections);
    console.log('Current game state:', window.getGameState());
};
