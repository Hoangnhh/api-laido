import React, { useState, useEffect } from 'react';
import AdminLayout from './Layout/AdminLayout';
import axios from 'axios';
import '../../../css/AddExtraShift.css';
import { 
    TextField, 
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel,
    Snackbar,
    Alert
} from '@mui/material';
import Loading from '../common/Loading';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserAlt, faUserCheck, faUserPlus } from '@fortawesome/free-solid-svg-icons';

const AddExtraShift = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [staffs, setStaffs] = useState([]);
    const [staffGroups, setStaffGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedStaffs, setSelectedStaffs] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [isHighlighted, setIsHighlighted] = useState(true);
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [alert, setAlert] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    const [isCreating, setIsCreating] = useState(false);

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
            const { shifts } = response.data;
            console.log(shifts);
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
            const response = await axios.get('/api/admin/get-extra-staffs-by-group', {
                params: {
                    date: selectedDate.format('YYYY-MM-DD'),
                    groupId: groupId
                }
            });
            
            if (response.data.status === 'success') {
                const staffList = response.data.staffs || [];
                setStaffs(staffList);
                // Cập nhật selectedStaffs với các nhân viên đã có ca bổ sung
                const staffsWithExtraShift = staffList.filter(staff => staff.extra_shift).map(staff => staff.id);
                setSelectedStaffs(staffsWithExtraShift);
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
        setSelectedStaffs([]);
        setSearchTerm('');
        if (newGroupId) {
            fetchStaffsByGroup(newGroupId);
        } else {
            setStaffs([]);
        }
    };

    const filteredStaffs = staffs.filter(staff => {
        const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            staff.code.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
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
        const availableStaffs = filteredStaffs;
        if (selectedStaffs.length === availableStaffs.length) {
            setSelectedStaffs([]);
        } else {
            const availableStaffIds = availableStaffs.map(staff => staff.id);
            setSelectedStaffs(availableStaffIds);
        }
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

    // Thêm hàm xử lý tạo ca bổ sung
    const handleCreateExtraShift = async () => {
        if (!selectedDate || selectedStaffs.length === 0) {
            showAlert('Vui lòng chọn ngày và ít nhất một nhân viên', 'error');
            return;
        }

        try {
            setIsCreating(true);
            const response = await axios.post('/api/admin/create-extra-shift', {
                date: selectedDate.format('YYYY-MM-DD'),
                staffIds: selectedStaffs,
                groupId: selectedGroup
            });

            if (response.data.status === 'success') {
                showAlert('Tạo ca bổ sung thành công', 'success');
                // Reset form sau khi tạo thành công
                setSelectedStaffs([]);
                setSearchTerm('');
                setStaffs([]);
                setSelectedGroup('');
            } else {
                showAlert(response.data.message || 'Có lỗi xảy ra', 'error');
            }
        } catch (error) {
            console.error('Error creating extra shift:', error);
            showAlert('Có lỗi khi tạo ca bổ sung', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    // Thêm useEffect để theo dõi thay đổi của selectedDate
    useEffect(() => {
        if (selectedGroup) {
            fetchStaffsByGroup(selectedGroup);
        }
    }, [selectedDate]); // Chạy lại khi selectedDate thay đổi

    const handleDateChange = (newValue) => {
        // Kiểm tra nếu là ngày quá khứ
        if (newValue.isBefore(dayjs(), 'day')) {
            showAlert('Không thể chọn ngày trong quá khứ', 'error');
            return;
        }
        
        // Reset các state liên quan
        setSelectedStaffs([]);
        setStaffs([]);
        // Cập nhật ngày
        setSelectedDate(newValue);
    };

    return (
        <AdminLayout>
            <div className="extshift-add-shift-container">
                <div className="extshift-shift-header">
                    <h1>Phân ca làm việc bổ sung</h1>
                </div>

                <div className="extshift-shift-content">
                    <div className="extshift-main-section">
                        <div className="extshift-staff-selection">
                            <div className="extshift-search-section">
                                <div className="extshift-date-group-row">
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            label="Chọn ngày"
                                            value={selectedDate}
                                            onChange={handleDateChange}
                                            format="DD/MM/YYYY"
                                            className={`extshift-date-picker ${isHighlighted ? 'highlight-select' : ''}`}
                                            slotProps={{
                                                textField: {
                                                    size: 'small'
                                                },
                                                calendar: {
                                                    sx: {
                                                        '& .MuiPickersDay-root.Mui-disabled': {
                                                            display: 'none'
                                                        }
                                                    }
                                                }
                                            }}
                                            minDate={dayjs()}
                                            disablePast={true}
                                            shouldDisableDate={(date) => date.isBefore(dayjs(), 'day')}
                                        />
                                    </LocalizationProvider>

                                    <FormControl 
                                        variant="outlined" 
                                        size="small" 
                                        className="extshift-group-select"
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

                                    <div className="extshift-search-container">
                                        <TextField
                                            size="small"
                                            variant="outlined"
                                            placeholder="Tìm kiếm nhân viên"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="extshift-search-input"
                                        />
                                        
                                        {filteredStaffs.length > 0 && (
                                            <button 
                                                className={`extshift-select-all-btn ${
                                                    selectedStaffs.length === filteredStaffs.length ? 'active' : ''
                                                }`}
                                                onClick={handleSelectAll}
                                            >
                                                {selectedStaffs.length === filteredStaffs.length 
                                                    ? 'Bỏ chọn tất cả' 
                                                    : 'Chọn tất cả'
                                                }
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="extshift-staff-list-container">
                                {staffLoading ? (
                                    <div className="extshift-staff-loading">
                                        <div className="loading-spinner"></div>
                                        <span>Đang tải danh sách nhân viên...</span>
                                    </div>
                                ) : filteredStaffs.length === 0 ? (
                                    <div className="extshift-empty-staff-list">
                                        <div className="empty-icon">
                                            <i className="fas fa-users-slash"></i>
                                        </div>
                                        <span className="empty-text">Danh sách nhân viên đang trống</span>
                                        {searchTerm && <span className="empty-hint">Thử tìm kiếm với từ khóa khác</span>}
                                    </div>
                                ) : (
                                    <div className="extshift-staff-grid">
                                        {filteredStaffs.map((staff) => (
                                            <div 
                                                key={staff.id} 
                                                className={`extshift-staff-card ${selectedStaffs.includes(staff.id) ? 'selected' : ''}`}
                                                onClick={() => handleStaffSelect(staff.id)}
                                            >
                                                <div className="extshift-staff-info">
                                                    <span className="extshift-staff-name">{staff.name}</span>
                                                    <span className="extshift-staff-code">{staff.code}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="extshift-info-section">
                        <div className="extshift-info-content">
                            <h3>Thông tin đã chọn</h3>
                            <div className="extshift-staff-counts-info">
                                <div className="extshift-count-badge total">
                                    <FontAwesomeIcon icon={faUserAlt} className="me-1" />
                                    Tổng số: {staffs.length}
                                </div>
                                <div className="extshift-count-badge selected">
                                    <FontAwesomeIcon icon={faUserCheck} className="me-1" />
                                    Đã chọn: {selectedStaffs.length}
                                </div>
                            </div>

                            {/* Thêm nút tạo ca bổ sung */}
                            <button 
                                className="extshift-create-btn"
                                onClick={handleCreateExtraShift}
                                disabled={isCreating || selectedStaffs.length === 0}
                            >
                                {isCreating ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin me-2"></i>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-plus-circle me-2"></i>
                                        Cập nhật ca bổ sung
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

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

export default AddExtraShift; 