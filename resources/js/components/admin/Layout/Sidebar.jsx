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
    faBars,
    faAngleLeft,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import '../../../../css/Sidebar.css';
import logoImage from '../../../assets/logo.png';

const Sidebar = () => {
    const location = window.location.pathname;
    const [collapsed, setCollapsed] = useState(false);
    const [user, setUser] = useState(null);
    
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
            text: 'Quản lý nhân viên',
            icon: faUsers,
            path: '#',
            children: [
                { 
                    text: 'Quản lý nhóm nhân viên', 
                    icon: faUsers,
                    path: '/admin/staff-group'
                },
                { 
                    text: 'Quản lý nhân viên', 
                    icon: faUser,
                    path: '/admin/staff'
                },
            ]
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
                    text: 'Danh sách vé sử dụng', 
                    icon: faTicket,
                    path: '/admin/tickets'
                }
            ]
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

    // Thêm useEffect để lưu trạng thái collapsed vào localStorage
    useEffect(() => {
        const savedCollapsed = localStorage.getItem('sidebarCollapsed');
        if (savedCollapsed) {
            setCollapsed(JSON.parse(savedCollapsed));
        }
    }, []);

    // Thêm useEffect để lấy thông tin user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await axios.get('/admin/current-user');
                setUser(response.data);
            } catch (error) {
                console.error('Error fetching user:', error);
            }
        };
        fetchUser();
    }, []);

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

    const toggleSidebar = () => {
        const newCollapsed = !collapsed;
        setCollapsed(newCollapsed);
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
        
        // Dispatch custom event để thông báo cho AdminLayout
        window.dispatchEvent(new CustomEvent('sidebarToggle', {
            detail: { collapsed: newCollapsed }
        }));
    };

    return (
        <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <img src={logoImage} alt="Logo" className="logo-image" />
                    {!collapsed && (
                        <div className="logo-content">
                            <span className="logo-text">Admin Panel</span>
                            {user && <span className="user-name">{user.name}</span>}
                        </div>
                    )}
                </div>
                <button 
                    className="toggle-button"
                    onClick={toggleSidebar}
                    title={collapsed ? "Mở rộng" : "Thu gọn"}
                >
                    <FontAwesomeIcon icon={collapsed ? faBars : faAngleLeft} />
                </button>
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
                <div className="sidebar-bottom">
                    <div className="menu-divider"></div>
                    <a 
                        href="#" 
                        className="menu-item logout-item" 
                        onClick={handleLogout}
                    >
                        <span className="menu-icon">
                            <FontAwesomeIcon icon={faRightFromBracket} />
                        </span>
                        <span className="menu-text">Đăng xuất</span>
                    </a>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar; 