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
            try {
                if (peer && peer.disconnected) {
                    peer.reconnect();
                }
            } catch (e) {
                console.error('再接続エラー:', e);
                initializePeer(peerOptions);
            }
        }, 3000);
    });
};

// 完全なゲーム状態を送信する関数
const sendFullGameState = (conn) => {
    try {
        const fullState = window.getGameState();
        console.log('完全なゲーム状態の送信:', JSON.stringify(fullState).substring(0, 100) + '...');
        
        if (conn && conn.open) {
            conn.send({ 
                type: 'fullGameState', 
                state: fullState 
            });
            console.log('状態送信完了: プレイヤー数', fullState.players.length);
        } else {
            console.warn('接続が閉じられているか無効です');
        }
    } catch (e) {
        console.error('ゲーム状態の送信エラー:', e);
    }
};

// 接続をセットアップする関数
const setupConnection = (conn) => {
    console.log('接続のセットアップ中:', conn.peer);
    
    if (connections[conn.peer]) {
        console.log('既存の接続を閉じます:', conn.peer);
        connections[conn.peer].close();
    }
    
    connections[conn.peer] = conn;
    
    conn.on('open', () => {
        console.log('接続が確立されました:', conn.peer);
        clearTimeout(connectionTimer);
        
        setTimeout(() => {
            sendFullGameState(conn);
        }, 500);
        
        conn.on('data', (data) => handleReceivedData(data, conn));
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
                    // 重要な変更: 現在のプレイヤーID情報を保持
                    const currentPlayerId = window.getGameState().currentPlayerId;
                    
                    // ゲーム状態を更新するが、currentPlayerIdは保持する
                    const updatedState = {
                        ...data.state,
                        currentPlayerId: currentPlayerId
                    };
                    
                    window.updateGameState(updatedState);
                    console.log('完全なゲーム状態を受信し更新しました', updatedState);
                }
                break;
                
            // 他のケース...
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

    const currentState = window.getGameState();
    if (!currentState.players.some(p => p.id === player.id)) {
        window.addPlayer(player);
        console.log('プレイヤーが参加しました:', player.name);
        broadcastGameState(window.getGameState());
        sendFullGameState(conn);
    } else {
        console.log('プレイヤーは既に参加しています:', player.name);
        sendFullGameState(conn);
    }
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
    alert(`ゲームIDをコピーしてください: ${gameId}`);
    
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
