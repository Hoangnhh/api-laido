import React, { useState, useEffect } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Pagination } from 'react-bootstrap';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const TicketByHoursReport = () => {
    const [filters, setFilters] = useState({
        from_date: new Date().toISOString().split('T')[0]
    });
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const pageSizeOptions = [10, 20, 50, 100];

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`https://transfer.invade.vn/api/ticket/hourly?date=${filters.from_date}`);
            if (response.data) {
                setData(response.data);
            } else {
                console.error('Dữ liệu không hợp lệ:', response.data);
                setData([]);
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
            setData([]);
        }
        setLoading(false);
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchData();
    };

    // Tính toán dữ liệu cho trang hiện tại
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const currentData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value);
        setItemsPerPage(newSize);
        setCurrentPage(1); // Reset về trang đầu khi thay đổi kích thước trang
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const renderPaginationItems = () => {
        let items = [];
        // Nút Previous
        items.push(
            <Pagination.Prev 
                key="prev"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
            />
        );

        // Trang đầu
        items.push(
            <Pagination.Item
                key={1}
                active={currentPage === 1}
                onClick={() => handlePageChange(1)}
            >
                1
            </Pagination.Item>
        );

        // Dấu ... bên trái
        if (currentPage > 3) {
            items.push(<Pagination.Ellipsis key="ellipsis1" />);
        }

        // Các trang ở giữa
        for (let number = Math.max(2, currentPage - 1); number <= Math.min(totalPages - 1, currentPage + 1); number++) {
            items.push(
                <Pagination.Item
                    key={number}
                    active={number === currentPage}
                    onClick={() => handlePageChange(number)}
                >
                    {number}
                </Pagination.Item>
            );
        }

        // Dấu ... bên phải
        if (currentPage < totalPages - 2) {
            items.push(<Pagination.Ellipsis key="ellipsis2" />);
        }

        // Trang cuối
        if (totalPages > 1) {
            items.push(
                <Pagination.Item
                    key={totalPages}
                    active={currentPage === totalPages}
                    onClick={() => handlePageChange(totalPages)}
                >
                    {totalPages}
                </Pagination.Item>
            );
        }

        // Nút Next
        items.push(
            <Pagination.Next
                key="next"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
            />
        );

        return items;
    };

    const handleExportExcel = () => {
        const excelData = data.map(item => {
            const rowData = {
                'Khu vực': item.zoneName,
                'Tổng tháng': item.mtd,
            };
            // Thêm các giờ từ 0-23
            for (let i = 0; i < 24; i++) {
                rowData[`${i}h`] = item[`h${i}`];
            }
            return rowData;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Định nghĩa độ rộng cột
        const colWidths = [
            { wch: 20 }, // Khu vực
            { wch: 15 }, // Tổng tháng
            ...Array(24).fill({ wch: 8 }) // Độ rộng cho các cột giờ
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo vé theo giờ');
        XLSX.writeFile(wb, `bao_cao_ve_theo_gio_${filters.from_date}.xlsx`);
    };

    // Thêm hàm để chuẩn bị dữ liệu cho biểu đồ
    const prepareChartData = () => {
        const hours = Array.from({ length: 24 }, (_, i) => `${i}h`);
        const filteredData = data.filter(item => item.zoneName !== 'BENYEN');
        const datasets = filteredData.map(item => ({
            label: item.zoneName,
            data: hours.map((_, index) => item[`h${index}`]),
            borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false
        }));

        return {
            labels: hours,
            datasets: datasets
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    padding: 20,
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    usePointStyle: true,
                    boxWidth: 10,
                    boxHeight: 10
                }
            },
            title: {
                display: true,
                text: 'Biểu đồ số lượng vé theo giờ',
                font: {
                    size: 18,
                    weight: 'bold'
                },
                padding: {
                    top: 20,
                    bottom: 30
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#333',
                bodyColor: '#333',
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                padding: 12,
                borderColor: '#ccc',
                borderWidth: 1,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y} vé`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    drawBorder: false,
                    color: '#f0f0f0'
                },
                ticks: {
                    padding: 10,
                    font: {
                        size: 12,
                        weight: 'bold'
                    },
                    callback: function(value) {
                        return value + ' vé';
                    }
                },
                title: {
                    display: true,
                    text: 'Số lượng vé',
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 10
                    }
                }
            },
            x: {
                grid: {
                    drawBorder: false,
                    color: '#f0f0f0'
                },
                ticks: {
                    padding: 10,
                    font: {
                        size: 12,
                        weight: 'bold'
                    }
                },
                title: {
                    display: true,
                    text: 'Giờ trong ngày',
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10
                    }
                }
            }
        },
        animation: {
            duration: 2000,
            easing: 'easeInOutQuart',
        },
        transitions: {
            active: {
                animation: {
                    duration: 400
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
            animationDuration: 300
        }
    };

    // Thêm hàm tính tổng số vé trong ngày
    const calculateDailyTotal = () => {
        return data.reduce((total, zone) => {
            const zoneTotal = Array.from({ length: 24 }, (_, i) => zone[`h${i}`])
                .reduce((sum, count) => sum + count, 0);
            return total + zoneTotal;
        }, 0);
    };

    // Thêm hàm tính tổng số vé trong ngày cho một khu vực
    const calculateZoneTotal = (zone) => {
        return Array.from({ length: 24 }, (_, i) => zone[`h${i}`])
            .reduce((sum, count) => sum + count, 0);
    };

    return (
        <AdminLayout>
            <div className="rp-container d-flex flex-column vh-100">
                <div className="rp-header">
                    <Card className="rp-filter-section mb-3">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h4>Báo cáo vé sử dụng theo giờ</h4>
                            {data.length > 0 && (
                                <h5 className="mb-0">
                                    Tổng số vé trong ngày: <span className="text-primary fw-bold">{calculateDailyTotal()}</span>
                                </h5>
                            )}
                        </Card.Header>
                        <Card.Body>
                            <Form>
                                <Row>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Ngày</Form.Label>
                                            <Form.Control 
                                                type="date"
                                                value={filters.from_date}
                                                onChange={(e) => setFilters({...filters, from_date: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2} className="d-flex align-items-end">
                                        <Button 
                                            variant="primary" 
                                            className="me-2"
                                            onClick={fetchData}
                                        >
                                            Tìm kiếm
                                        </Button>
                                        <Button 
                                            variant="success" 
                                            onClick={handleExportExcel}
                                            disabled={data.length === 0}
                                        >
                                            Xuất Excel
                                        </Button>
                                    </Col>
                                </Row>
                            </Form>
                        </Card.Body>
                    </Card>
                </div>

                <Card className="rp-data-grid flex-grow-1 overflow-hidden">
                    <Card.Body>
                    {loading ? (
                        <p>Đang tải dữ liệu...</p>
                    ) : data.length === 0 ? (
                        <p>Không có dữ liệu để hiển thị.</p>
                    ) : (
                        <>
                            <div style={{ 
                                height: '500px',
                                marginBottom: '30px',
                                padding: '20px',
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                                <Line data={prepareChartData()} options={chartOptions} />
                            </div>
                            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                <Table striped bordered hover className="rp-table" style={{ width: '100%' }}>
                                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                                        <tr>
                                            <th>Khu vực</th>
                                            {Array.from({ length: 24 }, (_, i) => (
                                                <th key={i}>{`${i}h`}</th>
                                            ))}
                                            <th>Tổng ngày</th>
                                            <th>Tổng tháng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data
                                            .filter(item => item.zoneName !== 'BENYEN')
                                            .map((item, index) => (
                                                <tr key={index}>
                                                    <td>{item.zoneName}</td>
                                                    {Array.from({ length: 24 }, (_, i) => (
                                                        <td key={i}>{item[`h${i}`]}</td>
                                                    ))}
                                                    <td className="fw-bold text-primary">{calculateZoneTotal(item)}</td>
                                                    <td>{item.mtd}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </Table>
                            </div>
                        </>
                    )}
                    </Card.Body>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default TicketByHoursReport;