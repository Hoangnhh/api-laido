import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import '../../../../css/admin.css';

const AdminLayout = ({ children }) => {
    const [collapsed, setCollapsed] = React.useState(false);

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
    };

    return (
        <div className="admin-layout">
            <Header collapsed={collapsed} toggleSidebar={toggleSidebar} />
            <Sidebar collapsed={collapsed} />
            <main className={`admin-main ${collapsed ? 'collapsed' : ''}`}>
                {children}
            </main>
        </div>
    );
};

export default AdminLayout; 