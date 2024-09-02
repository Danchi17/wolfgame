import { getGameState, updateGameState } from '../game/gameState.js';
import { getPlayerRole } from '../game/roleLogic.js';

export const performAction = (playerId, actionType, target) => {
    const state = getGameState();
    const playerRole = getPlayerRole(playerId);

    if (state.actions[playerId]) {
        return '既にアクションを実行しています。';
    }

    let result = '';
    switch (actionType) {
        case '占い師':
        case '占い人狼':
        case '占い師の弟子':
            result = performSeerAction(playerId, target);
            break;
        case '占星術師':
            result = performAstrologerAction();
            break;
        case '怪盗':
            result = performThiefAction(playerId, target);
            break;
        // 他のアクションタイプも同様に実装
        default:
            result = 'アクションが無効です。';
    }

    updateGameState({
        actions: {
            ...state.actions,
            [playerId]: { actionType, target }
        }
    });

    return result;
};

const performSeerAction = (playerId, target) => {
    const state = getGameState();
    if (target === 'centerCards') {
        return `場札の役職: ${state.centerCards.map(card => card.name).join(', ')}`;
    } else {
        const targetRole = state.assignedRoles[target];
        return `${state.players.find(p => p.id === target).name}の役職: ${targetRole}`;
    }
};

const performAstrologerAction = () => {
    const state = getGameState();
    const allRoles = [
        ...Object.values(state.assignedRoles),
        ...state.centerCards.map(card => card.name)
    ];
    const werewolfCount = allRoles.filter(role => 
        role.team === '人狼'
    ).length;
    return `場に存在する人狼陣営の役職の数: ${werewolfCount}`;
};

const performThiefAction = (thiefId, targetId) => {
    const state = getGameState();
    const thiefRole = state.assignedRoles[thiefId];
    const targetRole = state.assignedRoles[targetId];
    
    updateGameState({
        assignedRoles: {
            ...state.assignedRoles,
            [thiefId]: targetRole,
            [targetId]: thiefRole
        }
    });

    return `${state.players.find(p => p.id === targetId).name}と役職を交換しました。あなたの新しい役職: ${targetRole}`;
};

export const performRoleAction = (phase) => {
    const state = getGameState();
    const eligiblePlayers = state.players.filter(player => {
        const role = getPlayerRole(player.id);
        return role && (
            (phase === '占い師' && ['占い師', '占い人狼', '占い師の弟子'].includes(role.name)) ||
            (phase === '人狼' && role.team === '人狼') ||
            (phase === '怪盗' && role.name === '怪盗')
        );
    });

    eligiblePlayers.forEach(player => {
        // AIの行動ロジックをここに実装
        // 例: ランダムなターゲットを選択
        const targets = state.players.filter(p => p.id !== player.id);
        const randomTarget = targets[Math.floor(Math.random() * targets.length)];
        performAction(player.id, getPlayerRole(player.id).name, randomTarget.id);
    });
};
