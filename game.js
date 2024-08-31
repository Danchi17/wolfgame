import { setupConnection, sendToAll, setupConnectionListener } from './network.js';
import { updateUI } from './ui.js';

let peer;
export let gameState = {
    players: [],
    phase: "待機中",
    roles: [
        { name: "占い師", team: "市民", cost: 2, ability: "誰か一人のカードを確認する。もしくは場のカードを2枚確認する" },
        { name: "ギャンブラー", team: "市民", cost: 1, ability: "チップ掛けのターンの際に人狼の詳細な役職を当てれば、逆転勝利する" },
        { name: "無法者", team: "市民", cost: 1, ability: "敗北時に必ず左隣の人とカードを交換する。勝利条件が入れ替わる" },
        { name: "サイキック", team: "市民", cost: 1, ability: "チップの賭けが発生した時に自動的に他プレイヤーの賭け点を2点にさせる" },
        { name: "怪盗", team: "市民", cost: 1, ability: "怪盗のターン時に他のプレイヤーとカードを入れ替えることが出来る" },
        { name: "スパイ", team: "市民", cost: 1, ability: "狼のターン時に人狼陣営とお互いを確認できる" },
        { name: "大熊", team: "人狼", cost: 5, ability: "自身が吊られた時、プレイヤーの過半数が人狼サイドなら強制勝利する" },
        { name: "占い人狼", team: "人狼", cost: 4, ability: "誰か一人のカードを確認する。もしくは場のカードを2枚確認する" },
        { name: "やっかいな豚男", team: "人狼", cost: 3, ability: "任意の他のプレイヤー1人に★マークを付与する" },
        { name: "蛇女", team: "人狼", cost: 3, ability: "同数投票で処刑される場合、単独で勝利する" },
        { name: "博識な子犬", team: "人狼", cost: 3, ability: "チップ掛けのターンの際に市民の役職を当てれば、逆転勝利する" }
    ],
    assignedRoles: {},
    roleChanges: {},
    graveyard: [],
    actions: {},
    votes: {},
    chips: {},
    result: "",
    centerCards: [],
    pigmanMark: null,
    pigmanMarkTimeout: null
};
export let currentPlayer = { id: "", name: "", role: "", originalRole: "", points: 10 };
export let isHost = false;

const phases = ["待機中", "役職確認", "占い師", "人狼", "怪盗", "議論", "投票", "チップ掛け", "結果"];

export function initializePeer() {
    return new Promise((resolve, reject) => {
        if (typeof Peer === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js';
            script.onload = () => {
                createPeer(resolve, reject);
            };
            script.onerror = (error) => {
                console.error('Failed to load PeerJS:', error);
                reject(error);
            };
            document.head.appendChild(script);
        } else {
            createPeer(resolve, reject);
        }
    });
}

function createPeer(resolve, reject) {
    peer = new Peer();
    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        setupConnectionListener();
        resolve(id);
    });
    peer.on('error', (error) => {
        console.error('PeerJS error:', error);
        reject(error);
    });
}

export function createGame() {
    const playerName = document.getElementById('playerName').value;
    if (playerName && peer && peer.id) {
        currentPlayer = { id: peer.id, name: playerName, role: "", originalRole: "", points: 10 };
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

export function joinGame() {
    const gameId = document.getElementById('gameId').value;
    const playerName = document.getElementById('playerName').value;
    if (gameId && playerName && peer && peer.id) {
        currentPlayer = { id: peer.id, name: playerName, role: "", originalRole: "", points: 10 };
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
    // 現在のプレイヤーの点数を更新
    const updatedPlayer = gameState.players.find(p => p.id === currentPlayer.id);
    if (updatedPlayer) {
        currentPlayer.points = updatedPlayer.points;
    }
    updateUI();
    return gameState;
}

export function startGame() {
    console.log("startGame function called");
    console.log("Current number of players:", gameState.players.length);

    if (gameState.players.length !== 4) {
        alert("このゲームは4人プレイヤーで開始する必要があります。");
        return;
    }

    const allRoles = [...gameState.roles];
    const shuffledRoles = shuffleArray(allRoles);
    const playerRoles = shuffledRoles.slice(0, gameState.players.length);
    const centerCards = shuffledRoles.slice(gameState.players.length, gameState.players.length + 2);

    const newAssignedRoles = {};
    gameState.players.forEach((player, index) => {
        newAssignedRoles[player.id] = playerRoles[index].name;
    });

    updateGameState(prevState => ({
        ...prevState,
        assignedRoles: newAssignedRoles,
        roleChanges: {},
        centerCards: centerCards,
        phase: '役職確認',
        actions: {},
        votes: {},
        chips: {}
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

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function applyResults() {
    console.log("Applying results...");
    const losingTeam = gameState.result.includes('市民陣営の勝利') ? '人狼' : '市民';
    console.log("Losing team:", losingTeam);

    let updatedPlayers = gameState.players.map(player => {
        const role = gameState.roles.find(r => r.name === gameState.assignedRoles[player.id]);
        if (role && role.team === losingTeam) {
            console.log(`Reducing points for ${player.name} (${role.name}) by ${role.cost}`);
            return {...player, points: player.points - role.cost};
        }
        return player;
    });

    console.log("Updated players:", updatedPlayers);

    updateGameState(prevState => ({
        ...prevState,
        players: updatedPlayers
    }));

    // 無法者の能力を適用
    const outlaw = gameState.players.find(p => gameState.assignedRoles[p.id] === '無法者');
    if (outlaw) {
        console.log("Applying outlaw ability...");
        const leftNeighborIndex = (gameState.players.indexOf(outlaw) - 1 + gameState.players.length) % gameState.players.length;
        const leftNeighbor = gameState.players[leftNeighborIndex];

        updateGameState(prevState => ({
            ...prevState,
            assignedRoles: {
                ...prevState.assignedRoles,
                [outlaw.id]: prevState.assignedRoles[leftNeighbor.id],
                [leftNeighbor.id]: '無法者'
            },
            roleChanges: {
                ...prevState.roleChanges,
                [outlaw.id]: { from: '無法者', to: prevState.assignedRoles[leftNeighbor.id] },
                [leftNeighbor.id]: { from: prevState.assignedRoles[leftNeighbor.id], to: '無法者' }
            }
        }));
    }

    // 現在のプレイヤーの点数を更新
    const updatedPlayer = gameState.players.find(p => p.id === currentPlayer.id);
    if (updatedPlayer) {
        console.log(`Updating current player points: ${currentPlayer.points} -> ${updatedPlayer.points}`);
        currentPlayer.points = updatedPlayer.points;
    }

    sendToAll({ type: 'gameState', state: gameState });
    updateUI();

    console.log("Final game state after applying results:", gameState);

    // ゲーム終了条件のチェック
    if (checkGameEnd()) {
        finalizeGame();
    } else {
        // 新しいゲームラウンドを開始
        startNewRound();
    }
}

function checkGameEnd() {
    return gameState.players.some(player => player.points <= 0);
}

function finalizeGame() {
    const winner = gameState.players.reduce((prev, current) => (prev.points > current.points) ? prev : current);
    updateGameState(prevState => ({
        ...prevState,
        phase: "ゲーム終了",
        result: `ゲーム終了！勝者: ${winner.name} (${winner.points}ポイント)`
    }));

    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}

function startNewRound() {
    updateGameState(prevState => ({
        ...prevState,
        phase: "待機中",
        assignedRoles: {},
        roleChanges: {},
        centerCards: [],
        actions: {},
        votes: {},
        chips: {},
        result: "",
        pigmanMark: null,
        pigmanMarkTimeout: null
    }));

    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}

export function resetGame() {
    updateGameState(prevState => ({
        ...prevState,
        phase: "待機中",
        assignedRoles: {},
        roleChanges: {},
        centerCards: [],
        actions: {},
        votes: {},
        chips: {},
        result: "",
        pigmanMark: null,
        pigmanMarkTimeout: null,
        players: prevState.players.map(player => ({...player, points: 10, role: "", originalRole: ""}))
    }));
    
    currentPlayer = { ...currentPlayer, points: 10, role: "", originalRole: "" };
    
    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}

export function usePigmanAbility(targetPlayerId) {
    if (gameState.assignedRoles[currentPlayer.id] !== 'やっかいな豚男') {
        alert('あなたはやっかいな豚男ではありません。');
        return;
    }

    updateGameState(prevState => ({
        ...prevState,
        pigmanMark: targetPlayerId,
        pigmanMarkTimeout: Date.now() + 60000 // 1分後
    }));

    sendToAll({ type: 'gameState', state: gameState });
    updateUI();

    // 1分後に★マークを消す
    setTimeout(() => {
        updateGameState(prevState => ({
            ...prevState,
            pigmanMark: null,
            pigmanMarkTimeout: null
        }));
        sendToAll({ type: 'gameState', state: gameState });
        updateUI();
    }, 60000);
}

// UI更新のためのイベントリスナーを設定
document.addEventListener('DOMContentLoaded', () => {
    const createGameButton = document.getElementById('createGameButton');
    const joinGameButton = document.getElementById('joinGameButton');
    const startGameButton = document.getElementById('startGame');
    const nextPhaseButton = document.getElementById('nextPhase');
    const resetGameButton = document.getElementById('resetGame');

    if (createGameButton) createGameButton.addEventListener('click', createGame);
    if (joinGameButton) joinGameButton.addEventListener('click', joinGame);
    if (startGameButton) startGameButton.addEventListener('click', startGame);
    if (nextPhaseButton) nextPhaseButton.addEventListener('click', nextPhase);
    if (resetGameButton) resetGameButton.addEventListener('click', resetGame);

    // 初期化時にUIを更新
    updateUI();
});


// ゲーム開始時にPeerJSを初期化
window.onload = async () => {
    try {
        await initializePeer();
        console.log('PeerJS initialized successfully');
    } catch (error) {
        console.error('Failed to initialize PeerJS:', error);
        alert('ネットワーク接続の初期化に失敗しました。ページをリロードしてください。');
    }
};

export { peer };
