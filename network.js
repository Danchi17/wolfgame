import { updateGameState, currentPlayer, isHost } from './game.js';
import { updateUI } from './ui.js';
import { handleAction, handleVote } from './actions.js';

let connections = [];

export function setupConnection(conn) {
    connections.push(conn);
    conn.on('open', () => {
        conn.on('data', data => {
            handleReceivedData(data);
        });
        sendToAll({ type: 'playerJoined', player: currentPlayer });
    });
}

export function handleReceivedData(data) {
    console.log('Received data:', data);
    switch (data.type) {
        case 'playerJoined':
            updateGameState(prevState => {
                if (!prevState.players.some(p => p.id === data.player.id)) {
                    console.log('Player joined:', data.player);
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
        case 'resetGame':
            // Handle reset game
            break;
    }
    updateUI();
}

export function sendToAll(data) {
    console.log('Sending to all:', data);
    connections.forEach(conn => conn.send(data));
}
