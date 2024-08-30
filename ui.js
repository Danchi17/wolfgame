import { gameState, currentPlayer, isHost, startGame, nextPhase, resetGame } from './game.js';
import { sendToAll } from './network.js';
import { performAction, vote } from './actions.js';

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

    const playerList = document.getElementById('playerList');
    if (playerList) {
        playerList.innerHTML = '';
        gameState.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player';
            let roleToShow = '?';
            if (player.id === currentPlayer.id) {
                roleToShow = currentPlayer.role || '未割り当て';
            } else if (gameState.phase === "結果") {
                roleToShow = gameState.assignedRoles[player.id] || '未割り当て';
            }
            playerDiv.textContent = `${player.name}: ${roleToShow}`;
            playerList.appendChild(playerDiv);
        });
    }

    const gameInfoElement = document.getElementById('gameInfo');
    if (gameInfoElement) {
        gameInfoElement.textContent = `ゲームフェーズ: ${gameState.phase}`;
        if (gameState.phase === "結果") {
            gameInfoElement.textContent += ` - ${gameState.result}`;
        }
    }

    const startGameButton = document.getElementById('startGame');
    if (startGameButton) {
        startGameButton.style.display = (isHost && gameState.players.length >= 3 && gameState.phase === "待機中") ? 'inline' : 'none';
    }

    const nextPhaseButton = document.getElementById('nextPhase');
    if (nextPhaseButton) {
        nextPhaseButton.style.display = (isHost && gameState.phase !== "待機中" && gameState.phase !== "結果") ? 'inline' : 'none';
    }

    const resetGameButton = document.getElementById('resetGame');
    if (resetGameButton) {
        resetGameButton.style.display = (isHost && gameState.phase === "結果") ? 'inline' : 'none';
    }

    updateActionArea();
}

function updateActionArea() {
    const actionArea = document.getElementById('actionArea');
    if (!actionArea) {
        console.error('Action area not found in the DOM');
        return;
    }

    actionArea.innerHTML = '';

    if (gameState.phase === "待機中") {
        actionArea.innerHTML = `<p>他のプレイヤーの参加を待っています。現在のプレイヤー数: ${gameState.players.length}</p>`;
    } else if (gameState.phase === "役職確認") {
        actionArea.innerHTML = `<p>あなたの役職は ${currentPlayer.role} です。</p>`;
    } else if (gameState.phase === "占い師" && currentPlayer.role === "占い師") {
        actionArea.innerHTML = `
            <p>誰を占いますか？</p>
            ${gameState.players.map(player => 
                player.id !== currentPlayer.id ? 
                `<button onclick="window.executeAction('占い師', '${player.id}')">占う: ${player.name}</button>` : 
                ''
            ).join('')}
            <button onclick="window.executeAction('占い師', 'graveyard')">墓地を占う</button>
        `;
    } else if (gameState.phase === "人狼" && currentPlayer.role === "人狼") {
        actionArea.innerHTML = `<button onclick="window.executeAction('人狼', null)">他の人狼を確認</button>`;
    } else if (gameState.phase === "怪盗" && currentPlayer.role === "怪盗") {
        actionArea.innerHTML = `
            <p>誰と役職を交換しますか？</p>
            ${gameState.players.map(player => 
                player.id !== currentPlayer.id ? 
                `<button onclick="window.executeAction('怪盗', '${player.id}')">交換: ${player.name}</button>` : 
                ''
            ).join('')}
            <button onclick="window.executeAction('怪盗', null)">交換しない</button>
        `;
    } else if (gameState.phase === "投票" && !gameState.votes[currentPlayer.id]) {
        actionArea.innerHTML = `
            <p>誰に投票しますか？</p>
            ${gameState.players.map(player => 
                player.id !== currentPlayer.id ? 
                `<button onclick="window.vote('${player.id}')">投票: ${player.name}</button>` : 
                ''
            ).join('')}
        `;
    } else if (gameState.phase === "結果") {
        actionArea.innerHTML = `<p>ゲーム結果: ${gameState.result}</p>`;
    } else {
        actionArea.innerHTML = `<p>現在のフェーズ: ${gameState.phase}</p>`;
    }
}

export function showActionResult(result) {
    const actionResultElement = document.getElementById('actionResult');
    if (actionResultElement) {
        actionResultElement.textContent = result;
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

// 初期UIの更新
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
});
