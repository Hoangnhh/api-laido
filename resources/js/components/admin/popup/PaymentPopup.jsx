import React, { useState, useEffect } from 'react';
import { Modal, Button, Tabs, Tab, Table, Card, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faEye } from '@fortawesome/free-solid-svg-icons';
import './PaymentPopup.css';
import axios from 'axios';


const getFirstDayOfPreviousMonth = () => {
    const today = new Date();
    // Lấy ngày 1 của tháng trước
    const firstDayOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return firstDayOfPreviousMonth.toISOString().split('T')[0];
};

const PaymentPopup = ({ show, onClose, payment, info }) => {
    const [selectedTickets, setSelectedTickets] = useState([]);
    const [checkedTickets, setCheckedTickets] = useState([]);
    const [formData, setFormData] = useState({
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'BANK_TRANSFER',
        note: ''
    });
    const [loading, setLoading] = useState(false);
    const [allTickets, setAllTickets] = useState([]);
    const [filters, setFilters] = useState({
        fromDate: getFirstDayOfPreviousMonth(),
        toDate: new Date().toISOString().split('T')[0],
        status: '',
        search: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchParams, setSearchParams] = useState({
        fromDate: getFirstDayOfPreviousMonth(),
        toDate: new Date().toISOString().split('T')[0],
        status: '',
        search: ''
    });
    const [successMessage, setSuccessMessage] = useState('');
    const [activeTab, setActiveTab] = useState('tickets');
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [historyFilters, setHistoryFilters] = useState({
        fromDate: getFirstDayOfPreviousMonth(),
        toDate: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        search: ''
    });
    const [historySearchParams, setHistorySearchParams] = useState({
        fromDate: getFirstDayOfPreviousMonth(),
        toDate: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        search: ''
    });
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showTicketDetails, setShowTicketDetails] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

    useEffect(() => {
        if (show && info?.id) {
            fetchCheckedTickets();
        }
    }, [show, info, filters]);

    useEffect(() => {
        if (show && info?.id && activeTab === 'payments') {
            fetchPaymentHistory();
        }
    }, [show, info, activeTab, historyFilters]);

    

    const fetchCheckedTickets = async () => {
        try {
            setLoading(true);
            const response = await axios.post(`/api/admin/get-checked-tickets-by-staff`, {
                staff_id: info.id,
                from_date: filters.fromDate,
                to_date: filters.toDate,
                status: filters.status
            });
            if (response.data.success) {
                setAllTickets(response.data.data);
                setCheckedTickets(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching checked tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentHistory = async () => {
        try {
            setLoadingHistory(true);
            const response = await axios.post(`/api/admin/get-staff-payment`, {
                staff_id: info.id,
                from_date: historyFilters.fromDate,
                to_date: historyFilters.toDate,
                payment_method: historyFilters.paymentMethod,
                search: historyFilters.search
            });
            if (response.data.success) {
                setPaymentHistory(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching payment history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const unpaidTickets = checkedTickets.filter(ticket => !ticket.paid);
            setSelectedTickets(unpaidTickets);
        } else {
            setSelectedTickets([]);
        }
    };

    const handleSelectTicket = (ticket) => {
        if (selectedTickets.find(t => t.code === ticket.code)) {
            setSelectedTickets(selectedTickets.filter(t => t.code !== ticket.code));
        } else {
            setSelectedTickets([...selectedTickets, ticket]);
        }
    };

    const calculateTotal = () => {
        return selectedTickets.reduce((sum, ticket) => sum + parseFloat(ticket.commission), 0);
    };

    const handleSearch = () => {
        setFilters(searchParams);
    };

    const handleFilterChange = (field, value) => {
        setSearchParams(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleFormChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleCreatePayment = async () => {
        if (selectedTickets.length === 0) {
            alert('Vui lòng chọn ít nhất một vé để thanh toán');
            return;
        }

        try {
            setIsSubmitting(true);
            setSuccessMessage('');
            
            const response = await axios.post('/api/admin/create-payment', {
                staff_id: info.id,
                date: formData.paymentDate,
                bank: info.bank_name,
                account_number: info.bank_account,
                amount: calculateTotal(),
                note: formData.note,
                ticket_ids: selectedTickets.map(ticket => ticket.id),
                payment_method: formData.paymentMethod
            });

            if (response.data.success) {
                setSuccessMessage('Tạo thanh toán thành công!');
                setSelectedTickets([]);
                fetchCheckedTickets();
                
                setFormData({
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentMethod: 'BANK_TRANSFER',
                    note: ''
                });
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi tạo thanh toán');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleHistoryFilterChange = (field, value) => {
        setHistorySearchParams(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleHistorySearch = () => {
        setHistoryFilters(historySearchParams);
    };

    const handleShowTicketDetails = (payment) => {
        setSelectedPayment(payment);
        setShowTicketDetails(true);
    };

    const handleCloseTicketDetails = () => {
        setSelectedPayment(null);
        setShowTicketDetails(false);
    };

    const TicketDetailsModal = () => {
        if (!selectedPayment) return null;

        return (
            <Modal 
                show={showTicketDetails} 
                onHide={handleCloseTicketDetails}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Chi tiết thanh toán #{selectedPayment.transaction_code}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <div className="row">
                            <div className="col-md-6">
                                <p><strong>Ngày thanh toán:</strong> {selectedPayment.date}</p>
                                <p><strong>Hình thức:</strong> {selectedPayment.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}</p>
                            </div>
                            <div className="col-md-6 text-md-end">
                                <p><strong>Số vé:</strong> {selectedPayment.checked_tickets?.length || 0}</p>
                                <p><strong>Tổng tiền:</strong> {selectedPayment.amount?.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Mã vé</th>
                                    <th>Ngày</th>
                                    <th>Tên</th>
                                    <th>Chiều</th>
                                    <th className="text-end">Tiền đò</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedPayment.checked_tickets?.map((ticket, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{ticket.code}</td>
                                        <td>{ticket.date}</td>
                                        <td>{ticket.name}</td>
                                        <td>{ticket.direction}</td>
                                        <td className="text-end">{ticket.commission?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="5" className="text-end"><strong>Tổng cộng:</strong></td>
                                    <td className="text-end"><strong>{selectedPayment.amount?.toLocaleString()}</strong></td>
                                </tr>
                            </tfoot>
                        </Table>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseTicketDetails}>
                        Đóng
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    };

    const calculateHistoryTotals = () => {
        return paymentHistory.reduce((totals, payment) => {
            return {
                totalAmount: totals.totalAmount + (payment.amount || 0),
                totalTickets: totals.totalTickets + (payment.checked_tickets?.length || 0),
            };
        }, { totalAmount: 0, totalTickets: 0 });
    };

    return (
        <>
            <Modal show={show} onHide={onClose} fullscreen className="ppopup-modal">
                <Modal.Body>
                    <div className="ppopup-tab-container">
                        <div className="d-flex align-items-center">
                            <Tabs 
                                activeKey={activeTab} 
                                onSelect={(k) => setActiveTab(k)} 
                                className="ppopup-tabs me-3"
                            >
                                <Tab eventKey="tickets" title={<span><i className="fas fa-ticket-alt"></i> Vé chưa thanh toán</span>} />
                                <Tab eventKey="payments" title={<span><i className="fas fa-history"></i> Lịch sử thanh toán</span>} />
                            </Tabs>
                            <div className="ppopup-staff-info">
                                <span className="fw-bold">#{info?.code}</span> - <span>{info?.name}</span>
                            </div>
                        </div>
                        <button className="ppopup-close-button" onClick={onClose} aria-label="Close">×</button>
                    </div>

                    <div className="tab-content p-3">
                        {activeTab === 'tickets' ? (
                            <div className="d-flex">
                                <div className="flex-grow-1 me-4">
                                    <div className="ppopup-filters-container mb-3">
                                        <div className="row g-3">
                                            <div className="col-md-3">
                                                <Form.Group>
                                                    <Form.Label>Từ ngày</Form.Label>
                                                    <Form.Control
                                                        type="date"
                                                        value={searchParams.fromDate}
                                                        onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                                                    />
                                                </Form.Group>
                                            </div>
                                            <div className="col-md-3">
                                                <Form.Group>
                                                    <Form.Label>Đến ngày</Form.Label>
                                                    <Form.Control
                                                        type="date"
                                                        value={searchParams.toDate}
                                                        onChange={(e) => handleFilterChange('toDate', e.target.value)}
                                                    />
                                                </Form.Group>
                                            </div>
                                            <div className="col-md-2">
                                                <Form.Group>
                                                    <Form.Label>Trạng thái</Form.Label>
                                                    <Form.Select
                                                        value={searchParams.status}
                                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                                    >
                                                        <option value="">Tất cả</option>
                                                        <option value="1">Đã thanh toán</option>
                                                        <option value="0">Chưa thanh toán</option>
                                                    </Form.Select>
                                                </Form.Group>
                                            </div>
                                            <div className="col-md-3">
                                                <Form.Group>
                                                    <Form.Label>Tìm kiếm</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Nhập từ khóa..."
                                                        value={searchParams.search}
                                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleSearch();
                                                            }
                                                        }}
                                                    />
                                                </Form.Group>
                                            </div>
                                            <div className="col-md-1">
                                                <Form.Group>
                                                    <Form.Label>&nbsp;</Form.Label>
                                                    <Button 
                                                        variant="primary" 
                                                        className="w-100" 
                                                        onClick={handleSearch}
                                                    >
                                                        <FontAwesomeIcon icon={faSearch} />
                                                    </Button>
                                                </Form.Group>
                                            </div>
                                        </div>
                                    </div>

                                    {loading ? (
                                        <div className="ppopup-loading-container">
                                            <div className="ppopup-loading-spinner">
                                                <div className="spinner-border text-primary" role="status">
                                                    <span className="visually-hidden">Đang tải...</span>
                                                </div>
                                            </div>
                                            <p className="mb-0">Đang tải dữ liệu...</p>
                                        </div>
                                    ) : checkedTickets.length === 0 ? (
                                        <div className="ppopup-no-data-container">
                                            <div className="ppopup-no-data-icon">
                                                <i className="fas fa-ticket-alt"></i>
                                            </div>
                                            <p className="ppopup-no-data-message">
                                                {filters.search || filters.status || filters.fromDate || filters.toDate
                                                    ? 'Không tìm thấy vé nào phù hợp với điều kiện lọc'
                                                    : 'Chưa có vé nào được soát'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="ppopup-table-container">
                                            <div className="ppopup-table-wrapper">
                                                <Table striped hover className="ppopup-table">
                                                    <thead>
                                                        <tr>
                                                            <th>
                                                                <Form.Check
                                                                    type="checkbox"
                                                                    onChange={handleSelectAll}
                                                                    checked={selectedTickets.length === checkedTickets.filter(t => !t.paid).length}
                                                                />
                                                            </th>
                                                            <th>Mã</th>
                                                            <th>Ngày</th>
                                                            <th>Tên</th>
                                                            <th>Chiều</th>
                                                            <th>Trạng thái</th>
                                                            <th>Thanh toán</th>
                                                            <th className="text-right">Tiền đò</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {checkedTickets.map((ticket, index) => (
                                                            <tr 
                                                                key={index}
                                                                onClick={() => !ticket.paid && handleSelectTicket(ticket)}
                                                                style={{ cursor: ticket.paid ? 'default' : 'pointer' }}
                                                                className={selectedTickets.some(t => t.code === ticket.code) ? 'table-active' : ''}
                                                            >
                                                                <td onClick={(e) => e.stopPropagation()}>
                                                                    {!ticket.paid && (
                                                                        <Form.Check
                                                                            type="checkbox"
                                                                            checked={selectedTickets.some(t => t.code === ticket.code)}
                                                                            onChange={() => handleSelectTicket(ticket)}
                                                                        />
                                                                    )}
                                                                </td>
                                                                <td className={ticket.paid ? 'text-muted' : ''}>
                                                                    {ticket.code}
                                                                </td>
                                                                <td className={ticket.paid ? 'text-muted' : ''}>
                                                                    {ticket.date}
                                                                </td>
                                                                <td className={ticket.paid ? 'text-muted' : ''}>
                                                                    {ticket.name}
                                                                </td>
                                                                <td className={ticket.paid ? 'text-muted' : ''}>
                                                                    {ticket.direction}
                                                                </td>
                                                                <td className={ticket.paid ? 'text-muted' : ''}>
                                                                    <span className={ticket.status === 'Đã hoàn thành' ? 'text-success' : 'text-danger'}>
                                                                        {ticket.status}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    {ticket.paid ? (
                                                                        <span className="text-success">
                                                                            Đã thanh toán
                                                                            {ticket.payment?.transaction_code && (
                                                                                <div className="small text-muted">
                                                                                    Mã TT: {ticket.payment.transaction_code}
                                                                                </div>
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-danger">Chưa thanh toán</span>
                                                                    )}
                                                                </td>
                                                                <td className="text-right">{ticket.commission.toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="ppopup-payment-info">
                                    <h3>Thông tin thanh toán</h3>
                                    <p><b>#{info.code} {info.name}</b></p>
                                    <p>Số tiền: <strong>{calculateTotal().toLocaleString()}</strong></p>
                                    
                                    <div className="form-group">
                                        <label htmlFor="paymentDate">Ngày thanh toán</label>
                                        <input
                                            type="date"
                                            id="paymentDate"
                                            required
                                            className="form-control"
                                            value={formData.paymentDate}
                                            onChange={(e) => handleFormChange('paymentDate', e.target.value)}
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="paymentMethod">Hình thức thanh toán</label>
                                        <select 
                                            id="paymentMethod" 
                                            className="form-control" 
                                            required
                                            value={formData.paymentMethod}
                                            onChange={(e) => handleFormChange('paymentMethod', e.target.value)}
                                        >
                                            <option value="BANK_TRANSFER">Chuyển khoản</option>
                                            <option value="CASH">Tiền mặt</option>
                                        </select>
                                    </div>

                                    {formData.paymentMethod === 'BANK_TRANSFER' && (
                                        <>
                                            <div className="form-group">
                                                <label htmlFor="bankName">Ngân hàng</label>
                                                <input
                                                    type="text"
                                                    id="bankName"
                                                    className="form-control"
                                                    value={info.bank_name}
                                                    readOnly
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="bankAccount">Số tài khoản</label>
                                                <input
                                                    type="text"
                                                    id="bankAccount"
                                                    className="form-control"
                                                    value={info.bank_account}
                                                    readOnly
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="form-group">
                                        <label htmlFor="note">Ghi chú</label>
                                        <textarea
                                            id="note"
                                            className="form-control"
                                            rows="3"
                                            value={formData.note}
                                            onChange={(e) => handleFormChange('note', e.target.value)}
                                        />
                                    </div>

                                    <div className="ppopup-payment-actions">
                                        <button 
                                            className="btn btn-primary w-100" 
                                            onClick={handleCreatePayment}
                                            disabled={isSubmitting || selectedTickets.length === 0}
                                        >
                                            {isSubmitting ? 'Đang xử lý...' : 'Tạo thanh toán'}
                                        </button>
                                        {successMessage && (
                                            <div className="ppopup-success-message mt-2">
                                                <i className="fas fa-check-circle me-2"></i>
                                                {successMessage}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="ppopup-filters-container mb-3">
                                <div className="row g-3 mb-2">
                                    <div className="col-md-3">
                                        <Form.Group>
                                            <Form.Label>Từ ngày</Form.Label>
                                            <Form.Control
                                                type="date"
                                                value={historySearchParams.fromDate}
                                                onChange={(e) => handleHistoryFilterChange('fromDate', e.target.value)}
                                            />
                                        </Form.Group>
                                    </div>
                                    <div className="col-md-3">
                                        <Form.Group>
                                            <Form.Label>Đến ngày</Form.Label>
                                            <Form.Control
                                                type="date"
                                                value={historySearchParams.toDate}
                                                onChange={(e) => handleHistoryFilterChange('toDate', e.target.value)}
                                            />
                                        </Form.Group>
                                    </div>
                                    <div className="col-md-2">
                                        <Form.Group>
                                            <Form.Label>Hình thức</Form.Label>
                                            <Form.Select
                                                value={historySearchParams.paymentMethod}
                                                onChange={(e) => handleHistoryFilterChange('paymentMethod', e.target.value)}
                                            >
                                                <option value="">Tất cả</option>
                                                <option value="BANK_TRANSFER">Chuyển khoản</option>
                                                <option value="CASH">Tiền mặt</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </div>
                                    <div className="col-md-3">
                                        <Form.Group>
                                            <Form.Label>Tìm kiếm</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Nhập từ khóa..."
                                                value={historySearchParams.search}
                                                onChange={(e) => handleHistoryFilterChange('search', e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleHistorySearch();
                                                    }
                                                }}
                                            />
                                        </Form.Group>
                                    </div>
                                    <div className="col-md-1">
                                        <Form.Group>
                                            <Form.Label>&nbsp;</Form.Label>
                                            <Button 
                                                variant="primary" 
                                                className="w-100" 
                                                onClick={handleHistorySearch}
                                            >
                                                <FontAwesomeIcon icon={faSearch} />
                                            </Button>
                                        </Form.Group>
                                    </div>
                                </div>

                                {loadingHistory ? (
                                    <div className="ppopup-loading-container">
                                        <div className="ppopup-loading-spinner">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Đang tải...</span>
                                            </div>
                                        </div>
                                        <p className="mb-0">Đang tải dữ liệu...</p>
                                    </div>
                                ) : paymentHistory.length === 0 ? (
                                    <div className="ppopup-no-data-container">
                                        <div className="ppopup-no-data-icon">
                                            <i className="fas fa-history"></i>
                                        </div>
                                        <p className="ppopup-no-data-message">
                                            {historyFilters.search || historyFilters.paymentMethod
                                                ? 'Không tìm thấy thanh toán nào phù hợp với điều kiện lọc'
                                                : 'Chưa có lịch sử thanh toán'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="ppopup-table-container">
                                        <div className="ppopup-table-wrapper">
                                            <Table striped hover className="ppopup-table">
                                                <thead>
                                                    <tr>
                                                        <th>Mã TT</th>
                                                        <th>Ngày</th>
                                                        <th>Hình thức</th>
                                                        <th>Số vé</th>
                                                        <th>Ghi chú</th>
                                                        <th className="text-right">Số tiền</th>
                                                        <th className="text-center"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paymentHistory.map((payment, index) => (
                                                        <tr key={index}>
                                                            <td>{payment.transaction_code}</td>
                                                            <td>{payment.date}</td>
                                                            <td>
                                                                {payment.payment_method === 'BANK_TRANSFER' 
                                                                    ? 'Chuyển khoản' 
                                                                    : 'Tiền mặt'}
                                                            </td>
                                                            <td className="text-center">{payment.checked_tickets?.length || 0}</td>
                                                            <td>{payment.note}</td>
                                                            <td className="text-right">
                                                                {payment.amount?.toLocaleString()}
                                                            </td>
                                                            <td className="text-center">
                                                                <Button 
                                                                    variant="info"
                                                                    size="sm"
                                                                    onClick={() => handleShowTicketDetails(payment)}
                                                                >
                                                                    <FontAwesomeIcon icon={faEye} />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="table-info">
                                                    <tr>
                                                        <td colSpan="3" className="text-end">
                                                            <strong>Tổng cộng ({paymentHistory.length} thanh toán):</strong>
                                                        </td>
                                                        <td className="text-center">
                                                            <strong>{calculateHistoryTotals().totalTickets}</strong>
                                                        </td>
                                                        <td></td>
                                                        <td className="text-right">
                                                            <strong>{calculateHistoryTotals().totalAmount.toLocaleString()}</strong>
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Modal.Body>
            </Modal>
            
            <TicketDetailsModal />
        </>
    );
};

export default PaymentPopup;