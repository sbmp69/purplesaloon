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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel
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
    getWaitingTokens,
    loading
  } = useContext(TokenContext);
  
  const [setTokenModal, setSetTokenModal] = useState({
    open: false,
    gender: 'male',
    tokenId: '',
    availableTokens: []
  });
  
  const [waitingTokens, setWaitingTokens] = useState({
    male: [],
    female: []
  });
  
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

  // Fetch waiting tokens
  const fetchWaitingTokens = async () => {
    try {
      const [maleResult, femaleResult] = await Promise.allSettled([
        getWaitingTokens('male').catch(err => {
          console.error('Error fetching male tokens:', err);
          return [];
        }),
        getWaitingTokens('female').catch(err => {
          console.error('Error fetching female tokens:', err);
          return [];
        })
      ]);
      
      setWaitingTokens({
        male: maleResult.status === 'fulfilled' ? maleResult.value : [],
        female: femaleResult.status === 'fulfilled' ? femaleResult.value : []
      });
    } catch (error) {
      console.error('Error in fetchWaitingTokens:', error);
      setWaitingTokens({
        male: [],
        female: []
      });
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTokens();
    fetchWaitingTokens();
  }, [tokens]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleServeToken = async (tokenId, gender) => {
    try {
      const { success } = await serveToken(tokenId, gender);
      if (success) {
        // Refresh both current and waiting tokens
        await Promise.all([fetchTokens(), fetchWaitingTokens()]);
      }
    } catch (error) {
      console.error('Error serving token:', error);
    }
  };

  const openSetTokenModal = (gender) => {
    const availableTokens = tokens
      .filter(t => t.gender === gender && t.status === 'waiting')
      .sort((a, b) => a.token_number - b.token_number);
      
    setSetTokenModal({
      open: true,
      gender,
      tokenId: availableTokens[0]?.id || '',
      availableTokens
    });
  };

  const handleSetToken = async () => {
    if (!setTokenModal.tokenId) return;
    
    try {
      const { success } = await serveToken(setTokenModal.tokenId, setTokenModal.gender);
      if (success) {
        await Promise.all([fetchTokens(), fetchWaitingTokens()]);
        setSetTokenModal(prev => ({ ...prev, open: false }));
      }
    } catch (error) {
      console.error('Error setting token:', error);
    }
  };

  const formatTokenNumber = (token, gender) => {
    if (!token) return 'N/A';
    return `${gender.charAt(0).toUpperCase()}${token.token_number}`;
  };

  const renderTokenTable = (tokenList, gender) => {
    const filteredTokens = tokenList
      .filter(token => token.gender === gender && token.status === 'waiting')
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

  // Get currently serving token
  const currentServing = (gender) => {
    return tokens.find(t => t.gender === gender && t.status === 'serving');
  };

  // Get the next token in queue
  const getNextInQueue = (gender) => {
    return tokens
      .filter(t => t.gender === gender && t.status === 'waiting')
      .sort((a, b) => a.token_number - b.token_number)[0];
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>
      
      {/* Current Serving Section */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
        <Paper sx={{ p: 3, flex: 1, borderRadius: 2, minHeight: '300px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <MaleIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
              <Typography variant="h5">Male Counter</Typography>
            </Box>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => openSetTokenModal('male')}
              startIcon={<CheckCircleOutlineIcon />}
            >
              Set Token
            </Button>
          </Box>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ 
              bgcolor: 'primary.light', 
              p: 3, 
              borderRadius: 2,
              mb: 3,
              border: '1px solid',
              borderColor: 'primary.main',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Typography variant="overline" color="primary.dark" sx={{ display: 'block', mb: 1 }}>
                Now Serving
              </Typography>
              {currentServing('male') ? (
                <>
                  <Typography variant="h1" color="primary" sx={{ fontWeight: 'bold', mb: 1, fontSize: '4rem' }}>
                    M{currentServing('male').token_number}
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {currentServing('male').name}
                  </Typography>
                  <Chip 
                    label={currentServing('male').service}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="caption" display="block" color="text.secondary">
                    Serving since {new Date(currentServing('male').served_at).toLocaleTimeString()}
                  </Typography>
                </>
              ) : (
                <Typography variant="h6" color="text.secondary" sx={{ py: 3 }}>
                  No token being served
                </Typography>
              )}
            </Box>
            
            
            <Typography variant="caption" color="text.secondary">
              {waitingTokens.male.length} tokens waiting
            </Typography>
          </Box>
          
          {waitingTokens.male.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>Next in Queue:</Typography>
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  px: 2,
                  bgcolor: 'rgba(25, 118, 210, 0.08)',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <Box>
                  <Typography variant="subtitle2">M{waitingTokens.male[0].token_number}</Typography>
                  <Typography variant="body2" color="text.secondary">{waitingTokens.male[0].name}</Typography>
                </Box>
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={() => handleServeToken(waitingTokens.male[0].id, 'male')}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Serve Next'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
        
        <Paper sx={{ p: 3, flex: 1, borderRadius: 2, minHeight: '300px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FemaleIcon color="secondary" sx={{ mr: 1, fontSize: 32 }} />
              <Typography variant="h5">Female Counter</Typography>
            </Box>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => openSetTokenModal('female')}
              startIcon={<CheckCircleOutlineIcon />}
              color="secondary"
            >
              Set Token
            </Button>
          </Box>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ 
              bgcolor: 'secondary.light', 
              p: 3, 
              borderRadius: 2,
              mb: 3,
              border: '1px solid',
              borderColor: 'secondary.main',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Typography variant="overline" color="secondary.dark" sx={{ display: 'block', mb: 1 }}>
                Now Serving
              </Typography>
              {currentServing('female') ? (
                <>
                  <Typography variant="h1" color="secondary" sx={{ fontWeight: 'bold', mb: 1, fontSize: '4rem' }}>
                    F{currentServing('female').token_number}
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {currentServing('female').name}
                  </Typography>
                  <Chip 
                    label={currentServing('female').service}
                    color="secondary"
                    variant="outlined"
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="caption" display="block" color="text.secondary">
                    Serving since {new Date(currentServing('female').served_at).toLocaleTimeString()}
                  </Typography>
                </>
              ) : (
                <Typography variant="h6" color="text.secondary" sx={{ py: 3 }}>
                  No token being served
                </Typography>
              )}
            </Box>
            
            
            <Typography variant="caption" color="text.secondary">
              {waitingTokens.female.length} tokens waiting
            </Typography>
          </Box>
          
          {waitingTokens.female.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>Next in Queue:</Typography>
              {waitingTokens.female.slice(0, 3).map((token, index) => (
                <Box 
                  key={token.id} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1,
                    px: 2,
                    bgcolor: index === 0 ? 'rgba(236, 64, 122, 0.08)' : 'transparent',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2">F{token.token_number}</Typography>
                    <Typography variant="body2" color="text.secondary">{token.name}</Typography>
                  </Box>
                  {index === 0 && (
                    <Button 
                      variant="contained" 
                      color="secondary"
                      size="small"
                      onClick={() => handleServeToken(token.id, 'female')}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Serve Next'}
                    </Button>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
      
      {/* Token Queues */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Tabs 
          value={activeTab}
          onChange={handleTabChange}
          sx={{ mb: 2 }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MaleIcon color={activeTab === 0 ? 'primary' : 'action'} />
                <span>Male ({waitingTokens.male.length})</span>
              </Box>
            }
            sx={{ minHeight: 48 }}
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FemaleIcon color={activeTab === 1 ? 'secondary' : 'action'} />
                <span>Female ({waitingTokens.female.length})</span>
              </Box>
            }
            sx={{ minHeight: 48 }}
          />
        </Tabs>
        
        <Divider sx={{ mb: 3 }} />
        
        {activeTab === 0 ? (
          <Box>
            <Typography variant="h6" gutterBottom>Male Token Queue</Typography>
            {renderTokenTable(tokens, 'male')}
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>Female Token Queue</Typography>
            {renderTokenTable(tokens, 'female')}
          </Box>
        )}
      </Paper>
      
      {/* Set Token Modal */}
      <Dialog 
        open={setTokenModal.open} 
        onClose={() => setSetTokenModal(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Set {setTokenModal.gender === 'male' ? 'Male' : 'Female'} Token
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Token</InputLabel>
            <Select
              value={setTokenModal.tokenId}
              onChange={(e) => setSetTokenModal(prev => ({ ...prev, tokenId: e.target.value }))}
              label="Select Token"
            >
              {setTokenModal.availableTokens.map(token => (
                <MenuItem key={token.id} value={token.id}>
                  {token.token_number} - {token.name} ({token.service})
                </MenuItem>
              ))}
              {setTokenModal.availableTokens.length === 0 && (
                <MenuItem disabled>No tokens available</MenuItem>
              )}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setSetTokenModal(prev => ({ ...prev, open: false }))}
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSetToken}
            variant="contained"
            color="primary"
            disabled={!setTokenModal.tokenId || loading}
          >
            {loading ? 'Processing...' : 'Set as Serving'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanel;
