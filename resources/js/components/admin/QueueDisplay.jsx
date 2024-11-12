import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../../css/QueueDisplay.css';

const QueueDisplay = () => {
    const [selectedPosition, setSelectedPosition] = useState(1);
    const [staffCode, setStaffCode] = useState('');
    const [error, setError] = useState('');
    const [assignments, setAssignments] = useState([]);
    const [checkedInAssignments, setCheckedInAssignments] = useState([]);
    const [positions, setPositions] = useState(Array.from({length: 10}, (_, i) => i + 1));
    const [maxWaitingItems, setMaxWaitingItems] = useState(5);
    const [checkedInStaff, setCheckedInStaff] = useState(null);

    const inputRef = useRef(null);

    useEffect(() => {
        fetchAssignments();
        
        const intervalId = setInterval(() => {
            fetchAssignments();
        }, 30000);

        return () => clearInterval(intervalId);
    }, [selectedPosition]);

    useEffect(() => {
        calculateMaxWaitingItems();
        window.addEventListener('resize', calculateMaxWaitingItems);
        return () => window.removeEventListener('resize', calculateMaxWaitingItems);
    }, []);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [checkedInStaff, error]);

    const fetchAssignments = async () => {
        try {
            const response = await axios.get(`/api/admin/get-assignments-by-gate?gate_id=${selectedPosition}`);
            setAssignments(response.data.assignments.waiting);
            setCheckedInAssignments(response.data.assignments.checkin);
        } catch (err) {
            console.error('Lỗi khi lấy danh sách phân ca:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setCheckedInStaff(null);
            
            const response = await axios.post('/api/admin/staff-checkin', {
                staff_code: staffCode,
                gate_id: selectedPosition,
                gate_shift_id: assignments[0]?.gate_shift_id
            });

            if (response.data.status === 'success') {
                setCheckedInStaff({
                    ...response.data.data,
                    success: true
                });
                fetchAssignments();
            } else {
                setError(response.data.message);
                setCheckedInStaff({
                    ...response.data.data,
                    error: true
                });
            }
            
            setStaffCode('');
            
        } catch (err) {
            setStaffCode('');
            setError(err.response?.data?.message || 'Có lỗi xảy ra khi checkin');
            
            if (err.response?.data?.data?.staff) {
                setCheckedInStaff({
                    staff: err.response.data.data.staff,
                    error: true
                });
            }
        }
    };

    const calculateMaxWaitingItems = () => {
        const containerHeight = window.innerHeight - 340;
        const headerHeight = 52;
        const itemHeight = 116;
        const contentPadding = 30;
        
        const availableHeight = containerHeight - headerHeight - contentPadding;
        const maxItems = Math.floor(availableHeight / itemHeight);
        
        setMaxWaitingItems(Math.min(Math.max(maxItems, 3), 8));
    };

    const renderWaitingList = () => {
        return assignments
            .slice(0, maxWaitingItems)
            .map((assignment) => (
                <div key={assignment.staff.id} className="qd-waiting-item">
                    <div className="qd-waiting-number">{assignment.index}</div>
                    <div className="qd-waiting-info">
                        <div className="qd-waiting-header">
                            <div className="qd-waiting-name">
                                {assignment.staff?.name}
                            </div>
                            <div className="qd-waiting-group">
                                {assignment.staff?.group_name || 'Chưa phân nhóm'}
                            </div>
                        </div>
                        <div className="qd-waiting-details">
                            <span className="qd-waiting-code">Mã NV: {assignment.staff?.code}</span>
                        </div>
                    </div>
                </div>
            ));
    };

    const renderCheckedInList = () => {
        return checkedInAssignments
            .slice(0, maxWaitingItems)
            .map((assignment) => (
                <div key={assignment.staff.id} className="qd-checkedin-item">
                    <div className="qd-checkedin-number">{assignment.index}</div>
                <div className="qd-checkedin-info">
                    <div className="qd-checkedin-header">
                        <div className="qd-checkedin-name">
                            {assignment.staff?.name}
                        </div>
                        <div className="qd-checkedin-group">
                            {assignment.staff?.group_name || 'Chưa phân nhóm'}
                        </div>
                    </div>
                    <div className="qd-checkedin-details">
                        <span className="qd-checkedin-code">Mã NV: {assignment.staff?.code}</span>
                    </div>
                </div>
            </div>
        ));
    };

    return (
        <div className="qd-wrapper">
            <h1 className="qd-title">
                HỆ THỐNG XẾP HÀNG TỰ ĐỘNG
                <div className="qd-controls">
                    <div className="qd-position-selector">
                        <span>Vị trí:</span>
                        <select 
                            value={selectedPosition}
                            onChange={(e) => setSelectedPosition(Number(e.target.value))}
                            className="qd-position-select"
                        >
                            {positions.map(pos => (
                                <option key={pos} value={pos}>Cửa số {pos}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </h1>
            <div className="qd-container">
                <div className="qd-section qd-search">
                    <h2>CHECKIN NHÂN VIÊN</h2>
                    <div className="qd-content">
                        <form onSubmit={handleSubmit} className="qd-search-form">
                            <input
                                type="text"
                                value={staffCode}
                                onChange={(e) => setStaffCode(e.target.value.toUpperCase())}
                                placeholder="Nhập mã nhân viên..."
                                className="qd-search-input"
                                ref={inputRef}
                            />
                            <button type="submit" className="qd-search-button">
                                Tìm kiếm
                            </button>
                        </form>
                        
                        {checkedInStaff && (
                            <div className="qd-staff-info">
                                <div className="qd-staff-avatar">
                                    <img src={checkedInStaff.staff.avatar_url || "/images/default-avatar.png"} alt="" />
                                </div>
                                <div className="qd-staff-number">
                                    #{checkedInStaff.assignment?.index || "000"}
                                </div>
                                <div className="qd-staff-details">
                                    <div className="qd-info-row">
                                        <div className="qd-info-label">Mã NV:</div>
                                        <div className="qd-info-value">
                                            {checkedInStaff.staff.code}
                                        </div>
                                    </div>
                                    <div className="qd-info-row">
                                        <div className="qd-info-label">Họ tên:</div>
                                        <div className="qd-info-value">
                                            {checkedInStaff.staff.name}
                                        </div>
                                    </div>
                                    <div className="qd-info-row">
                                        <div className="qd-info-label">Ca làm việc:</div>
                                        <div className={`qd-info-value ${checkedInStaff.error ? 'error' : ''}`}>
                                            {checkedInStaff.staff.group_name || 'Ca 2 (Không hợp lệ)'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {checkedInStaff?.success && (
                            <div className="qd-success">
                                Checkin thành công!
                            </div>
                        )}

                        {error && <div className="qd-error">{error}</div>}
                    </div>
                </div>
                
                <div className="qd-section qd-waiting">
                    <h2>Danh sách nhân viên chờ</h2>
                    <div className="qd-content">
                        {renderWaitingList()}
                    </div>
                </div>

                <div className="qd-section qd-serving">
                    <h2>Nhân viên đã checkin</h2>
                    <div className="qd-content">
                        {renderCheckedInList()}
                    </div>
                </div>
            </div>
       </div>
    );
};

export default QueueDisplay; 