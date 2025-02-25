import React, { useState, useEffect } from 'react';
import AdminLayout from './Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Pagination } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faMoneyCheckAlt } from '@fortawesome/free-solid-svg-icons';

const PaymentAll = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [pagination, setPagination] = useState({});
    const [summary, setSummary] = useState({
        total_unpaid_tickets: 0,
        total_unpaid_amount: 0
    });
    const [search, setSearch] = useState('');
    const pageSizeOptions = [20, 50, 100, 200];

    useEffect(() => {
        fetchData();
    }, [currentPage, perPage]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/get-payment-all-data', {
                params: {
                    page: currentPage,
                    per_page: perPage
                }
            });

            if (response.data.success) {
                setData(response.data.data.items);
                setPagination(response.data.data.pagination);
                setSummary(response.data.data.summary);
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.last_page && !loading) {
            setCurrentPage(newPage);
        }
    };

    const handlePerPageChange = (e) => {
        setPerPage(parseInt(e.target.value));
        setCurrentPage(1);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
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

    return (
        <AdminLayout>
            <div className="pa-container">
                <div className="pa-header">
                    <Row className="align-items-center mb-3">
                        <Col>
                            <h4>Danh Sách Thanh Toán</h4>
                        </Col>
                        <Col md="auto">
                            <Form.Control 
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </Col>
                        <Col md="auto">
                            <Button 
                                variant="primary" 
                                onClick={fetchData}
                            >
                                <FontAwesomeIcon icon={faSearch} /> Tìm kiếm
                            </Button>
                        </Col>
                    </Row>
                </div>

                <Card>
                    <Card.Body>
                        <div className="table-responsive">
                            <Table striped bordered hover>
                                <thead>
                                    <tr>
                                        <th className="text-center">STT</th>
                                        <th>Mã NV</th>
                                        <th>Tên nhân viên</th>
                                        <th>CCCD</th>
                                        <th>Số tài khoản</th>
                                        <th className="text-center">Số vé chưa TT</th>
                                        <th className="text-end">Số tiền chưa TT</th>
                                        <th className="text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" className="text-center">Đang tải dữ liệu...</td>
                                        </tr>
                                    ) : data.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center">Không có dữ liệu</td>
                                        </tr>
                                    ) : (
                                        data.map((item, index) => (
                                            <tr key={item.id}>
                                                <td className="text-center">
                                                    {(currentPage - 1) * perPage + index + 1}
                                                </td>
                                                <td>{item.code}</td>
                                                <td>{item.name}</td>
                                                <td>{item.card_id}</td>
                                                <td>{item.bank_account} {item.bank_name}</td>
                                                <td className="text-center">{item.unpaid_ticket_count}</td>
                                                <td className="text-end">
                                                    {formatCurrency(item.total_unpaid_amount)}
                                                </td>
                                                <td className="text-center">
                                                    <Button 
                                                        variant="success" 
                                                        size="sm"
                                                        disabled={item.total_unpaid_amount <= 0}
                                                    >
                                                        <FontAwesomeIcon icon={faMoneyCheckAlt} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </div>

                        {data.length > 0 && (
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <div className="d-flex align-items-center">
                                    <Form.Group className="d-flex align-items-center me-3">
                                        <Form.Label className="me-2 mb-0">Hiển thị:</Form.Label>
                                        <Form.Select 
                                            value={perPage}
                                            onChange={handlePerPageChange}
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
                                        Hiển thị {pagination.total > 0 ? 
                                            `${(currentPage - 1) * perPage + 1} đến ${Math.min(currentPage * perPage, pagination.total)} trong tổng số ${pagination.total}` 
                                            : '0-0 trong tổng số 0'} bản ghi
                                    </div>
                                </div>
                                <Pagination className="mb-0">
                                    {renderPaginationItems()}
                                </Pagination>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </div>

            <style jsx>{`
                .pa-container {
                    padding: 24px;
                }
                .pa-header {
                    margin-bottom: 24px;
                }
                .table th {
                    background-color: #f8f9fa;
                }
                .table-responsive {
                    min-height: 300px;
                }
            `}</style>
        </AdminLayout>
    );
};

export default PaymentAll; 