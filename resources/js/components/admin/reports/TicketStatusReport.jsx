import React, { useState, useEffect } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Pagination } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../../css/Report.css';
import * as XLSX from 'xlsx';

const TicketStatusReport = () => {
    const today = new Date().toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        from_date: today,
        to_date: today
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const pageSizeOptions = [10, 20, 50, 100];
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/get-ticket-status-report', {
                params: {
                    from_date: filters.from_date,
                    to_date: filters.to_date
                }
            });

            if (response.data.success) {
                setData(response.data.data || []);
            } else {
                alert(response.data.message || 'Có lỗi xảy ra khi lấy dữ liệu');
                setData([]);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi lấy dữ liệu');
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchData();
    };

    const handleExportExcel = () => {
        const excelData = data.map((item, index) => ({
            'STT': index + 1,
            'Mã tài khoản': item.account_code,
            'Ngày phát hành': item.issued_date,
            'Ngày hết hạn': item.expiration_date,
            'Tổng tiền': item.total_money,
            'Trạng thái': item.status_text,
            'Mã đặt chỗ': item.booking_id,
            'Người tạo': item.created_by,
            'Ngày tạo': item.created_date,
            'Thứ tự': item.sequence,
            'Trạng thái hóa đơn': item.invoice_status,
            'Số hóa đơn': item.invoice_number || '',
            'Ngày ký hóa đơn': item.invoice_sign_date || '',
            'Ngày tạo hóa đơn': item.invoice_created_date || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        const colWidths = [
            { wch: 5 },   // STT
            { wch: 15 },  // Mã tài khoản
            { wch: 15 },  // Ngày phát hành
            { wch: 15 },  // Ngày hết hạn
            { wch: 15 },  // Tổng tiền
            { wch: 15 },  // Trạng thái
            { wch: 30 },  // Mã đặt chỗ
            { wch: 15 },  // Người tạo
            { wch: 18 },  // Ngày tạo
            { wch: 10 },  // Thứ tự
            { wch: 20 },  // Trạng thái hóa đơn
            { wch: 15 },  // Số hóa đơn
            { wch: 18 },  // Ngày ký hóa đơn
            { wch: 18 }   // Ngày tạo hóa đơn
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo trạng thái vé');
        XLSX.writeFile(wb, `bao_cao_trang_thai_ve_${filters.from_date}_${filters.to_date}.xlsx`);
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount || 0);
    };

    return (
        <AdminLayout>
            <div className="rp-container d-flex flex-column vh-100">
                <div className="rp-header">
                    <Card className="rp-filter-section mb-3">
                        <Card.Header>
                            <h4>Báo cáo trạng thái vé</h4>
                        </Card.Header>
                        <Card.Body>
                            <Form>
                                <Row>
                                    <Col md={4}>
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
                                    <Col md={4}>
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
                                    <Col md={4} className="d-flex align-items-end">
                                        <Button
                                            variant="primary"
                                            className="me-2"
                                            onClick={handleSearch}
                                            disabled={loading}
                                        >
                                            {loading ? 'Đang tải...' : 'Tìm kiếm'}
                                        </Button>
                                        <Button
                                            variant="success"
                                            onClick={handleExportExcel}
                                            disabled={data.length === 0 || loading}
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
                            <div className="text-center py-5">
                                <p>Đang tải dữ liệu...</p>
                            </div>
                        ) : (
                            <>
                                {data.length === 0 ? (
                                    <div className="text-center py-5">
                                        <p>Không có dữ liệu để hiển thị.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="table-responsive flex-grow-1 overflow-auto">
                                            <Table striped bordered hover className="rp-table">
                                                <thead>
                                                    <tr>
                                                        <th className="text-center">STT</th>
                                                        <th>Mã tài khoản</th>
                                                        <th>Ngày phát hành</th>
                                                        <th>Ngày hết hạn</th>
                                                        <th className="text-end">Tổng tiền</th>
                                                        <th>Trạng thái</th>
                                                        <th>Mã đặt chỗ</th>
                                                        <th>Người tạo</th>
                                                        <th>Ngày tạo</th>
                                                        <th className="text-center">Thứ tự</th>
                                                        <th>Trạng thái hóa đơn</th>
                                                        <th>Số hóa đơn</th>
                                                        <th>Ngày ký hóa đơn</th>
                                                        <th>Ngày tạo hóa đơn</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentData.map((item, index) => (
                                                        <tr key={item.id || index}>
                                                            <td className="text-center">
                                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                                            </td>
                                                            <td>{item.account_code}</td>
                                                            <td className="text-center">{item.issued_date}</td>
                                                            <td className="text-center">{item.expiration_date}</td>
                                                            <td className="text-end">{formatCurrency(item.total_money)}</td>
                                                            <td className="text-center">
                                                                <span className={`badge ${
                                                                    item.status === 'CLOSE' ? 'bg-success' :
                                                                    item.status === 'INACTIVE' ? 'bg-warning' :
                                                                    item.status === 'ACTIVE' ? 'bg-primary' :
                                                                    'bg-secondary'
                                                                }`}>
                                                                    {item.status_text}
                                                                </span>
                                                            </td>
                                                            <td>{item.booking_id}</td>
                                                            <td>{item.created_by}</td>
                                                            <td className="text-center">{item.created_date}</td>
                                                            <td className="text-center">{item.sequence}</td>
                                                            <td>{item.invoice_status}</td>
                                                            <td>{item.invoice_number || '-'}</td>
                                                            <td className="text-center">{item.invoice_sign_date || '-'}</td>
                                                            <td className="text-center">{item.invoice_created_date || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>

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
                                    </>
                                )}
                            </>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default TicketStatusReport;

