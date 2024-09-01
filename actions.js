import { gameState, currentPlayer, updateGameState } from './game.js';
import { sendToAll, sendToPlayer } from './network.js';
import { updateUI } from './ui.js';
import { applyResults, checkSpecialVictoryConditions } from './game.js';

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
    for (const [voterId, targetId] of Object.entries(gameState.votes)) {
        // 村長の投票は2票としてカウント
        const voteWeight = gameState.assignedRoles[voterId] === '村長' ? 2 : 1;
        voteCount[targetId] = (voteCount[targetId] || 0) + voteWeight;
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
        case '占星術師':
            result = handleAstrologerAction();
            break;
        case 'ギャンブラー':
            result = handleGamblerAction(target);
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

function handleAstrologerAction() {
    const allRoles = [
        ...gameState.players.map(p => gameState.assignedRoles[p.id]),
        ...gameState.centerCards.map(card => card.name)
    ];
    const werewolfCount = allRoles.filter(role => 
        ['人狼', '大熊', '占い人狼', 'やっかいな豚男', '蛇女', '博識な子犬'].includes(role)
    ).length;
    return `場に存在する人狼陣営の役職の数: ${werewolfCount}`;
}

function handleGamblerAction(cardIndex) {
    const playerRole = gameState.assignedRoles[currentPlayer.id];
    const graveyardRole = gameState.centerCards[cardIndex];

    updateGameState(prevState => ({
        ...prevState,
        assignedRoles: {
            ...prevState.assignedRoles,
            [currentPlayer.id]: graveyardRole.name
        },
        centerCards: [
            ...prevState.centerCards.slice(0, cardIndex),
            { name: playerRole },
            ...prevState.centerCards.slice(cardIndex + 1)
        ],
        roleChanges: {
            ...prevState.roleChanges,
            [currentPlayer.id]: { from: playerRole, to: graveyardRole.name }
        }
    }));

    return `あなたの新しい役職: ${graveyardRole.name}`;
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

export function useKnowledgeablePuppyAbility(guessedRole, targetPlayerId) {
    const targetRole = gameState.assignedRoles[targetPlayerId];
    if (guessedRole === targetRole && gameState.roles.find(r => r.name === targetRole).team === '市民') {
        updateGameState(prevState => ({
            ...prevState,
            result: "博識な子犬が市民の役職を正しく推測しました。人狼陣営の勝利！",
            winningTeam: "人狼"
        }));
        applyResults();
        return "市民の役職を正しく推測しました。人狼陣営の勝利です！";
    } else {
        return '推測が外れました。または、推測した役職が市民陣営ではありませんでした。';
    }
}

export function useSpyAbility() {
    const spyPlayer = gameState.players.find(p => gameState.assignedRoles[p.id] === 'スパイ');
    if (spyPlayer && spyPlayer.id === currentPlayer.id) {
        updateGameState(prevState => ({
            ...prevState,
            result: "スパイが発覚しました。市民陣営の敗北！",
            winningTeam: "人狼"
        }));
        applyResults();
        return "スパイが発覚しました。市民陣営の敗北です！";
    } else {
        return 'あなたはスパイではありません。';
    }
}

export function checkWinningCondition() {
    const executedPlayers = Object.keys(gameState.votes).filter(playerId => 
        Object.values(gameState.votes).filter(v => v === playerId).length === Math.max(...Object.values(gameState.votes).map(v => Object.values(gameState.votes).filter(vv => vv === v).length))
    );

    if (checkSpecialVictoryConditions(executedPlayers)) {
        return;
    }

    const werewolfExecuted = executedPlayers.some(id => 
        ['人狼', '大熊', '占い人狼', 'やっかいな豚男', '蛇女', '博識な子犬'].includes(gameState.assignedRoles[id])
    );

    updateGameState(prevState => ({
        ...prevState,
        result: werewolfExecuted ? "人狼が処刑されました。市民陣営の勝利！" : "人狼は生き残りました。人狼陣営の勝利！",
        winningTeam: werewolfExecuted ? "市民" : "人狼"
    }));

    applyResults();
}
