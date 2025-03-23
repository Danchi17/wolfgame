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
    if (!card) {
      if (callback) callback();
      return;
    }
    
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
    if (!card) return;
    
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
    if (!card) return;
    
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
    if (!card) return;
    
    if (isFloating) {
      card.classList.add('float-animation');
    } else {
      card.classList.remove('float-animation');
    }
  },
  
  /**
   * 山札からカードを配るアニメーション
   * @param {HTMLElement} targetContainer - カードを配置するコンテナ
   * @param {number} numCards - 配るカードの枚数
   * @param {string} cardType - カードの種類 ('field', 'player')
   * @param {Function} callback - アニメーション完了後のコールバック
   */
  dealCards(targetContainer, numCards, cardType, callback) {
    if (!targetContainer) {
      if (callback) callback();
      return;
    }
    
    // 山札の位置（画面外上部中央）
    const deckPosition = {
      x: window.innerWidth / 2,
      y: -150
    };
    
    // カードを生成して配置
    const cards = [];
    for (let i = 0; i < numCards; i++) {
      const card = document.createElement('div');
      card.className = `card ${cardType}-card deal-animation`;
      card.style.position = 'absolute';
      card.style.left = `${deckPosition.x}px`;
      card.style.top = `${deckPosition.y}px`;
      card.style.zIndex = `${1000 + i}`;
      card.style.opacity = '0';
      
      // 裏面を初期表示
      card.innerHTML = `
        <div class="card-front"></div>
        <div class="card-back"></div>
      `;
      card.classList.add('flipped');
      
      document.body.appendChild(card);
      cards.push(card);
    }
    
    // 順番にカードを配る
    let cardIndex = 0;
    const dealNextCard = () => {
      if (cardIndex >= cards.length) {
        // アニメーション完了後、カードを正しい位置に移動
        setTimeout(() => {
          cards.forEach(card => {
            document.body.removeChild(card);
          });
          
          // コールバックを実行
          if (callback) callback();
        }, 500);
        return;
      }
      
      const card = cards[cardIndex];
      const targetRect = targetContainer.getBoundingClientRect();
      const targetX = targetRect.left + (targetRect.width / (numCards + 1)) * (cardIndex + 1);
      const targetY = targetRect.top + targetRect.height / 2;
      
      // カードを表示
      card.style.opacity = '1';
      
      // アニメーションのタイミングを設定
      setTimeout(() => {
        card.style.transition = 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        card.style.left = `${targetX}px`;
        card.style.top = `${targetY}px`;
        card.style.transform = 'rotate(0deg)';
        
        // 次のカードを配る
        cardIndex++;
        setTimeout(dealNextCard, 200);
      }, 100);
    };
    
    // 配り始める
    setTimeout(dealNextCard, 500);
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
  },
  
  /**
   * 役職カードを作成
   * @param {Object} role - 役職データ
   * @returns {HTMLElement} 作成されたカード要素
   */
  createRoleCard(role) {
    const card = document.createElement('div');
    card.className = 'card role-card';
    
    const imagePath = `assets/images/roles/${role.name}.png`;
    
    card.innerHTML = `
      <div class="card-front">
        <div class="role-image">
          <img src="${imagePath}" alt="${role.name}" onerror="this.src='assets/images/roles/default.png'">
        </div>
        <div class="role-info">
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
    
    return card;
  }
};

export default CardAnimation;