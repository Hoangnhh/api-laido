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
            const response = await axios.post('http://api-test.invade.vn/pos/reports/revenue-detail', {
                StartDate: `${filters.from_date}T00:00:00+07:00`, // Đặt giờ bắt đầu
                EndDate: `${filters.to_date}T23:59:00+07:00`, // Đặt giờ kết thúc
                SiteCode: 'BQL-CH'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer #0c8c7a3caee9c01260f2c396a6ecbd58dba363f8c669ae1cedd12481376d050d4f1a20ecad385424a848ebaa5904a6272c1d2112341af04a52d367e05f3dd6e1'
                }
            });

            if (response.data && response.data.status === "SUCCESS") {
                setData(response.data.value);
            } else {
                console.error('Dữ liệu không hợp lệ:', response.data);
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
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
                            <h4>Báo cáo chi tiết vé đã in theo hóa đơn</h4>
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
                                            <th>Ngày xuất vé</th>
                                            <th>Mã hóa đơn</th>
                                            <th>Số lượng</th>
                                            <th>Tổng tiền</th>
                                            <th>Tên dịch vụ</th>
                                            <th>Đơn vị</th>
                                            <th>Nhân viên in</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>{new Date(item.saleDate).toLocaleString('vi-VN')}</td>
                                                <td>{item.bookingCode}</td>
                                                <td>{item.quantity}</td>
                                                <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.totalMoney)}</td>
                                                <td>{item.serviceName}</td>
                                                <td>{item.profileName}</td>
                                                <td>{item.cashier}</td>
                                            </tr>
                                        ))}
                                        <tr className="table-footer">
                                            <td colSpan={3} style={{ textAlign: 'right' }}><strong>Tổng:</strong></td>
                                            <td>
                                                {data.reduce((total, item) => total + item.quantity, 0)}
                                            </td>
                                            <td>
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                                    data.reduce((total, item) => total + item.totalMoney, 0)
                                                )}
                                            </td>
                                            <td colSpan={2}></td>
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