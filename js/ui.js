import { gameState, currentPlayer, isHost, startGame, nextPhase, resetGame } from './game.js';
import { performAction, vote, usePigmanAbility, useKnowledgeablePuppyAbility, reportSpy, startNewRound } from './actions.js';

const phases = ["待機中", "役職確認", "占い師", "人狼", "怪盗", "議論", "投票", "結果"];

export function updateUI() {
    const setupArea = document.getElementById('setupArea');
    const gameArea = document.getElementById('gameArea');

    if (gameState.players.length > 0) {
        setupArea.style.display = 'none';
        gameArea.style.display = 'block';
    } else {
        setupArea.style.display = 'block';
        gameArea.style.display = 'none';
    }

    updatePlayerList();
    updateGameInfo();
    updateButtons();
    updateActionArea();
    updatePigmanMarkCountdown();
}

function updatePlayerList() {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    gameState.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        let roleToShow = '?';
        if (player.id === currentPlayer.id || gameState.phase === "結果") {
            roleToShow = gameState.assignedRoles[player.id] || '未割り当て';
            if (gameState.roleChanges[player.id] && (player.id === currentPlayer.id || gameState.phase === "結果")) {
                roleToShow += ` (元: ${gameState.roleChanges[player.id].from})`;
            }
        } else if (phases.indexOf(gameState.phase) > phases.indexOf("役職確認")) {
            roleToShow = '役職確認済み';
        }
        playerDiv.textContent = `${player.name}: ${roleToShow} (${player.points}ポイント)`;
        if (gameState.pigmanMark === player.id) {
            playerDiv.textContent += ' ★';
        }
        playerList.appendChild(playerDiv);
    });
}

function updateGameInfo() {
    const gameInfoElement = document.getElementById('gameInfo');
    gameInfoElement.textContent = `ゲームフェーズ: ${gameState.phase}`;
    if (gameState.phase === "結果" || gameState.waitingForNextRound) {
        gameInfoElement.textContent += ` - ${gameState.result}`;
    }
}

function updateButtons() {
    const startGameButton = document.getElementById('startGame');
    const nextPhaseButton = document.getElementById('nextPhase');
    const resetGameButton = document.getElementById('resetGame');
    const newRoundButton = document.getElementById('newRound');

    if (startGameButton) startGameButton.style.display = (isHost && gameState.players.length === 4 && gameState.phase === "待機中") ? 'inline' : 'none';
    if (nextPhaseButton) nextPhaseButton.style.display = (isHost && gameState.phase !== "待機中" && gameState.phase !== "結果" && !gameState.waitingForNextRound) ? 'inline' : 'none';
    if (resetGameButton) resetGameButton.style.display = (isHost && (gameState.phase === "結果" || gameState.waitingForNextRound)) ? 'inline' : 'none';
    if (newRoundButton) newRoundButton.style.display = (isHost && gameState.waitingForNextRound) ? 'inline' : 'none';
}

function updateActionArea() {
    const actionArea = document.getElementById('actionArea');
    if (!actionArea) return;

    actionArea.innerHTML = '';

    if (gameState.waitingForNextRound) {
        actionArea.innerHTML = '<p>結果を確認してください。</p>';
        if (isHost) {
            const nextRoundButton = document.createElement('button');
            nextRoundButton.textContent = '次のラウンドへ';
            nextRoundButton.onclick = startNewRound;
            actionArea.appendChild(nextRoundButton);
        } else {
            actionArea.innerHTML += '<p>ホストが次のラウンドを開始するのを待っています。</p>';
        }
        return;
    }

    switch (gameState.phase) {
        case "待機中":
            actionArea.innerHTML = `<p>他のプレイヤーの参加を待っています。現在のプレイヤー数: ${gameState.players.length}</p>`;
            break;
        case "役職確認":
            actionArea.innerHTML = `<p>あなたの役職は ${gameState.assignedRoles[currentPlayer.id]} です。</p>`;
            break;
        case "占い師":
            if (["占い師", "占い人狼", "占い師の弟子", "占星術師"].includes(gameState.assignedRoles[currentPlayer.id])) {
                createActionButtons();
            } else {
                actionArea.innerHTML = '<p>占い師のターンです。他のプレイヤーの行動を待っています。</p>';
            }
            break;
        case "人狼":
            if (["人狼", "大熊", "やっかいな豚男", "蛇女", "博識な子犬", "スパイ"].includes(gameState.assignedRoles[currentPlayer.id])) {
                createActionButtons();
            } else {
                actionArea.innerHTML = '<p>人狼のターンです。他のプレイヤーの行動を待っています。</p>';
            }
            break;
        case "怪盗":
            if (gameState.assignedRoles[currentPlayer.id] === "怪盗") {
                createActionButtons();
            } else {
                actionArea.innerHTML = '<p>怪盗のターンです。他のプレイヤーの行動を待っています。</p>';
            }
            break;
        case "議論":
            actionArea.innerHTML = `<p>議論の時間です。他のプレイヤーと話し合ってください。</p>`;
            if (gameState.assignedRoles[currentPlayer.id] === "やっかいな豚男") {
                createPigmanActionButtons();
            }
            if (gameState.assignedRoles[currentPlayer.id] === "博識な子犬") {
                createKnowledgeablePuppyActionButtons();
            }
            createSpyReportButtons();
            break;
        case "投票":
            if (!gameState.votes[currentPlayer.id]) {
                createVoteButtons();
            } else {
                actionArea.innerHTML = `<p>投票済みです。結果を待っています。</p>`;
            }
            break;
        case "結果":
            displayResults();
            break;
    }
}

function createActionButtons() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = `
        <p>${gameState.phase}のアクションを選択してください：</p>
    `;

    const playerRole = gameState.assignedRoles[currentPlayer.id];

    switch (playerRole) {
        case "占い師":
        case "占い人狼":
        case "占い師の弟子":
            gameState.players.forEach(player => {
                if (player.id !== currentPlayer.id) {
                    actionArea.innerHTML += `<button onclick="window.executeAction('${playerRole}', '${player.id}')">占う: ${player.name}</button>`;
                }
            });
            if (playerRole !== "占い師の弟子") {
                actionArea.innerHTML += `<button onclick="window.executeAction('${playerRole}', 'graveyard')">墓地を占う</button>`;
            }
            break;
        case "占星術師":
            actionArea.innerHTML += `<button onclick="window.executeAction('占星術師', null)">人狼陣営の数を確認</button>`;
            break;
        case "怪盗":
            gameState.players.forEach(player => {
                if (player.id !== currentPlayer.id) {
                    actionArea.innerHTML += `<button onclick="window.executeAction('怪盗', '${player.id}')">交換: ${player.name}</button>`;
                }
            });
            actionArea.innerHTML += `<button onclick="window.executeAction('怪盗', null)">交換しない</button>`;
            break;
        case "人狼":
        case "大熊":
        case "やっかいな豚男":
        case "蛇女":
        case "博識な子犬":
        case "スパイ":
            actionArea.innerHTML += `<button onclick="window.executeAction('${playerRole}', null)">仲間を確認</button>`;
            break;
    }
}

function createPigmanActionButtons() {
    const actionArea = document.getElementById('actionArea');
    gameState.players.forEach(player => {
        if (player.id !== currentPlayer.id) {
            actionArea.innerHTML += `<button onclick="window.usePigmanAbility('${player.id}')">★マークを付与: ${player.name}</button>`;
        }
    });
}

function createKnowledgeablePuppyActionButtons() {
    const actionArea = document.getElementById('actionArea');
    const citizenRoles = ['占星術師', '占い師の弟子', '無法者', '村長'];
    actionArea.innerHTML += `<p>市民陣営の役職を推測してください：</p>`;
    gameState.players.forEach(player => {
        if (player.id !== currentPlayer.id) {
            actionArea.innerHTML += `
                <select id="guess-${player.id}">
                    ${citizenRoles.map(role => `<option value="${role}">${role}</option>`).join('')}
                </select>
                <button onclick="window.guessPlayerRole('${player.id}')">推測: ${player.name}</button><br>
            `;
        }
    });
}

function createSpyReportButtons() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML += `<p>スパイだと思うプレイヤーを通報：</p>`;
    gameState.players.forEach(player => {
        if (player.id !== currentPlayer.id) {
            actionArea.innerHTML += `<button onclick="window.reportSpy('${player.id}')">通報: ${player.name}</button>`;
        }
    });
}

function createVoteButtons() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = `
        <p>誰に投票しますか？</p>
    `;
    gameState.players.forEach(player => {
        if (player.id !== currentPlayer.id) {
            actionArea.innerHTML += `<button onclick="window.vote('${player.id}')">投票: ${player.name}</button>`;
        }
    });
}

function displayResults() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = `
        <p>ゲーム結果: ${gameState.result}</p>
        <p>あなたの最終役職: ${gameState.assignedRoles[currentPlayer.id]}</p>
        <p>現在の持ち点: ${currentPlayer.points}</p>
    `;

    // 投票結果の表示
    if (gameState.voteResults && gameState.voteDetails) {
        actionArea.innerHTML += '<h3>投票結果:</h3>';
        gameState.players.forEach(player => {
            const votedFor = gameState.players.find(p => p.id === gameState.voteDetails[player.id]?.targetId);
            const voteWeight = gameState.voteDetails[player.id]?.weight || 1;
            actionArea.innerHTML += `<p>${player.name} → ${votedFor ? votedFor.name : '無効'} (${voteWeight}票)</p>`;
        });
        actionArea.innerHTML += '<h3>得票数:</h3>';
        for (const [playerId, votes] of Object.entries(gameState.voteResults)) {
            const player = gameState.players.find(p => p.id === playerId);
            actionArea.innerHTML += `<p>${player.name}: ${votes}票</p>`;
        }
    }
}

export function showActionResult(result) {
    const actionResultElement = document.getElementById('actionResult');
    actionResultElement.textContent = result;
}

function updatePigmanMarkCountdown() {
    const pigmanMarkCountdown = document.getElementById('pigmanMarkCountdown');
    if (gameState.pigmanMarkTimeout) {
        const remainingTime = Math.max(0, Math.floor((gameState.pigmanMarkTimeout - Date.now()) / 1000));
        pigmanMarkCountdown.textContent = `★マーク残り時間: ${remainingTime}秒`;
        if (remainingTime > 0) {
            requestAnimationFrame(updatePigmanMarkCountdown);
        }
    } else {
        pigmanMarkCountdown.textContent = '';
    }
}

// グローバルスコープに関数を公開
window.executeAction = function(action, target) {
    const result = performAction(action, target);
    showActionResult(result);
    updateUI();
};

window.vote = function(targetId) {
    vote(targetId);
    updateUI();
};

window.usePigmanwindow.usePigmanAbility = function(targetId) {
    const result = usePigmanAbility(targetId);
    showActionResult(result);
    updateUI();
};

window.guessPlayerRole = function(targetPlayerId) {
    const guessedRole = document.getElementById(`guess-${targetPlayerId}`).value;
    const result = useKnowledgeablePuppyAbility(guessedRole, targetPlayerId);
    showActionResult(result);
    updateUI();
};

window.reportSpy = function(reportedPlayerId) {
    const result = reportSpy(reportedPlayerId);
    showActionResult(result);
    updateUI();
};

window.startNewRound = function() {
    startNewRound();
    const actionResultElement = document.getElementById('actionResult');
    actionResultElement.textContent = ''; // アクション結果をリセット
    updateUI();
};

// 初期UIの更新
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
});
