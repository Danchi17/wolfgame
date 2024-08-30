import { gameState, currentPlayer, isHost, connections, startGame, nextPhase, resetGame } from './game.js';
import { updateUI } from './ui.js';
import { handleAction, handleVote } from './actions.js';

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
            if (!gameState.players.some(p => p.id === data.player.id)) {
                gameState.players.push(data.player);
                console.log('Player joined:', data.player);
            }
            if (isHost) {
                sendToAll({ type: 'gameState', state: gameState });
            }
            break;
        case 'gameState':
            gameState = data.state;
            currentPlayer.role = gameState.assignedRoles[currentPlayer.id] || "";
            currentPlayer.originalRole = currentPlayer.role;
            console.log('Updated game state:', gameState);
            break;
        case 'startGame':
            startGame();
            break;
        case 'nextPhase':
            nextPhase();
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
            resetGame();
            break;
    }
    updateUI();
}

export function sendToAll(data) {
    console.log('Sending to all:', data);
    connections.forEach(conn => conn.send(data));
}
