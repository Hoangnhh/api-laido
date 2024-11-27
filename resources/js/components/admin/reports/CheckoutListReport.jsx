import React, { useState } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Pagination } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../../css/Report.css';

const CheckoutListReport = () => {
    const today = new Date().toISOString().split('T')[0];
    
    const [filters, setFilters] = useState({
        dateFrom: today,
        dateTo: today,
        group: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const pageSizeOptions = [10, 20, 50, 100];

    // Tạo dữ liệu mẫu với thông tin checkout
    const sampleData = Array.from({ length: 50 }, (_, index) => ({
        id: index + 1,
        code: `LD${String(index + 1).padStart(3, '0')}`,
        name: `Nguyễn Văn ${String.fromCharCode(65 + (index % 26))}`,
        group: `Nhóm ${Math.floor(Math.random() * 3) + 1}`,
        date: new Date(2024, 2, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
        checkoutTime: `${Math.floor(Math.random() * 12 + 13)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`, // Giờ checkout từ 13h-24h
        ticketsCheckin: Math.floor(Math.random() * 50) + 1,
        ticketsCheckout: Math.floor(Math.random() * 50) + 1
    }));

    // Tính toán số trang
    const totalPages = Math.ceil(sampleData.length / itemsPerPage);

    // Lấy dữ liệu cho trang hiện tại
    const currentData = sampleData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Xử lý chuyển trang
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // Xử lý thay đổi số lượng bản ghi trên trang
    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value);
        setItemsPerPage(newSize);
        setCurrentPage(1);
    };

    // Tạo các item phân trang
    const renderPaginationItems = () => {
        let items = [];
        items.push(
            <Pagination.Prev 
                key="prev"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
            />
        );

        for (let number = 1; number <= totalPages; number++) {
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

        items.push(
            <Pagination.Next
                key="next"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
            />
        );

        return items;
    };

    return (
        <AdminLayout>
            <div className="rp-container">
                <div className="rp-sticky-header">
                    <Card className="rp-filter-section mb-4">
                        <Card.Header>
                            <h4>Danh sách Lái đò đã Checkout</h4>
                        </Card.Header>
                        <Card.Body>
                            <Form>
                                <Row>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Từ ngày</Form.Label>
                                            <Form.Control 
                                                type="date"
                                                value={filters.dateFrom}
                                                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                                                max={filters.dateTo}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Đến ngày</Form.Label>
                                            <Form.Control 
                                                type="date"
                                                value={filters.dateTo}
                                                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                                                min={filters.dateFrom}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Nhóm</Form.Label>
                                            <Form.Select
                                                value={filters.group}
                                                onChange={(e) => setFilters({...filters, group: e.target.value})}
                                            >
                                                <option value="">Tất cả</option>
                                                <option value="group1">Nhóm 1</option>
                                                <option value="group2">Nhóm 2</option>
                                                <option value="group3">Nhóm 3</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3} className="d-flex align-items-end">
                                        <Button variant="primary" className="me-2">Tìm kiếm</Button>
                                        <Button variant="secondary" className="me-2">Xuất Excel</Button>
                                        <Button variant="info">In báo cáo</Button>
                                    </Col>
                                </Row>
                            </Form>
                        </Card.Body>
                    </Card>
                </div>

                <Card className="rp-data-grid">
                    <Card.Body>
                        <Table striped bordered hover className="rp-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Mã đò</th>
                                    <th>Tên lái đò</th>
                                    <th>Nhóm</th>
                                    <th>Ngày phân ca</th>
                                    <th>Giờ checkout</th>
                                    <th>Số lượng vé Check-in</th>
                                    <th>Số lượng vé Check-out</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td className="text-center">{item.code}</td>
                                        <td>{item.name}</td>
                                        <td className="text-center">{item.group}</td>
                                        <td className="text-center">{item.date}</td>
                                        <td className="text-center">{item.checkoutTime}</td>
                                        <td className="text-center">{item.ticketsCheckin}</td>
                                        <td className="text-center">{item.ticketsCheckout}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>

                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <div className="d-flex align-items-center">
                                <Form.Group className="rp-form-group d-flex align-items-center me-3">
                                    <Form.Label className="me-2 mb-0">Hiển thị:</Form.Label>
                                    <Form.Select 
                                        className="rp-form-select"
                                        value={itemsPerPage}
                                        onChange={handlePageSizeChange}
                                        style={{ width: 'auto' }}
                                    >
                                        {pageSizeOptions.map(size => (
                                            <option key={size} value={size}>
                                                {size} bản ghi
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                                <div>
                                    Hiển thị {(currentPage - 1) * itemsPerPage + 1} đến {Math.min(currentPage * itemsPerPage, sampleData.length)} trong tổng số {sampleData.length} bản ghi
                                </div>
                            </div>
                            <Pagination className="rp-pagination">{renderPaginationItems()}</Pagination>
                        </div>
                    </Card.Body>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default CheckoutListReport; 