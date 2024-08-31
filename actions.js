import { gameState, currentPlayer, updateGameState } from './game.js';
import { sendToAll, sendToPlayer } from './network.js';
import { updateUI } from './ui.js';
import { applyResults } from './game.js';

export function handleAction(action, playerId) {
    console.log('Action handled:', action, 'for player:', playerId);
}

export function handleVote(voterId, targetId) {
    updateGameState(prevState => ({
        ...prevState,
        votes: {
            ...prevState.votes,
            [voterId]: targetId
        }
    }));
    if (Object.keys(gameState.votes).length === gameState.players.length) {
        calculateResults();
    }
}

export function calculateResults() {
    const voteCount = {};
    for (const targetId of Object.values(gameState.votes)) {
        voteCount[targetId] = (voteCount[targetId] || 0) + 1;
    }
    const maxVotes = Math.max(...Object.values(voteCount));
    const executedPlayers = Object.keys(voteCount).filter(id => voteCount[id] === maxVotes);

    let result = "";
    let winningTeam = "";

    // 特殊勝利条件のチェック
    if (checkSpecialVictoryConditions(executedPlayers)) {
        return;
    }

    // 通常の勝利条件
    const werewolfExecuted = executedPlayers.some(id => 
        ['人狼', '大熊', '占い人狼', 'やっかいな豚男', '蛇女', '博識な子犬'].includes(gameState.assignedRoles[id])
    );

    if (werewolfExecuted) {
        result = "人狼が処刑されました。市民陣営の勝利！";
        winningTeam = "市民";
    } else {
        result = "人狼は生き残りました。人狼陣営の勝利！";
        winningTeam = "人狼";
    }

    // チップ掛けの結果を処理
    handleBettingResults(winningTeam);

    updateGameState(prevState => ({
        ...prevState,
        phase: "結果",
        result: result
    }));

    sendToAll({ type: 'gameState', state: gameState });
    updateUI();

    // Add this line to call applyResults
    applyResults();
}

export function performAction(role, target) {
    if (gameState.actions[currentPlayer.id]) {
        return '既にアクションを実行しています。';
    }

    const action = { role, target };
    let result = '';

    switch (role) {
        case '占い師':
        case '占い人狼':
            result = handleSeerAction(target);
            break;
        case '怪盗':
            result = handleThiefAction(target);
            break;
        case '人狼':
        case '大熊':
            result = handleWerewolfAction();
            break;
        case 'やっかいな豚男':
            result = handleTroublesomePigmanAction(target);
            break;
        case 'スパイ':
            result = handleSpyAction();
            break;
        case 'ギャンブラー':
        case '博識な子犬':
            result = 'チップ掛けのターンでアクションを実行できます。';
            break;
        default:
            result = '特別なアクションはありません。';
    }

    updateGameState(prevState => ({
        ...prevState,
        actions: {
            ...prevState.actions,
            [currentPlayer.id]: action
        }
    }));

    sendToPlayer(currentPlayer.id, { type: 'actionResult', result, playerId: currentPlayer.id });

    return result;
}

function handleSeerAction(target) {
    if (target === 'graveyard') {
        return `墓地の役職: ${gameState.centerCards.map(card => card.name).join(', ')}`;
    } else {
        const targetRole = gameState.assignedRoles[target];
        const targetPlayer = gameState.players.find(p => p.id === target);
        return `${targetPlayer.name}の役職: ${targetRole}`;
    }
}

function handleThiefAction(target) {
    if (target) {
        const thiefRole = gameState.assignedRoles[currentPlayer.id];
        const targetRole = gameState.assignedRoles[target];
        const targetPlayer = gameState.players.find(p => p.id === target);

        updateGameState(prevState => ({
            ...prevState,
            assignedRoles: {
                ...prevState.assignedRoles,
                [currentPlayer.id]: targetRole,
                [target]: thiefRole
            },
            roleChanges: {
                ...prevState.roleChanges,
                [currentPlayer.id]: { from: thiefRole, to: targetRole },
                [target]: { from: targetRole, to: thiefRole }
            }
        }));

        currentPlayer.role = targetRole;
        currentPlayer.originalRole = "怪盗";
        return `${targetPlayer.name}と役職を交換しました。あなたの新しい役職: ${targetRole}`;
    } else {
        return '役職の交換をしませんでした。';
    }
}

function handleWerewolfAction() {
    const otherWerewolves = gameState.players.filter(p => 
        p.id !== currentPlayer.id && 
        (gameState.assignedRoles[p.id] === '人狼' || gameState.assignedRoles[p.id] === '大熊' || gameState.assignedRoles[p.id] === '占い人狼')
    );
    return otherWerewolves.length > 0 ? 
        `他の人狼: ${otherWerewolves.map(p => p.name).join(', ')}` : 
        'あなたは唯一の人狼です。';
}

function handleTroublesomePigmanAction(target) {
    const targetPlayer = gameState.players.find(p => p.id === target);
    updateGameState(prevState => ({
        ...prevState,
        troublesomePigmanMark: target
    }));
    return `${targetPlayer.name}に★マークを付与しました。`;
}

function handleSpyAction() {
    const werewolves = gameState.players.filter(p => 
        gameState.assignedRoles[p.id] === '人狼' || 
        gameState.assignedRoles[p.id] === '大熊' || 
        gameState.assignedRoles[p.id] === '占い人狼'
    );
    return `人狼陣営のプレイヤー: ${werewolves.map(p => p.name).join(', ')}`;
}

export function vote(targetId) {
    updateGameState(prevState => ({
        ...prevState,
        votes: {
            ...prevState.votes,
            [currentPlayer.id]: targetId
        }
    }));
    sendToAll({ type: 'vote', voterId: currentPlayer.id, targetId: targetId });
}

export function placeBet(amount, guessedRole) {
    updateGameState(prevState => ({
        ...prevState,
        chips: {
            ...prevState.chips,
            [currentPlayer.id]: { amount, guessedRole }
        }
    }));
    sendToAll({ type: 'bet', betterId: currentPlayer.id, amount: amount, guessedRole: guessedRole });
}

function checkSpecialVictoryConditions(executedPlayers) {
    // 大熊の特殊勝利条件
    if (executedPlayers.includes(gameState.players.find(p => gameState.assignedRoles[p.id] === '大熊')?.id)) {
        const werewolfCount = gameState.players.filter(p => 
            ['人狼', '大熊', '占い人狼', 'やっかいな豚男', '蛇女', '博識な子犬'].includes(gameState.assignedRoles[p.id])
        ).length;
        if (werewolfCount > gameState.players.length / 2) {
            updateGameState(prevState => ({
                ...prevState,
                phase: "結果",
                result: "大熊の特殊勝利条件達成！人狼陣営の勝利！"
            }));
            sendToAll({ type: 'gameState', state: gameState });
            updateUI();
            return true;
        }
    }

    // 蛇女の特殊勝利条件
    if (executedPlayers.length > 1 && executedPlayers.includes(gameState.players.find(p => gameState.assignedRoles[p.id] === '蛇女')?.id)) {
        updateGameState(prevState => ({
            ...prevState,
            phase: "結果",
            result: "蛇女の特殊勝利条件達成！蛇女の単独勝利！"
        }));
        sendToAll({ type: 'gameState', state: gameState });
        updateUI();
        return true;
    }

    // 全員が右隣に投票した場合の特殊勝利条件
    const allVotedRight = gameState.players.every((player, index) => {
        const rightNeighborIndex = (index + 1) % gameState.players.length;
        return gameState.votes[player.id] === gameState.players[rightNeighborIndex].id;
    });
    if (allVotedRight) {
        updateGameState(prevState => ({
            ...prevState,
            phase: "結果",
            result: "全員が右隣に投票しました。特殊勝利条件達成！"
        }));
        sendToAll({ type: 'gameState', state: gameState });
        updateUI();
        return true;
    }

    return false;
}

function handleBettingResults(winningTeam) {
    for (const [playerId, bet] of Object.entries(gameState.chips)) {
        const player = gameState.players.find(p => p.id === playerId);
        const playerRole = gameState.assignedRoles[playerId];

        if (playerRole === 'ギャンブラー' && winningTeam === '人狼') {
            if (bet.guessedRole === gameState.assignedRoles[gameState.votes[playerId]]) {
                updateGameState(prevState => ({
                    ...prevState,
                    result: `${player.name}(ギャンブラー)が人狼の役職を当てました。ギャンブラーの逆転勝利！`,
                    players: prevState.players.map(p => p.id === playerId ? {...p, points: p.points + bet.amount} : p)
                }));
                return;
            } else {
                updateGameState(prevState => ({
                    ...prevState,
                    players: prevState.players.map(p => p.id === playerId ? {...p, points: p.points - bet.amount - 1} : p)
                }));
            }
        } else if (playerRole === '博識な子犬' && winningTeam === '市民') {
            if (bet.guessedRole === gameState.assignedRoles[gameState.votes[playerId]]) {
                updateGameState(prevState => ({
                    ...prevState,
                    result: `${player.name}(博識な子犬)が市民の役職を当てました。博識な子犬の逆転勝利！`,
                    players: prevState.players.map(p => p.id === playerId ? {...p, points: p.points + bet.amount} : p)
                }));
                return;
            } else {
                updateGameState(prevState => ({
                    ...prevState,
                    players: prevState.players.map(p => p.id === playerId ? {...p, points: p.points - bet.amount - 1} : p)
                }));
            }
        }
    }

    // サイキックの能力を適用
    const psychic = gameState.players.find(p => gameState.assignedRoles[p.id] === 'サイキック');
    if (psychic && Object.keys(gameState.chips).length > 0) {
        updateGameState(prevState => ({
            ...prevState,
            players: prevState.players.map(p => {
                if (p.id !== psychic.id && gameState.chips[p.id]) {
                    return {...p, points: p.points - 2};
                }
                return p;
            })
        }));
    }
}
