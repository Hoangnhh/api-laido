import React, { useState, useRef } from 'react';
import AdminLayout from './Layout/AdminLayout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserClock, faTicketAlt } from '@fortawesome/free-solid-svg-icons';
import '../../../css/CheckoutScreen.css';
import axios from 'axios';

const CheckoutScreen = () => {
    const [cardId, setCardId] = useState('');
    const [error, setError] = useState('');
    const [checkedOutStaff, setCheckedOutStaff] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [shiftInfo, setShiftInfo] = useState(null);
    const [checkedTickets, setCheckedTickets] = useState([]);
    const inputRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!cardId || isProcessing) return;

        try {
            setIsProcessing(true);
            setError('');
            setCheckedOutStaff(null);
            setShiftInfo(null);
            setCheckedTickets([]);

            const response = await axios.post('/api/admin/staff-checkout', {
                card_id: cardId
            });

            if (response.data.status === 'success') {
                setCheckedOutStaff(response.data.data.staff);
                setShiftInfo(response.data.data.shift_info);
                setCheckedTickets(response.data.data.checked_tickets);
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra khi checkout');
        } finally {
            setCardId('');
            setIsProcessing(false);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    return (
        <AdminLayout>
            <div className="checkout-wrapper">
                <h1 className="checkout-title">
                    CHECKOUT NHÂN VIÊN
                </h1>
                
                <div className="checkout-container">
                    <div className="checkout-section checkout-search">
                        <h2>CHECKOUT NHÂN VIÊN</h2>
                        <div className="checkout-content">
                            <form onSubmit={handleSubmit} className="checkout-search-form">
                                <input
                                    type="text"
                                    value={cardId}
                                    onChange={(e) => setCardId(e.target.value.toUpperCase())}
                                    placeholder="Quẹt thẻ hoặc nhập mã thẻ rồi nhấn Enter..."
                                    className="checkout-search-input"
                                    ref={inputRef}
                                    autoComplete="off"
                                    disabled={isProcessing}
                                />
                            </form>

                            {isProcessing && (
                                <div className="checkout-processing">
                                    <div className="checkout-spinner"></div>
                                    <p>Đang xử lý checkout...</p>
                                </div>
                            )}

                            {checkedOutStaff && (
                                <div className="checkout-staff-info">
                                    <div className="checkout-staff-avatar">
                                        <img src={checkedOutStaff?.avatar_url || "/images/default-avatar.png"} alt="" />
                                    </div>
                                    <div className="checkout-staff-details">
                                        <div className="checkout-info-row">
                                            <div className="checkout-info-label">Mã NV:</div>
                                            <div className="checkout-info-value">{checkedOutStaff?.code}</div>
                                        </div>
                                        <div className="checkout-info-row">
                                            <div className="checkout-info-label">Họ tên:</div>
                                            <div className="checkout-info-value">{checkedOutStaff?.name}</div>
                                        </div>
                                        <div className="checkout-info-row">
                                            <div className="checkout-info-label">Ca làm việc:</div>
                                            <div className="checkout-info-value">{checkedOutStaff?.group_name || 'Chưa phân nhóm'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && <div className="checkout-error">{error}</div>}
                        </div>
                    </div>

                    <div className="checkout-section checkout-shift-info">
                        <h2>Thông tin ca làm việc</h2>
                        <div className="checkout-content">
                            {shiftInfo ? (
                                <div className="checkout-shift-details">
                                    <div className="checkout-shift-row">
                                        <div className="checkout-shift-label">Vị trí làm việc:</div>
                                        <div className="checkout-shift-value">{shiftInfo.gate_name}</div>
                                    </div>
                                    <div className="checkout-shift-row">
                                        <div className="checkout-shift-label">Tổng thời gian:</div>
                                        <div className="checkout-shift-value">{shiftInfo.working_time}</div>
                                    </div>
                                    <div className="checkout-shift-row">
                                        <div className="checkout-shift-label">Tổng số vé:</div>
                                        <div className="checkout-shift-value">{shiftInfo.total_tickets}</div>
                                    </div>
                                    <div className="checkout-shift-row">
                                        <div className="checkout-shift-label">Vé chưa checkout:</div>
                                        <div className="checkout-shift-value">{checkedTickets.filter(ticket => !ticket.checkout_at).length}</div>
                                    </div>

                                    {checkedTickets.length > 0 && (
                                        <div className="checkout-tickets-list">
                                            <div className="checkout-tickets-table">
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>STT</th>
                                                            <th>Mã vé</th>
                                                            <th>Tên vé</th>
                                                            <th>Giờ vào</th>
                                                            <th>Giờ ra</th>
                                                            <th>Trạng thái</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {checkedTickets.map((ticket, index) => (
                                                            <tr key={ticket.id}>
                                                                <td>{index + 1}</td>
                                                                <td>{ticket.code}</td>
                                                                <td>{ticket.name}</td>
                                                                <td>{ticket.checkin_at}</td>
                                                                <td>{ticket.checkout_at}</td>
                                                                <td>{ticket.status}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="checkout-empty-state">
                                    <FontAwesomeIcon icon={faUserClock} className="checkout-empty-icon" />
                                    <p>Quét thẻ để xem thông tin ca làm việc</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default CheckoutScreen;