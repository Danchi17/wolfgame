import { getGameState, updateGameState } from '../game/gameState.js';
import { getPlayerRole, swapRoles } from '../game/roleLogic.js';

export const usePigmanAbility = (pigmanId, targetId) => {
    const state = getGameState();
    updateGameState({
        pigmanMark: targetId,
        pigmanMarkTimeout: Date.now() + 60000 // 1分後
    });
    return `${state.players.find(p => p.id === targetId).name}に★マークを付与しました。`;
};

export const useKnowledgeablePuppyexport const useKnowledgeablePuppyAbility = (puppyId, guessedRole, targetId) => {
    const state = getGameState();
    const targetRole = getPlayerRole(targetId);
    const citizenRoles = ['占星術師', '占い師の弟子', '無法者', '村長'];

    if (guessedRole === targetRole.name && citizenRoles.includes(targetRole.name)) {
        updateGameState({
            result: "博識な子犬が市民の役職を正しく推測しました。人狼陣営の勝利！",
            phase: "結果"
        });
        return "正解！人狼陣営の勝利です。";
    } else {
        return "不正解。ゲームを続行します。";
    }
};

export const reportSpy = (reporterId, suspectedSpyId) => {
    const state = getGameState();
    const suspectedRole = getPlayerRole(suspectedSpyId);

    if (suspectedRole.name === 'スパイ') {
        updateGameState({
            result: "スパイが発覚しました。市民陣営の敗北！",
            phase: "結果"
        });
        return "スパイの通報に成功しました。人狼陣営の勝利です。";
    } else {
        // 通報者のポイントを減らす
        const updatedPlayers = state.players.map(player => 
            player.id === reporterId ? {...player, points: player.points - 3} : player
        );
        updateGameState({ players: updatedPlayers });
        return "スパイの通報に失敗しました。あなたの持ち点が3点減少しました。";
    }
};

export const performOutlawAbility = (outlawId) => {
    const state = getGameState();
    if (state.result.includes('市民陣営の勝利')) {
        const otherPlayers = state.players.filter(p => p.id !== outlawId);
        const randomPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        swapRoles(outlawId, randomPlayer.id);
        return `無法者の能力が発動し、${randomPlayer.name}と役職を交換しました。`;
    }
    return null;
};
