import { gameState, currentPlayer, updateGameState } from './game.js';
import { sendToAll, sendToPlayer } from './network.js';
import { updateUI } from './ui.js';

export function performAction(role, target) {
    if (gameState.actions[currentPlayer.id]) {
        return '既にアクションを実行しています。';
    }

    const action = { role, target };
    let result = '';

    switch (role) {
        case '占い師':
            result = handleSeerAction(target);
            break;
        case '怪盗':
            result = handleThiefAction(target);
            break;
        case '人狼':
            result = handleWerewolfAction();
            break;
    }

    updateGameState(prevState => ({
        ...prevState,
        actions: {
            ...prevState.actions,
            [currentPlayer.id]: action
        }
    }));

    if (role === '怪盗') {
        sendToAll({ type: 'gameState', state: gameState });
    } else {
        sendToPlayer(currentPlayer.id, { type: 'actionResult', result, playerId: currentPlayer.id });
    }

    return result;
}

function handleSeerAction(target) {
    if (target === 'graveyard') {
        return `墓地の役職: ${gameState.graveyard.join(', ')}`;
    } else {
        const targetRole = gameState.assignedRoles[target];
        const targetPlayer = gameState.players.find(p => p.id === target);
        return `${targetPlayer.name}の役職: ${targetRole}`;
    }
}

function handleThiefAction(target) {
    if (target) {
        const thiefRole = gameState.assignedRoles[currentPlayer.id];
        const targetRole = gameState.assignedRoles[target];
        const targetPlayer = gameState.players.find(p => p.id === target);

        updateGameState(prevState => ({
            ...prevState,
            assignedRoles: {
                ...prevState.assignedRoles,
                [currentPlayer.id]: targetRole,
                [target]: thiefRole
            },
            roleChanges: {
                ...prevState.roleChanges,
                [currentPlayer.id]: { from: thiefRole, to: targetRole },
                [target]: { from: targetRole, to: thiefRole }
            }
        }));

        currentPlayer.role = targetRole;
        currentPlayer.originalRole = "怪盗";
        return `${targetPlayer.name}と役職を交換しました。あなたの新しい役職: ${targetRole}`;
    } else {
        return '役職の交換をしませんでした。';
    }
}

function handleWerewolfAction() {
    const otherWerewolves = gameState.players.filter(p => 
        p.id !== currentPlayer.id && gameState.assignedRoles[p.id] === '人狼'
    );
    return otherWerewolves.length > 0 ? 
        `他の人狼: ${otherWerewolves.map(p => p.name).join(', ')}` : 
        'あなたは唯一の人狼です。';
}

export function handleAction(action, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    const result = performAction(action.role, action.target);
    sendToPlayer(playerId, { type: 'actionResult', result, playerId });
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
