'use strict';

window.initializeGame = () => {
    return window.createInitialState();
};

window.setupRoles = (playerIds) => {
    const shuffledRoles = window.shuffleArray([...window.roles]);
    const playerRoles = shuffledRoles.slice(0, playerIds.length);
    const centerCards = shuffledRoles.slice(playerIds.length, playerIds.length + 2);

    const assignedRoles = {};
    playerIds.forEach((id, index) => {
        assignedRoles[id] = playerRoles[index].name;
    });

    return { assignedRoles, centerCards };
};
