import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserClock, faTicketAlt, faUserCheck } from '@fortawesome/free-solid-svg-icons';
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
    const [cardBuffer, setCardBuffer] = useState('');
    const [lastKeyTime, setLastKeyTime] = useState(Date.now());
    const [lastSubmitTime, setLastSubmitTime] = useState(0);
    const SCAN_TIMEOUT = 100; // 100ms timeout giữa các ký tự
    const SUBMIT_DELAY = 500; // 500ms delay giữa các lần submit
    const isSubmitting = useRef(false);
    const [staffStats, setStaffStats] = useState({
        total_staff: 0,
        checked_out_staff: 0,
        not_checked_out_staff: 0
    });

    useEffect(() => {
        const handleKeyPress = (e) => {
            const currentTime = Date.now();
            
            if (currentTime - lastKeyTime > SCAN_TIMEOUT) {
                setCardBuffer('');
            }
            
            setLastKeyTime(currentTime);

            if (e.key === 'Enter') {
                e.preventDefault();
                
                if (currentTime - lastSubmitTime < SUBMIT_DELAY) {
                    setCardBuffer('');
                    return;
                }

                if (cardBuffer && !isSubmitting.current) {
                    const scannedCode = cardBuffer;
                    setCardId(scannedCode);
                    setLastSubmitTime(currentTime);
                    
                    handleCheckout(scannedCode);
                }
                setCardBuffer('');
            } else {
                setCardBuffer(prev => prev + e.key);
            }
        };

        window.addEventListener('keypress', handleKeyPress);
        return () => window.removeEventListener('keypress', handleKeyPress);
    }, [cardBuffer, lastKeyTime, lastSubmitTime]);

    const handleCheckout = async (code) => {
        if (isProcessing || isSubmitting.current) return;

        try {
            isSubmitting.current = true;
            setIsProcessing(true);
            setError('');
            setCheckedOutStaff(null);
            setShiftInfo(null);
            setCheckedTickets([]);

            const response = await axios.post('/api/admin/staff-checkout', {
                card_id: code
            });

            if (response.data.status === 'success') {
                setCheckedOutStaff(response.data.data.staff);
                setShiftInfo(response.data.data.shift_info);
                setCheckedTickets(response.data.data.checked_tickets);
                
                fetchStaffStats();
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra khi checkout');
        } finally {
            setCardId('');
            setCardBuffer('');
            setIsProcessing(false);
            isSubmitting.current = false;
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cardId) {
            handleCheckout(cardId);
        }
    };

    const fetchStaffStats = async () => {
        try {
            const response = await axios.get('/api/admin/shift-staff-stats');
            if (response.data.status === 'success') {
                setStaffStats(response.data.data);
            }
        } catch (error) {
            console.error('Lỗi khi lấy thống kê nhân viên:', error);
        }
    };

    useEffect(() => {
        fetchStaffStats();

        const interval = setInterval(fetchStaffStats, 60000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="checkout-wrapper">
            <h1 className="checkout-title">
                <span className="checkout-header-title">CHECKOUT NHÂN VIÊN</span>
            </h1>
            <div className="checkout-stats">
                <div className="checkout-stat-item">
                    <div className="checkout-stat-label">Tổng số nhân viên trong ca</div>
                    <div className="checkout-stat-value">{staffStats.total_staff}</div>
                </div>
                <div className="checkout-stat-item">
                    <div className="checkout-stat-label">Nhân viên đã checkout</div>
                    <div className="checkout-stat-value" style={{color: '#059669'}}>
                        {staffStats.checked_out_staff}
                    </div>
                </div>
                <div className="checkout-stat-item">
                    <div className="checkout-stat-label">Nhân viên chưa checkout</div>
                    <div className="checkout-stat-value" style={{color: '#ef4444'}}>
                        {staffStats.not_checked_out_staff}
                    </div>
                </div>
            </div>
            
            <div className="checkout-container">
                <div className="checkout-section checkout-search">
                    <h2>CHECKOUT NHÂN VIÊN</h2>
                    <div className="checkout-content">
                        <form onSubmit={handleSubmit} className="checkout-search-form">
                            <input
                                type="text"
                                value={cardId}
                                onChange={(e) => setCardId(e.target.value.toUpperCase())}
                                placeholder="Quẹt thẻ hoặc nhập mã thẻ..."
                                className="checkout-search-input"
                                ref={inputRef}
                                autoComplete="off"
                                disabled={isProcessing}
                            />
                            <button 
                                type="submit" 
                                className="checkout-search-button"
                                disabled={isProcessing || !cardId}
                            >
                                <FontAwesomeIcon icon={faUserCheck} className="fa-icon" />
                            </button>
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
                                        <div className="checkout-info-value">{checkedOutStaff?.group_name || 'Ch��a phân nhóm'}</div>
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
                                    <div className="checkout-shift-label">Thời gian làm việc:</div>
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
                                                        <th></th>
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
                                                            <td style={{color: ticket.is_checkout_with_other ? '#ef4444' : ''}}>{ticket.is_checkout_with_other ? 'Vé chia tiền' : ''}</td>
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
            
            <div className="checkout-footer">
                Powered by <a href="https://thinksoft.com.vn" target="_blank" rel="noopener noreferrer">thinksoft.com.vn</a>
            </div>
        </div>
    );
};

export default CheckoutScreen;