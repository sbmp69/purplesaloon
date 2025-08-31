import React, { useContext, useEffect } from 'react';
import { Container, Typography, Button, Paper, Box, CircularProgress } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { TokenContext } from '../context/TokenContext';

const TokenSuccess = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { getRecentToken, tokens } = useContext(TokenContext);
  
  // Get the most recent token details
  const token = state?.tokenNumber 
    ? { tokenNumber: state.tokenNumber, gender: state.gender, ...state }
    : getRecentToken(state?.gender);

  // Redirect to home if no token data is available
  useEffect(() => {
    if (!token && tokens.length === 0) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [token, tokens, navigate]);

  if (!token) {
    return (
      <Container maxWidth="sm" sx={{ mt: 6, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading token details...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Redirecting to home page...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="primary" gutterBottom>
          Your Token Details
        </Typography>
        
        <Box sx={{ 
          my: 4,
          p: 3,
          borderRadius: 2,
          bgcolor: 'rgba(51, 18, 107, 0.05)'
        }}>
          <Typography variant="h1" color="secondary" sx={{ 
            fontWeight: 'bold',
            mb: 2,
            background: 'linear-gradient(45deg, #33126B 30%, #FF0A91 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {token.tokenId || `${token.gender?.charAt(0).toUpperCase() || 'M'}${token.tokenNumber || '1'}`}
          </Typography>
          
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {token.gender === 'male' ? '♂ Male' : '♀ Female'}{token.service ? ` • ${token.service}` : ''}
          </Typography>
          
          {token.name && (
            <Typography variant="body1" color="text.primary" sx={{ mt: 2 }}>
              {token.name}
            </Typography>
          )}
          
          {token.mobile && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Mobile: {token.mobile}
            </Typography>
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please wait for your number to be called.
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => navigate('/')}
          sx={{ mt: 2, px: 4 }}
        >
          Back to Home
        </Button>
      </Paper>
    </Container>
  );
};

export default TokenSuccess;
