
function performAction(role, target) {
    const action = { role, target };
    gameState.actions[currentPlayer.id] = action;
    sendToAll({ type: 'action', action, playerId: currentPlayer.id });
    document.getElementById('actionArea').innerHTML = '<p>アクションを実行しました。</p>';
}

function handleAction(action, playerId) {
    let result = '';
    const player = gameState.players.find(p => p.id === playerId);
    switch (action.role) {
        case 'seer':
            if (action.target === 'graveyard') {
                result = `墓地の役職: ${gameState.graveyard[0]}`;
            } else {
                const targetRole = gameState.assignedRoles[action.target];
                const targetPlayer = gameState.players.find(p => p.id === action.target);
                result = `${targetPlayer.name}の役職: ${targetRole}`;
            }
            break;
        case 'thief':
            if (action.target) {
                const thiefRole = gameState.assignedRoles[playerId];
                const targetRole = gameState.assignedRoles[action.target];
                gameState.assignedRoles[playerId] = targetRole;
                gameState.assignedRoles[action.target] = thiefRole;
                result = `あなたの新しい役職: ${targetRole}`;
            } else {
                result = '役職を交換しませんでした。';
            }
            break;
        case 'werewolf':
            result = '人狼の確認を行いました。';
            break;
    }
    const connection = connections.find(conn => conn.peer === playerId);
    if (connection) {
        connection.send({ type: 'actionResult', result });
    }
}

function vote(targetId) {
    gameState.votes[currentPlayer.id] = targetId;
    sendToAll({ type: 'vote', voterId: currentPlayer.id, targetId: targetId });
    document.getElementById('actionArea').innerHTML = '<p>投票しました。</p>';
}

function handleVote(voterId, targetId) {
    gameState.votes[voterId] = targetId;
    if (Object.keys(gameState.votes).length === gameState.players.length) {
        calculateResults();
    }
}

function calculateResults() {
    // Here you would implement the logic to determine the game outcome
    // For now, we'll just move to the results phase
    gameState.phase = "結果";
    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}
