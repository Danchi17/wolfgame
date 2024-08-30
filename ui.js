import { gameState, currentPlayer, isHost } from './game.js';
import { performAction, vote } from './actions.js';

export function updateUI() {
    // ... (既存のコード) ...

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
