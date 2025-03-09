'use strict';

const LobbyScreen = ({ onCreateGame, onJoinGame }) => {
  const [playerName, setPlayerName] = React.useState('');
  const [gameId, setGameId] = React.useState('');

  return React.createElement('div', { className: 'lobby-screen' },
    React.createElement('h1', null, '多能力一夜人狼'),
    React.createElement('input', {
      type: 'text',
      placeholder: 'プレイヤー名',
      value: playerName,
      onChange: (e) => setPlayerName(e.target.value)
    }),
    React.createElement('button', { onClick: () => onCreateGame(playerName) }, 'ゲームを作成'),
    React.createElement('input', {
      type: 'text',
      placeholder: 'ゲームID',
      value: gameId,
      onChange: (e) => setGameId(e.target.value)
    }),
    React.createElement('button', { onClick: () => onJoinGame(playerName, gameId) }, 'ゲームに参加')
  );
};

const renderRoleImage = (role) => {
  // roleがnullまたは未定義の場合は'unknown'を使用
  const roleName = role ? role : 'unknown';
  const [imageSrc, setImageSrc] = React.useState(`images/roles/${roleName}.jpg`);
  const [retryCount, setRetryCount] = React.useState(0);
  const maxRetries = 2;

  React.useEffect(() => {
    const checkImage = (src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
      });
    };

    const loadImage = async () => {
      try {
        // roleがnullまたは未定義の場合は直接unknownを使用
        if (!role) {
          setImageSrc('images/roles/unknown.jpg');
          return;
        }

        const cachedStatus = localStorage.getItem(`imageExists_${roleName}`);
        if (cachedStatus === 'false') {
          setImageSrc('images/roles/unknown.jpg');
          return;
        }

        const exists = await checkImage(imageSrc);
        if (!exists && retryCount < maxRetries) {
          setRetryCount(prevCount => prevCount + 1);
          setImageSrc(`images/roles/${roleName}.jpg?retry=${retryCount + 1}`);
        } else if (!exists) {
          setImageSrc('images/roles/unknown.jpg');
          localStorage.setItem(`imageExists_${roleName}`, 'false');
        } else {
          localStorage.setItem(`imageExists_${roleName}`, 'true');
        }
      } catch (error) {
        console.error('画像読み込みエラー:', error);
        setImageSrc('images/roles/unknown.jpg');
      }
    };

    loadImage();
  }, [role, imageSrc, retryCount]);

  return React.createElement('img', {
    src: imageSrc,
    alt: role || 'unknown',
    className: "role-image",
    onError: (e) => {
      // 画像読み込みエラー時の直接的なフォールバック
      e.target.onerror = null; // 無限ループ防止
      e.target.src = 'images/roles/unknown.jpg';
    }
  });
};

  React.useEffect(() => {
    const checkImage = (src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
      });
    };

    const loadImage = async () => {
      const cachedStatus = localStorage.getItem(`imageExists_${role}`);
      if (cachedStatus === 'false') {
        setImageSrc('images/roles/unknown.jpg');
        return;
      }

      const exists = await checkImage(imageSrc);
      if (!exists && retryCount < maxRetries) {
        setRetryCount(prevCount => prevCount + 1);
        setImageSrc(`images/roles/${role}.jpg?retry=${retryCount + 1}`);
      } else if (!exists) {
        setImageSrc('images/roles/unknown.jpg');
        localStorage.setItem(`imageExists_${role}`, 'false');
      } else {
        localStorage.setItem(`imageExists_${role}`, 'true');
      }
    };

    loadImage();
  }, [role, imageSrc, retryCount]);

  return React.createElement('img', {
    src: imageSrc,
    alt: role,
    className: "role-image",
  });
};

const PlayerCard = ({ player, currentPhase, onAction, onVote, onSpyReport, isCurrentPlayer }) => {
  const isRoleRevealed = currentPhase === '役職確認' || currentPhase === '結果';
  
  return React.createElement('div', { className: "card player-card" },
    React.createElement('div', { className: "text-center" },
      renderRoleImage(isRoleRevealed || isCurrentPlayer ? player.role : 'unknown'),
      React.createElement('p', { className: "player-name" }, player.name),
      React.createElement('p', { className: "player-role" }, `役職: ${isRoleRevealed || isCurrentPlayer ? player.role : '???'}`),
      React.createElement('p', { className: "player-points" }, `ポイント: ${player.points || 0}`),
      !isCurrentPlayer && currentPhase === '投票' && React.createElement('button', { onClick: () => onVote(player.id) }, '投票'),
      !isCurrentPlayer && React.createElement('button', { onClick: () => onSpyReport(player.id) }, 'スパイ通報'),
      !isCurrentPlayer && (currentPhase === '占い師' || currentPhase === '人狼' || currentPhase === '怪盗') &&
        React.createElement('button', { onClick: () => onAction(currentPhase, player.id) }, 'アクション')
    )
  );
};

const CenterCard = ({ cardNumber, role, isRevealed }) => {
  return React.createElement('div', { className: "card center-card" },
    React.createElement('div', { className: "text-center" },
      renderRoleImage(isRevealed ? role : 'unknown'),
      React.createElement('p', { className: "center-card-number" }, `場札 ${cardNumber}`)
    )
  );
};

const GameScreen = ({ state, currentPhase, setCurrentPhase, onAction, onVote, onSpyReport, onNextPhase }) => {
  const phases = ['待機中', '役職確認', '占い師', '人狼', '怪盗', '議論', '投票', '結果'];
  
  const renderPhaseIcon = (phase) => {
    switch(phase) {
      case '待機中': return '👥';
      case '役職確認': return '🔍';
      case '占い師': return '🔮';
      case '人狼': return '🐺';
      case '怪盗': return '🦹';
      case '議論': return '💬';
      case '投票': return '🗳️';
      case '結果': return '🏆';
      default: return null;
    }
  };

  const renderActionArea = () => {
    switch (currentPhase) {
      case '占い師':
      case '人狼':
      case '怪盗':
        return React.createElement('p', null, `${currentPhase}のアクションを実行してください。`);
      case '議論':
        return React.createElement('p', null, '議論の時間です。チャット機能などを使って話し合ってください。');
      case '投票':
        return React.createElement('p', null, '処刑するプレイヤーに投票してください。');
      case '結果':
        return React.createElement('p', null, state.result || '結果待ち');
      default:
        return null;
    }
  };

  return React.createElement('div', { className: "game-container" },
    React.createElement('h1', { className: "game-title" }, '多能力一夜人狼'),
    React.createElement('p', null, `ゲームID: ${state.gameId}`),
    React.createElement('div', { className: "phase-container" },
      phases.map((phase, index) => (
        React.createElement('div', {
          key: phase,
          className: `phase-card ${currentPhase === phase ? 'current-phase' : ''}`
        },
          React.createElement('h2', null, phase),
          React.createElement('div', { className: "phase-icon" }, renderPhaseIcon(phase)),
          React.createElement('button', {
            onClick: () => onNextPhase(phase),
            disabled: phases.indexOf(phase) > phases.indexOf(currentPhase),
            className: "phase-button"
          }, currentPhase === phase ? '現在のフェーズ' : 'このフェーズへ')
        )
      ))
    ),
    React.createElement('div', { className: "players-container" },
      state.players.map((player, index) => (
        React.createElement(PlayerCard, { 
          key: player.id, 
          player: player, 
          currentPhase: currentPhase,
          onAction: onAction,
          onVote: onVote,
          onSpyReport: onSpyReport,
          isCurrentPlayer: player.id === state.currentPlayerId
        })
      )),
      React.createElement('div', { className: "center-cards" },
        React.createElement(CenterCard, { cardNumber: 1, role: state.centerCards[0], isRevealed: currentPhase === '結果' }),
        React.createElement(CenterCard, { cardNumber: 2, role: state.centerCards[1], isRevealed: currentPhase === '結果' })
      )
    ),
    React.createElement('div', { className: "action-area" },
      React.createElement('h2', null, 'アクションエリア'),
      React.createElement('p', null, `現在のフェーズ: ${currentPhase}`),
      renderActionArea()
    )
  );
};

const GameIdModal = ({ gameId, onClose }) => {
  if (!gameId) return null;

  const copyToClipboard = () => {
    try {
      // テキストエリアを作成してコピー
      const textArea = document.createElement('textarea');
      textArea.value = gameId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('ゲームIDがクリップボードにコピーされました');
    } catch (err) {
      console.error('コピーに失敗しました:', err);
      // Fallback: 選択できるようにして手動コピーを促す
      alert('自動コピーに失敗しました。ゲームIDを選択してコピーしてください: ' + gameId);
    }
  };

  return React.createElement('div', { className: 'modal', style: { display: 'block' } },
    React.createElement('div', { className: 'modal-content' },
      React.createElement('span', { className: 'close-button', onClick: onClose }, '×'),
      React.createElement('h2', null, 'ゲームが作成されました'),
      React.createElement('p', null, '以下のゲームIDを他のプレイヤーに共有してください：'),
      React.createElement('p', { id: 'game-id-display', style: { 
        padding: '10px', 
        border: '2px dashed #007bff', 
        borderRadius: '5px',
        backgroundColor: '#f0f8ff',
        fontSize: '20px',
        fontWeight: 'bold',
        wordBreak: 'break-all'
      }}, gameId),
      React.createElement('button', { 
        onClick: copyToClipboard,
        style: { 
          marginTop: '15px', 
          padding: '10px 20px', 
          fontSize: '16px'
        }
      }, 'ゲームIDをコピー'),
      React.createElement('p', { style: { marginTop: '15px', color: 'red' } }, 
        '注意: このIDを正確にコピーしてください。手動入力するとエラーが発生しやすいです。')
    )
  );
};

const EnhancedGameUI = () => {
  const [state, setState] = React.useState(() => window.getGameState());
  const [currentPhase, setCurrentPhase] = React.useState('待機中');
  const [isInLobby, setIsInLobby] = React.useState(true);
  const [gameIdToShow, setGameIdToShow] = React.useState(null);
  
  React.useEffect(() => {
    const updateState = () => {
      const newState = window.getGameState();
      setState(newState);
      console.log('Game state updated:', newState);
      if (newState.players.length > 0) {
        setIsInLobby(false);
      }
    };
    window.addEventListener('gameStateUpdated', updateState);
    return () => {
      window.removeEventListener('gameStateUpdated', updateState);
    };
  }, []);

  React.useEffect(() => {
    console.log('Current game state:', state);
    console.log('Current players:', state.players);
  }, [state]);

  const handleCreateGame = (playerName) => {
    try {
      const gameId = window.createGame(playerName);
      setGameIdToShow(gameId);
      setIsInLobby(false);
      console.log('Game created with ID:', gameId);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('ゲームの作成中にエラーが発生しました。ページをリロードして再試行してください。');
    }
  };

  const handleJoinGame = (playerName, gameId) => {
    try {
      console.log('Joining game with name:', playerName, 'and gameId:', gameId);
      window.joinGame(gameId, playerName);
      console.log('Join game function called');
      setIsInLobby(false);
    } catch (error) {
      console.error('Error joining game:', error);
      alert('ゲームへの参加中にエラーが発生しました。ゲームIDを確認して再試行してください。');
    }
  };

  const handleAction = (actionType, targetId) => {
    const result = window.performAction(state.currentPlayerId, actionType, targetId);
    alert(result);
  };

  const handleVote = (targetId) => {
    const result = window.castVote(state.currentPlayerId, targetId);
    if (result) {
      alert(result);
    }
  };

  const handleSpyReport = (suspectedSpyId) => {
    const result = window.reportSpy(state.currentPlayerId, suspectedSpyId);
    alert(result);
  };

  const handleNextPhase = (newPhase) => {
    setCurrentPhase(newPhase);
    window.nextPhase();
  };

  if (isInLobby) {
    return React.createElement(LobbyScreen, { onCreateGame: handleCreateGame, onJoinGame: handleJoinGame });
  } else {
    return React.createElement(React.Fragment, null,
      React.createElement(GameScreen, { 
        state, 
        currentPhase, 
        setCurrentPhase, 
        onAction: handleAction, 
        onVote: handleVote, 
        onSpyReport: handleSpyReport,
        onNextPhase: handleNextPhase
      }),
      React.createElement(GameIdModal, { gameId: gameIdToShow, onClose: () => setGameIdToShow(null) })
    );
  }
};

const renderUI = () => {
  ReactDOM.render(React.createElement(EnhancedGameUI), document.getElementById('app'));
};

document.addEventListener('DOMContentLoaded', renderUI);

window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  alert('予期せぬエラーが発生しました。ページをリロードしてください。');
});

window.renderUI = renderUI;
