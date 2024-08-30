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

peer.on('open', id => {
    console.log('My peer ID is: ' + id);
});

document.getElementById('createGame').addEventListener('click', createGame);
document.getElementById('joinGame').addEventListener('click', joinGame);
document.getElementById('startGame').addEventListener('click', startGame);
document.getElementById('nextPhase').addEventListener('click', nextPhase);
document.getElementById('resetGame').addEventListener('click', resetGame);

function createGame() {
    const playerName = document.getElementById('playerName').value;
    if (playerName) {
        currentPlayer = { id: peer.id, name: playerName, role: "", originalRole: "" };
        updateGameState(prevState => ({
            ...prevState,
            players: [...prevState.players, currentPlayer]
        }));
        isHost = true;
        console.log("Game created. Current game state:", gameState);
        sendToAll({ type: 'gameState', state: gameState });
        updateUI();
        alert(`ゲームID: ${peer.id} を他のプレイヤーに共有してください。`);
    }
}

function joinGame() {
    const gameId = document.getElementById('gameId').value;
    const playerName = document.getElementById('playerName').value;
    if (gameId && playerName) {
        currentPlayer = { id: peer.id, name: playerName, role: "", originalRole: "" };
        const conn = peer.connect(gameId);
        setupConnection(conn);
        sendToAll({ type: 'playerJoined', player: currentPlayer });
        updateUI();
    }
}

peer.on('connection', conn => {
    setupConnection(conn);
});

export function updateGameState(updater) {
    if (typeof updater === 'function') {
        gameState = updater(gameState);
    } else {
        gameState = updater;
    }
    console.log("Game state updated:", gameState);
    return gameState;
}

function startGame() {
    if (gameState.players.length < 3) {
        alert("ゲームを開始するには最低3人のプレイヤーが必要です。");
        return;
    }
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

function nextPhase() {
    const currentIndex = phases.indexOf(gameState.phase);
    if (currentIndex < phases.length - 1) {
        updateGameState(prevState => ({
            ...prevState,
            phase: phases[currentIndex + 1]
        }));
        sendToAll({ type: 'gameState', state: gameState });
        updateUI();
    }
}

function resetGame() {
    updateGameState({
        players: gameState.players.map(p => ({ ...p, role: "", originalRole: "" })),
        phase: "待機中",
        roles: ["村人", "村人", "占い師", "怪盗", "人狼", "人狼"],
        assignedRoles: {},
        graveyard: [],
        actions: {},
        votes: {},
        result: ""
    });
    currentPlayer.role = "";
    currentPlayer.originalRole = "";
    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export { gameState, peer, startGame, nextPhase, resetGame };
