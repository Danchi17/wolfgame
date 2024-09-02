import { getGameState, updateGameState } from './game/gameState.js';
import { startGame, nextPhase } from './game/gamePhases.js';
import { performAction } from './actions/playerActions.js';
import { castVote } from './actions/voteActions.js';
import { joinGame } from './network.js';
import { getPlayerRole } from './game/roleLogic.js';
import { usePigmanAbility, useKnowledgeablePuppyAbility, reportSpy } from './actions/specialActions.js';

const { useState, useEffect } = React;

const EnhancedGameUI = () => {
  const [state, setState] = useState(getGameState());
  const [currentPhase, setCurrentPhase] = useState('待機中');
  
  useEffect(() => {
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
      <img
        src={`images/roles/${role}.jpg`}
        alt={role}
        className="role-image"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = 'images/roles/unknown.jpg';
        }}
      />
    );
  };

  const PlayerCard = ({ player }) => (
    <div className="card player-card">
      <div className="text-center">
        {renderRoleImage(player.role || 'unknown')}
        <p className="player-name">{player.name}</p>
        <p className="player-role">役職: {state.phase === '役職確認' ? player.role : '???'}</p>
        <p className="player-points">ポイント: {player.points}</p>
      </div>
    </div>
  );

  const CenterCard = ({ cardNumber }) => (
    <div className="card center-card">
      <div className="text-center">
        <p className="center-card-number">場札 {cardNumber}</p>
      </div>
    </div>
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
            <button key={player.id} onClick={() => handleAction(currentPhase, player.id)}>
              {player.name}に対してアクション
            </button>
          )
        ));
      case '投票':
        return state.players.map(player => (
          player.id !== state.currentPlayerId && (
            <button key={player.id} onClick={() => handleVote(player.id)}>
              {player.name}に投票
            </button>
          )
        ));
      case '結果':
        return <p>{state.result || '結果はまだ発表されていません。'}</p>;
      default:
        return <p>現在のフェーズではアクションを実行できません。</p>;
    }
  };

  const renderSpecialAbilities = () => {
    const currentPlayerRole = getPlayerRole(state.currentPlayerId);
    if (!currentPlayerRole) return null;

    switch (currentPlayerRole.name) {
      case 'やっかいな豚男':
        return (
          <button onClick={() => {
            const targetId = prompt('対象のプレイヤーIDを入力してください:');
            if (targetId) {
              const result = usePigmanAbility(state.currentPlayerId, targetId);
              alert(result);
              setState(getGameState());
            }
          }}>
            ★マークを付与
          </button>
        );
      case '博識な子犬':
        return (
          <button onClick={() => {
            const targetId = prompt('対象のプレイヤーIDを入力してください:');
            const guessedRole = prompt('推測する役職名を入力してください:');
            if (targetId && guessedRole) {
              const result = useKnowledgeablePuppyAbility(state.currentPlayerId, guessedRole, targetId);
              alert(result);
              setState(getGameState());
            }
          }}>
            役職を推測
          </button>
        );
      case 'スパイ':
        return (
          <button onClick={() => {
            const suspectedSpyId = prompt('スパイだと疑うプレイヤーIDを入力してください:');
            if (suspectedSpyId) {
              const result = reportSpy(state.currentPlayerId, suspectedSpyId);
              alert(result);
              setState(getGameState());
            }
          }}>
            スパイを通報
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="game-container">
      <h1 className="game-title">多能力一夜人狼</h1>
      
      <div className="phase-container">
        {phases.map((phase, index) => (
          <div key={phase} className={`phase-card ${currentPhase === phase ? 'current-phase' : ''}`}>
            <h2>{phase}</h2>
            <div className="phase-icon">{renderPhaseIcon(phase)}</div>
            <button 
              onClick={() => {
                setCurrentPhase(phase);
                nextPhase();
                setState(getGameState());
              }}
              disabled={phases.indexOf(phase) > phases.indexOf(currentPhase)}
              className="phase-button"
            >
              {currentPhase === phase ? '現在のフェーズ' : 'このフェーズへ'}
            </button>
          </div>
        ))}
      </div>
      
      <div className="players-container">
        {state.players.map((player, index) => (
          <PlayerCard key={player.id} player={player} />
        ))}
        <div className="center-cards">
          <CenterCard cardNumber={1} />
          <CenterCard cardNumber={2} />
        </div>
      </div>
      
      <div className="action-area">
        <h2>アクションエリア</h2>
        <p>現在のフェーズ: {currentPhase}</p>
        {renderActionArea()}
        {renderSpecialAbilities()}
      </div>
    </div>
  );
};

const renderUI = () => {
  ReactDOM.render(<EnhancedGameUI />, document.getElementById('app'));
};

// UIの初期レンダリング
document.addEventListener('DOMContentLoaded', renderUI);

// エラーハンドリングの追加
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  alert('予期せぬエラーが発生しました。ページをリロードしてください。');
});

export { renderUI };
