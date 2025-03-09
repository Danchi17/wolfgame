'use strict';

// グローバル変数
let peer;
let connections = {};
let gameId = null;
let isHost = false;

// PeerJSの初期化
const initializePeer = () => {
    // 既存のピアを破棄
    if (peer) {
        try { peer.destroy(); } catch (e) { console.log('ピア破棄エラー:', e); }
    }
    
    // 新しいピアを作成
    const peerOptions = {
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        },
        debug: 1
    };
    
    peer = new Peer(window.generateId(), peerOptions);
    
    // イベントハンドラ
    peer.on('open', (id) => {
        console.log('ピアID取得:', id);
        window.updateGameState({ currentPlayerId: id });
    });
    
    peer.on('connection', handleNewConnection);
    
    peer.on('error', (error) => {
        console.error('PeerJSエラー:', error);
        handlePeerError(error);
    });
    
    peer.on('disconnected', () => {
        console.log('PeerJS切断。再接続中...');
        setTimeout(() => peer.reconnect(), 1000);
    });
};

// 新規接続の処理
const handleNewConnection = (conn) => {
    console.log('新規接続:', conn.peer);
    
    // 既存接続の確認と交換
    if (connections[conn.peer]) {
        try { connections[conn.peer].close(); } catch (e) { console.warn('接続クローズエラー:', e); }
    }
    
    // 接続を保存
    connections[conn.peer] = conn;
    
    // イベント設定
    conn.on('open', () => {
        console.log('接続確立:', conn.peer);
        
        // ホストならゲーム状態を送信
        if (isHost) {
            setTimeout(() => sendGameState(conn), 500);
        }
        
        // データ受信ハンドラ
        conn.on('data', (data) => handleData(data, conn));
    });
    
    // 切断処理
    conn.on('close', () => {
        console.log('接続切断:', conn.peer);
        delete connections[conn.peer];
        
        // プレイヤー切断処理
        if (isHost) {
            removeDisconnectedPlayer(conn.peer);
        }
    });
    
    // エラー処理
    conn.on('error', (error) => {
        console.error('接続エラー:', error);
        delete connections[conn.peer];
    });
};

// データ受信処理
const handleData = (data, conn) => {
    console.log('データ受信:', data?.type || 'unknown');
    
    if (!data || typeof data !== 'object') return;
    
    // 現在の状態とプレイヤーIDを取得
    const currentState = window.getGameState();
    const myId = currentState.currentPlayerId;
    
    switch(data.type) {
        // ゲーム状態の更新
        case 'gameState':
            if (data.state && !isHost) {
                // 自分のIDだけ保持して状態を更新
                const newState = { ...data.state, currentPlayerId: myId };
                window.updateGameState(newState);
            }
            break;
        
        // プレイヤー参加通知
        case 'playerJoin':
            if (data.player && isHost) {
                // ホストなら、参加を処理して全員に通知
                window.addPlayer(data.player);
                broadcastGameState();
            }
            break;
        
        // ゲーム状態リクエスト
        case 'requestState':
            if (isHost) {
                sendGameState(conn);
            }
            break;
        
        // アクション通知
        case 'playerAction':
            if (isHost && data.action) {
                // ホストがアクションを処理
                handlePlayerAction(data.action);
                // 全員に更新を送信
                broadcastGameState();
            }
            break;
    }
};

// ゲーム状態の送信
const sendGameState = (conn) => {
    if (!conn || !conn.open) return;
    
    const state = window.getGameState();
    conn.send({ type: 'gameState', state: state });
};

// 全接続にゲーム状態を送信
const broadcastGameState = () => {
    const state = window.getGameState();
    
    Object.values(connections).forEach(conn => {
        if (conn && conn.open) {
            try {
                conn.send({ type: 'gameState', state: state });
            } catch (e) {
                console.error('状態送信エラー:', e);
            }
        }
    });
};

// ホストへのアクション送信
const sendActionToHost = (action) => {
    if (isHost) {
        // ホスト自身のアクション
        handlePlayerAction(action);
        broadcastGameState();
        return;
    }
    
    // ホストへの接続を探す
    const hostConn = connections[gameId];
    if (hostConn && hostConn.open) {
        hostConn.send({ type: 'playerAction', action: action });
    } else {
        console.error('ホストに接続できません');
    }
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

// 切断したプレイヤーの削除
const removeDisconnectedPlayer = (playerId) => {
    window.removePlayer(playerId);
    broadcastGameState();
};

// エラー処理
const handlePeerError = (error) => {
    console.error('PeerJSエラー:', error);
    
    if (error.type === 'peer-unavailable') {
        alert('指定されたゲームIDが見つかりません。IDを確認してください。');
    } else if (error.type === 'network' || error.type === 'server-error') {
        alert('ネットワークエラーが発生しました。');
    }
};

// ゲーム作成
window.createGame = (playerName) => {
    if (!playerName || playerName.trim() === '') {
        alert('プレイヤー名を入力してください');
        return null;
    }
    
    initializePeer();
    
    // ピア接続後に実行
    const waitForPeerOpen = () => {
        if (!peer || !peer.id) {
            setTimeout(waitForPeerOpen, 100);
            return;
        }
        
        isHost = true;
        gameId = peer.id;
        
        // 自分をプレイヤーとして追加
        const myPlayer = { id: peer.id, name: playerName, role: null, points: 0 };
        window.addPlayer(myPlayer);
        
        window.updateGameState({ 
            currentPlayerId: peer.id, 
            gameId: gameId
        });
        
        return gameId;
    };
    
    return waitForPeerOpen();
};

// ゲーム参加
window.joinGame = (gameId, playerName) => {
    if (!gameId || !playerName || playerName.trim() === '') {
        alert('ゲームIDとプレイヤー名を入力してください');
        return false;
    }
    
    initializePeer();
    
    // ピア接続後に実行
    const waitForPeerOpen = () => {
        if (!peer || !peer.id) {
            setTimeout(waitForPeerOpen, 100);
            return;
        }
        
        try {
            // ホストに接続
            const conn = peer.connect(gameId, { reliable: true });
            window.gameId = gameId;
            
            conn.on('open', () => {
                connections[gameId] = conn;
                
                // 自分のプレイヤー情報
                const myPlayer = { id: peer.id, name: playerName, role: null, points: 0 };
                window.addPlayer(myPlayer);
                
                // 自分の参加をホストに通知
                conn.send({ type: 'playerJoin', player: myPlayer });
                
                // ゲーム状態をリクエスト
                conn.send({ type: 'requestState' });
            });
            
            conn.on('error', (error) => {
                console.error('接続エラー:', error);
                alert('ゲームへの接続に失敗しました');
            });
            
            return true;
        } catch (e) {
            console.error('接続エラー:', e);
            alert('ゲームへの接続に失敗しました');
            return false;
        }
    };
    
    waitForPeerOpen();
    return true;
};

// アクション実行
window.executeAction = (actionType, params) => {
    const playerId = window.getGameState().currentPlayerId;
    const action = { 
        type: actionType, 
        playerId: playerId, 
        ...params 
    };
    
    sendActionToHost(action);
};

// ネットワークセットアップ
window.setupNetwork = () => {
    console.log('ネットワークセットアップ');
    initializePeer();
    return peer ? peer.id : null;
};

// 強制同期
window.forceStateSync = () => {
    if (!isHost) return false;
    broadcastGameState();
    return true;
};

// プレイヤーが接続中かチェック
window.isPlayerConnected = (playerId) => {
    return !!connections[playerId]?.open;
};

// ホストかどうか
window.isGameHost = () => isHost;
