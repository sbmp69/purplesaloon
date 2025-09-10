require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const app = express();

// Simple in-memory OTP store (mobile -> { code, expiresAt })
const otpStore = new Map();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Salon Token System API' });
});

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Token table operations
const getNextTokenNumber = async (service, gender) => {
  try {
    // Get the highest token number for the service and gender
    const { data: lastToken, error } = await supabase
      .from('tokens')
      .select('token_number')
      .eq('service', service)
      .eq('gender', gender)
      .order('token_number', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error getting last token:', error);
      return 1; // Default to 1 if there's an error
    }

    return lastToken ? lastToken.token_number + 1 : 1;
  } catch (error) {
    console.error('Error in getNextTokenNumber:', error);
    return 1;
  }
};

// Issue token endpoint
app.post('/api/token', async (req, res) => {
  try {
    const { gender, service, name, mobile } = req.body;
    
    // Basic validation
    if (!gender || !service || !name || !mobile) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get next token number
    const token_number = await getNextTokenNumber(service, gender);
    
    // Create a new token in Supabase
    const { data: token, error } = await supabase
      .from('tokens')
      .insert([
        {
          token_number,
          status: 'waiting',
          name,
          mobile,
          gender,
          service,
          otp_verified: false,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    
    // Emit to all connected clients
    io.emit('token_issued', token);
    
    res.status(201).json(token);
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({ error: 'Failed to create token', details: error.message });
  }
});

// Get token queue
app.get('/api/tokens', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('token_number, name, mobile, gender, service, status')
      .eq('status', 'waiting')
      .order('token_number', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve next token (admin) - disabled (Token model not configured)
// app.post('/api/token/serve', async (req, res) => {
//   return res.status(501).json({ error: 'Not implemented' });
// });

// OTP send
app.post('/api/otp/send', (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ error: 'Mobile required' });
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(mobile, { code, expiresAt });
  console.log(`OTP for ${mobile}: ${code}`); // In production, integrate SMS service
  res.json({ success: true, message: 'OTP sent', code }); // Expose code for MVP/testing
});

// OTP Verification Endpoint (uses in-memory store set in /api/otp/send)
app.post('/api/verify-otp', async (req, res) => {
  try {
    const phone = req.body.phone || req.body.mobile; // accept either key
    const { otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'Phone number and OTP are required' });
    }

    const record = otpStore.get(phone);
    if (!record) {
      return res.status(400).json({ success: false, error: 'No OTP requested or it has expired' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ success: false, error: 'OTP expired' });
    }

    if (record.code !== String(otp)) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    // One-time use
    otpStore.delete(phone);
    return res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('OTP Verification Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during OTP verification', details: error.message });
  }
});

// Admin create token - disabled (Token model not configured)
// app.post('/api/admin/token', async (req, res) => {
//   return res.status(501).json({ error: 'Not implemented' });
// });

// Socket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
