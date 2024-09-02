'use strict';

window.castVote = (voterId, targetId) => {
    const state = window.getGameState();
    const updatedVotes = { ...state.votes, [voterId]: targetId };
    window.updateGameState({ votes: updatedVotes });

    if (Object.keys(updatedVotes).length === state.players.length) {
        return window.tallyVotes();
    }
    return null;
};

window.tallyVotes = () => {
    const state = window.getGameState();
    const voteCount = {};
    Object.entries(state.votes).forEach(([voterId, targetId]) => {
        const voterRole = window.getPlayerRole(voterId);
        const weight = voterRole.name === '村長' ? 2 : 1;
        voteCount[targetId] = (voteCount[targetId] || 0) + weight;
    });

    const maxVotes = Math.max(...Object.values(voteCount));
    const executed = Object.keys(voteCount).filter(id => voteCount[id] === maxVotes);

    const werewolfExecuted = executed.some(id => window.getPlayerRole(id).team === '人狼');

    let result = '';
    if (werewolfExecuted) {
        result = "人狼が処刑されました。市民陣営の勝利！";
    } else {
        result = "人狼は生き残りました。人狼陣営の勝利！";
    }

    window.updateGameState({ result });
    return result;
};
