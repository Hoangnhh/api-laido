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
import StaffPayment from './components/admin/StaffPayment';
import Review from './components/admin/Review';
import RevenueDetailReport from './components/admin/reports/RevenueDetailReport';
import TicketPrintHistoryReport from './components/admin/reports/TicketPrintHistoryReport';
import RevenueReport from './components/admin/reports/RevenueReport';
import TicketByHoursReport from './components/admin/reports/TicketByHoursReport';
import StaffCheckin from './components/admin/StaffCheckin';
import TicketByNameReport from './components/admin/reports/TicketByNameReport';
import TicketStatusReport from './components/admin/reports/TicketStatusReport';
import PaymentAll from './components/admin/PaymentAll';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
            light: '#42a5f5',
            contrastText: '#fff',
        },
    },
});

// Thêm axios interceptor global
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.data?.redirect) {
            window.location.href = error.response.data.redirect;
            return Promise.reject(error);
        }
        return Promise.reject(error);
    }
);

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
                return <StaffPayment />;
            case '/admin/reviews':
                return <Review />;
            case '/admin/revenue-detail-report':
                return <RevenueDetailReport />;
            case '/admin/ticket-print-history-report':
                return <TicketPrintHistoryReport />;
            case '/admin/revenue-report':
                return <RevenueReport />;
            case '/admin/ticket-by-hours-report':
                return <TicketByHoursReport />;
            case '/admin/staff-checkin':
                return <StaffCheckin />;
            case '/admin/ticket-by-name-report':
                return <TicketByNameReport />;
            case '/admin/ticket-status-report':
                return <TicketStatusReport />;
            case '/admin/payment-all':
                return <PaymentAll />;
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
