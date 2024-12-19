import React, { useState, useEffect } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Pagination } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../../css/Report.css';
import * as XLSX from 'xlsx';

const UsedTicketsListReport = () => {
    const today = new Date().toISOString().split('T')[0];
    
    const [filters, setFilters] = useState({
        from_date: today,
        to_date: today,
        ticket_code: '',
        staff_name: '',
        ticket_status: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const pageSizeOptions = [10, 20, 50, 100];
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/get-ticket-report', { params: filters });
            setData(response.data.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setLoading(false);
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchData();
    };

    const handleExportExcel = () => {
        const excelData = data.map((item, index) => ({
            'STT': index + 1,
            'Mã vé': item.code,
            'Tên vé': item.name,
            'Giá vé': item.price,
            'Hoa hồng': item.commission,
            'Ngày phát hành': item.issue_date_formatted,
            'Ngày hết hạn': item.expired_date_formatted,
            'Thời gian check-in': item.checkin_at_formatted,
            'Thời gian check-out': item.checkout_at_formatted,
            'Trạng thái': item.status_text,
            'Mã NV': item.staff_code,
            'Tên nhân viên': item.staff_name
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        const colWidths = [
            { wch: 5 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
            { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
            { wch: 15 }, { wch: 10 }, { wch: 25 }
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách vé đã sử dụng');
        XLSX.writeFile(wb, `danh_sach_ve_da_su_dung_${filters.from_date}_${filters.to_date}.xlsx`);
    };

    // Tính toán dữ liệu cho trang hiện tại
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const currentData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value);
        setItemsPerPage(newSize);
        setCurrentPage(1);
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

        // Hiển thị trang đầu
        items.push(
            <Pagination.Item
                key={1}
                active={1 === currentPage}
                onClick={() => handlePageChange(1)}
            >
                1
            </Pagination.Item>
        );

        // Thêm ellipsis đầu nếu cần
        if (currentPage > 4) {
            items.push(<Pagination.Ellipsis key="ellipsis-start" />);
        }

        // Hiển thị các trang xung quanh trang hiện tại
        for (let number = Math.max(2, currentPage - 2); number <= Math.min(totalPages - 1, currentPage + 2); number++) {
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

        // Thêm ellipsis cuối nếu cần
        if (currentPage < totalPages - 3) {
            items.push(<Pagination.Ellipsis key="ellipsis-end" />);
        }

        // Hiển thị trang cuối nếu có nhiều hơn 1 trang
        if (totalPages > 1) {
            items.push(
                <Pagination.Item
                    key={totalPages}
                    active={totalPages === currentPage}
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

    const getStatusStyle = (status, checkoutTime) => {
        if (status === 'CHECKOUT') {
            return 'text-center text-success';
        }
        
        if (status === 'CHECKIN') {
            return 'text-center text-primary'; 
        }
        
        return 'text-center'; // Mặc định
    };

    return (
        <AdminLayout>
            <div className="rp-container d-flex flex-column vh-100">
                <div className="rp-header">
                    <Card className="rp-filter-section mb-3">
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
                                                value={filters.from_date}
                                                onChange={(e) => setFilters({...filters, from_date: e.target.value})}
                                                max={filters.to_date}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label>Đến ngày</Form.Label>
                                            <Form.Control 
                                                type="date"
                                                value={filters.to_date}
                                                onChange={(e) => setFilters({...filters, to_date: e.target.value})}
                                                min={filters.from_date}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label>Mã vé</Form.Label>
                                            <Form.Control 
                                                type="text"
                                                placeholder="Nhập mã vé"
                                                value={filters.ticket_code}
                                                onChange={(e) => setFilters({...filters, ticket_code: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label>Nhân viên</Form.Label>
                                            <Form.Control 
                                                type="text"
                                                placeholder="Nhập tên nhân viên"
                                                value={filters.staff_name}
                                                onChange={(e) => setFilters({...filters, staff_name: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label>Trạng thái</Form.Label>
                                            <Form.Select
                                                value={filters.ticket_status}
                                                onChange={(e) => setFilters({...filters, ticket_status: e.target.value})}
                                            >
                                                <option value="">Tất cả</option>
                                                <option value="CHECKIN">Chưa hoàn thành</option>
                                                <option value="CHECKOUT">Đã hoàn thành</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={2} className="d-flex align-items-end">
                                        <Button 
                                            variant="primary" 
                                            className="me-2"
                                            onClick={handleSearch}
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
                    <Card.Body className="d-flex flex-column h-100">
                        {loading ? (
                            <p>Đang tải dữ liệu...</p>
                        ) : (
                            <>
                                <div className="table-responsive flex-grow-1 overflow-auto">
                                    <Table striped bordered hover className="rp-table">
                                        <thead>
                                            <tr>
                                                <th>STT</th>
                                                <th>Mã vé</th>
                                                <th>Tên vé</th>
                                                <th>Giá vé</th>
                                                <th>Hoa hồng</th>
                                                <th>Ngày phát hành</th>
                                                <th>Ngày hết hạn</th>
                                                <th>Thời gian check-in</th>
                                                <th>Thời gian check-out</th>
                                                <th>Trạng thái</th>
                                                <th>Mã NV</th>
                                                <th>Tên nhân viên</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentData.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                    <td className="text-center bold">
                                                        {
                                                            item.is_checkout_with_other ? (
                                                                <b>{item.code}</b>
                                                            ) : (
                                                                item.code
                                                            )
                                                        }
                                                    </td>
                                                    <td>{item.name}</td>
                                                    <td className="text-end">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}</td>
                                                    <td className="text-end">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.commission)}</td>
                                                    <td className="text-center">{item.issue_date_formatted}</td>
                                                    <td className="text-center">{item.expired_date_formatted}</td>
                                                    <td className="text-center">{item.checkin_at_formatted}</td>
                                                    <td className="text-center">{item.checkout_at_formatted}</td>
                                                    <td className={getStatusStyle(item.status, item.checkin_at)}>
                                                        <span>{item.status_text}</span>
                                                    </td>
                                                    <td>{item.staff_code}</td>
                                                    <td>{item.staff_name}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                                
                                {data.length > 0 && (
                                    <div className="mt-3 d-flex justify-content-between align-items-center">
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
                                                Hiển thị {(currentPage - 1) * itemsPerPage + 1} đến {Math.min(currentPage * itemsPerPage, data.length)} trong tổng số {data.length} bản ghi
                                            </div>
                                        </div>
                                        <Pagination className="rp-pagination">{renderPaginationItems()}</Pagination>
                                    </div>
                                )}
                            </>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default UsedTicketsListReport; 