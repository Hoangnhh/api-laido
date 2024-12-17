import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faDesktop, 
    faUsers,
    faSpinner,
    faTag,
    faArrowRight,
    faChevronLeft,
    faChevronRight,
    faRotate,
    faUndo,
    faSearch,
    faTrash
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
    setShowTransferPopup,
    onSuccess
}) => {
    const [draggedStaff, setDraggedStaff] = useState(null);
    const [sourceStaff, setSourceStaff] = useState([]);
    const [targetStaff, setTargetStaff] = useState([]);
    const [originalSourceStaff, setOriginalSourceStaff] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (showTransferPopup) {
            const initialSourceStaff = sourceInfo?.staff_list || [];
            setSourceStaff(initialSourceStaff);
            setOriginalSourceStaff(initialSourceStaff);
            setTargetStaff(targetInfo?.staff_list || []);
            setSelectedStaff(new Set());
            setSearchTerm('');
        }
    }, [showTransferPopup, sourceInfo, targetInfo]);

    const filteredSourceStaff = sourceStaff.filter(staff => 
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleStaffSelect = (staff) => {
        if (staff.status !== 'WAITING') return;
        
        setSelectedStaff(prev => {
            const newSet = new Set(prev);
            if (newSet.has(staff.code)) {
                newSet.delete(staff.code);
            } else {
                newSet.add(staff.code);
            }
            return newSet;
        });
    };

    const handleDragStart = (e, staff) => {
        if (staff.status !== 'WAITING') return;

        let staffToTransfer;
        if (selectedStaff.has(staff.code)) {
            // Nếu staff được chọn, kéo tất cả staff đã chọn
            staffToTransfer = sourceStaff.filter(s => selectedStaff.has(s.code));
        } else {
            // Nếu staff chưa được chọn, chỉ kéo staff đó
            staffToTransfer = [staff];
            setSelectedStaff(new Set([staff.code]));
        }
        setDraggedStaff(staffToTransfer);
        e.currentTarget.classList.add('dragging');
    };

    const handleDrop = () => {
        if (draggedStaff) {
            const staffCodes = new Set(draggedStaff.map(s => s.code));
            setSourceStaff(prev => prev.filter(s => !staffCodes.has(s.code)));
            setTargetStaff(prev => [...prev, ...draggedStaff]);
            setSelectedStaff(new Set());
            setDraggedStaff(null);
        }
    };

    // Thêm hàm handleReset
    const handleReset = () => {
        // Khôi phục lại danh sách nhân viên ban đầu
        setSourceStaff(originalSourceStaff);
        setTargetStaff(targetInfo?.staff_list || []);
        // Reset các state khác
        setSelectedStaff(new Set());
        setDraggedStaff(null);
    };

    // Thêm hàm handleSave
    const handleSave = async () => {
        try {
            setLoading(true);
            
            // Lấy danh sách nhân viên đã được chuyển từ source sang target
            const transferredStaff = targetStaff.filter(staff => 
                !targetInfo?.staff_list?.find(s => s.code === staff.code)
            );

            if (transferredStaff.length === 0) {
                alert('Vui lòng chọn nhân viên cần chuyển cổng');
                return;
            }
            console.log(targetInfo);

            const response = await axios.post('/api/admin/staff/change-gate', {
                staff_list: transferredStaff.map(staff => staff.id), // Gửi danh sách ID nhân viên
                from_gate_shift_id: sourceInfo.id,
                target_gate_shift_id: targetInfo.id // ID của gate_shift trong ca đích
            });

            if (response.data.status === 'success') {
                alert('Điều chuyển nhân viên thành công');
                setShowTransferPopup(false);
                onSuccess?.(); // Gọi callback để refresh data
            } else {
                alert(response.data.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Lỗi khi điều chuyển nhân viên:', error);
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi điều chuyển nhân viên');
        } finally {
            setLoading(false);
        }
    };

    // Thêm hàm kiểm tra nhân viên mới được chuyển
    const isNewlyTransferred = (staffCode) => {
        return !targetInfo?.staff_list?.find(s => s.code === staffCode);
    };

    // Sắp xếp danh sách nhân viên bên cửa chuyển đến
    const sortedTargetStaff = useMemo(() => {
        return [...targetStaff].sort((a, b) => {
            const aIsNew = isNewlyTransferred(a.code);
            const bIsNew = isNewlyTransferred(b.code);
            if (aIsNew && !bIsNew) return -1;
            if (!aIsNew && bIsNew) return 1;
            return 0;
        });
    }, [targetStaff, targetInfo]);

    return (
        <div className="sa-popup-overlay">
            <div className="sa-popup-content sa-transfer-popup">
                <div className="sa-popup-header">
                    <h3>Xác nhận điều chuyển nhân viên</h3>
                    <button 
                        className="sa-close-button"
                        onClick={() => setShowTransferPopup(false)}
                    >×</button>
                </div>

                <div className="sa-transfer-container">
                    <div className="sa-transfer-column">
                        <div className="sa-transfer-column-header">
                            <div className="sa-column-title">
                                <FontAwesomeIcon icon={faDesktop} />
                                <span>{transferInfo.sourceGate?.name}</span>
                                <span className="sa-staff-count">
                                    ({sourceStaff.filter(s => s.status === 'WAITING').length} nhân viên)
                                </span>
                            </div>
                            <div className="sa-search-box">
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="sa-search-input"
                                />
                                <FontAwesomeIcon icon={faSearch} className="sa-search-icon" />
                            </div>
                        </div>
                        <div className="sa-staff-list source">
                            {filteredSourceStaff.map((staff) => (
                                <div 
                                    key={staff.code}
                                    className={`sa-staff-item source-item ${
                                        staff.status !== 'WAITING' ? 'disabled' : ''
                                    } ${
                                        selectedStaff.has(staff.code) ? 'selected' : ''
                                    }`}
                                    draggable={staff.status === 'WAITING'}
                                    onDragStart={(e) => handleDragStart(e, staff)}
                                    onClick={() => handleStaffSelect(staff)}
                                >
                                    <div className="sa-staff-info">
                                        <span className="sa-staff-code">{staff.code}</span>
                                        <span className="sa-staff-name">{staff.name}</span>
                                    </div>
                                    {staff.status !== 'WAITING' && (
                                        <span className="sa-staff-status">
                                            {staff.status === 'CHECKIN' ? 'Đã check-in' : 'Đã check-out'}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="sa-transfer-arrow">
                        <FontAwesomeIcon icon={faArrowRight} size="2x" />
                    </div>

                    <div className="sa-transfer-column">
                        <div className="sa-transfer-column-header">
                            <div className="sa-column-title">
                                <FontAwesomeIcon icon={faDesktop} />
                                <span>{transferInfo.targetGate?.name}</span>
                                <span className="sa-staff-count">
                                    ({targetStaff.length} nhân viên)
                                </span>
                            </div>
                        </div>
                        <div 
                            className="sa-staff-list target"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            {sortedTargetStaff.map((staff) => (
                                <div 
                                    key={staff.code}
                                    className={`sa-staff-item ${
                                        isNewlyTransferred(staff.code) ? 'newly-transferred' : ''
                                    }`}
                                >
                                    <div className="sa-staff-info">
                                        <span className="sa-staff-code">{staff.code}</span>
                                        <span className="sa-staff-name">{staff.name}</span>
                                    </div>
                                    {isNewlyTransferred(staff.code) && (
                                        <span className="sa-transfer-badge">
                                            <FontAwesomeIcon icon={faArrowRight} />
                                            Mới chuyển
                                        </span>
                                    )}
                                </div>
                            ))}
                            {targetStaff.length === 0 && (
                                <div className="sa-no-results">
                                    Kéo thả nhân viên vào đây
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="sa-popup-footer">
                    <button 
                        className="sa-reset-button"
                        onClick={handleReset}
                        type="button"
                    >
                        <FontAwesomeIcon icon={faUndo} />
                        Hoàn tác
                    </button>
                    <div className="sa-footer-right">
                        <button 
                            className="sa-confirm-button"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    Đang xử lý...
                                </>
                            ) : 'Xác nhận điều chuyển'}
                        </button>
                    </div>
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
        shiftId: null
    });
    const [sourceInfo, setSourceInfo] = useState(null);
    const [targetInfo, setTargetInfo] = useState(null);
    const [transferAmount, setTransferAmount] = useState(1);
    const [alert, setAlert] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    const [transferReason, setTransferReason] = useState('');
    const [tempReason, setTempReason] = useState('');
    const [extraShifts, setExtraShifts] = useState([]);
    const [showStaffPopup, setShowStaffPopup] = useState(false);
    const [selectedStaffList, setSelectedStaffList] = useState([]);
    const [popupTitle, setPopupTitle] = useState('');
    const [currentGateShiftId, setCurrentGateShiftId] = useState(null);

    const StaffListPopup = React.memo(({ 
        show, 
        onClose, 
        staffList, 
        title,
        gateShiftId,
        onDelete,
        canDelete = false
    }) => {
        if (!show) return null;

        const handleDelete = () => {
            if (window.confirm('Bạn có chắc chắn muốn xóa ca làm việc này?')) {
                onDelete(gateShiftId);
            }
        };

        return (
            <div className="sa-popup-overlay">
                <div className="sa-popup-content">
                    <div className="sa-popup-header">
                        <h3>{title}</h3>
                        <button className="sa-close-button" onClick={onClose}>×</button>
                    </div>
                    <div className="sa-staff-list">
                        {staffList.map((staff, index) => (
                            <div key={index} className="sa-staff-item">
                                <span className="sa-staff-code">{staff.code}</span>
                                <span className="sa-staff-name">{staff.name}</span>
                            </div>
                        ))}
                    </div>
                    <div className="sa-popup-footer">
                        {canDelete && (
                            <button 
                                className="sa-delete-button" 
                                onClick={handleDelete}
                                style={{ 
                                    backgroundColor: '#dc3545',
                                    marginRight: 'auto'
                                }}
                            >
                                <FontAwesomeIcon icon={faTrash} /> Xóa ca
                            </button>
                        )}
                        <button className="sa-close-button" onClick={onClose}>Đóng</button>
                    </div>
                </div>
            </div>
        );
    });

    const handleStaffListClick = (type, data, gateShiftId = null) => {
        try {
            if (type === 'extra') {
                setSelectedStaffList(extraShifts.map(staff => ({
                    name: staff.staff_name,
                    code: staff.staff_code
                })));
                setPopupTitle('Danh sách nhân viên ca bổ sung');
                setCurrentGateShiftId(null);
            } else {
                setSelectedStaffList(data);
                setPopupTitle(`Danh sách nhân viên`);
                setCurrentGateShiftId(gateShiftId);
            }
            setShowStaffPopup(true);
        } catch (error) {
            console.error('Lỗi khi xử lý danh sách nhân viên:', error);
            showAlert('Có lỗi xảy ra khi hiển thị danh sách nhân viên', 'error');
        }
    };

    useEffect(() => {
        fetchData();
        fetchDashboardData();
    }, []);

    const setDate = (date) => {
        setSelectedDate(date);
        console.log(date);
        fetchDashboardData(date);
    }

    const fetchDashboardData = async (date = selectedDate) => {
        try {
            setLoading(true);
            const response = await axios.post('/api/admin/get-assignments-dasboard', {
                date: date ? date.format('YYYY-MM-DD') : null
            });

            if (response.data.status === 'success') {
                setShiftData(response.data.shifts);
                setExtraShifts(response.data.extra_shifts || []);
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
            shiftId: targetShiftId
        });
        setSourceInfo(sourceGateInfo);
        setTargetInfo(targetGateInfo);
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


    // Helper function để render nội dung cell
    const renderShiftCell = (gateId, groupId) => {
        const shiftInfo = getShiftInfo(gateId, groupId);
        
        if (!shiftInfo) {
            return <div className="sa-shift-cell sa-empty">-</div>;
        }

        const currentGate = gates.find(g => g.id === gateId);
        const currentShift = shifts.find(s => s.id === groupId);
        const percentage = (shiftInfo.remaining_count / shiftInfo.total_staff) * 100;

        return (
            <div 
                className={`sa-shift-cell sa-active ${percentage <= 20 ? 'warning' : ''}`}
                onClick={() => handleStaffListClick('normal', shiftInfo.staff_list, shiftInfo.id)}
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

    const handleDeleteGateShift = async (gateShiftId) => {
        try {
            const response = await axios.post('/api/admin/delete-gate-shift', {
                gate_shift_id: gateShiftId
            });

            if (response.data.status === 'success') {
                showAlert('Xóa ca làm việc thành công', 'success');
                setShowStaffPopup(false);
                fetchDashboardData(selectedDate);
            } else {
                showAlert(response.data.message || 'Có lỗi xảy ra khi xóa ca làm việc', 'error');
            }
        } catch (error) {
            showAlert(error.response?.data?.message || 'Có lỗi xảy ra khi xóa ca làm việc', 'error');
        }
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
                        <div className="sa-date-control">
                            <button 
                                className="sa-date-btn"
                                onClick={() => {
                                    const newDate = dayjs(selectedDate).subtract(1, 'day');
                                    setDate(newDate);
                                }}
                                title="Ngày trước"
                            >
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>

                            <div className="sa-date-picker">
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
                            </div>

                            <button 
                                className="sa-date-btn"
                                onClick={() => {
                                    const newDate = dayjs(selectedDate).add(1, 'day');
                                    setDate(newDate);
                                }}
                                title="Ngày sau"
                            >
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>

                            <button 
                                className="sa-date-btn sa-date-refresh"
                                onClick={() => fetchDashboardData()}
                                title="Làm mới dữ liệu"
                            >
                                <FontAwesomeIcon icon={faRotate} />
                            </button>
                        </div>
                    </div>
                    <div className="sa-shift-controls">
                        <a 
                            href="/admin/add-extra-shift"
                            className="sa-extra-shift-button"
                            style={{ textDecoration: 'none' }}
                        >
                            {extraShifts.length > 0 ? 'Cập nhật ca bổ sung' : 'Thêm ca bổ sung'}
                        </a>
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
                        {extraShifts.length > 0 && (
                            <tr className="sa-extra-shift-row">
                                <td>
                                    <FontAwesomeIcon icon={faUsers} className="sa-extra-shift-icon" />
                                    <span>Ca bổ sung</span>
                                </td>
                                <td 
                                    colSpan={gates.length + 1}
                                    onClick={() => handleStaffListClick('extra')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="sa-extra-shift-content">
                                        <div className="sa-extra-shift-details">
                                            <div className="sa-extra-shift-item">
                                                <div className="sa-shift-info">
                                                    <div className="sa-battery-container">
                                                        <div className="sa-battery">
                                                            <div 
                                                                className="sa-battery-progress orange" 
                                                                style={{ 
                                                                    width: '100%',
                                                                    right: 0
                                                                }} 
                                                            />
                                                            <div className="sa-battery-label">
                                                                <span className="sa-current-index">
                                                                    Có {extraShifts.length} người trong ca bổ sung
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
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
                {showTransferPopup && (
                    <TransferPopup
                        showTransferPopup={showTransferPopup}
                        transferInfo={transferInfo}
                        sourceInfo={sourceInfo}
                        targetInfo={targetInfo}
                        setShowTransferPopup={setShowTransferPopup}
                        onSuccess={() => {
                            fetchDashboardData(selectedDate);
                        }}
                    />
                )}
                
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
                <StaffListPopup 
                    show={showStaffPopup}
                    onClose={() => setShowStaffPopup(false)}
                    staffList={selectedStaffList}
                    title={popupTitle}
                    gateShiftId={currentGateShiftId}
                    onDelete={handleDeleteGateShift}
                    canDelete={currentGateShiftId !== null}
                />
            </div>
        </AdminLayout>
    );
};

export default ShiftAssignments;