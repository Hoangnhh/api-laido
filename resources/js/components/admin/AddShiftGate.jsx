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
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Loading from '../common/Loading';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserAlt, faUserCheck, faUserPlus } from '@fortawesome/free-solid-svg-icons';

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
    const [pushNotification, setPushNotification] = useState(true);
    const [selectedVehicalType, setSelectedVehicalType] = useState('');
    const [selectedDefaultGate, setSelectedDefaultGate] = useState('');

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
        const matchesVehicalType = !selectedVehicalType || staff.vehical_type === selectedVehicalType;
        const matchesDefaultGate = !selectedDefaultGate || staff.default_gate_id === selectedDefaultGate;
        
        return matchesSearch && matchesVehicalType && matchesDefaultGate;
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
        
        switch(type) {
            case 'all':
                const allGateIds = gates.map(gate => gate.id);
                setSelectedGates(allGateIds);
                break;
            case 'default':
                const allGatesForDefault = gates.map(gate => gate.id);
                setSelectedGates(allGatesForDefault);
                break;
            case 'specific':
                setSelectedGates([]);
                break;
            default:
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
        
        // Tách nhân viên theo vehical_type
        const selectedStaffDetails = selectedStaffs.map(id => 
            staffs.find(staff => staff.id === id)
        );
        
        const type1Staffs = selectedStaffDetails.filter(staff => staff.vehical_type === 1);
        const type2Staffs = selectedStaffDetails.filter(staff => staff.vehical_type === 2);
        
        return selectedGates.map((gateId) => {
            const gate = gates.find(g => g.id === gateId);
            
            // Tính số nhân viên cho mỗi loại phương tiện
            const type1PerGate = Math.floor(type1Staffs.length / selectedGates.length);
            const type2PerGate = Math.floor(type2Staffs.length / selectedGates.length);
            
            // Tính số dư để phân bổ thêm
            const type1Remainder = type1Staffs.length % selectedGates.length;
            const type2Remainder = type2Staffs.length % selectedGates.length;
            
            // Lấy số nhân viên đã được phân ca theo từng loại
            const assignedStaffs = staffs.filter(staff => 
                staff.is_assigned && 
                staff.assignment && 
                staff.assignment.gate_name === gate?.name
            );
            
            const assignedType1Count = assignedStaffs.filter(staff => staff.vehical_type === 1).length;
            const assignedType2Count = assignedStaffs.filter(staff => staff.vehical_type === 2).length;

            return {
                gateId,
                gateName: gate?.name,
                type1Count: type1PerGate + (selectedGates.indexOf(gateId) < type1Remainder ? 1 : 0),
                type2Count: type2PerGate + (selectedGates.indexOf(gateId) < type2Remainder ? 1 : 0),
                assignedType1Count,
                assignedType2Count
            };
        });
    };

    // Thêm hàm tính toán phân bổ nhân viên theo cổng mặc định
    const calculateDefaultDistribution = () => {
        if (!selectedStaffs.length) return null;
        
        // Tạo object phân bổ theo cổng
        const distribution = gates.map(gate => {
            // Lọc nhân viên có default_gate_id trùng với gate hiện tại
            const defaultStaffs = selectedStaffs
                .map(staffId => staffs.find(s => s.id === staffId))
                .filter(staff => staff.default_gate_id === gate.id);
            
            // Tách nhân viên theo loại phương tiện
            const type1Staffs = defaultStaffs.filter(staff => staff.vehical_type === 1);
            const type2Staffs = defaultStaffs.filter(staff => staff.vehical_type === 2);
            
            // Lấy số nhân viên đã được phân ca
            const assignedStaffs = staffs.filter(staff => 
                staff.is_assigned && 
                staff.assignment && 
                staff.assignment.gate_name === gate.name
            );
            
            return {
                gateId: gate.id,
                gateName: gate.name,
                type1Count: type1Staffs.length,
                type2Count: type2Staffs.length,
                assignedType1Count: assignedStaffs.filter(staff => staff.vehical_type === 1).length,
                assignedType2Count: assignedStaffs.filter(staff => staff.vehical_type === 2).length
            };
        });

        return distribution;
    };

    // Thêm component hiển thị phân bổ mặc định
    const DefaultDistribution = () => {
        const distribution = calculateDefaultDistribution();
        if (!distribution) return null;

        return (
            <div className="staff-distribution">
                <h4>
                    <i className="fas fa-random me-2"></i>
                    Phân bổ nhân viên theo vị trí mặc định:
                </h4>
                <div className="distribution-grid">
                    {distribution.map(item => (
                        <div key={item.gateId} className="distribution-item">
                            <div className="gate-info">
                                <div className="gate-name">
                                    <i className="fas fa-door-open"></i>
                                    {item.gateName}
                                </div>
                                
                                <div className="staff-counts">
                                    {/* Đò - Type 1 - Mới */}
                                    {item.type1Count > 0 && (
                                        <div className="count-item type-1" title="Đò - Phân ca mới">
                                            <FontAwesomeIcon icon={faUserPlus} />
                                            <span className="count-number">{item.type1Count}</span>
                                        </div>
                                    )}
                                    
                                    {/* Đò - Type 1 - Đã phân ca */}
                                    {item.assignedType1Count > 0 && (
                                        <div className="count-item type-1" title="Đò - Đã phân ca">
                                            <FontAwesomeIcon icon={faUserCheck} />
                                            <span className="count-number">{item.assignedType1Count}</span>
                                        </div>
                                    )}
                                    
                                    {/* Xuồng - Type 2 - Mới */}
                                    {item.type2Count > 0 && (
                                        <div className="count-item type-2" title="Xuồng - Phân ca mới">
                                            <FontAwesomeIcon icon={faUserPlus} />
                                            <span className="count-number">{item.type2Count}</span>
                                        </div>
                                    )}
                                    
                                    {/* Xuồng - Type 2 - Đã phân ca */}
                                    {item.assignedType2Count > 0 && (
                                        <div className="count-item type-2" title="Xuồng - Đã phân ca">
                                            <FontAwesomeIcon icon={faUserCheck} />
                                            <span className="count-number">{item.assignedType2Count}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Thêm hàm xử lý phân ca theo cổng mặc định
    const handleDefaultGateAssignment = async () => {
        try {
            setIsCreating(true);
            
            if (!selectedDate) {
                showAlert('Vui lòng chọn ngày trước khi tạo ca', 'error');
                return;
            }

            if (!selectedGroup || !selectedStaffs.length) {
                showAlert('Vui lòng chọn đầy đủ thông tin trước khi tạo ca', 'error');
                return;
            }

            // Tạo shift_info theo cổng mặc định
            const shiftInfo = gates.map(gate => ({
                gate_id: gate.id,
                staff_ids: selectedStaffs.filter(staffId => 
                    staffs.find(s => s.id === staffId)?.default_gate_id === gate.id
                )
            })).filter(info => info.staff_ids.length > 0);

            const response = await axios.post('/api/admin/create-default-gate-assignment', {
                date: selectedDate.format('YYYY-MM-DD'),
                staff_group_id: selectedGroup,
                push_notification: pushNotification,
                shift_info: shiftInfo
            });

            if (response.data.status === 'success') {
                showAlert(response.data.message, 'success');
                await fetchStaffsByGroup(selectedGroup);
                setSelectedStaffs([]);
                setSelectedGates([]);
                setAssignmentType('');
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

    // Cập nhật hàm handleCreateShift
    const handleCreateShift = () => {
        if (assignmentType === 'default') {
            handleDefaultGateAssignment();
        } else {
            // Existing create shift logic
            handleNormalCreateShift();
        }
    };

    // Đổi tên hàm cũ thành handleNormalCreateShift
    const handleNormalCreateShift = async () => {
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
                staff_ids: selectedStaffs,
                push_notification: pushNotification
            });

            if (response.data.status === 'success') {
                showAlert(response.data.message, 'success');
                
                // Load lại danh sách nhân viên
                await fetchStaffsByGroup(selectedGroup);
                
                // Reset các state liên quan
                setSelectedStaffs([]);
                setSelectedGates([]);
                setAssignmentType('');
                // setPushNotification(false);

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

        const renderDistributionItem = (item) => (
            <div key={item.gateId} className="distribution-item">
                <div className="gate-info">
                    <div className="gate-name mb-2">
                        <i className="fas fa-door-open me-2"></i>
                        {item.gateName}
                    </div>
                    
                    <div className="staff-counts-container">
                        <div className="staff-counts">
                            {/* Đò - Type 1 - Mới */}
                            {item.type1Count > 0 && (
                                <div className="count-item type-1" title="Đò - Phân ca mới">
                                    <FontAwesomeIcon icon={faUserPlus} />
                                    <span className="count-number">{item.type1Count}</span>
                                </div>
                            )}
                            
                            {/* Đò - Type 1 - Đã phân ca */}
                            {item.assignedType1Count > 0 && (
                                <div className="count-item type-1" title="Đò - Đã phân ca">
                                    <FontAwesomeIcon icon={faUserCheck} />
                                    <span className="count-number">{item.assignedType1Count}</span>
                                </div>
                            )}
                            
                            {/* Xuồng - Type 2 - Mới */}
                            {item.type2Count > 0 && (
                                <div className="count-item type-2" title="Xuồng - Phân ca mới">
                                    <FontAwesomeIcon icon={faUserPlus} />
                                    <span className="count-number">{item.type2Count}</span>
                                </div>
                            )}
                            
                            {/* Xuồng - Type 2 - Đã phân ca */}
                            {item.assignedType2Count > 0 && (
                                <div className="count-item type-2" title="Xuồng - Đã phân ca">
                                    <FontAwesomeIcon icon={faUserCheck} />
                                    <span className="count-number">{item.assignedType2Count}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );

        return (
            <>
                {isCreating && <Loading message="Đang tạo ca làm việc..." />}
                
                <div className="staff-distribution">
                    <h4>
                        <i className="fas fa-random me-2"></i>
                        Phân bổ nhân viên:
                    </h4>
                    <div className="distribution-grid">
                        {distribution.map(renderDistributionItem)}
                    </div>
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

    // Thêm hàm kiểm tra số lượng nhân viên có thể chọn
    const getSelectableStaffCount = () => {
        return filteredStaffs.filter(staff => !staff.is_assigned).length;
    };

    // Thêm hàm tính toán số lượng nhân viên
    const getStaffCounts = () => {
        const assignedCount = staffs.filter(staff => staff.is_assigned).length;
        const unassignedCount = staffs.filter(staff => !staff.is_assigned).length;
        return { assignedCount, unassignedCount };
    };

    // Thay thế hàm getUniqueVehicalTypes bằng danh sách cố định
    const vehicalTypes = [
        { value: 1, label: 'Đò' },
        { value: 2, label: 'Xuồng' }
    ];

    if (loading) {
        return (
            <AdminLayout>
                <Loading />
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
                                
                                <FormControl 
                                    variant="outlined" 
                                    size="small" 
                                    className="vehical-type-select"
                                    disabled={!selectedGroup}
                                >
                                    <InputLabel>Loại phương tiện</InputLabel>
                                    <Select
                                        value={selectedVehicalType}
                                        onChange={(e) => setSelectedVehicalType(e.target.value)}
                                        label="Loại phương tiện"
                                    >
                                        <MenuItem value="">Tất cả</MenuItem>
                                        {vehicalTypes.map(type => (
                                            <MenuItem key={type.value} value={type.value}>
                                                {type.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                
                                <FormControl 
                                    variant="outlined" 
                                    size="small" 
                                    className="default-gate-select"
                                    disabled={!selectedGroup}
                                >
                                    <InputLabel>Vị trí mặc định</InputLabel>
                                    <Select
                                        value={selectedDefaultGate}
                                        onChange={(e) => setSelectedDefaultGate(e.target.value)}
                                        label="Vị trí mặc định"
                                    >
                                        <MenuItem value="">Tất cả</MenuItem>
                                        {gates.map(gate => (
                                            <MenuItem key={gate.id} value={gate.id}>
                                                {gate.name}
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
                                    
                                    {filteredStaffs.some(staff => !staff.is_assigned) && (
                                        <button 
                                            className={`select-all-btn ${
                                                selectedStaffs.length === getSelectableStaffCount() ? 'active' : ''
                                            }`}
                                            onClick={handleSelectAll}
                                        >
                                            {selectedStaffs.length === getSelectableStaffCount() 
                                                ? 'Bỏ chọn tất cả' 
                                                : 'Chọn tất cả'
                                            }
                                        </button>
                                    )}
                                </div>
                            </div>
                            {staffs.length > 0 && (
                                <div className="staff-counts-info">
                                    <div className="count-badge assigned">
                                        <FontAwesomeIcon icon={faUserCheck} className="me-1" />
                                        Đã phân ca: {getStaffCounts().assignedCount}
                                    </div>
                                    <div className="count-badge unassigned">
                                        <FontAwesomeIcon icon={faUserPlus} className="me-1" />
                                        Chưa phân ca: {getStaffCounts().unassignedCount}
                                    </div>
                                    {selectedStaffs.length > 0 && (
                                        <div className="count-badge selected">
                                            <FontAwesomeIcon icon={faUserAlt} className="me-1" />
                                            Đã chọn: {selectedStaffs.length}
                                        </div>
                                    )}
                                </div>
                            )}
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
                                            className={`staff-card ${staff.is_assigned ? 'assigned' : ''} vehical-type-${staff.vehical_type}`}
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
                                                <span className="staff-code">
                                                    {staff.code} - {staff.vehical_type_name}
                                                    {!staff.is_assigned && staff.default_gate_id && (
                                                        <span className="default-gate">
                                                            {" "}- {gates.find(g => g.id === staff.default_gate_id)?.name}
                                                        </span>
                                                    )}
                                                </span>
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
                                    <MenuItem value="default">Chia theo vị trí mặc định</MenuItem>
                                    <MenuItem value="all" disabled>Chia đều cho tất cả các vị trí</MenuItem>
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
                                    className="gate-select-multiple"
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

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={pushNotification}
                                        onChange={(e) => setPushNotification(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Gửi thông báo đến nhân viên"
                            />

                            {(selectedStaffs.length > 0 && selectedGates.length > 0) && (
                                <>
                                    {assignmentType === 'default' ? (
                                        <DefaultDistribution />
                                    ) : (
                                        <StaffDistribution />
                                    )}
                                    
                                    <div className="assignment-summary">
                                        <button 
                                            className="create-shift-btn"
                                            onClick={handleCreateShift}
                                            disabled={isCreating || !selectedStaffs.length || !selectedGates.length}
                                        >
                                            {isCreating ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin me-2"></i>
                                                    Đang tạo ca...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-plus-circle me-2"></i>
                                                    Tạo ca làm việc
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
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