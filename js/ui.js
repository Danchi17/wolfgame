// モジュールのインポートを削除し、グローバルスコープで関数を使用する前提で修正
// React関連の変数をグローバルスコープから取得

const EnhancedGameUI = () => {
  const [state, setState] = React.useState(() => getGameState());
  const [currentPhase, setCurrentPhase] = React.useState('待機中');
  
  React.useEffect(() => {
    const updateState = () => setState(getGameState());
    // ゲーム状態が変更されたときにUIを更新するためのイベントリスナーをここに追加
    return () => {
      // クリーンアップ関数：イベントリスナーの削除など
    };
  }, []);

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
    return (
      React.createElement('img', {
        src: `images/roles/${role}.jpg`,
        alt: role,
        className: "role-image",
        onError: (e) => {
          e.target.onerror = null;
          e.target.src = 'images/roles/unknown.jpg';
        }
      })
    );
  };

  const PlayerCard = ({ player }) => (
    React.createElement('div', { className: "card player-card" },
      React.createElement('div', { className: "text-center" },
        renderRoleImage(player.role || 'unknown'),
        React.createElement('p', { className: "player-name" }, player.name),
        React.createElement('p', { className: "player-role" }, `役職: ${state.phase === '役職確認' ? player.role : '???'}`),
        React.createElement('p', { className: "player-points" }, `ポイント: ${player.points}`)
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
    const result = performAction(state.currentPlayerId, action, target);
    alert(result);
    setState(getGameState());
  };

  const handleVote = (targetId) => {
    const result = castVote(state.currentPlayerId, targetId);
    if (result) {
      alert(result);
      setState(getGameState());
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
    const currentPlayerRole = getPlayerRole(state.currentPlayerId);
    if (!currentPlayerRole) return null;

    switch (currentPlayerRole.name) {
      case 'やっかいな豚男':
        return React.createElement('button', {
          onClick: () => {
            const targetId = prompt('対象のプレイヤーIDを入力してください:');
            if (targetId) {
              const result = usePigmanAbility(state.currentPlayerId, targetId);
              alert(result);
              setState(getGameState());
            }
          }
        }, '★マークを付与');
      case '博識な子犬':
        return React.createElement('button', {
          onClick: () => {
            const targetId = prompt('対象のプレイヤーIDを入力してください:');
            const guessedRole = prompt('推測する役職名を入力してください:');
            if (targetId && guessedRole) {
              const result = useKnowledgeablePuppyAbility(state.currentPlayerId, guessedRole, targetId);
              alert(result);
              setState(getGameState());
            }
          }
        }, '役職を推測');
      case 'スパイ':
        return React.createElement('button', {
          onClick: () => {
            const suspectedSpyId = prompt('スパイだと疑うプレイヤーIDを入力してください:');
            if (suspectedSpyId) {
              const result = reportSpy(state.currentPlayerId, suspectedSpyId);
              alert(result);
              setState(getGameState());
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
              nextPhase();
              setState(getGameState());
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
