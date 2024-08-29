
function setupConnection(conn) {
    connections.push(conn);
    conn.on('open', () => {
        conn.on('data', data => {
            handleReceivedData(data);
        });
        sendToAll({ type: 'playerJoined', player: currentPlayer });
    });
}

function handleReceivedData(data) {
    switch (data.type) {
        case 'playerJoined':
            if (!gameState.players.some(p => p.id === data.player.id)) {
                gameState.players.push(data.player);
            }
            if (isHost) {
                sendToAll({ type: 'gameState', state: gameState });
            }
            break;
        case 'gameState':
            gameState = data.state;
            currentPlayer.role = gameState.assignedRoles[currentPlayer.id] || "";
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
        case 'vote':
            handleVote(data.voterId, data.targetId);
            break;
        case 'resetGame':
            resetGame();
            break;
    }
    updateUI();
}

function sendToAll(data) {
    connections.forEach(conn => conn.send(data));
}
