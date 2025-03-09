'use strict';

let peer;
let connections = {};
let gameId = null;
let isHost = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;
const CONNECTION_TIMEOUT = 30000; // 30秒
let connectionTimer;

window.setupNetwork = () => {
    // PeerJSオプションの設定
    const peerOptions = {
        // クラウドサーバーを使用して安定した接続を確保
        host: '0.peerjs.com',
        secure: true,
        port: 443,
        path: '/',
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                {
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'muazkh',
                    username: 'webrtc@live.com'
                },
                {
                    urls: 'turn:relay.backups.cz',
                    credential: 'webrtc',
                    username: 'webrtc'
                }
            ]
        },
        debug: 2  // デバッグレベルを2に下げる（少なめのログ）
    };

    console.log('PeerJSを初期化中...');
    peer = new Peer(window.generateId(), peerOptions);
    
    peer.on('open', (id) => {
        console.log('ピアIDを取得しました: ' + id);
        window.updateGameState({ currentPlayerId: id });
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
        // 再接続を試みる
        setTimeout(() => {
            peer.reconnect();
        }, 3000);
    });

    return peer.id;
};

const setupConnection = (conn) => {
    console.log('接続のセットアップ中:', conn.peer);
    
    // 既存の接続がある場合は閉じる
    if (connections[conn.peer]) {
        console.log('既存の接続を閉じます:', conn.peer);
        connections[conn.peer].close();
    }
    
    connections[conn.peer] = conn;
    
    // 接続イベントハンドラの設定
    conn.on('open', () => {
        console.log('接続が確立されました:', conn.peer);
        clearTimeout(connectionTimer);
        
        // ゲーム状態の送信
        sendFullGameState(conn);
        
        // データ受信ハンドラ
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

const sendFullGameState = (conn) => {
    try {
        const fullState = window.getGameState();
        console.log('ゲーム状態の送信:', JSON.stringify(fullState).substring(0, 100) + '...');
        conn.send({ type: 'fullGameState', state: fullState });
    } catch (e) {
        console.error('ゲーム状態の送信エラー:', e);
    }
};

const handleReceivedData = (data, conn) => {
    console.log('データを受信:', data ? data.type : 'null');
    try {
        if (!data || typeof data !== 'object') {
            console.warn('無効なデータ形式を受信:', data);
            return;
        }

        switch (data.type) {
            case 'fullGameState':
                if (data.state) {
                    window.updateGameState(data.state);
                    console.log('ゲーム状態を更新しました');
                }
                break;
            case 'playerJoined':
                if (data.player) {
                    handlePlayerJoined(data.player, conn);
                }
                break;
            case 'gameState':
                if (data.state) {
                    window.updateGameState(data.state);
                    broadcastGameState(data.state, conn);
                }
                break;
            case 'action':
                if (data.playerId && data.action) {
                    const result = window.performAction(data.playerId, data.action, data.target);
                    window.processActionResult(data.action, result);
                    broadcastGameState(window.getGameState(), conn);
                }
                break;
            case 'vote':
                if (data.voterId && data.targetId) {
                    window.castVote(data.voterId, data.targetId);
                    broadcastGameState(window.getGameState(), conn);
                }
                break;
            default:
                console.warn('不明なデータタイプ:', data.type);
        }
        
        // UIの更新イベントを発火
        window.dispatchEvent(new Event('gameStateUpdated'));
    } catch (error) {
        console.error('データ処理エラー:', error);
    }
};

const handlePlayerJoined = (player, conn) => {
    if (!player || !player.id) {
        console.warn('無効なプレイヤーデータ:', player);
        return;
    }

    const currentState = window.getGameState();
    if (!currentState.players.some(p => p.id === player.id)) {
        window.addPlayer(player);
        console.log('プレイヤーが参加しました:', player.name);
        broadcastGameState(window.getGameState(), conn);
    } else {
        console.log('プレイヤーは既に参加しています:', player.name);
    }
};

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

window.createGame = (playerName) => {
    if (!playerName || playerName.trim() === '') {
        console.error('プレイヤー名が必要です');
        return null;
    }

    isHost = true;
    gameId = window.generateId();
    
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

window.joinGame = (gameId, playerName) => {
    if (!gameId || !playerName || playerName.trim() === '') {
        console.error('ゲームIDとプレイヤー名が必要です');
        return false;
    }
    
    console.log('ゲームに参加しています:', gameId, 'プレイヤー名:', playerName);
    connectionAttempts = 0;
    attemptConnection(gameId, playerName);
    return true;
};

const attemptConnection = (gameId, playerName) => {
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        alert('接続を確立できませんでした。ゲームIDを確認して再試行してください。');
        return;
    }

    connectionAttempts++;
    console.log(`接続試行 ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);

    try {
        // 以前の接続タイマーをクリア
        if (connectionTimer) {
            clearTimeout(connectionTimer);
        }
        
        // 新しい接続を作成
        console.log('ピアに接続しています:', gameId);
        const conn = peer.connect(gameId, { 
            reliable: true,
            serialization: 'json'
        });
        
        // タイムアウト設定
        connectionTimer = setTimeout(() => {
            console.log('接続タイムアウト');
            if (conn.open) conn.close();
            retryConnection(gameId, playerName);
        }, CONNECTION_TIMEOUT);

        // 成功時の処理
        conn.on('open', () => {
            clearTimeout(connectionTimer);
            console.log('ホストに接続しました。プレイヤー情報を送信します。');
            
            // 接続の設定
            setupConnection(conn);
            
            // プレイヤー情報の送信
            const newPlayer = { id: peer.id, name: playerName, role: null, points: 0 };
            conn.send({ type: 'playerJoined', player: newPlayer });
            
            // ローカル状態の更新
            window.addPlayer(newPlayer);
            window.updateGameState({ currentPlayerId: peer.id, gameId: gameId });
            
            // UIの更新
            window.dispatchEvent(new Event('gameStateUpdated'));
        });

        // エラー処理
        conn.on('error', (error) => {
            console.error('接続エラー:', error);
            clearTimeout(connectionTimer);
            retryConnection(gameId, playerName);
        });
        
        // 接続失敗時の処理
        conn.on('close', () => {
            console.log('接続が閉じられました');
            clearTimeout(connectionTimer);
            
            // すでに成功していなければ再試行
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

const retryConnection = (gameId, playerName) => {
    console.log('接続を再試行しています...');
    setTimeout(() => attemptConnection(gameId, playerName), 2000);
};

const handlePeerError = (error) => {
    console.error('ピアエラー:', error);
    
    if (!error) return;
    
    // エラータイプに基づいてメッセージを表示
    if (error.type === 'network' || error.type === 'server-error') {
        alert('ネットワークエラーが発生しました。ページをリロードして再接続してください。');
    } else if (error.type === 'peer-unavailable') {
        // ゲームID不在エラー
        connectionAttempts = MAX_CONNECTION_ATTEMPTS; // これ以上再試行しない
        alert('指定されたゲームIDが見つかりません。ゲームIDを確認して再試行してください。');
    } else if (error.type === 'browser-incompatible') {
        alert('お使いのブラウザはWebRTCに対応していません。Chrome、Firefox、またはEdgeの最新版をお試しください。');
    } else {
        alert('エラーが発生しました: ' + (error.message || 'Unknown error'));
    }
};

const handlePlayerDisconnection = (peerId) => {
    console.log('プレイヤーが切断しました:', peerId);
    // プレイヤーの削除処理
    window.removePlayer(peerId);
    // 更新されたゲーム状態をブロードキャスト
    broadcastGameState(window.getGameState());
};

const handleConnectionError = (error, peerId) => {
    console.error('接続エラー、ピア:', peerId, error);
    delete connections[peerId];
    handlePlayerDisconnection(peerId);
};

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

window.isHostPlayer = () => isHost;

window.debugConnections = () => {
    console.log('ホスト:', isHost);
    console.log('ゲームID:', gameId);
    console.log('ピアID:', peer ? peer.id : 'Not connected');
    console.log('接続数:', Object.keys(connections).length);
    console.log('PeerJS接続状態:', peer ? peer.open : 'Not initialized');
    
    // 各接続の状態を表示
    Object.entries(connections).forEach(([id, conn]) => {
        console.log(`- 接続 ${id}: ${conn.open ? 'オープン' : '閉じられています'}`);
    });
};
