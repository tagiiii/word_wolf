import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';

const Header = () => {
  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        borderBottom: '1px solid #e2e8f0'
      }}
    >
      <Toolbar sx={{ py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              color: 'white',
              fontWeight: 700,
              fontSize: '2.25rem', // 36px - デスクトップで大きく
              letterSpacing: '-0.01em',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <PsychologyIcon sx={{ mr: 1, fontSize: '2.25rem' }} />
            Word Wolf Game
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;