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

  // Get the next token number using the database function
  const getTokenNumber = async (gender) => {
    try {
      const { data, error } = await supabase
        .rpc('increment_token', { gender_type: gender });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error getting token number:', err);
      throw err;
    }
  };

  // Add a new token after OTP verification
  const addToken = async (tokenData) => {
    const { gender, service, name, mobile, userId } = tokenData;
    const tableName = `${gender}_tokens`;
    
    try {
      setLoading(true);
      
      // Get the next token number from the sequence
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
          user_id: userId
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

  // Serve the next token in the queue
  const serveNextToken = async (gender) => {
    const tableName = `${gender}_tokens`;
    
    try {
      setLoading(true);
      
      // Start a transaction to ensure data consistency
      const { data: nextToken, error: nextError } = await supabase.rpc('serve_next_token', {
        p_gender: gender
      });
      
      if (nextError) throw nextError;
      
      // Refresh the tokens list
      await fetchTokens();
      
      return { 
        success: true, 
        token: nextToken ? { ...nextToken, gender } : null 
      };
      
    } catch (err) {
      console.error('Error serving next token:', err);
      setError(err.message);
      return { 
        success: false, 
        error: err.message 
      };
    } finally {
      setLoading(false);
    }
  };

  // Mark a token as served (for manual serving)
  const serveToken = async (tokenId, gender) => {
    const tableName = `${gender}_tokens`;
    
    try {
      setLoading(true);
      
      // Update the token status
      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          status: 'served',
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
