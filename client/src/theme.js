import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 30,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'transform 0.2s',
          '&:active': { transform: 'scale(0.97)' }
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #33126B 0%, #FF0A91 100%)',
          color: '#FAFAFA'
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #FF0A91 0%, #33126B 100%)',
          color: '#FAFAFA'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          padding: '2rem'
        }
      }
    }
  },
  palette: {
    primary: {
      main: '#33126B', // Dark Purple
      contrastText: '#FAFAFA',
    },
    secondary: {
      main: '#FF0A91', // Hot Pink
      contrastText: '#FAFAFA',
    },
    background: {
      default: '#FAFAFA', // Light Gray
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});

export default theme;
