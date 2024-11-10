import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome,
    faUsers,
    faClock,
    faCalendarAlt,
    faGear,
    faTicket,
    faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const Sidebar = ({ collapsed }) => {
    const location = window.location.pathname;
    
    const menuItems = [
        { 
            text: 'Trang chủ', 
            icon: faHome,
            path: '/admin/dashboard'
        },
        { 
            text: 'Quản lý nhân viên', 
            icon: faUsers,
            path: '/admin/staff'
        },
        { 
            text: 'Quản lý Ca', 
            icon: faClock,
            path: '/admin/shifts'
        },
        { 
            text: 'Phân ca', 
            icon: faCalendarAlt,
            path: '/admin/shift-assignments'
        },
        { 
            text: 'Danh sách vé sử dụng', 
            icon: faTicket,
            path: '/admin/tickets'
        },
        { 
            text: 'Quản lý người dùng', 
            icon: faUsers,
            path: '/admin/users'
        },
        { 
            text: 'Cấu hình hệ thống', 
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
                    <FontAwesomeIcon icon={faHome} />
                    {!collapsed && <span className="logo-text">Admin Panel</span>}
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