
const peer = new Peer();
let connections = [];
let gameState = {
    players: [],
    phase: "待機中",
    roles: ["村人", "村人", "占い師", "怪盗", "人狼", "人狼"],
    assignedRoles: {},
    graveyard: [],
    actions: {},
    votes: {}
};
let currentPlayer = { id: "", name: "", role: "" };
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

// ここに残りのJavaScriptコードを貼り付けます
// createGame, joinGame, setupConnection, handleReceivedData, sendToAll, updateUI,
// updateActionArea, startGame, nextPhase, performAction, handleAction,
// showActionResult, vote, handleVote, calculateResults, resetGame, shuffleArray
// などの関数を含めます。
