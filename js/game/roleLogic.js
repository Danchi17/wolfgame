'use strict';

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
    { name: "スパイ", team: "市民", cost: 2, ability: "狼のターン時に人狼陣営とお互いを確認できる。スパイ通報ボタンが設置され、バレると市民陣営が強制敗北となる。" }
];

window.getRoleByName = (roleName) => {
    return window.roles.find(role => role.name === roleName);
};

window.getPlayerRole = (playerId) => {
    const { players, assignedRoles } = window.getGameState();
    const player = players.find(p => p.id === playerId);
    return player ? window.getRoleByName(assignedRoles[playerId]) : null;
};

window.swapRoles = (player1Id, player2Id) => {
    const state = window.getGameState();
    const { assignedRoles } = state;
    const temp = assignedRoles[player1Id];
    assignedRoles[player1Id] = assignedRoles[player2Id];
    assignedRoles[player2Id] = temp;
    window.updateGameState({ assignedRoles });
};
