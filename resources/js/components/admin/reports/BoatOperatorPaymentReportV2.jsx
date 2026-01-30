import React, { useState } from 'react';
import AdminLayout from '.././Layout/AdminLayout';
import { Card, Row, Col, Form, Button, Table } from 'react-bootstrap';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import { vi } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../../css/Report.css';

registerLocale('vi', vi);

const BoatOperatorPaymentReportV2 = () => {
    const today = new Date().toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        from_date: new Date(),
        to_date: new Date(),
        staff_search: ''
    });

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ total_quantity: 0, total_amount: 0, total_staff: 0 });

    const handleFromDateChange = (date) => {
        const newFilters = { ...filters, from_date: date };

        // Nếu Từ ngày > Đến ngày, cập nhật Đến ngày = Từ ngày
        if (date > filters.to_date) {
            newFilters.to_date = date;
        }
        // Nếu khoảng cách > 31 ngày, cập nhật Đến ngày = Từ ngày + 31 ngày
        else {
            const diffTime = Math.abs(filters.to_date - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 31) {
                const maxToDate = new Date(date);
                maxToDate.setDate(date.getDate() + 31);
                newFilters.to_date = maxToDate;
            }
        }
        setFilters(newFilters);
    };

    const getMaxToDate = () => {
        if (!filters.from_date) return null;
        const maxDate = new Date(filters.from_date);
        maxDate.setDate(maxDate.getDate() + 31);
        return maxDate;
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {
                ...filters,
                from_date: filters.from_date.toISOString().split('T')[0],
                to_date: filters.to_date.toISOString().split('T')[0]
            };
            const response = await axios.get('/api/admin/get-boat-operator-payment-report-v2', { params });
            if (response.data.success) {
                setData(response.data.data.items || []);
                setSummary(response.data.data.summary || { total_quantity: 0, total_amount: 0, total_staff: 0 });
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
        }
        setLoading(false);
    };

    const handleSearch = () => {
        fetchData();
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams({
            from_date: filters.from_date.toISOString().split('T')[0],
            to_date: filters.to_date.toISOString().split('T')[0]
        });
        if (filters.staff_search) {
            params.append('staff_search', filters.staff_search);
        }
        window.open(`/api/admin/export-boat-operator-payment-report-v2?${params.toString()}`, '_blank');
    };


    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    return (
        <AdminLayout>
            <div className="rp-container d-flex flex-column vh-100">
                <div className="rp-header">
                    <Card className="rp-filter-section mb-3 shadow-sm">
                        <Card.Header className="bg-white border-bottom-0 pt-3">
                            <h4 className="fw-bold text-primary mb-0">
                                <i className="bi bi-file-earmark-text me-2"></i>
                                Bảng kê thanh toán vé lái đò V2
                            </h4>
                        </Card.Header>
                        <Card.Body>
                            <Form>
                                <Row className="align-items-end">
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">
                                                <i className="bi bi-calendar-event me-2"></i>Từ ngày
                                            </Form.Label>
                                            <div className="custom-datepicker-wrapper">
                                                <DatePicker
                                                    selected={filters.from_date}
                                                    onChange={handleFromDateChange}
                                                    selectsStart
                                                    startDate={filters.from_date}
                                                    endDate={filters.to_date}
                                                    dateFormat="dd/MM/yyyy"
                                                    locale="vi"
                                                    className="form-control form-control-lg border-2 w-100"
                                                    placeholderText="Chọn ngày"
                                                />
                                            </div>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">
                                                <i className="bi bi-calendar-check me-2"></i>Đến ngày
                                            </Form.Label>
                                            <div className="custom-datepicker-wrapper">
                                                <DatePicker
                                                    selected={filters.to_date}
                                                    onChange={(date) => setFilters({ ...filters, to_date: date })}
                                                    selectsEnd
                                                    startDate={filters.from_date}
                                                    endDate={filters.to_date}
                                                    minDate={filters.from_date}
                                                    maxDate={getMaxToDate()}
                                                    dateFormat="dd/MM/yyyy"
                                                    locale="vi"
                                                    className="form-control form-control-lg border-2 w-100"
                                                    placeholderText="Chọn ngày"
                                                />
                                            </div>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">
                                                <i className="bi bi-person-search me-2"></i>Tìm kiếm lái đò
                                            </Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Nhập mã hoặc tên lái đò..."
                                                value={filters.staff_search}
                                                onChange={(e) => setFilters({ ...filters, staff_search: e.target.value })}
                                                className="form-control-lg border-2"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3} className="d-flex gap-2">
                                        <Button
                                            variant="primary"
                                            className="px-4 py-2 flex-grow-1 shadow-sm fw-bold"
                                            onClick={handleSearch}
                                            disabled={loading}
                                        >
                                            <i className="bi bi-search me-2"></i>
                                            {loading ? 'Đang tải...' : 'Tìm kiếm'}
                                        </Button>
                                        <Button
                                            variant="success"
                                            className="px-4 py-2 shadow-sm fw-bold"
                                            onClick={handleExportExcel}
                                            disabled={loading || data.length === 0}
                                        >
                                            <i className="bi bi-file-earmark-excel me-2"></i>
                                            Xuất Excel
                                        </Button>
                                    </Col>
                                </Row>
                            </Form>
                        </Card.Body>
                    </Card>
                </div>

                <Card className="rp-data-grid flex-grow-1 overflow-hidden shadow-sm border-0">
                    <Card.Body className="p-0 d-flex flex-column h-100">
                        {loading ? (
                            <div className="p-5 text-center">
                                <div className="spinner-border text-primary mb-3" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="text-muted">Đang tải dữ liệu, vui lòng đợi...</p>
                            </div>
                        ) : (
                            <>
                                {/* Summary */}
                                {data.length > 0 && (
                                    <div className="p-3 bg-white border-bottom sticky-top" style={{ zIndex: 10 }}>
                                        <Row>
                                            <Col md={12}>
                                                <div className="d-flex gap-5">
                                                    <div>
                                                        <span className="text-dark d-block mb-1">Tổng số nhân viên:</span>
                                                        <span className="fw-bold fs-5 text-black">{formatCurrency(summary.total_staff)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-dark d-block mb-1">Tổng số vé:</span>
                                                        <span className="fw-bold fs-5 text-black">{formatCurrency(summary.total_quantity)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-dark d-block mb-1">Tổng tiền thanh toán:</span>
                                                        <span className="fw-bold fs-5 text-black">{formatCurrency(summary.total_amount)} đ</span>
                                                    </div>
                                                </div>
                                            </Col>
                                        </Row>
                                    </div>
                                )}

                                {/* Flat Data List */}
                                <div className="table-container-v2 flex-grow-1 overflow-auto">
                                    <Table bordered hover striped className="mb-0">
                                        <thead className="sticky-top" style={{ zIndex: 10 }}>
                                            <tr className="bg-light-gray">
                                                <th className="text-center text-black" style={{ width: '60px' }}>STT</th>
                                                <th className="text-black" style={{ width: '120px' }}>Mã lái đò</th>
                                                <th className="text-black">Tên lái đò</th>
                                                <th className="text-center text-black" style={{ width: '120px' }}>Ngày</th>
                                                <th className="text-end text-black" style={{ width: '150px' }}>Mệnh giá (đ)</th>
                                                <th className="text-center text-black" style={{ width: '100px' }}>Số lượng</th>
                                                <th className="text-end text-black" style={{ width: '180px' }}>Thành tiền (đ)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                let flatIndex = 1;
                                                const rows = [];
                                                data.forEach(staff => {
                                                    staff.dates.forEach(dateItem => {
                                                        dateItem.tickets.forEach(ticket => {
                                                            rows.push(
                                                                <tr key={`${staff.staff_id}-${dateItem.date}-${ticket.price}`}>
                                                                    <td className="text-center text-black small">{flatIndex++}</td>
                                                                    <td className="fw-bold text-black">{staff.staff_code}</td>
                                                                    <td className="text-black">{staff.staff_name}</td>
                                                                    <td className="text-center text-black">{dateItem.date_display}</td>
                                                                    <td className="text-end text-black">{formatCurrency(ticket.price)}</td>
                                                                    <td className="text-center text-black">{formatCurrency(ticket.quantity)}</td>
                                                                    <td className="text-end fw-bold text-black">{formatCurrency(ticket.total_amount)}</td>
                                                                </tr>
                                                            );
                                                        });
                                                    });
                                                });
                                                return rows;
                                            })()}

                                            {data.length > 0 && (
                                                <tr className="table-warning fw-bold sticky-bottom" style={{ zIndex: 5 }}>
                                                    <td colSpan="5" className="text-end py-3 text-black">TỔNG CỘNG:</td>
                                                    <td className="text-center fs-5 text-black">{formatCurrency(summary.total_quantity)}</td>
                                                    <td className="text-end fs-5 text-black pe-3">{formatCurrency(summary.total_amount)} đ</td>
                                                </tr>
                                            )}

                                            {data.length === 0 && !loading && (
                                                <tr>
                                                    <td colSpan="7" className="p-5 text-center text-black">
                                                        <h4 className="mb-3">Chưa có dữ liệu hiển thị</h4>
                                                        <p>Vui lòng chọn khoảng ngày và nhấn nút Tìm kiếm để xem báo cáo.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </Card.Body>
                </Card>
            </div>

            <style sx>{`
                .rp-container {
                    background-color: #fff;
                }
                .text-black {
                    color: #000 !important;
                }
                .rp-header h4 {
                    color: #000 !important;
                }
                .fw-bold {
                    font-weight: 700 !important;
                }
                .bg-light-gray {
                    background-color: #f1f5f9 !important;
                }
                
                /* Standard DatePicker Styling */
                .custom-datepicker-wrapper .react-datepicker-wrapper {
                    display: block;
                }
                .react-datepicker-popper {
                    z-index: 1050 !important;
                }
                .react-datepicker {
                    font-family: inherit;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    z-index: 1050 !important;
                }
                .react-datepicker__header {
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #ced4da;
                }
                .react-datepicker__current-month {
                    color: #000;
                    font-weight: 700;
                }
                .react-datepicker__day-name {
                    color: #000;
                    font-weight: 600;
                }
                .react-datepicker__day {
                    color: #000;
                }
                .react-datepicker__day--selected, .react-datepicker__day--range-start, .react-datepicker__day--range-end {
                    background-color: #000 !important;
                    color: #fff !important;
                }
                .react-datepicker__day--in-range {
                    background-color: #e9ecef !important;
                    color: #000 !important;
                }
                .table thead th {
                    border-color: #dee2e6 !important;
                    vertical-align: middle;
                }
                .form-label {
                    color: #000 !important;
                }
                .btn-primary {
                    background-color: #000;
                    border-color: #000;
                }
                .btn-primary:hover {
                    background-color: #333;
                    border-color: #333;
                }
            `}</style>
        </AdminLayout>
    );
};

export default BoatOperatorPaymentReportV2;

