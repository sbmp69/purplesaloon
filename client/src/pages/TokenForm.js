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
import axios from 'axios';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

/*
 Test instructions (OTP flow)
 -----------------------------------
 1) Enter your Name and a valid 10‑digit Indian mobile number.
 2) Click "Send OTP" to receive the SMS code.
 3) Enter the 6‑digit OTP and click "Verify & Get Token".
 4) On success, a token row is created in Supabase and you navigate to the success page.

 Prerequisites
 - client/.env has Firebase values set (REACT_APP_FIREBASE_*) and REACT_APP_USE_DEV_OTP=false.
 - Firebase Console → Authentication → Sign-in method → Phone is enabled.
 - Firebase Console → Authentication → Settings → Authorized domains include localhost (and your prod domain).
*/

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
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [currentServingToken, setCurrentServingToken] = useState(null);
  const [useServerOtp, setUseServerOtp] = useState(false);
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
    
    // Bypass OTP only if explicitly enabled
    if (process.env.REACT_APP_USE_DEV_OTP === 'true') {
      setOtpSent(true);
      setSnackbar({
        open: true,
        message: 'Development mode: OTP bypassed',
        severity: 'info'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Format and validate phone number
      const formattedPhone = formatPhoneNumber(formData.mobile);
      
      // Basic validation for Indian numbers
      if (!formattedPhone.startsWith('+91') || formattedPhone.length !== 13) {
        throw new Error('Please enter a valid 10-digit Indian mobile number');
      }
      
      // Initialize Firebase Auth
      const firebaseConfig = {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID
      };
      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const auth = getAuth(app);

      // Setup invisible reCAPTCHA once (use element instead of ID; ensure it's in DOM)
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (!recaptchaContainer) {
        throw new Error('reCAPTCHA container missing from DOM');
      }
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainer, { size: 'invisible' });
        try { await window.recaptchaVerifier.render(); } catch {}
      }
      const appVerifier = window.recaptchaVerifier;

      // Send OTP via Firebase
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      
      setOtpSent(true);
      setSnackbar({ 
        open: true, 
        message: 'OTP sent successfully to your mobile!',
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Error in handleSendOTP:', error);
      // Reset state and reCAPTCHA on error so the next attempt starts cleanly
      try {
        window.recaptchaVerifier?.clear();
      } catch {}
      window.recaptchaVerifier = undefined;
      setConfirmationResult(null);
      setOtpSent(false);

      // Friendlier, more actionable messages
      const isEnterprise401 = typeof error?.message === 'string' && error.message.includes('recaptcha') && error.message.includes('401');
      const friendly =
        (error?.code === 'auth/billing-not-enabled' || isEnterprise401)
          ? 'Firebase blocked OTP due to reCAPTCHA Enterprise. Attempting fallback via server SMS...'
          : (error?.code === 'auth/too-many-requests')
          ? 'Too many attempts. Please wait a few minutes or try a different number/device, or add a Firebase test number for development.'
          : (error?.message || 'Failed to send OTP. Please try again.');
      setSnackbar({ open: true, message: friendly, severity: 'error' });

      // Server OTP fallback for Enterprise/billing issues
      if (error?.code === 'auth/billing-not-enabled' || isEnterprise401) {
        try {
          const formattedPhone = formatPhoneNumber(formData.mobile);
          const resp = await axios.post('/api/otp/send', { mobile: formattedPhone });
          if (resp?.data?.success) {
            setUseServerOtp(true);
            setOtpSent(true);
            setSnackbar({ open: true, message: 'OTP sent via SMS (server fallback). Please check your phone.', severity: 'success' });
          } else {
            setSnackbar({ open: true, message: 'Fallback SMS failed. Please try again later.', severity: 'error' });
          }
        } catch (fallbackErr) {
          console.error('Server fallback OTP failed:', fallbackErr);
          setSnackbar({ open: true, message: fallbackErr?.response?.data?.error || 'Fallback SMS failed. Please try again later.', severity: 'error' });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    // Bypass OTP verification only if explicitly enabled
    if (process.env.REACT_APP_USE_DEV_OTP === 'true') {
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
    try {
      setIsVerifying(true);
      setErrorMessage('');
      
      if (useServerOtp) {
        // Verify against server
        const formattedPhone = formatPhoneNumber(formData.mobile);
        const resp = await axios.post('/api/verify-otp', { phone: formattedPhone, otp: formData.otp });
        if (!resp?.data?.success) {
          throw new Error(resp?.data?.error || 'Invalid or expired OTP');
        }
      } else {
        // Verify OTP via Firebase
        if (!confirmationResult) {
          throw new Error('OTP session expired. Please resend OTP.');
        }
        await confirmationResult.confirm(formData.otp);
      }

      // Create the token after successful OTP verification
      const { token, error: tokenError } = await addToken({
        gender,
        service,
        name: formData.name,
        mobile: formData.mobile
      });

      if (tokenError) throw tokenError;
      
      // Navigate to success page (existing success route)
      navigate('/success', { 
        state: { 
          tokenNumber: token.token_number,
          name: formData.name,
          service: service,
          gender: gender
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
          
          {/* Persistent reCAPTCHA container to prevent DOM removal issues */}
          <div id="recaptcha-container" style={{ minHeight: 1 }} />

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
