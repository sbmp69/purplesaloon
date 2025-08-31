import React from 'react';
import { AppBar, Toolbar, Typography, Container, Box } from '@mui/material';

const Layout = ({ children }) => (
  <>
    <AppBar position="static" color="primary" enableColorOnDark>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Purple Salon Token System
        </Typography>
      </Toolbar>
    </AppBar>
    <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="md">{children}</Container>
    </Box>
  </>
);

const Footer = () => (
  <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 2, mt: 4, textAlign: 'center' }}>
    <Typography variant="caption">© 2025 Purple Salon. All rights reserved.</Typography>
  </Box>
);

const LayoutWithFooter = ({ children }) => (
  <>
    <Layout>{children}</Layout>
    <Footer />
  </>
);

export default LayoutWithFooter;
