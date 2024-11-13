import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUsers, 
    faUserTie,
    faUserClock,
    faUserCheck,
    faSpinner,
    faClockRotateLeft
} from '@fortawesome/free-solid-svg-icons';
import AdminLayout from './Layout/AdminLayout';
import axios from 'axios';
import '../../../css/dashboard.css';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('/api/admin/dashboard-data');
                setData(response.data);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <AdminLayout>
                <div className="db-loading">
                    <FontAwesomeIcon icon={faSpinner} spin />
                    <span>Đang tải dữ liệu...</span>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="db-container">
                <h1 className="db-title">Tổng quan hệ thống</h1>
                
                <div className="db-stats-grid">
                    <div className="db-stat-card db-total-staff">
                        <div className="db-stat-icon">
                            <FontAwesomeIcon icon={faUsers} />
                        </div>
                        <div className="db-stat-content">
                            <h3>Tổng số lái đò</h3>
                            <p>{data?.totalStaff || 0}</p>
                        </div>
                    </div>

                    <div className="db-stat-card db-assigned-staff">
                        <div className="db-stat-icon">
                            <FontAwesomeIcon icon={faUserTie} />
                        </div>
                        <div className="db-stat-content">
                            <h3>Lái đò được phân ca</h3>
                            <p>{data?.assignedStaffToday || 0}</p>
                        </div>
                    </div>

                    <div className="db-stat-card db-checkin-staff">
                        <div className="db-stat-icon">
                            <FontAwesomeIcon icon={faUserCheck} />
                        </div>
                        <div className="db-stat-content">
                            <h3>Lái đò đang làm việc</h3>
                            <p>{data?.checkinStaff || 0}</p>
                        </div>
                    </div>

                    <div className="db-stat-card db-waiting-staff">
                        <div className="db-stat-icon">
                            <FontAwesomeIcon icon={faUserClock} />
                        </div>
                        <div className="db-stat-content">
                            <h3>Lái đò đang chờ</h3>
                            <p>{data?.waitingStaff || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="db-chart-section">
                    <h2 className="db-section-title">Biểu đồ checkin theo giờ</h2>
                    <div className="db-chart">
                        {Object.entries(data?.hourlyCheckins || {}).map(([hour, count]) => {
                            const maxCount = Math.max(...Object.values(data?.hourlyCheckins || {}));
                            const heightPercentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            
                            return (
                                <div key={hour} className="db-chart-bar">
                                    <div className="db-bar-container">
                                        <div 
                                            className="db-bar" 
                                            style={{ height: `${heightPercentage}%` }}
                                        >
                                            <span className="db-bar-value">{count}</span>
                                        </div>
                                    </div>
                                    <span className="db-hour">{hour}h</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="db-recent-section">
                    <h2 className="db-section-title">
                        <FontAwesomeIcon icon={faClockRotateLeft} className="db-icon-space" />
                        Vé gần đây
                    </h2>
                    <div className="db-recent-tickets">
                        {data?.recentTickets?.map(ticket => (
                            <div key={ticket.id} className="db-ticket-item">
                                <div className="db-ticket-info">
                                    <span className="db-ticket-id">#{ticket.id}</span>
                                    <span className="db-ticket-staff">
                                        {ticket.staff_name} ({ticket.staff_code})
                                    </span>
                                    <span className="db-ticket-gate">{ticket.gate_name}</span>
                                </div>
                                <div className="db-ticket-time">
                                    {ticket.created_at}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Dashboard; 