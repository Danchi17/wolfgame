import { getGameState, updateGameState } from '../game/gameState.js';
import { getPlayerRole } from '../game/roleLogic.js';

export const processActionResult = (action, result) => {
    const state = getGameState();
    let message = '';

    switch (action) {
        case '占い師':
        case '占い人狼':
        case '占い師の弟子':
            message = `占いの結果: ${result}`;
            break;
        case '占星術師':
            message = `占星術の結果: ${result}`;
            break;
        case '怪盗':
            message = `怪盗の行動結果: ${result}`;
            break;
        // 他のアクションの結果処理も同様に実装
        default:
            message = `行動結果: ${result}`;
    }

    updateGameState({
        actionResults: [...(state.actionResults || []), { action, result: message }]
    });

    return message;
};

export const announceResults = () => {
    const state = getGameState();
    let announcement = `ゲーム結果: ${state.result}\n`;

    announcement += "各プレイヤーの最終役職:\n";
    state.players.forEach(player => {
        const role = getPlayerRole(player.id);
        announcement += `${player.name}: ${role.name} (${role.team})\n`;
    });

    announcement += "\n投票結果:\n";
    Object.entries(state.votes).forEach(([voterId, targetId]) => {
        const voter = state.players.find(p => p.id === voterId);
        const target = state.players.find(p => p.id === targetId);
        announcement += `${voter.name} が ${target.name} に投票\n`;
    });

    return announcement;
};
