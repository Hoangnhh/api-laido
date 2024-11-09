import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faGauge,
    faUsers,
    faChartLine,
    faGear,
    faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const Sidebar = ({ collapsed }) => {
    const location = window.location.pathname;
    
    const menuItems = [
        { 
            text: 'Dashboard', 
            icon: faGauge,
            path: '/admin/dashboard'
        },
        { 
            text: 'Users', 
            icon: faUsers,
            path: '/admin/users'
        },
        { 
            text: 'Reports', 
            icon: faChartLine,
            path: '/admin/reports'
        },
        { 
            text: 'Settings', 
            icon: faGear,
            path: '/admin/settings'
        },
    ];

    const handleLogout = async (e) => {
        e.preventDefault();
        
        try {
            const response = await axios.post('/admin/logout', {}, {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'Accept': 'application/json'
                }
            });

            if (response.data.status === 'success') {
                localStorage.clear();
                window.location.replace(response.data.redirect);
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Có lỗi xảy ra khi đăng xuất');
        }
    };

    return (
        <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <FontAwesomeIcon icon={faGauge} />
                </div>
            </div>
            <nav className="sidebar-menu">
                {menuItems.map((item) => (
                    <a
                        key={item.text}
                        href={item.path}
                        className={`menu-item ${location === item.path ? 'active' : ''}`}
                    >
                        <span className="menu-icon">
                            <FontAwesomeIcon icon={item.icon} />
                        </span>
                        <span className="menu-text">{item.text}</span>
                    </a>
                ))}
                <div className="menu-divider"></div>
                <a 
                    href="#" 
                    className="menu-item" 
                    onClick={handleLogout}
                >
                    <span className="menu-icon">
                        <FontAwesomeIcon icon={faRightFromBracket} />
                    </span>
                    <span className="menu-text">Logout</span>
                </a>
            </nav>
        </aside>
    );
};

export default Sidebar; 