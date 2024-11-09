import React from 'react';

const Header = ({ collapsed, toggleSidebar }) => {
    return (
        <header className={`admin-header ${collapsed ? 'collapsed' : ''}`}>
            <div className="header-content">
                <button className="toggle-menu" onClick={toggleSidebar}>
                    {collapsed ? '☰' : '✕'}
                </button>
                <h1 className="header-title">Admin Dashboard</h1>
            </div>
        </header>
    );
};

export default Header; 