import React, { useContext, useState, useEffect } from 'react';
import { TokenContext } from '../context/TokenContext';
import { 
  Container, 
  Typography, 
  Grid, 
  Button, 
  Paper, 
  Box, 
  Fade, 
  IconButton,
  useMediaQuery,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Layout from '../components/Layout';
import { useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';

const Home = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { getCurrentToken, getRecentToken } = useContext(TokenContext);
  const [animate, setAnimate] = useState(false);
  const [selectedGender, setSelectedGender] = useState(null);
  
  // Get current and recent tokens for both genders
  const currentMaleToken = getCurrentToken('male');
  const currentFemaleToken = getCurrentToken('female');
  const recentMaleToken = getRecentToken('male');
  const recentFemaleToken = getRecentToken('female');

  useEffect(() => {
    setAnimate(true);
    // Check if we're coming back from a service selection
    if (location.state?.fromService) {
      setSelectedGender(location.state.gender);
    }
  }, [location.state]);

  const handleSelect = (gender) => {
    setSelectedGender(gender);
  };
  
  const handleBack = () => {
    setSelectedGender(null);
  };
  
  const handleProceed = () => {
    navigate('/services', { state: { gender: selectedGender } });
  };

  // Render gender selection screen
  const renderGenderSelection = () => (
    <>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ 
          fontWeight: 700,
          background: 'linear-gradient(45deg, #33126B 30%, #FF0A91 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2
        }}>
          Welcome to Purple Salon
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Experience premium grooming services
        </Typography>
      </Box>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Male Section */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            onClick={() => handleSelect('male')}
            sx={{ 
              p: 3, 
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 6,
                borderColor: 'primary.main',
                borderWidth: '2px',
                borderStyle: 'solid'
              },
              bgcolor: 'rgba(33, 150, 243, 0.05)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: 300
            }}
          >
            <MaleIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
              Men's Services
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '80%', mx: 'auto' }}>
              Professional grooming and styling services tailored for men
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              sx={{ mt: 2, px: 4, py: 1.5, borderRadius: 2 }}
            >
              Select
            </Button>
          </Paper>
        </Grid>
        
        {/* Female Section */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            onClick={() => handleSelect('female')}
            sx={{ 
              p: 3, 
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 6,
                borderColor: 'secondary.main',
                borderWidth: '2px',
                borderStyle: 'solid'
              },
              bgcolor: 'rgba(255, 10, 145, 0.05)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: 300
            }}
          >
            <FemaleIcon sx={{ fontSize: 60, color: 'secondary.main', mb: 2 }} />
            <Typography variant="h4" color="secondary" gutterBottom sx={{ fontWeight: 'bold' }}>
              Women's Services
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '80%', mx: 'auto' }}>
              Premium beauty and wellness services designed for women
            </Typography>
            <Button 
              variant="contained" 
              color="secondary" 
              size="large"
              sx={{ mt: 2, px: 4, py: 1.5, borderRadius: 2 }}
            >
              Select
            </Button>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Token Status Overview */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 4, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
          Current Token Status
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(33, 150, 243, 0.1)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <MaleIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Men's Current</Typography>
                  <Typography variant="h5" color="primary">
                    {currentMaleToken > 0 ? `M${currentMaleToken}` : '--'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary" display="block">Last Issued</Typography>
                <Typography variant="subtitle1">
                  {recentMaleToken ? `M${recentMaleToken.tokenNumber}` : '--'}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(255, 10, 145, 0.1)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FemaleIcon color="secondary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Women's Current</Typography>
                  <Typography variant="h5" color="secondary">
                    {currentFemaleToken > 0 ? `F${currentFemaleToken}` : '--'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary" display="block">Last Issued</Typography>
                <Typography variant="subtitle1">
                  {recentFemaleToken ? `F${recentFemaleToken.tokenNumber}` : '--'}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </>
  );

  // Render selected gender view
  const renderSelectedGenderView = () => {
    const isMale = selectedGender === 'male';
    const currentToken = isMale ? currentMaleToken : currentFemaleToken;
    const recentToken = isMale ? recentMaleToken : recentFemaleToken;
    const gradient = isMale 
      ? 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)' 
      : 'linear-gradient(45deg, #FF4081 30%, #F50057 90%)';
    
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton 
            onClick={handleBack} 
            sx={{ 
              position: 'absolute',
              left: 20,
              color: isMale ? 'primary.main' : 'secondary.main'
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: 700,
              background: gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
              mb: 1
            }}>
              {isMale ? 'Men\'s Services' : 'Women\'s Services'}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
              {isMale ? 'Professional grooming services for men' : 'Premium beauty services for women'}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ 
              p: 4, 
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: isMale 
                ? 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)' 
                : 'linear-gradient(135deg, rgba(255, 10, 145, 0.1) 0%, rgba(255, 10, 145, 0.05) 100%)',
              border: `2px solid ${isMale ? 'rgba(33, 150, 243, 0.2)' : 'rgba(255, 10, 145, 0.2)'}`
            }}>
              <Box sx={{ flex: 1, mb: 3 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Currently Serving
                </Typography>
                <Typography variant="h1" sx={{ 
                  fontWeight: 'bold',
                  fontSize: '5rem',
                  lineHeight: 1,
                  mb: 2,
                  background: gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {isMale ? 'M' : 'F'}{currentToken > 0 ? currentToken : '--'}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {currentToken > 0 
                    ? `Token ${currentToken} is being served` 
                    : 'No token is currently being served'}
                </Typography>
              </Box>
              
              <Box sx={{ 
                bgcolor: 'background.paper',
                p: 2,
                borderRadius: 2,
                borderLeft: `4px solid ${isMale ? theme.palette.primary.main : theme.palette.secondary.main}`
              }}>
                <Typography variant="body2" color="text.secondary">
                  {isMale 
                    ? 'Please wait for your token number to be displayed on the screen.'
                    : 'Your comfort and satisfaction are our top priorities.'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ 
              p: 4, 
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%)',
              border: '1px solid rgba(0, 0, 0, 0.05)'
            }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Last Issued Token
                </Typography>
                
                {recentToken ? (
                  <>
                    <Box sx={{ 
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      mb: 3
                    }}>
                      <Typography variant="h2" sx={{ 
                        fontWeight: 'bold',
                        fontSize: '4.5rem',
                        lineHeight: 1,
                        mb: 1,
                        background: gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        {isMale ? 'M' : 'F'}{recentToken.tokenNumber}
                      </Typography>
                      <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                        {recentToken.service}
                      </Typography>
                      {recentToken.name && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          For: {recentToken.name}
                        </Typography>
                      )}
                    </Box>
                    
                    <Box sx={{ 
                      bgcolor: isMale ? 'rgba(33, 150, 243, 0.05)' : 'rgba(255, 10, 145, 0.05)',
                      p: 2,
                      borderRadius: 2,
                      borderLeft: `4px solid ${isMale ? theme.palette.primary.main : theme.palette.secondary.main}`
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        {isMale
                          ? 'Your token has been added to the queue. Please wait for your turn.'
                          : 'Our team will be with you shortly. Thank you for your patience.'}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                    No recent tokens issued yet.
                  </Typography>
                )}
              </Box>
              
              <Box sx={{ mt: 'auto', pt: 3 }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleProceed}
                  sx={{
                    py: 2,
                    borderRadius: 2,
                    background: gradient,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3
                    },
                    transition: 'all 0.3s ease-in-out'
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Get {isMale ? 'Men\'s' : 'Women\'s'} Token
                  </Typography>
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Global Token Status */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
            Global Token Status
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: 'rgba(33, 150, 243, 0.1)',
              px: 2,
              py: 1,
              borderRadius: 2,
              minWidth: 120
            }}>
              <MaleIcon color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="caption" display="block" color="text.secondary">Current</Typography>
                <Typography variant="h6" color="primary">
                  {currentMaleToken > 0 ? `M${currentMaleToken}` : '--'}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: 'rgba(33, 150, 243, 0.05)',
              px: 2,
              py: 1,
              borderRadius: 2,
              minWidth: 120
            }}>
              <MaleIcon color="primary" sx={{ mr: 1, opacity: 0.7 }} />
              <Box>
                <Typography variant="caption" display="block" color="text.secondary">Last</Typography>
                <Typography variant="h6" color="text.primary">
                  {recentMaleToken ? `M${recentMaleToken.tokenNumber}` : '--'}
                </Typography>
              </Box>
            </Box>
            
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: 'rgba(255, 10, 145, 0.1)',
              px: 2,
              py: 1,
              borderRadius: 2,
              minWidth: 120
            }}>
              <FemaleIcon color="secondary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="caption" display="block" color="text.secondary">Current</Typography>
                <Typography variant="h6" color="secondary">
                  {currentFemaleToken > 0 ? `F${currentFemaleToken}` : '--'}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: 'rgba(255, 10, 145, 0.05)',
              px: 2,
              py: 1,
              borderRadius: 2,
              minWidth: 120
            }}>
              <FemaleIcon color="secondary" sx={{ mr: 1, opacity: 0.7 }} />
              <Box>
                <Typography variant="caption" display="block" color="text.secondary">Last</Typography>
                <Typography variant="h6" color="text.primary">
                  {recentFemaleToken ? `F${recentFemaleToken.tokenNumber}` : '--'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  };

  // Main render
  return (
    <Layout>
      <Fade in={animate} timeout={800}>
        <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4 }}>
          <Paper elevation={3} sx={{ 
            p: { xs: 2, md: 4 }, 
            mb: 4, 
            background: 'linear-gradient(145deg, #f8f8f8 0%, #ffffff 100%)',
            borderRadius: 4
          }}>
            {selectedGender ? renderSelectedGenderView() : renderGenderSelection()}
          </Paper>
        </Container>
      </Fade>
    </Layout>
  );
};

export default Home;
