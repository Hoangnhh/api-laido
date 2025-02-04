import React, { useState, useEffect } from 'react';
import AdminLayout from './Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Pagination } from 'react-bootstrap';
import axios from 'axios';
import '../../../css/StaffPayment.css';
import { FaMoneyCheckAlt } from 'react-icons/fa';
import PaymentPopup from './popup/PaymentPopup'; // Import component mới

const StaffPayment = () => {
    const [filters, setFilters] = useState({
        payment_status: '',
        search: ''
    });
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState({
        total_paid: 0,
        total_unpaid: 0,
        total_unpaid_num: 0
    });
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [totalItems, setTotalItems] = useState(0);
    const pageSizeOptions = [20,50, 100,200];
    const [showPopup, setShowPopup] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0
    });

    useEffect(() => {
        fetchSummary();
    }, []);

    useEffect(() => {
        fetchData();
    }, [filters.payment_status, currentPage, itemsPerPage]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/get-staff-payments', { 
                params: {
                    per_page: itemsPerPage,
                    search: filters.search,
                    status: filters.payment_status,
                    page: currentPage
                }
            });
            setData(response.data.data);
            setPagination({
                current_page: response.data.current_page,
                last_page: response.data.last_page,
                total: response.data.total
            });
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setLoading(false);
    };

    const fetchSummary = async () => {
        try {
            const response = await axios.get('/api/admin/get-payment-summary');
            setSummary(response.data);
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchData();
    };

    const handlePageSizeChange = (e) => {
        const newPerPage = parseInt(e.target.value);
        setItemsPerPage(newPerPage);
        setCurrentPage(1);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.last_page && !loading) {
            setCurrentPage(newPage);
        }
    };

    const renderPaginationItems = () => {
        const items = [];
        
        // Nút First và Previous
        items.push(
            <Pagination.First
                key="first"
                disabled={currentPage === 1 || loading}
                onClick={() => handlePageChange(1)}
            />,
            <Pagination.Prev 
                key="prev"
                disabled={currentPage === 1 || loading}
                onClick={() => handlePageChange(currentPage - 1)}
            />
        );

        // Hiển thị số trang
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(pagination.last_page, currentPage + 2);

        if (startPage > 1) {
            items.push(
                <Pagination.Item
                    key={1}
                    active={1 === currentPage}
                    onClick={() => handlePageChange(1)}
                >
                    1
                </Pagination.Item>
            );
            if (startPage > 2) {
                items.push(<Pagination.Ellipsis key="start-ellipsis" />);
            }
        }

        for (let number = startPage; number <= endPage; number++) {
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

        if (endPage < pagination.last_page) {
            if (endPage < pagination.last_page - 1) {
                items.push(<Pagination.Ellipsis key="end-ellipsis" />);
            }
            items.push(
                <Pagination.Item
                    key={pagination.last_page}
                    active={pagination.last_page === currentPage}
                    onClick={() => handlePageChange(pagination.last_page)}
                >
                    {pagination.last_page}
                </Pagination.Item>
            );
        }

        // Nút Next và Last
        items.push(
            <Pagination.Next
                key="next"
                disabled={currentPage === pagination.last_page || loading}
                onClick={() => handlePageChange(currentPage + 1)}
            />,
            <Pagination.Last
                key="last"
                disabled={currentPage === pagination.last_page || loading}
                onClick={() => handlePageChange(pagination.last_page)}
            />
        );

        return items;
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const handleShowPopup = (item) => {
        setSelectedItem(item);
        setShowPopup(true);
    };

    const handleClosePopup = () => {
        setShowPopup(false);
        setSelectedItem(null);
        fetchData();
        fetchSummary();
    };

    return (
        <AdminLayout>
            <div className="sp-container d-flex flex-column">
                <div className="sp-header mb-3">
                    <Row className="align-items-center">
                        <Col>
                            <h4>Thanh Toán Nhân Viên</h4>
                        </Col>
                        <Col md="auto">
                            <Form.Group>
                                <Form.Select
                                    value={filters.payment_status}
                                    onChange={(e) => setFilters({...filters, payment_status: e.target.value})}
                                    placeholder="Trạng thái Thanh Toán"
                                >
                                    <option value="">Tất cả</option>
                                    <option value="paid">Đã thanh toán</option>
                                    <option value="unpaid">Chưa thanh toán</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md="auto">
                            <Form.Group>
                                <Form.Control 
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                                    placeholder="Tìm kiếm"
                                />
                            </Form.Group>
                        </Col>
                        <Col md="auto">
                            <Button 
                                variant="primary" 
                                onClick={handleSearch}
                            >
                                Tìm kiếm
                            </Button>
                        </Col>
                    </Row>
                </div>
                <div className="summary">
                    <div className="summary-item">
                        <strong>Chưa thanh toán:</strong> {formatCurrency(summary.total_unpaid)}
                    </div>
                    <div className="summary-item">
                        <strong>Đã thanh toán:</strong> {formatCurrency(summary.total_paid)}
                    </div>
                    <div className="summary-item">
                        <strong>Tổng vé chưa thanh toán:</strong> {summary.total_unpaid_num}
                    </div>
                </div>
                <Card className="sp-data-grid flex-grow-1 overflow-hidden">
                    <Card.Body className="d-flex flex-column h-100">
                        {loading ? (
                            <p>Đang tải dữ liệu...</p>
                        ) : (
                            <>
                                <div className="table-responsive flex-grow-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                                    <Table striped bordered hover className="sp-table">
                                        <thead className="sticky-header">
                                            <tr>
                                                <th>STT</th>
                                                <th>Mã NV</th>
                                                <th>Tên NV</th>
                                                <th>CCCD</th>
                                                <th>Số tài khoản</th>
                                                <th>SL Vé</th>
                                                <th>Tổng tiền</th>
                                                <th>Đã thanh toán</th>
                                                <th>Chưa thanh toán</th>
                                                <th>Trạng thái</th>
                                                <th>Thanh toán</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.map((item, index) => {
                                                const totalCommission = parseFloat(item.total_commission || 0);
                                                const totalPaid = parseFloat(item.total_paid || 0);
                                                const total = totalCommission + totalPaid;
                                                const status = totalCommission == 0 ? 'Đã thanh toán' : 'Chưa thanh toán';

                                                return (
                                                    <tr key={index}>
                                                        <td className="text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                        <td className="text-center">{item.code}</td>
                                                        <td>{item.name}</td>
                                                        <td className="text-center">{item.card_id}</td>
                                                        <td>{item.bank_account} {item.bank_name}</td>
                                                        <td className="text-center">{item.checked_ticket_count}</td>
                                                        <td className={`text-right ${total > 0 ? 'text-success' : 'text-danger'}`}>
                                                            {formatCurrency(total)}
                                                        </td>
                                                        <td className={`text-right ${totalPaid > 0 ? 'text-success' : 'text-danger'}`}>
                                                            {formatCurrency(totalPaid)}
                                                        </td>
                                                        <td className={`text-right ${totalCommission > 0 ? 'text-danger' : 'text-success'}`}>
                                                            {formatCurrency(totalCommission)}
                                                        </td>
                                                        <td className={`text-center ${status === 'Đã thanh toán' ? 'text-success' : 'text-danger'}`}>
                                                            {status}
                                                        </td>
                                                        <td className="text-center">
                                                            <Button 
                                                                variant="success" 
                                                                size="sm" 
                                                                onClick={() => handleShowPopup(item)}
                                                            >
                                                                <FaMoneyCheckAlt />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </Table>
                                </div>
                                
                                {data.length > 0 && (
                                    <div className="mt-3 d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center">
                                            <Form.Group className="sp-form-group d-flex align-items-center me-3">
                                                <Form.Label className="me-2 mb-0">Hiển thị:</Form.Label>
                                                <Form.Select 
                                                    className="sp-form-select"
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
                                                Hiển thị {pagination.total > 0 ? `${(currentPage - 1) * itemsPerPage + 1} đến ${Math.min(currentPage * itemsPerPage, pagination.total)} trong tổng số ${pagination.total}` : '0-0 trong tổng số 0'} bản ghi
                                            </div>
                                        </div>
                                        <Pagination className="sp-pagination mb-0">
                                            {renderPaginationItems()}
                                        </Pagination>
                                    </div>
                                )}
                            </>
                        )}
                    </Card.Body>
                </Card>
            </div>
            {selectedItem && (
                <PaymentPopup 
                    show={showPopup} 
                    onClose={handleClosePopup} 
                    info={selectedItem}
                />
            )}
        </AdminLayout>
    );
};

export default StaffPayment; 