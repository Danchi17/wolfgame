import { getGameState, updateGameState } from './game/gameState.js';
import { processActionResult } from './actions/actionResults.js';
import { performAction } from './actions/playerActions.js';
import { castVote } from './actions/voteActions.js';

let peer;
let connections = [];

export const setupNetwork = (initialState) => {
    peer = new Peer();
    
    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        updateGameState({ currentPlayerId: id });
    });

    peer.on('connection', (conn) => {
        setupConnection(conn);
    });
};

const setupConnection = (conn) => {
    connections.push(conn);
    conn.on('open', () => {
        conn.on('data', (data) => handleReceivedData(data));
    });
};

const handleReceivedData = (data) => {
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
        // 他のメッセージタイプも同様に処理
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
    updateGameState(state => ({
        players: [...state.players, player]
    }));
};
