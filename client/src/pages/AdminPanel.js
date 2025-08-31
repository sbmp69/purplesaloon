import React, { useContext, useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  Button, 
  Paper, 
  Box, 
  TextField,
  Grid,
  Divider,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { TokenContext } from '../context/TokenContext';
import { useTheme } from '@mui/material/styles';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { supabase } from '../utils/supabase';

const AdminPanel = () => {
  const theme = useTheme();
  const { 
    tokens, 
    serveToken, 
    getCurrentToken, 
    getRecentToken,
    loading
  } = useContext(TokenContext);
  
  const [activeTab, setActiveTab] = useState(0);
  const [currentTokens, setCurrentTokens] = useState({
    male: null,
    female: null
  });
  const [recentTokens, setRecentTokens] = useState({
    male: null,
    female: null
  });

  // Fetch current and recent tokens
  const fetchTokens = async () => {
    try {
      const [maleCurrent, femaleCurrent, maleRecent, femaleRecent] = await Promise.all([
        getCurrentToken('male'),
        getCurrentToken('female'),
        getRecentToken('male'),
        getRecentToken('female')
      ]);

      setCurrentTokens({
        male: maleCurrent,
        female: femaleCurrent
      });

      setRecentTokens({
        male: maleRecent,
        female: femaleRecent
      });
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTokens();
  }, [tokens]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleServeToken = async (tokenId, gender) => {
    try {
      await serveToken(tokenId, gender);
      await fetchTokens(); // Refresh the tokens after serving
    } catch (error) {
      console.error('Error serving token:', error);
    }
  };

  const formatTokenNumber = (token, gender) => {
    if (!token) return 'N/A';
    return `${gender.charAt(0).toUpperCase()}${token.token_number}`;
  };

  const renderTokenTable = (tokenList, gender) => {
    const filteredTokens = tokenList
      .filter(token => token.gender === gender)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Token</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Service</TableCell>
            <TableCell>Mobile</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Time</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredTokens.length > 0 ? (
            filteredTokens.map((token) => (
              <TableRow 
                key={token.id}
                sx={{ 
                  bgcolor: token.status === 'served' ? 'action.hover' : 'inherit',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {gender === 'male' ? (
                      <MaleIcon color="primary" fontSize="small" />
                    ) : (
                      <FemaleIcon color="secondary" fontSize="small" />
                    )}
                    <span>{formatTokenNumber(token, gender)}</span>
                  </Box>
                </TableCell>
                <TableCell>{token.name}</TableCell>
                <TableCell>{token.service}</TableCell>
                <TableCell>{token.mobile}</TableCell>
                <TableCell>
                  <Chip 
                    label={token.status === 'served' ? 'Served' : 'Waiting'} 
                    color={token.status === 'served' ? 'default' : 'primary'}
                    size="small"
                    variant={token.status === 'served' ? 'outlined' : 'filled'}
                  />
                </TableCell>
                <TableCell>
                  {new Date(token.created_at).toLocaleTimeString()}
                </TableCell>
                <TableCell>
                  {token.status !== 'served' ? (
                    <Tooltip title="Mark as Served">
                      <IconButton 
                        onClick={() => handleServeToken(token.id, gender)}
                        color="primary"
                        size="small"
                        disabled={loading}
                      >
                        <CheckCircleOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Already Served">
                      <span>
                        <CheckCircleOutlineIcon color="disabled" />
                      </span>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No {gender} tokens in the queue
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ 
          textAlign: 'center',
          background: 'linear-gradient(45deg, #33126B 30%, #FF0A91 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 4
        }}>
          Admin Control Panel
        </Typography>
        
        {/* Current Tokens Control */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>Current Serving Tokens</Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3, bgcolor: 'rgba(51, 18, 107, 0.05)' }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>♂ Male Counter</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    type="number"
                    size="small"
                    label="Token #"
                    value={currentTokens.male ? currentTokens.male.token_number : ''}
                    onChange={(e) => setCurrentTokens({ ...currentTokens, male: { ...currentTokens.male, token_number: e.target.value } })}
                    sx={{ flex: 1 }}
                  />
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => handleServeToken(currentTokens.male ? currentTokens.male.id : null, 'male')}
                    sx={{ minWidth: 100 }}
                  >
                    Set
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Current: M{currentTokens.male ? currentTokens.male.token_number : '0'}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3, bgcolor: 'rgba(255, 10, 145, 0.05)' }}>
                <Typography variant="subtitle1" color="secondary" gutterBottom>♀ Female Counter</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    type="number"
                    size="small"
                    label="Token #"
                    value={currentTokens.female ? currentTokens.female.token_number : ''}
                    onChange={(e) => setCurrentTokens({ ...currentTokens, female: { ...currentTokens.female, token_number: e.target.value } })}
                    sx={{ flex: 1 }}
                  />
                  <Button 
                    variant="contained" 
                    color="secondary"
                    onClick={() => handleServeToken(currentTokens.female ? currentTokens.female.id : null, 'female')}
                    sx={{ minWidth: 100 }}
                  >
                    Set
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Current: F{currentTokens.female ? currentTokens.female.token_number : '0'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
        
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Token Queues</Typography>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              sx={{ minHeight: 40 }}
            >
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MaleIcon color={activeTab === 0 ? 'primary' : 'action'} />
                    <span>Male ({tokens.filter(t => t.gender === 'male' && t.status === 'waiting').length})</span>
                  </Box>
                }
                sx={{ minHeight: 40 }}
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FemaleIcon color={activeTab === 1 ? 'secondary' : 'action'} />
                    <span>Female ({tokens.filter(t => t.gender === 'female' && t.status === 'waiting').length})</span>
                  </Box>
                }
                sx={{ minHeight: 40 }}
              />
            </Tabs>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          {/* Current Token Status */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, borderRadius: 2, bgcolor: 'primary.light' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <MaleIcon color="primary" />
                  <Typography variant="subtitle1">Male Counter</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Current</Typography>
                    <Typography variant="h5">
                      {currentTokens.male ? formatTokenNumber(currentTokens.male, 'male') : 'M0'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Last Issued</Typography>
                    <Typography variant="h6">
                      {recentTokens.male ? formatTokenNumber(recentTokens.male, 'male') : 'M0'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, borderRadius: 2, bgcolor: 'secondary.light' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <FemaleIcon color="secondary" />
                  <Typography variant="subtitle1">Female Counter</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Current</Typography>
                    <Typography variant="h5">
                      {currentTokens.female ? formatTokenNumber(currentTokens.female, 'female') : 'F0'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Last Issued</Typography>
                    <Typography variant="h6">
                      {recentTokens.female ? formatTokenNumber(recentTokens.female, 'female') : 'F0'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
          
          <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {activeTab === 0 ? (
              <Box>
                <Box sx={{ p: 2, bgcolor: 'primary.main' }}>
                  <Typography variant="subtitle1" color="white">
                    Male Token Queue ({tokens.filter(t => t.gender === 'male' && t.status === 'waiting').length} waiting)
                  </Typography>
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    renderTokenTable(tokens, 'male')
                  )}
                </Box>
              </Box>
            ) : (
              <Box>
                <Box sx={{ p: 2, bgcolor: 'secondary.main' }}>
                  <Typography variant="subtitle1" color="white">
                    Female Token Queue ({tokens.filter(t => t.gender === 'female' && t.status === 'waiting').length} waiting)
                  </Typography>
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    renderTokenTable(tokens, 'female')
                  )}
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      </Paper>
    </Container>
  );
};

export default AdminPanel;
