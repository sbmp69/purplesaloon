import React from 'react';
import { Container, Typography, TextField, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // For demo just redirect; no auth
    navigate('/admin/panel');
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Typography variant="h5" gutterBottom textAlign="center">
        Admin Login
      </Typography>
      <Stack spacing={2}>
        <TextField label="Username" fullWidth />
        <TextField label="Password" type="password" fullWidth />
        <Button variant="contained" onClick={handleLogin}>
          Login
        </Button>
      </Stack>
    </Container>
  );
};

export default AdminLogin;
