import React, { useState, useEffect } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Pagination } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../../css/Report.css';
import * as XLSX from 'xlsx';

const WaitingListForCheckinReport = () => {
    const today = new Date().toISOString().split('T')[0];
    
    const [filters, setFilters] = useState({
        from_date: today,
        to_date: today,
        staff_group_id: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const pageSizeOptions = [10, 20, 50, 100];

    const [data, setData] = useState([]);
    const [staffGroups, setStaffGroups] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStaffGroups();
    }, []);

    const fetchStaffGroups = async () => {
        try {
            const response = await axios.get('/api/admin/staff-groups');
            if (response.data) {
                setStaffGroups(response.data);
            }
        } catch (error) {
            console.error('Error fetching staff groups:', error);
            setStaffGroups([]);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/get-waiting-staffs', { params: filters });
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

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value);
        setItemsPerPage(newSize);
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const currentData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

    const handleExportExcel = () => {
        const excelData = data.map((item, index) => ({
            'STT': index + 1,
            'Mã đò': item.staff_code,
            'Tên lái đò': item.staff_name,
            'Nhóm': item.staff_group_name,
            'Ngày phân ca': item.date_display,
            'Trạng thái': item.status
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        const colWidths = [
            { wch: 5 },  // STT
            { wch: 10 }, // Mã đò
            { wch: 25 }, // Tên lái đò
            { wch: 20 }, // Nhóm
            { wch: 15 }, // Ngày phân ca
            { wch: 15 }, // Trạng thái
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách chờ checkin');

        const today = new Date();
        const fileName = `danh_sach_cho_checkin_${today.getDate()}${today.getMonth() + 1}${today.getFullYear()}.xlsx`;

        XLSX.writeFile(wb, fileName);
    };

    return (
        <AdminLayout>
            <div className="rp-container d-flex flex-column vh-100">
                <div className="rp-header">
                    <Card className="rp-filter-section mb-3">
                        <Card.Header>
                            <h4>Danh sách Lái đò chờ Checkin</h4>
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
                                            <Form.Label>Nhóm</Form.Label>
                                            <Form.Select
                                                value={filters.staff_group_id}
                                                onChange={(e) => setFilters({...filters, staff_group_id: e.target.value})}
                                            >
                                                <option value="">Tất cả</option>
                                                {Array.isArray(staffGroups) && staffGroups.map(group => (
                                                    <option key={group.id} value={group.id}>
                                                        {group.name}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3} className="d-flex align-items-end">
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
                                                <th>Mã đò</th>
                                                <th>Tên lái đò</th>
                                                <th>Nhóm</th>
                                                <th>Ngày phân ca</th>
                                                <th>Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentData.map((item, index) => (
                                                <tr key={item.id}>
                                                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                    <td>{item.staff_code}</td>
                                                    <td>{item.staff_name}</td>
                                                    <td>{item.staff_group_name}</td>
                                                    <td className="text-center">{item.date_display}</td>
                                                    <td className="text-center">{item.status}</td>
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

export default WaitingListForCheckinReport; 