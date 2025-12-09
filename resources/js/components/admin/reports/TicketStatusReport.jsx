import React, { useState, useEffect } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Pagination } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../../css/Report.css';
import * as XLSX from 'xlsx';

const TicketStatusReport = () => {
    // Lấy tháng/năm hiện tại
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;

    // Danh sách tháng tiếng Việt
    const months = [
        { value: 1, label: 'Tháng 1' },
        { value: 2, label: 'Tháng 2' },
        { value: 3, label: 'Tháng 3' },
        { value: 4, label: 'Tháng 4' },
        { value: 5, label: 'Tháng 5' },
        { value: 6, label: 'Tháng 6' },
        { value: 7, label: 'Tháng 7' },
        { value: 8, label: 'Tháng 8' },
        { value: 9, label: 'Tháng 9' },
        { value: 10, label: 'Tháng 10' },
        { value: 11, label: 'Tháng 11' },
        { value: 12, label: 'Tháng 12' }
    ];

    // Tạo danh sách năm (từ năm hiện tại trở về trước 5 năm)
    const years = [];
    for (let i = 0; i <= 5; i++) {
        years.push(currentYear - i);
    }

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonthNum, setSelectedMonthNum] = useState(currentMonthNum);

    // Hàm format date thành YYYY-MM-DD (tránh lỗi timezone)
    const formatDateToString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Hàm tính from_date và to_date từ tháng/năm được chọn
    const getDatesFromMonth = (year, month) => {
        if (!year || !month) return { from_date: '', to_date: '' };
        const fromDate = new Date(year, month - 1, 1);
        const toDate = new Date(year, month, 0); // Ngày cuối cùng của tháng

        return {
            from_date: formatDateToString(fromDate),
            to_date: formatDateToString(toDate)
        };
    };

    // Hàm format tháng/năm thành YYYY-MM
    const getMonthYearString = (year, month) => {
        return `${year}-${String(month).padStart(2, '0')}`;
    };

    const [filters, setFilters] = useState(() => {
        return getDatesFromMonth(currentYear, currentMonthNum);
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const pageSizeOptions = [10, 20, 50, 100];
    const [data, setData] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [statistics, setStatistics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingStatistics, setLoadingStatistics] = useState(false);
    const [viewMode, setViewMode] = useState('detail'); // 'detail' or 'statistics'

    // Hàm map dữ liệu từ response (PascalCase) sang format hiện tại (snake_case)
    const mapResponseData = (items) => {
        if (!items || items.length === 0) return [];

        return items.map(item => {
            // Map status sang status_text
            const statusMap = {
                'CLOSE': 'Đã sử dụng',
                'ACTIVE': 'Đang sử dụng',
                'INACTIVE': 'Chưa sử dụng'
            };

            return {
                id: item.ID,
                account_code: item.AccountCode,
                issued_date: item.IssuedDate ? new Date(item.IssuedDate).toISOString().split('T')[0] : '',
                expiration_date: item.ExpirationDate ? new Date(item.ExpirationDate).toISOString().split('T')[0] : '',
                total_money: item.TotalMoney || 0,
                status: item.Status,
                status_text: statusMap[item.Status] || item.Status,
                created_by: item.CreatedBy,
                created_date: item.CreatedDate ? new Date(item.CreatedDate).toISOString().split('T')[0] : '',
                sequence: item.Sequence,
                service_name: item.ServiceName || '',
                invoice_status: item.InvoiceStatus || '',
                invoice_code: item.InvoiceCode || '',
                invoice_number: item.InvoiceNumber || '',
                invoice_sign_date: item.InvoiceSignDate ? new Date(item.InvoiceSignDate).toISOString().split('T')[0] : '',
                invoice_created_date: item.InvoiceCreatedDate ? new Date(item.InvoiceCreatedDate).toISOString().split('T')[0] : ''
            };
        });
    };

    const fetchData = async (page = currentPage, pageSize = itemsPerPage, dates = null) => {
        // Sử dụng dates được truyền vào hoặc lấy từ filters
        const fromDate = dates?.from_date || filters.from_date;
        const toDate = dates?.to_date || filters.to_date;

        // Kiểm tra fromDate và toDate trước khi gọi API
        if (!fromDate || !toDate) {
            alert('Vui lòng chọn tháng và năm để tìm kiếm.');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get('/api/admin/get-ticket-status-report', {
                params: {
                    from_date: fromDate,
                    to_date: toDate,
                    pageNumber: page,
                    pageSize: pageSize
                }
            });

            // Kiểm tra response có success: false
            if (response.data && response.data.success === false) {
                alert(response.data.message || 'Có lỗi xảy ra khi lấy dữ liệu');
                setData([]);
                setTotalCount(0);
                setLoading(false);
                return;
            }

            // Response là mảng trực tiếp
            if (Array.isArray(response.data) && response.data.length > 0) {
                const mappedData = mapResponseData(response.data);
                setData(mappedData);
                // Lấy totalCount từ item đầu tiên
                setTotalCount(response.data[0].totalCount || 0);
            } else if (Array.isArray(response.data)) {
                setData([]);
                setTotalCount(0);
            } else if (response.data && response.data.success && response.data.data) {
                // Fallback cho format cũ nếu API vẫn trả về format cũ
                const mappedData = mapResponseData(response.data.data || []);
                setData(mappedData);
                setTotalCount(mappedData.length);
            } else {
                alert(response.data?.message || 'Có lỗi xảy ra khi lấy dữ liệu');
                setData([]);
                setTotalCount(0);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi lấy dữ liệu';
            alert(errorMessage);
            setData([]);
            setTotalCount(0);
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

    const handleYearChange = (year) => {
        const newYear = parseInt(year);
        setSelectedYear(newYear);
        const dates = getDatesFromMonth(newYear, selectedMonthNum);
        setFilters(dates);
    };

    const handleMonthChange = (month) => {
        const newMonth = parseInt(month);
        setSelectedMonthNum(newMonth);
        const dates = getDatesFromMonth(selectedYear, newMonth);
        setFilters(dates);
    };

    const handleSearch = () => {
        if (!selectedYear || !selectedMonthNum) {
            alert('Vui lòng chọn tháng và năm để tìm kiếm.');
            return;
        }

        // Kiểm tra không được chọn tháng tương lai
        if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonthNum > currentMonthNum)) {
            alert('Không thể chọn tháng trong tương lai.');
            return;
        }

        // Tính toán lại dates và cập nhật filters
        const dates = getDatesFromMonth(selectedYear, selectedMonthNum);
        setFilters(dates);
        setCurrentPage(1);
        setViewMode('detail'); // Mặc định hiển thị chi tiết

        // Gọi fetchData với dates mới
        fetchData(1, itemsPerPage, dates);
    };

    const handleViewStatistics = () => {
        if (!selectedYear || !selectedMonthNum) {
            alert('Vui lòng chọn tháng và năm để xem thống kê.');
            return;
        }

        // Kiểm tra không được chọn tháng tương lai
        if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonthNum > currentMonthNum)) {
            alert('Không thể chọn tháng trong tương lai.');
            return;
        }

        setViewMode('statistics');
        fetchStatistics();
    };

    const handleViewDetail = () => {
        setViewMode('detail');
    };

    const handleExportExcel = async () => {
        try {
            // Gọi API với pageSize lớn để lấy tất cả dữ liệu cho Excel
            const response = await axios.get('/api/admin/get-ticket-status-report', {
                params: {
                    from_date: filters.from_date,
                    to_date: filters.to_date,
                    pageNumber: 1,
                    pageSize: totalCount || 10000 // Lấy tất cả hoặc số lớn
                }
            });

            let allData = [];
            if (Array.isArray(response.data) && response.data.length > 0) {
                allData = mapResponseData(response.data);
            } else if (response.data.success && response.data.data) {
                allData = mapResponseData(response.data.data);
            }

            if (allData.length === 0) {
                alert('Không có dữ liệu để xuất Excel.');
                return;
            }

            const excelData = allData.map((item, index) => ({
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

            XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo trạng thái vé theo ngày in');
            XLSX.writeFile(wb, `bao_cao_trang_thai_ve_${filters.from_date}_${filters.to_date}.xlsx`);
        } catch (error) {
            console.error('Error exporting Excel:', error);
            alert('Có lỗi xảy ra khi xuất Excel: ' + (error.response?.data?.message || error.message));
        }
    };

    // Tính toán số trang dựa trên totalCount
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    // Dữ liệu hiện tại là dữ liệu đã được phân trang từ server
    const currentData = data;

    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value);
        setItemsPerPage(newSize);
        setCurrentPage(1);
        // Gọi lại fetchData với page size mới
        if (filters.from_date && filters.to_date) {
            fetchData(1, newSize);
        }
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        // Gọi lại fetchData với trang mới
        if (filters.from_date && filters.to_date) {
            fetchData(pageNumber, itemsPerPage);
        }
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
                            <h4>Báo cáo trạng thái vé theo ngày in</h4>
                        </Card.Header>
                        <Card.Body>
                            <Form>
                                <Row>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">
                                                <i className="bi bi-calendar3 me-2"></i>Chọn tháng
                                            </Form.Label>
                                            <Form.Select
                                                value={selectedMonthNum}
                                                onChange={(e) => handleMonthChange(e.target.value)}
                                                className="form-select-lg"
                                                style={{
                                                    fontSize: '1rem',
                                                    padding: '0.5rem 1rem',
                                                    border: '2px solid #dee2e6',
                                                    borderRadius: '0.375rem',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onFocus={(e) => e.target.style.borderColor = '#0d6efd'}
                                                onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
                                            >
                                                {months.map((month) => (
                                                    <option
                                                        key={month.value}
                                                        value={month.value}
                                                        disabled={
                                                            selectedYear === currentYear &&
                                                            month.value > currentMonthNum
                                                        }
                                                    >
                                                        {month.label}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">
                                                <i className="bi bi-calendar-year me-2"></i>Chọn năm
                                            </Form.Label>
                                            <Form.Select
                                                value={selectedYear}
                                                onChange={(e) => handleYearChange(e.target.value)}
                                                className="form-select-lg"
                                                style={{
                                                    fontSize: '1rem',
                                                    padding: '0.5rem 1rem',
                                                    border: '2px solid #dee2e6',
                                                    borderRadius: '0.375rem',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onFocus={(e) => e.target.style.borderColor = '#0d6efd'}
                                                onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
                                            >
                                                {years.map((year) => (
                                                    <option key={year} value={year}>
                                                        Năm {year}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6} className="d-flex align-items-center">
                                        <div className="d-flex align-items-center justify-content-end w-100">
                                            <Button
                                                variant="primary"
                                                className="me-2 px-4"
                                                onClick={handleSearch}
                                                disabled={loading}
                                                style={{
                                                    minWidth: '120px',
                                                    fontWeight: '500',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                <i className="bi bi-search me-2"></i>
                                                {loading ? 'Đang tải...' : 'Tìm kiếm'}
                                            </Button>
                                            <Button
                                                variant="info"
                                                className="me-2 px-4"
                                                onClick={handleViewStatistics}
                                                disabled={loadingStatistics}
                                                style={{
                                                    minWidth: '140px',
                                                    fontWeight: '500',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                <i className="bi bi-bar-chart me-2"></i>
                                                {loadingStatistics ? 'Đang tải...' : 'Xem thống kê'}
                                            </Button>
                                            <Button
                                                variant="success"
                                                className="px-4"
                                                onClick={handleExportExcel}
                                                disabled={totalCount === 0 || loading || viewMode === 'statistics'}
                                                style={{
                                                    minWidth: '130px',
                                                    fontWeight: '500',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                <i className="bi bi-file-earmark-excel me-2"></i>
                                                Xuất Excel
                                            </Button>
                                        </div>
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
                                                    Hiển thị {(currentPage - 1) * itemsPerPage + 1} đến {Math.min(currentPage * itemsPerPage, totalCount)} trong tổng số {totalCount.toLocaleString('vi-VN')} bản ghi
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

