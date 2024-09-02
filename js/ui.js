import { getGameState } from './game/gameState.js';
import { startGame, nextPhase } from './game/gamePhases.js';
import { performAction } from './actions/playerActions.js';
import { castVote } from './actions/voteActions.js';
import { joinGame } from './network.js';

export const renderUI = () => {
    const state = getGameState();
    const app = document.getElementById('app');
    app.innerHTML = '';

    if (state.phase === '待機中') {
        renderLobby(app);
    } else {
        renderGameBoard(app);
    }
};

const renderLobby = (container) => {
    container.innerHTML = `
        <h1>多能力一夜人狼</h1>
        <div id="setupArea">
            <input type="text" id="playerName" placeholder="プレイヤー名">
            <button id="createGame">ゲームを作成</button>
            <input type="text" id="gameId" placeholder="ゲームID">
            <button id="joinGame">ゲームに参加</button>
        </div>
    `;

    document.getElementById('createGame').addEventListener('click', () => {
        const playerName = document.getElementById('playerName').value;
        if (playerName) {
            startGame();
            renderUI();
        }
    });

    document.getElementById('joinGame').addEventListener('click', () => {
        const playerName = document.getElementById('playerName').value;
        const gameId = document.getElementById('gameId').value;
        if (playerName && gameId) {
            joinGame(gameId, playerName);
        }
    });
};

const renderGameBoard = (container) => {
    const state = getGameState();
    container.innerHTML = `
        <h1>多能力一夜人狼</h1>
        <div id="gameInfo">フェーズ: ${state.phase}</div>
        <div id="playerList"></div>
        <div id="actionArea"></div>
        <button id="nextPhase">次のフェーズへ</button>
    `;

    renderPlayers();
    renderActionArea();

    document.getElementById('nextPhase').addEventListener('click', () => {
        nextPhase();
        renderUI();
    });
};

const renderPlayers = () => {
    const state = getGameState();
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = state.players.map(player => `
        <div class="player">
            ${player.name}: ${state.assignedRoles[player.id] || '役職未定'}
        </div>
    `).join('');
};

const renderActionArea = () => {
    const state = getGameState();
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = '';

    if (['占い師', '人狼', '怪盗'].includes(state.phase)) {
        state.players.forEach(player => {
            if (player.id !== state.currentPlayerId) {
                const button = document.createElement('button');
                button.textContent = `${player.name}に対してアクション`;
                button.addEventListener('click', () => {
                    performAction(state.currentPlayerId, state.phase, player.id);
                    renderUI();
                });
                actionArea.appendChild(button);
            }
        });
    } else if (state.phase === '投票') {
        state.players.forEach(player => {
            if (player.id !== state.currentPlayerId) {
                const button = document.createElement('button');
                button.textContent = `${player.name}に投票`;
                button.addEventListener('click', () => {
                    castVote(state.currentPlayerId, player.id);
                    renderUI();
                });
                actionArea.appendChild(button);
            }
        });
    }
};

// UIの初期レンダリング
document.addEventListener('DOMContentLoaded', renderUI);
