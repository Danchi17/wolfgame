import { updateGameState, getGameState } from './gameState.js';
import { performRoleAction } from '../actions/playerActions.js';

export const phases = ['待機中', '役職確認', '占い師', '人狼', '怪盗', '議論', '投票', '結果'];

export const nextPhase = () => {
    const currentState = getGameState();
    const currentPhaseIndex = phases.indexOf(currentState.phase);
    if (currentPhaseIndex < phases.length - 1) {
        const nextPhase = phases[currentPhaseIndex + 1];
        updateGameState({ phase: nextPhase });
        if (['占い師', '人狼', '怪盗'].includes(nextPhase)) {
            performRoleAction(nextPhase);
        }
    }
};

export const startGame = () => {
    updateGameState({ phase: '役職確認' });
};
