import { setupConnection, handleReceivedData, sendToAll } from './network.js';
import { updateUI } from './ui.js';
import { handleAction, vote, handleVote, calculateResults } from './actions.js';

const peer = new Peer();
let connections = [];
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
let currentPlayer = { id: "", name: "", role: "", originalRole: "" };
let isHost = false;

const phases = ["待機中", "役職確認", "占い師", "人狼", "怪盗", "議論", "投票", "結果"];

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
        gameState.players.push(currentPlayer);
        isHost = true;
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
        updateUI();
    }
}

peer.on('connection', conn => {
    setupConnection(conn);
});

// その他の関数（startGame, nextPhase, resetGame, shuffleArray）は変更なし

// グローバルスコープで必要な変数や関数をエクスポート
export { gameState, currentPlayer, isHost, connections, startGame, nextPhase, resetGame };
