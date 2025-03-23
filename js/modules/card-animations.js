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
 * 山札から役職カードを配るアニメーション 
 * @param {string} deckPosition - 山札の位置（'center', 'top', 'left'など）
 * @param {Array<Object>} targets - 配布先の情報配列 [{element, position, delay}]
 * @param {Function} callback - アニメーション完了後のコールバック（オプション）
 */
function dealCardsFromDeck(deckPosition, targets, callback) {
  // 山札の初期表示
  const deck = document.createElement('div');
  deck.className = 'deck';
  deck.innerHTML = `
    <div class="deck-inner">
      <div class="deck-card"></div>
    </div>
  `;
  document.body.appendChild(deck);
  
  // 山札の位置を設定
  const setDeckPosition = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    switch(deckPosition) {
      case 'center':
        deck.style.left = `${windowWidth / 2 - 75}px`;
        deck.style.top = `${windowHeight / 2 - 100}px`;
        break;
      case 'top':
        deck.style.left = `${windowWidth / 2 - 75}px`;
        deck.style.top = '50px';
        break;
      case 'left':
        deck.style.left = '50px';
        deck.style.top = `${windowHeight / 2 - 100}px`;
        break;
      default:
        deck.style.left = `${windowWidth / 2 - 75}px`;
        deck.style.top = `${windowHeight / 2 - 100}px`;
    }
  };
  
  setDeckPosition();
  window.addEventListener('resize', setDeckPosition);
  
  // 山札からカードを順番に配る
  let currentIndex = 0;
  
  const dealNext = () => {
    if (currentIndex >= targets.length) {
      // 全てのカードを配布した後、山札を非表示
      deck.classList.add('deck-empty');
      setTimeout(() => {
        deck.remove();
        if (callback) callback();
      }, 500);
      return;
    }
    
    const target = targets[currentIndex];
    currentIndex++;
    
    // カードを作成して山札から配る
    const card = document.createElement('div');
    card.className = 'card flying-card';
    card.innerHTML = `<div class="card-inner"></div>`;
    document.body.appendChild(card);
    
    // 山札の位置を取得
    const deckRect = deck.getBoundingClientRect();
    
    // カードの初期位置を山札に合わせる
    card.style.left = `${deckRect.left}px`;
    card.style.top = `${deckRect.top}px`;
    
    // 対象要素の位置を取得
    const targetRect = target.element.getBoundingClientRect();
    
    // アニメーション時間を設定
    const animationDuration = 500;
    
    // カードを対象位置へ移動
    setTimeout(() => {
      card.style.transition = `left ${animationDuration}ms ease-out, top ${animationDuration}ms ease-out`;
      card.style.left = `${targetRect.left}px`;
      card.style.top = `${targetRect.top}px`;
      
      // アニメーション完了後、カードを非表示にし、次のカードを配る
      setTimeout(() => {
        card.remove();
        target.element.classList.add('card-received');
        
        // 遅延して次のカードを配る
        setTimeout(dealNext, target.delay || 200);
      }, animationDuration);
    }, 50);
  };
  
  // カードの配布アニメーションを少し遅延して開始
  setTimeout(dealNext, 300);
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

/**
 * 役職カードを作成する関数
 * @param {Object} role - 役職情報オブジェクト
 * @returns {HTMLElement} 作成されたカード要素
 */
function createRoleCard(role) {
  const cardElement = document.createElement('div');
  cardElement.className = 'card role-card';
  
  // 役職画像のURLを取得
  const roleImageUrl = `assets/images/roles/${role.name}.jpg`;
  
  // カードの表と裏を作成
  cardElement.innerHTML = `
    <div class="card-front">
      <div class="role-image">
        <img src="${roleImageUrl}" alt="${role.name}" onerror="this.src='assets/images/roles/unknown.jpg'">
      </div>
      <div class="role-info">
        <div class="role-name">${role.name}</div>
        <div class="role-team ${role.team === 'village' ? 'team-village' : 'team-werewolf'}">${role.team === 'village' ? '市民陣営' : '人狼陣営'}</div>
        <div class="role-cost">コスト: ${role.cost}</div>
      </div>
      <div class="role-description">${role.description}</div>
    </div>
    <div class="card-back"></div>
  `;
  
  return cardElement;
}

export {
  flipCard,
  flipCardSequence,
  dealCardsFromDeck,
  dealFieldCards,
  revealResultCard,
  dealHandCard,
  createRoleCard
};
