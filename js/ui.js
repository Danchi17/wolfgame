import { getGameState } from './game/gameState.js';
import { startGame, nextPhase } from './game/gamePhases.js';
import { performAction } from './actions/playerActions.js';
import { castVote } from './actions/voteActions.js';
import { joinGame } from './network.js';
import { getPlayerRole } from './game/roleLogic.js';
import { usePigmanAbility, useKnowledgeablePuppyAbility, reportSpy } from './actions/specialActions.js';

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
        } else {
            alert('プレイヤー名を入力してください。');
        }
    });

    document.getElementById('joinGame').addEventListener('click', () => {
        const playerName = document.getElementById('playerName').value;
        const gameId = document.getElementById('gameId').value;
        if (playerName && gameId) {
            joinGame(gameId, playerName);
        } else {
            alert('プレイヤー名とゲームIDを入力してください。');
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

    const currentPlayerRole = getPlayerRole(state.currentPlayerId);

    if (['占い師', '人狼', '怪盗'].includes(state.phase)) {
        if (currentPlayerRole && currentPlayerRole.name === state.phase) {
            state.players.forEach(player => {
                if (player.id !== state.currentPlayerId) {
                    const button = document.createElement('button');
                    button.textContent = `${player.name}に対してアクション`;
                    button.addEventListener('click', () => {
                        try {
                            const result = performAction(state.currentPlayerId, state.phase, player.id);
                            alert(result);
                            renderUI();
                        } catch (error) {
                            alert(`エラーが発生しました: ${error.message}`);
                        }
                    });
                    actionArea.appendChild(button);
                }
            });
        } else {
            actionArea.innerHTML = '<p>現在のフェーズではアクションを実行できません。</p>';
        }
    } else if (state.phase === '投票') {
        state.players.forEach(player => {
            if (player.id !== state.currentPlayerId) {
                const button = document.createElement('button');
                button.textContent = `${player.name}に投票`;
                button.addEventListener('click', () => {
                    try {
                        const result = castVote(state.currentPlayerId, player.id);
                        if (result) {
                            alert(result);
                        }
                        renderUI();
                    } catch (error) {
                        alert(`エラーが発生しました: ${error.message}`);
                    }
                });
                actionArea.appendChild(button);
            }
        });
    } else if (state.phase === '結果') {
        const resultElement = document.createElement('p');
        resultElement.textContent = state.result || '結果はまだ発表されていません。';
        actionArea.appendChild(resultElement);
    }

    // 特殊能力のボタンを追加
    if (currentPlayerRole) {
        switch (currentPlayerRole.name) {
            case 'やっかいな豚男':
                if (state.phase === '人狼') {
                    const pigmanButton = document.createElement('button');
                    pigmanButton.textContent = '★マークを付与';
                    pigmanButton.addEventListener('click', () => {
                        const targetId = prompt('対象のプレイヤーIDを入力してください:');
                        if (targetId) {
                            try {
                                const result = usePigmanAbility(state.currentPlayerId, targetId);
                                alert(result);
                                renderUI();
                            } catch (error) {
                                alert(`エラーが発生しました: ${error.message}`);
                            }
                        }
                    });
                    actionArea.appendChild(pigmanButton);
                }
                break;
            case '博識な子犬':
                if (state.phase === '議論') {
                    const puppyButton = document.createElement('button');
                    puppyButton.textContent = '役職を推測';
                    puppyButton.addEventListener('click', () => {
                        const targetId = prompt('対象のプレイヤーIDを入力してください:');
                        const guessedRole = prompt('推測する役職名を入力してください:');
                        if (targetId && guessedRole) {
                            try {
                                const result = useKnowledgeablePuppyAbility(state.currentPlayerId, guessedRole, targetId);
                                alert(result);
                                renderUI();
                            } catch (error) {
                                alert(`エラーが発生しました: ${error.message}`);
                            }
                        }
                    });
                    actionArea.appendChild(puppyButton);
                }
                break;
            case 'スパイ':
                const spyButton = document.createElement('button');
                spyButton.textContent = 'スパイを通報';
                spyButton.addEventListener('click', () => {
                    const suspectedSpyId = prompt('スパイだと疑うプレイヤーIDを入力してください:');
                    if (suspectedSpyId) {
                        try {
                            const result = reportSpy(state.currentPlayerId, suspectedSpyId);
                            alert(result);
                            renderUI();
                        } catch (error) {
                            alert(`エラーが発生しました: ${error.message}`);
                        }
                    }
                });
                actionArea.appendChild(spyButton);
                break;
        }
    }
};

// UIの初期レンダリング
document.addEventListener('DOMContentLoaded', renderUI);

// エラーハンドリングの追加
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    alert('予期せぬエラーが発生しました。ページをリロードしてください。');
});
