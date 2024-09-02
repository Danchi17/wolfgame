import { gameState, currentPlayer, updateGameState, roles } from './game.js';
import { sendToAll } from './network.js';
import { updateUI } from './ui.js';

export function handleAction(action, playerId) {
    console.log('Action handled:', action, 'for player:', playerId);
    // 具体的なアクション処理のロジックをここに実装
}

export function performAction(action, target) {
    if (gameState.actions[currentPlayer.id]) {
        return '既にアクションを実行しています。';
    }

    if (!isCorrectPhaseForAction(action)) {
        return 'このフェーズではその行動を取ることができません。';
    }

    let result = '';

    switch (action) {
        case '占い師':
        case '占い人狼':
        case '占い師の弟子':
            result = handleSeerAction(target);
            break;
        case '占星術師':
            result = handleAstrologerAction();
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

function isCorrectPhaseForAction(action) {
    switch (gameState.phase) {
        case '占い師':
            return ['占い師', '占い人狼', '占い師の弟子', '占星術師'].includes(action);
        case '人狼':
            return ['人狼', '大熊', 'やっかいな豚男', '蛇女', '博識な子犬', 'スパイ'].includes(action);
        case '怪盗':
            return action === '怪盗';
        default:
            return false;
    }
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

function handleAstrologerAction() {
    const allRoles = [
        ...gameState.players.map(p => gameState.assignedRoles[p.id]),
        ...gameState.centerCards.map(card => card.name)
    ];
    const werewolfCount = allRoles.filter(role => 
        roles.find(r => r.name === role && r.team === '人狼')
    ).length;
    return `場に存在する人狼陣営の役職の数: ${werewolfCount}`;
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

    return `${targetPlayer.name}と役職を交換しました。あなたの新しい役職: ${targetRole}`;
}

function handleWerewolfAction(playerRole) {
    const werewolfTeam = roles.filter(role => role.team === '人狼').map(role => role.name);
    const visibleWerewolfTeam = [...werewolfTeam, 'スパイ'];

    let visiblePlayers;

    if (playerRole === 'スパイ' || werewolfTeam.includes(playerRole)) {
        visiblePlayers = gameState.players.filter(p => 
            p.id !== currentPlayer.id && 
            visibleWerewolfTeam.includes(gameState.assignedRoles[p.id]) &&
            gameState.assignedRoles[p.id] !== '占い人狼'
        );
    } else {
        return '人狼陣営ではありません。';
    }

    if (playerRole === '占い人狼') {
        return 'あなたは占い人狼です。他の人狼を確認することはできません。';
    }

    if (visiblePlayers.length > 0) {
        return `人狼陣営のプレイヤー: ${visiblePlayers.map(p => p.name).join(', ')}`;
    } else {
        return 'あなたは唯一の人狼陣営のプレイヤーです。（占い人狼がいる可能性があります）';
    }
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

    if (Object.keys(gameState.votes).length === gameState.players.length) {
        calculateResults();
    }
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

function calculateResults() {
    const voteCount = {};
    const voteDetails = {};
    for (const [voterId, targetId] of Object.entries(gameState.votes)) {
        const voteWeight = gameState.assignedRoles[voterId] === '村長' ? 2 : 1;
        voteCount[targetId] = (voteCount[targetId] || 0) + voteWeight;
        voteDetails[voterId] = { targetId, weight: voteWeight };
    }
    const maxVotes = Math.max(...Object.values(voteCount));
    const executedPlayers = Object.keys(voteCount).filter(id => voteCount[id] === maxVotes);

    let result = "";
    let winningTeam = "";

    if (checkSpecialVictoryConditions(executedPlayers)) {
        // 特殊勝利条件が満たされた場合、結果は既に更新されています
    } else {
        const werewolfExecuted = executedPlayers.some(id => 
            roles.find(r => r.name === gameState.assignedRoles[id] && r.team === '人狼')
        );

        if (werewolfExecuted) {
            result = "人狼が処刑されました。市民陣営の勝利！";
            winningTeam = "市民";
        } else {
            result = "人狼は生き残りました。人狼陣営の勝利！";
            winningTeam = "人狼";
        }
    }

    // プレイヤーの持ち点を更新
    const updatedPlayers = gameState.players.map(player => {
        const playerRole = roles.find(r => r.name === gameState.assignedRoles[player.id]);
        if (winningTeam !== playerRole.team) {
            return { ...player, points: player.points - playerRole.cost };
        }
        return player;
    });

    updateGameState(prevState => ({
        ...prevState,
        result: result,
        winningTeam: winningTeam,
        executedPlayers: executedPlayers,
        voteResults: voteCount,
        voteDetails: voteDetails,
        players: updatedPlayers,
        waitingForNextRound: true,
        phase: "結果"
    }));

    sendToAll({ 
        type: 'gameResult', 
        result: gameState.result, 
        winningTeam: gameState.winningTeam, 
        voteResults: gameState.voteResults,
        voteDetails: gameState.voteDetails,
        updatedPlayers: gameState.players
    });
    updateUI();
}

function checkSpecialVictoryConditions(executedPlayers) {
    // 大熊の特殊勝利条件
    const bearPlayer = gameState.players.find(p => gameState.assignedRoles[p.id] === '大熊');
    if (bearPlayer && executedPlayers.includes(bearPlayer.id)) {
        const werewolfCount = gameState.players.filter(p => 
            roles.find(r => r.name === gameState.assignedRoles[p.id] && r.team === '人狼')
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

export function usePigmanAbility(targetId) {
    const targetPlayer = gameState.players.find(p => p.id === targetId);
    if (!targetPlayer) {
        return 'プレイヤーが見つかりません。';
    }
    updateGameState(prevState => ({
        ...prevState,
        pigmanMark: targetId,
        pigmanMarkTimeout: Date.now() + 60000 // 1分後
    }));
    return `${targetPlayer.name}に★マークを付与しました。`;
}

export function useKnowledgeablePuppyAbility(guessedRole, targetPlayerId) {
    const targetRole = gameState.assignedRoles[targetPlayerId];
    const citizenRoles = ['占星術師', '占い師の弟子', '無法者', '村長'];
    let result = '';
    let winningTeam = '';

    if (guessedRole === targetRole && citizenRoles.includes(targetRole)) {
        result = "博識な子犬が市民の役職を正しく推測しました。人狼陣営の勝利！";
        winningTeam = "人狼";
    } else {
        result = "博識な子犬の推測が外れました。ゲームを続行します。";
        winningTeam = null;
    }

    // プレイヤーの持ち点を更新
    const updatedPlayers = gameState.players.map(player => {
        const playerRole = roles.find(r => r.name === gameState.assignedRoles[player.id]);
        if (winningTeam && winningTeam !== playerRole.team) {
            return { ...player, points: player.points - playerRole.cost };
        }
        return player;
    });

    updateGameState(prevState => ({
        ...prevState,
        result: result,
        winningTeam: winningTeam,
        players: updatedPlayers,
        waitingForNextRound: winningTeam !== null,
        phase: winningTeam !== null ? "結果" : prevState.phase
    }));

    sendToAll({ 
        type: 'gameResult', 
        result: result, 
        winningTeam: winningTeam, 
        updatedPlayers: gameState.players
    });
    updateUI();
    return result;
}

export function reportSpy(reportedPlayerId) {
    const reportedRole = gameState.assignedRoles[reportedPlayerId];
    let result = '';
    let winningTeam = '';

    if (reportedRole === 'スパイ') {
        result = "スパイが発覚しました。市民陣営の敗北！";
        winningTeam = "人狼";
    } else {
        result = "スパイの通報に失敗しました。通報者の持ち点が3点減少しました。";
        winningTeam = null;
    }

    const updatedPlayers = gameState.players.map(player => {
        if (player.id === currentPlayer.id && reportedRole !== 'スパイ') {
            return { ...player, points: player.points - 3 };
        } else if (winningTeam) {
            const playerRole = roles.const playerRole = roles.find(r => r.name === gameState.assignedRoles[player.id]);
            if (winningTeam !== playerRole.team) {
                return { ...player, points: player.points - playerRole.cost };
            }
        }
        return player;
    });

    updateGameState(prevState => ({
        ...prevState,
        result: result,
        winningTeam: winningTeam,
        players: updatedPlayers,
        waitingForNextRound: true,
        phase: "結果"
    }));

    sendToAll({ 
        type: 'gameResult', 
        result: result, 
        winningTeam: winningTeam, 
        updatedPlayers: gameState.players
    });
    updateUI();
    return result;
}

export function startNewRound() {
    updateGameState(prevState => ({
        ...prevState,
        phase: "待機中",
        assignedRoles: {},
        roleChanges: {},
        centerCards: [],
        actions: {},
        votes: {},
        voteDetails: {},
        result: "",
        winningTeam: "",
        pigmanMark: null,
        pigmanMarkTimeout: null,
        waitingForNextRound: false,
        roundNumber: prevState.roundNumber + 1,
        voteResults: {}
    }));
    sendToAll({ type: 'newRound', state: gameState });
    updateUI();
}
