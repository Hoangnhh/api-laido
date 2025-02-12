import React, { useState, useEffect } from 'react';
import AdminLayout from '../Layout/AdminLayout';
import { Card, Row, Col, Form, Button } from 'react-bootstrap';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    Title
} from 'chart.js';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    Title
);

// Thêm mảng màu pastel dịu
const PASTEL_COLORS = [
    '#FFB3BA', // Hồng nhạt
    '#BAFFC9', // Xanh lá nhạt  
    '#BAE1FF', // Xanh dương nhạt
    '#FFFFBA', // Vàng nhạt
    '#FFE4B5', // Cam nhạt
    '#E6E6FA', // Tím nhạt
    '#F0FFF0', // Xanh bạc hà
    '#FFF0F5', // Hồng phấn
    '#F0F8FF', // Xanh biển nhạt
    '#F5F5DC', // Be nhạt
    '#FFE4E1', // Đỏ nhạt
    '#F0FFFF', // Xanh ngọc nhạt
];

const TicketByNameReport = () => {
    const [filters, setFilters] = useState({
        from_date: new Date().toISOString().split('T')[0],
        to_date: new Date().toISOString().split('T')[0]
    });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/get-ticket-by-name', {
                params: { 
                    from_date: filters.from_date,
                    to_date: filters.to_date
                }
            });
            
            if (response.data.success) {
                setData(response.data.data);
            } else {
                console.error('Lỗi khi tải dữ liệu:', response.data.message);
                setData(null);
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
            setData(null);
        }
        setLoading(false);
    };

    const prepareChartData = () => {
        if (!data || !data.items) return null;

        return {
            labels: data.items.map(item => item.name),
            datasets: [{
                data: data.items.map(item => item.percentage),
                backgroundColor: data.items.map((_, index) => 
                    PASTEL_COLORS[index % PASTEL_COLORS.length]
                ),
                borderColor: '#fff',
                borderWidth: 2,
                hoverBackgroundColor: data.items.map((_, index) => {
                    const color = PASTEL_COLORS[index % PASTEL_COLORS.length];
                    return color.replace(')', ', 0.8)').replace('rgb', 'rgba');
                }),
                hoverBorderColor: '#fff',
                hoverBorderWidth: 3
            }]
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    padding: 20,
                    font: {
                        size: 14,
                        family: "'Segoe UI', sans-serif"
                    },
                    generateLabels: (chart) => {
                        const datasets = chart.data.datasets[0];
                        return chart.data.labels.map((label, i) => ({
                            text: `${label} (${data.items[i].percentage}%)`,
                            fillStyle: PASTEL_COLORS[i % PASTEL_COLORS.length],
                            strokeStyle: '#fff',
                            lineWidth: 2,
                            hidden: false,
                            index: i
                        }));
                    }
                }
            },
            title: {
                display: true,
                text: '',
                font: {
                    size: 18,
                    weight: 'bold',
                    family: "'Segoe UI', sans-serif"
                },
                padding: {
                    top: 20,
                    bottom: 20
                },
                color: '#555'
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#555',
                bodyColor: '#666',
                borderColor: '#ddd',
                borderWidth: 1,
                padding: 15,
                boxPadding: 8,
                cornerRadius: 8,
                titleFont: {
                    size: 14,
                    weight: 'bold',
                    family: "'Segoe UI', sans-serif"
                },
                bodyFont: {
                    size: 13,
                    family: "'Segoe UI', sans-serif"
                },
                callbacks: {
                    label: (context) => {
                        const item = data.items[context.dataIndex];
                        return [
                            `${item.name}`,
                            `Số lượng: ${item.value.toLocaleString()} vé`,
                            `Tỷ lệ: ${item.percentage}%`
                        ];
                    }
                }
            },
            datalabels: {
                display: function(context) {
                    const value = context.dataset.data[context.dataIndex];
                    return value >= 3; // Chỉ hiển thị label cho phần có tỷ lệ >= 3%
                },
                color: 'white',
                textAlign: 'center',
                formatter: function(value, context) {
                    return context.chart.data.labels[context.dataIndex];
                },
                font: {
                    family: "'Segoe UI', sans-serif",
                    size: 12
                },
                // Xử lý vị trí label
                anchor: function(context) {
                    const value = context.dataset.data[context.dataIndex];
                    return value < 5 ? 'end' : 'center'; // Label nhỏ hơn 5% sẽ hiển thị ra ngoài
                },
                align: function(context) {
                    const value = context.dataset.data[context.dataIndex];
                    return value < 5 ? 'end' : 'center'; // Căn chỉnh tương ứng
                },
                offset: function(context) {
                    const value = context.dataset.data[context.dataIndex];
                    return value < 5 ? 10 : 0; // Offset cho label bên ngoài
                }
            }
        },
        layout: {
            padding: {
                top: 50,    // Tăng padding để chứa labels bên ngoài
                bottom: 50,
                left: 50,
                right: 150  // Tăng padding bên phải để chứa legend
            }
        },
        elements: {
            arc: {
                borderWidth: 2,
                borderColor: '#fff'
            }
        },
        animation: {
            animateScale: true,
            animateRotate: true,
            duration: 2000,
            easing: 'easeInOutQuart'
        },
        hover: {
            mode: 'nearest',
            intersect: true
        }
    };

    return (
        <AdminLayout>
            <div className="rp-container">
                <div className="rp-header">
                    <Card className="rp-filter-section mb-3">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h4>Báo cáo vé theo loại</h4>
                            {data && (
                                <h5 className="mb-0">
                                    Tổng số vé: <span className="text-primary fw-bold">{data.total}</span>
                                </h5>
                            )}
                        </Card.Header>
                        <Card.Body>
                            <Form>
                                <Row>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Từ ngày</Form.Label>
                                            <Form.Control 
                                                type="date"
                                                value={filters.from_date}
                                                onChange={(e) => setFilters({...filters, from_date: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Đến ngày</Form.Label>
                                            <Form.Control 
                                                type="date"
                                                value={filters.to_date}
                                                onChange={(e) => setFilters({...filters, to_date: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2} className="d-flex align-items-end">
                                        <Button 
                                            variant="primary" 
                                            onClick={fetchData}
                                            disabled={loading}
                                        >
                                            {loading ? 'Đang tải...' : 'Tìm kiếm'}
                                        </Button>
                                    </Col>
                                </Row>
                            </Form>
                        </Card.Body>
                    </Card>
                </div>

                <Card className="rp-data-grid">
                    <Card.Body>
                        {loading ? (
                            <p>Đang tải dữ liệu...</p>
                        ) : !data ? (
                            <p>Không có dữ liệu để hiển thị.</p>
                        ) : (
                            <>
                                <div className="mb-3">
                                    <h5>Thống kê từ ngày {new Date(data.date_range.from_date).toLocaleDateString('vi-VN')} đến ngày {new Date(data.date_range.to_date).toLocaleDateString('vi-VN')}</h5>
                                </div>
                                <div style={{ 
                                    height: '600px',
                                    padding: '20px',
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    marginBottom: '20px'
                                }}>
                                    <Pie data={prepareChartData()} options={chartOptions} />
                                </div>

                                {/* Bảng dữ liệu */}
                                <div className="table-responsive">
                                    <table className="table table-bordered table-hover">
                                        <thead className="table-light">
                                            <tr>
                                                <th>STT</th>
                                                <th>Tên vé</th>
                                                <th className="text-end">Số lượng</th>
                                                <th className="text-end">Tỷ lệ (%)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>
                                                    <td>{item.name}</td>
                                                    <td className="text-end">{item.value.toLocaleString()}</td>
                                                    <td className="text-end">{Number(item.percentage).toFixed(2)}%</td>
                                                </tr>
                                            ))}
                                            <tr className="table-info fw-bold">
                                                <td colSpan={2}>Tổng cộng</td>
                                                <td className="text-end">{data.total.toLocaleString()}</td>
                                                <td className="text-end">100%</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </Card.Body>
                </Card>
            </div>

            <style jsx>{`
                .rp-container {
                    padding: 24px;
                    height: 100%;
                    overflow-y: auto;
                }
                .rp-header {
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    background: #f8f9fa;
                    padding-top: 10px;
                }
                .table-responsive {
                    margin-bottom: 24px;
                }
                .rp-data-grid {
                    margin-bottom: 24px;
                }
                .rp-data-grid .card-body {
                    padding: 24px;
                }
            `}</style>
        </AdminLayout>
    );
};

export default TicketByNameReport;