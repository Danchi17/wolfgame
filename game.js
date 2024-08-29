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

function createGame() {
    const playerName = document.getElementById('playerName').value;
    if (playerName) {
        currentPlayer = { id: peer.id, name: playerName, role: "" };
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
        currentPlayer = { id: peer.id, name: playerName, role: "" };
        const conn = peer.connect(gameId);
        setupConnection(conn);
    }
}

peer.on('connection', conn => {
    setupConnection(conn);
});

function setupConnection(conn) {
    connections.push(conn);
    conn.on('open', () => {
        conn.on('data', data => {
            handleReceivedData(data);
        });
        sendToAll({ type: 'playerJoined', player: currentPlayer });
    });
}

function handleReceivedData(data) {
    switch (data.type) {
        case 'playerJoined':
            if (!gameState.players.some(p => p.id === data.player.id)) {
                gameState.players.push(data.player);
            }
            if (isHost) {
                sendToAll({ type: 'gameState', state: gameState });
            }
            break;
        case 'gameState':
            gameState = data.state;
            currentPlayer.role = gameState.assignedRoles[currentPlayer.id] || "";
            break;
        case 'startGame':
            startGame();
            break;
        case 'nextPhase':
            nextPhase();
            break;
        case 'action':
            handleAction(data.action, data.playerId);
            break;
        case 'vote':
            handleVote(data.voterId, data.targetId);
            break;
        case 'resetGame':
            resetGame();
            break;
    }
    updateUI();
}

function sendToAll(data) {
    connections.forEach(conn => conn.send(data));
}

function updateUI() {
    document.getElementById('setupArea').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';

    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    gameState.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        let roleToShow = '?';
        if (gameState.phase === "役職確認" || gameState.phase === "結果") {
            roleToShow = player.id === currentPlayer.id ? currentPlayer.role : '?';
        } else if (gameState.phase === "結果") {
            roleToShow = gameState.assignedRoles[player.id];
        }
        playerDiv.textContent = `${player.name}: ${roleToShow}`;
        playerList.appendChild(playerDiv);
    });

    document.getElementById('gameInfo').textContent = `ゲームフェーズ: ${gameState.phase}`;
    document.getElementById('startGame').style.display = (isHost && gameState.players.length === 4 && gameState.phase === "待機中") ? 'inline' : 'none';
    document.getElementById('nextPhase').style.display = (isHost && gameState.phase !== "待機中" && gameState.phase !== "結果") ? 'inline' : 'none';
    document.getElementById('resetGame').style.display = (isHost && gameState.phase === "結果") ? 'inline' : 'none';

    updateActionArea();
}

function updateActionArea() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = '';

    if (gameState.phase === "役職確認") {
        actionArea.innerHTML = `<p>あなたの役職は ${currentPlayer.role} です。</p>`;
    } else if (gameState.phase === currentPlayer.role && !gameState.actions[currentPlayer.id]) {
        switch (currentPlayer.role) {
            case '占い師':
                actionArea.innerHTML = `
                    <p>誰を占いますか？</p>
                    ${gameState.players.map(player => 
                        player.id !== currentPlayer.id ? 
                        `<button onclick="performAction('seer', '${player.id}')">占う: ${player.name}</button>` : 
                        ''
                    ).join('')}
                    <button onclick="performAction('seer', 'graveyard')">墓地を占う</button>
                `;
                break;
            case '怪盗':
                actionArea.innerHTML = `
                    <p>誰と役職を交換しますか？</p>
                    ${gameState.players.map(player => 
                        player.id !== currentPlayer.id ? 
                        `<button onclick="performAction('thief', '${player.id}')">交換: ${player.name}</button>` : 
                        ''
                    ).join('')}
                    <button onclick="performAction('thief', null)">交換しない</button>
                `;
                break;
            case '人狼':
                const otherWerewolf = gameState.players.find(player => 
                    player.id !== currentPlayer.id && gameState.assignedRoles[player.id] === '人狼'
                );
                actionArea.innerHTML = otherWerewolf ? 
                    `<p>他の人狼は ${otherWerewolf.name} です。</p>` : 
                    '<p>あなたは唯一の人狼です。</p>';
                actionArea.innerHTML += `<button onclick="performAction('werewolf', null)">確認</button>`;
                break;
        }
    } else if (gameState.phase === "投票" && !gameState.votes[currentPlayer.id]) {
        actionArea.innerHTML = `
            <p>誰に投票しますか？</p>
            ${gameState.players.map(player => 
                player.id !== currentPlayer.id ? 
                `<button onclick="vote('${player.id}')">投票: ${player.name}</button>` : 
                ''
            ).join('')}
        `;
    }
}

function startGame() {
    const allRoles = [...gameState.roles];
    const shuffledRoles = shuffleArray(allRoles);
    gameState.players.forEach((player, index) => {
        gameState.assignedRoles[player.id] = shuffledRoles[index];
        if (player.id === currentPlayer.id) {
            currentPlayer.role = shuffledRoles[index];
        }
    });
    gameState.graveyard = shuffledRoles.slice(4);
    gameState.phase = '役職確認';
    gameState.actions = {};
    gameState.votes = {};
    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}

function nextPhase() {
    const currentIndex = phases.indexOf(gameState.phase);
    if (currentIndex < phases.length - 1) {
        gameState.phase = phases[currentIndex + 1];
        sendToAll({ type: 'gameState', state: gameState });
        updateUI();
    }
}

function performAction(role, target) {
    const action = { role, target };
    gameState.actions[currentPlayer.id] = action;
    sendToAll({ type: 'action', action, playerId: currentPlayer.id });
    document.getElementById('actionArea').innerHTML = '<p>アクションを実行しました。</p>';
}

function handleAction(action, playerId) {
    let result = '';
    const player = gameState.players.find(p => p.id === playerId);
    switch (action.role) {
        case 'seer':
            if (action.target === 'graveyard') {
                result = `墓地の役職: ${gameState.graveyard[0]}`;
            } else {
                const targetRole = gameState.assignedRoles[action.target];
                const targetPlayer = gameState.players.find(p => p.id === action.target);
                result = `${targetPlayer.name}の役職: ${targetRole}`;
            }
            break;
        case 'thief':
            if (action.target) {
                const thiefRole = gameState.assignedRoles[playerId];
                const targetRole = gameState.assignedRoles[action.target];
                gameState.assignedRoles[playerId] = targetRole;
                gameState.assignedRoles[action.target] = thiefRole;
                result = `あなたの新しい役職: ${targetRole}`;
            } else {
                result = '役職を交換しませんでした。';
            }
            break;
        case 'werewolf':
            result = '人狼の確認を行いました。';
            break;
    }
    const connection = connections.find(conn => conn.peer === playerId);
    if (connection) {
        connection.send({ type: 'actionResult', result });
    }
}

function vote(targetId) {
    gameState.votes[currentPlayer.id] = targetId;
    sendToAll({ type: 'vote', voterId: currentPlayer.id, targetId: targetId });
    document.getElementById('actionArea').innerHTML = '<p>投票しました。</p>';
}

function handleVote(voterId, targetId) {
    gameState.votes[voterId] = targetId;
    if (Object.keys(gameState.votes).length === gameState.players.length) {
        calculateResults();
    }
}

function calculateResults() {
    // Here you would implement the logic to determine the game outcome
    // For now, we'll just move to the results phase
    gameState.phase = "結果";
    sendToAll({ type: 'gameState', state: gameState });
    updateUI();
}

function resetGame() {
    gameState = {
        players: gameState.players.map(p => ({ ...p, role: "" })),
        phase: "待機中",
        roles: ["村人", "村人", "占い師", "怪盗", "人狼", "人狼"],
        assignedRoles: {},
        graveyard: [],
        actions: {},
        votes: {}
    };
    currentPlayer.role = "";
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
