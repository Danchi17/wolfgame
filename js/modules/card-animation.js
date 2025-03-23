// js/modules/card-animation.js

/**
 * カードアニメーション管理モジュール
 * 役職カードの配布・めくりアニメーションを管理
 */
const CardAnimation = {
  /**
   * 山札からカードを配る演出
   * @param {Array<HTMLElement>} targetElements - カードの配布先要素の配列
   * @param {Function} onComplete - 配布完了後のコールバック関数
   */
  dealCardsFromDeck(targetElements, onComplete) {
    // 山札の初期位置（画面中央上部）
    const deckPosition = {
      left: window.innerWidth / 2,
      top: 50
    };
    
    // アニメーションのセットアップ
    setupDeckPosition(deckPosition);
    
    // カードを1枚ずつ順番に配る
    dealNextCard(0);
    
    // カードを配る関数
    function dealNextCard(index) {
      if (index >= targetElements.length) {
        // すべてのカードを配り終えたらコールバックを実行
        if (onComplete) {
          setTimeout(onComplete, 500);
        }
        return;
      }
      
      const element = targetElements[index];
      if (!element) {
        dealNextCard(index + 1);
        return;
      }
      
      // カードの現在位置を取得
      const rect = element.getBoundingClientRect();
      const targetPosition = {
        left: rect.left + rect.width / 2,
        top: rect.top + rect.height / 2
      };
      
      // 配布アニメーション実行
      animateCardDeal(element, deckPosition, targetPosition, () => {
        // カードを表に向ける
        setTimeout(() => {
          flipCard(element, true, () => {
            // 次のカードを配る
            dealNextCard(index + 1);
          });
        }, 150);
      });
    }
  },
  
  /**
   * カードをめくるアニメーション
   * @param {HTMLElement} card - カード要素
   * @param {boolean} faceUp - 表向きにする場合はtrue、裏向きにする場合はfalse
   * @param {Function} onComplete - めくり完了後のコールバック関数
   */
  flipCard(card, faceUp, onComplete) {
    if (!card) {
      if (onComplete) onComplete();
      return;
    }
    
    // カードの現在の向きを確認
    const isFaceUp = !card.classList.contains('flipped');
    
    // 既に目的の向きならアニメーションしない
    if ((faceUp && isFaceUp) || (!faceUp && !isFaceUp)) {
      if (onComplete) onComplete();
      return;
    }
    
    // トランジションイベントを一度だけ監視
    const handleTransitionEnd = () => {
      card.removeEventListener('transitionend', handleTransitionEnd);
      if (onComplete) onComplete();
    };
    
    card.addEventListener('transitionend', handleTransitionEnd);
    
    // カードをめくる
    if (faceUp) {
      card.classList.remove('flipped');
    } else {
      card.classList.add('flipped');
    }
  },
  
  /**
   * 役職カードを生成
   * @param {Object} role - 役職オブジェクト
   * @returns {HTMLElement} 生成したカード要素
   */
  createRoleCard(role) {
    const card = document.createElement('div');
    card.className = 'card role-card flipped';
    
    // 役職名から画像パスを生成
    const imagePath = `assets/images/roles/${role.name}.jpg`;
    
    // カードの表面と裏面を作成
    card.innerHTML = `
      <div class="card-front">
        <div class="card-image">
          <img src="${imagePath}" alt="${role.name}" onerror="this.src='assets/images/roles/unknown.jpg'">
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
    
    return card;
  },
  
  /**
   * フィールドカードをセットアップ
   */
  setupFieldCards() {
    const fieldCards = document.querySelectorAll('.field-card');
    fieldCards.forEach(card => {
      card.classList.add('flipped');
    });
  },
  
  /**
   * すべてのカードアニメーションをセットアップ
   * @param {Object} gameData - ゲームデータ
   * @param {string} currentUserId - 現在のプレイヤーID
   */
  setupAllCards(gameData, currentUserId) {
    // 場札のセットアップ
    const fieldCards = document.querySelectorAll('.field-card');
    
    // プレイヤーカードのセットアップ
    const playerCards = [];
    const currentPlayerCard = document.querySelector('.my-role');
    
    if (currentPlayerCard) {
      playerCards.push(currentPlayerCard);
    }
    
    // すべてのカードに対してアニメーション処理
    this.dealCardsFromDeck([...fieldCards, ...playerCards], () => {
      console.log('すべてのカードの配布が完了しました');
    });
  }
};

// カード配布アニメーション
function animateCardDeal(element, fromPosition, toPosition, onComplete) {
  // 最初はカードを山札の位置に配置し、非表示にしておく
  element.style.transition = 'none';
  element.style.opacity = '0';
  element.style.transform = 'translate(0, 0) scale(0.8)';
  
  // カードをフェードイン
  setTimeout(() => {
    element.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    element.style.opacity = '1';
    element.style.transform = 'translate(0, 0) scale(1)';
    
    // アニメーション完了後
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 500);
  }, 50);
}

// 山札の位置をセットアップ
function setupDeckPosition(deckPosition) {
  // 山札要素がなければ作成
  let deck = document.getElementById('card-deck');
  if (!deck) {
    deck = document.createElement('div');
    deck.id = 'card-deck';
    deck.className = 'card-deck';
    deck.style.position = 'fixed';
    deck.style.left = `${deckPosition.left}px`;
    deck.style.top = `${deckPosition.top}px`;
    deck.style.width = '120px';
    deck.style.height = '180px';
    deck.style.backgroundColor = '#624a7e';
    deck.style.backgroundImage = 'url("assets/images/card-back.svg")';
    deck.style.backgroundSize = 'cover';
    deck.style.borderRadius = '10px';
    deck.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    deck.style.zIndex = '1000';
    deck.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(deck);
    
    // 山札が少しずつ薄くなるアニメーション
    setTimeout(() => {
      deck.style.transition = 'opacity 1s ease';
      deck.style.opacity = '0';
      setTimeout(() => {
        deck.remove();
      }, 1000);
    }, 1000);
  }
}

// カードめくりアニメーション
function flipCard(card, faceUp, onComplete) {
  CardAnimation.flipCard(card, faceUp, onComplete);
}

export default CardAnimation;