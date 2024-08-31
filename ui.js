import { gameState, currentPlayer, isHost, startGame, nextPhase, resetGame, usePigmanAbility, startNewRound, checkGameEnd, finalizeGame } from './game.js';
import { sendToAll } from './network.js';
import { performAction, vote, placeBet } from './actions.js';

const phases = ["待機中", "役職確認", "占い師", "人狼", "怪盗", "議論", "投票", "チップ掛け", "結果"];

export function updateUI() {
    console.log('updateUI called');
    const setupArea = document.getElementById('setupArea');
    const gameArea = document.getElementById('gameArea');

    if (!setupArea || !gameArea) {
        console.error('Setup area or game area not found in the DOM');
        return;
    }

    console.log("Updating UI. Current game phase:", gameState.phase);
    console.log("Current game state:", JSON.stringify(gameState, null, 2));
    console.log("Is host:", isHost);
    console.log("Current player:", JSON.stringify(currentPlayer, null, 2));

    if (gameState.players.length > 0) {
        setupArea.style.display = 'none';
        gameArea.style.display = 'block';
        console.log("Displaying game area");
    } else {
        setupArea.style.display = 'block';
        gameArea.style.display = 'none';
        console.log("Displaying setup area");
    }

    updatePlayerList();
    updateGameInfo();
    updateButtons();
    updateActionArea();
    updatePigmanMarkCountdown();
}

function updatePlayerList() {
    const playerList = document.getElementById('playerList');
    if (playerList) {
        playerList.innerHTML = '';
        gameState.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player';
            let roleToShow = '?';
            if (player.id === currentPlayer.id || gameState.phase === "結果") {
                roleToShow = gameState.assignedRoles[player.id] || '未割り当て';
                if (gameState.roleChanges[player.id]) {
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
}

function updateGameInfo() {
    const gameInfoElement = document.getElementById('gameInfo');
    if (gameInfoElement) {
        gameInfoElement.textContent = `ゲームフェーズ: ${gameState.phase}`;
        if (gameState.phase === "結果") {
            gameInfoElement.textContent += ` - ${gameState.result}`;
        }
    }
}

function updateButtons() {
    const startGameButton = document.getElementById('startGame');
    if (startGameButton) {
        startGameButton.style.display = (isHost && gameState.players.length === 4 && gameState.phase === "待機中") ? 'inline' : 'none';
    }

    const nextPhaseButton = document.getElementById('nextPhase');
    if (nextPhaseButton) {
        nextPhaseButton.style.display = (isHost && gameState.phase !== "待機中" && gameState.phase !== "結果") ? 'inline' : 'none';
    }

    const resetGameButton = document.getElementById('resetGame');
    if (resetGameButton) {
        resetGameButton.style.display = (isHost && gameState.phase === "結果") ? 'inline' : 'none';
    }
}

function updateActionArea() {
    const actionArea = document.getElementById('actionArea');
    if (!actionArea) {
        console.error('Action area not found in the DOM');
        return;
    }

    actionArea.innerHTML = '';

    if (gameState.waitingForNextRound) {
        actionArea.innerHTML = '<p>結果を確認してください。</p>';
        if (isHost) {
            const nextRoundButton = document.createElement('button');
            nextRoundButton.textContent = '次のラウンドへ';
            nextRoundButton.onclick = () => {
                if (checkGameEnd()) {
                    finalizeGame();
                } else {
                    startNewRound();
                }
            };
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
        case "人狼":
        case "怪盗":
            createActionButtons();
            break;
        case "議論":
            actionArea.innerHTML = `<p>議論の時間です。他のプレイヤーと話し合ってください。</p>`;
            if (gameState.assignedRoles[currentPlayer.id] === "やっかいな豚男") {
                createPigmanActionButtons();
            }
            break;
        case "投票":
            if (!gameState.votes[currentPlayer.id]) {
                createVoteButtons();
            } else {
                actionArea.innerHTML = `<p>投票済みです。結果を待っています。</p>`;
            }
            break;
        case "チップ掛け":
            if (!gameState.chips[currentPlayer.id]) {
                createBetButtons();
            } else {
                actionArea.innerHTML = `<p>チップを賭けました。結果を待っています。</p>`;
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
    const werewolfRoles = ['人狼', '大熊', 'やっかいな豚男', '蛇女', '博識な子犬'];

    switch (gameState.phase) {
        case "占い師":
            if (playerRole === '占い師' || playerRole === '占い人狼') {
                gameState.players.forEach(player => {
                    if (player.id !== currentPlayer.id) {
                        actionArea.innerHTML += `<button onclick="window.executeAction('${playerRole}', '${player.id}')">占う: ${player.name}</button>`;
                    }
                });
                actionArea.innerHTML += `<button onclick="window.executeAction('${playerRole}', 'graveyard')">墓地を占う</button>`;
            }
            break;
        case "人狼":
            if (werewolfRoles.includes(playerRole) && playerRole !== '占い人狼') {
                actionArea.innerHTML += `<button onclick="window.executeAction('${playerRole}', null)">他の人狼を確認</button>`;
            } else if (playerRole === 'スパイ') {
                actionArea.innerHTML += `<button onclick="window.executeAction('${playerRole}', null)">人狼陣営を確認</button>`;
            }
            break;
        case "怪盗":
            if (playerRole === '怪盗') {
                gameState.players.forEach(player => {
                    if (player.id !== currentPlayer.id) {
                        actionArea.innerHTML += `<button onclick="window.executeAction('怪盗', '${player.id}')">交換: ${player.name}</button>`;
                    }
                });
                actionArea.innerHTML += `<button onclick="window.executeAction('怪盗', null)">交換しない</button>`;
            }
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

function createBetButtons() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = `
        <p>チップを賭けますか？（現在の持ち点：${currentPlayer.points}）</p>
        <input type="number" id="betAmount" min="0" max="${currentPlayer.points}" value="0">
        <input type="text" id="guessedRole" placeholder="推測する役職">
        <button onclick="window.placeBet()">賭ける</button>
        <button onclick="window.skipBet()">賭けない</button>
    `;
}

function displayResults() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = `
        <p>ゲーム結果: ${gameState.result}</p>
        <p>あなたの最終役職: ${gameState.assignedRoles[currentPlayer.id]}</p>
        <p>現在の持ち点: ${currentPlayer.points}</p>
    `;
}

export function showActionResult(result) {
    const actionResultElement = document.getElementById('actionResult');
    if (actionResultElement) {
        actionResultElement.textContent = result;
    }
}

function updatePigmanMarkCountdown() {
    const pigmanMarkCountdown = document.getElementById('pigmanMarkCountdown');
    if (pigmanMarkCountdown) {
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
}

window.executeAction = function(action, target) {
    const result = performAction(action, target);
    showActionResult(result);
    updateUI();
};

window.vote = function(targetId) {
    vote(targetId);
    updateUI();
};

window.placeBet = function() {
    const amount = parseInt(document.getElementById('betAmount').value);
    const guessedRole = document.getElementById('guessedRole').value;
    placeBet(amount, guessedRole);
    updateUI();
};

window.skipBet = function() {
    placeBet(0, null);
    updateUI();
};

window.usePigmanAbility = function(targetId) {
    usePigmanAbility(targetId);
    updateUI();
};

// 初期UIの更新
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
});
