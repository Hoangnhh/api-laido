import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../../../../css/admin.css';

const AdminLayout = ({ children }) => {
    const [isCollapsed, setIsCollapsed] = useState(
        JSON.parse(localStorage.getItem('sidebarCollapsed') || 'false')
    );

    useEffect(() => {
        // Định nghĩa các handler functions
        const handleStorageChange = () => {
            const newCollapsed = JSON.parse(localStorage.getItem('sidebarCollapsed') || 'false');
            setIsCollapsed(newCollapsed);
        };

        const handleSidebarToggle = (e) => {
            setIsCollapsed(e.detail.collapsed);
        };

        // Thêm event listeners
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('sidebarToggle', handleSidebarToggle);

        // Cleanup function
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('sidebarToggle', handleSidebarToggle);
        };
    }, []);

    return (
        <div className="sb-admin-layout">
            <Sidebar />
            <main className={`sb-admin-main ${isCollapsed ? 'sb-expanded' : ''}`}>
                {children}
            </main>
        </div>
    );
};

export default AdminLayout; 