function updateUI() {
    document.getElementById('setupArea').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';

    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    gameState.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        let roleToShow = '?';
        if (gameState.phase === "役職確認" || player.id === currentPlayer.id) {
            roleToShow = gameState.assignedRoles[player.id];
        } else if (gameState.phase === "結果") {
            roleToShow = gameState.assignedRoles[player.id];
        }
        playerDiv.textContent = `${player.name}: ${roleToShow}`;
        playerList.appendChild(playerDiv);
    });

    document.getElementById('gameInfo').textContent = `ゲームフェーズ: ${gameState.phase}`;
    if (gameState.phase === "結果") {
        document.getElementById('gameInfo').textContent += ` - ${gameState.result}`;
    }
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
    } else if (gameState.phase === currentPlayer.originalRole && !gameState.actions[currentPlayer.id]) {
        switch (currentPlayer.originalRole) {
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

function showActionResult(result) {
    document.getElementById('actionResult').textContent = result;
}
