'use strict';

// Firebase データベース参照
window.db = firebase.database();

// ゲーム状態のキャッシュ
let gameState = {
    players: [],
    currentPlayerId: null,
    phase: '待機中',
    assignedRoles: {},
    centerCards: [],
    actions: {},
    votes: {},
    result: '',
    gameId: null,
    host: null
};

// ゲーム状態の取得
window.getGameState = () => {
    return {...gameState};
};

// ゲームデータのパス取得
const getGamePath = () => {
    if (!gameState.gameId) {
        console.error('ゲームIDが設定されていません');
        return null;
    }
    return `games/${gameState.gameId}`;
};

// Firebase からゲーム状態を取得してキャッシュを更新
const syncGameStateFromFirebase = () => {
    const gamePath = getGamePath();
    if (!gamePath) return Promise.reject('ゲームパスが取得できません');
    
    return window.db.ref(gamePath).once('value')
        .then(snapshot => {
            const data = snapshot.val();
            if (!data) return Promise.reject('ゲームデータが見つかりません');
            
            // プレイヤーデータを配列に変換
            const players = [];
            if (data.players) {
                Object.keys(data.players).forEach(playerId => {
                    players.push({
                        id: playerId,
                        ...data.players[playerId]
                    });
                });
            }
            
            // ゲーム状態を更新
            gameState = {
                ...gameState,
                ...data,
                players,
                currentPlayerId: gameState.currentPlayerId // 自分のIDは維持
            };
            
            // イベント発火
            dispatchStateUpdate();
            return gameState;
        })
        .catch(error => {
            console.error('Firebase同期エラー:', error);
            return Promise.reject(error);
        });
};

// Firebase にゲーム状態を書き込む
const updateFirebaseGameState = (updates) => {
    const gamePath = getGamePath();
    if (!gamePath) return Promise.reject('ゲームパスが取得できません');
    
    // プレイヤー配列をオブジェクト形式に変換
    const firebaseUpdates = {...updates};
    if (updates.players) {
        const playersObj = {};
        updates.players.forEach(player => {
            playersObj[player.id] = {
                name: player.name,
                role: player.role,
                points: player.points
            };
        });
        firebaseUpdates.players = playersObj;
    }
    
    return window.db.ref(gamePath).update(firebaseUpdates)
        .then(() => {
            return syncGameStateFromFirebase();
        })
        .catch(error => {
            console.error('Firebase更新エラー:', error);
            return Promise.reject(error);
        });
};

// ゲーム状態の更新
window.updateGameState = (newState) => {
    if (!newState) return {...gameState};
    
    // 現在のプレイヤーIDを保存
    const myId = gameState.currentPlayerId;
    
    // 一時的に状態を更新
    const updatedState = { 
        ...gameState, 
        ...newState,
        // 自分のIDは常に保持
        currentPlayerId: myId || newState.currentPlayerId
    };
    
    // キャッシュを更新
    gameState = updatedState;
    
    // イベント発火
    dispatchStateUpdate();
    
    // Firebase に同期（ホストの場合のみ）
    if (window.isGameHost()) {
        updateFirebaseGameState(newState)
            .catch(error => console.error('Firebase更新エラー:', error));
    }
    
    return {...gameState};
};

// プレイヤー追加
window.addPlayer = (player) => {
    if (!player || !player.id) return;
    
    // 既存のプレイヤーか確認
    const existingIndex = gameState.players.findIndex(p => p.id === player.id);
    let updatedPlayers = [...gameState.players];
    
    if (existingIndex >= 0) {
        // 既存プレイヤーの更新
        updatedPlayers[existingIndex] = {...updatedPlayers[existingIndex], ...player};
    } else {
        // 新規プレイヤーの追加
        updatedPlayers.push(player);
    }
    
    // 状態更新
    gameState.players = updatedPlayers;
    
    // Firebase に同期（ホストの場合）
    if (window.isGameHost()) {
        const playersObj = {};
        updatedPlayers.forEach(p => {
            playersObj[p.id] = {
                name: p.name,
                role: p.role || null,
                points: p.points || 0
            };
        });
        
        window.db.ref(`${getGamePath()}/players`).set(playersObj)
            .catch(error => console.error('プレイヤー追加エラー:', error));
    }
    
    // イベント発火
    dispatchStateUpdate();
};

// プレイヤー削除
window.removePlayer = (playerId) => {
    if (!playerId) return;
    
    // プレイヤーを削除
    gameState.players = gameState.players.filter(p => p.id !== playerId);
    
    // Firebase から削除（ホストの場合）
    if (window.isGameHost()) {
        window.db.ref(`${getGamePath()}/players/${playerId}`).remove()
            .catch(error => console.error('プレイヤー削除エラー:', error));
    }
    
    // イベント発火
    dispatchStateUpdate();
};

// ゲーム状態リセット
window.resetGameState = () => {
    const currentId = gameState.currentPlayerId;
    const gameId = gameState.gameId;
    
    gameState = {
        players: [],
        currentPlayerId: currentId,
        phase: '待機中',
        assignedRoles: {},
        centerCards: [],
        actions: {},
        votes: {},
        result: '',
        gameId: gameId,
        host: gameState.host
    };
    
    // Firebase からゲームを削除（ホストの場合）
    if (window.isGameHost() && gameId) {
        window.db.ref(`games/${gameId}`).remove()
            .catch(error => console.error('ゲーム削除エラー:', error));
    }
    
    dispatchStateUpdate();
};

// 役職設定
window.setupRoles = (playerIds) => {
    if (!Array.isArray(playerIds) || playerIds.length === 0) return null;
    
    const shuffledRoles = window.shuffleArray([...window.roles]);
    const playerRoles = shuffledRoles.slice(0, playerIds.length);
    const centerCards = shuffledRoles.slice(playerIds.length, playerIds.length + 2);
    
    const assignedRoles = {};
    playerIds.forEach((id, index) => {
        assignedRoles[id] = playerRoles[index].name;
    });
    
    // 状態を更新
    gameState.assignedRoles = assignedRoles;
    gameState.centerCards = centerCards;
    
    // Firebase に同期（ホストの場合）
    if (window.isGameHost()) {
        const updates = {
            assignedRoles: assignedRoles,
            centerCards: centerCards.map(role => role.name)
        };
        
        window.db.ref(getGamePath()).update(updates)
            .catch(error => console.error('役職設定エラー:', error));
    }
    
    dispatchStateUpdate();
    return { assignedRoles, centerCards };
};

// イベント発火
const dispatchStateUpdate = () => {
    try {
        window.dispatchEvent(new Event('gameStateUpdated'));
    } catch (e) {
        console.error('イベント発火エラー:', e);
    }
};

// ゲーム初期化
window.initializeGame = () => {
    window.resetGameState();
    return {...gameState};
};

// Firebase リスナーの設定
window.setupFirebaseListeners = (gameId) => {
    if (!gameId) return;
    
    const gameRef = window.db.ref(`games/${gameId}`);
    
    // ゲーム状態の変更を監視
    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        // ホスト以外の場合のみ同期（ホストは自分で更新するため）
        if (!window.isGameHost()) {
            const players = [];
            if (data.players) {
                Object.keys(data.players).forEach(playerId => {
                    players.push({
                        id: playerId,
                        ...data.players[playerId]
                    });
                });
            }
            
            // 自分のIDを保持
            const myId = gameState.currentPlayerId;
            
            // 状態を更新
            gameState = {
                ...data,
                players,
                currentPlayerId: myId
            };
            
            // イベント発火
            dispatchStateUpdate();
        }
    });
    
    // エラー処理
    gameRef.on('error', (error) => {
        console.error('Firebase監視エラー:', error);
    });
};

// ゲーム作成
window.createGame = (playerName) => {
    if (!playerName || playerName.trim() === '') {
        alert('プレイヤー名を入力してください');
        return Promise.reject('プレイヤー名が空です');
    }
    
    // 新しいゲームIDを生成
    const gameId = window.generateId();
    const playerId = window.generateId();
    
    // 初期ゲーム状態を作成
    const initialGameState = {
        players: {
            [playerId]: {
                name: playerName,
                role: null,
                points: 0
            }
        },
        phase: '待機中',
        assignedRoles: {},
        centerCards: [],
        actions: {},
        votes: {},
        result: '',
        host: playerId,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Firebase にゲームを作成
    return window.db.ref(`games/${gameId}`).set(initialGameState)
        .then(() => {
            // ローカル状態を更新
            gameState.gameId = gameId;
            gameState.currentPlayerId = playerId;
            gameState.host = playerId;
            
            // プレイヤー配列を更新
            gameState.players = [{
                id: playerId,
                name: playerName,
                role: null,
                points: 0
            }];
            
            // リスナーを設定
            window.setupFirebaseListeners(gameId);
            
            // イベント発火
            dispatchStateUpdate();
            
            return gameId;
        })
        .catch(error => {
            console.error('ゲーム作成エラー:', error);
            alert('ゲームの作成に失敗しました');
            return Promise.reject(error);
        });
};

// ゲーム参加
window.joinGame = (gameId, playerName) => {
    if (!gameId || !playerName || playerName.trim() === '') {
        alert('ゲームIDとプレイヤー名を入力してください');
        return Promise.reject('入力が不足しています');
    }
    
    // ゲームの存在確認
    return window.db.ref(`games/${gameId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                alert('指定されたゲームIDが見つかりません');
                return Promise.reject('ゲームが見つかりません');
            }
            
            // 新しいプレイヤーIDを生成
            const playerId = window.generateId();
            
            // プレイヤー情報を追加
            return window.db.ref(`games/${gameId}/players/${playerId}`).set({
                name: playerName,
                role: null,
                points: 0
            })
            .then(() => {
                // ローカル状態を更新
                gameState.gameId = gameId;
                gameState.currentPlayerId = playerId;
                gameState.host = snapshot.val().host;
                
                // リスナーを設定
                window.setupFirebaseListeners(gameId);
                
                return true;
            });
        })
        .catch(error => {
            console.error('ゲーム参加エラー:', error);
            alert('ゲームへの参加に失敗しました');
            return Promise.reject(error);
        });
};

// ホストかどうかの確認
window.isGameHost = () => {
    return gameState.currentPlayerId === gameState.host;
};

// アクション実行
window.executeAction = (actionType, params) => {
    const playerId = gameState.currentPlayerId;
    const gamePath = getGamePath();
    
    if (!gamePath) {
        console.error('ゲームパスが取得できません');
        return;
    }
    
    // アクション情報
    const action = { 
        type: actionType, 
        playerId: playerId, 
        ...params,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Firebaseにアクションを記録
    const actionId = window.generateId();
    window.db.ref(`${gamePath}/pendingActions/${actionId}`).set(action)
        .catch(error => console.error('アクション送信エラー:', error));
};

// アクション処理（ホスト側）
window.setupActionProcessor = () => {
    if (!window.isGameHost()) return;
    
    const gamePath = getGamePath();
    if (!gamePath) return;
    
    // 保留中のアクションを監視
    window.db.ref(`${gamePath}/pendingActions`).on('child_added', (snapshot) => {
        const action = snapshot.val();
        if (!action) return;
        
        // アクションを処理
        handlePlayerAction(action);
        
        // 処理済みのアクションを削除
        snapshot.ref.remove()
            .catch(error => console.error('アクション削除エラー:', error));
    });
};

// プレイヤーアクション処理
const handlePlayerAction = (action) => {
    if (!action || !action.type) return;
    
    // アクションタイプに応じた処理
    switch(action.type) {
        case 'vote':
            window.castVote(action.playerId, action.targetId);
            break;
        case 'useAbility':
            window.performAction(action.playerId, action.abilityType, action.target);
            break;
        case 'nextPhase':
            window.nextPhase();
            break;
    }
};
