import { gameState, currentPlayer, isHost } from './game.js';
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

    // ゲームが作成されたらすぐにゲームエリアを表示
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
                roleToShow = gameState.assignedRoles[player.id] || '未割り当て';
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
        const shouldShowStartButton = isHost && gameState.players.length >= 3 && gameState.phase === "待機中";
        startGameButton.style.display = shouldShowStartButton ? 'inline' : 'none';
        console.log("Should show start game button:", shouldShowStartButton);
        console.log("Start game button display:", startGameButton.style.display);
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
    } else if (gameState.phase === currentPlayer.originalRole && !gameState.actions[currentPlayer.id]) {
        switch (currentPlayer.originalRole) {
            case '占い師':
                actionArea.innerHTML = `
                    <p>誰を占いますか？</p>
                    ${gameState.players.map(player => 
                        player.id !== currentPlayer.id ? 
                        `<button onclick="window.performAction('占い師', '${player.id}')">占う: ${player.name}</button>` : 
                        ''
                    ).join('')}
                    <button onclick="window.performAction('占い師', 'graveyard')">墓地を占う</button>
                `;
                break;
            case '怪盗':
                actionArea.innerHTML = `
                    <p>誰と役職を交換しますか？</p>
                    ${gameState.players.map(player => 
                        player.id !== currentPlayer.id ? 
                        `<button onclick="window.performAction('怪盗', '${player.id}')">交換: ${player.name}</button>` : 
                        ''
                    ).join('')}
                    <button onclick="window.performAction('怪盗', null)">交換しない</button>
                `;
                break;
            case '人狼':
                actionArea.innerHTML = `<button onclick="window.performAction('人狼', null)">他の人狼を確認</button>`;
                break;
        }
    } else if (gameState.phase === "投票" && !gameState.votes[currentPlayer.id]) {
        actionArea.innerHTML = `
            <p>誰に投票しますか？</p>
            ${gameState.players.map(player => 
                player.id !== currentPlayer.id ? 
                `<button onclick="window.vote('${player.id}')">投票: ${player.name}</button>` : 
                ''
            ).join('')}
        `;
    }
}

export function showActionResult(result) {
    const actionResultElement = document.getElementById('actionResult');
    if (actionResultElement) {
        actionResultElement.textContent = result;
    }
}

// グローバルスコープで関数を利用可能にする
window.updateUI = updateUI;
window.performAction = performAction;
window.vote = vote;
