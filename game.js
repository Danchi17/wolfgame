import { setupConnection, sendToAll, setupConnectionListener } from './network.js';
import { updateUI } from './ui.js';

let peer;
export let gameState = {
    players: [],
    phase: "待機中",
    roles: ["村人", "村人", "占い師", "怪盗", "人狼", "人狼"],
    assignedRoles: {},
    roleChanges: {},
    graveyard: [],
    actions: {},
    votes: {},
    result: ""
};
export let currentPlayer = { id: "", name: "", role: "", originalRole: "" };
export let isHost = false;

const phases = ["待機中", "役職確認", "占い師", "人狼", "怪盗", "議論", "投票", "結果"];

function initializePeer() {
    return new Promise((resolve, reject) => {
        peer = new Peer({
            config: {'iceServers': [
                { url: 'stun:stun.l.google.com:19302' },
                { url: 'turn:numb.viagenie.ca', credential: 'muazkh', username: 'webrtc@live.com' }
            ]},
            debug: 2
        });

        peer.on('open', id => {
            console.log('My peer ID is: ' + id);
            setupConnectionListener();
            resolve(id);
        });

        peer.on('error', error => {
            console.error('Peer connection error:', error);
            reject(error);
        });

        setTimeout(() => {
            if (peer.id === null) {
                reject(new Error('Peer initialization timed out'));
            }
        }, 20000);
    });
}

window.addEventListener('load', async () => {
    try {
        await initializePeer();
        setupUI();
    } catch (error) {
        console.error('Failed to initialize Peer.js:', error);
        alert('ネットワーク接続の初期化に失敗しました。ページをリロードしてください。エラー: ' + error.message);
    }
});

function setupUI() {
    document.getElementById('createGame').addEventListener('click', createGame);
    document.getElementById('joinGame').addEventListener('click', joinGame);
    document.getElementById('startGame').addEventListener('click', startGame);
    document.getElementById('nextPhase').addEventListener('click', nextPhase);
    document.getElementById('resetGame').addEventListener('click', resetGame);
}

function createGame() {
    const playerName = document.getElementById('playerName').value;
    if (playerName && peer && peer.id) {
        currentPlayer = { id: peer.id, name: playerName, role: "", originalRole: "" };
        isHost = true;
        gameState = {
            ...gameState,
            players: [currentPlayer],
            phase: "待機中"
        };
        console.log("Game created. Current game state:", gameState);
        console.log("Is host:", isHost);
        sendToAll({ type: 'gameState', state: gameState });
        updateUI();
        alert(`ゲームID: ${peer.id} を他のプレイヤーに共有してください。`);
    } else {
        alert('プレイヤー名を入力してください。また、ネットワーク接続が初期化されていることを確認してください。');
    }
}

function joinGame() {
    const gameId = document.getElementById('gameId').value;
    const playerName = document.getElementById('playerName').value;
    if (gameId && playerName && peer && peer.id) {
        currentPlayer = { id: peer.id, name: playerName, role: "", originalRole: "" };
        isHost = false;
        const conn = peer.connect(gameId);
        setupConnection(conn);
        conn.on('open', () => {
            sendToAll({ type: 'playerJoined', player: currentPlayer });
            updateUI();
        });
    } else {
        alert('プレイヤー名とゲームIDを入力してください。また、ネットワーク接続が初期化されていることを確認してください。');
    }
}

export function updateGameState(updater) {
    if (typeof updater === 'function') {
        gameState = updater(gameState);
    } else {
        gameState = updater;
    }
    console.log("Game state updated:", gameState);
    if (gameState.assignedRoles[currentPlayer.id]) {
        currentPlayer.role = gameState.assignedRoles[currentPlayer.id];
        if (!currentPlayer.originalRole) {
            currentPlayer.originalRole = currentPlayer.role;
        }
    }
    updateUI();
    return gameState;
}

export function startGame() {
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
        roleChanges: {},
        graveyard: graveyardRoles,
        phase: '役職確認',
        actions: {},
        votes: {}
    }));

    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}

export function nextPhase() {
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

export function resetGame() {
    updateGameState(prevState => ({
        ...prevState,
        phase: "待機中",
        assignedRoles: {},
        roleChanges: {},
        graveyard: [],
        actions: {},
        votes: {},
        result: ""
    }));
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

export { peer };
