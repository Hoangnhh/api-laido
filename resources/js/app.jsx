import './bootstrap';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './components/admin/Dashboard';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
            light: '#42a5f5',
            contrastText: '#fff',
        },
    },
});

if (document.getElementById('app')) {
    ReactDOM.createRoot(document.getElementById('app')).render(
        <React.StrictMode>
            <ThemeProvider theme={theme}>
                <BrowserRouter>
                    <Dashboard />
                </BrowserRouter>
            </ThemeProvider>
        </React.StrictMode>
    );
}