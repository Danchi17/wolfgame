// js/modules/tutorial.js

/**
 * チュートリアル管理クラス
 * 初心者向けのゲーム説明を提供
 */
const TutorialManager = {
  /**
   * チュートリアルを表示済みか確認するキー
   */
  TUTORIAL_SEEN_KEY: 'wolf_game_tutorial_seen',
  
  /**
   * チュートリアルのステップ定義
   */
  steps: [
    {
      title: 'ゲームの概要',
      content: `
        <p>多能力一夜人狼へようこそ！</p>
        <p>このゲームは、プレイヤーがシークレットな役職を持ち、市民陣営と人狼陣営に分かれて戦うソーシャルデダクションゲームです。</p>
        <p>各役職は独自の能力を持ち、これを使って相手の役職を推理します。</p>
      `
    },
    {
      title: 'ゲームの流れ',
      content: `
        <p>ゲームは次のように進みます：</p>
        <ol>
          <li><strong>役職配布</strong> - 各プレイヤーにランダムな役職が配布されます</li>
          <li><strong>夜フェーズ</strong> - 役職に応じた能力を使用する時間です</li>
          <li><strong>日中フェーズ</strong> - 全員で議論し、役職を推測します</li>
          <li><strong>投票フェーズ</strong> - 処刑するプレイヤーに投票します</li>
          <li><strong>結果発表</strong> - 勝敗と得点の変動が発表されます</li>
        </ol>
      `
    },
    {
      title: '市民陣営の役職',
      content: `
        <p><strong>市民陣営</strong>は人狼を見つけ出して処刑するのが目標です。</p>
        <ul>
          <li><strong>占い師(コスト3)</strong> - 他人も1人または場札2枚の役職を確認できます</li>
          <li><strong>占星術師(コスト2)</strong> - 場の6枚のカード中、人狼陣営の数を知ります</li>
          <li><strong>怪盗(コスト1)</strong> - 他人と役職を交換できます</li>
          <li><strong>村長(コスト3)</strong> - 投票権が2票あります</li>
          <li><strong>スパイ(コスト2)</strong> - 人狼を通報できますが、間違えるとペナルティ</li>
        </ul>
      `
    },
    {
      title: '人狼陣営の役職',
      content: `
        <p><strong>人狼陣営</strong>は市民を欺き、市民の投票で処刑されないようにします。</p>
        <ul>
          <li><strong>大熊(コスト5)</strong> - 処刑された場合、人狼陣営が過半数なら強制勝利</li>
          <li><strong>占い人狼(コスト4)</strong> - 占い師の能力を持ちますが人狼同士を確認できません</li>
          <li><strong>やっかいな豚男(コスト4)</strong> - 他人の投票先を強制指定できますが自分は投票できません</li>
          <li><strong>蛇女(コスト3)</strong> - 同票数で処刑されると単独勝利します</li>
          <li><strong>博識な子犬(コスト3)</strong> - 場札の市民陣営役職を当てると持ち点が回復します</li>
        </ul>
      `
    },
    {
      title: '勝利条件と得点',
      content: `
        <p><strong>勝利条件:</strong></p>
        <ul>
          <li>市民陣営: 人狼を処刑すれば勝利</li>
          <li>人狼陣営: 人狼なしに市民が処刑されたら勝利</li>
        </ul>
        <p><strong>特殊勝利:</strong></p>
        <ul>
          <li>蛇女が同票数で処刑されると単独勝利</li>
          <li>大熊が処刑されたとき人狼陣営が過半数だと人狼陣営勝利</li>
        </ul>
        <p>敗北陣営のプレイヤーは役職のコスト分、持ち点が減ります。持ち点が0点以下になるとゲーム終了となります。</p>
      `
    },
    {
      title: 'コツとヒント',
      content: `
        <p><strong>プレイのコツ:</strong></p>
        <ul>
          <li>自分の役職を隠したり、假の役職を主張したりするのが重要です</li>
          <li>他のプレイヤーの発言や行動を観察して役職を推測しましょう</li>
          <li>コストの低い役職は敗北しても持ち点の減りが少なく、長期的に有利です</li>
          <li>論理的な推理だけでなく、相手の心理を読むスキルも重要です</li>
        </ul>
        <p>それでは、楽しいゲームをお楽しみください！</p>
      `
    }
  ],
  
  /**
   * 現在のステップインデックス
   */
  currentStep: 0,
  
  /**
   * チュートリアルウィンドウの要素
   */
  tutorialElement: null,
  
  /**
   * チュートリアルを初期化
   */
  init() {
    // 既存のチュートリアルを削除
    this.hide();
    
    // 初期ステップをリセット
    this.currentStep = 0;
    
    // 既に表示済みか確認
    if (this.hasSeenTutorial()) {
      return false;
    }
    
    return true;
  },
  
  /**
   * チュートリアルを表示
   * @returns {boolean} 表示成功ならtrue
   */
  show() {
    if (!this.init()) {
      return false;
    }
    
    // チュートリアル要素の作成
    this.tutorialElement = document.createElement('div');
    this.tutorialElement.id = 'tutorial';
    this.tutorialElement.className = 'tutorial-container';
    
    // スタイルの追加
    const style = document.createElement('style');
    style.textContent = `
      .tutorial-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        animation: fadeIn 0.5s ease-out;
      }
      
      .tutorial-content {
        background-color: white;
        border-radius: 10px;
        max-width: 80%;
        width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        padding: 20px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        position: relative;
        animation: scaleIn 0.3s ease-out;
      }
      
      .tutorial-header {
        border-bottom: 1px solid #eee;
        margin-bottom: 15px;
        padding-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .tutorial-title {
        font-size: 1.5rem;
        font-weight: bold;
        color: #2c3e50;
        margin: 0;
      }
      
      .tutorial-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #7f8c8d;
      }
      
      .tutorial-close:hover {
        color: #e74c3c;
      }
      
      .tutorial-body {
        margin-bottom: 20px;
      }
      
      .tutorial-footer {
        display: flex;
        justify-content: space-between;
        border-top: 1px solid #eee;
        padding-top: 15px;
      }
      
      .tutorial-progress {
        display: flex;
        gap: 5px;
      }
      
      .progress-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #ddd;
      }
      
      .progress-dot.active {
        background-color: #3498db;
      }
      
      .tutorial-buttons {
        display: flex;
        gap: 10px;
      }
      
      .tutorial-btn {
        padding: 8px 15px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: 600;
      }
      
      .tutorial-btn.back {
        background-color: #f1f1f1;
        color: #333;
      }
      
      .tutorial-btn.next {
        background-color: #3498db;
        color: white;
      }
      
      .tutorial-btn.skip {
        background-color: #7f8c8d;
        color: white;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @media (max-width: 768px) {
        .tutorial-content {
          width: 90%;
          max-height: 90vh;
          padding: 15px;
        }
        
        .tutorial-title {
          font-size: 1.2rem;
        }
      }
    `;
    document.head.appendChild(style);
    
    // 内容を表示
    this.updateContent();
    
    // DOMに追加
    document.body.appendChild(this.tutorialElement);
    
    return true;
  },
  
  /**
   * チュートリアルコンテンツを更新
   */
  updateContent() {
    if (!this.tutorialElement) return;
    
    const step = this.steps[this.currentStep];
    
    this.tutorialElement.innerHTML = `
      <div class="tutorial-content">
        <div class="tutorial-header">
          <h2 class="tutorial-title">${step.title}</h2>
          <button class="tutorial-close" aria-label="閉じる">&times;</button>
        </div>
        <div class="tutorial-body">
          ${step.content}
        </div>
        <div class="tutorial-footer">
          <div class="tutorial-progress">
            ${this.steps.map((_, index) => 
              `<div class="progress-dot ${index === this.currentStep ? 'active' : ''}"></div>`
            ).join('')}
          </div>
          <div class="tutorial-buttons">
            ${this.currentStep > 0 ? 
              `<button class="tutorial-btn back">戻る</button>` : 
              `<button class="tutorial-btn skip">スキップ</button>`
            }
            <button class="tutorial-btn next">${this.isLastStep() ? '完了' : '次へ'}</button>
          </div>
        </div>
      </div>
    `;
    
    // イベントリスナーを設定
    this.setupEventListeners();
  },
  
  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    // 閉じるボタン
    const closeBtn = this.tutorialElement.querySelector('.tutorial-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.complete());
    }
    
    // 戻るボタン
    const backBtn = this.tutorialElement.querySelector('.tutorial-btn.back');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.previousStep());
    }
    
    // スキップボタン
    const skipBtn = this.tutorialElement.querySelector('.tutorial-btn.skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.complete());
    }
    
    // 次へ/完了ボタン
    const nextBtn = this.tutorialElement.querySelector('.tutorial-btn.next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.isLastStep()) {
          this.complete();
        } else {
          this.nextStep();
        }
      });
    }
  },
  
  /**
   * 次のステップへ進む
   */
  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.updateContent();
    }
  },
  
  /**
   * 前のステップに戻る
   */
  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateContent();
    }
  },
  
  /**
   * 最後のステップか確認
   * @returns {boolean} 最後のステップであればtrue
   */
  isLastStep() {
    return this.currentStep === this.steps.length - 1;
  },
  
  /**
   * チュートリアルを完了
   */
  complete() {
    // チュートリアルを非表示
    this.hide();
    
    // ストレージに表示済みを記録
    localStorage.setItem(this.TUTORIAL_SEEN_KEY, 'true');
  },
  
  /**
   * チュートリアルを非表示
   */
  hide() {
    if (this.tutorialElement && this.tutorialElement.parentNode) {
      this.tutorialElement.parentNode.removeChild(this.tutorialElement);
    }
    this.tutorialElement = null;
  },
  
  /**
   * チュートリアルを既に見たか確認
   * @returns {boolean} 既に見たならtrue
   */
  hasSeenTutorial() {
    return localStorage.getItem(this.TUTORIAL_SEEN_KEY) === 'true';
  },
  
  /**
   * チュートリアルの表示履歴をリセット
   */
  resetSeenStatus() {
    localStorage.removeItem(this.TUTORIAL_SEEN_KEY);
  }
};

export default TutorialManager;