import { setupConnection, sendToAll, setupConnectionListener } from './network.js';
import { updateUI } from './ui.js';

let peer;
export let gameState = {
    players: [],
    phase: "待機中",
    assignedRoles: {},
    roleChanges: {},
    centerCards: [],
    actions: {},
    votes: {},
    result: "",
    pigmanMark: null,
    pigmanMarkTimeout: null,
    waitingForNextRound: false,
    roundNumber: 1
};
export let currentPlayer = { id: "", name: "", role: "", originalRole: "", points: 10 };
export let isHost = false;

const phases = ["待機中", "役職確認", "占い師", "人狼", "怪盗", "議論", "投票", "結果"];

export const roles = [
    { name: "占い師", team: "市民", cost: 3, ability: "占い師のターン、誰か一人の役職を確認する。もしくは場札の2枚の役職を確認する" },
    { name: "占星術師", team: "市民", cost: 2, ability: "場札を含め、6枚の場にある役職の内、人狼陣営が何個あるか数が分かる。" },
    { name: "占い師の弟子", team: "市民", cost: 1, ability: "占い師のターン、誰か一人の役職を確認する。" },
    { name: "無法者", team: "市民", cost: 1, ability: "投票完了後、敗北していた時にランダムに他の人と役職を交換する。勝利条件が入れ替わる" },
    { name: "村長", team: "市民", cost: 3, ability: "他のプレイヤーと違い、投票数が2票となる。" },
    { name: "怪盗", team: "市民", cost: 1, ability: "怪盗のターン時に他のプレイヤーと役職を入れ替えることが出来る" },
    { name: "大熊", team: "人狼", cost: 5, ability: "自身が吊られた時、プレイヤーの過半数が人狼サイドなら強制勝利する(スパイは人狼陣営に含まない)" },
    { name: "占い人狼", team: "人狼", cost: 4, ability: "誰か一人のカードを確認する。もしくは場のカードを2枚確認する。狼のターン時に他の人狼と仲間同士であることを確認できない" },
    { name: "やっかいな豚男", team: "人狼", cost: 3, ability: "任意の他のプレイヤー1人に★マークを付与する。★マークは1分間で消滅する。" },
    { name: "蛇女", team: "人狼", cost: 3, ability: "同数投票で処刑される場合、単独で特殊勝利する。他の人狼陣営のプレイヤーは敗北とする。" },
    { name: "博識な子犬", team: "人狼", cost: 3, ability: "日中のターンに市民陣営の特定の役職（占星術師、占い師の弟子、無法者、村長）を当てることが出来れば、人狼陣営の勝利となる。" },
    { name: "スパイ", team: "市民", cost: 2, ability: "狼のターン時に人狼陣営とお互いを確認できる。スパイ通報ボタンが設置され、バレると市民陣営が強制敗北となる。" }
];

export function initializeGame() {
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
    const updatedPlayer = gameState.players.find(p => p.id === currentPlayer.id);
    if (updatedPlayer) {
        currentPlayer.points = updatedPlayer.points;
    }
    updateUI();
    return gameState;
}

export function startGame() {
    if (gameState.players.length !== 4) {
        alert("このゲームは4人プレイヤーで開始する必要があります。");
        return;
    }

    const shuffledRoles = shuffleArray([...roles]);
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
        roundNumber: prevState.roundNumber + 1
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

export function resetGame() {
    updateGameState(prevState => ({
        ...prevState,
        phase: "待機中",
        assignedRoles: {},
        roleChanges: {},
        centerCards: [],
        actions: {},
        votes: {},
        result: "",
        pigmanMark: null,
        pigmanMarkTimeout: null,
        waitingForNextRound: false,
        roundNumber: 1,
        players: prevState.players.map(player => ({...player, points: 10, role: "", originalRole: ""}))
    }));
    
    currentPlayer = { ...currentPlayer, points: 10, role: "", originalRole: "" };
    
    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}

export { peer };
