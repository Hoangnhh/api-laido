import React, { useState, useEffect } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Modal, Pagination } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../../css/Report.css';
import * as XLSX from 'xlsx';

const RevenueReport = () => {
    const today = new Date().toISOString().split('T')[0];
    
    const [filters, setFilters] = useState({
        from_date: today,
        to_date: today
    });
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const pageSizeOptions = [10, 20, 50, 100];
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [selectedRevenue, setSelectedRevenue] = useState(null);
    const [typeView, setTypeView] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.post('https://transfer.invade.vn/api/RevenueTotal', 
                {
                    fromDate: `${filters.from_date}T00:00:00`,
                    toDate: `${filters.to_date}T23:59:59`,
                    typeView: typeView
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json, text/plain, */*',
                        'Access-Control-Allow-Origin': '*',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    withCredentials: true
                }
            );

            if (response.data) {
                setData(response.data);
            }
        } catch (error) {
            console.error('Lỗi:', error);
            if (error.response) {
                console.error('Chi tiết lỗi:', {
                    status: error.response.status,
                    data: error.response.data
                });
            }
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
            'Mã doanh thu': item.revenue_code,
            'Ngày': item.revenue_date,
            'Mã NV': item.staff_code,
            'Tên nhân viên': item.staff_name,
            'Số tiền': item.amount,
            'Hình thức doanh thu': item.revenue_method,
            'Người tạo': item.created_by
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        const colWidths = [
            { wch: 5 },  // STT
            { wch: 15 }, // Mã doanh thu
            { wch: 15 }, // Ngày
            { wch: 10 }, // Mã NV
            { wch: 20 }, // Tên nhân viên
            { wch: 15 }, // Số tiền
            { wch: 20 }, // Hình thức doanh thu
            { wch: 20 }  // Người tạo
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo vé đã in theo dịch vụ');
        XLSX.writeFile(wb, `bao_cao_doanh_thu_${filters.from_date}_${filters.to_date}.xlsx`);
    };

    const handleShowTickets = (revenue) => {
        setSelectedRevenue(revenue);
        setShowTicketModal(true);
    };

    const TicketDetailsModal = () => {
        if (!selectedRevenue) return null;

        return (
            <Modal 
                show={showTicketModal} 
                onHide={() => setShowTicketModal(false)}
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Chi tiết doanh thu #{selectedRevenue.revenue_code}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <strong>Nhân viên:</strong> {selectedRevenue.staff_code} - {selectedRevenue.staff_name}<br />
                        <strong>Ngày:</strong> {selectedRevenue.revenue_date}<br />
                        <strong>Hình thức:</strong> {selectedRevenue.revenue_method}<br />
                        <strong>Tổng tiền:</strong> {new Intl.NumberFormat('vi-VN', { 
                            style: 'currency', 
                            currency: 'VND' 
                        }).format(selectedRevenue.amount)}
                    </div>
                    {/* ... existing ticket details table ... */}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowTicketModal(false)}>
                        Đóng
                    </Button>
                </Modal.Footer>
            </Modal>
        );
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

    return (
        <AdminLayout>
            <div className="rp-container d-flex flex-column vh-100">
                <div className="rp-header">
                    <Card className="rp-filter-section mb-3">
                        <Card.Header>
                            <h4>Báo cáo vé đã in theo dịch vụ</h4>
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
                                                max={filters.to_date}
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
                                                min={filters.from_date}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Loại dịch vụ</Form.Label>
                                            <Form.Select 
                                                value={typeView}
                                                onChange={(e) => setTypeView(parseInt(e.target.value))}
                                            >
                                                <option value={0}>Gói dịch vụ</option>
                                                <option value={1}>Dịch vụ</option>
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
                    <Card.Body>
                        {loading ? (
                            <p>Đang tải dữ liệu...</p>
                        ) : (
                            <>
                                {data.length === 0 ? (
                                    <p className="text-center">Không có dữ liệu để hiển thị.</p>
                                ) : (
                                    <div className="table-responsive">
                                        <Table striped bordered hover className="rp-table">
                                            <thead>
                                                <tr>
                                                    <th className="text-center">STT</th>
                                                    <th>Tên vé</th>
                                                    <th>Tên nhóm</th>
                                                    <th>Số lượng</th>
                                                    <th>Giá</th>
                                                    <th>Tổng tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="text-center">{index + 1}</td>
                                                        <td>{item.ticketName}</td>
                                                        <td>{item.groupName}</td>
                                                        <td className="text-end">
                                                            {new Intl.NumberFormat('vi-VN').format(item.quantity)}
                                                        </td>
                                                        <td className="text-end">
                                                            {new Intl.NumberFormat('vi-VN', { 
                                                                style: 'currency', 
                                                                currency: 'VND' 
                                                            }).format(item.price)}
                                                        </td>
                                                        <td className="text-end">
                                                            {new Intl.NumberFormat('vi-VN', { 
                                                                style: 'currency', 
                                                                currency: 'VND' 
                                                            }).format(item.TotalAmount)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}
                                
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
                <TicketDetailsModal />
            </div>
        </AdminLayout>
    );
};

export default RevenueReport; 