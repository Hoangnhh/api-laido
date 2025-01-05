import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome,
    faUsers,
    faCalendarAlt,
    faGear,
    faRightFromBracket,
    faUserCircle,
    faChartLine,
    faChevronDown,
    faChevronRight,
    faBars,
    faAngleLeft,
    faCircle,
    faMoneyBillWave,
    faStar,
    faDoorOpen,
    faDoorClosed,
    faLocationDot
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
            text: 'Thanh toán', 
            icon: faMoneyBillWave,
            path: '/admin/accounts-payable'
        },
        { 
            text: 'Màn hình checkin', 
            icon: faDoorOpen,
            path: '/admin/queue-display'
        },
        { 
            text: 'Màn hình checkout', 
            icon: faDoorClosed,
            path: '/admin/checkout-screen'
        },
        {
            text: 'Quản lý nhân viên',
            icon: faUsers,
            path: '#',
            children: [
                { 
                    text: 'Quản lý nhóm nhân viên', 
                    icon: faCircle,
                    path: '/admin/staff-group'
                },
                { 
                    text: 'Quản lý nhân viên', 
                    icon: faCircle,
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
                    icon: faCircle,
                    path: '/admin/payment-report'
                },
                { 
                    text: 'Vé đã sử dụng', 
                    icon: faCircle,
                    path: '/admin/used-tickets-list-report'
                },
                { 
                    text: 'Lái đò đang chờ', 
                    icon: faCircle,
                    path: '/admin/waiting-list-for-checkin-report'
                },
                { 
                    text: 'Lái đò đang hoạt động', 
                    icon: faCircle,
                    path: '/admin/checkin-list-report'
                },
                { 
                    text: 'Lái đò đã kết ca', 
                    icon: faCircle,
                    path: '/admin/checkout-list-report'
                }

            ]
        },
        { 
            text: 'Đánh giá từ khách hàng', 
            icon: faStar,
            path: '/admin/reviews'
        },
                { 
            text: 'Quản lý người dùng', 
            icon: faUserCircle,
            path: '/admin/users'
        },
        { 
            text: 'Quản lý vị trí', 
            icon: faLocationDot,
            path: '/admin/gate'
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

    // Thêm hàm kiểm tra quyền truy cập
    const hasPermission = (path) => {
        if (!user) return false;
        if (user.username === 'admin') return true;
        return user.permission?.includes(path);
    };

    // Lọc và hiển thị menu items dựa trên quyền
    const filteredMenuItems = menuItems.filter(item => {
        if (user?.username === 'admin') return true;
        if (item.children) {
            // Lọc các submenu items có quyền truy cập
            const allowedChildren = item.children.filter(child => 
                hasPermission(child.path)
            );
            // Chỉ hiện menu cha nếu có ít nhất 1 menu con được phép truy cập
            return allowedChildren.length > 0;
        }
        
        return hasPermission(item.path);
    }).map(item => {
        if (item.children) {
            return {
                ...item,
                children: item.children.filter(child => 
                    user?.username === 'admin' || hasPermission(child.path)
                )
            };
        }
        return item;
    });

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
                    {filteredMenuItems.map((item) => (
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
                        {!collapsed && (
                            <div className="sb-powered-by">Powered by THinkSoft</div>
                        )}
                    </div>
                </nav>
            </aside>
        </>
    );
};

export default Sidebar; 