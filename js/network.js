'use strict';

let peer;
let connections = [];

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

    return peer.id;  // ゲームIDとしてPeer IDを返す
};

const setupConnection = (conn) => {
    connections.push(conn);
    conn.on('open', () => {
        console.log('Connection opened with:', conn.peer);
        conn.on('data', (data) => handleReceivedData(data));
    });
    conn.on('close', () => {
        console.log('Connection closed with:', conn.peer);
        connections = connections.filter(c => c !== conn);
        handlePlayerDisconnection(conn.peer);
    });
    conn.on('error', (error) => {
        console.error('Connection error:', error);
        handleConnectionError(error, conn.peer);
    });
};

const handleReceivedData = (data) => {
    console.log('Received data:', data);
    try {
        switch (data.type) {
            case 'playerJoined':
                window.addPlayer(data.player);
                break;
            case 'gameState':
                window.updateGameState(data.state);
                break;
            case 'action':
                const result = window.performAction(data.playerId, data.action, data.target);
                window.processActionResult(data.action, result);
                break;
            case 'vote':
                window.castVote(data.voterId, data.targetId);
                break;
            default:
                console.warn('Unknown data type received:', data.type);
        }
    } catch (error) {
        console.error('Error handling received data:', error);
    }
};

window.sendToAll = (data) => {
    connections.forEach(conn => {
        if (conn.open) {
            conn.send(data);
        }
    });
};

window.joinGame = (gameId, playerName) => {
    const conn = peer.connect(gameId, { reliable: true });
    setupConnection(conn);
    conn.on('open', () => {
        console.log('Connected to host. Sending player info.');
        const newPlayer = { id: peer.id, name: playerName };
        conn.send({ type: 'playerJoined', player: newPlayer });
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
    const state = window.getGameState();
    const updatedPlayers = state.players.filter(player => player.id !== peerId);
    window.updateGameState({ players: updatedPlayers });
};

const handleConnectionError = (error, peerId) => {
    console.error('Connection error with peer:', peerId, error);
    handlePlayerDisconnection(peerId);
};
