import { getGameState, updateGameState } from './game/gameState.js';
import { processActionResult } from './actions/actionResults.js';
import { performAction } from './actions/playerActions.js';
import { castVote } from './actions/voteActions.js';

let peer;
let connections = [];

export const setupNetwork = (initialState) => {
    const peerOptions = {
        host: 'your-peerjs-server.com',
        port: 9000,
        path: '/myapp',
        secure: true,
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { 
                    urls: 'turn:your-turn-server.com:3478',
                    username: 'username',
                    credential: 'password'
                }
            ]
        }
    };

    peer = new Peer(peerOptions);
    
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
    });
    conn.on('error', (error) => {
        console.error('Connection error:', error);
        // エラーに応じて適切な処理を行う
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
