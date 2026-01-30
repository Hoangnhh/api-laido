import React, { useState, useEffect } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Pagination } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../../css/Report.css';

const BoatOperatorPaymentReport = () => {
    const today = new Date().toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        from_date: today,
        to_date: today,
        staff_search: '',
        ticket_type: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const pageSizeOptions = [10, 20, 50, 100];
    const [data, setData] = useState([]);
    const [ticketTypes, setTicketTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ total_quantity: 0, total_amount: 0 });

    useEffect(() => {
        fetchTicketTypes();
    }, []);

    const fetchTicketTypes = async () => {
        try {
            const response = await axios.get('/api/admin/get-ticket-types');
            if (response.data && response.data.success) {
                setTicketTypes(response.data.data);
            }
        } catch (error) {
            console.error('Loi khi tai danh sach loai ve:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/get-boat-operator-payment-report', { params: filters });
            if (response.data.success) {
                setData(response.data.data.items || []);
                setSummary(response.data.data.summary || { total_quantity: 0, total_amount: 0 });
            }
        } catch (error) {
            console.error('Loi khi tai du lieu:', error);
        }
        setLoading(false);
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchData();
    };

    const handleExportExcel = () => {
        // Tao URL voi params
        const params = new URLSearchParams({
            from_date: filters.from_date,
            to_date: filters.to_date
        });
        if (filters.staff_search) {
            params.append('staff_search', filters.staff_search);
        }
        if (filters.ticket_type) {
            params.append('ticket_type', filters.ticket_type);
        }

        // Mo URL de download file Excel
        window.open(`/api/admin/export-boat-operator-payment-report?${params.toString()}`, '_blank');
    };

    // Tinh toan du lieu cho trang hien tai
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

        items.push(
            <Pagination.Prev
                key="prev"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
            />
        );

        items.push(
            <Pagination.Item
                key={1}
                active={currentPage === 1}
                onClick={() => handlePageChange(1)}
            >
                1
            </Pagination.Item>
        );

        if (currentPage > 3) {
            items.push(<Pagination.Ellipsis key="ellipsis1" />);
        }

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

        if (currentPage < totalPages - 2) {
            items.push(<Pagination.Ellipsis key="ellipsis2" />);
        }

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
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    return (
        <AdminLayout>
            <div className="rp-container d-flex flex-column vh-100">
                <div className="rp-header">
                    <Card className="rp-filter-section mb-3">
                        <Card.Header>
                            <h4>Bang ke thanh toan ve lai do</h4>
                        </Card.Header>
                        <Card.Body>
                            <Form>
                                <Row className="mb-3">
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Tu ngay</Form.Label>
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
                                            <Form.Label>Den ngay</Form.Label>
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
                                            <Form.Label>Tim kiem lai do</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Nhap ma hoac ten lai do..."
                                                value={filters.staff_search}
                                                onChange={(e) => setFilters({...filters, staff_search: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Loai ve</Form.Label>
                                            <Form.Select
                                                value={filters.ticket_type}
                                                onChange={(e) => setFilters({...filters, ticket_type: e.target.value})}
                                            >
                                                <option value="">Tat ca</option>
                                                {ticketTypes.map((type, index) => (
                                                    <option key={index} value={type}>
                                                        {type}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col className="d-flex">
                                        <Button
                                            variant="primary"
                                            className="me-2"
                                            onClick={handleSearch}
                                        >
                                            Tim kiem
                                        </Button>
                                        <Button
                                            variant="success"
                                            onClick={handleExportExcel}
                                        >
                                            Xuat Excel
                                        </Button>
                                    </Col>
                                </Row>
                            </Form>
                        </Card.Body>
                    </Card>
                </div>

                <Card className="rp-data-grid flex-grow-1 overflow-hidden">
                    <Card.Body className="p-0">
                        {loading ? (
                            <div className="p-3">
                                <p>Dang tai du lieu...</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-container">
                                    <Table striped bordered hover className="rp-table mb-0">
                                        <thead>
                                            <tr>
                                                <th className="text-center" style={{minWidth: '60px'}}>STT</th>
                                                <th style={{minWidth: '80px'}}>So do</th>
                                                <th style={{minWidth: '200px'}}>Ten lai do</th>
                                                <th style={{minWidth: '250px'}}>Loai ve</th>
                                                <th className="text-end" style={{minWidth: '100px'}}>Menh gia</th>
                                                <th className="text-end" style={{minWidth: '80px'}}>So luong</th>
                                                <th className="text-end" style={{minWidth: '120px'}}>Thanh tien</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Dong tong */}
                                            {data.length > 0 && (
                                                <tr className="table-warning fw-bold">
                                                    <td></td>
                                                    <td></td>
                                                    <td>
                                                        {filters.from_date === filters.to_date
                                                            ? new Date(filters.from_date).toLocaleDateString('vi-VN')
                                                            : `${new Date(filters.from_date).toLocaleDateString('vi-VN')} - ${new Date(filters.to_date).toLocaleDateString('vi-VN')}`
                                                        }
                                                    </td>
                                                    <td></td>
                                                    <td></td>
                                                    <td className="text-end">{formatCurrency(summary.total_quantity)}</td>
                                                    <td className="text-end">{formatCurrency(summary.total_amount)}</td>
                                                </tr>
                                            )}
                                            {currentData.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="text-center">{item.stt}</td>
                                                    <td>{item.staff_code}</td>
                                                    <td>{item.staff_name}</td>
                                                    <td>{item.ticket_type} ({item.direction})</td>
                                                    <td className="text-end">{formatCurrency(item.price)}</td>
                                                    <td className="text-end">{formatCurrency(item.quantity)}</td>
                                                    <td className="text-end">{formatCurrency(item.total_amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>

                                {data.length > 0 && (
                                    <div className="pagination-container p-3 bg-white border-top">
                                        <div className="d-flex align-items-center">
                                            <Form.Group className="rp-form-group d-flex align-items-center me-3">
                                                <Form.Label className="me-2 mb-0">Hien thi:</Form.Label>
                                                <Form.Select
                                                    className="rp-form-select"
                                                    value={itemsPerPage}
                                                    onChange={handlePageSizeChange}
                                                    style={{ width: 'auto' }}
                                                >
                                                    {pageSizeOptions.map(size => (
                                                        <option key={size} value={size}>
                                                            {size} ban ghi
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </Form.Group>
                                            <div>
                                                Hien thi {(currentPage - 1) * itemsPerPage + 1} den {Math.min(currentPage * itemsPerPage, data.length)} trong tong so {data.length} ban ghi
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
            <style jsx>{`
                .rp-container {
                    padding: 24px;
                    height: 100vh;
                    overflow: hidden;
                }
                .rp-header {
                    margin-bottom: 1rem;
                }
                .table-container {
                    height: calc(100vh - 250px);
                    overflow-y: auto;
                    overflow-x: auto;
                }
                .table-container table {
                    margin-bottom: 0;
                }
                .table-container thead {
                    position: sticky;
                    top: 0;
                    z-index: 1;
                    background: white;
                }
                .pagination-container {
                    position: sticky;
                    bottom: 0;
                    z-index: 1;
                }
                .rp-table th {
                    white-space: nowrap;
                    background: #f8f9fa;
                }
                .rp-table td {
                    white-space: nowrap;
                }
            `}</style>
        </AdminLayout>
    );
};

export default BoatOperatorPaymentReport;
