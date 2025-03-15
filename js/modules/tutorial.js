// js/modules/tutorial.js
import { notificationSystem } from '../ui.js';

/**
 * チュートリアルモジュール
 * 初回プレイ時のガイドとヒントを提供
 */
const Tutorial = {
  /**
   * チュートリアルの完了状態を保存するキー
   */
  STORAGE_KEY: 'wolfgame_tutorials_completed',
  
  /**
   * チュートリアルダイアログの要素
   */
  dialogElement: null,
  
  /**
   * チュートリアルの初期化
   */
  init() {
    // 既存のダイアログがあれば削除
    this.cleanup();
    
    // チュートリアルダイアログを作成
    this.dialogElement = document.createElement('div');
    this.dialogElement.id = 'tutorial-dialog';
    this.dialogElement.className = 'tutorial-dialog';
    document.body.appendChild(this.dialogElement);
    
    // スタイルの追加
    if (!document.getElementById('tutorial-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'tutorial-styles';
      styleElement.textContent = `
        .tutorial-dialog {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
          padding: 20px;
          max-width: 500px;
          width: 90%;
          z-index: 3000;
          display: none;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .tutorial-dialog.visible {
          display: block;
          opacity: 1;
        }
        
        .tutorial-dialog h2 {
          margin-top: 0;
          color: #3498db;
          border-bottom: 2px solid #f1f1f1;
          padding-bottom: 10px;
        }
        
        .tutorial-content {
          margin: 15px 0;
          line-height: 1.6;
        }
        
        .tutorial-content img {
          max-width: 100%;
          margin: 10px 0;
          border-radius: 5px;
          border: 1px solid #eee;
        }
        
        .tutorial-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }
        
        .tutorial-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 2999;
          display: none;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .tutorial-overlay.visible {
          display: block;
          opacity: 1;
        }
        
        .tutorial-highlight {
          position: absolute;
          box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.7);
          border-radius: 5px;
          z-index: 2999;
          pointer-events: none;
        }
        
        .tooltip {
          position: absolute;
          background-color: #3498db;
          color: white;
          padding: 10px;
          border-radius: 5px;
          z-index: 3001;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        }
        
        .tooltip::after {
          content: '';
          position: absolute;
          border-width: 8px;
          border-style: solid;
        }
        
        .tooltip.top::after {
          border-color: #3498db transparent transparent transparent;
          top: 100%;
          left: 50%;
          margin-left: -8px;
        }
        
        .tooltip.bottom::after {
          border-color: transparent transparent #3498db transparent;
          bottom: 100%;
          left: 50%;
          margin-left: -8px;
        }
        
        .tooltip.left::after {
          border-color: transparent transparent transparent #3498db;
          top: 50%;
          right: -16px;
          margin-top: -8px;
        }
        
        .tooltip.right::after {
          border-color: transparent #3498db transparent transparent;
          top: 50%;
          left: -16px;
          margin-top: -8px;
        }
        
        @media (max-width: 480px) {
          .tutorial-dialog {
            width: 95%;
            padding: 15px;
          }
          
          .tutorial-buttons {
            flex-direction: column-reverse;
            gap: 10px;
          }
          
          .tutorial-buttons button {
            width: 100%;
          }
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    // オーバーレイ作成
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.className = 'tutorial-overlay';
    document.body.appendChild(overlay);
  },
  
  /**
   * チュートリアル要素を削除
   */
  cleanup() {
    // ダイアログの削除
    const existingDialog = document.getElementById('tutorial-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    // オーバーレイの削除
    const existingOverlay = document.getElementById('tutorial-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // ハイライト要素の削除
    const highlight = document.querySelector('.tutorial-highlight');
    if (highlight) {
      highlight.remove();
    }
    
    // トールチップの削除
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
      tooltip.remove();
    }
    
    this.dialogElement = null;
  },
  
  /**
   * チュートリアルダイアログを表示
   * @param {string} title - ダイアログのタイトル
   * @param {string} content - ダイアログの内容（HTML可）
   * @param {Function} onNext - 「次へ」ボタンを押したときのコールバック
   * @param {Function} onClose - 「閉じる」ボタンを押したときのコールバック
   * @param {boolean} showSkipButton - スキップボタンを表示するか
   */
  showDialog(title, content, onNext = null, onClose = null, showSkipButton = true) {
    if (!this.dialogElement) {
      this.init();
    }
    
    this.dialogElement.innerHTML = `
      <h2>${title}</h2>
      <div class="tutorial-content">${content}</div>
      <div class="tutorial-buttons">
        <button id="tutorial-close" class="btn secondary">閉じる</button>
        ${showSkipButton ? '<button id="tutorial-skip" class="btn secondary">スキップ</button>' : ''}
        ${onNext ? '<button id="tutorial-next" class="btn primary">次へ</button>' : ''}
      </div>
    `;
    
    // オーバーレイを表示
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
      overlay.classList.add('visible');
    }
    
    // ダイアログを表示
    this.dialogElement.classList.add('visible');
    
    // ボタンイベントの設定
    const closeButton = document.getElementById('tutorial-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hideDialog();
        if (onClose) onClose();
      });
    }
    
    const skipButton = document.getElementById('tutorial-skip');
    if (skipButton) {
      skipButton.addEventListener('click', () => {
        this.hideDialog();
        this.markAllTutorialsCompleted();
        notificationSystem.info('すべてのチュートリアルをスキップしました。設定から再度表示できます。');
      });
    }
    
    const nextButton = document.getElementById('tutorial-next');
    if (nextButton && onNext) {
      nextButton.addEventListener('click', () => {
        this.hideDialog();
        onNext();
      });
    }
  },
  
  /**
   * チュートリアルダイアログを非表示
   */
  hideDialog() {
    if (this.dialogElement) {
      this.dialogElement.classList.remove('visible');
    }
    
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
    }
    
    // ハイライトとトールチップも非表示
    this.hideHighlight();
  },
  
  /**
   * 要素をハイライトしてトールチップを表示
   * @param {string} selector - ハイライトする要素のCSSセレクター
   * @param {string} tooltipText - トールチップのテキスト
   * @param {string} position - トールチップの位置 (top, bottom, left, right)
   */
  highlightElement(selector, tooltipText, position = 'top') {
    // 前のハイライトを削除
    this.hideHighlight();
    
    const element = document.querySelector(selector);
    if (!element) return;
    
    // オーバーレイを表示
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
      overlay.classList.add('visible');
    }
    
    // 要素の位置情報取得
    const rect = element.getBoundingClientRect();
    
    // ハイライト要素を作成
    const highlight = document.createElement('div');
    highlight.className = 'tutorial-highlight';
    highlight.style.top = `${rect.top}px`;
    highlight.style.left = `${rect.left}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
    document.body.appendChild(highlight);
    
    // トールチップ要素を作成
    const tooltip = document.createElement('div');
    tooltip.className = `tooltip ${position}`;
    tooltip.textContent = tooltipText;
    document.body.appendChild(tooltip);
    
    // トールチップの位置を設定
    const tooltipRect = tooltip.getBoundingClientRect();
    let top, left;
    
    switch (position) {
      case 'top':
        top = rect.top - tooltipRect.height - 16;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = rect.bottom + 16;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.left - tooltipRect.width - 16;
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.right + 16;
        break;
    }
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  },
  
  /**
   * ハイライトとトールチップを非表示
   */
  hideHighlight() {
    // ハイライト要素の削除
    const highlight = document.querySelector('.tutorial-highlight');
    if (highlight) {
      highlight.remove();
    }
    
    // トールチップの削除
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  },
  
  /**
   * チュートリアルの完了状態をチェック
   * @param {string} tutorialId - チュートリアルID
   * @returns {boolean} 完了していればtrue
   */
  isTutorialCompleted(tutorialId) {
    try {
      const completed = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      return !!completed[tutorialId];
    } catch (error) {
      console.error('チュートリアル完了状態の読み込みエラー:', error);
      return false;
    }
  },
  
  /**
   * チュートリアルを完了済みとしてマーク
   * @param {string} tutorialId - チュートリアルID
   */
  markTutorialCompleted(tutorialId) {
    try {
      const completed = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      completed[tutorialId] = true;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(completed));
    } catch (error) {
      console.error('チュートリアル完了状態の保存エラー:', error);
    }
  },
  
  /**
   * すべてのチュートリアルを完了済みとしてマーク
   */
  markAllTutorialsCompleted() {
    try {
      const allTutorials = {
        'home': true,
        'game-room': true,
        'night-phase': true,
        'day-phase': true,
        'voting-phase': true,
        'result-phase': true
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allTutorials));
    } catch (error) {
      console.error('すべてのチュートリアル完了状態の保存エラー:', error);
    }
  },
  
  /**
   * すべてのチュートリアルの完了状態をリセット
   */
  resetAllTutorials() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      notificationSystem.info('チュートリアルの表示状態をリセットしました。次回から再度表示されます。');
    } catch (error) {
      console.error('チュートリアル状態のリセットエラー:', error);
    }
  },
  
  /**
   * ホーム画面のチュートリアルを表示
   */
  showHomeTutorial() {
    if (this.isTutorialCompleted('home')) return;
    
    this.showDialog(
      '多能力一夜人狼へようこそ！',
      `
        <p>このゲームは多数の特殊な役職と能力を持つ「一夜人狼」です。</p>
        <p>市民陣営と人狼陣営に分かれて戦います。特別な勝利条件を持つ役職もあります。</p>
        <p>まずは「ゲームを作成」するか、友達から共有されたゲームIDを使って「ゲームに参加」しましょう。</p>
      `,
      () => {
        this.markTutorialCompleted('home');
        this.highlightElement('#createGameBtn', 'ゲームを作成してホストになります', 'bottom');
      },
      () => {
        this.markTutorialCompleted('home');
      }
    );
  },
  
  /**
   * ゲームルーム画面のチュートリアルを表示
   */
  showGameRoomTutorial() {
    if (this.isTutorialCompleted('game-room')) return;
    
    this.showDialog(
      'ゲームルーム',
      `
        <p>ここがゲームルームです。ゲームが始まる前に全員が「準備完了」ボタンを押す必要があります。</p>
        <p>準備が整ったら、ホストプレイヤーが「ゲーム開始」ボタンを押してゲームを始めます。</p>
        <p>4人以上のプレイヤーが必要です。</p>
      `,
      () => {
        this.markTutorialCompleted('game-room');
        this.highlightElement('#readyBtn', '準備完了ボタンを押して準備OKを表示します', 'top');
      },
      () => {
        this.markTutorialCompleted('game-room');
      }
    );
  },
  
  /**
   * 夜フェーズのチュートリアルを表示
   */
  showNightPhaseTutorial() {
    if (this.isTutorialCompleted('night-phase')) return;
    
    this.showDialog(
      '夜フェーズ',
      `
        <p>夜フェーズでは、各役職が能力を使用します。</p>
        <p>占い師は他のプレイヤーの役職を見たり、怪盗は役職を交換したり、人狼は仏間を確認します。</p>
        <p>役職に応じた指示が表示されるので、それに従って行動してください。</p>
      `,
      () => {
        this.markTutorialCompleted('night-phase');
      },
      () => {
        this.markTutorialCompleted('night-phase');
      }
    );
  },
  
  /**
   * 日中フェーズのチュートリアルを表示
   */
  showDayPhaseTutorial() {
    if (this.isTutorialCompleted('day-phase')) return;
    
    this.showDialog(
      '日中フェーズ',
      `
        <p>日中フェーズでは、プレイヤー同士で議論を行います。</p>
        <p>外部のボイスチャットツール（Discordなど）を使って話し合いましょう。</p>
        <p>博識な子犬や豚男といった役職は、このフェーズで特殊能力を使えます。</p>
      `,
      () => {
        this.markTutorialCompleted('day-phase');
      },
      () => {
        this.markTutorialCompleted('day-phase');
      }
    );
  },
  
  /**
   * 投票フェーズのチュートリアルを表示
   */
  showVotingPhaseTutorial() {
    if (this.isTutorialCompleted('voting-phase')) return;
    
    this.showDialog(
      '投票フェーズ',
      `
        <p>投票フェーズでは、処刑するプレイヤーを選びます。</p>
        <p>市民陣営は人狼を処刑すれば勝利、人狼陣営は人狼以外のプレイヤーが処刑されれば勝利です。</p>
        <p>村長は2票、スパイは通報機能、蛇女は同数投票で処刑されると単独勝利といった特殊ルールがあります。</p>
      `,
      () => {
        this.markTutorialCompleted('voting-phase');
      },
      () => {
        this.markTutorialCompleted('voting-phase');
      }
    );
  },
  
  /**
   * 結果フェーズのチュートリアルを表示
   */
  showResultPhaseTutorial() {
    if (this.isTutorialCompleted('result-phase')) return;
    
    this.showDialog(
      '結果フェーズ',
      `
        <p>結果フェーズでは、投票結果と勝敗が表示されます。</p>
        <p>敗北陣営は役職のコスト分、持ち点が減少します。持ち点が0以下になるとゲームが終了します。</p>
        <p>特殊な役職能力（無法者の役職交換など）もここで発動します。</p>
      `,
      () => {
        this.markTutorialCompleted('result-phase');
      },
      () => {
        this.markTutorialCompleted('result-phase');
      }
    );
  },
  
  /**
   * 役職説明ダイアログを表示
   * @param {Object} role - 役職データ
   */
  showRoleInfo(role) {
    if (!role) return;
    
    const teamText = role.team === 'village' ? '市民陣営' : '人狼陣営';
    
    this.showDialog(
      `${role.name}（${teamText}）`,
      `
        <p><strong>コスト:</strong> ${role.cost}</p>
        <p><strong>能力:</strong> ${role.description}</p>
        ${this.getRoleSpecialInfo(role.name)}
      `,
      null,
      null,
      false
    );
  },
  
  /**
   * 役職の特殊情報を取得
   * @param {string} roleName - 役職名
   * @returns {string} 特殊情報のHTML
   */
  getRoleSpecialInfo(roleName) {
    const roleInfo = {
      '占い師': '夜フェーズで他プレイヤーの役職を確認できます。または場札の2枚の役職を確認できます。',
      '占星術師': '場札を含む6枚の役職の中で、人狼陣営の数が分かります。',
      '占い師の弟子': '夜フェーズで他プレイヤーの役職を1つ確認できます。',
      '無法者': '敗北する場合、他プレイヤーと役職がランダムに入れ替わります。',
      '村長': '投票時に2票分の投票権を持ちます。',
      '怪盗': '夜フェーズで他プレイヤーと役職を交換できます。',
      'スパイ': '人狼陣営のプレイヤーを確認でき、投票時に通報可能です。通報が外れると持ち点-2点。',
      '大熊': '処刑された場合、プレイヤーの過半数が人狼陣営なら強制勝利します。',
      '占い人狼': '占い師と同じ能力を持ちますが、他の人狼と確認できません。',
      'やっかいな豚男': '日中フェーズで他プレイヤーの投票先を強制指定できますが、自身は投票権がなくなります。',
      '蛇女': '同数投票で処刑される場合、単独勝利します。',
      '博識な子犬': '日中フェーズで場札の市民陣営役職を当てると持ち点+2点。'
    };
    
    if (roleInfo[roleName]) {
      return `<div class="role-special-info"><p><strong>特殊ルール:</strong> ${roleInfo[roleName]}</p></div>`;
    }
    
    return '';
  }
};

export default Tutorial;