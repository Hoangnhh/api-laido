import React, { useState, useEffect } from 'react';
import AdminLayout from './Layout/AdminLayout';
import axios from 'axios';
import '../../../css/AddShiftGate.css';
import { 
    TextField, 
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel,
    TextareaAutosize,
    Snackbar,
    Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Loading from '../common/Loading';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const AddShiftGate = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [staffs, setStaffs] = useState([]);
    const [gates, setGates] = useState([]);
    const [staffGroups, setStaffGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedStaffs, setSelectedStaffs] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [assignmentType, setAssignmentType] = useState('');
    const [selectedGates, setSelectedGates] = useState([]);
    const [isHighlighted, setIsHighlighted] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const navigate = useNavigate();
    const [alert, setAlert] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    const [selectedDate, setSelectedDate] = useState(dayjs());

    useEffect(() => {
        fetchInitialData();
        const timer = setTimeout(() => {
            setIsHighlighted(false);
        }, 20000);
        return () => clearTimeout(timer);
    }, []);

    const fetchInitialData = async () => {
        try {
            const response = await axios.get('/api/admin/shift-assignments-data');
            const { gates, shifts } = response.data;
            
            setGates(gates || []);
            setStaffGroups(shifts || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const fetchStaffsByGroup = async (groupId) => {
        try {
            setStaffLoading(true);
            const response = await axios.get(`/api/admin/shift-assignments/get-staffs`, {
                params: {
                    date: selectedDate.format('YYYY-MM-DD'),
                    groupId: groupId
                }
            });
            
            if (response.data.status === 'success') {
                const staffList = response.data.staffs || [];
                setStaffs(staffList);
    
            }
        } catch (error) {
            console.error('Error fetching staffs:', error);
            showAlert('Có lỗi khi tải danh sách nhân viên', 'error');
        } finally {
            setStaffLoading(false);
        }
    };

    const handleGroupChange = (event) => {
        const newGroupId = event.target.value;
        setSelectedGroup(newGroupId);
        // Reset các state liên quan
        setSelectedStaffs([]);
        setSearchTerm('');
        setSelectedGates([]);
        setAssignmentType('');
        // Load lại danh sách nhân viên
        if (newGroupId) {
            fetchStaffsByGroup(newGroupId);
        } else {
            setStaffs([]);
        }
    };

    const filteredStaffs = staffs.filter(staff => {

        const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            staff.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGroup = true; // Bỏ điều kiện check group vì đã filter từ API

        return matchesSearch && matchesGroup;
    });

    const handleStaffSelect = (staffId) => {
        setSelectedStaffs(prev => {
            if (prev.includes(staffId)) {
                return prev.filter(id => id !== staffId);
            }
            return [...prev, staffId];
        });
    };

    const handleSelectAll = () => {
        // Chỉ lấy những nhân viên chưa được phân ca
        const availableStaffs = filteredStaffs.filter(staff => !staff.is_assigned);
        
        if (selectedStaffs.length === availableStaffs.length) {
            setSelectedStaffs([]);
        } else {
            const availableStaffIds = availableStaffs.map(staff => staff.id);
            setSelectedStaffs(availableStaffIds);
        }
    };

    const handleAssignmentTypeChange = (e) => {
        const type = e.target.value;
        setAssignmentType(type);
        
        if (type === 'all') {
            const allGateIds = gates.map(gate => gate.id);
            setSelectedGates(allGateIds);
        } else {
            setSelectedGates([]);
        }
    };

    const handleGateChange = (event) => {
        const {
            target: { value },
        } = event;
        setSelectedGates(typeof value === 'string' ? value.split(',') : value);
    };

    // Thêm hàm tính toán phân bổ nhân viên
    const calculateStaffDistribution = () => {
        if (!selectedStaffs.length || !selectedGates.length) return null;
        
        const staffPerGate = Math.floor(selectedStaffs.length / selectedGates.length);
        const remainder = selectedStaffs.length % selectedGates.length;
        
        return selectedGates.map((gateId, index) => {
            const gate = gates.find(g => g.id === gateId);
            // Cng thêm 1 nhân viên cho các vị trí đầu tiên nếu có số dư
            const extraStaff = index < remainder ? 1 : 0;
            return {
                gateId,
                gateName: gate?.name,
                staffCount: staffPerGate + extraStaff
            };
        });
    };

    // Thêm hàm xử lý tạo ca làm việc
    const handleCreateShift = async () => {
        try {
            setIsCreating(true);
            
            if (!selectedDate) {
                showAlert('Vui lòng chọn ngày trước khi tạo ca', 'error');
                return;
            }

            if (!selectedGroup || !selectedGates.length || !selectedStaffs.length) {
                showAlert('Vui lòng chọn đầy đủ thông tin trước khi tạo ca', 'error');
                return;
            }

            const response = await axios.post('/api/admin/shift-assignments', {
                date: selectedDate.format('YYYY-MM-DD'),
                staff_group_id: selectedGroup,
                gate_ids: selectedGates,
                staff_ids: selectedStaffs
            });

            if (response.data.status === 'success') {
                showAlert(response.data.message, 'success');
                
                setTimeout(() => {
                    navigate('/admin/shift-assignments');
                }, 1000);
            } else {
                showAlert(response.data.message || 'Có lỗi xảy ra khi tạo ca', 'error');
            }

        } catch (error) {
            if (error.response?.data?.status === 'error') {
                showAlert(error.response.data.message, 'error');
            } else {
                showAlert('Có lỗi xảy ra khi tạo ca làm việc', 'error');
            }
            console.error('Error creating shift:', error);
        } finally {
            setIsCreating(false);
        }
    };

    // Thêm component hiển thị phân bổ
    const StaffDistribution = () => {
        const distribution = calculateStaffDistribution();
        if (!distribution) return null;

        // Chia distribution thành 2 cột
        const midPoint = Math.ceil(distribution.length / 2);
        const leftColumn = distribution.slice(0, midPoint);
        const rightColumn = distribution.slice(midPoint);

        // Tính số nhân viên chưa được chọn
        const unassignedStaff = filteredStaffs.length - selectedStaffs.length;

        return (
            <>
                {isCreating && <Loading message="Đang tạo ca làm việc..." />}
                
                <div className="staff-distribution">
                    <h4>Phân bổ nhân viên:</h4>
                    <div className="distribution-grid">
                        <div className="distribution-column">
                            {leftColumn.map(item => (
                                <div key={item.gateId} className="distribution-item">
                                    <span className="gate-name">{item.gateName}</span>
                                    <span className="staff-count">{item.staffCount} nhân viên</span>
                                </div>
                            ))}
                        </div>
                        <div className="distribution-column">
                            {rightColumn.map(item => (
                                <div key={item.gateId} className="distribution-item">
                                    <span className="gate-name">{item.gateName}</span>
                                    <span className="staff-count">{item.staffCount} nhân viên</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="assignment-summary">
                    <div className="unassigned-staff">
                        <span>Nhân viên chưa được chọn:</span>
                        <span className="count">{unassignedStaff}</span>
                    </div>
                    <button 
                        className="create-shift-btn"
                        onClick={handleCreateShift}
                        disabled={isCreating}
                    >
                        Tạo ca làm việc
                    </button>
                </div>
            </>
        );
    };

    // Thêm hàm showAlert
    const showAlert = (message, severity = 'success') => {
        setAlert({
            open: true,
            message,
            severity
        });
    };

    // Thêm hàm handleCloseAlert
    const handleCloseAlert = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setAlert({
            ...alert,
            open: false
        });
    };

    // Cập nhật hàm xử lý thay đổi ngày
    const handleDateChange = (newValue) => {
        setSelectedDate(newValue);
        // Reset các state liên quan
        setSelectedGroup('');
        setSelectedStaffs([]);
        setStaffs([]);
        setSearchTerm('');
        setSelectedGates([]);
        setAssignmentType('');
    };

    if (loading) {
        return (
            <AdminLayout>
                <div>Đang tải...</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="add-shift-container">
                <div className="shift-header">
                    <h1>Phân ca làm việc</h1>
                </div>

                <div className="shift-content">
                    <div className="staff-selection">
                        <div className="search-section">
                            <div className="search-row">
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        label="Chọn ngày"
                                        value={selectedDate}
                                        onChange={handleDateChange}
                                        format="DD/MM/YYYY"
                                        className={`date-picker ${isHighlighted ? 'highlight-select' : ''}`}
                                        slotProps={{
                                            textField: {
                                                size: 'small'
                                            }
                                        }}
                                    />
                                </LocalizationProvider>

                                <FormControl 
                                    variant="outlined" 
                                    size="small" 
                                    className="group-select"
                                    disabled={!selectedDate}
                                >
                                    <InputLabel>Nhóm nhân viên</InputLabel>
                                    <Select
                                        value={selectedGroup}
                                        onChange={handleGroupChange}
                                        label="Nhóm nhân viên"
                                    >
                                        <MenuItem value="">Chọn nhóm nhân viên</MenuItem>
                                        {staffGroups.map(group => (
                                            <MenuItem key={group.id} value={group.id}>
                                                {group.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                
                                <div className="search-container">
                                    <TextField
                                        size="small"
                                        variant="outlined"
                                        placeholder="Tìm kiếm nhân viên"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="search-input"
                                    />
                                    
                                    {filteredStaffs.length > 0 && (
                                        <button 
                                            className={`select-all-btn ${selectedStaffs.length === filteredStaffs.length ? 'active' : ''}`}
                                            onClick={handleSelectAll}
                                        >
                                            {selectedStaffs.length === filteredStaffs.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="staff-list-container">
                            {staffLoading ? (
                                <div className="staff-loading">
                                    <div className="loading-spinner"></div>
                                    <span>Đang tải danh sách nhân viên...</span>
                                </div>
                            ) : filteredStaffs.length === 0 ? (
                                <div className="empty-staff-list">
                                    <div className="empty-icon">
                                        <i className="fas fa-users-slash"></i>
                                    </div>
                                    <span className="empty-text">Danh sách nhân viên đang trống</span>
                                    {searchTerm && <span className="empty-hint">Thử tìm kiếm với từ khóa khác</span>}
                                </div>
                            ) : (
                                <div className="staff-grid">
                                    {filteredStaffs.map((staff) => (
                                        <div 
                                            key={staff.id} 
                                            className={`staff-card ${staff.is_assigned ? 'assigned' : ''}`}
                                            onClick={() => !staff.is_assigned && handleStaffSelect(staff.id)}
                                        >
                                            {!staff.is_assigned && (
                                                <div 
                                                    className="checkbox-wrapper"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <input 
                                                        type="checkbox" 
                                                        id={`staff-${staff.id}`}
                                                        checked={selectedStaffs.includes(staff.id)}
                                                        onChange={() => handleStaffSelect(staff.id)}
                                                    />
                                                    <label 
                                                        htmlFor={`staff-${staff.id}`}
                                                        className="checkbox-label"
                                                    />
                                                </div>
                                            )}
                                            <div className="staff-info">
                                                <span className="staff-name">{staff.name}</span>
                                                <span className="staff-code">{staff.code}</span>
                                                {staff.is_assigned && staff.assignment && (
                                                    <div className="staff-assignment-info">
                                                        <i className="fas fa-info-circle"></i>
                                                        <span>
                                                            Đã phân ca: {staff.assignment.gate_name} (#{staff.assignment.index})
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="assignment-section">
                        <div className="selected-staff">
                            <h3>Đã chọn {selectedStaffs.length} nhân viên</h3>
                            
                            <FormControl fullWidth size="small">
                                <InputLabel>Tùy chọn phân ca</InputLabel>
                                <Select
                                    value={assignmentType}
                                    onChange={handleAssignmentTypeChange}
                                    label="Tùy chọn phân ca"
                                >
                                    <MenuItem value="">Tùy chọn phân ca</MenuItem>
                                    <MenuItem value="all">Chia đều cho tất cả các vị trí</MenuItem>
                                    <MenuItem value="specific">Chọn vị trí cụ thể</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <InputLabel>Chọn vị trí</InputLabel>
                                <Select
                                    multiple
                                    value={selectedGates}
                                    onChange={handleGateChange}
                                    label="Chọn vị trí"
                                    disabled={assignmentType === 'all'}
                                    renderValue={(selected) => {
                                        const selectedNames = selected.map(id => 
                                            gates.find(gate => gate.id === id)?.name
                                        );
                                        return selectedNames.join(', ');
                                    }}
                                >
                                    {gates.map(gate => (
                                        <MenuItem key={gate.id} value={gate.id}>
                                            {gate.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {(selectedStaffs.length > 0 && selectedGates.length > 0) && (
                                <StaffDistribution />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Thêm component Snackbar */}
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
        </AdminLayout>
    );
};

export default AddShiftGate;