'use strict';

const LobbyScreen = ({ onCreateGame, onJoinGame }) => {
  const [playerName, setPlayerName] = React.useState('');
  const [gameId, setGameId] = React.useState('');

  return React.createElement('div', { className: 'lobby-screen' },
    React.createElement('h1', null, '多能力一夜人狼 - ロビー'),
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

const GameScreen = ({ state, currentPhase, setCurrentPhase }) => {
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

  const renderRoleImage = (role) => {
    return React.createElement('img', {
      src: `images/roles/${role}.jpg`,
      alt: role,
      className: "role-image",
      onError: (e) => {
        e.target.onerror = null;
        e.target.src = 'images/roles/unknown.jpg';
      }
    });
  };

  const PlayerCard = ({ player }) => (
    React.createElement('div', { className: "card player-card" },
      React.createElement('div', { className: "text-center" },
        renderRoleImage(player.role || 'unknown'),
        React.createElement('p', { className: "player-name" }, player.name),
        React.createElement('p', { className: "player-role" }, `役職: ${state.phase === '役職確認' ? player.role : '???'}`),
        React.createElement('p', { className: "player-points" }, `ポイント: ${player.points || 0}`)
      )
    )
  );

  const CenterCard = ({ cardNumber }) => (
    React.createElement('div', { className: "card center-card" },
      React.createElement('div', { className: "text-center" },
        React.createElement('p', { className: "center-card-number" }, `場札 ${cardNumber}`)
      )
    )
  );

  const handleAction = (action, target) => {
    const result = window.performAction(state.currentPlayerId, action, target);
    alert(result);
  };

  const handleVote = (targetId) => {
    const result = window.castVote(state.currentPlayerId, targetId);
    if (result) {
      alert(result);
    }
  };

  const renderActionArea = () => {
    switch (currentPhase) {
      case '占い師':
      case '人狼':
      case '怪盗':
        return state.players.map(player => (
          player.id !== state.currentPlayerId && (
            React.createElement('button', {
              key: player.id,
              onClick: () => handleAction(currentPhase, player.id)
            }, `${player.name}に対してアクション`)
          )
        ));
      case '投票':
        return state.players.map(player => (
          player.id !== state.currentPlayerId && (
            React.createElement('button', {
              key: player.id,
              onClick: () => handleVote(player.id)
            }, `${player.name}に投票`)
          )
        ));
      case '結果':
        return React.createElement('p', null, state.result || '結果はまだ発表されていません。');
      default:
        return React.createElement('p', null, '現在のフェーズではアクションを実行できません。');
    }
  };

  const renderSpecialAbilities = () => {
    const currentPlayerRole = window.getPlayerRole(state.currentPlayerId);
    if (!currentPlayerRole) return null;

    switch (currentPlayerRole.name) {
      case 'やっかいな豚男':
        return React.createElement('button', {
          onClick: () => {
            const targetId = prompt('対象のプレイヤーIDを入力してください:');
            if (targetId) {
              const result = window.usePigmanAbility(state.currentPlayerId, targetId);
              alert(result);
            }
          }
        }, '★マークを付与');
      case '博識な子犬':
        return React.createElement('button', {
          onClick: () => {
            const targetId = prompt('対象のプレイヤーIDを入力してください:');
            const guessedRole = prompt('推測する役職名を入力してください:');
            if (targetId && guessedRole) {
              const result = window.useKnowledgeablePuppyAbility(state.currentPlayerId, guessedRole, targetId);
              alert(result);
            }
          }
        }, '役職を推測');
      case 'スパイ':
        return React.createElement('button', {
          onClick: () => {
            const suspectedSpyId = prompt('スパイだと疑うプレイヤーIDを入力してください:');
            if (suspectedSpyId) {
              const result = window.reportSpy(state.currentPlayerId, suspectedSpyId);
              alert(result);
            }
          }
        }, 'スパイを通報');
      default:
        return null;
    }
  };

  return React.createElement('div', { className: "game-container" },
    React.createElement('h1', { className: "game-title" }, '多能力一夜人狼'),
    React.createElement('div', { className: "phase-container" },
      phases.map((phase, index) => (
        React.createElement('div', {
          key: phase,
          className: `phase-card ${currentPhase === phase ? 'current-phase' : ''}`
        },
          React.createElement('h2', null, phase),
          React.createElement('div', { className: "phase-icon" }, renderPhaseIcon(phase)),
          React.createElement('button', {
            onClick: () => {
              setCurrentPhase(phase);
              window.nextPhase();
            },
            disabled: phases.indexOf(phase) > phases.indexOf(currentPhase),
            className: "phase-button"
          }, currentPhase === phase ? '現在のフェーズ' : 'このフェーズへ')
        )
      ))
    ),
    React.createElement('div', { className: "players-container" },
      state.players.map((player, index) => (
        React.createElement(PlayerCard, { key: player.id, player: player })
      )),
      React.createElement('div', { className: "center-cards" },
        React.createElement(CenterCard, { cardNumber: 1 }),
        React.createElement(CenterCard, { cardNumber: 2 })
      )
    ),
    React.createElement('div', { className: "action-area" },
      React.createElement('h2', null, 'アクションエリア'),
      React.createElement('p', null, `現在のフェーズ: ${currentPhase}`),
      renderActionArea(),
      renderSpecialAbilities()
    )
  );
};

const EnhancedGameUI = () => {
  const [state, setState] = React.useState(() => window.getGameState());
  const [currentPhase, setCurrentPhase] = React.useState('待機中');
  const [isInLobby, setIsInLobby] = React.useState(true);
  
  React.useEffect(() => {
    const updateState = () => {
      const newState = window.getGameState();
      setState(newState);
      if (newState.players.length > 0) {
        setIsInLobby(false);
      }
    };
    window.addEventListener('gameStateUpdated', updateState);
    return () => {
      window.removeEventListener('gameStateUpdated', updateState);
    };
  }, []);

  const handleCreateGame = (playerName) => {
    try {
      const gameId = window.setupNetwork();
      window.addPlayer({ id: gameId, name: playerName });
      alert(`ゲームが作成されました。ゲームID: ${gameId}\nこのIDを他のプレイヤーに共有してください。`);
      setIsInLobby(false);  // ゲーム画面に切り替え
    } catch (error) {
      console.error('Error creating game:', error);
      alert('ゲームの作成中にエラーが発生しました。ページをリロードして再試行してください。');
    }
  };

  const handleJoinGame = (playerName, gameId) => {
    try {
      window.setupNetwork();  // 自身のPeerインスタンスを作成
      window.joinGame(gameId, playerName);
      setIsInLobby(false);  // ゲーム画面に切り替え
    } catch (error) {
      console.error('Error joining game:', error);
      alert('ゲームへの参加中にエラーが発生しました。ゲームIDを確認し、再試行してください。');
    }
  };

  if (isInLobby) {
    return React.createElement(LobbyScreen, { onCreateGame: handleCreateGame, onJoinGame: handleJoinGame });
  } else {
    return React.createElement(GameScreen, { state, currentPhase, setCurrentPhase });
  }
};

const renderUI = () => {
  ReactDOM.render(React.createElement(EnhancedGameUI), document.getElementById('app'));
};

// UIの初期レンダリング
document.addEventListener('DOMContentLoaded', renderUI);

// エラーハンドリングの追加
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  alert('予期せぬエラーが発生しました。ページをリロードしてください。');
});

// グローバルスコープに renderUI 関数を公開
window.renderUI = renderUI;
