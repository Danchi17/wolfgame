'use strict';

window.performAction = (playerId, actionType, target) => {
    try {
        const state = window.getGameState();
        if (!state) {
            console.error('ゲーム状態が取得できません');
            return 'ゲーム状態エラー';
        }

        // プレイヤーIDの存在確認
        if (!playerId) {
            console.error('プレイヤーIDが指定されていません');
            return 'プレイヤーIDエラー';
        }

        // 既にアクションを実行済みかチェック
        if (state.actions && state.actions[playerId]) {
            return '既にアクションを実行しています。';
        }

        // プレイヤーの役職を取得
        let playerRole;
        try {
            playerRole = window.getPlayerRole(playerId);
        } catch (e) {
            console.error('プレイヤー役職取得エラー:', e);
            return 'プレイヤー役職エラー';
        }

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
            default:
                result = 'アクションが無効です。';
        }

        // アクション記録の更新
        try {
            window.updateGameState({
                actions: {
                    ...(state.actions || {}),
                    [playerId]: { actionType, target }
                }
            });
        } catch (e) {
            console.error('アクション記録エラー:', e);
        }

        return result;
    } catch (error) {
        console.error('アクション実行エラー:', error);
        return 'エラーが発生しました。';
    }
};

const performSeerAction = (playerId, target, state) => {
    try {
        if (target === 'centerCards') {
            if (!state.centerCards || !Array.isArray(state.centerCards)) {
                return '場札情報が取得できません';
            }
            return `場札の役職: ${state.centerCards.map(card => card && card.name ? card.name : '不明').join(', ')}`;
        } else {
            if (!target) {
                return 'ターゲットが指定されていません';
            }
            if (!state.players) {
                return 'プレイヤー情報が取得できません';
            }
            
            const targetPlayer = state.players.find(p => p.id === target);
            if (!targetPlayer) {
                return 'ターゲットプレイヤーが見つかりません';
            }

            const targetRole = state.assignedRoles ? state.assignedRoles[target] : null;
            if (!targetRole) {
                return `${targetPlayer.name}の役職情報が取得できません`;
            }

            return `${targetPlayer.name}の役職: ${targetRole}`;
        }
    } catch (error) {
        console.error('占い師アクションエラー:', error);
        return 'エラーが発生しました。';
    }
};

const performAstrologerAction = (state) => {
    try {
        if (!state.assignedRoles || !state.centerCards) {
            return '役職情報が取得できません';
        }

        // 全ての役職を取得
        const allRoles = [
            ...Object.values(state.assignedRoles),
            ...(Array.isArray(state.centerCards) ? state.centerCards.map(card => card && card.name ? card.name : null) : [])
        ].filter(role => role); // nullやundefinedをフィルタリング

        // 役職リストからroleLogic.jsを参照して役職情報を取得
        const werewolfCount = allRoles.filter(roleName => {
            const role = window.getRoleByName(roleName);
            return role && role.team === '人狼';
        }).length;

        return `場に存在する人狼陣営の役職の数: ${werewolfCount}`;
    } catch (error) {
        console.error('占星術師アクションエラー:', error);
        return 'エラーが発生しました。';
    }
};

const performThiefAction = (thiefId, targetId, state) => {
    try {
        if (!thiefId || !targetId) {
            return 'プレイヤーIDが指定されていません';
        }

        if (!state.assignedRoles) {
            return '役職情報が取得できません';
        }

        const thiefRole = state.assignedRoles[thiefId];
        const targetRole = state.assignedRoles[targetId];
        
        if (!thiefRole || !targetRole) {
            return '役職情報が取得できません';
        }

        // 役職交換
        window.updateGameState({
            assignedRoles: {
                ...state.assignedRoles,
                [thiefId]: targetRole,
                [targetId]: thiefRole
            }
        });

        const targetPlayer = state.players.find(p => p.id === targetId);
        if (!targetPlayer) {
            return '役職を交換しました。';
        }

        return `${targetPlayer.name}と役職を交換しました。あなたの新しい役職: ${targetRole}`;
    } catch (error) {
        console.error('怪盗アクションエラー:', error);
        return 'エラーが発生しました。';
    }
};

window.performRoleAction = (phase) => {
    try {
        const state = window.getGameState();
        if (!state || !state.players) {
            console.error('ゲーム状態が取得できません');
            return;
        }

        // 各フェーズの対象プレイヤーを取得
        const eligiblePlayers = state.players.filter(player => {
            if (!player || !player.id) return false;

            try {
                const role = window.getPlayerRole(player.id);
                return role && (
                    (phase === '占い師' && ['占い師', '占い人狼', '占い師の弟子'].includes(role.name)) ||
                    (phase === '人狼' && role.team === '人狼') ||
                    (phase === '怪盗' && role.name === '怪盗')
                );
            } catch (e) {
                console.error('プレイヤー役職取得エラー:', e);
                return false;
            }
        });

        // 対象プレイヤーがいない場合は何もしない
        if (!eligiblePlayers.length) {
            console.log(`${phase}フェーズの対象プレイヤーがいません`);
            return;
        }

        // 各プレイヤーのアクションを実行
        eligiblePlayers.forEach(player => {
            if (!player || !player.id) return;

            // ターゲットを選択
            const targets = state.players.filter(p => p && p.id && p.id !== player.id);
            if (!targets.length) {
                console.log(`プレイヤー${player.id}のターゲットがいません`);
                return;
            }

            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
            if (!randomTarget || !randomTarget.id) {
                console.log(`プレイヤー${player.id}のランダムターゲットが取得できませんでした`);
                return;
            }

            try {
                const playerRole = window.getPlayerRole(player.id);
                if (!playerRole || !playerRole.name) {
                    console.log(`プレイヤー${player.id}の役職が取得できませんでした`);
                    return;
                }

                window.performAction(player.id, playerRole.name, randomTarget.id);
            } catch (e) {
                console.error(`プレイヤー${player.id}のアクション実行エラー:`, e);
            }
        });
    } catch (error) {
        console.error('役職アクション実行エラー:', error);
    }
};
