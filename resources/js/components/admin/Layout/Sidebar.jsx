import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome,
    faUsers,
    faCalendarAlt,
    faGear,
    faTicket,
    faRightFromBracket,
    faDesktop,
    faUser,
    faUserCircle,
    faChartLine,
    faFileInvoiceDollar,
    faChevronDown,
    faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import '../../../../css/Sidebar.css';

const Sidebar = ({ collapsed }) => {
    const location = window.location.pathname;
    
    const menuItems = [
        { 
            text: 'Trang chủ', 
            icon: faHome,
            path: '/admin/dashboard'
        },
        { 
            text: 'Phân ca', 
            icon: faCalendarAlt,
            path: '/admin/shift-assignments'
        },
        {
            text: 'Báo cáo',
            icon: faChartLine,
            path: '#',
            children: [
                {
                    text: 'Báo cáo thanh toán',
                    icon: faFileInvoiceDollar,
                    path: '/admin/payment-report'
                },
                {
                    text: 'Danh sách sử dụng vé',
                    icon: faTicket,
                    path: '/admin/reports/tickets-usage'
                },
                { 
                    text: 'Danh sách vé sử dụng', 
                    icon: faTicket,
                    path: '/admin/tickets'
                }
            ]
        },
        { 
            text: 'Quản lý nhân viên', 
            icon: faUser,
            path: '/admin/staff'
        },
        { 
            text: 'Quản lý nhóm nhân viên', 
            icon: faUsers,
            path: '/admin/staff-group'
        },
        { 
            text: 'Quản lý vị trí', 
            icon: faDesktop,
            path: '/admin/gate'
        },
        { 
            text: 'Quản lý người dùng', 
            icon: faUserCircle,
            path: '/admin/users'
        },
        { 
            text: 'Cấu hình hệ thống', 
            icon: faGear,
            path: '/admin/settings'
        },
        
    ];
    
    // Tìm menu cha dựa vào location hiện tại
    const findParentMenu = () => {
        for (const item of menuItems) {
            if (item.children) {
                const matchingChild = item.children.find(child => child.path === location);
                if (matchingChild) {
                    return item.text;
                }
            }
        }
        return null;
    };

    // Khởi tạo state với menu cha được tìm thấy
    const [openSubmenu, setOpenSubmenu] = useState(findParentMenu());
    
    // Thêm useEffect để cập nhật openSubmenu khi location thay đổi
    useEffect(() => {
        const parentMenu = findParentMenu();
        if (parentMenu) {
            setOpenSubmenu(parentMenu);
        }
    }, [location]);

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

    const handleParentClick = (text) => {
        setOpenSubmenu(openSubmenu === text ? null : text);
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
                    item.children ? (
                        <div key={item.text} className="menu-item-group">
                            <div 
                                className={`menu-item parent ${openSubmenu === item.text ? 'active' : ''}`}
                                onClick={() => handleParentClick(item.text)}
                            >
                                <div className="menu-content">
                                    <span className="menu-icon">
                                        <FontAwesomeIcon icon={item.icon} />
                                    </span>
                                    <span className="menu-text">{item.text}</span>
                                </div>
                                <span className="arrow-icon">
                                    <FontAwesomeIcon 
                                        icon={openSubmenu === item.text ? faChevronDown : faChevronRight} 
                                    />
                                </span>
                            </div>
                            <div className={`submenu ${openSubmenu === item.text ? 'open' : ''}`}>
                                {item.children.map((child) => (
                                    <a
                                        key={child.text}
                                        href={child.path}
                                        className={`menu-item ${location === child.path ? 'active' : ''}`}
                                    >
                                        <span className="menu-icon">
                                            <FontAwesomeIcon icon={child.icon} />
                                        </span>
                                        <span className="menu-text">{child.text}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    ) : (
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
                    )
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