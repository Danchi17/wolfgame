import { setupConnection, sendToAll } from './network.js';
import { updateUI } from './ui.js';

const peer = new Peer();
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

const phases = ["待機中", "役職確認", "占い師", "怪盗", "人狼", "議論", "投票", "結果"];

// ... (他のコードは変更なし) ...

function startGame() {
    const allRoles = [...gameState.roles];
    const shuffledRoles = shuffleArray(allRoles);
    const playerRoles = shuffledRoles.slice(0, gameState.players.length);
    const graveyardRoles = shuffledRoles.slice(gameState.players.length);
    
    updateGameState(prevState => ({
        ...prevState,
        players: prevState.players.map((player, index) => ({
            ...player,
            role: playerRoles[index],
            originalRole: playerRoles[index]
        })),
        assignedRoles: prevState.players.reduce((acc, player, index) => {
            acc[player.id] = playerRoles[index];
            return acc;
        }, {}),
        graveyard: graveyardRoles,
        phase: '役職確認',
        actions: {},
        votes: {}
    }));
    currentPlayer.role = gameState.assignedRoles[currentPlayer.id];
    currentPlayer.originalRole = currentPlayer.role;
    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}

// ... (他のコードは変更なし) ...

export { gameState, peer, startGame, nextPhase, resetGame, updateGameState };
