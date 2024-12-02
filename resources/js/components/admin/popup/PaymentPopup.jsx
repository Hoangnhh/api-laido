import React, { useState, useEffect } from 'react';
import { Modal, Button, Tabs, Tab, Table, Card, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import './PaymentPopup.css';
import axios from 'axios';

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
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        status: '',
        search: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchParams, setSearchParams] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        status: '',
        search: ''
    });
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (show && info?.id) {
            fetchCheckedTickets();
        }
    }, [show, info, filters]);

    

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

    return (
        <Modal show={show} onHide={onClose} fullscreen className="ppopup-modal">
            <Modal.Body>
                <div className="ppopup-tab-container">
                    <Tabs defaultActiveKey="tickets" className="ppopup-tabs">
                        <Tab eventKey="tickets" title={<span><i className="fas fa-ticket-alt"></i> Vé chưa thanh toán</span>} />
                        <Tab eventKey="payments" title={<span><i className="fas fa-history"></i> Lịch sử thanh toán</span>} />
                    </Tabs>
                    <button 
                        className="ppopup-close-button" 
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="tab-content p-3">
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
                                        <Table striped bordered hover className="ppopup-table">
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
                                                            {ticket.status}
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
                                    <div className="ppopup-success-message mb-2">
                                        <i className="fas fa-check-circle me-2"></i>
                                        {successMessage}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default PaymentPopup;