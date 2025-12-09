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
    const [statistics, setStatistics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingStatistics, setLoadingStatistics] = useState(false);
    const [viewMode, setViewMode] = useState('detail'); // 'detail' or 'statistics'

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

    const fetchStatistics = async () => {
        setLoadingStatistics(true);
        try {
            const response = await axios.get('/api/admin/get-ticket-status-statistics', {
                params: {
                    from_date: filters.from_date,
                    to_date: filters.to_date
                }
            });

            if (response.data.success) {
                setStatistics(response.data.data || []);
            } else {
                console.error('Error fetching statistics:', response.data.message);
                setStatistics([]);
            }
        } catch (error) {
            console.error('Error fetching statistics:', error);
            setStatistics([]);
        } finally {
            setLoadingStatistics(false);
        }
    };

    const handleSearch = () => {
        // Kiểm tra khoảng thời gian không quá 1 tháng
        const fromDate = new Date(filters.from_date);
        const toDate = new Date(filters.to_date);
        const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

        if (daysDiff > 31) {
            alert('Khoảng thời gian truy vấn không được vượt quá 1 tháng (31 ngày). Vui lòng chọn lại khoảng thời gian.');
            return;
        }

        if (daysDiff < 0) {
            alert('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
            return;
        }

        setCurrentPage(1);
        setViewMode('detail'); // Mặc định hiển thị chi tiết
        fetchData();
    };

    const handleViewStatistics = () => {
        // Kiểm tra khoảng thời gian không quá 1 tháng
        const fromDate = new Date(filters.from_date);
        const toDate = new Date(filters.to_date);
        const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

        if (daysDiff > 31) {
            alert('Khoảng thời gian truy vấn không được vượt quá 1 tháng (31 ngày). Vui lòng chọn lại khoảng thời gian.');
            return;
        }

        if (daysDiff < 0) {
            alert('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
            return;
        }

        setViewMode('statistics');
        fetchStatistics();
    };

    const handleViewDetail = () => {
        setViewMode('detail');
    };

    const handleExportExcel = () => {
        const excelData = data.map((item, index) => ({
            'STT': index + 1,
            'Mã vé': item.account_code,
            'Ngày phát hành': item.issued_date,
            'Ngày hết hạn': item.expiration_date,
            'Tổng tiền': item.total_money,
            'Trạng thái': item.status_text,
            'Tên dịch vụ': item.service_name || '',
            'Người tạo': item.created_by,
            'Ngày in': item.created_date,
            'Thứ tự': item.sequence,
            'Trạng thái hóa đơn': item.invoice_status,
            'Mã hóa đơn': item.invoice_code || '',
            'Số hóa đơn': item.invoice_number || '',
            'Ngày ký hóa đơn': item.invoice_sign_date || '',
            'Ngày tạo hóa đơn': item.invoice_created_date || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        const colWidths = [
            { wch: 5 },   // STT
            { wch: 15 },  // Mã vé
            { wch: 15 },  // Ngày phát hành
            { wch: 15 },  // Ngày hết hạn
            { wch: 15 },  // Tổng tiền
            { wch: 15 },  // Trạng thái
            { wch: 30 },  // Tên dịch vụ
            { wch: 15 },  // Người tạo
            { wch: 18 },  // Ngày in
            { wch: 10 },  // Thứ tự
            { wch: 20 },  // Trạng thái hóa đơn
            { wch: 15 },  // Mã hóa đơn
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
                                                onChange={(e) => {
                                                    const newFromDate = e.target.value;
                                                    const fromDate = new Date(newFromDate);
                                                    const toDate = new Date(filters.to_date);
                                                    const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

                                                    if (daysDiff > 31) {
                                                        // Tự động điều chỉnh đến ngày về 31 ngày từ ngày bắt đầu mới
                                                        const maxDate = new Date(fromDate);
                                                        maxDate.setDate(maxDate.getDate() + 31);
                                                        setFilters({
                                                            from_date: newFromDate,
                                                            to_date: maxDate.toISOString().split('T')[0]
                                                        });
                                                        alert('Khoảng thời gian không được vượt quá 1 tháng (31 ngày). Đã tự động điều chỉnh đến ngày.');
                                                    } else if (daysDiff < 0) {
                                                        // Nếu từ ngày lớn hơn đến ngày, tự động điều chỉnh đến ngày
                                                        const maxDate = new Date(fromDate);
                                                        maxDate.setDate(maxDate.getDate() + 31);
                                                        setFilters({
                                                            from_date: newFromDate,
                                                            to_date: maxDate.toISOString().split('T')[0]
                                                        });
                                                    } else {
                                                        setFilters({...filters, from_date: newFromDate});
                                                    }
                                                }}
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
                                                onChange={(e) => {
                                                    const newToDate = e.target.value;
                                                    const fromDate = new Date(filters.from_date);
                                                    const toDate = new Date(newToDate);
                                                    const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

                                                    if (daysDiff > 31) {
                                                        // Tự động điều chỉnh về 31 ngày từ ngày bắt đầu
                                                        const maxDate = new Date(fromDate);
                                                        maxDate.setDate(maxDate.getDate() + 31);
                                                        setFilters({
                                                            ...filters,
                                                            to_date: maxDate.toISOString().split('T')[0]
                                                        });
                                                        alert('Khoảng thời gian không được vượt quá 1 tháng (31 ngày). Đã tự động điều chỉnh đến ngày.');
                                                    } else {
                                                        setFilters({...filters, to_date: newToDate});
                                                    }
                                                }}
                                                min={filters.from_date}
                                                max={(() => {
                                                    if (filters.from_date) {
                                                        const maxDate = new Date(filters.from_date);
                                                        maxDate.setDate(maxDate.getDate() + 31);
                                                        return maxDate.toISOString().split('T')[0];
                                                    }
                                                    return '';
                                                })()}
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
                                            variant="info"
                                            className="me-2"
                                            onClick={handleViewStatistics}
                                            disabled={loadingStatistics}
                                        >
                                            {loadingStatistics ? 'Đang tải...' : 'Xem thống kê'}
                                        </Button>
                                        <Button
                                            variant="success"
                                            onClick={handleExportExcel}
                                            disabled={data.length === 0 || loading || viewMode === 'statistics'}
                                        >
                                            Xuất Excel
                                        </Button>
                                    </Col>
                                </Row>
                            </Form>
                        </Card.Body>
                    </Card>
                </div>

                {/* Phần thống kê - chỉ hiển thị khi viewMode = 'statistics' */}
                {viewMode === 'statistics' && (
                    <Card className="rp-statistics-section mb-3">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h5>Thống kê theo dịch vụ</h5>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleViewDetail}
                            >
                                Xem chi tiết
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            {loadingStatistics ? (
                                <div className="text-center py-5">
                                    <p>Đang tải thống kê...</p>
                                </div>
                            ) : (
                                <>
                                    {statistics.length === 0 ? (
                                        <div className="text-center py-5">
                                            <p>Không có dữ liệu thống kê để hiển thị.</p>
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <Table striped bordered hover className="rp-table">
                                                <thead>
                                                    <tr>
                                                        <th className="text-center">STT</th>
                                                        <th>Tên dịch vụ</th>
                                                        <th className="text-end">Tổng số vé</th>
                                                        <th className="text-end">Đã tạo hóa đơn</th>
                                                        <th className="text-end">Chưa tạo hóa đơn</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {statistics.map((item, index) => (
                                                        <tr key={index}>
                                                            <td className="text-center">{index + 1}</td>
                                                            <td>{item.service_name || '-'}</td>
                                                            <td className="text-end">{item.total_tickets.toLocaleString('vi-VN')}</td>
                                                            <td className="text-end">
                                                                <span className="text-success">
                                                                    {item.invoice_created.toLocaleString('vi-VN')}
                                                                </span>
                                                            </td>
                                                            <td className="text-end">
                                                                <span className="text-warning">
                                                                    {item.invoice_not_created.toLocaleString('vi-VN')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="fw-bold">
                                                        <td colSpan="2" className="text-end">Tổng cộng:</td>
                                                        <td className="text-end">
                                                            {statistics.reduce((sum, item) => sum + (item.total_tickets || 0), 0).toLocaleString('vi-VN')}
                                                        </td>
                                                        <td className="text-end">
                                                            <span className="text-success">
                                                                {statistics.reduce((sum, item) => sum + (item.invoice_created || 0), 0).toLocaleString('vi-VN')}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <span className="text-warning">
                                                                {statistics.reduce((sum, item) => sum + (item.invoice_not_created || 0), 0).toLocaleString('vi-VN')}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </Table>
                                        </div>
                                    )}
                                </>
                            )}
                        </Card.Body>
                    </Card>
                )}

                {/* Phần chi tiết - chỉ hiển thị khi viewMode = 'detail' */}
                {viewMode === 'detail' && (
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
                                                        <th>Mã vé</th>
                                                        <th>Ngày phát hành</th>
                                                        <th>Ngày hết hạn</th>
                                                        <th className="text-end">Tổng tiền</th>
                                                        <th>Trạng thái</th>
                                                        <th>Tên dịch vụ</th>
                                                        <th>Người tạo</th>
                                                        <th>Ngày in</th>
                                                        <th className="text-center">Thứ tự</th>
                                                        <th>Trạng thái hóa đơn</th>
                                                        <th>Mã hóa đơn</th>
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
                                                            <td>{item.service_name || '-'}</td>
                                                            <td>{item.created_by}</td>
                                                            <td className="text-center">{item.created_date}</td>
                                                            <td className="text-center">{item.sequence}</td>
                                                            <td>{item.invoice_status}</td>
                                                            <td>{item.invoice_code || '-'}</td>
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
                )}
            </div>
        </AdminLayout>
    );
};

export default TicketStatusReport;

