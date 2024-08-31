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
    let specialVictory = false;

    // 特殊勝利条件のチェック
    if (checkSpecialVictoryConditions(executedPlayers)) {
        specialVictory = true;
    } else {
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
    }

    // チップ掛けの結果を処理
    handleBettingResults(winningTeam);

    updateGameState(prevState => ({
        ...prevState,
        phase: "結果",
        result: result,
        specialVictory: specialVictory,
        winningTeam: winningTeam,
        executedPlayers: executedPlayers
    }));

    sendToAll({ type: 'gameState', state: gameState });
    updateUI();

    applyResults();
}

export function performAction(action, target) {
    if (gameState.actions[currentPlayer.id]) {
        return '既にアクションを実行しています。';
    }

    let result = '';

    switch (action) {
        case '占い師':
        case '占い人狼':
            result = handleSeerAction(target);
            break;
        case '怪盗':
            result = handleThiefAction(target);
            break;
        case '人狼':
        case '大熊':
        case 'やっかいな豚男':
        case '蛇女':
        case '博識な子犬':
        case 'スパイ':
            result = handleWerewolfAction(action);
            break;
        default:
            result = '特別なアクションはありません。';
    }

    updateGameState(prevState => ({
        ...prevState,
        actions: {
            ...prevState.actions,
            [currentPlayer.id]: { action, target }
        }
    }));

    sendToAll({ type: 'action', playerId: currentPlayer.id, action, target });
    return result;
}

function handleSeerAction(target) {
    if (target === 'graveyard') {
        const graveyardRoles = gameState.centerCards.map(card => card.name);
        return `墓地の役職: ${graveyardRoles.join(', ')}`;
    } else {
        const targetRole = gameState.assignedRoles[target];
        const targetPlayer = gameState.players.find(p => p.id === target);
        if (targetPlayer) {
            return `${targetPlayer.name}の役職: ${targetRole}`;
        } else {
            return 'プレイヤーが見つかりません。';
        }
    }
}

function handleThiefAction(target) {
    if (!target) return '役職の交換をしませんでした。';

    const thiefRole = gameState.assignedRoles[currentPlayer.id];
    const targetRole = gameState.assignedRoles[target];
    const targetPlayer = gameState.players.find(p => p.id === target);

    if (!targetPlayer) {
        return 'プレイヤーが見つかりません。';
    }

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

    return `役職を交換しました。あなたの新しい役職: ${targetRole}`;
}

function handleWerewolfAction(playerRole) {
    const werewolfTeam = ['人狼', '大熊', 'やっかいな豚男', '蛇女', '博識な子犬'];
    const visibleWerewolfTeam = [...werewolfTeam, 'スパイ'];

    let visiblePlayers;

    if (playerRole === 'スパイ' || werewolfTeam.includes(playerRole)) {
        // スパイと人狼陣営は占い人狼以外の人狼陣営（スパイを含む）を見ることができる
        visiblePlayers = gameState.players.filter(p => 
            p.id !== currentPlayer.id && 
            visibleWerewolfTeam.includes(gameState.assignedRoles[p.id]) &&
            gameState.assignedRoles[p.id] !== '占い人狼'
        );
    } else {
        return '人狼陣営ではありません。';
    }

    // 占い人狼は他の人狼を確認できない
    if (playerRole === '占い人狼') {
        return 'あなたは占い人狼です。他の人狼を確認することはできません。';
    }

    if (visiblePlayers.length > 0) {
        return `人狼陣営のプレイヤー: ${visiblePlayers.map(p => p.name).join(', ')}`;
    } else {
        return 'あなたは唯一の人狼陣営のプレイヤーです。（占い人狼がいる可能性があります）';
    }
}

function handleTroublesomePigmanAction(target) {
    const targetPlayer = gameState.players.find(p => p.id === target);
    if (!targetPlayer) {
        return 'プレイヤーが見つかりません。';
    }
    updateGameState(prevState => ({
        ...prevState,
        pigmanMark: target,
        pigmanMarkTimeout: Date.now() + 60000 // 1分後
    }));
    return `${targetPlayer.name}に★マークを付与しました。`;
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
    const bearPlayer = gameState.players.find(p => gameState.assignedRoles[p.id] === '大熊');
    if (bearPlayer && executedPlayers.includes(bearPlayer.id)) {
        const werewolfCount = gameState.players.filter(p => 
            ['人狼', '大熊', '占い人狼', 'やっかいな豚男', '蛇女', '博識な子犬'].includes(gameState.assignedRoles[p.id])
        ).length;
        if (werewolfCount > gameState.players.length / 2) {
            updateGameState(prevState => ({
                ...prevState,
                result: "大熊の特殊勝利条件達成！人狼陣営の勝利！",
                winningTeam: "人狼"
            }));
            return true;
        }
    }

    // 蛇女の特殊勝利条件
    const snakeWomanPlayer = gameState.players.find(p => gameState.assignedRoles[p.id] === '蛇女');
    if (snakeWomanPlayer && executedPlayers.length > 1 && executedPlayers.includes(snakeWomanPlayer.id)) {
        updateGameState(prevState => ({
            ...prevState,
            result: "蛇女の特殊勝利条件達成！蛇女の単独勝利！",
            winningTeam: "蛇女"
        }));
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
            result: "全員が右隣に投票しました。特殊勝利条件達成！",
            winningTeam: "全員"
        }));
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
                    players: prevState.players.map(p => p.id === playerId ? {...p, points: p.points + 1} : p)
                }));
                return;
            } else {
                updateGameState(prevState => ({
                    ...prevState,
                    players: prevState.players.map(p => p.id === playerId ? {...p, points: p.points - 2} : p)
                }));
            }
        } else if (playerRole === '博識な子犬' && winningTeam === '市民') {
            if (bet.guessedRole === gameState.assignedRoles[gameState.votes[playerId]]) {
                updateGameState(prevState => ({
                    ...prevState,
                    result: `${player.name}(博識な子犬)が市民の役職を当てました。博識な子犬の逆転勝利！`,
                    players: prevState.players.map(p => p.id === playerId ? {...p, points: p.points + 1} : p)
                }));
                return;
            } else {
                updateGameState(prevState => ({
                    ...prevState,
                    players: prevState.players.map(p => p.id === playerId ? {...p, points: p.points - 2} : p)
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
