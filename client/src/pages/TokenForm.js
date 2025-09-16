import React, { useContext, useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress,
  Alert,
  Box,
  Paper,
  Snackbar,
  Chip
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { TokenContext } from '../context/TokenContext';
import { supabase } from '../utils/supabase';
import { Card, CardContent, useTheme } from '@mui/material';

const TokenForm = () => {
  const navigate = useNavigate();
  const { state: { gender, service } } = useLocation();
  const { addToken } = useContext(TokenContext);

  const [formData, setFormData] = useState({
    name: '',
    mobile: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [currentServingToken, setCurrentServingToken] = useState(null);
  const theme = useTheme();
  
  // Subscribe to real-time updates for the current serving token
  useEffect(() => {
    const channel = supabase
      .channel('realtime_tokens')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: `${gender}_tokens`,
          filter: 'status=eq.serving'
        }, 
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setCurrentServingToken({ ...payload.new, gender });
          } else if (payload.eventType === 'DELETE') {
            setCurrentServingToken(null);
          }
        }
      )
      .subscribe();

    // Initial fetch of current serving token
    const fetchCurrentServingToken = async () => {
      try {
        const { data, error } = await supabase
          .from(`${gender}_tokens`)
          .select('*')
          .eq('status', 'serving')
          .single();

        if (data) {
          setCurrentServingToken({ ...data, gender });
        } else {
          setCurrentServingToken(null);
        }
      } catch (error) {
        console.error('Error fetching current serving token:', error);
      }
    };

    fetchCurrentServingToken();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gender]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.mobile || !formData.name) {
      setSnackbar({
        open: true,
        message: 'Please enter both name and mobile number',
        severity: 'error'
      });
      return;
    }

    // Validate mobile number (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(formData.mobile)) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid 10-digit mobile number',
        severity: 'error'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Create the token directly without OTP verification
      const { token, error: tokenError } = await addToken({
        gender,
        service,
        name: formData.name,
        mobile: formData.mobile
      });

      if (tokenError) throw tokenError;
      
      // Navigate to success page
      navigate('/success', { 
        state: { 
          tokenNumber: token.token_number,
          name: formData.name,
          service: service,
          gender: gender
        } 
      });
      
    } catch (error) {
      console.error('Error submitting form:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to submit form. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      {/* Current Serving Token Card */}
      <Card 
        elevation={3} 
        sx={{ 
          mb: 4,
          borderLeft: `4px solid ${gender === 'male' ? theme.palette.primary.main : theme.palette.secondary.main}`,
          borderRadius: 1
        }}
      >
        <CardContent>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Currently Serving
          </Typography>
          {currentServingToken ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography 
                variant="h2" 
                color={gender === 'male' ? 'primary' : 'secondary'}
                sx={{ 
                  fontWeight: 'bold',
                  mb: 1
                }}
              >
                {gender.charAt(0).toUpperCase()}{currentServingToken.token_number}
              </Typography>
              <Typography variant="body1" color="text.primary" sx={{ mb: 1 }}>
                {currentServingToken.name}
              </Typography>
              <Chip 
                label={currentServingToken.service} 
                size="small"
                sx={{ 
                  bgcolor: gender === 'male' ? 'primary.light' : 'secondary.light',
                  color: gender === 'male' ? 'primary.dark' : 'secondary.dark',
                  fontWeight: 'medium'
                }}
              />
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 2 }}>
              No token is currently being served
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Service and Form Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom align="center">
          {service} - {gender.charAt(0).toUpperCase() + gender.slice(1)}
        </Typography>
      </Box>
      <Box sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom align="center">
            Enter Your Details
          </Typography>
          
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}
          
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert 
              onClose={() => setSnackbar({ ...snackbar, open: false })} 
              severity={snackbar.severity || 'info'}
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>

          <form onSubmit={handleSubmit}>
            <TextField
              label="Your Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
              disabled={isLoading}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Mobile Number"
              name="mobile"
              type="tel"
              value={formData.mobile}
              onChange={handleChange}
              fullWidth
              required
              disabled={isLoading}
              inputProps={{ maxLength: 10, pattern: '[0-9]*' }}
              sx={{ mb: 3 }}
            />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              disabled={!formData.name || !formData.mobile || isLoading}
              endIcon={isLoading ? <CircularProgress size={20} /> : null}
              fullWidth
              size="large"
            >
              {isLoading ? 'Getting Token...' : 'Get Token'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default TokenForm;
