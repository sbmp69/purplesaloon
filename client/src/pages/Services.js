import React from 'react';
import { Container, Typography, Grid, Button, Paper } from '@mui/material';
import Layout from '../components/Layout';
import { useNavigate, useLocation } from 'react-router-dom';

const servicesByGender = {
  male: ['Haircut', 'Beard Trim', 'Head Massage'],
  female: ['Haircut', 'Facial', 'Manicure']
};

const Services = () => {
  const navigate = useNavigate();
  const {
    state: { gender }
  } = useLocation();

  const handleSelect = (service) => {
    navigate('/form', { state: { gender, service } });
  };

  const list = servicesByGender[gender] || [];

  return (
    <Layout>
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h5" gutterBottom>
        Select a Service ({gender})
      </Typography>
      <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
        {list.map((svc) => (
          <Grid item key={svc} xs={12} sm={6}>
            <Button fullWidth variant="outlined" onClick={() => handleSelect(svc)}>
              {svc}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Container>
    </Layout>
  );
};

export default Services;
