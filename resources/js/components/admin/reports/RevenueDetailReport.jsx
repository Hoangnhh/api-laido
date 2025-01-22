import React, { useState, useEffect } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Modal } from 'react-bootstrap';
import axios from 'axios';

const RevenueDetailReport = () => {
    const today = new Date().toISOString().split('T')[0]; // Lấy ngày hôm nay

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        from_date: today, // Mặc định từ ngày hôm nay
        to_date: today    // Mặc định đến ngày hôm nay
    });

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.post('https://transfer.invade.vn/api/Revenue/cashier', {
                fromDate: `${filters.from_date}T00:00:00`,
                toDate: `${filters.to_date}T23:59:59`,
                Username: "",
                Type: ""
            });

            // Kiểm tra và log response để debug
            console.log('Response:', response.data);

            // Điều chỉnh cách kiểm tra và set data
            if (response.data) {
                setData(response.data); // Bỏ .value vì response trả về trực tiếp là array
            } else {
                console.error('Dữ liệu không hợp lệ:', response.data);
                setData([]); // Set mảng rỗng nếu không có dữ liệu
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
            setData([]); // Set mảng rỗng nếu có lỗi
        }
        setLoading(false);
    };

    const handleSearch = () => {
        fetchData();
    };

    return (
        <AdminLayout>
            <div className="rp-container d-flex flex-column vh-100">
                <div className="rp-header">
                    <Card className="rp-filter-section mb-3">
                        <Card.Header>
                            <h4>Báo cáo chi tiết vé đã in theo thu ngân</h4>
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
                                            onClick={handleSearch}
                                        >
                                            Tìm kiếm
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
                        ) : (
                            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                <Table striped bordered hover className="rp-table" style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th>STT</th>
                                            <th>Mã phiên</th>
                                            <th>Thời gian bắt đầu</th>
                                            <th>Thời gian kết thúc</th>
                                            <th>Tên vé</th>
                                            <th>Nhóm vé</th>
                                            <th>Đơn giá</th>
                                            <th>Số lượng</th>
                                            <th>Tổng tiền</th>
                                            <th>Nhân viên</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>{item['Ses.No']}</td>
                                                <td>{new Date(item.StartTime).toLocaleString('vi-VN')}</td>
                                                <td>{item.Endtime}</td>
                                                <td>{item.TicketName}</td>
                                                <td>{item.GroupName}</td>
                                                <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.Price)}</td>
                                                <td>{new Intl.NumberFormat('vi-VN').format(item.Quantity)}</td>
                                                <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.TotalAmount)}</td>
                                                <td>{item.FullName}</td>
                                            </tr>
                                        ))}
                                        <tr className="table-footer">
                                            <td colSpan={7} style={{ textAlign: 'right' }}><strong>Tổng:</strong></td>
                                            <td>
                                                {new Intl.NumberFormat('vi-VN').format(
                                                    data.reduce((total, item) => total + item.Quantity, 0)
                                                )}
                                            </td>
                                            <td>
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                                    data.reduce((total, item) => total + item.TotalAmount, 0)
                                                )}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default RevenueDetailReport; 