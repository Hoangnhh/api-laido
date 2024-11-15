import './bootstrap';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './components/admin/Dashboard';
import Login from './components/auth/Login';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import UserManager from './components/admin/UserManager';
import StaffManager from './components/admin/StaffManager';
import GateManager from './components/admin/GateManager';
import StaffGroup from './components/admin/StaffGroup';
import ShiftAssignments from './components/admin/ShiftAssignments';
import Tickets from './components/admin/Tickets';
import Settings from './components/admin/Settings';
import PaymentReport from './components/admin/reports/PaymentReport';
import AddShiftGate from './components/admin/AddShiftGate';
import QueueDisplay from './components/admin/QueueDisplay';
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
            case '/admin/users':
                return <UserManager />;
            case '/admin/staff':
                return <StaffManager />;
            case '/admin/gate':
                return <GateManager />;
            case '/admin/staff-group':
                return <StaffGroup />;
            case '/admin/shift-assignments':
                return <ShiftAssignments />;
            case '/admin/add-shift-gate':
                return <AddShiftGate />;
            case '/admin/tickets':
                return <Tickets />;
            case '/admin/settings':
                return <Settings />;
            case '/admin/payment-report':
                return <PaymentReport />;
            case '/admin/queue-display':
                return <QueueDisplay />;
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
        // <React.StrictMode>
            <App />
        // </React.StrictMode>
    );
}