'use strict';

// グローバル変数
let peer;
let connections = {};
let gameId = null;
let isHost = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;
const CONNECTION_TIMEOUT = 30000; // 30秒
let connectionTimer;
let isConnecting = false;

// プレイヤー配列をマージする関数
const mergePlayersArray = (currentPlayers, newPlayers) => {
    if (!Array.isArray(currentPlayers)) currentPlayers = [];
    if (!Array.isArray(newPlayers)) newPlayers = [];
    
    // プレイヤーIDをキーとした辞書を作成
    const playerMap = {};
    
    // 現在のプレイヤーをマップに追加
    currentPlayers.forEach(player => {
        if (player && player.id) {
            playerMap[player.id] = player;
        }
    });
    
    // 新しいプレイヤーでマップを更新（既存のプレイヤーは上書き）
    newPlayers.forEach(player => {
        if (player && player.id) {
            playerMap[player.id] = player;
        }
    });
    
    // マップの値を配列に変換
    return Object.values(playerMap);
};

// PeerJSの初期化を行う関数
const initializePeer = (peerOptions) => {
    // 既存のピアがある場合は破棄
    if (peer) {
        try {
            peer.destroy();
        } catch (e) {
            console.log('前回のピア破棄中にエラー:', e);
        }
    }
    
    peer = new Peer(window.generateId(), peerOptions);
    
    peer.on('open', (id) => {
        console.log('ピアIDを取得しました: ' + id);
        window.updateGameState({ currentPlayerId: id });
        isConnecting = false;
    });

    peer.on('connection', (conn) => {
        console.log('新しい接続リクエストを受信:', conn.peer);
        setupConnection(conn);
    });

    peer.on('error', (error) => {
        console.error('PeerJSエラー:', error);
        handlePeerError(error);
    });

    peer.on('disconnected', () => {
        console.log('PeerJSサーバーから切断されました。再接続を試みます...');
        setTimeout(() => {
            peer.reconnect();
        }, 1000);
    });
};

// 完全なゲーム状態を送信する関数
const sendFullGameState = (conn) => {
    try {
        // ゲーム状態を取得
        const fullState = window.getGameState();
        
        // 接続先を確認
        if (!conn || !conn.open) {
            console.warn('接続が閉じられているか無効です');
            return;
        }
        
        // デバッグ用にプレイヤー情報を表示
        console.log('送信する状態のプレイヤー情報:', 
            fullState.players ? fullState.players.map(p => p.name).join(', ') : 'なし');
        
        // ゲーム状態を送信
        conn.send({ 
            type: 'fullGameState', 
            state: fullState 
        });
        
        console.log('完全なゲーム状態を送信しました');
    } catch (e) {
        console.error('ゲーム状態の送信エラー:', e);
    }
};

// 接続をセットアップする関数
const setupConnection = (conn) => {
    console.log('接続のセットアップ中:', conn.peer);
    
    if (connections[conn.peer]) {
        console.log('既存の接続を閉じます:', conn.peer);
        try {
            connections[conn.peer].close();
        } catch (e) {
            console.warn('既存の接続を閉じる際にエラーが発生しました:', e);
        }
    }
    
    connections[conn.peer] = conn;
    
    conn.on('open', () => {
        console.log('接続が確立されました:', conn.peer);
        clearTimeout(connectionTimer);
        isConnecting = false;
        connectionAttempts = 0;
        
        // 接続確立後、より長い遅延で状態を共有
        setTimeout(() => {
            try {
                sendFullGameState(conn);
                console.log('初期状態を送信しました:', conn.peer);
            } catch (e) {
                console.error('初期状態の送信に失敗しました:', e);
            }
        }, 800);
        
        conn.on('data', (data) => {
            try {
                handleReceivedData(data, conn);
            } catch (e) {
                console.error('データ処理エラー:', e);
            }
        });
    });
    
    conn.on('close', () => {
        console.log('接続が閉じられました:', conn.peer);
        delete connections[conn.peer];
        handlePlayerDisconnection(conn.peer);
    });
    
    conn.on('error', (error) => {
        console.error('接続エラー:', error);
        handleConnectionError(error, conn.peer);
    });
};

// 受信データを処理する関数
const handleReceivedData = (data, conn) => {
    console.log('データを受信:', data ? (typeof data === 'object' ? data.type : 'non-object data') : 'null');
    
    try {
        if (!data || typeof data !== 'object') {
            console.warn('無効なデータ:', typeof data);
            return;
        }
        
        switch (data.type) {
            case 'fullGameState':
                if (data.state && typeof data.state === 'object') {
                    // 現在の状態を取得
                    const currentState = window.getGameState();
                    
                    // 重要: 現在のプレイヤーIDとプレイヤー情報を保持
                    const currentPlayerId = currentState.currentPlayerId;
                    
                    // プレイヤー配列のマージを確保する
                    // 既存のプレイヤーと新しいプレイヤーをマージ
                    const mergedPlayers = mergePlayersArray(currentState.players || [], data.state.players || []);
                    
                    // 役職情報とアクションのマージ
                    const mergedAssignedRoles = {
                        ...(currentState.assignedRoles || {}),
                        ...(data.state.assignedRoles || {})
                    };
                    
                    // アクション情報のマージ
                    const mergedActions = {
                        ...(currentState.actions || {}),
                        ...(data.state.actions || {})
                    };
                    
                    // 投票情報のマージ
                    const mergedVotes = {
                        ...(currentState.votes || {}),
                        ...(data.state.votes || {})
                    };
                    
                    // centerCardsの処理（送信元の情報を優先）
                    const mergedCenterCards = data.state.centerCards && data.state.centerCards.length > 0
                        ? data.state.centerCards
                        : currentState.centerCards || [];
                    
                    // ゲーム状態を更新（フェーズは送信元を優先）
                    const phase = data.state.phase !== '待機中' ? data.state.phase : currentState.phase;
                    
                    // ゲーム状態を更新
                    const updatedState = {
                        ...data.state,
                        currentPlayerId: currentPlayerId,
                        players: mergedPlayers,
                        assignedRoles: mergedAssignedRoles,
                        actions: mergedActions,
                        votes: mergedVotes,
                        centerCards: mergedCenterCards,
                        phase: phase
                    };
                    
                    window.updateGameState(updatedState);
                    console.log('完全なゲーム状態を受信し更新しました', updatedState);
                    console.log('マージ後のプレイヤー:', updatedState.players);
                    console.log('マージ後の役職情報:', updatedState.assignedRoles);
                }
                break;
                
            // 追加: playerJoined ケースを処理
            case 'playerJoined':
                if (data.player && typeof data.player === 'object') {
                    console.log('新しいプレイヤーが参加しました:', data.player);
                    handlePlayerJoined(data.player, conn);
                }
                break;
                
            case 'requestFullState':
                console.log('完全なゲーム状態のリクエストを受信しました');
                setTimeout(() => {
                    sendFullGameState(conn);
                }, 300);
                break;
                
            case 'gameState':
                if (data.state && typeof data.state === 'object') {
                    // 現在の状態を取得
                    const currentState = window.getGameState();
                    const currentId = currentState.currentPlayerId;
                    
                    // プレイヤー配列のマージ
                    const mergedPlayers = mergePlayersArray(currentState.players || [], data.state.players || []);
                    
                    // 役職情報のマージ
                    const mergedAssignedRoles = {
                        ...(currentState.assignedRoles || {}),
                        ...(data.state.assignedRoles || {})
                    };
                    
                    // アクション情報のマージ
                    const mergedActions = {
                        ...(currentState.actions || {}),
                        ...(data.state.actions || {})
                    };
                    
                    // 投票情報のマージ
                    const mergedVotes = {
                        ...(currentState.votes || {}),
                        ...(data.state.votes || {})
                    };
                    
                    // フェーズ情報（送信元を優先）
                    const phase = data.state.phase !== '待機中' ? data.state.phase : currentState.phase;
                    
                    // 更新されたゲーム状態
                    const updatedState = {
                        ...data.state,
                        currentPlayerId: currentId,
                        players: mergedPlayers,
                        assignedRoles: mergedAssignedRoles,
                        actions: mergedActions,
                        votes: mergedVotes,
                        phase: phase
                    };
                    
                    window.updateGameState(updatedState);
                    console.log('ゲーム状態を更新しました:', updatedState);
                }
                break;
                
            default:
                console.log('未処理のデータタイプ:', data.type);
        }
        
        window.dispatchEvent(new Event('gameStateUpdated'));
        
    } catch (error) {
        console.error('データ処理エラー:', error);
    }
};

// プレイヤー参加を処理する関数
const handlePlayerJoined = (player, conn) => {
    if (!player || !player.id) {
        console.warn('無効なプレイヤーデータ:', player);
        return;
    }
    
    console.log('参加プレイヤーデータを受信:', player);

    const currentState = window.getGameState();
    
    // 既存のプレイヤーかどうかをチェック
    const existingPlayerIndex = currentState.players.findIndex(p => p && p.id === player.id);
    
    if (existingPlayerIndex === -1) {
        // 新しいプレイヤーを追加
        window.addPlayer(player);
        console.log('プレイヤーが参加しました:', player.name);
        
        // 状態変更前後のプレイヤー数をログ出力（デバッグ用）
        const updatedState = window.getGameState();
        console.log(
            `プレイヤー追加: 追加前=${currentState.players.length}人, ` +
            `追加後=${updatedState.players.length}人`
        );
        console.log('現在のプレイヤー:', updatedState.players.map(p => p.name).join(', '));
        
        // すべての接続に対して完全な状態を送信
        Object.values(connections).forEach(otherConn => {
            if (otherConn && otherConn.open && otherConn !== conn) {
                setTimeout(() => {
                    sendFullGameState(otherConn);
                }, 300);
            }
        });
        
        // ホストの場合、遅延してから状態を再送信
        if (isHost) {
            setTimeout(() => {
                broadcastGameState(window.getGameState());
            }, 1000);
        }
    } else {
        console.log('プレイヤーは既に参加しています:', player.name);
        // プレイヤー情報を更新
        const updatedPlayers = [...currentState.players];
        updatedPlayers[existingPlayerIndex] = player;
        window.updateGameState({ players: updatedPlayers });
    }
    // タイムアウトを増やして常に状態を送信する
    setTimeout(() => {
        sendFullGameState(conn);
    }, 800);
};

// ゲーム状態をブロードキャストする関数
const broadcastGameState = (state, excludeConn) => {
    const conns = Object.values(connections).filter(c => c !== excludeConn && c.open);
    console.log(`ゲーム状態を${conns.length}人のプレイヤーに送信中...`);
    
    conns.forEach(conn => {
        try {
            conn.send({ type: 'gameState', state: state });
        } catch (e) {
            console.error('状態の送信に失敗:', e);
        }
    });
};

// 接続を試みる関数
const attemptConnection = (gameId, playerName) => {
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        isConnecting = false;
        alert('接続を確立できませんでした。ゲームIDを確認して再試行してください。');
        return;
    }

    connectionAttempts++;
    console.log(`接続試行 ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);

    try {
        if (connectionTimer) {
            clearTimeout(connectionTimer);
        }
        
        if (!peer || peer.destroyed) {
            console.log('ピアが無効です。再初期化します。');
            initializePeer({
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                },
                debug: 1
            });
            retryConnection(gameId, playerName);
            return;
        }
        
        if (peer.disconnected) {
            console.log('ピアが切断されています。再接続します。');
            try {
                peer.reconnect();
                setTimeout(() => {
                    retryConnection(gameId, playerName);
                }, 2000);
                return;
            } catch (e) {
                console.error('再接続エラー:', e);
                initializePeer({
                    config: {
                        'iceServers': [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' }
                        ]
                    },
                    debug: 1
                });
                retryConnection(gameId, playerName);
                return;
            }
        }
        
        console.log('ピアに接続しています:', gameId);
        const conn = peer.connect(gameId, { 
            reliable: true,
            serialization: 'json'
        });
        
        connectionTimer = setTimeout(() => {
            console.log('接続タイムアウト');
            if (conn && conn.open) conn.close();
            retryConnection(gameId, playerName);
        }, CONNECTION_TIMEOUT);

        conn.on('open', () => {
            clearTimeout(connectionTimer);
            console.log('ホストに接続しました。プレイヤー情報を送信します。');
            isConnecting = false;
            
            setupConnection(conn);
            
            const newPlayer = { id: peer.id, name: playerName, role: null, points: 0 };
            conn.send({ type: 'playerJoined', player: newPlayer });
            
            window.addPlayer(newPlayer);
            window.updateGameState({ currentPlayerId: peer.id, gameId: gameId });
            
            window.dispatchEvent(new Event('gameStateUpdated'));
            
            conn.send({ type: 'requestFullState' });
        });

        conn.on('error', (error) => {
            console.error('接続エラー:', error);
            clearTimeout(connectionTimer);
            retryConnection(gameId, playerName);
        });
        
        conn.on('close', () => {
            console.log('接続が閉じられました');
            clearTimeout(connectionTimer);
            
            if (!connections[gameId]) {
                retryConnection(gameId, playerName);
            }
        });
    } catch (e) {
        console.error('接続エラー:', e);
        clearTimeout(connectionTimer);
        retryConnection(gameId, playerName);
    }
};

// 接続を再試行する関数
const retryConnection = (gameId, playerName) => {
    console.log('接続を再試行しています...');
    setTimeout(() => attemptConnection(gameId, playerName), 2000);
};

// ピアエラーを処理する関数
const handlePeerError = (error) => {
    console.error('ピアエラー:', error);
    
    if (!error) return;
    
    if (error.message) {
        console.log('詳細エラーメッセージ:', error.message);
    }
    
    if (error.type === 'network' || error.type === 'server-error') {
        if (!isConnecting) {
            alert('ネットワークエラーが発生しました。再接続を試みます。');
            setTimeout(() => {
                initializePeer({
                    config: {
                        'iceServers': [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' }
                        ]
                    },
                    debug: 1
                });
            }, 2000);
        }
    } else if (error.type === 'peer-unavailable') {
        connectionAttempts = MAX_CONNECTION_ATTEMPTS;
        isConnecting = false;
        alert(`指定されたゲームIDが見つかりません。ゲームIDを正確にコピー＆ペーストして再試行してください。`);
    } else if (error.type === 'browser-incompatible') {
        alert('お使いのブラウザはWebRTCに対応していません。Chrome、Firefox、またはEdgeの最新版をお試しください。');
    } else if (error.type === 'disconnected') {
        console.log('切断エラーが発生しました。再接続を試みます。');
    } else {
        if (!isConnecting) {
            alert('エラーが発生しました: ' + (error.message || 'Unknown error'));
        }
    }
};

// プレイヤー切断を処理する関数
const handlePlayerDisconnection = (peerId) => {
    console.log('プレイヤーが切断しました:', peerId);
    window.removePlayer(peerId);
    broadcastGameState(window.getGameState());
};

// 接続エラーを処理する関数
const handleConnectionError = (error, peerId) => {
    console.error('接続エラー、ピア:', peerId, error);
    delete connections[peerId];
    handlePlayerDisconnection(peerId);
};

// ゲーム作成を続行する関数
const continueCreateGame = (playerName) => {
    isHost = true;
    gameId = peer.id;
    
    const newPlayer = { id: peer.id, name: playerName, role: null, points: 0 };
    window.addPlayer(newPlayer);
    window.updateGameState({ 
        currentPlayerId: peer.id, 
        gameId: gameId,
        phase: '待機中'
    });
    
    console.log('ゲームを作成しました、ID:', gameId);
    return gameId;
};

// ゲーム参加を続行する関数
const continueJoinGame = (gameId, playerName) => {
    console.log('ゲームに参加しています:', gameId, 'プレイヤー名:', playerName);
    connectionAttempts = 0;
    isConnecting = true;
    window.gameId = gameId;
    attemptConnection(gameId, playerName);
    return true;
};

// === 公開関数 ===

// ネットワークセットアップ関数
window.setupNetwork = () => {
    console.log('ネットワークをセットアップしています...');
    const peerOptions = {
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        },
        debug: 1
    };

    initializePeer(peerOptions);
    return peer ? peer.id : null;
};

// 定期的なゲーム状態同期機能
const setupPeriodicSync = () => {
    if (window.syncInterval) {
        clearInterval(window.syncInterval);
    }
    
    // 10秒ごとに全接続に対して状態を同期
    window.syncInterval = setInterval(() => {
        if (isHost && Object.keys(connections).length > 0) {
            console.log('定期同期: 完全なゲーム状態を全クライアントに送信中...');
            const fullState = window.getGameState();
            Object.values(connections).forEach(conn => {
                if (conn && conn.open) {
                    try {
                        conn.send({ 
                            type: 'fullGameState', 
                            state: fullState 
                        });
                    } catch (e) {
                        console.error('定期同期中のエラー:', e);
                    }
                }
            });
        }
    }, 10000); // 10秒ごと
    
    console.log('定期的な同期機能を設定しました');
};

// ゲーム作成関数
window.createGame = (playerName) => {
    if (!playerName || playerName.trim() === '') {
        console.error('プレイヤー名が必要です');
        return null;
    }

    if (!peer || !peer.open) {
        const peerOptions = {
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            },
            debug: 1
        };
        initializePeer(peerOptions);
        
        alert('接続を初期化しています。少々お待ちください...');
        setTimeout(() => {
            continueCreateGame(playerName);
        }, 2000);
        return 'connecting...';
    } else {
        return continueCreateGame(playerName);
    }
};

// ゲーム参加関数
window.joinGame = (gameId, playerName) => {
    if (!gameId || !playerName || playerName.trim() === '') {
        console.error('ゲームIDとプレイヤー名が必要です');
        return false;
    }
    
    if (isConnecting) {
        alert('接続処理中です。しばらくお待ちください。');
        return false;
    }
    
    if (!peer || peer.destroyed || peer.disconnected) {
        console.log('ピア接続が無効です。再初期化します。');
        const peerOptions = {
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            },
            debug: 1
        };
        initializePeer(peerOptions);
        
        alert('接続を初期化しています。少々お待ちください...');
        setTimeout(() => {
            continueJoinGame(gameId, playerName);
        }, 2000);
        return true;
    }
    
    return continueJoinGame(gameId, playerName);
};

// 全プレイヤーにデータを送信する関数
window.sendToAll = (data, excludeConnections = []) => {
    if (!data || typeof data !== 'object') {
        console.warn('無効なデータ形式:', data);
        return;
    }
    
    console.log('全員にデータを送信:', data.type);
    Object.values(connections).forEach(conn => {
        if (conn.open && !excludeConnections.includes(conn)) {
            try {
                conn.send(data);
            } catch (e) {
                console.error('データ送信エラー:', e);
            }
        }
    });
};

// ホストかどうかを確認する関数
window.isHostPlayer = () => isHost;

// デバッグ用の接続情報表示関数
window.debugConnections = () => {
    console.log('ホスト:', isHost);
    console.log('ゲームID:', gameId);
    console.log('ピアID:', peer ? peer.id : 'Not connected');
    console.log('接続数:', Object.keys(connections).length);
    console.log('PeerJS接続状態:', peer ? (peer.open ? 'オープン' : (peer.disconnected ? '切断' : '接続中')) : 'Not initialized');
    
    Object.entries(connections).forEach(([id, conn]) => {
        console.log(`- 接続 ${id}: ${conn.open ? 'オープン' : '閉じられています'}`);
    });
};

// ページ読み込み時に接続状態をリセット
window.addEventListener('beforeunload', () => {
    isConnecting = false;
});
