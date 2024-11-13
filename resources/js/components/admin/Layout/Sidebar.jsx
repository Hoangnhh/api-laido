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
    faSpinner,
    faDisplay
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import '../../../../css/Sidebar.css';
import logoImage from '../../../assets/logo.png';
import Loading from '../../common/Loading';

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
            text: 'Màn hình xếp hàng', 
            icon: faDisplay,
            path: '/admin/queue-display'
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

    // Thêm state loading
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Cập nhật hàm handleLogout
    const handleLogout = async (e) => {
        e.preventDefault();
        setIsLoggingOut(true);
        
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
        } finally {
            setIsLoggingOut(false);
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

    // Thêm hàm tạo stars
    const renderStars = () => {
        const stars = [];
        for (let i = 0; i < 20; i++) {
            const style = {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                '--duration': `${1 + Math.random() * 3}s`,
                '--delay': `${Math.random() * 2}s`
            };
            stars.push(<div key={i} className="star" style={style} />);
        }
        return stars;
    };

    // Thêm state cho mobile
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Thêm useEffect để xử lý resize window
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsMobileOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Hàm toggle mobile sidebar
    const toggleMobileSidebar = () => {
        setIsMobileOpen(!isMobileOpen);
    };

    // Hàm đóng sidebar khi click vào menu item trên mobile
    const handleMobileMenuClick = () => {
        if (window.innerWidth <= 768) {
            setIsMobileOpen(false);
        }
    };

    return (
        <>
            {isLoggingOut && <Loading message="Đang đăng xuất..." />}
            
            {/* Mobile Header */}
            <div className="sb-mobile-header">
                <button className="sb-mobile-toggle" onClick={toggleMobileSidebar}>
                    <FontAwesomeIcon icon={faBars} />
                </button>
                {user && (
                    <div className="sb-mobile-user">
                        <span className="sb-mobile-user-name">{user.name}</span>
                        <FontAwesomeIcon icon={faUserCircle} className="sb-mobile-user-icon" />
                    </div>
                )}
            </div>

            <aside className={`sb-admin-sidebar ${collapsed ? 'sb-collapsed' : ''} ${isMobileOpen ? 'sb-show' : ''}`}>
                <div className="sb-sidebar-header">
                    <div className="sb-sidebar-logo">
                        <img src={logoImage} alt="Logo" className="sb-logo-image" />
                        {!collapsed && (
                            <div className="sb-logo-content">
                                <span className="sb-logo-text">Admin Panel</span>
                                {user && <span className="sb-user-name">{user.name}</span>}
                            </div>
                        )}
                    </div>
                    <button 
                        className="sb-toggle-button"
                        onClick={toggleSidebar}
                        title={collapsed ? "Mở rộng" : "Thu gọn"}
                    >
                        <FontAwesomeIcon icon={collapsed ? faBars : faAngleLeft} />
                    </button>
                </div>
                <nav className="sb-sidebar-menu">
                    {menuItems.map((item) => (
                        item.children ? (
                            <div key={item.text} className="sb-menu-item-group">
                                <div 
                                    className={`sb-menu-item sb-parent ${openSubmenu === item.text ? 'sb-active' : ''}`}
                                    onClick={() => handleParentClick(item.text)}
                                >
                                    <div className="sb-menu-content">
                                        <span className="sb-menu-icon">
                                            <FontAwesomeIcon icon={item.icon} />
                                        </span>
                                        <span className="sb-menu-text">{item.text}</span>
                                    </div>
                                    <span className="sb-arrow-icon">
                                        <FontAwesomeIcon 
                                            icon={openSubmenu === item.text ? faChevronDown : faChevronRight} 
                                        />
                                    </span>
                                </div>
                                <div className={`sb-submenu ${openSubmenu === item.text ? 'sb-open' : ''}`}>
                                    {item.children.map((child) => (
                                        <a
                                            key={child.text}
                                            href={child.path}
                                            className={`sb-menu-item ${location === child.path ? 'sb-active' : ''}`}
                                        >
                                            <span className="sb-menu-icon">
                                                <FontAwesomeIcon icon={child.icon} />
                                            </span>
                                            <span className="sb-menu-text">{child.text}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <a
                                key={item.text}
                                href={item.path}
                                className={`sb-menu-item ${location === item.path ? 'sb-active' : ''}`}
                                onClick={handleMobileMenuClick}
                            >
                                <span className="sb-menu-icon">
                                    <FontAwesomeIcon icon={item.icon} />
                                </span>
                                <span className="sb-menu-text">{item.text}</span>
                            </a>
                        )
                    ))}
                    <div className="sb-sidebar-bottom">
                        <div className="sb-menu-divider"></div>
                        <a 
                            href="#" 
                            className="sb-menu-item sb-logout-item"
                            onClick={handleLogout}
                        >
                            <span className="sb-menu-icon">
                                <FontAwesomeIcon icon={faRightFromBracket} />
                            </span>
                            <span className="sb-menu-text">Đăng xuất</span>
                        </a>
                    </div>
                </nav>
            </aside>
        </>
    );
};

export default Sidebar; 