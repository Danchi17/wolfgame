import { updateGameState, currentPlayer, isHost, peer } from './game.js';
import { updateUI, showActionResult } from './ui.js';
import { handleAction, handleVote, calculateResults } from './actions.js';

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
        case 'startGame':
            // Handle start game
            break;
        case 'nextPhase':
            // Handle next phase
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
        case 'pigmanAbility':
            handlePigmanAbility(data.playerId, data.targetId);
            break;
        case 'gamblerAction':
            handleGamblerAction(data.playerId, data.cardIndex);
            break;
        case 'knowledgeablePuppyGuess':
            handleKnowledgeablePuppyGuess(data.playerId, data.guessedRole, data.targetPlayerId);
            break;
        case 'spyAbility':
            handleSpyAbility(data.playerId);
            break;
        case 'resetGame':
            // Handle reset game
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

function handlePigmanAbility(playerId, targetId) {
    updateGameState(prevState => ({
        ...prevState,
        pigmanMark: targetId,
        pigmanMarkTimeout: Date.now() + 60000 // 1分後
    }));
    updateUI();
}

function handleGamblerAction(playerId, cardIndex) {
    const playerRole = gameState.assignedRoles[playerId];
    const graveyardRole = gameState.centerCards[cardIndex];

    updateGameState(prevState => ({
        ...prevState,
        assignedRoles: {
            ...prevState.assignedRoles,
            [playerId]: graveyardRole.name
        },
        centerCards: [
            ...prevState.centerCards.slice(0, cardIndex),
            { name: playerRole },
            ...prevState.centerCards.slice(cardIndex + 1)
        ],
        roleChanges: {
            ...prevState.roleChanges,
            [playerId]: { from: playerRole, to: graveyardRole.name }
        }
    }));
    updateUI();
}

function handleKnowledgeablePuppyGuess(playerId, guessedRole, targetPlayerId) {
    const actualRole = gameState.assignedRoles[targetPlayerId];
    if (guessedRole === actualRole && gameState.roles.find(r => r.name === actualRole).team === '市民') {
        updateGameState(prevState => ({
            ...prevState,
            result: `博識な子犬が市民の役職を正しく推測しました。人狼陣営の勝利！`,
            winningTeam: "人狼"
        }));
        calculateResults();
    }
    updateUI();
}

function handleSpyAbility(playerId) {
    updateGameState(prevState => ({
        ...prevState,
        result: "スパイが発覚しました。市民陣営の敗北！",
        winningTeam: "人狼"
    }));
    calculateResults();
    updateUI();
}
