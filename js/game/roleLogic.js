'use strict';

// 全ての役職情報を格納
window.roles = [
    { name: "占い師", team: "市民", cost: 3, ability: "占い師のターン、誰か一人の役職を確認する。もしくは場札の2枚の役職を確認する" },
    { name: "占星術師", team: "市民", cost: 2, ability: "場札を含め、6枚の場にある役職の内、人狼陣営が何個あるか数が分かる。" },
    { name: "占い師の弟子", team: "市民", cost: 1, ability: "占い師のターン、誰か一人の役職を確認する。" },
    { name: "無法者", team: "市民", cost: 1, ability: "投票完了後、敗北していた時にランダムに他の人と役職を交換する。勝利条件が入れ替わる" },
    { name: "村長", team: "市民", cost: 3, ability: "他のプレイヤーと違い、投票数が2票となる。" },
    { name: "怪盗", team: "市民", cost: 1, ability: "怪盗のターン時に他のプレイヤーと役職を入れ替えることが出来る" },
    { name: "大熊", team: "人狼", cost: 5, ability: "自身が吊られた時、プレイヤーの過半数が人狼サイドなら強制勝利する(スパイは人狼陣営に含まない)" },
    { name: "占い人狼", team: "人狼", cost: 4, ability: "誰か一人のカードを確認する。もしくは場のカードを2枚確認する。狼のターン時に他の人狼と仲間同士であることを確認できない" },
    { name: "やっかいな豚男", team: "人狼", cost: 3, ability: "任意の他のプレイヤー1人に★マークを付与する。★マークは1分間で消滅する。" },
    { name: "蛇女", team: "人狼", cost: 3, ability: "同数投票で処刑される場合、単独で特殊勝利する。他の人狼陣営のプレイヤーは敗北とする。" },
    { name: "博識な子犬", team: "人狼", cost: 3, ability: "日中のターンに市民陣営の特定の役職を当てることが出来れば、人狼陣営の勝利となる。" },
    { name: "スパイ", team: "市民", cost: 2, ability: "狼のターン時に人狼陣営とお互いを確認できる。スパイ通報ボタンが設置され、バレると市民陣営が強制敗北となる。" },
    { name: "村人", team: "市民", cost: 1, ability: "特殊な能力はないが、投票により人狼を処刑することで勝利する。" }
];

// 役職名から役職情報を取得する関数
window.getRoleByName = (roleName) => {
    // roleName値の確認
    if (!roleName) {
        console.warn('getRoleByName: roleName が null または undefined です');
        return null;
    }
    
    // 文字列かどうか確認
    if (typeof roleName !== 'string') {
        console.warn(`getRoleByName: roleName が文字列ではありません: ${typeof roleName}`);
        return null;
    }
    
    try {
        // 役職を検索
        return window.roles.find(role => role.name === roleName) || null;
    } catch (e) {
        console.error(`getRoleByName エラー: ${e.message}`);
        return null;
    }
};

// プレイヤーIDから役職情報を取得する関数
window.getPlayerRole = (playerId) => {
    try {
        // パラメータの検証
        if (!playerId) {
            console.warn('getPlayerRole: playerId が null または undefined です');
            return null;
        }
        
        // ゲーム状態の取得
        const state = window.getGameState();
        if (!state) {
            console.warn('getPlayerRole: ゲーム状態の取得に失敗しました');
            return null;
        }
        
        // プレイヤー情報の検索
        if (!state.players || !Array.isArray(state.players)) {
            console.warn('getPlayerRole: プレイヤー配列が存在しないか無効です');
            return null;
        }
        
        const player = state.players.find(p => p && p.id === playerId);
        if (!player) {
            console.warn(`getPlayerRole: ID ${playerId} のプレイヤーが見つかりません`);
            return null;
        }
        
        // 役職の割り当て確認
        if (!state.assignedRoles) {
            console.warn('getPlayerRole: assignedRoles が存在しません');
            return null;
        }
        
        const roleName = state.assignedRoles[playerId];
        if (!roleName) {
            console.warn(`getPlayerRole: プレイヤー ${playerId} の役職が割り当てられていません`);
            return null;
        }
        
        // 役職情報の取得
        return window.getRoleByName(roleName);
    } catch (e) {
        console.error(`getPlayerRole エラー: ${e.message}`, e);
        return null;
    }
};

// 役職を交換する関数
window.swapRoles = (player1Id, player2Id) => {
    try {
        // パラメータの検証
        if (!player1Id || !player2Id) {
            console.warn('swapRoles: 無効なプレイヤーID');
            return false;
        }
        
        const state = window.getGameState();
        if (!state || !state.assignedRoles) {
            console.warn('swapRoles: ゲーム状態または役職割り当てが存在しません');
            return false;
        }
        
        const temp = state.assignedRoles[player1Id];
        
        // プレイヤーに役職が割り当てられているか確認
        if (!state.assignedRoles[player1Id] || !state.assignedRoles[player2Id]) {
            console.warn('swapRoles: 一方または両方のプレイヤーに役職が割り当てられていません');
            return false;
        }
        
        // 役職の交換
        const updatedAssignedRoles = { ...state.assignedRoles };
        updatedAssignedRoles[player1Id] = state.assignedRoles[player2Id];
        updatedAssignedRoles[player2Id] = temp;
        
        window.updateGameState({ assignedRoles: updatedAssignedRoles });
        return true;
    } catch (e) {
        console.error(`swapRoles エラー: ${e.message}`, e);
        return false;
    }
};
