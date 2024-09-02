import { getGameState, updateGameState } from './game/gameState.js';
import { processActionResult } from './actions/actionResults.js';
import { performAction } from './actions/playerActions.js';
import { castVote } from './actions/voteActions.js';

let peer;
let connections = [];

export const setupNetwork = (initialState) => {
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

    peer = new Peer(generateRandomId(), peerOptions);
    
    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        updateGameState({ currentPlayerId: id });
    });

    peer.on('connection', (conn) => {
        setupConnection(conn);
    });

    peer.on('error', (error) => {
        console.error('PeerJS error:', error);
        // エラーに応じて適切な処理を行う
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
        // プレイヤーの切断処理を行う
        handlePlayerDisconnection(conn.peer);
    });
    conn.on('error', (error) => {
        console.error('Connection error:', error);
        // エラーに応じて適切な処理を行う
        handleConnectionError(error, conn.peer);
    });
};

const handleReceivedData = (data) => {
    try {
        switch (data.type) {
            case 'playerJoined':
                addPlayer(data.player);
                break;
            case 'gameState':
                updateGameState(data.state);
                break;
            case 'action':
                const result = performAction(data.playerId, data.action, data.target);
                processActionResult(data.action, result);
                break;
            case 'vote':
                castVote(data.voterId, data.targetId);
                break;
            default:
                console.warn('Unknown data type received:', data.type);
        }
    } catch (error) {
        console.error('Error handling received data:', error);
        // エラーに応じて適切な処理を行う
    }
};

export const sendToAll = (data) => {
    connections.forEach(conn => {
        if (conn.open) {
            conn.send(data);
        }
    });
};

export const joinGame = (gameId, playerName) => {
    const conn = peer.connect(gameId);
    setupConnection(conn);
    conn.on('open', () => {
        const state = getGameState();
        const newPlayer = { id: state.currentPlayerId, name: playerName };
        sendToAll({ type: 'playerJoined', player: newPlayer });
    });
};

const addPlayer = (player) => {
    updateGameState({
        players: [...getGameState().players, player]
    });
};

const generateRandomId = () => {
    return Math.random().toString(36).substr(2, 9);
};

const handlePeerError = (error) => {
    console.error('Peer error:', error);
    // ユーザーにエラーを通知し、必要に応じて再接続を試みる
    if (error.type === 'network' || error.type === 'server-error') {
        alert('ネットワークエラーが発生しました。ページをリロードして再接続してください。');
    }
};

const handlePlayerDisconnection = (peerId) => {
    console.log('Player disconnected:', peerId);
    // 切断したプレイヤーをゲーム状態から削除するなどの処理を行う
    const state = getGameState();
    const updatedPlayers = state.players.filter(player => player.id !== peerId);
    updateGameState({ players: updatedPlayers });
};

const handleConnectionError = (error, peerId) => {
    console.error('Connection error with peer:', peerId, error);
    // エラーに応じて適切な処理を行う
    // 例: 接続エラーが発生したプレイヤーをゲームから削除する
    handlePlayerDisconnection(peerId);
};
