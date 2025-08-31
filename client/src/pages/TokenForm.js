import React, { useContext, useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
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
import { Card, CardContent, Divider, useTheme } from '@mui/material';

const TokenForm = () => {
  const navigate = useNavigate();
  const { state: { gender, service } } = useLocation();
  const { addToken } = useContext(TokenContext);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    otp: ''
  });
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [session, setSession] = useState(null);
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
  
  // Format phone number to E.164 format (required by Supabase)
  const formatPhoneNumber = (phone) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // For Indian numbers (10 digits)
    if (cleaned.length === 10) {
      return `+91${cleaned}`; // India country code
    }
    
    // If it's 12 digits (91 followed by 10-digit number)
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    
    // If it's 11 digits (0 followed by 10-digit number)
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `+91${cleaned.substring(1)}`;
    }
    
    // If it already has a + but no country code
    if (phone.startsWith('+') && phone.length < 12) {
      return `+91${phone.substring(1).replace(/\D/g, '')}`;
    }
    
    // If it doesn't start with + but has 10+ digits
    if (cleaned.length >= 10) {
      return `+${cleaned}`;
    }
    
    // Default case - return as is (will likely fail validation)
    return phone.startsWith('+') ? phone : `+${phone}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendOTP = async () => {
    if (!formData.mobile || !formData.name) {
      setSnackbar({
        open: true,
        message: 'Please enter both name and mobile number',
        severity: 'error'
      });
      return;
    }
    
    // Bypass OTP in development
    if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_OTP === 'true') {
      setOtpSent(true);
      setSnackbar({
        open: true,
        message: 'Development mode: OTP bypassed',
        severity: 'info'
      });
      return;
    }
    
    // Debug: Log Supabase configuration
    const debugSupabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://dfcuhovsqrwvnaddngij.supabase.co';
    const debugAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY3Vob3ZzcXJ3dm5hZGRuZ2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MzcyOTIsImV4cCI6MjA3MDIxMzI5Mn0.F8RSmgSsLTVbSwvimO_6SE7d3u2uXulCdsJ7ajmIOqY';
    
    console.log('Using Supabase URL:', debugSupabaseUrl);
    console.log('Using Supabase Anon Key:', debugAnonKey ? 'Present' : 'Missing');
    
    // Log the supabase client configuration
    console.log('Supabase client config:', {
      url: debugSupabaseUrl,
      anonKey: debugAnonKey ? '***' + debugAnonKey.slice(-4) : 'Missing'
    });

    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Format and validate phone number
      const formattedPhone = formatPhoneNumber(formData.mobile);
      
      // Basic validation for Indian numbers
      if (!formattedPhone.startsWith('+91') || formattedPhone.length !== 13) {
        throw new Error('Please enter a valid 10-digit Indian mobile number');
      }
      
      console.log('Formatted phone number:', formattedPhone);
      console.log('Phone number validation passed');
      
      console.log('Attempting to send OTP to:', formattedPhone);
      
      console.log('Sending OTP to:', formattedPhone);
      
      console.log('Supabase client config:', {
        url: supabase.supabaseUrl,
        key: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Present' : 'Missing'
      });
      
      // Send OTP using Supabase Auth
      console.log('Initiating OTP request to Supabase...');
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          shouldCreateUser: true,
          data: {
            name: formData.name,
            phone: formattedPhone,
            gender,
            service
          },
          channel: 'sms'
        }
      });
      
      console.log('Supabase Auth response:', JSON.stringify({
        data: data ? 'OTP sent successfully' : 'No data in response',
        error: error ? error.message : 'No error',
        timestamp: new Date().toISOString()
      }, null, 2));

      if (error) {
        console.error('Supabase Auth Error:', error);
        
        // Handle specific Twilio errors
        if (error.message.includes('Twilio: Invalid phone number')) {
          throw new Error('Please enter a valid mobile number');
        } else if (error.message.includes('Twilio: Unverified phone number')) {
          throw new Error('This number is not verified in Twilio trial account. Please use a verified number.');
        } else if (error.message.includes('Twilio: Invalid Access Token')) {
          throw new Error('Authentication error with SMS service. Please try again later.');
        } else {
          throw error;
        }
      }
      
      setOtpSent(true);
      setSnackbar({ 
        open: true, 
        message: 'OTP sent successfully to your mobile!',
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Error in handleSendOTP:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to send OTP. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    // Bypass OTP verification in development
    if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_OTP === 'true') {
      // Proceed with form submission
      const tokenData = {
        name: formData.name,
        mobile: formData.mobile,
        gender,
        service,
        status: 'waiting',
        token_number: Math.floor(100 + Math.random() * 900)
      };
      
      try {
        const { token, error } = await addToken(tokenData);
        if (error) throw error;
        
        navigate('/success', { 
          state: { 
            tokenNumber: token.token_number,
            name: tokenData.name,
            service: tokenData.service,
            gender: tokenData.gender
          } 
        });
      } catch (error) {
        console.error('Error submitting form:', error);
        setSnackbar({
          open: true,
          message: error.message || 'Failed to submit form',
          severity: 'error'
        });
      }
      return;
    }
    
    if (!formData.otp) {
      setErrorMessage('Please enter the OTP');
      return;
    }
    
    // Development mode: Verify OTP locally
    if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_OTP === 'true') {
      setIsVerifying(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In development, any 6-digit OTP will work
        if (formData.otp.length === 6 && /^\d+$/.test(formData.otp)) {
          // Proceed with form submission
          const tokenData = {
            name: formData.name,
            mobile: formData.mobile,
            gender,
            service,
            status: 'waiting',
            token_number: Math.floor(100 + Math.random() * 900) // Random token number for dev
          };
          
          // Call your token creation logic here
          const { token, error } = await addToken(tokenData);
          
          if (error) throw error;
          
          navigate('/success', { 
            state: { 
              tokenNumber: token.token_number,
              name: tokenData.name,
              service: tokenData.service,
              gender: tokenData.gender
            } 
          });
        } else {
          throw new Error('Invalid OTP. Please enter a 6-digit number.');
        }
      } catch (error) {
        console.error('Error in development OTP verification:', error);
        setSnackbar({
          open: true,
          message: error.message || 'Failed to verify OTP',
          severity: 'error'
        });
      } finally {
        setIsVerifying(false);
      }
      return;
    }
    
    // Development mode: Verify OTP locally
    if (process.env.NODE_ENV === 'development') {
      setIsVerifying(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In development, any 6-digit OTP will work
        if (formData.otp.length === 6 && /^\d+$/.test(formData.otp)) {
          // Proceed with form submission
          const tokenData = {
            name: formData.name,
            mobile: formData.mobile,
            gender,
            service,
            status: 'waiting',
            token_number: Math.floor(100 + Math.random() * 900) // Random token number for dev
          };
          
          // Call your token creation logic here
          const { token, error } = await addToken(tokenData);
          
          if (error) throw error;
          
          navigate('/success', { 
            state: { 
              tokenNumber: token.token_number,
              name: tokenData.name,
              service: tokenData.service,
              gender: tokenData.gender
            } 
          });
        } else {
          throw new Error('Invalid OTP. Please enter a 6-digit number.');
        }
      } catch (error) {
        console.error('Error in development OTP verification:', error);
        setSnackbar({
          open: true,
          message: error.message || 'Failed to verify OTP',
          severity: 'error'
        });
      } finally {
        setIsVerifying(false);
      }
      return;
    }
    
    // Development mode: Verify against the generated OTP
    if (isDevelopment) {
      setIsVerifying(true);
      try {
        if (formData.otp === devOtp) {
          // Create token data
          const tokenData = {
            name: formData.name,
            mobile: formData.mobile,
            gender,
            service,
            status: 'waiting',
            token_number: Math.floor(100 + Math.random() * 900) // Random token number for dev
          };
          
          // Add token to the queue
          const { token, error } = await addToken(tokenData);
          
          if (error) throw error;
          
          // Navigate to success page
          navigate('/success', { 
            state: { 
              tokenNumber: token.token_number,
              name: tokenData.name,
              service: tokenData.service,
              gender: tokenData.gender
            } 
          });
        } else {
          throw new Error('Invalid OTP. Please check and try again.');
        }
      } catch (error) {
        console.error('Error in development OTP verification:', error);
        setSnackbar({
          open: true,
          message: error.message || 'Failed to verify OTP',
          severity: 'error'
        });
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    try {
      setIsVerifying(true);
      setErrorMessage('');
      
      // Verify OTP with Supabase
      const formattedPhone = formatPhoneNumber(formData.mobile);
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: formData.otp,
        type: 'sms'
      });

      if (error) throw error;

      // Get the user session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      // Create the token using the authenticated user's ID
      const { token, error: tokenError } = await addToken({
        gender,
        service,
        name: formData.name,
        mobile: formData.mobile,
        userId: session?.user?.id
      });

      if (tokenError) throw tokenError;
      
      // Navigate to success page with token data
      navigate('/token-success', { 
        state: { 
          token: token,
          gender,
          service,
          name: formData.name
        } 
      });
      
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Invalid OTP. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsVerifying(false);
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
            {otpSent ? 'Verify OTP' : 'Enter Your Details'}
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
          
          {!otpSent ? (
            <>
              <TextField
                label="Your Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
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
                disabled={isLoading}
                inputProps={{ maxLength: 10, pattern: '[0-9]*' }}
                sx={{ mb: 2 }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                onClick={handleSendOTP}
                disabled={!formData.name || !formData.mobile || isLoading}
                endIcon={isLoading ? <CircularProgress size={20} /> : null}
              >
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </>
          ) : (
            <>
              <TextField
                label="Enter OTP"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                fullWidth
                disabled={isVerifying}
                inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
                sx={{ mb: 2 }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                onClick={handleVerifyOTP}
                disabled={!formData.otp || isVerifying}
                endIcon={isVerifying ? <CircularProgress size={20} /> : null}
                fullWidth
                sx={{ mt: 2 }}
              >
                {isVerifying ? 'Verifying...' : 'Verify & Get Token'}
              </Button>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => setOtpSent(false)}
                fullWidth
                sx={{ mt: 2 }}
              >
                Back
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default TokenForm;
