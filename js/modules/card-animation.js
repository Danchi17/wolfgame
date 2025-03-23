// js/modules/card-animation.js

/**
 * カードアニメーション管理モジュール
 */
const CardAnimation = {
  /**
   * カードを裏返すアニメーション
   * @param {HTMLElement} card - カード要素
   * @param {boolean} isFront - 表面を表示するならtrue、裏面ならfalse
   * @param {Function} callback - アニメーション完了後のコールバック（オプション）
   */
  flipCard(card, isFront, callback) {
    // すでにアニメーション中であれば無視
    if (card.dataset.flipping === 'true') return;
    
    card.dataset.flipping = 'true';
    
    // 現在の状態と目標が同じなら何もしない
    const isCurrentlyFront = !card.classList.contains('flipped');
    if (isCurrentlyFront === isFront) {
      card.dataset.flipping = 'false';
      if (callback) callback();
      return;
    }
    
    // アニメーション追加
    card.style.transition = 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    // 裏返す
    if (isFront) {
      card.classList.remove('flipped');
    } else {
      card.classList.add('flipped');
    }
    
    // アニメーション完了後の処理
    const onAnimationEnd = () => {
      card.removeEventListener('transitionend', onAnimationEnd);
      card.dataset.flipping = 'false';
      if (callback) callback();
    };
    
    card.addEventListener('transitionend', onAnimationEnd);
  },
  
  /**
   * カードを揺らすアニメーション
   * @param {HTMLElement} card - カード要素
   */
  shakeCard(card) {
    card.classList.add('shake-animation');
    
    setTimeout(() => {
      card.classList.remove('shake-animation');
    }, 500);
  },
  
  /**
   * カードを強調表示するアニメーション
   * @param {HTMLElement} card - カード要素
   * @param {number} duration - 持続時間（ミリ秒）（オプション、デフォルト1000ms）
   */
  highlightCard(card, duration = 1000) {
    card.classList.add('highlight-animation');
    
    setTimeout(() => {
      card.classList.remove('highlight-animation');
    }, duration);
  },
  
  /**
   * カードを浮かせるアニメーション
   * @param {HTMLElement} card - カード要素
   * @param {boolean} isFloating - 浮かせる状態にする場合はtrue
   */
  floatCard(card, isFloating) {
    if (isFloating) {
      card.classList.add('float-animation');
    } else {
      card.classList.remove('float-animation');
    }
  },
  
  /**
   * フィールドカードをセットアップ
   * バックフェイスでカードが始まるようにする
   */
  setupFieldCards() {
    const fieldCards = document.querySelectorAll('.field-card');
    fieldCards.forEach(card => {
      // 初期状態で裏面を表示
      card.classList.add('flipped');
    });
  },
  
  /**
   * プレイヤーカードをセットアップ
   * 役職カードがスムーズに表示されるようにする
   * @param {HTMLElement} cardContainer - カードコンテナ要素
   */
  setupPlayerCard(cardContainer) {
    if (!cardContainer) return;
    
    const roleCard = cardContainer.querySelector('.my-role');
    if (roleCard) {
      // 初期状態は小さく透明
      roleCard.style.opacity = '0';
      roleCard.style.transform = 'scale(0.8)';
      
      // アニメーションで表示
      setTimeout(() => {
        roleCard.style.transition = 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        roleCard.style.opacity = '1';
        roleCard.style.transform = 'scale(1)';
      }, 300);
    }
  }
};

export default CardAnimation;