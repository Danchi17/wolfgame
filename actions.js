import { gameState, currentPlayer, connections } from './game.js';
import { sendToAll } from './network.js';
import { updateUI } from './ui.js';

export function performAction(role, target) {
    const action = { role, target };
    gameState.actions[currentPlayer.id] = action;
    sendToAll({ type: 'action', action, playerId: currentPlayer.id });
    document.getElementById('actionArea').innerHTML = '<p>アクションを実行しました。</p>';
}

export function handleAction(action, playerId) {
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
                if (playerId === currentPlayer.id) {
                    currentPlayer.role = targetRole;
                }
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
        connection.send({ type: 'actionResult', result, playerId });
    }
}

export function vote(targetId) {
    gameState.votes[currentPlayer.id] = targetId;
    sendToAll({ type: 'vote', voterId: currentPlayer.id, targetId: targetId });
    document.getElementById('actionArea').innerHTML = '<p>投票しました。</p>';
}

export function handleVote(voterId, targetId) {
    gameState.votes[voterId] = targetId;
    if (Object.keys(gameState.votes).length === gameState.players.length) {
        calculateResults();
    }
}

export function calculateResults() {
    const voteCount = {};
    for (const targetId of Object.values(gameState.votes)) {
        voteCount[targetId] = (voteCount[targetId] || 0) + 1;
    }
    const maxVotes = Math.max(...Object.values(voteCount));
    const executedPlayers = Object.keys(voteCount).filter(id => voteCount[id] === maxVotes);

    const werewolfExecuted = executedPlayers.some(id => gameState.assignedRoles[id] === '人狼');
    gameState.result = werewolfExecuted ? "村人陣営の勝利！" : "人狼陣営の勝利！";

    gameState.phase = "結果";
    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}
