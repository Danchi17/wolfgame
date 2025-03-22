// js/roles.js
// 役職の定義
const ROLES = {
  // 市民陣営
  SEER: {
    name: '占い師',
    team: 'village',
    cost: 3,
    description: '占い師のターン、誰か一人の役職を確認する。もしくは場札の2枚の役職を確認する'
  },
  FORTUNE_TELLER: {
    name: '占星術師',
    team: 'village',
    cost: 2,
    description: '場札を含め、6枚の場にある役職の内、人狼陣営が何個あるか数が分かる。'
  },
  APPRENTICE: {
    name: '占い師の弟子',
    team: 'village',
    cost: 2,
    description: '占い師のターン、誰か一人の役職を確認する。'
  },
  OUTLAW: {
    name: '無法者',
    team: 'village',
    cost: 1,
    description: '投票完了後、敗北していた時にランダムに他の人と役職を交換する。勝利条件が入れ替わる'
  },
  MAYOR: {
    name: '村長',
    team: 'village',
    cost: 3,
    description: '他のプレイヤーと違い、投票数が2票となる。'
  },
  THIEF: {
    name: '怪盗',
    team: 'village',
    cost: 1,
    description: '怪盗のターン時に他のプレイヤーと役職を入れ替えることが出来る'
  },
  
  // 人狼陣営
  SPY: {
    name: 'スパイ',
    team: 'werewolf',
    cost: 2,
    description: '狼のターン時に人狼陣営とお互いを確認できる。自分がスパイであることを人狼に知られるが、人狼陣営のプレイヤーは投票フェーズで「通報」可能。通報が当たれば市民陣営強制敗北、外れた場合は通報者の持ち点が追加で2点減少'
  },
  WEREWOLF: {
    name: '大熊',
    team: 'werewolf',
    cost: 5,
    description: '自身が吊られた時、プレイヤーの過半数が人狼サイドなら強制勝利する（スパイも人狼陣営に含む）'
  },
  SEER_WOLF: {
    name: '占い人狼',
    team: 'werewolf',
    cost: 4,
    description: '誰か一人のカードを確認する。もしくは場のカードを2枚確認する。狼のターン時に他の人狼と仲間同士であることを確認できない'
  },
  TROUBLESOME_PIG: {
    name: 'やっかいな豚男',
    team: 'werewolf',
    cost: 4, 
    description: '夜フェーズで指定したプレイヤーの投票先を強制的に指定できるが、自身は投票権を失う'
  },
  SNAKE_WOMAN: {
    name: '蛇女',
    team: 'werewolf',
    cost: 3,
    description: '同数投票で処刑される場合、単独で特殊勝利する。他の人狼陣営のプレイヤーは敗北とする。'
  },
  KNOWLEDGEABLE_PUPPY: {
    name: '博識な子犬',
    team: 'werewolf',
    cost: 3,
    description: '日中フェーズに場札のどちらかに含まれる市民陣営の役職を当てることができる。正解した場合は持ち点が2点回復する。'
  }
};

// 役職に関する機能
function getRandomRoles(playerCount) {
  // 利用可能な役職からランダムに選択
  const allRoles = Object.values(ROLES);
  const shuffled = [...allRoles].sort(() => 0.5 - Math.random());
  
  // プレイヤー数+場札2枚分の役職を選択
  return shuffled.slice(0, playerCount + 2);
}

function isWerewolfTeam(role) {
  return role && role.team === 'werewolf';
}

// 役職に関する機能の追加
function getVillageRoles() {
  return Object.values(ROLES).filter(role => role.team === 'village');
}

function getWerewolfRoles() {
  return Object.values(ROLES).filter(role => role.team === 'werewolf');
}

function getRoleByName(name) {
  return Object.values(ROLES).find(role => role.name === name);
}

function getRoleCost(roleName) {
  const role = getRoleByName(roleName);
  return role ? role.cost : 0;
}

export { 
  ROLES, 
  getRandomRoles, 
  isWerewolfTeam,
  getVillageRoles,
  getWerewolfRoles,
  getRoleByName,
  getRoleCost
};