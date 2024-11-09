import './bootstrap';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './components/admin/Dashboard';
import Login from './components/auth/Login';
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

const App = () => {
    const currentPath = window.location.pathname;
    
    // Render component dựa vào path
    const renderComponent = () => {
        switch (currentPath) {
            case '/admin':
                return <Login />;
            case '/admin/dashboard':
                return <Dashboard />;
            default:
                return <Dashboard />;  // hoặc có thể return null hoặc component 404
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <BrowserRouter>
                {renderComponent()}
            </BrowserRouter>
        </ThemeProvider>
    );
};

if (document.getElementById('app')) {
    ReactDOM.createRoot(document.getElementById('app')).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}