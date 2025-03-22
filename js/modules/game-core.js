// js/modules/game-core.js
import { db, auth, get, ref, update } from '../firebase.js';
import { notificationSystem } from '../ui.js';
import { getRandomRoles, isWerewolfTeam } from '../roles.js';
import { handleSeerAbility } from './role-abilities/seer.js';
import { handleWerewolfAbility } from './role-abilities/werewolf.js';
import { handleThiefAbility } from './role-abilities/thief.js';
import { handleSpyAbility } from './role-abilities/spy.js';
import { handleDayPhase } from './phase-day.js';
import { handleVotingPhase } from './phase-voting.js';
import { handleResultPhase } from './phase-result.js';
import LoadingIndicator from './loading.js';

// 現在のプレイヤー情報
export const currentPlayer = {
  id: null,
  data: null
};

// 現在のゲームID
let currentGameId = null;

// フェーズ自動遷移用タイマーID保存
const phaseTimers = {
  seer: null,
  werewolf: null,
  thief: null,
  day: null,
  voting: null
};

/**
 * タイマーをクリアする
 * @param {string} phase - クリアするフェーズのタイマー
 */
function clearPhaseTimer(phase) {
  if (phaseTimers[phase]) {
    console.log(`${phase}フェーズのタイマーをクリアします`);
    clearTimeout(phaseTimers[phase]);
    phaseTimers[phase] = null;
  }
}

/**
 * すべてのフェーズタイマーをクリアする
 */
function clearAllPhaseTimers() {
  Object.keys(phaseTimers).forEach(phase => {
    clearPhaseTimer(phase);
  });
  console.log('すべてのフェーズタイマーをクリアしました');
}

/**
 * ゲームIDを取得
 * @param {Object} gameData - ゲームデータ
 * @returns {string} ゲームID
 */
export function getGameId(gameData) {
  return currentGameId || gameData?.gameId || null;
}

/**
 * ゲームを初期化
 * @param {Object} gameData - ゲームデータ
 * @param {string} playerId - プレイヤーID
 */
export function initGame(gameData, playerId) {
  // まず全てのタイマーをクリア
  clearAllPhaseTimers();
  
  // ゲームIDを設定
  currentGameId = gameData.gameId;
  
  // 現在のプレイヤー情報を設定
  currentPlayer.id = playerId;
  currentPlayer.data = gameData.players[playerId];
  
  console.log(`ゲームを初期化: プレイヤー=${currentPlayer.data.name}, 役職=${currentPlayer.data.role?.name || 'なし'}`);
}

/**
 * ゲームを開始
 * @param {string} gameId - ゲームID
 * @returns {Promise} 更新処理の結果
 */
export async function startGame(gameId) {
  try {
    console.log(`ゲーム開始: ID=${gameId}`);
    
    // 既存のタイマーをすべてクリア
    clearAllPhaseTimers();
    
    // プレイヤー数を取得
    const snapshot = await get(ref(db, `games/${gameId}/players`));
    const players = snapshot.val();
    
    if (!players) {
      notificationSystem.error('プレイヤーデータの取得に失敗しました');
      return false;
    }
    
    const playerCount = Object.keys(players).length;
    if (playerCount < 4) {
      notificationSystem.error('ゲームを開始するには最低4人のプレイヤーが必要です');
      return false;
    }
    
    // ランダムな役職を取得
    const roles = getRandomRoles(playerCount);
    const playerIds = Object.keys(players);
    
    // 更新データを準備
    const updates = {};
    
    // 役職をランダムに割り当て
    const shuffledPlayerIds = [...playerIds].sort(() => 0.5 - Math.random());
    
    shuffledPlayerIds.forEach((id, index) => {
      if (index < playerCount) {
        updates[`players/${id}/role`] = roles[index];
      }
    });
    
    // 場札を設定（残りの役職）
    const fieldCards = roles.slice(playerCount);
    updates.field_cards = fieldCards;
    
    // ゲーム状態を夜フェーズに更新
    updates.status = 'night';
    updates.current_phase = 'seer';
    
    // 全て更新
    await update(ref(db, `games/${gameId}`), updates);
    
    notificationSystem.success('ゲームが開始されました！');
    return true;
  } catch (error) {
    console.error('ゲーム開始エラー:', error);
    notificationSystem.error('ゲームの開始に失敗しました');
    return false;
  }
}

/**
 * ゲームフェーズを処理
 * @param {string} phase - 現在のフェーズ
 * @param {Object} gameData - ゲームデータ
 */
export function handlePhase(phase, gameData) {
  console.log(`フェーズ処理: ${phase}`);
  
  // すべてのタイマーをクリア
  clearAllPhaseTimers();
  
  // ローディング表示を非表示
  LoadingIndicator.hide();
  
  switch (phase) {
    case 'night':
      handleNightPhase(gameData);
      break;
    case 'day':
      handleDayPhase(gameData);
      break;
    case 'voting':
      handleVotingPhase(gameData);
      break;
    case 'result':
      handleResultPhase(gameData);
      break;
    default:
      console.log('未知のフェーズ:', phase);
  }
}

/**
 * 夜フェーズの処理
 * @param {Object} gameData - ゲームデータ
 */
function handleNightPhase(gameData) {
  const currentPhase = gameData.current_phase;
  
  // 対応するフェーズのタイマーをクリア
  clearPhaseTimer(currentPhase);
  
  switch (currentPhase) {
    case 'seer':
      handleSeerAbility(gameData);
      break;
    case 'werewolf':
      handleWerewolfAbility(gameData);
      handleSpyAbility(gameData);
      break;
    case 'thief':
      handleThiefAbility(gameData);
      break;
    default:
      console.log('不明な夜フェーズ:', currentPhase);
  }
}

/**
 * 次のフェーズに進む
 * @param {string} gameId - ゲームID
 * @param {string} currentPhase - 現在のフェーズ
 */
export async function nextPhase(gameId, currentPhase) {
  try {
    // 対応するフェーズのタイマーをクリア
    clearPhaseTimer(currentPhase);
    
    let nextPhaseValue;
    let updates = {};
    
    // フェーズの順序と遷移を定義
    switch (currentPhase) {
      case 'seer':
        nextPhaseValue = 'werewolf';
        updates.current_phase = nextPhaseValue;
        break;
      case 'werewolf':
        nextPhaseValue = 'thief';
        updates.current_phase = nextPhaseValue;
        break;
      case 'thief':
        // 夜フェーズ終了、日中フェーズへ
        updates.status = 'day';
        updates.current_phase = null;
        nextPhaseValue = 'day';
        
        // タイマーを設定
        const now = Date.now();
        updates.timer = {
          duration: 180, // 3分
          start_time: now
        };
        break;
      case 'day':
        // 日中フェーズ終了、投票フェーズへ
        updates.status = 'voting';
        updates.current_phase = null;
        nextPhaseValue = 'voting';
        break;
      case 'voting':
        // 投票フェーズ終了、結果フェーズへ
        updates.status = 'result';
        updates.current_phase = null;
        nextPhaseValue = 'result';
        break;
      case 'result':
        // 結果フェーズはゲームの最終フェーズのため、次のフェーズはない
        // この場合は何も更新せず、通知だけを表示する
        console.log('結果フェーズが終了しました。次のゲームに移行するには「次のゲームへ」ボタンを押してください。');
        notificationSystem.info('結果確認が完了しました。次のゲームに移行するには「次のゲームへ」ボタンを押してください。');
        return;
      default:
        console.error('不明なフェーズ:', currentPhase);
        return;
    }
    
    await update(ref(db, `games/${gameId}`), updates);
    console.log(`フェーズ移行: ${currentPhase} → ${nextPhaseValue}`);
    notificationSystem.info(`${getPhaseDisplayName(nextPhaseValue)}に移行しました`);
    
  } catch (error) {
    console.error('フェーズ移行エラー:', error);
    notificationSystem.error('フェーズの移行に失敗しました');
  }
}

/**
 * フェーズの表示名を取得
 * @param {string} phase - フェーズ名
 * @returns {string} 表示名
 */
function getPhaseDisplayName(phase) {
  switch (phase) {
    case 'seer': return '占い師フェーズ';
    case 'werewolf': return '人狼フェーズ';
    case 'thief': return '怪盗フェーズ';
    case 'day': return '日中フェーズ';
    case 'voting': return '投票フェーズ';
    case 'result': return '結果発表フェーズ';
    default: return phase;
  }
}

/**
 * タイマーの残り時間を取得
 * @param {Object} timer - タイマー情報
 * @returns {number} 残り秒数
 */
export function getRemainingTime(timer) {
  if (!timer || !timer.start_time) return 0;
  
  const now = Date.now();
  const elapsed = Math.floor((now - timer.start_time) / 1000);
  const remaining = Math.max(0, timer.duration - elapsed);
  
  return remaining;
}

/**
 * プレイヤーが特定の役職か確認
 * @param {string} roleName - 役職名
 * @returns {boolean} 該当すればtrue
 */
export function hasRole(roleName) {
  return currentPlayer.data?.role?.name === roleName;
}

/**
 * タイマーを設定（フェーズの自動遷移用）
 * @param {string} gameId - ゲームID 
 * @param {string} phase - 現在のフェーズ
 * @param {number} delay - 遅延時間（ミリ秒）
 */
export function setPhaseTimer(gameId, phase, delay) {
  // 既存のタイマーをクリア
  clearPhaseTimer(phase);
  
  // 新しいタイマーを設定
  phaseTimers[phase] = setTimeout(() => {
    console.log(`タイマーによる自動フェーズ移行: ${phase}`);
    nextPhase(gameId, phase);
  }, delay);
  
  console.log(`${phase}フェーズのタイマーを設定しました (${delay}ms)`);
}