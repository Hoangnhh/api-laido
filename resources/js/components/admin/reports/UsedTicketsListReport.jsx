import React, { useState } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Pagination } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../../css/Report.css';

const UsedTicketsListReport = () => {
    const today = new Date().toISOString().split('T')[0];
    
    const [filters, setFilters] = useState({
        dateFrom: today,
        dateTo: today,
        status: '',
        ticketCode: '',
        user: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const pageSizeOptions = [10, 20, 50, 100];

    // Tạo dữ liệu mẫu cho vé đã sử dụng
    const sampleData = Array.from({ length: 50 }, (_, index) => ({
        id: index + 1,
        ticketName: `Vé ${['Người lớn', 'Trẻ em', 'Người cao tuổi'][Math.floor(Math.random() * 3)]}`,
        ticketCode: `VE${String(index + 1).padStart(3, '0')}`,
        price: Math.floor(Math.random() * 50 + 50) * 1000,
        validFrom: new Date(2024, 2, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
        validFromTime: '00:00',
        validTo: new Date(2024, 3, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
        validToTime: '23:59',
        usedDate: new Date(2024, 2, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
        usedTime: `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        status: ['Hoàn thành', 'Chưa hoàn thành'][Math.floor(Math.random() * 2)],
        user: `Nhân viên ${String.fromCharCode(65 + (index % 26))}`
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

    // Format số tiền
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <AdminLayout>
            <div className="rp-container">
                <div className="rp-sticky-header">
                    <Card className="rp-filter-section mb-4">
                        <Card.Header>
                            <h4>Danh sách vé đã sử dụng</h4>
                        </Card.Header>
                        <Card.Body>
                            <Form>
                                <Row>
                                    <Col md={2}>
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
                                    <Col md={2}>
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
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label>Mã vé</Form.Label>
                                            <Form.Control 
                                                type="text"
                                                placeholder="Nhập mã vé"
                                                value={filters.ticketCode}
                                                onChange={(e) => setFilters({...filters, ticketCode: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label>Nhân viên</Form.Label>
                                            <Form.Control 
                                                type="text"
                                                placeholder="Nhập tên nhân viên"
                                                value={filters.user}
                                                onChange={(e) => setFilters({...filters, user: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label>Trạng thái</Form.Label>
                                            <Form.Select
                                                value={filters.status}
                                                onChange={(e) => setFilters({...filters, status: e.target.value})}
                                            >
                                                <option value="">Tất cả</option>
                                                <option value="completed">Hoàn thành</option>
                                                <option value="incomplete">Chưa hoàn thành</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={2} className="d-flex align-items-end">
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
                                    <th>Tên vé</th>
                                    <th>Mã vé</th>
                                    <th>Giá tiền</th>
                                    <th>Thời gian hiệu lực</th>
                                    <th>Thời gian hết hiệu lực</th>
                                    <th>Thời gian sử dụng</th>
                                    <th>Trạng thái</th>
                                    <th>Nhân viên</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td>{item.ticketName}</td>
                                        <td className="text-center">{item.ticketCode}</td>
                                        <td className="text-end">{formatCurrency(item.price)}</td>
                                        <td className="text-center">{`${item.validFrom} ${item.validFromTime}`}</td>
                                        <td className="text-center">{`${item.validTo} ${item.validToTime}`}</td>
                                        <td className="text-center">{`${item.usedDate} ${item.usedTime}`}</td>
                                        <td className="text-center">{item.status}</td>
                                        <td>{item.user}</td>
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

export default UsedTicketsListReport; 