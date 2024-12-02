import React, { useState, useEffect } from 'react';
import AdminLayout from './Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Pagination } from 'react-bootstrap';
import axios from 'axios';
import '../../../css/StaffPayment.css';
import { FaMoneyCheckAlt } from 'react-icons/fa';

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

    useEffect(() => {
        fetchSummary();
    }, []);

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
            setCurrentPage(response.data.current_page);
            setTotalItems(response.data.total);
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
        setItemsPerPage(parseInt(e.target.value));
        setCurrentPage(1);
        fetchData();
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        fetchData();
    };

    const renderPaginationItems = () => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        let items = [];
        items.push(
            <Pagination.Prev 
                key="prev"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
            />
        );

        if (totalPages <= 10) {
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
        } else {
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, currentPage + 2);

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

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    items.push(<Pagination.Ellipsis key="end-ellipsis" />);
                }
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

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    return (
        <AdminLayout>
            <div className="sp-container d-flex flex-column vh-100">
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
                                    placeholder="Tìm kiếm theo tên"
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
                                                const unpaid = totalCommission - totalPaid;
                                                const status = totalPaid >= totalCommission ? 'Đã thanh toán' : 'Chưa thanh toán';

                                                return (
                                                    <tr key={index}>
                                                        <td className="text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                        <td className="text-center">{item.code}</td>
                                                        <td>{item.name}</td>
                                                        <td className="text-center">{item.card_id}</td>
                                                        <td>{item.bank_account} {item.bank_name}</td>
                                                        <td className={`text-center ${totalCommission > 0 ? 'text-success' : 'text-danger'}`}>
                                                            {formatCurrency(totalCommission)}
                                                        </td>
                                                        <td className={`text-center ${totalPaid > 0 ? 'text-success' : 'text-danger'}`}>
                                                            {formatCurrency(totalPaid)}
                                                        </td>
                                                        <td className={`text-center ${unpaid > 0 ? 'text-danger' : 'text-success'}`}>
                                                            {formatCurrency(unpaid)}
                                                        </td>
                                                        <td className={`text-center ${status === 'Đã thanh toán' ? 'text-success' : 'text-danger'}`}>
                                                            {status}
                                                        </td>
                                                        <td className="text-center">
                                                            <Button variant="success" size="sm">
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
                                                Hiển thị {(currentPage - 1) * itemsPerPage + 1} đến {Math.min(currentPage * itemsPerPage, totalItems)} trong tổng số {totalItems} bản ghi
                                            </div>
                                        </div>
                                        <Pagination className="sp-pagination">{renderPaginationItems()}</Pagination>
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

export default StaffPayment; 