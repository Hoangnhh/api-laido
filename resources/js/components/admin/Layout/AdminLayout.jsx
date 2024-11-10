import React from 'react';
import Sidebar from './Sidebar';
import '../../../../css/admin.css';

const AdminLayout = ({ children }) => {
    const [collapsed, setCollapsed] = React.useState(false);

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
    };

    return (
        <div className="admin-layout">
            <Sidebar collapsed={collapsed} toggleSidebar={toggleSidebar} />
            <main className={`admin-main ${collapsed ? 'collapsed' : ''}`}>
                {children}
            </main>
        </div>
    );
};

export default AdminLayout; 