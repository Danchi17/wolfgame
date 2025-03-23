// js/modules/card-animations.js
/**
 * カードアニメーション関連モジュール
 * 役職カードの配布・めくりなどのアニメーションを管理
 */

/**
 * 山札からカードを配る演出
 * @param {Array<HTMLElement>} targetElements - カードの配布先要素の配列
 * @param {Object} options - アニメーションオプション
 * @param {Function} onComplete - 配布完了後のコールバック関数
 */
function dealCardsFromDeck(targetElements, options = {}, onComplete) {
  // デフォルトオプション
  const defaultOptions = {
    deckPosition: { 
      left: window.innerWidth / 2, 
      top: 100 
    },
    delay: 300, // カード間の配布の遅延
    duration: 600, // アニメーション速度
    easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // イージング関数
    autoFlip: true, // 配布後に自動でカードをめくるか
    flipDelay: 200 // めくりまでの遅延
  };
  
  // オプションをマージ
  const settings = { ...defaultOptions, ...options };
  
  // 山札の初期位置をセットアップ
  setupDeck(settings.deckPosition);
  
  // 最初のカードから配布開始
  dealNextCard(0);
  
  // カードを1枚ずつ配布する再帰関数
  function dealNextCard(index) {
    if (index >= targetElements.length) {
      // すべてのカード配布が完了したら山札を消す
      removeDeck();
      
      // 完了コールバックがあれば呼び出す
      if (onComplete) {
        setTimeout(onComplete, 500);
      }
      return;
    }
    
    const element = targetElements[index];
    if (!element) {
      // 要素がなければ次のカードへ
      dealNextCard(index + 1);
      return;
    }
    
    // カードの配布先位置を取得
    const rect = element.getBoundingClientRect();
    const targetPosition = {
      left: rect.left + rect.width / 2,
      top: rect.top + rect.height / 2
    };
    
    // 配布アニメーションを実行
    animateCardDeal(element, settings.deckPosition, targetPosition, settings, () => {
      // 自動めくりが有効ならカードをフリップ
      if (settings.autoFlip) {
        setTimeout(() => {
          flipCard(element, true, () => {
            // 次のカードへ
            setTimeout(() => {
              dealNextCard(index + 1);
            }, settings.delay);
          });
        }, settings.flipDelay);
      } else {
        // 自動めくりなしで次のカードへ
        setTimeout(() => {
          dealNextCard(index + 1);
        }, settings.delay);
      }
    });
  }
}

/**
 * カードをフリップするアニメーション
 * @param {HTMLElement} cardElement - カード要素
 * @param {boolean} showFront - 表面を表示するか
 * @param {Function} callback - アニメーション完了後のコールバック
 */
function flipCard(cardElement, showFront, callback) {
  if (!cardElement) {
    if (callback) callback();
    return;
  }
  
  // すでに目的の状態であれば何もしない
  const isCurrentlyFront = !cardElement.classList.contains('flipped');
  if ((showFront && isCurrentlyFront) || (!showFront && !isCurrentlyFront)) {
    if (callback) callback();
    return;
  }
  
  // トランジション終了イベント
  const onTransitionEnd = () => {
    cardElement.removeEventListener('transitionend', onTransitionEnd);
    if (callback) callback();
  };
  
  cardElement.addEventListener('transitionend', onTransitionEnd);
  
  // フリップアニメーション
  if (showFront) {
    cardElement.classList.remove('flipped');
  } else {
    cardElement.classList.add('flipped');
  }
}

/**
 * 複数カードを順番にフリップ
 * @param {Array<HTMLElement>} cards - カード要素の配列
 * @param {boolean} showFront - 表面を表示するか
 * @param {number} delay - カード間の遅延（ミリ秒）
 * @param {Function} onComplete - すべてのカードのフリップ完了後のコールバック
 */
function flipCardsSequence(cards, showFront, delay = 150, onComplete) {
  if (!cards || cards.length === 0) {
    if (onComplete) onComplete();
    return;
  }
  
  let currentIndex = 0;
  
  function flipNext() {
    if (currentIndex >= cards.length) {
      if (onComplete) onComplete();
      return;
    }
    
    const card = cards[currentIndex++];
    flipCard(card, showFront, () => {
      setTimeout(flipNext, delay);
    });
  }
  
  // 最初のカードからフリップ開始
  flipNext();
}

/**
 * 山札をセットアップ
 * @param {Object} position - 山札の位置
 */
function setupDeck(position) {
  // 既存の山札を削除
  removeDeck();
  
  // 山札要素を作成
  const deck = document.createElement('div');
  deck.id = 'card-deck';
  deck.className = 'card-deck';
  
  // 位置とスタイルを設定
  deck.style.position = 'fixed';
  deck.style.left = `${position.left}px`;
  deck.style.top = `${position.top}px`;
  deck.style.width = '140px';
  deck.style.height = '200px';
  deck.style.zIndex = '9000';
  deck.style.transform = 'translate(-50%, -50%)';
  deck.style.transition = 'all 0.5s ease-out';
  
  // 山札の見た目（背景画像やスタイル）
  deck.style.backgroundImage = 'url("assets/images/card-back.svg")';
  deck.style.backgroundSize = 'cover';
  deck.style.borderRadius = '10px';
  deck.style.boxShadow = '0 5px 20px rgba(0,0,0,0.3)';
  
  // 山札上部のカードが積み重なっている感じのエフェクト
  for (let i = 1; i <= 5; i++) {
    const stackedCard = document.createElement('div');
    stackedCard.className = 'stacked-card';
    stackedCard.style.position = 'absolute';
    stackedCard.style.top = `${-i * 2}px`;
    stackedCard.style.left = '0';
    stackedCard.style.width = '100%';
    stackedCard.style.height = '100%';
    stackedCard.style.borderRadius = '10px';
    stackedCard.style.backgroundImage = 'url("assets/images/card-back.svg")';
    stackedCard.style.backgroundSize = 'cover';
    stackedCard.style.transform = `translateY(${i * 0.8}px)`;
    stackedCard.style.zIndex = `${-i}`;
    stackedCard.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    
    deck.appendChild(stackedCard);
  }
  
  // 山札をページに追加
  document.body.appendChild(deck);
  
  // アニメーションを強調するため少し揺らす
  setTimeout(() => {
    if (deck) {
      deck.style.transform = 'translate(-50%, -50%) scale(1.05)';
      
      setTimeout(() => {
        if (deck) {
          deck.style.transform = 'translate(-50%, -50%)';
        }
      }, 300);
    }
  }, 100);
}

/**
 * 山札を削除
 */
function removeDeck() {
  const existingDeck = document.getElementById('card-deck');
  if (existingDeck) {
    // フェードアウトアニメーション
    existingDeck.style.opacity = '0';
    existingDeck.style.transform = 'translate(-50%, -50%) scale(0.8)';
    
    // アニメーション後に削除
    setTimeout(() => {
      if (existingDeck.parentNode) {
        existingDeck.parentNode.removeChild(existingDeck);
      }
    }, 500);
  }
}

/**
 * カード配布アニメーション
 * @param {HTMLElement} element - アニメーションするカード要素
 * @param {Object} fromPosition - 始点の位置
 * @param {Object} toPosition - 終点の位置
 * @param {Object} options - アニメーションオプション
 * @param {Function} onComplete - アニメーション完了後のコールバック
 */
function animateCardDeal(element, fromPosition, toPosition, options, onComplete) {
  // 元の位置とスタイルを保存
  const originalTransform = element.style.transform;
  const originalTransition = element.style.transition;
  const originalOpacity = element.style.opacity;
  const originalZIndex = element.style.zIndex;
  
  // アニメーション前の初期設定
  element.style.transition = 'none';
  element.style.opacity = '0';
  element.style.transform = 'scale(0.8)';
  element.style.zIndex = '8000';
  
  // 位置を適用するために少し待つ
  setTimeout(() => {
    // カードを滑らかに移動させる
    element.style.transition = `all ${options.duration}ms ${options.easing}`;
    element.style.opacity = '1';
    element.style.transform = originalTransform || 'none';
    
    // アニメーション完了後
    const handleTransitionEnd = () => {
      element.removeEventListener('transitionend', handleTransitionEnd);
      
      // 元のZ-indexに戻す
      element.style.zIndex = originalZIndex;
      
      // 完了コールバックを呼び出す
      if (onComplete) {
        onComplete();
      }
    };
    
    element.addEventListener('transitionend', handleTransitionEnd);
  }, 10);
}

/**
 * 役職カードを作成
 * @param {Object} role - 役職データ
 * @returns {HTMLElement} 役職カード要素
 */
function createRoleCard(role) {
  const cardElement = document.createElement('div');
  cardElement.className = 'card role-card flipped';
  cardElement.dataset.role = role.name;
  
  // 役職画像のパス
  const imageUrl = `assets/images/roles/${role.name}.jpg`;
  // 代替画像のパス
  const fallbackImageUrl = 'assets/images/roles/unknown.jpg';
  
  // カードの表面と裏面
  cardElement.innerHTML = `
    <div class="card-front">
      <div class="card-image">
        <img src="${imageUrl}" alt="${role.name}" onerror="this.src='${fallbackImageUrl}'">
      </div>
      <div class="card-content">
        <div class="role-name">${role.name}</div>
        <div class="role-team ${role.team === 'village' ? 'village-team' : 'werewolf-team'}">
          ${role.team === 'village' ? '市民陣営' : '人狼陣営'}
        </div>
        <div class="role-cost">コスト: ${role.cost}</div>
        <div class="role-description">${role.description}</div>
      </div>
    </div>
    <div class="card-back"></div>
  `;
  
  return cardElement;
}

export {
  dealCardsFromDeck,
  flipCard,
  flipCardsSequence,
  createRoleCard
};
