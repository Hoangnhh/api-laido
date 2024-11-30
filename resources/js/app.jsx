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
import Settings from './components/admin/Settings';
import PaymentReport from './components/admin/reports/PaymentReport';
import WaitingListForCheckinReport from './components/admin/reports/WaitingListForCheckinReport';
import CheckinListReport from './components/admin/reports/CheckinListReport';
import CheckoutListReport from './components/admin/reports/CheckoutListReport';
import UsedTicketsListReport from './components/admin/reports/UsedTicketsListReport';
import AddShiftGate from './components/admin/AddShiftGate';
import QueueDisplay from './components/admin/QueueDisplay';
import CheckoutScreen from './components/admin/CheckoutScreen';
import AddExtraShift from './components/admin/AddExtraShift';
import AccountsPayable from './components/admin/AccountsPayable';
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
            case '/admin/add-extra-shift':
                return <AddExtraShift />;
            case '/admin/settings':
                return <Settings />;
            case '/admin/payment-report':
                return <PaymentReport />;
            case '/admin/queue-display':
                return <QueueDisplay />;
            case '/admin/checkout-screen':
                return <CheckoutScreen />;
            case '/admin/waiting-list-for-checkin-report':
                return <WaitingListForCheckinReport />;
            case '/admin/checkin-list-report':
                return <CheckinListReport />;
            case '/admin/checkout-list-report':
                return <CheckoutListReport />;
            case '/admin/used-tickets-list-report':
                return <UsedTicketsListReport />;
            case '/admin/accounts-payable':
                return <AccountsPayable />;
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