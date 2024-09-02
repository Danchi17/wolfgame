'use strict';

let peer;
let connections = [];

window.setupNetwork = (initialState) => {
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
};

const setupConnection = (conn) => {
    connections.push(conn);
    conn.on('open', () => {
        conn.on('data', (data) => handleReceivedData(data));
    });
    conn.on('close', () => {
        connections = connections.filter(c => c !== conn);
        handlePlayerDisconnection(conn.peer);
    });
    conn.on('error', (error) => {
        console.error('Connection error:', error);
        handleConnectionError(error, conn.peer);
    });
};

const handleReceivedData = (data) => {
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
    const conn = peer.connect(gameId);
    setupConnection(conn);
    conn.on('open', () => {
        const state = window.getGameState();
        const newPlayer = { id: state.currentPlayerId, name: playerName };
        window.sendToAll({ type: 'playerJoined', player: newPlayer });
    });
};

const handlePeerError = (error) => {
    console.error('Peer error:', error);
    if (error.type === 'network' || error.type === 'server-error') {
        alert('ネットワークエラーが発生しました。ページをリロードして再接続してください。');
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
