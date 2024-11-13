import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faDesktop, 
    faUsers,
    faSpinner,
    faTag,
    faArrowRight,
    faCheckCircle,
    faUserClock,
    faBalanceScale,
    faChevronLeft,
    faChevronRight,
    faRotate
} from '@fortawesome/free-solid-svg-icons';
import AdminLayout from './Layout/AdminLayout';
import axios from 'axios';
import '../../../css/ShiftAssignments.css';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { Snackbar, Alert } from '@mui/material';
import Loading from '../common/Loading';

// Tách TransferPopup thành component riêng để tránh re-render
const TransferPopup = React.memo(({ 
    showTransferPopup,
    transferInfo,
    sourceInfo,
    targetInfo,
    shifts,
    transferAmount,
    tempReason,
    transferReason,
    handleReasonChange,
    handleTransfer,
    handleBalance,
    setTransferAmount,
    setShowTransferPopup,
    setTransferReason
}) => {
    if (!showTransferPopup) return null;

    const currentShift = shifts.find(s => s.id === transferInfo.shiftId);
    
    // Tính toán số lượng sau khi chuyển
    const sourceRemaining = sourceInfo?.remaining_count - transferAmount;
    const targetRemaining = targetInfo?.remaining_count + transferAmount;

    return (
        <div className="sa-popup-overlay">
            <div className="sa-popup-content sa-transfer-popup">
                <h3>Xác nhận điều chuyển nhân viên</h3>
                
                <div className="sa-transfer-info">
                    <div className="sa-shift-info-header">
                        <div className="sa-current-shift">
                            <FontAwesomeIcon icon={faTag} className="sa-shift-icon" />
                            <span>Ca: {currentShift?.name}</span>
                        </div>
                    </div>

                    <div className="sa-gates-container">
                        <div className="sa-gate-detail sa-source">
                            <h4>Vị trí chuyển đi</h4>
                            <div className="sa-gate-name">
                                <FontAwesomeIcon icon={faDesktop} />
                                <span>{transferInfo.sourceGate?.name}</span>
                            </div>
                            <div className="sa-gate-stats-grid">
                                <div className="sa-stat-item">
                                    <FontAwesomeIcon icon={faUsers} className="sa-stat-icon" />
                                    <span className="sa-stat-value">{sourceInfo?.total_staff || 0}</span>
                                    <span className="sa-stat-label">Tổng</span>
                                </div>
                                <div className="sa-stat-item">
                                    <FontAwesomeIcon icon={faCheckCircle} className="sa-stat-icon checked" />
                                    <span className="sa-stat-value checked">{sourceInfo?.checked_in_count || 0}</span>
                                    <span className="sa-stat-label">Đã check-in</span>
                                </div>
                                <div className="sa-stat-item">
                                    <FontAwesomeIcon icon={faUserClock} className="sa-stat-icon remaining" />
                                    <span className="sa-stat-value remaining">{sourceInfo?.remaining_count || 0}</span>
                                    <span className="sa-stat-label">Còn lại</span>
                                </div>
                            </div>
                        </div>

                        <div className="sa-transfer-arrow">
                            <FontAwesomeIcon icon={faArrowRight} size="lg" />
                        </div>

                        <div className="sa-gate-detail sa-target">
                            <h4>Vị trí chuyển đến</h4>
                            <div className="sa-gate-name">
                                <FontAwesomeIcon icon={faDesktop} />
                                <span>{transferInfo.targetGate?.name}</span>
                            </div>
                            <div className="sa-gate-stats-grid">
                                <div className="sa-stat-item">
                                    <FontAwesomeIcon icon={faUsers} className="sa-stat-icon" />
                                    <span className="sa-stat-value">{targetInfo?.total_staff || 0}</span>
                                    <span className="sa-stat-label">Tổng</span>
                                </div>
                                <div className="sa-stat-item">
                                    <FontAwesomeIcon icon={faCheckCircle} className="sa-stat-icon checked" />
                                    <span className="sa-stat-value checked">{targetInfo?.checked_in_count || 0}</span>
                                    <span className="sa-stat-label">Đã check-in</span>
                                </div>
                                <div className="sa-stat-item">
                                    <FontAwesomeIcon icon={faUserClock} className="sa-stat-icon remaining" />
                                    <span className="sa-stat-value remaining">{targetInfo?.remaining_count || 0}</span>
                                    <span className="sa-stat-label">Còn lại</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="sa-transfer-details">
                        <div className="sa-transfer-preview">
                            <div className="sa-preview-header">
                                <h4>Dự kiến sau khi chuyển</h4>
                                <button 
                                    className="sa-balance-button"
                                    onClick={handleBalance}
                                    title="Cân bằng số lượng giữa 2 cổng"
                                >
                                    <FontAwesomeIcon icon={faBalanceScale} />
                                    Cân bằng 2 bên
                                </button>
                            </div>
                            <div className="sa-preview-stats">
                                <div className="sa-preview-item">
                                    <span className="sa-gate-name">{transferInfo.sourceGate?.name}</span>
                                    <div className="sa-preview-count">
                                        <span className="sa-current">{sourceInfo?.remaining_count}</span>
                                        <FontAwesomeIcon icon={faArrowRight} className="sa-arrow" />
                                        <span className="sa-after">{sourceRemaining}</span>
                                    </div>
                                </div>
                                <div className="sa-preview-item">
                                    <span className="sa-gate-name">{transferInfo.targetGate?.name}</span>
                                    <div className="sa-preview-count">
                                        <span className="sa-current">{targetInfo?.remaining_count}</span>
                                        <FontAwesomeIcon icon={faArrowRight} className="sa-arrow" />
                                        <span className="sa-after">{targetRemaining}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="sa-amount-input">
                            <label>Số lượng điều chuyển:</label>
                            <input 
                                type="number"
                                min="1"
                                max={transferInfo.maxAmount}
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(Math.min(
                                    Math.max(1, parseInt(e.target.value) || 0),
                                    transferInfo.maxAmount
                                ))}
                            />
                            <span className="sa-max-amount">
                                (Tối đa: {transferInfo.maxAmount})
                            </span>
                        </div>

                        <div className="sa-reason-input">
                            <label>Lý do điều chuyển:</label>
                            <textarea
                                value={tempReason}
                                onChange={handleReasonChange}
                                placeholder="Nhập lý do điều chuyển..."
                                rows={3}
                                className="sa-transfer-reason"
                            />
                        </div>
                    </div>
                </div>

                <div className="sa-popup-actions">
                    <button 
                        className="sa-cancel-button"
                        onClick={() => {
                            setShowTransferPopup(false);
                            setTransferReason('');
                        }}
                    >
                        Hủy
                    </button>
                    <button 
                        className="sa-confirm-button"
                        onClick={handleTransfer}
                        disabled={!transferReason.trim()}
                    >
                        Xác nhận điều chuyển
                    </button>
                </div>
            </div>
        </div>
    );
});

const ShiftAssignments = () => {
    const [gates, setGates] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [shiftData, setShiftData] = useState([]);
    const [draggedCell, setDraggedCell] = useState(null);
    const [showTransferPopup, setShowTransferPopup] = useState(false);
    const [transferInfo, setTransferInfo] = useState({
        sourceGate: null,
        targetGate: null,
        shiftId: null,
        maxAmount: 0
    });
    const [transferAmount, setTransferAmount] = useState(1);
    const [alert, setAlert] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    const [transferReason, setTransferReason] = useState('');
    const [tempReason, setTempReason] = useState('');
    const [reasonTimeout, setReasonTimeout] = useState(null);

    useEffect(() => {
        fetchData();
        fetchDashboardData();
    }, []);

    const setDate = (date) => {
        setSelectedDate(date);
        console.log(date);
        fetchDashboardData(date);
    }

    const fetchDashboardData = async (date = false) => {
        try {
            setLoading(true);
            const response = await axios.post('/api/admin/get-assignments-dasboard', {
                date: date ? date.format('YYYY-MM-DD') : null
            });

            if (response.data.status === 'success') {
                setShiftData(response.data.shifts);
                // Cập nhật selectedDate theo ngày trả về từ API
                if (selectedDate == null && response.data.date) {
                    setSelectedDate(dayjs(response.data.date));
                }
            } else {
                setError('Có lỗi xảy ra khi tải dữ liệu');
            }
        } catch (err) {
            setError('Có lỗi xảy ra khi tải dữ liệu');
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            const response = await axios.get('/api/admin/shift-assignments-data');
            setGates(response.data.gates);
            setShifts(response.data.shifts);
            setLoading(false);
        } catch (err) {
            setError('Có lỗi xảy ra khi tải dữ liệu');
            setLoading(false);
            console.error('Error fetching data:', err);
        }
    };

    // Helper function để lấy thông tin shift
    const getShiftInfo = (gateId, groupId) => {
        return shiftData.find(
            shift => shift.gate_id === gateId && shift.staff_group_id === groupId
        );
    };

    // Thêm các hàm xử lý drag & drop
    const handleDragStart = (e, gateId, shiftId) => {
        setDraggedCell({ gateId, shiftId });
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('dragging');
        setDraggedCell(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = async (e, targetGateId, targetShiftId) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        if (!draggedCell) return;

        // Kiểm tra nếu khác group
        if (draggedCell.shiftId !== targetShiftId) {
            showAlert('Thao tác không được cho phép: Không thể chuyển nhân viên giữa các ca khác nhau', 'error');
            return;
        }

        // Nếu cùng cổng thì không làm gì
        if (draggedCell.gateId === targetGateId) return;

        // Lấy thông tin của cả 2 cổng
        const sourceGateInfo = getShiftInfo(draggedCell.gateId, targetShiftId);
        const targetGateInfo = getShiftInfo(targetGateId, targetShiftId);
        
        if (!sourceGateInfo || !targetGateInfo) return;

        // Hiển thị popup với thông tin
        setTransferInfo({
            sourceGate: gates.find(g => g.id === draggedCell.gateId),
            targetGate: gates.find(g => g.id === targetGateId),
            shiftId: targetShiftId,
            maxAmount: sourceGateInfo.remaining_count
        });
        setTransferAmount(1);
        setShowTransferPopup(true);
    };

    // Thêm hàm xử lý chuyển nhân viên
    const handleTransfer = async () => {
        try {
            const response = await axios.post('/api/admin/transfer-staff', {
                sourceGateId: transferInfo.sourceGate.id,
                targetGateId: transferInfo.targetGate.id,
                shiftId: transferInfo.shiftId,
                amount: transferAmount,
                reason: transferReason
            });
            
            if (response.data.status === 'success') {
                setShowTransferPopup(false);
                setTransferReason('');
                setTempReason('');
                fetchDashboardData();
                showAlert('Chuyển nhân viên thành công', 'success');
            }
        } catch (error) {
            console.error('Lỗi khi chuyển nhân viên:', error);
            showAlert(error.response?.data?.message || 'Có lỗi xảy ra khi chuyển nhân viên', 'error');
        }
    };

    // Hàm cân bằng 2 bên
    const handleBalance = () => {
        const totalRemaining = sourceInfo?.remaining_count + targetInfo?.remaining_count;
        const balanceAmount = Math.floor(totalRemaining / 2);
        const transferNeeded = sourceInfo?.remaining_count - balanceAmount;
        
        if (transferNeeded > 0) {
            setTransferAmount(Math.min(transferNeeded, transferInfo.maxAmount));
        }
    };

    // Helper function để render nội dung cell
    const renderShiftCell = (gateId, groupId) => {
        const shiftInfo = getShiftInfo(gateId, groupId);
        
        if (!shiftInfo) {
            return <div className="sa-shift-cell sa-empty">-</div>;
        }

        // Tính toán phần trăm dựa trên số người còn lại
        const percentage = (shiftInfo.remaining_count / shiftInfo.total_staff) * 100;
        
        // Thêm class warning nếu percentage <= 20%
        const cellClassName = `sa-shift-cell sa-active ${percentage <= 20 ? 'warning' : ''}`;

        return (
            <div 
                className={cellClassName}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, gateId, groupId)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, gateId, groupId)}
            >
                <div className="sa-shift-info">
                    <div className="sa-staff-info">
                        <div className="sa-info-badge">
                            <FontAwesomeIcon icon={faTag} />
                            <span>{shiftInfo.min_index} → {shiftInfo.max_index}</span>
                        </div>
                    </div>
                    <div className="sa-battery-container">
                        <span className="sa-min-index">
                            <span className="sa-checked-count">{shiftInfo.checked_in_count}</span>
                        </span>
                        <div className="sa-battery">
                            <div 
                                className="sa-battery-progress" 
                                style={{ 
                                    width: `${percentage}%`,
                                    right: 0,
                                    backgroundColor: getBatteryColor(percentage)
                                }} 
                            />
                            <div className="sa-battery-label">
                                <span className="sa-current-index">
                                    Còn {shiftInfo.remaining_count}
                                </span>
                            </div>
                        </div>
                        <span className="sa-max-index">
                            <span className="sa-total-count">{shiftInfo.total_staff}</span>
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const showAlert = (message, severity = 'success') => {
        setAlert({
            open: true,
            message,
            severity
        });
    };

    const handleCloseAlert = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setAlert({
            ...alert,
            open: false
        });
    };

    // Di chuyển hàm getBatteryColor ra khỏi renderShiftCell
    const getBatteryColor = (percent) => {
        if (percent <= 20) return '#e74c3c';
        if (percent <= 50) return '#f1c40f';
        return '#4CAF50';
    };

    // Hàm xử lý debounce cho việc nhập lý do
    const handleReasonChange = (e) => {
        const value = e.target.value;
        setTempReason(value);
        setTransferReason(value);
    };

    if (loading) {
        return (
            <AdminLayout>
                <Loading />
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="sa-error-container">
                    <span>{error}</span>
                    <button onClick={fetchData}>Thử lại</button>
                </div>
            </AdminLayout>
        );
    }

    // Render TransferPopup với props
    return (
        <AdminLayout>
            <div className="sa-shift-assignments">
                <div className="sa-shift-header">
                    <div className="sa-header-left">
                        <h1>Phân ca làm việc</h1>
                        <div className="sa-date-navigation">
                            <button 
                                className="sa-date-nav-btn"
                                onClick={() => {
                                    const newDate = dayjs(selectedDate).subtract(1, 'day');
                                    setDate(newDate);
                                }}
                                title="Ngày trước"
                            >
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>

                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Chọn ngày"
                                    value={selectedDate}
                                    onChange={(newValue) => {
                                        setDate(newValue);
                                    }}
                                    format="DD/MM/YYYY"
                                    slotProps={{
                                        textField: {
                                            size: 'small'
                                        }
                                    }}
                                />
                            </LocalizationProvider>

                            <button 
                                className="sa-date-nav-btn"
                                onClick={() => {
                                    const newDate = dayjs(selectedDate).add(1, 'day');
                                    setDate(newDate);
                                }}
                                title="Ngày sau"
                            >
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>

                            <button 
                                className="sa-date-nav-btn sa-refresh-btn"
                                onClick={() => fetchDashboardData()}
                                title="Làm mới dữ liệu"
                            >
                                <FontAwesomeIcon icon={faRotate} />
                            </button>
                        </div>
                    </div>
                    <div className="sa-shift-controls">
                        <a 
                            href="/admin/add-shift-gate"
                            className="sa-shift-button"
                            style={{ textDecoration: 'none' }}
                        >
                            Phân ca làm việc
                        </a>
                    </div>
                </div>
                
                <table className="sa-shift-table">
                    <thead>
                        <tr>
                            <th>Vị trí</th>
                            {shifts.map((shift) => (
                                <th key={shift.id}>
                                    <div className="sa-shift-header-cell">
                                        <span>{shift.name}</span>
                                        <div className="sa-shift-count">
                                            <FontAwesomeIcon icon={faUsers} />
                                            <span>{shift.staffs_count}</span>
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {gates.map((gate) => (
                            <tr key={gate.id}>
                                <td>
                                    <div className="sa-gate-cell">
                                        <FontAwesomeIcon icon={faDesktop} className="sa-gate-icon" />
                                        <span>{gate.name}</span>
                                    </div>
                                </td>
                                {shifts.map((shift) => (
                                    <td key={`${gate.id}-${shift.id}`}>
                                        {renderShiftCell(gate.id, shift.id)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <TransferPopup 
                    showTransferPopup={showTransferPopup}
                    transferInfo={transferInfo}
                    sourceInfo={getShiftInfo(transferInfo.sourceGate?.id, transferInfo.shiftId)}
                    targetInfo={getShiftInfo(transferInfo.targetGate?.id, transferInfo.shiftId)}
                    shifts={shifts}
                    transferAmount={transferAmount}
                    tempReason={tempReason}
                    transferReason={transferReason}
                    handleReasonChange={handleReasonChange}
                    handleTransfer={handleTransfer}
                    handleBalance={handleBalance}
                    setTransferAmount={setTransferAmount}
                    setShowTransferPopup={setShowTransferPopup}
                    setTransferReason={setTransferReason}
                />
                
                <Snackbar 
                    open={alert.open}
                    autoHideDuration={3000}
                    onClose={handleCloseAlert}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Alert 
                        onClose={handleCloseAlert} 
                        severity={alert.severity}
                        variant="filled"
                    >
                        {alert.message}
                    </Alert>
                </Snackbar>
            </div>
        </AdminLayout>
    );
};

export default ShiftAssignments;