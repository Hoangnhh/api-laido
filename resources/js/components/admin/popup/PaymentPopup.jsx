import React, { useState, useEffect } from 'react';
import { Modal, Button, Tabs, Tab, Table, Card, Form } from 'react-bootstrap';
import axios from 'axios';

const PaymentPopup = ({ show, onClose, payment, info }) => {
    const [selectedTickets, setSelectedTickets] = useState([]);
    const [checkedTickets, setCheckedTickets] = useState([]);
    const [formData, setFormData] = useState({
        bankAccount: info?.bank_account || '',
        bankName: info?.bank_name || '',
        note: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show && info?.id) {
            fetchCheckedTickets();
        }
    }, [show, info]);

    

    const fetchCheckedTickets = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/admin/get-checked-tickets-by-staff`, {
                params: {
                    staff_id: info.id
                }
            });
            if (response.data.success) {
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
            setSelectedTickets(checkedTickets);
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
        return selectedTickets.reduce((sum, ticket) => sum + parseFloat(ticket.price), 0);
    };

    return (
        <Modal show={show} onHide={onClose} fullscreen>
            <Modal.Header closeButton>
                <Modal.Title>Chi tiết Thanh Toán</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Tabs defaultActiveKey="tickets" className="mb-3">
                    <Tab eventKey="tickets" title="Danh sách vé chưa thanh toán">
                        <div className="d-flex">
                            <div className="flex-grow-1 me-4">
                                {loading ? (
                                    <div className="text-center p-4">
                                        <span>Đang tải dữ liệu...</span>
                                    </div>
                                ) : (
                                    <Table striped bordered hover>
                                        <thead>
                                            <tr>
                                                <th>
                                                    <Form.Check
                                                        type="checkbox"
                                                        onChange={handleSelectAll}
                                                        checked={selectedTickets.length === checkedTickets.length}
                                                    />
                                                </th>
                                                <th>Mã</th>
                                                <th>Ngày</th>
                                                <th>Tên</th>
                                                <th>Chiều</th>
                                                <th className="text-right">Tiền đò</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {checkedTickets.map((ticket, index) => (
                                                <tr 
                                                    key={index}
                                                    onClick={() => handleSelectTicket(ticket)}
                                                    style={{ cursor: 'pointer' }}
                                                    className={selectedTickets.some(t => t.code === ticket.code) ? 'table-active' : ''}
                                                >
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <Form.Check
                                                            type="checkbox"
                                                            checked={selectedTickets.some(t => t.code === ticket.code)}
                                                            onChange={() => handleSelectTicket(ticket)}
                                                        />
                                                    </td>
                                                    <td>{ticket.code}</td>
                                                    <td>{ticket.date}</td>
                                                    <td>{ticket.name}</td>
                                                    <td>{ticket.direction}</td>
                                                    <td className="text-right">{ticket.commission.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </div>

                            {/* ... phần Card bên phải giữ nguyên ... */}
                        </div>
                    </Tab>
                    {/* ... Tab payments giữ nguyên ... */}
                </Tabs>
            </Modal.Body>
        </Modal>
    );
};

export default PaymentPopup;