import { gameState, currentPlayer, isHost } from './game.js';
import { performAction, vote } from './actions.js';

export function updateUI() {

    console.log('updateUI called');
console.log('setupArea:', document.getElementById('setupArea'));
console.log('gameArea:', document.getElementById('gameArea'));console.log("Updating UI. Current game phase:", gameState.phase);
    console.log("Current game state:", gameState);
    console.log("Is host:", isHost);
    console.log("Current player:", currentPlayer);

    const setupArea = document.getElementById('setupArea');
    const gameArea = document.getElementById('gameArea');

    if (gameState.phase === "待機中") {
        setupArea.style.display = 'block';
        gameArea.style.display = 'none';
        console.log("Displaying setup area");
    } else {
        setupArea.style.display = 'none';
        gameArea.style.display = 'block';
        console.log("Displaying game area");
    }

    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    gameState.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        let roleToShow = '?';
        if (gameState.phase === "役職確認" || player.id === currentPlayer.id) {
            roleToShow = gameState.assignedRoles[player.id] || '未割り当て';
        } else if (gameState.phase === "結果") {
            roleToShow = gameState.assignedRoles[player.id] || '未割り当て';
        }
        playerDiv.textContent = `${player.name}: ${roleToShow}`;
        playerList.appendChild(playerDiv);
    });

    document.getElementById('gameInfo').textContent = `ゲームフェーズ: ${gameState.phase}`;
    if (gameState.phase === "結果") {
        document.getElementById('gameInfo').textContent += ` - ${gameState.result}`;
    }

    const startGameButton = document.getElementById('startGame');
    const shouldShowStartButton = isHost && gameState.players.length >= 3 && gameState.phase === "待機中";
    startGameButton.style.display = shouldShowStartButton ? 'inline' : 'none';
    console.log("Should show start game button:", shouldShowStartButton);
    console.log("Start game button display:", startGameButton.style.display);

    document.getElementById('nextPhase').style.display = (isHost && gameState.phase !== "待機中" && gameState.phase !== "結果") ? 'inline' : 'none';
    document.getElementById('resetGame').style.display = (isHost && gameState.phase === "結果") ? 'inline' : 'none';

    updateActionArea();
}

function updateActionArea() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = '';

    if (gameState.phase === "役職確認") {
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
    document.getElementById('actionResult').textContent = result;
}

// グローバルスコープで関数を利用可能にする
window.performAction = performAction;
window.vote = vote;
