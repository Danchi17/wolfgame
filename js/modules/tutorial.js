// js/modules/tutorial.js

/**
 * チュートリアルシステム
 * 初心者向けにゲームの選び方を説明するガイド
 */
const Tutorial = {
  // チュートリアルのステップ情報
  steps: [
    {
      title: '多能力一夜人狼へようこそ！',
      content: 'このゲームは、複数の特殊能力を持つ役職を使って遊ぶワンナイト人狼ゲームです。このチュートリアルではゲームの基本ルールと遊び方を説明します。',
      image: null
    },
    {
      title: 'ゲームの目的',
      content: 'プレイヤーは市民陣営と人狼陣営に分かれ、自分の役職に応じた能力を使って陣営の勝利を目指します。市民陣営は人狼を処刑すれば勝利、人狼陣営は人狼以外の人が処刑されれば勝利です。',
      image: null
    },
    {
      title: '役職と能力',
      content: '各プレイヤーはゲーム開始時にランダムな役職を受け取ります。役職にはそれぞれ特別な能力があり、市民陣営か人狼陣営のどちらかに所属します。また役職にはコストがあり、敗北するとそのコスト分の持ち点を失います。',
      image: null
    },
    {
      title: 'ゲームの流れ',
      content: '1. 各プレイヤーは役職カードを受け取ります\n2. 夜フェーズで役職に応じた能力を使用します\n3. 日中フェーズで議論を行います（外部ボイスチャットを使用）\n4. 投票で処刑するプレイヤーを決定します\n5. 結果発表と勝敗判定を行います',
      image: null
    },
    {
      title: '夜フェーズ',
      content: '夜フェーズでは占い師→人狼→怪盗の順で能力を使用します。他人を確認したり、役職を交換したりできるのがこのフェーズだけです。自分の役職を確認し、能力を上手く使って情報を集めましょう。',
      image: null
    },
    {
      title: '日中フェーズ',
      content: '日中フェーズでは、これまでに得た情報をもとに議論を行います。人狼陣営は市民になりすまし、市民陣営は人狼を探し出そうとします。外部ツール（Discordなど）で会話しながらゲームを進めましょう。',
      image: null
    },
    {
      title: '投票フェーズ',
      content: '議論が終わったら、処刑するプレイヤーを投票で決定します。人狼を処刑すれば市民陣営の勝利、それ以外の人を処刑すれば人狼陣営の勝利となります。特殊な勝利条件を持つ役職もあります。',
      image: null
    },
    {
      title: '勝利ポイント',
      content: '各プレイヤーは初期に10点の持ち点を持っています。敗北したプレイヤーは役職のコスト分の点数を失います。いずれかのプレイヤーの点数が0以下になるとゲーム終了となり、最終的な勝者が決まります。',
      image: null
    },
    {
      title: '最後に',
      content: 'このゲームは謹りや演技が重要です。自分の陣営の利益のために情報を隠したり、嘘をついたりすることも戦術のうちです。楽しいゲームをお楽しみください！',
      image: null
    }
  ],
  
  // 現在のステップインデックス
  currentStep: 0,
  
  // チュートリアルの表示状態
  isVisible: false,
  
  // チュートリアル要素
  element: null,
  
  /**
   * チュートリアルを初期化
   */
  init() {
    // 既存のチュートリアルを削除
    const existingTutorial = document.getElementById('tutorial-container');
    if (existingTutorial) {
      existingTutorial.remove();
    }
    
    // チュートリアル要素を作成
    this.element = document.createElement('div');
    this.element.id = 'tutorial-container';
    this.element.className = 'tutorial-overlay';
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'tutorial-title');
    this.element.style.display = 'none';
    
    // HTMLを設定
    this.element.innerHTML = `
      <div class="tutorial-content">
        <button class="tutorial-close-btn" aria-label="チュートリアルを閉じる">×</button>
        <div class="tutorial-header">
          <h2 id="tutorial-title"></h2>
          <div class="tutorial-progress">
            <span class="tutorial-step-counter"></span>
            <div class="tutorial-progress-bar">
              <div class="tutorial-progress-fill"></div>
            </div>
          </div>
        </div>
        <div class="tutorial-body">
          <p id="tutorial-content"></p>
          <div id="tutorial-image" class="tutorial-image"></div>
        </div>
        <div class="tutorial-footer">
          <button id="tutorial-prev-btn" class="btn tutorial-btn" disabled>前へ</button>
          <button id="tutorial-next-btn" class="btn tutorial-btn">次へ</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.element);
    
    // イベントリスナーを追加
    this.element.querySelector('.tutorial-close-btn').addEventListener('click', () => this.hide());
    this.element.querySelector('#tutorial-prev-btn').addEventListener('click', () => this.prevStep());
    this.element.querySelector('#tutorial-next-btn').addEventListener('click', () => this.nextStep());
    
    // キーボードイベント
    document.addEventListener('keydown', (e) => {
      if (!this.isVisible) return;
      
      if (e.key === 'Escape') {
        this.hide();
      } else if (e.key === 'ArrowRight') {
        this.nextStep();
      } else if (e.key === 'ArrowLeft') {
        this.prevStep();
      }
    });
    
    // 初期ステップを設定
    this.currentStep = 0;
    
    // チュートリアルの表示状態をローカルストレージから取得
    const tutorialShown = localStorage.getItem('tutorialShown');
    if (!tutorialShown) {
      // 初めてのユーザーなら自動的に表示
      setTimeout(() => this.show(), 1000);
    }
    
    // CSSを追加
    const style = document.createElement('style');
    style.textContent = `
      .tutorial-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .tutorial-content {
        position: relative;
        width: 90%;
        max-width: 600px;
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        transform: translateY(20px);
        transition: transform 0.3s ease;
      }
      
      .tutorial-overlay.visible {
        opacity: 1;
      }
      
      .tutorial-overlay.visible .tutorial-content {
        transform: translateY(0);
      }
      
      .tutorial-close-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 30px;
        height: 30px;
        background: none;
        border: none;
        font-size: 24px;
        color: #666;
        cursor: pointer;
        z-index: 1;
      }
      
      .tutorial-header {
        padding: 20px;
        background-color: #3498db;
        color: white;
      }
      
      .tutorial-title {
        margin: 0;
        font-size: 20px;
      }
      
      .tutorial-progress {
        margin-top: 10px;
        display: flex;
        align-items: center;
      }
      
      .tutorial-step-counter {
        font-size: 14px;
        margin-right: 10px;
      }
      
      .tutorial-progress-bar {
        flex-grow: 1;
        height: 6px;
        background-color: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
        overflow: hidden;
      }
      
      .tutorial-progress-fill {
        height: 100%;
        background-color: white;
        transition: width 0.3s ease;
      }
      
      .tutorial-body {
        padding: 20px;
        max-height: 50vh;
        overflow-y: auto;
      }
      
      .tutorial-body p {
        margin: 0 0 15px 0;
        line-height: 1.6;
        white-space: pre-line;
      }
      
      .tutorial-image {
        margin-top: 15px;
        border-radius: 5px;
        overflow: hidden;
        text-align: center;
      }
      
      .tutorial-image img {
        max-width: 100%;
        height: auto;
      }
      
      .tutorial-footer {
        padding: 15px 20px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
      }
      
      .tutorial-btn {
        padding: 8px 15px;
        border-radius: 5px;
        border: none;
        cursor: pointer;
        font-weight: bold;
        transition: background-color 0.3s ease;
      }
      
      .tutorial-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      #tutorial-prev-btn {
        background-color: #f1f1f1;
        color: #333;
      }
      
      #tutorial-next-btn {
        background-color: #3498db;
        color: white;
      }
      
      /* レスポンシブ対応 */
      @media (max-width: 768px) {
        .tutorial-content {
          width: 95%;
          max-height: 80vh;
        }
        
        .tutorial-body {
          max-height: 40vh;
        }
      }
    `;
    document.head.appendChild(style);
  },
  
  /**
   * チュートリアルを表示
   */
  show() {
    if (!this.element) {
      this.init();
    }
    
    this.isVisible = true;
    this.element.style.display = 'flex';
    setTimeout(() => {
      this.element.classList.add('visible');
    }, 10);
    
    this.updateStep();
  },
  
  /**
   * チュートリアルを非表示
   */
  hide() {
    this.isVisible = false;
    this.element.classList.remove('visible');
    setTimeout(() => {
      this.element.style.display = 'none';
    }, 300);
    
    // チュートリアルを表示済みとしてローカルストレージに保存
    localStorage.setItem('tutorialShown', 'true');
  },
  
  /**
   * 次のステップに進む
   */
  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.updateStep();
    } else {
      this.hide();
    }
  },
  
  /**
   * 前のステップに戻る
   */
  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateStep();
    }
  },
  
  /**
   * 現在のステップを更新
   */
  updateStep() {
    const step = this.steps[this.currentStep];
    const totalSteps = this.steps.length;
    
    // タイトルとコンテンツを更新
    document.getElementById('tutorial-title').textContent = step.title;
    document.getElementById('tutorial-content').textContent = step.content;
    
    // 画像を更新
    const imageContainer = document.getElementById('tutorial-image');
    imageContainer.innerHTML = '';
    if (step.image) {
      const img = document.createElement('img');
      img.src = step.image;
      img.alt = step.title;
      imageContainer.appendChild(img);
    }
    
    // ステップカウンターを更新
    const stepCounter = this.element.querySelector('.tutorial-step-counter');
    stepCounter.textContent = `${this.currentStep + 1}/${totalSteps}`;
    
    // プログレスバーを更新
    const progressFill = this.element.querySelector('.tutorial-progress-fill');
    progressFill.style.width = `${(this.currentStep + 1) / totalSteps * 100}%`;
    
    // ボタン状態を更新
    const prevBtn = document.getElementById('tutorial-prev-btn');
    const nextBtn = document.getElementById('tutorial-next-btn');
    
    prevBtn.disabled = this.currentStep === 0;
    nextBtn.textContent = this.currentStep === totalSteps - 1 ? '完了' : '次へ';
  },
  
  /**
   * チュートリアルの表示状態をリセット
   */
  reset() {
    localStorage.removeItem('tutorialShown');
  }
};

export default Tutorial;