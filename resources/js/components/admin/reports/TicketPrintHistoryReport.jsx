import React, { useState, useEffect } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Pagination } from 'react-bootstrap';
import axios from 'axios';
import * as XLSX from 'xlsx';

const TicketPrintHistoryReport = () => {
    const [filters, setFilters] = useState({
        from_date: new Date().toISOString().split('T')[0]
    });
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const pageSizeOptions = [10, 20, 50, 100];

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`https://transfer.invade.vn/api/TicketPrintHistory?date=${filters.from_date}`);

            if (response.data) {
                setData(response.data);
            } else {
                console.error('Dữ liệu không hợp lệ:', response.data);
                setData([]);
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
            setData([]);
        }
        setLoading(false);
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchData();
    };

    // Tính toán dữ liệu cho trang hiện tại
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const currentData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value);
        setItemsPerPage(newSize);
        setCurrentPage(1); // Reset về trang đầu khi thay đổi kích thước trang
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

    const handleExportExcel = () => {
        const excelData = data.map((item, index) => ({
            'STT': index + 1,
            'Tên dịch vụ': item.ticketName,
            'Mã vé': item.TicketCode,
            'Mã hóa đơn': item.bookingCode,
            'Thời gian in': new Date(item.printTime).toLocaleString('vi-VN'),
            'Trạng thái': item.status,
            'Tổng tiền': item.TotalAmount,
            'Tên đơn vị': item.Organization,
            'Người in': item.fullName,
            'Số lần in': item.printCount
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Định nghĩa độ rộng cột
        const colWidths = [
            { wch: 5 },  // STT
            { wch: 30 }, // Tên dịch vụ
            { wch: 15 }, // Mã vé
            { wch: 15 }, // Mã hóa đơn
            { wch: 20 }, // Thời gian in
            { wch: 15 }, // Trạng thái
            { wch: 15 }, // Tổng tiền
            { wch: 30 }, // Tên đơn vị
            { wch: 20 }, // Người in
            { wch: 10 }  // Số lần in
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo lịch sử in vé');
        XLSX.writeFile(wb, `bao_cao_lich_su_in_ve_${filters.from_date}.xlsx`);
    };

    return (
        <AdminLayout>
            <div className="rp-container d-flex flex-column vh-100">
                <div className="rp-header">
                    <Card className="rp-filter-section mb-3">
                        <Card.Header>
                            <h4>Báo cáo lịch sử in lại vé</h4>
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
                                            />
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

                <Card className="rp-data-grid flex-grow-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                    <Card.Body>
                    {loading ? (
            <p>Đang tải dữ liệu...</p>
        ) : data.length === 0 ? ( // Kiểm tra nếu không có dữ liệu
            <p>Không có dữ liệu để hiển thị.</p>
        ) : (
                            <div className="table-responsive">
                                <Table striped bordered hover className="rp-table">
                                    <thead>
                                        <tr>
                                            <th className="text-center">STT</th>
                                            <th>Tên dịch vụ</th>
                                            <th>Mã vé</th>
                                            <th>Mã hóa đơn</th>
                                            <th>Thời gian in</th>
                                            <th>Trạng thái</th>
                                            <th>Tổng tiền</th>
                                            <th>Tên đơn vị</th>
                                            <th>Người in</th>
                                            <th>Số lần in</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((item, index) => (
                                            <tr key={index}>
                                                <td className="text-center">{index + 1}</td>
                                                <td>{item.ticketName}</td>
                                                <td>{item.TicketCode}</td>
                                                <td>{item.bookingCode}</td>
                                                <td>{new Date(item.printTime).toLocaleString('vi-VN')}</td>
                                                <td>{item.status}</td>
                                                <td>
                                                    {new Intl.NumberFormat('vi-VN', { 
                                                        style: 'currency', 
                                                        currency: 'VND' 
                                                    }).format(item.TotalAmount)}
                                                </td>
                                                <td>{item.Organization}</td>
                                                <td>{item.fullName}</td>
                                                <td>{item.printCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default TicketPrintHistoryReport;