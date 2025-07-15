import { useState, useEffect, useRef } from 'react';
import { Typography, Button, Box } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';

interface TimerProps {
  initialSeconds: number;
  onTimeUp?: () => void;
}

const Timer = ({ initialSeconds, onTimeUp }: TimerProps) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && seconds > 0) {
      timerRef.current = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (onTimeUp) {
        onTimeUp();
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, seconds, onTimeUp]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setSeconds(initialSeconds);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
      <Typography variant="h3" component="div" sx={{ mb: 2 }}>
        {formatTime(seconds)}
      </Typography>
      <Box>
        <Button
          variant="contained"
          onClick={toggleTimer}
          startIcon={isActive ? <PauseIcon /> : <PlayArrowIcon />}
          sx={{ mr: 1 }}
        >
          {isActive ? '一時停止' : '開始'}
        </Button>
        <Button
          variant="outlined"
          onClick={resetTimer}
          startIcon={<RefreshIcon />}
        >
          リセット
        </Button>
      </Box>
    </Box>
  );
};

export default Timer;
