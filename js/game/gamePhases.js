'use strict';

window.phases = ['待機中', '役職確認', '占い師', '人狼', '怪盗', '議論', '投票', '結果'];

window.nextPhase = () => {
    const currentState = window.getGameState();
    const currentPhaseIndex = window.phases.indexOf(currentState.phase);
    if (currentPhaseIndex < window.phases.length - 1) {
        const nextPhase = window.phases[currentPhaseIndex + 1];
        window.updateGameState({ phase: nextPhase });
        if (['占い師', '人狼', '怪盗'].includes(nextPhase)) {
            window.performRoleAction(nextPhase);
        }
    }
};

window.startGame = () => {
    window.updateGameState({ phase: '役職確認' });
};
