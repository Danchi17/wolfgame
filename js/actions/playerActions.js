'use strict';

window.performAction = (playerId, actionType, target) => {
    try {
        const state = window.getGameState();
        
        // 既にアクションを実行済みかチェック
        if (state.actions && state.actions[playerId]) {
            return '既にアクションを実行しています。';
        }
        
        // プレイヤーの役職を取得
        const playerRole = window.getPlayerRole(playerId);
        if (!playerRole) {
            return 'プレイヤー役職が取得できません';
        }
        
        // アクション実行
        let result = '';
        switch (actionType) {
            case '占い師':
            case '占い人狼':
            case '占い師の弟子':
                result = performSeerAction(playerId, target, state);
                break;
            case '占星術師':
                result = performAstrologerAction(state);
                break;
            case '怪盗':
                result = performThiefAction(playerId, target, state);
                break;
            case 'reportSpy':
                result = window.reportSpy(playerId, target);
                break;
            default:
                result = 'アクションが無効です。';
        }
        
        // アクション記録
        window.updateGameState({
            actions: {
                ...(state.actions || {}),
                [playerId]: { actionType, target }
            }
        });
        
        return result;
    } catch (error) {
        console.error('アクション実行エラー:', error);
        return 'エラーが発生しました。';
    }
};

// その他の関数はそのまま残す...
