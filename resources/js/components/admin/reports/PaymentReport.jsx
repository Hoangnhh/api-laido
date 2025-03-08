import React, { useState, useEffect } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table, Modal, Pagination } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../../css/Report.css';
import * as XLSX from 'xlsx';

const PaymentReport = () => {
    const today = new Date().toISOString().split('T')[0];
    
    const [filters, setFilters] = useState({
        from_date: today,
        to_date: today,
        payment_code: '',
        staff_code: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const pageSizeOptions = [10, 20, 50, 100];
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/get-payment-report', { params: filters });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
        }
        setLoading(false);
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchData();
    };

    const handleExportExcel = () => {
        // Chuẩn bị dữ liệu cho Excel
        const excelData = data.map((item, index) => ({
            'STT': index + 1,
            'Dịch vụ': 'HYR',
            'Số TK nguồn': '2205555556868',
            'Số TK thụ hưởng': item.received_account || '',
            'Tên TK thụ hưởng': item.staff_name,
            'Tên viết tắt ngân hàng thụ hưởng': '',
            'Tên ngân hàng thụ hưởng': '',
            'Tên chi nhánh ngân hàng thụ hưởng': '',
            'Loại tiền': 'VND',
            'Số tiền': item.amount,
            'Số tham chiếu KH': '',
            'Ghi chú': 'Chuyen khoan noi bo',
            'Ngày giao dịch': item.payment_date,
            'Số đò': item.code,
            'SĐT': item.username,
            'CCCD': item.card_id
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData, { header: Object.keys(excelData[0]) });

        // Định dạng các cột
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let C = range.s.c; C <= range.e.c; C++) {
            const address = XLSX.utils.encode_col(C) + "1";
            if (!ws[address]) continue;
            ws[address].s = {
                font: { bold: true },
                alignment: { horizontal: "center", vertical: "center" },
                fill: { fgColor: { rgb: "CCCCCC" } }
            };
        }

        // Định dạng từng cột
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
            // STT - căn giữa
            ws[XLSX.utils.encode_cell({r: R, c: 0})].s = {
                alignment: { horizontal: "center" }
            };

            // Số tiền - căn phải và định dạng số
            const amountCell = XLSX.utils.encode_cell({r: R, c: 9});
            ws[amountCell].s = {
                alignment: { horizontal: "right" },
                numFmt: "#,##0"
            };
            
            // Các cột khác - căn trái
            for (let C of [1,2,3,4,5,6,7,8,10,11,12]) {
                ws[XLSX.utils.encode_cell({r: R, c: C})].s = {
                    alignment: { horizontal: "left" }
                };
            }
        }

        // Thiết lập độ rộng cột
        ws['!cols'] = [
            { wch: 5 },   // STT
            { wch: 10 },  // Dịch vụ
            { wch: 15 },  // Số TK nguồn
            { wch: 15 },  // Số TK thụ hưởng
            { wch: 30 },  // Tên TK thụ hưởng
            { wch: 15 },  // Tên viết tắt ngân hàng
            { wch: 20 },  // Tên ngân hàng
            { wch: 25 },  // Tên chi nhánh
            { wch: 10 },  // Loại tiền
            { wch: 15 },  // Số tiền
            { wch: 15 },  // Số tham chiếu
            { wch: 25 },  // Ghi chú
            { wch: 15 },  // Ngày giao dịch
            { wch: 15 },  // Số đò
            { wch: 15 },  // SĐT
            { wch: 15 }   // CCCD
        ];

        // Thiết lập chiều cao hàng
        ws['!rows'] = [{ hpt: 25 }]; // Chiều cao cho hàng tiêu đề

        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách chuyển khoản');
        XLSX.writeFile(wb, `danh_sach_chuyen_khoan_${filters.from_date}_${filters.to_date}.xlsx`);
    };

    const handleShowTickets = (payment) => {
        setSelectedPayment(payment);
        setShowTicketModal(true);
    };

    const TicketDetailsModal = () => {
        if (!selectedPayment) return null;

        return (
            <Modal 
                show={showTicketModal} 
                onHide={() => setShowTicketModal(false)}
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Chi tiết thanh toán #{selectedPayment.payment_code}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <strong>Nhân viên:</strong> {selectedPayment.staff_code} - {selectedPayment.staff_name}<br />
                        <strong>Ngày:</strong> {selectedPayment.payment_date}<br />
                        <strong>Hình thức:</strong> {selectedPayment.payment_method}<br />
                        <strong>Tổng tiền:</strong> {new Intl.NumberFormat('vi-VN', { 
                            style: 'currency', 
                            currency: 'VND' 
                        }).format(selectedPayment.amount)}
                    </div>
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <Table striped bordered hover className="rp-table">
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff' }}>
                                <tr>
                                    <th>STT</th>
                                    <th>Mã vé</th>
                                    <th>Ngày</th>
                                    <th>Tên</th>
                                    <th>Chiều</th>
                                    <th className="text-end">Hoa hồng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedPayment.tickets.map((ticket) => (
                                    <tr key={ticket.ticket_code}>
                                        <td className="text-center">{ticket.stt}</td>
                                        <td>{ticket.ticket_code}</td>
                                        <td>{ticket.ticket_date}</td>
                                        <td>{ticket.ticket_name}</td>
                                        <td>{ticket.direction}</td>
                                        <td className="text-end">
                                            {new Intl.NumberFormat('vi-VN', { 
                                                style: 'currency', 
                                                currency: 'VND' 
                                            }).format(ticket.commission)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                    <div className="mt-3 text-end">
                        <strong>Tổng hoa hồng: </strong>
                        <span>
                            {new Intl.NumberFormat('vi-VN', { 
                                style: 'currency', 
                                currency: 'VND' 
                            }).format(selectedPayment.total_commission)}
                        </span>
                    </div>
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
                            <h4>Báo cáo thanh toán</h4>
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
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label>Mã thanh toán</Form.Label>
                                            <Form.Control 
                                                type="text"
                                                placeholder="Nhập mã thanh toán"
                                                value={filters.payment_code}
                                                onChange={(e) => setFilters({...filters, payment_code: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label>Mã nhân viên</Form.Label>
                                            <Form.Control 
                                                type="text"
                                                placeholder="Nhập mã nhân viên"
                                                value={filters.staff_code}
                                                onChange={(e) => setFilters({...filters, staff_code: e.target.value})}
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

                <Card className="rp-data-grid flex-grow-1 overflow-hidden">
                    <Card.Body className="p-0">
                        {loading ? (
                            <div className="p-3">
                                <p>Đang tải dữ liệu...</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-container">
                                    <Table striped bordered hover className="rp-table mb-0">
                                        <thead>
                                            <tr>
                                                <th className="text-center" style={{minWidth: '60px'}}>STT</th>
                                                <th style={{minWidth: '150px'}}>Mã thanh toán</th>
                                                <th style={{minWidth: '100px'}}>Ngày</th>
                                                <th style={{minWidth: '100px'}}>Mã NV</th>
                                                <th style={{minWidth: '200px'}}>Tên nhân viên</th>
                                                <th className="text-end" style={{minWidth: '120px'}}>Số tiền</th>
                                                <th style={{minWidth: '150px'}}>Hình thức thanh toán</th>
                                                <th style={{minWidth: '120px'}}>Người tạo</th>
                                                <th className="text-center" style={{minWidth: '80px'}}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentData.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                    <td>{item.payment_code}</td>
                                                    <td>{item.payment_date}</td>
                                                    <td>{item.staff_code}</td>
                                                    <td>{item.staff_name}</td>
                                                    <td className="text-end">
                                                        {new Intl.NumberFormat('vi-VN', { 
                                                            style: 'currency', 
                                                            currency: 'VND' 
                                                        }).format(item.amount)}
                                                    </td>
                                                    <td>{item.payment_method}</td>
                                                    <td>{item.created_by}</td>
                                                    <td className="text-center">
                                                        <Button 
                                                            variant="link" 
                                                            onClick={() => handleShowTickets(item)}
                                                            title="Xem chi tiết"
                                                        >
                                                            <FontAwesomeIcon icon={faEye} />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                                
                                {data.length > 0 && (
                                    <div className="pagination-container p-3 bg-white border-top">
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

export default PaymentReport; 