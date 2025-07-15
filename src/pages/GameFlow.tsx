import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  IconButton,
  List,
  ListItem,
  Stack,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GamepadIcon from '@mui/icons-material/Gamepad';
import DescriptionIcon from '@mui/icons-material/Description';
import StyleIcon from '@mui/icons-material/Style';
import PersonIcon from '@mui/icons-material/Person';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import BarChartIcon from '@mui/icons-material/BarChart';
import GroupIcon from '@mui/icons-material/Group';
import { useGame } from '../contexts/GameContext';
import Timer from '../components/game/Timer';
import themes from '../data/themes.json';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/localStorage';

interface WordCard {
  id: string;
  name?: string;
  citizenWord?: string;
  wolfWord?: string;
  citizenWords?: string[];
  wolfWords?: string[];
}

interface AssignedPlayer {
  name: string;
  role: 'citizen' | 'wolf';
  word: string;
}

type GameStep = 'welcome' | 'playerSetup' | 'themeSetup' | 'roleDistribution' | 'discussion' | 'voting' | 'result';

const CARD_STORAGE_KEY = 'wordCards';

const GameFlow = () => {
  const { settings, setSettings, resetSettings } = useGame();
  
  // ゲーム進行状態
  const [gameStep, setGameStep] = useState<GameStep>('welcome');
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayer[]>([]);
  const [allPlayers, setAllPlayers] = useState<AssignedPlayer[]>([]); // 全プレイヤー（追放された人も含む）
  const [selectedVotedPlayer, setSelectedVotedPlayer] = useState<string>('');
  const [exiledPlayer, setExiledPlayer] = useState<AssignedPlayer | null>(null);
  const [winner, setWinner] = useState<'citizen' | 'wolf' | null>(null);
  
  // プレイヤー設定
  const [players, setPlayers] = useState<string[]>(['', '', '']);
  
  // お題設定
  const [citizenWord, setCitizenWord] = useState('');
  const [wolfWord, setWolfWord] = useState('');
  const [themeSource, setThemeSource] = useState<'preset' | 'custom'>('preset');
  const [customCards, setCustomCards] = useState<WordCard[]>([]);
  const [wolfCount, setWolfCount] = useState(1);
  
  // UI状態
  const [showGameExplanation, setShowGameExplanation] = useState(false);
  const [discussionTime, setDiscussionTime] = useState(5); // 話し合い時間（分）
  
  // カード管理
  const [newCitizenWord, setNewCitizenWord] = useState('');
  const [newWolfWord, setNewWolfWord] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  useEffect(() => {
    // カスタムカードをロード
    const savedCustomCards = loadFromLocalStorage<WordCard[]>(CARD_STORAGE_KEY);
    if (savedCustomCards) {
      setCustomCards(savedCustomCards);
    }
    
    // 設定がある場合は復元
    if (settings) {
      setPlayers(settings.players);
      setCitizenWord(settings.citizenWord);
      setWolfWord(settings.wolfWord);
    }

    // アプリ終了時にローカルストレージをクリア
    const clearLocalStorage = () => {
      localStorage.removeItem(CARD_STORAGE_KEY);
      // ゲームコンテキストのデータもクリアする場合
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('wordwolf_') || key === 'gameSettings') {
          localStorage.removeItem(key);
        }
      });
    };

    const handleBeforeUnload = () => {
      clearLocalStorage();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearLocalStorage();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings]);

  const selectRandomTheme = (source: 'preset' | 'custom') => {
    let selectedTheme: WordCard | undefined;
    if (source === 'preset') {
      const randomIndex = Math.floor(Math.random() * themes.length);
      selectedTheme = themes[randomIndex];
    } else if (source === 'custom' && customCards.length > 0) {
      const randomIndex = Math.floor(Math.random() * customCards.length);
      selectedTheme = customCards[randomIndex];
    }

    if (selectedTheme) {
      // 新形式（配列）と旧形式（単一値）の両方に対応
      if (selectedTheme.citizenWords && selectedTheme.wolfWords) {
        // 新形式：配列からランダム選択
        const citizenRandomIndex = Math.floor(Math.random() * selectedTheme.citizenWords.length);
        const wolfRandomIndex = Math.floor(Math.random() * selectedTheme.wolfWords.length);
        setCitizenWord(selectedTheme.citizenWords[citizenRandomIndex]);
        setWolfWord(selectedTheme.wolfWords[wolfRandomIndex]);
      } else if (selectedTheme.citizenWord && selectedTheme.wolfWord) {
        // 旧形式：単一値
        setCitizenWord(selectedTheme.citizenWord);
        setWolfWord(selectedTheme.wolfWord);
      } else {
        setCitizenWord('');
        setWolfWord('');
      }
    } else {
      setCitizenWord('');
      setWolfWord('');
      if (source === 'custom') {
        alert('カスタムカードが登録されていません。');
      }
    }
  };

  const handlePlayerChange = (index: number, newName: string) => {
    const newPlayers = [...players];
    newPlayers[index] = newName;
    setPlayers(newPlayers);
  };

  const handleAddPlayer = () => {
    setPlayers([...players, '']);
  };

  const handleRemovePlayer = (index: number) => {
    if (players.length <= 1) return;
    const newPlayers = players.filter((_, i) => i !== index);
    setPlayers(newPlayers);
  };

  const handleStartGame = () => {
    const validPlayers = players.filter(p => p.trim() !== '');
    if (validPlayers.length < 3) {
      alert('プレイヤーは3人以上必要です。');
      return;
    }
    if (!citizenWord.trim() || !wolfWord.trim()) {
      alert('お題が選択されていません。');
      return;
    }
    if (wolfCount >= validPlayers.length) {
      alert('ワードウルフの人数は参加者数より少なくする必要があります。');
      return;
    }

    // 設定を保存
    setSettings({
      players: validPlayers,
      citizenWord,
      wolfWord,
    });

    // 役職を割り当て
    const shuffledPlayers = [...validPlayers];
    
    // ワードウルフの人数が参加者数を超えないように調整
    const actualWolfCount = Math.min(wolfCount, validPlayers.length - 1);
    
    // ランダムにワードウルフを選択
    const wolfIndices = new Set<number>();
    while (wolfIndices.size < actualWolfCount) {
      const randomIndex = Math.floor(Math.random() * shuffledPlayers.length);
      wolfIndices.add(randomIndex);
    }

    const newAssignedPlayers: AssignedPlayer[] = shuffledPlayers.map((player, index) => {
      if (wolfIndices.has(index)) {
        return { name: player, role: 'wolf', word: wolfWord };
      } else {
        return { name: player, role: 'citizen', word: citizenWord };
      }
    });
    
    setAssignedPlayers(newAssignedPlayers);
    setAllPlayers(newAssignedPlayers); // 全プレイヤーリストも初期化
    setGameStep('roleDistribution');
  };

  const handleProcessVote = () => {
    if (!selectedVotedPlayer) {
      alert('投票結果を選択してください。');
      return;
    }

    // 同数投票の場合
    if (selectedVotedPlayer === '__TIE__') {
      alert('同数投票のため、追放者が決まりませんでした。\n再び話し合いを行い、再投票を実施しましょう。');
      setSelectedVotedPlayer('');
      setGameStep('discussion');
      return;
    }

    const exiled = assignedPlayers.find(p => p.name === selectedVotedPlayer);
    if (exiled) {
      setExiledPlayer(exiled);
      
      // 勝利条件の判定
      if (exiled.role === 'wolf') {
        // ワードウルフが追放された場合、残りのワードウルフ数を確認
        const remainingWolves = assignedPlayers.filter(p => p.role === 'wolf' && p.name !== selectedVotedPlayer);
        if (remainingWolves.length === 0) {
          setWinner('citizen'); // 全てのワードウルフが追放されたら市民の勝ち
        } else {
          // まだワードウルフが残っている場合はゲーム続行（次の投票ラウンドへ）
          // ここでは結果を表示せず、再び話し合いに戻るか新しい投票を行う
          alert(`${exiled.name}さん（ワードウルフ）が追放されました。\nまだワードウルフが${remainingWolves.length}人残っています。\n続けて話し合いを行いましょう。`);
          
          // 追放されたプレイヤーをゲームから除外
          const updatedPlayers = assignedPlayers.filter(p => p.name !== selectedVotedPlayer);
          setAssignedPlayers(updatedPlayers);
          setSelectedVotedPlayer('');
          
          // 話し合いフェーズに戻る
          setGameStep('discussion');
          return;
        }
      } else {
        // 市民が追放された場合、ゲーム続行して勝利条件をチェック
        alert(`${exiled.name}さん（市民）が追放されました。`);
        
        // 追放されたプレイヤーをゲームから除外
        const updatedPlayers = assignedPlayers.filter(p => p.name !== selectedVotedPlayer);
        
        // 勝利条件をチェック
        const remainingCitizens = updatedPlayers.filter(p => p.role === 'citizen');
        const remainingWolves = updatedPlayers.filter(p => p.role === 'wolf');
        
        if (remainingWolves.length >= remainingCitizens.length) {
          // ワードウルフの数が市民以上になったらワードウルフの勝利
          setWinner('wolf');
          setAssignedPlayers(updatedPlayers);
        } else {
          // まだゲーム続行
          alert(`ゲーム続行です。\n残り: 市民${remainingCitizens.length}人、ワードウルフ${remainingWolves.length}人`);
          setAssignedPlayers(updatedPlayers);
          setSelectedVotedPlayer('');
          setGameStep('discussion');
          return;
        }
      }
    }

    setGameStep('result');
  };

  const handleResetGame = () => {
    setGameStep('welcome');
    setAssignedPlayers([]);
    setAllPlayers([]);
    setSelectedVotedPlayer('');
    setExiledPlayer(null);
    setWinner(null);
    resetSettings();
    
    // ゲームリセット時にもローカルストレージをクリア
    localStorage.removeItem(CARD_STORAGE_KEY);
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('wordwolf_') || key === 'gameSettings') {
        localStorage.removeItem(key);
      }
    });
    setCustomCards([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // 簡単なフィードバック（アラートなし）
      const button = document.activeElement as HTMLElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = '✓ コピー済み';
        button.style.backgroundColor = '#10b981';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = '';
        }, 1500);
      }
    });
  };

  const generateGameExplanation = () => {
    return `【ワードウルフ】

このゲームは、みんなで会話をしながら、一人だけ違うお題を持つ「ワードウルフ」を探し出す推理ゲームです。

◆基本的な遊び方
1. 参加者に、似ているけど少し違う2種類のお題が配られます
2. 自分のお題が多数派（市民）か少数派（ワードウルフ）かは分かりません
3. お題について自由に話し合い、誰がワードウルフかを探ります
4. 話し合いが終わったら、ワードウルフだと思う人に投票します
5. 一番票を集めた人が追放されます（同数の場合は再投票）
6. 追放された人がワードウルフなら市民の勝ち、市民ならワードウルフの勝ちです

◆勝利条件
・市民チーム：すべてのワードウルフを正しく見つけて追放する
・ワードウルフ：ワードウルフの数が市民以上になる、または最後まで正体がバレずに残る

※ワードウルフが複数人いる場合、全員を追放しなければ市民チームの勝利にはなりません
※市民が追放されても、ワードウルフの数が市民以上にならない限りゲームは続きます

それでは、ゲームを開始しましょう！`;
  };

  const generateRoleText = (player: AssignedPlayer) => {
    return `あなたのお題：${player.word}`;
  };

  const generateVotingText = () => {
    if (assignedPlayers.length === 0) return '';
    
    return `【投票タイム】

ワードウルフだと思う人の番号を入力してください。

${assignedPlayers.map((p, index) => `${index + 1}. ${p.name}`).join('\n')}

※同数の場合は再投票を行います。
制限時間内に投票をお願いします！`;
  };

  // カード管理機能
  const handleAddCard = () => {
    if (!newCitizenWord.trim() || !newWolfWord.trim()) {
      alert('市民のお題とワードウルフのお題を両方入力してください。');
      return;
    }
    const newCard: WordCard = {
      id: Date.now().toString(),
      citizenWord: newCitizenWord,
      wolfWord: newWolfWord,
    };
    const updatedCards = [...customCards, newCard];
    setCustomCards(updatedCards);
    saveToLocalStorage(CARD_STORAGE_KEY, updatedCards);
    setNewCitizenWord('');
    setNewWolfWord('');
  };

  const handleEditClick = (card: WordCard) => {
    setEditingCardId(card.id);
    setNewCitizenWord(card.citizenWord || '');
    setNewWolfWord(card.wolfWord || '');
  };

  const handleUpdateCard = () => {
    if (!newCitizenWord.trim() || !newWolfWord.trim()) {
      alert('市民のお題とワードウルフのお題を両方入力してください。');
      return;
    }
    const updatedCards = customCards.map((card) =>
      card.id === editingCardId
        ? { ...card, citizenWord: newCitizenWord, wolfWord: newWolfWord }
        : card
    );
    setCustomCards(updatedCards);
    saveToLocalStorage(CARD_STORAGE_KEY, updatedCards);
    setEditingCardId(null);
    setNewCitizenWord('');
    setNewWolfWord('');
  };

  const handleDeleteCard = (id: string) => {
    if (window.confirm('このカードを削除してもよろしいですか？')) {
      const updatedCards = customCards.filter((card) => card.id !== id);
      setCustomCards(updatedCards);
      saveToLocalStorage(CARD_STORAGE_KEY, updatedCards);
    }
  };

  return (
    <Box sx={{ 
      width: '100%',
      minHeight: 'calc(100vh - 80px)',
      px: 4,
      py: 3,
    }}>
      {/* ウェルカム画面 */}
      {gameStep === 'welcome' && (
        <Box sx={{ display: 'flex', gap: 4, height: 'calc(100vh - 120px)' }}>
          {/* 左側：タイトルとボタン */}
          <Card sx={{ 
            flex: 1,
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            border: '2px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
          }}>
            <CardContent sx={{ p: 6, textAlign: 'center', width: '100%' }}>
              <Box sx={{ mb: 6 }}>
                <Typography 
                  variant="h1" 
                  gutterBottom 
                  sx={{ 
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 800,
                    fontSize: '4rem',
                    mb: 3
                  }}
                >
                  ワードウルフ
                </Typography>
                <Typography 
                  variant="h5" 
                  color="text.secondary"
                  sx={{ fontSize: '1.75rem', fontWeight: 500 }}
                >
                  みんなで楽しむ推理ゲーム
                </Typography>
              </Box>
            
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                alignItems: 'center'
              }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<GamepadIcon />}
                  onClick={() => setGameStep('playerSetup')}
                  sx={{ 
                    minWidth: 300,
                    py: 3,
                    fontSize: '1.5rem',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    }
                  }}
                >
                  ゲームを開始
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<DescriptionIcon />}
                  onClick={() => setShowGameExplanation(!showGameExplanation)}
                  sx={{ 
                    minWidth: 300,
                    py: 3,
                    fontSize: '1.5rem',
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                    }
                  }}
                >
                  ゲーム説明{showGameExplanation ? ' を隠す' : ' を表示'}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<StyleIcon />}
                  onClick={() => setGameStep('themeSetup')}
                  sx={{ 
                    minWidth: 300,
                    py: 3,
                    fontSize: '1.5rem',
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                    }
                  }}
                >
                  カード管理
                </Button>
              </Box>
          </CardContent>
        </Card>
        
        {/* 右側：ゲーム説明（条件付き表示） */}
        {showGameExplanation && (
          <Card sx={{ 
            flex: 1,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '2px solid #e2e8f0',
          }}>
            <CardContent sx={{ p: 6, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 4,
                p: 3,
                bgcolor: 'rgba(99, 102, 241, 0.05)',
                borderRadius: 2,
                border: '1px solid rgba(99, 102, 241, 0.1)'
              }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: 'primary.main',
                    fontWeight: 600,
                    fontSize: '1.75rem'
                  }}
                >
                  ゲーム説明
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => copyToClipboard(generateGameExplanation())}
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    px: 1,
                    py: 0.5,
                    minWidth: 'auto',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: 'rgba(99, 102, 241, 0.05)'
                    }
                  }}
                >
                  コピー
                </Button>
              </Box>
              <Paper 
                sx={{ 
                  flex: 1,
                  p: 4, 
                  bgcolor: '#fefefe',
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  overflow: 'auto'
                }}
              >
                <Typography 
                  variant="body1" 
                  sx={{ 
                    whiteSpace: 'pre-line',
                    lineHeight: 1.8,
                    fontSize: '1.25rem'
                  }}
                >
                  {generateGameExplanation()}
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        )}
        </Box>
      )}

      {/* プレイヤー設定画面 */}
      {gameStep === 'playerSetup' && (
        <Card sx={{ maxWidth: 1200, mx: 'auto' }}>
          <CardContent sx={{ p: 6 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography 
                variant="h4" 
                gutterBottom
                sx={{ 
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: { xs: '1.75rem', sm: '2rem' },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  justifyContent: 'center'
                }}
              >
                <GroupIcon sx={{ fontSize: '2rem' }} />
                プレイヤー設定
              </Typography>
              <Typography variant="body1" color="text.secondary">
                参加者の名前を入力してください（3人以上必要）
              </Typography>
            </Box>

            <List>
              {players.map((player, index) => (
                <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                  <TextField
                    label={`プレイヤー ${index + 1}`}
                    value={player}
                    onChange={(e) => handlePlayerChange(index, e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{ flexGrow: 1, mr: 1 }}
                  />
                  <IconButton onClick={() => handleRemovePlayer(index)} edge="end">
                    <DeleteIcon />
                  </IconButton>
                </ListItem>
              ))}
            </List>

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddPlayer}
              sx={{ mb: 3 }}
            >
              プレイヤーを追加
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Button 
                variant="contained" 
                onClick={() => {
                  const validPlayers = players.filter(p => p.trim() !== '');
                  if (validPlayers.length < 3) {
                    alert('プレイヤーは3人以上必要です。');
                    return;
                  }
                  const confirmed = window.confirm(`⚠️ 重要：お題設定に進みます\n\nここからはお題が表示されるため、\n参加者に見えないように画面共有を停止してください。\n\n参加プレイヤー: ${validPlayers.join('、')}\n\n続行しますか？`);
                  if (confirmed) {
                    setGameStep('themeSetup');
                  }
                }} 
                sx={{ mr: 2 }}
              >
                次へ：お題設定
              </Button>
              <Button variant="outlined" onClick={() => setGameStep('welcome')}>
                戻る
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* お題設定画面 */}
      {gameStep === 'themeSetup' && (
        <Stack spacing={4} sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                お題設定
              </Typography>

              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <RadioGroup
                  row
                  value={themeSource}
                  onChange={(e) => {
                    const newSource = e.target.value as 'preset' | 'custom';
                    setThemeSource(newSource);
                    selectRandomTheme(newSource);
                  }}
                >
                  <FormControlLabel value="preset" control={<Radio />} label="プリセットお題" />
                  <FormControlLabel value="custom" control={<Radio />} label="カスタムお題" />
                </RadioGroup>
              </FormControl>

              <Typography variant="body1">市民のお題: <strong>{citizenWord || '未選択'}</strong></Typography>
              <Typography variant="body1">ワードウルフのお題: <strong>{wolfWord || '未選択'}</strong></Typography>
              
              <Button
                variant="outlined"
                onClick={() => selectRandomTheme(themeSource)}
                sx={{ mt: 2, mb: 3 }}
              >
                お題をランダムに選択
              </Button>

              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>ワードウルフ人数</Typography>
                  <FormControl fullWidth sx={{ minWidth: 120 }}>
                    <InputLabel>ワードウルフ人数</InputLabel>
                    <Select
                      value={wolfCount}
                      label="ワードウルフ人数"
                      onChange={(e) => setWolfCount(Number(e.target.value))}
                    >
                      {Array.from({ length: Math.max(1, players.filter(p => p.trim() !== '').length - 1) }, (_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                          {i + 1}人
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    参加者: {players.filter(p => p.trim() !== '').length}人 / 最大ワードウルフ: {Math.max(0, players.filter(p => p.trim() !== '').length - 1)}人
                  </Typography>
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>話し合い時間</Typography>
                  <FormControl fullWidth sx={{ minWidth: 120 }}>
                    <InputLabel>話し合い時間</InputLabel>
                    <Select
                      value={discussionTime}
                      label="話し合い時間"
                      onChange={(e) => setDiscussionTime(Number(e.target.value))}
                    >
                      {Array.from({ length: 10 }, (_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                          {i + 1}分
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    1分から10分まで設定可能
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Button 
                  variant="contained" 
                  onClick={() => {
                    const confirmed = window.confirm('⚠️ 注意：次の画面では役職が表示されます。\n参加者に見られないよう注意してください。\n\n役職配布画面に進みますか？');
                    if (confirmed) {
                      handleStartGame();
                    }
                  }}
                  sx={{ mr: 2 }}
                >
                  ゲーム開始
                </Button>
                <Button variant="outlined" onClick={() => setGameStep('playerSetup')}>
                  戻る
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* カード管理 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                カスタムお題管理
              </Typography>

              <Box sx={{ mb: 3 }}>
                <TextField
                  label="市民のお題"
                  value={newCitizenWord}
                  onChange={(e) => setNewCitizenWord(e.target.value)}
                  fullWidth
                  margin="normal"
                />
                <TextField
                  label="ワードウルフのお題"
                  value={newWolfWord}
                  onChange={(e) => setNewWolfWord(e.target.value)}
                  fullWidth
                  margin="normal"
                />
                {editingCardId ? (
                  <Button variant="contained" onClick={handleUpdateCard} startIcon={<AddIcon />}>
                    カードを更新
                  </Button>
                ) : (
                  <Button variant="contained" onClick={handleAddCard} startIcon={<AddIcon />}>
                    カードを追加
                  </Button>
                )}
              </Box>

              <Typography variant="subtitle1" gutterBottom>登録済みカード</Typography>
              {customCards.length === 0 ? (
                <Typography color="text.secondary">まだカードが登録されていません。</Typography>
              ) : (
                <List>
                  {customCards.map((card) => (
                    <ListItem
                      key={card.id}
                      secondaryAction={
                        <Box>
                          <IconButton onClick={() => handleEditClick(card)}>
                            <AddIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteCard(card.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      }
                    >
                      <Box>
                        <Typography>
                          市民: {card.citizenWord || (card.citizenWords ? card.citizenWords.join(', ') : '')}
                        </Typography>
                        <Typography>
                          ウルフ: {card.wolfWord || (card.wolfWords ? card.wolfWords.join(', ') : '')}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* 役職配布画面 */}
      {gameStep === 'roleDistribution' && (
        <Card sx={{ maxWidth: 1400, mx: 'auto' }}>
          <CardContent sx={{ p: 6 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography 
                variant="h4" 
                gutterBottom
                sx={{ 
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: { xs: '1.75rem', sm: '2rem' },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  justifyContent: 'center'
                }}
              >
                <TheaterComedyIcon sx={{ fontSize: '2rem' }} />
                役職配布（GM用）
              </Typography>
            </Box>
            
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 4,
                fontSize: '1.125rem',
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem'
                }
              }}
            >
              ⚠️ 注意：この画面は参加者に見られないよう注意してください。
              各プレイヤーに個別にメッセージを送信してください。
            </Alert>

            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontSize: '1.375rem',
                fontWeight: 600,
                color: 'text.primary',
                mb: 3
              }}
            >
              個別メッセージ送信
            </Typography>
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: assignedPlayers.length <= 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'
              },
              gap: 2,
              mb: 2
            }}>
              {assignedPlayers.map((player) => (
                <Paper 
                  key={player.name} 
                  sx={{ 
                    p: 2, 
                    border: player.role === 'wolf' ? '2px solid #ef4444' : '2px solid #6366f1',
                    borderRadius: 2,
                    background: player.role === 'wolf' 
                      ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                      : 'linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px -4px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontSize: '1.125rem',
                          fontWeight: 600,
                          mb: 0.5
                        }}
                      >
                        {player.role === 'wolf' ? '🐺' : '👤'} {player.name}
                      </Typography>
                      <Chip 
                        label={player.role === 'wolf' ? 'ワードウルフ' : '市民'} 
                        color={player.role === 'wolf' ? 'error' : 'primary'} 
                        size="small"
                        sx={{ 
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          height: 24
                        }}
                      />
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(generateRoleText(player))}
                      sx={{
                        borderColor: player.role === 'wolf' ? '#ef4444' : '#6366f1',
                        color: player.role === 'wolf' ? '#ef4444' : '#6366f1',
                        fontSize: '0.75rem',
                        px: 1.5,
                        py: 0.5,
                        minWidth: 'auto',
                        '&:hover': {
                          bgcolor: player.role === 'wolf' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(99, 102, 241, 0.05)',
                          borderColor: player.role === 'wolf' ? '#dc2626' : '#4f46e5',
                        }
                      }}
                    >
                      コピー
                    </Button>
                  </Box>
                  <Paper 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: 'rgba(255,255,255,0.9)',
                      border: '1px solid rgba(0,0,0,0.05)',
                      borderRadius: 1
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: '1rem',
                        fontWeight: 500,
                        textAlign: 'center',
                        color: 'text.primary'
                      }}
                    >
                      {generateRoleText(player)}
                    </Typography>
                  </Paper>
                </Paper>
              ))}
            </Box>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button variant="contained" onClick={() => setGameStep('discussion')}>
                話し合いフェーズへ
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 話し合い画面 */}
      {gameStep === 'discussion' && (
        <Card sx={{ maxWidth: 1200, mx: 'auto' }}>
          <CardContent sx={{ p: 6 }}>
            <Typography variant="h5" gutterBottom>
              話し合いフェーズ（{discussionTime}分間）
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              プレイヤー同士で話し合い、ワードウルフを探しましょう。
              残り: 市民{assignedPlayers.filter(p => p.role === 'citizen').length}人、ワードウルフ{assignedPlayers.filter(p => p.role === 'wolf').length}人
            </Alert>

            <Timer initialSeconds={discussionTime * 60} />

            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Button variant="contained" onClick={() => setGameStep('voting')}>
                投票フェーズへ
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 投票画面 */}
      {gameStep === 'voting' && (
        <Card sx={{ maxWidth: 1200, mx: 'auto' }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              投票フェーズ
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>投票案内（チャットにコピー）</Typography>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => copyToClipboard(generateVotingText())}
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    px: 1,
                    py: 0.5,
                    minWidth: 'auto',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: 'rgba(99, 102, 241, 0.05)'
                    }
                  }}
                >
                  コピー
                </Button>
              </Box>
              <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {generateVotingText()}
                </Typography>
              </Paper>
            </Box>

            <Typography variant="h6" gutterBottom>投票結果選択（GM用）</Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              現在のワードウルフ数: {assignedPlayers.filter(p => p.role === 'wolf').length}人 / 市民数: {assignedPlayers.filter(p => p.role === 'citizen').length}人
            </Typography>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>投票結果</InputLabel>
              <Select
                value={selectedVotedPlayer}
                label="投票結果"
                onChange={(e) => setSelectedVotedPlayer(e.target.value)}
              >
                <MenuItem value=""><em>選択してください</em></MenuItem>
                <MenuItem value="__TIE__">同数投票（再投票へ）</MenuItem>
                {assignedPlayers.map((player) => (
                  <MenuItem key={player.name} value={player.name}>
                    {player.name} が最多票で追放
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ textAlign: 'center', display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleProcessVote}
                disabled={!selectedVotedPlayer}
              >
                {selectedVotedPlayer === '__TIE__' ? '再投票へ' : '結果発表'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setGameStep('discussion')}
              >
                話し合いに戻る
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 結果画面 */}
      {gameStep === 'result' && (
        <Card sx={{ maxWidth: 1400, mx: 'auto' }}>
          <CardContent sx={{ p: 6 }}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Typography 
                variant="h4" 
                gutterBottom
                sx={{ 
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: { xs: '1.75rem', sm: '2rem' },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  justifyContent: 'center'
                }}
              >
                <EmojiEventsIcon sx={{ fontSize: '2rem' }} />
                結果発表
              </Typography>
            </Box>
            
            {exiledPlayer && winner && (
              <Stack spacing={4}>
                {/* 追放結果 */}
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                  border: '2px solid #e2e8f0'
                }}>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        mb: 3,
                        fontSize: '1.75rem',
                        fontWeight: 600,
                        color: 'text.primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        justifyContent: 'center'
                      }}
                    >
                      <BarChartIcon sx={{ fontSize: '1.75rem' }} />
                      投票結果
                    </Typography>
                    <Box sx={{ 
                      display: 'inline-block',
                      p: 3,
                      borderRadius: 3,
                      background: exiledPlayer.role === 'wolf' 
                        ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                        : 'linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%)',
                      border: exiledPlayer.role === 'wolf' ? '2px solid #ef4444' : '2px solid #6366f1'
                    }}>
                      <Typography variant="h6" sx={{ mb: 1, fontSize: '1.375rem' }}>
                        追放されたプレイヤー
                      </Typography>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          fontWeight: 700,
                          color: exiledPlayer.role === 'wolf' ? '#ef4444' : '#6366f1',
                          mb: 2
                        }}
                      >
                        <PersonIcon sx={{ mr: 0.5 }} />
                        {exiledPlayer.name} さん
                      </Typography>
                      <Chip 
                        label={exiledPlayer.role === 'wolf' ? 'ワードウルフ' : '市民'}
                        color={exiledPlayer.role === 'wolf' ? 'error' : 'primary'}
                        sx={{ 
                          fontSize: '1.125rem',
                          fontWeight: 600,
                          px: 3,
                          py: 1,
                          mb: 2
                        }}
                      />
                      <Typography variant="body1" sx={{ fontSize: '1.25rem' }}>
                        お題：<strong>{exiledPlayer.word}</strong>
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                {/* 勝利宣言 */}
                <Card sx={{ 
                  background: winner === 'citizen' 
                    ? 'linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%)'
                    : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  border: winner === 'citizen' ? '3px solid #6366f1' : '3px solid #ef4444'
                }}>
                  <CardContent sx={{ p: 5, textAlign: 'center' }}>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        fontWeight: 800,
                        fontSize: '2.5rem',
                        color: winner === 'citizen' ? '#6366f1' : '#ef4444',
                        mb: 2,
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      {winner === 'citizen' ? '市民チームの勝利！' : 'ワードウルフの勝利！'}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontSize: '1.375rem',
                        color: 'text.secondary',
                        fontWeight: 500
                      }}
                    >
                      {winner === 'citizen' 
                        ? 'ワードウルフを正しく見つけました！' 
                        : 'ワードウルフが最後まで正体を隠し通しました！'
                      }
                    </Typography>
                  </CardContent>
                </Card>

                {/* 全員の役職 */}
                <Card>
                  <CardContent sx={{ p: 4 }}>
                    <Typography 
                      variant="h5" 
                      gutterBottom
                      sx={{ 
                        textAlign: 'center',
                        mb: 3,
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        justifyContent: 'center'
                      }}
                    >
                      <GroupIcon sx={{ fontSize: '1.5rem' }} />
                      全プレイヤーの役職とお題
                    </Typography>
                    <Box sx={{ 
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        md: allPlayers.length <= 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'
                      },
                      gap: 2
                    }}>
                      {allPlayers.map((player) => {
                        const isExiled = !assignedPlayers.find(p => p.name === player.name);
                        return (
                          <Paper
                            key={player.name}
                            sx={{
                              p: 2.5,
                              textAlign: 'center',
                              background: player.role === 'wolf' 
                                ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                                : 'linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%)',
                              border: player.role === 'wolf' ? '2px solid #ef4444' : '2px solid #6366f1',
                              borderRadius: 2,
                              opacity: isExiled ? 0.7 : 1,
                              position: 'relative'
                            }}
                          >
                            {isExiled && (
                              <Chip 
                                label="追放"
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}
                              />
                            )}
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 600,
                                mb: 1,
                                fontSize: '1.25rem',
                                textDecoration: isExiled ? 'line-through' : 'none'
                              }}
                            >
                              <PersonIcon sx={{ mr: 0.5 }} />
                              {player.name}
                            </Typography>
                            <Chip 
                              label={player.role === 'wolf' ? 'ワードウルフ' : '市民'}
                              color={player.role === 'wolf' ? 'error' : 'primary'}
                              size="small"
                              sx={{ 
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                mb: 1
                              }}
                            />
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontSize: '1.125rem',
                                fontWeight: 500,
                                color: 'text.primary'
                              }}
                            >
                              お題：{player.word}
                            </Typography>
                          </Paper>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Stack>
            )}

            <Box sx={{ textAlign: 'center', mt: 5 }}>
              <Button 
                variant="contained" 
                size="large"
                onClick={handleResetGame}
                startIcon={<GamepadIcon />}
                sx={{
                  fontSize: '1.375rem',
                  px: 4,
                  py: 2
                }}
              >
                新しいゲームを開始
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default GameFlow;