import { gameState, currentPlayer, updateGameState } from './game.js';
import { sendToAll } from './network.js';
import { updateUI } from './ui.js';

export function performAction(role, target) {
    const action = { role, target };
    updateGameState(prevState => ({
        ...prevState,
        actions: {
            ...prevState.actions,
            [currentPlayer.id]: action
        }
    }));
    sendToAll({ type: 'action', action, playerId: currentPlayer.id });
    document.getElementById('actionArea').innerHTML = '<p>アクションを実行しました。</p>';
}

export function handleAction(action, playerId) {
    let result = '';
    const player = gameState.players.find(p => p.id === playerId);
    switch (action.role) {
        case '占い師':
            if (action.target === 'graveyard') {
                result = `墓地の役職: ${gameState.graveyard.join(', ')}`;
            } else {
                const targetRole = gameState.assignedRoles[action.target];
                const targetPlayer = gameState.players.find(p => p.id === action.target);
                result = `${targetPlayer.name}の役職: ${targetRole}`;
            }
            break;
        case '怪盗':
            if (action.target) {
                const thiefRole = gameState.assignedRoles[playerId];
                const targetRole = gameState.assignedRoles[action.target];
                updateGameState(prevState => ({
                    ...prevState,
                    assignedRoles: {
                        ...prevState.assignedRoles,
                        [playerId]: targetRole,
                        [action.target]: thiefRole
                    }
                }));
                if (playerId === currentPlayer.id) {
                    currentPlayer.role = targetRole;
                }
                result = `あなたの新しい役職: ${targetRole}`;
            } else {
                result = '役職を交換しませんでした。';
            }
            break;
        case '人狼':
            const otherWerewolf = gameState.players.find(p => 
                p.id !== playerId && gameState.assignedRoles[p.id] === '人狼'
            );
            result = otherWerewolf ? 
                `他の人狼は ${otherWerewolf.name} です。` : 
                'あなたは唯一の人狼です。';
            break;
    }
    sendToAll({ type: 'actionResult', result, playerId });
}

export function vote(targetId) {
    updateGameState(prevState => ({
        ...prevState,
        votes: {
            ...prevState.votes,
            [currentPlayer.id]: targetId
        }
    }));
    sendToAll({ type: 'vote', voterId: currentPlayer.id, targetId: targetId });
    document.getElementById('actionArea').innerHTML = '<p>投票しました。</p>';
}

export function handleVote(voterId, targetId) {
    updateGameState(prevState => ({
        ...prevState,
        votes: {
            ...prevState.votes,
            [voterId]: targetId
        }
    }));
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
    const result = werewolfExecuted ? "村人陣営の勝利！" : "人狼陣営の勝利！";

    updateGameState(prevState => ({
        ...prevState,
        phase: "結果",
        result: result
    }));
    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}
