// js/ui-effects.js
// UIアニメーションと視覚効果の管理

/**
 * カードフリップアニメーション
 * @param {HTMLElement} cardElement - 対象のカード要素
 * @param {boolean} showBack - 裏面を表示するかどうか
 * @param {number} delay - アニメーション遅延（ミリ秒）
 * @param {Function} callback - アニメーション完了後のコールバック
 */
export function flipCard(cardElement, showBack = true, delay = 0, callback = null) {
  // アニメーション遅延が指定されている場合
  if (delay > 0) {
    setTimeout(() => {
      performFlip(cardElement, showBack, callback);
    }, delay);
  } else {
    performFlip(cardElement, showBack, callback);
  }
}

/**
 * カードフリップアニメーションの実行
 */
function performFlip(cardElement, showBack, callback) {
  if (!cardElement) return;
  
  // カードがすでに目的の状態にある場合は何もしない
  if ((showBack && cardElement.classList.contains('flipped')) || 
      (!showBack && !cardElement.classList.contains('flipped'))) {
    if (callback) callback();
    return;
  }
  
  // フリップアニメーション
  if (showBack) {
    cardElement.classList.add('flipped');
  } else {
    cardElement.classList.remove('flipped');
  }
  
  // アニメーション完了時のコールバックを設定
  cardElement.addEventListener('transitionend', function handleTransitionEnd() {
    cardElement.removeEventListener('transitionend', handleTransitionEnd);
    if (callback) callback();
  }, { once: true });
}

/**
 * 夜フェーズの暗い背景効果
 * @param {boolean} enable - 効果を有効にするかどうか
 */
export function nightModeEffect(enable = true) {
  const gameContainer = document.querySelector('.game-container');
  if (!gameContainer) return;
  
  if (enable) {
    // 夜モードエフェクトを適用
    if (!document.getElementById('night-overlay')) {
      const nightOverlay = document.createElement('div');
      nightOverlay.id = 'night-overlay';
      nightOverlay.className = 'night-overlay';
      
      // 月のエフェクト
      const moon = document.createElement('div');
      moon.className = 'night-moon';
      
      // 星のエフェクト
      for (let i = 0; i < 20; i++) {
        const star = document.createElement('div');
        star.className = 'night-star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 3}s`;
        star.style.animationDuration = `${1 + Math.random() * 2}s`;
        nightOverlay.appendChild(star);
      }
      
      nightOverlay.appendChild(moon);
      document.body.appendChild(nightOverlay);
      
      // フェードイン
      setTimeout(() => {
        nightOverlay.classList.add('visible');
      }, 10);
    }
  } else {
    // 夜モードエフェクトを解除
    const nightOverlay = document.getElementById('night-overlay');
    if (nightOverlay) {
      nightOverlay.classList.remove('visible');
      
      // フェードアウト後に削除
      setTimeout(() => {
        nightOverlay.remove();
      }, 500);
    }
  }
}

/**
 * 要素をフェードインさせる
 * @param {HTMLElement} element - フェードイン対象の要素
 * @param {number} delay - 遅延時間（ミリ秒）
 * @param {number} duration - アニメーション時間（ミリ秒）
 */
export function fadeIn(element, delay = 0, duration = 500) {
  if (!element) return;
  
  // 初期スタイル
  element.style.opacity = '0';
  element.style.transition = `opacity ${duration}ms ease`;
  
  setTimeout(() => {
    element.style.opacity = '1';
  }, delay);
}

/**
 * 要素をフェードアウトさせる
 * @param {HTMLElement} element - フェードアウト対象の要素
 * @param {number} delay - 遅延時間（ミリ秒）
 * @param {number} duration - アニメーション時間（ミリ秒）
 * @param {boolean} remove - フェードアウト後に削除するか
 */
export function fadeOut(element, delay = 0, duration = 500, remove = false) {
  if (!element) return;
  
  // トランジションの設定
  element.style.transition = `opacity ${duration}ms ease`;
  
  setTimeout(() => {
    element.style.opacity = '0';
    
    // 削除オプションが指定されている場合
    if (remove) {
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }, duration);
    }
  }, delay);
}

/**
 * 投票エフェクト
 * @param {string} fromId - 投票元プレイヤーID
 * @param {string} toId - 投票先プレイヤーID
 */
export function voteEffect(fromId, toId) {
  const fromElement = document.querySelector(`.player[data-player-id="${fromId}"]`);
  const toElement = document.querySelector(`.player[data-player-id="${toId}"]`);
  
  if (!fromElement || !toElement) return;
  
  // 投票パーティクルを作成
  const particle = document.createElement('div');
  particle.className = 'vote-particle';
  document.body.appendChild(particle);
  
  // 開始位置と終了位置を取得
  const fromRect = fromElement.getBoundingClientRect();
  const toRect = toElement.getBoundingClientRect();
  
  // パーティクルの開始位置を設定
  particle.style.left = `${fromRect.left + fromRect.width / 2}px`;
  particle.style.top = `${fromRect.top + fromRect.height / 2}px`;
  
  // アニメーションの設定
  const animation = particle.animate([
    { 
      left: `${fromRect.left + fromRect.width / 2}px`, 
      top: `${fromRect.top + fromRect.height / 2}px`,
      opacity: 1,
      transform: 'scale(0.5)'
    },
    { 
      left: `${toRect.left + toRect.width / 2}px`, 
      top: `${toRect.top + toRect.height / 2}px`,
      opacity: 1,
      transform: 'scale(1.2)'
    },
    { 
      left: `${toRect.left + toRect.width / 2}px`, 
      top: `${toRect.top + toRect.height / 2}px`,
      opacity: 0,
      transform: 'scale(0.5)'
    }
  ], {
    duration: 1000,
    easing: 'cubic-bezier(0.42, 0, 0.58, 1)'
  });
  
  // アニメーション完了後にパーティクルを削除
  animation.onfinish = () => {
    particle.remove();
    
    // 対象プレイヤーをハイライト
    toElement.classList.add('vote-target');
    setTimeout(() => {
      toElement.classList.remove('vote-target');
    }, 1000);
  };
}

/**
 * 役職めくりエフェクト（結果表示時）
 * @param {string} playerId - プレイヤーID
 * @param {string} roleName - 役職名
 * @param {string} team - 陣営名
 */
export function revealRole(playerId, roleName, team) {
  const playerElement = document.querySelector(`.player[data-player-id="${playerId}"]`);
  if (!playerElement) return;
  
  // 役職カードを作成
  const roleCard = document.createElement('div');
  roleCard.className = 'role-reveal-card';
  roleCard.innerHTML = `
    <div class="role-reveal-front"></div>
    <div class="role-reveal-back">
      <div class="role-reveal-name">${roleName}</div>
      <div class="role-reveal-team ${team === 'village' ? 'village-team' : 'werewolf-team'}">
        ${team === 'village' ? '市民陣営' : '人狼陣営'}
      </div>
    </div>
  `;
  
  // プレイヤー要素に追加
  playerElement.appendChild(roleCard);
  
  // フリップアニメーション
  setTimeout(() => {
    roleCard.classList.add('flipped');
    
    // チーム表示に合わせてプレイヤー要素にクラスを追加
    if (team === 'village') {
      playerElement.classList.add('village-revealed');
    } else {
      playerElement.classList.add('werewolf-revealed');
    }
  }, 500);
  
  // アニメーション終了後にカードを削除
  setTimeout(() => {
    roleCard.classList.add('fade-out');
    setTimeout(() => {
      roleCard.remove();
    }, 500);
  }, 3000);
}

/**
 * 勝利エフェクト
 * @param {string} team - 勝利チーム
 */
export function victoryEffect(team) {
  // 勝利エフェクトオーバーレイを作成
  const victoryOverlay = document.createElement('div');
  victoryOverlay.className = `victory-overlay ${team}-victory`;
  
  const content = document.createElement('div');
  content.className = 'victory-content';
  content.innerHTML = `
    <h2 class="victory-title">
      ${team === 'village' ? '市民陣営の勝利！' : 
        team === 'werewolf' ? '人狼陣営の勝利！' : 
        team === 'snake_woman' ? '蛇女の単独勝利！' : '特殊勝利！'}
    </h2>
    <div class="victory-animation"></div>
  `;
  
  victoryOverlay.appendChild(content);
  document.body.appendChild(victoryOverlay);
  
  // フェードイン
  setTimeout(() => {
    victoryOverlay.classList.add('visible');
  }, 100);
  
  // 数秒後にフェードアウト
  setTimeout(() => {
    victoryOverlay.classList.remove('visible');
    setTimeout(() => {
      victoryOverlay.remove();
    }, 1000);
  }, 4000);
}
