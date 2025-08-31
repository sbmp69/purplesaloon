import React, { createContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';

// Create the context
const TokenContext = createContext();

// Create a separate provider component
const TokenProvider = ({ children }) => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch tokens from Supabase
  const fetchTokens = async () => {
    try {
      setLoading(true);
      
      // Fetch both male and female tokens
      const { data: maleData, error: maleError } = await supabase
        .from('male_tokens')
        .select('*')
        .order('created_at', { ascending: true });

      const { data: femaleData, error: femaleError } = await supabase
        .from('female_tokens')
        .select('*')
        .order('created_at', { ascending: true });

      if (maleError || femaleError) {
        throw maleError || femaleError;
      }

      // Combine and format tokens
      const formattedTokens = [
        ...(maleData || []).map(t => ({ ...t, gender: 'male' })),
        ...(femaleData || []).map(t => ({ ...t, gender: 'female' }))
      ];

      setTokens(formattedTokens);
      setError(null);
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    fetchTokens();

    const subscription = supabase
      .channel('tokens_changes')
      .on('postgres_changes', { event: '*', schema: '*' }, (payload) => {
        fetchTokens();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Get the next sequential token number
  const getTokenNumber = async (gender) => {
    try {
      // Get the highest token number from the database
      const { data, error } = await supabase
        .from(`${gender}_tokens`)
        .select('token_number')
        .order('token_number', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows returned
      
      // If no tokens exist yet, start from 1, otherwise increment the highest number
      const nextTokenNumber = data ? data.token_number + 1 : 1;
      console.log(`Next ${gender} token number:`, nextTokenNumber);
      return nextTokenNumber;
    } catch (err) {
      console.error('Error getting token number:', err);
      // Fallback to random number if there's an error
      return Math.floor(Math.random() * 1000) + 1;
    }
  };

  // Add a new token after OTP verification
  const addToken = async (tokenData) => {
    const { gender, service, name, mobile } = tokenData;
    const tableName = `${gender}_tokens`;
    
    try {
      setLoading(true);
      
      // Get the next token number
      const tokenNumber = await getTokenNumber(gender);
      
      // Insert the new token
      const { data, error } = await supabase
        .from(tableName)
        .insert([{ 
          token_number: tokenNumber,
          name, 
          mobile, 
          service, 
          status: 'waiting',
          otp: '123456',
          otp_verified: true
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Return the created token with gender
      return { 
        token: { ...data, gender },
        error: null
      };
    } catch (err) {
      console.error('Error adding token:', err);
      return { 
        token: null, 
        error: err.message || 'Failed to create token' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP - This is now handled by Supabase Auth, keeping for backward compatibility
  const verifyOTP = async (tokenId, userOTP) => {
    try {
      setLoading(true);
      
      // Find the token by ID
      const token = tokens.find(t => t.id === tokenId);
      if (!token) throw new Error('Token not found');
      
      // In a real app, we would verify the OTP with Supabase Auth
      // For now, we'll just mark it as verified
      const tableName = `${token.gender}_tokens`;
      const { data: updatedToken, error } = await supabase
        .from(tableName)
        .update({ otp_verified: true })
        .eq('id', tokenId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update the local state
      setTokens(prev => 
        prev.map(t => 
          t.id === tokenId 
            ? { ...t, otp_verified: true, ...updatedToken } 
            : t
        )
      );
      
      return { ...updatedToken, gender: token.gender };
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get waiting tokens for a specific gender
  const getWaitingTokens = async (gender) => {
    try {
      const { data, error } = await supabase
        .from(`${gender}_tokens`)
        .select('*')
        .eq('status', 'waiting')
        .order('token_number', { ascending: true });
      
      if (error) throw error;
      return data.map(token => ({ ...token, gender }));
    } catch (err) {
      console.error('Error getting waiting tokens:', err);
      throw err;
    }
  };

  // Update token status
  const updateTokenStatus = async (tokenId, gender, status) => {
    try {
      const { data, error } = await supabase
        .from(`${gender}_tokens`)
        .update({ status })
        .eq('id', tokenId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setTokens(prev => 
        prev.map(t => 
          t.id === tokenId ? { ...t, status, ...data } : t
        )
      );
      
      return { ...data, gender };
    } catch (err) {
      console.error('Error updating token status:', err);
      throw err;
    }
  };

  // Serve a specific token
  const serveToken = async (tokenId, gender) => {
    const tableName = `${gender}_tokens`;
    
    try {
      setLoading(true);
      
      // First, update the current serving token to 'served' if exists
      const { data: currentServing } = await supabase
        .from(tableName)
        .select('id')
        .eq('status', 'serving')
        .maybeSingle();
      
      if (currentServing) {
        await updateTokenStatus(currentServing.id, gender, 'served');
      }
      
      // Then update the selected token to 'serving'
      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          status: 'serving',
          served_at: new Date().toISOString()
        })
        .eq('id', tokenId)
        .select()
        .single();

      if (error) throw error;
      
      // Refresh tokens
      await fetchTokens();
      
      return { 
        success: true, 
        token: { ...data, gender } 
      };
    } catch (err) {
      console.error('Error serving token:', err);
      setError(err.message);
      return { 
        success: false, 
        error: err.message 
      };
    } finally {
      setLoading(false);
    }
  };

  // Get the current token being served
  const getCurrentToken = async (gender) => {
    const tableName = `${gender}_tokens`;
    
    try {
      // First try to get the currently serving token
      const { data: servingData, error: servingError } = await supabase
        .from(tableName)
        .select('*')
        .eq('status', 'serving')
        .single();

      if (servingData) {
        return { ...servingData, gender };
      }

      // If no token is currently being served, get the most recently served token
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('status', 'served')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      // PGRST116 means no rows found, which is an expected case
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching current token:', error);
        throw error;
      }
      
      return data ? { ...data, gender } : null;
    } catch (err) {
      console.error('Error getting current token:', err);
      setError(err.message);
      return null;
    }
  };

  // Get most recent token for a gender
  const getRecentToken = async (gender) => {
    const tableName = `${gender}_tokens`;
    
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data ? { ...data, gender } : null;
    } catch (err) {
      console.error('Error getting recent token:', err);
      setError(err.message);
      return null;
    }
  };

  // Serve the next token in the queue
  const serveNextToken = async (gender) => {
    try {
      // Get the next waiting token for the specified gender
      const { data: nextToken, error: tokenError } = await supabase
        .from(`${gender}_tokens`)
        .select('*')
        .eq('status', 'waiting')
        .order('token_number', { ascending: true })
        .limit(1)
        .single();

      if (tokenError && tokenError.code !== 'PGRST116') {
        throw tokenError;
      }

      if (!nextToken) {
        return { success: false, message: 'No tokens in the queue' };
      }

      // Serve the next token
      return await serveToken(nextToken.id, gender);
    } catch (err) {
      console.error('Error serving next token:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      tokens,
      loading,
      error,
      addToken,
      verifyOTP,
      serveToken,
      serveNextToken,
      getCurrentToken,
      getRecentToken,
      fetchTokens,
      setError
    }),
    [
      tokens,
      loading,
      error,
      addToken,
      verifyOTP,
      serveToken,
      serveNextToken,
      getCurrentToken,
      getRecentToken,
      fetchTokens
    ]
  );

  return (
    <TokenContext.Provider value={contextValue}>
      {children}
    </TokenContext.Provider>
  );
};

// Export the context and provider
export { TokenContext, TokenProvider };
