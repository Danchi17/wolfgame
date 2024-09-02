import { getGameState, updateGameState } from '../game/gameState.js';
import { getPlayerRole } from '../game/roleLogic.js';

export const castVote = (voterId, targetId) => {
    const state = getGameState();
    const updatedVotes = { ...state.votes, [voterId]: targetId };
    updateGameState({ votes: updatedVotes });

    if (Object.keys(updatedVotes).length === state.players.length) {
        return tallyVotes();
    }
    return null;
};

export const tallyVotes = () => {
    const state = getGameState();
    const voteCount = {};
    Object.entries(state.votes).forEach(([voterId, targetId]) => {
        const voterRole = getPlayerRole(voterId);
        const weight = voterRole.name === '村長' ? 2 : 1;
        voteCount[targetId] = (voteCount[targetId] || 0) + weight;
    });

    const maxVotes = Math.max(...Object.values(voteCount));
    const executed = Object.keys(voteCount).filter(id => voteCount[id] === maxVotes);

    const werewolfExecuted = executed.some(id => getPlayerRole(id).team === '人狼');

    let result = '';
    if (werewolfExecuted) {
        result = "人狼が処刑されました。市民陣営の勝利！";
    } else {
        result = "人狼は生き残りました。人狼陣営の勝利！";
    }

    updateGameState({ result });
    return result;
};
