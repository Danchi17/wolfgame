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

// ... (他のコードは変更なし) ...
