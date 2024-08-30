import { setupConnection, sendToAll, setupConnectionListener } from './network.js';
import { updateUI } from './ui.js';

let peer;
let gameState = {
    players: [],
    phase: "待機中",
    roles: ["村人", "村人", "占い師", "怪盗", "人狼", "人狼"],
    assignedRoles: {},
    graveyard: [],
    actions: {},
    votes: {},
    result: ""
};
export let currentPlayer = { id: "", name: "", role: "", originalRole: "" };
export let isHost = false;

const phases = ["待機中", "役職確認", "占い師", "人狼", "怪盗", "議論", "投票", "結果"];

// ... (前半部分は変更なし)

function startGame() {
    console.log("startGame function called");
    console.log("Current number of players:", gameState.players.length);
    
    if (gameState.players.length < 3) {
        alert("ゲームを開始するには最低3人のプレイヤーが必要です。");
        return;
    }
    
    const allRoles = [...gameState.roles];
    const shuffledRoles = shuffleArray(allRoles);
    const playerRoles = shuffledRoles.slice(0, gameState.players.length);
    const graveyardRoles = shuffledRoles.slice(gameState.players.length);

    const newAssignedRoles = {};
    gameState.players.forEach((player, index) => {
        newAssignedRoles[player.id] = playerRoles[index];
    });

    updateGameState(prevState => ({
        ...prevState,
        assignedRoles: newAssignedRoles,
        graveyard: graveyardRoles,
        phase: '役職確認',
        actions: {},
        votes: {}
    }));

    currentPlayer.role = newAssignedRoles[currentPlayer.id];
    currentPlayer.originalRole = currentPlayer.role;

    console.log("Game started. New game state:", gameState);
    console.log("Current player's new role:", currentPlayer.role);
    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}

// ... (中間部分は変更なし)

export function performAction(action, target) {
    if (gameState.actions[currentPlayer.id]) {
        return "あなたはすでにアクションを実行しています。";
    }

    let result = '';
    switch (action) {
        case '占い師':
            if (target === 'graveyard') {
                result = `墓地の役職: ${gameState.graveyard.join(', ')}`;
            } else {
                const targetRole = gameState.assignedRoles[target];
                const targetPlayer = gameState.players.find(p => p.id === target);
                result = `${targetPlayer.name}の役職: ${targetRole}`;
            }
            break;
        case '人狼':
            const otherWerewolves = gameState.players.filter(p => 
                p.id !== currentPlayer.id && gameState.assignedRoles[p.id] === '人狼'
            );
            result = otherWerewolves.length > 0 ? 
                `他の人狼: ${otherWerewolves.map(p => p.name).join(', ')}` : 
                '他の人狼はいません。';
            break;
        case '怪盗':
            if (target) {
                const thiefRole = gameState.assignedRoles[currentPlayer.id];
                const targetRole = gameState.assignedRoles[target];
                const targetPlayer = gameState.players.find(p => p.id === target);
                
                updateGameState(prevState => ({
                    ...prevState,
                    assignedRoles: {
                        ...prevState.assignedRoles,
                        [currentPlayer.id]: targetRole,
                        [target]: thiefRole
                    }
                }));
                
                currentPlayer.role = targetRole;
                result = `${targetPlayer.name}と役職を交換しました。あなたの新しい役職: ${targetRole}`;
            } else {
                result = '役職の交換をしませんでした。';
            }
            break;
    }
    
    updateGameState(prevState => ({
        ...prevState,
        actions: {
            ...prevState.actions,
            [currentPlayer.id]: { action, target, result }
        }
    }));
    
    sendToAll({ type: 'action', playerId: currentPlayer.id, action, target });
    return result;
}

// ... (残りの部分は変更なし)
