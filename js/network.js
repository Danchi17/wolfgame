'use strict';

let peer;
let hostConnection = null;
let guestConnections = [];
let isHost = false;

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
        setupGuestConnection(conn);
    });

    peer.on('error', (error) => {
        console.error('PeerJS error:', error);
        handlePeerError(error);
    });

    return peer.id;
};

const setupGuestConnection = (conn) => {
    guestConnections.push(conn);
    conn.on('open', () => {
        console.log('Guest connection opened with:', conn.peer);
        sendFullGameState(conn);
        conn.on('data', (data) => handleGuestData(data, conn));
    });
    conn.on('close', () => {
        console.log('Guest connection closed with:', conn.peer);
        guestConnections = guestConnections.filter(c => c !== conn);
        handlePlayerDisconnection(conn.peer);
    });
    conn.on('error', (error) => {
        console.error('Guest connection error:', error);
        handleConnectionError(error, conn.peer);
    });
};

const setupHostConnection = (conn) => {
    hostConnection = conn;
    conn.on('open', () => {
        console.log('Host connection opened with:', conn.peer);
        conn.on('data', handleHostData);
    });
    conn.on('close', () => {
        console.log('Host connection closed');
        hostConnection = null;
        // ホストが切断された場合の処理をここに追加
    });
    conn.on('error', (error) => {
        console.error('Host connection error:', error);
        // ホスト接続エラーの処理をここに追加
    });
};

const sendFullGameState = (conn) => {
    const fullState = window.getGameState();
    console.log('Sending full game state:', fullState);
    conn.send({ type: 'fullGameState', state: fullState });
};

const handleGuestData = (data, conn) => {
    console.log('Received data from guest:', data);
    switch (data.type) {
        case 'playerJoined':
            handlePlayerJoined(data.player);
            break;
        case 'action':
            handlePlayerAction(data.playerId, data.action, data.target);
            break;
        case 'vote':
            handlePlayerVote(data.voterId, data.targetId);
            break;
        default:
            console.warn('Unknown data type received from guest:', data.type);
    }
};

const handleHostData = (data) => {
    console.log('Received data from host:', data);
    switch (data.type) {
        case 'fullGameState':
            window.updateGameState(data.state);
            console.log('Full game state received and updated:', data.state);
            break;
        case 'gameStateUpdate':
            window.updateGameState(data.state);
            console.log('Game state updated:', data.state);
            break;
        default:
            console.warn('Unknown data type received from host:', data.type);
    }
    window.dispatchEvent(new Event('gameStateUpdated'));
};

const handlePlayerJoined = (player) => {
    const currentState = window.getGameState();
    if (!currentState.players.some(p => p.id === player.id)) {
        window.addPlayer(player);
        console.log('Player joined:', player);
        broadcastGameState();
    }
};

const handlePlayerAction = (playerId, action, target) => {
    const result = window.performAction(playerId, action, target);
    window.processActionResult(action, result);
    console.log('Action performed:', action, 'Result:', result);
    broadcastGameState();
};

const handlePlayerVote = (voterId, targetId) => {
    window.castVote(voterId, targetId);
    console.log('Vote cast:', voterId, 'voted for', targetId);
    broadcastGameState();
};

const broadcastGameState = () => {
    const currentState = window.getGameState();
    guestConnections.forEach(conn => {
        if (conn.open) {
            conn.send({ type: 'gameStateUpdate', state: currentState });
        }
    });
};

window.joinGame = (gameId, playerName) => {
    console.log('Attempting to join game:', gameId, 'as', playerName);
    const conn = peer.connect(gameId, { reliable: true });
    setupHostConnection(conn);
    conn.on('open', () => {
        console.log('Connected to host. Sending player info.');
        const newPlayer = { id: peer.id, name: playerName };
        conn.send({ type: 'playerJoined', player: newPlayer });
        window.addPlayer(newPlayer);
        window.updateGameState({ currentPlayerId: peer.id });
        console.log('Updated game state after joining:', window.getGameState());
        window.dispatchEvent(new Event('gameStateUpdated'));
    });
};

const handlePeerError = (error) => {
    console.error('Peer error:', error);
    if (error.type === 'network' || error.type === 'server-error') {
        alert('ネットワークエラーが発生しました。ページをリロードして再接続してください。');
    } else if (error.type === 'peer-unavailable') {
        alert('指定されたゲームIDが見つかりません。ゲームIDを確認して再試行してください。');
    }
};

const handlePlayerDisconnection = (peerId) => {
    console.log('Player disconnected:', peerId);
    window.removePlayer(peerId);
    broadcastGameState();
};

const handleConnectionError = (error, peerId) => {
    console.error('Connection error with peer:', peerId, error);
    handlePlayerDisconnection(peerId);
};

window.sendToHost = (data) => {
    if (hostConnection && hostConnection.open) {
        console.log('Sending data to host:', data);
        hostConnection.send(data);
    } else {
        console.error('No open connection to host');
    }
};

window.isHostPlayer = () => isHost;

window.createGame = (playerName) => {
    isHost = true;
    const gameId = peer.id;
    const newPlayer = { id: gameId, name: playerName };
    window.addPlayer(newPlayer);
    window.updateGameState({ currentPlayerId: gameId });
    console.log('Game created with ID:', gameId);
    return gameId;
};

window.debugConnections = () => {
    console.log('Is host:', isHost);
    console.log('Host connection:', hostConnection);
    console.log('Guest connections:', guestConnections);
    console.log('Current game state:', window.getGameState());
};
