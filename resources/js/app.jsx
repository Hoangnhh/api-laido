import './bootstrap';
import React from 'react';
import ReactDOM from 'react-dom/client';
import Login from './components/auth/Login';
import { createTheme, ThemeProvider } from '@mui/material';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
    },
});

ReactDOM.createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <Login />
        </ThemeProvider>
    </React.StrictMode>
);