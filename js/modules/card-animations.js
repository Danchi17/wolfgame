// js/modules/card-animations.js
/**
 * カードアニメーション関連モジュール
 * 役職カードのフリップや配置などのアニメーションを管理
 */

/**
 * カードをフリップするアニメーション
 * @param {HTMLElement} cardElement - カード要素
 * @param {boolean} showBack - 裏面を表示する場合true
 * @param {Function} callback - アニメーション完了後のコールバック関数（オプション）
 */
function flipCard(cardElement, showBack, callback) {
  // カードが既に目的の状態ならアニメーションしない
  if ((showBack && cardElement.classList.contains('flipped')) || 
      (!showBack && !cardElement.classList.contains('flipped'))) {
    if (callback) callback();
    return;
  }
  
  // トランジション終了イベントを追加
  const onTransitionEnd = function() {
    cardElement.removeEventListener('transitionend', onTransitionEnd);
    if (callback) callback();
  };
  
  cardElement.addEventListener('transitionend', onTransitionEnd);
  
  // フリップアニメーション開始
  if (showBack) {
    cardElement.classList.add('flipped');
  } else {
    cardElement.classList.remove('flipped');
  }
}

/**
 * 複数のカードを順番にフリップ
 * @param {Array<HTMLElement>} cardElements - カード要素の配列
 * @param {boolean} showBack - 裏面を表示する場合true
 * @param {number} delay - カード間のフリップ遅延（ミリ秒）
 * @param {Function} callback - 全てのアニメーション完了後のコールバック（オプション）
 */
function flipCardSequence(cardElements, showBack, delay = 200, callback) {
  if (!cardElements || cardElements.length === 0) {
    if (callback) callback();
    return;
  }
  
  let currentIndex = 0;
  const flipNext = () => {
    if (currentIndex >= cardElements.length) {
      if (callback) callback();
      return;
    }
    
    const currentCard = cardElements[currentIndex];
    currentIndex++;
    
    flipCard(currentCard, showBack, () => {
      // 次のカードのフリップを遅延実行
      setTimeout(flipNext, delay);
    });
  };
  
  // 最初のカードから開始
  flipNext();
}

/**
 * フィールドカードを配置するアニメーション
 * @param {Array<HTMLElement>} cardElements - カード要素の配列
 * @param {Function} callback - アニメーション完了後のコールバック（オプション）
 */
function dealFieldCards(cardElements, callback) {
  if (!cardElements || cardElements.length === 0) {
    if (callback) callback();
    return;
  }
  
  // 元の位置を保存
  const originalPositions = cardElements.map(card => {
    const rect = card.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  });
  
  // アニメーション用のクラスを追加
  cardElements.forEach(card => {
    card.classList.add('card-dealing');
    card.style.opacity = '0';
    card.style.transform = 'translateY(-50px) scale(0.8)';
  });
  
  // 順番にカードを表示
  let currentIndex = 0;
  const dealNext = () => {
    if (currentIndex >= cardElements.length) {
      if (callback) callback();
      return;
    }
    
    const currentCard = cardElements[currentIndex];
    currentIndex++;
    
    // カードを表示
    currentCard.style.opacity = '1';
    currentCard.style.transform = 'translateY(0) scale(1)';
    
    // 次のカードを遅延実行
    setTimeout(dealNext, 300);
  };
  
  // 少し遅延して最初のカードから配置開始
  setTimeout(dealNext, 100);
}

/**
 * ゲーム結果表示時のカード回転アニメーション
 * @param {HTMLElement} cardElement - カード要素
 * @param {Function} callback - アニメーション完了後のコールバック（オプション）
 */
function revealResultCard(cardElement, callback) {
  if (!cardElement) {
    if (callback) callback();
    return;
  }
  
  // 回転アニメーション用のクラスを追加
  cardElement.classList.add('reveal-result');
  
  // アニメーション完了後のイベント
  const onAnimationEnd = function() {
    cardElement.removeEventListener('animationend', onAnimationEnd);
    cardElement.classList.remove('reveal-result');
    cardElement.classList.add('revealed');
    if (callback) callback();
  };
  
  cardElement.addEventListener('animationend', onAnimationEnd);
}

/**
 * カード配布のエフェクト（プレイヤーの手札）
 * @param {HTMLElement} handElement - 手札要素のコンテナ
 * @param {Function} callback - アニメーション完了後のコールバック（オプション）
 */
function dealHandCard(handElement, callback) {
  if (!handElement) {
    if (callback) callback();
    return;
  }
  
  // アニメーション初期状態
  handElement.style.opacity = '0';
  handElement.style.transform = 'translateY(20px) scale(0.95)';
  
  // アニメーション開始
  setTimeout(() => {
    handElement.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    handElement.style.opacity = '1';
    handElement.style.transform = 'translateY(0) scale(1)';
    
    // アニメーション完了後
    setTimeout(() => {
      if (callback) callback();
    }, 500);
  }, 100);
}

// 役職カードを作成する関数
function createRoleCard(role) {
  const cardElement = document.createElement('div');
  cardElement.className = 'card role-card';
  
  // カードの表と裏を作成
  cardElement.innerHTML = `
    <div class="card-front">
      <div class="role-name">${role.name}</div>
      <div class="role-team">${role.team === 'village' ? '市民陣営' : '人狼陣営'}</div>
      <div class="role-cost">コスト: ${role.cost}</div>
      <div class="role-description">${role.description}</div>
    </div>
    <div class="card-back"></div>
  `;
  
  return cardElement;
}

export {
  flipCard,
  flipCardSequence,
  dealFieldCards,
  revealResultCard,
  dealHandCard,
  createRoleCard
};
