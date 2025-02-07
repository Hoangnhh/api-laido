import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUsers, 
    faUserCheck,
    faShip,
    faTicket,
    faSpinner,
    faCalendar,
} from '@fortawesome/free-solid-svg-icons';
import AdminLayout from './Layout/AdminLayout';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import "../../../css/dashboard.css";
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [gateStats, setGateStats] = useState([]);
    
    const [dateRange, setDateRange] = useState(() => {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        
        return {
            fromDate: sevenDaysAgo.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/dashboard-data', {
                params: dateRange
            });
            setData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGateStats = async () => {
        try {
            const response = await axios.get('/api/admin/get-checked-tickets-by-gate', {
                params: {
                    from_date: dateRange.fromDate,
                    to_date: dateRange.toDate
                }
            });
            setGateStats(response.data.data);
        } catch (error) {
            console.error('Error fetching gate stats:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchGateStats();
    }, [dateRange]);

    const handleDateChange = (e) => {
        setDateRange(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                    callback: function(value) {
                        if (value < 0) return '';
                        return value;
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                suggestedMax: function(context) {
                    const maxValue = Math.max(...context.chart.data.datasets[0].data);
                    return maxValue + (maxValue * 0.1);
                }
            },
            x: {
                ticks: {
                    callback: function(value) {
                        const date = new Date(this.getLabelForValue(value));
                        return date.toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit'
                        });
                    },
                    maxRotation: 0
                },
                grid: {
                    display: false
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#333',
                bodyColor: '#666',
                borderColor: 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    title: function(context) {
                        const date = new Date(context[0].label);
                        return date.toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                    }
                }
            }
        }
    };

    const prepareActiveStaffChart = () => {
        if (!data?.chart_data) return null;

        const dates = Object.keys(data.chart_data);
        const lineOptions = {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                datalabels: {
                    display: true,
                    color: '#000',
                    anchor: 'end',
                    align: 'top',
                    offset: 4,
                    font: {
                        size: 11,
                        weight: 'bold'
                    },
                    formatter: (value) => value
                },
                tooltip: {
                    ...chartOptions.plugins.tooltip,
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].label);
                            return date.toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            });
                        },
                        label: function(context) {
                            return `Số vé: ${context.parsed.y}`;
                        }
                    }
                }
            }
        };

        return {
            data: {
                labels: dates,
                datasets: [{
                    label: 'Lái đò hoạt động',
                    data: dates.map(date => data.chart_data[date].active_staff),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    tension: 0.3,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: lineOptions
        };
    };

    const prepareCheckedTicketsChart = () => {
        if (!data?.chart_data) return null;

        const dates = Object.keys(data.chart_data);
        const barOptions = {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                datalabels: {
                    display: true,
                    color: '#000',
                    anchor: 'end',
                    align: 'top',
                    offset: 4,
                    font: {
                        size: 11,
                        weight: 'bold'
                    },
                    formatter: (value) => value
                },
                tooltip: {
                    ...chartOptions.plugins.tooltip,
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].label);
                            return date.toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            });
                        },
                        label: function(context) {
                            return `Số vé: ${context.parsed.y}`;
                        }
                    }
                }
            }
        };

        return {
            data: {
                labels: dates,
                datasets: [{
                    label: 'Vé đã quét',
                    data: dates.map(date => data.chart_data[date].checked_tickets),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgb(255, 99, 132)',
                    borderWidth: 1
                }]
            },
            options: barOptions
        };
    };

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
                <div className="db-header">
                    <h1 className="db-title">Tổng quan hệ thống</h1>
                    <div className="db-date-filter">
                        <div className="db-date-input">
                            <input
                                type="date"
                                name="fromDate"
                                value={dateRange.fromDate}
                                onChange={handleDateChange}
                            />
                        </div>
                        <span>đến</span>
                        <div className="db-date-input">
                            <input
                                type="date"
                                name="toDate"
                                value={dateRange.toDate}
                                onChange={handleDateChange}
                            />
                        </div>
                    </div>
                </div>
                
                <div className="db-stats-grid">
                    <div className="db-stat-card">
                        <div className="db-stat-icon">
                            <FontAwesomeIcon icon={faUsers} />
                        </div>
                        <div className="db-stat-content">
                            <h3>Tổng số lái đò</h3>
                            <p>{data?.summary?.total_staff || 0}</p>
                        </div>
                    </div>

                    <div className="db-stat-card">
                        <div className="db-stat-icon">
                            <FontAwesomeIcon icon={faUserCheck} />
                        </div>
                        <div className="db-stat-content">
                            <h3>Lái đò hoạt động</h3>
                            <p>{data?.summary?.active_staff || 0}</p>
                        </div>
                    </div>

                    <div className="db-stat-card">
                        <div className="db-stat-icon">
                            <FontAwesomeIcon icon={faTicket} />
                        </div>
                        <div className="db-stat-content">
                            <h3>Tổng số vé đã quét</h3>
                            <p>{data?.summary?.total_checked_tickets || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="db-charts-container">
                    <div className="db-chart-section">
                        <h2 className="db-section-title">Số lượng lái đò hoạt động theo ngày</h2>
                        <div className="db-chart-container">
                            {data && (
                                <Line 
                                    data={prepareActiveStaffChart().data} 
                                    options={prepareActiveStaffChart().options}
                                />
                            )}
                        </div>
                    </div>

                    <div className="db-chart-section">
                        <h2 className="db-section-title">Số lượng vé đã quét theo ngày</h2>
                        <div className="db-chart-container">
                            {data && (
                                <Bar 
                                    data={prepareCheckedTicketsChart().data} 
                                    options={prepareCheckedTicketsChart().options}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="db-section">
                    <h2 className="db-section-title">Thống kê theo cổng</h2>
                    <div className="db-gate-stats-grid">
                        {gateStats.map((gate, index) => (
                            <div key={index} className="db-stat-card">
                                <div className="db-stat-icon">
                                    <FontAwesomeIcon icon={faShip} />
                                </div>
                                <div className="db-stat-content">
                                    <h3>Cổng {gate.gate_id}</h3>
                                    <p>{gate.total_tickets} vé</p>
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