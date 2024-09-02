import { roles } from './roleLogic.js';
import { shuffleArray } from './gameUtils.js';

export const createInitialState = () => ({
    players: [],
    phase: '待機中',
    assignedRoles: {},
    centerCards: [],
    actions: {},
    votes: {},
    result: '',
});

export const initializeGame = () => {
    const state = createInitialState();
    return state;
};

export const setupRoles = (playerIds) => {
    const shuffledRoles = shuffleArray([...roles]);
    const playerRoles = shuffledRoles.slice(0, playerIds.length);
    const centerCards = shuffledRoles.slice(playerIds.length, playerIds.length + 2);

    const assignedRoles = {};
    playerIds.forEach((id, index) => {
        assignedRoles[id] = playerRoles[index].name;
    });

    return { assignedRoles, centerCards };
};
