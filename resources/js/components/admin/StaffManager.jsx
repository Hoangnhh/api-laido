import React, { useState, useEffect } from 'react';
import AdminLayout from './Layout/AdminLayout';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Button,
    IconButton,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    MenuItem,
    Alert,
    Snackbar,
    Avatar,
    Chip
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faPenToSquare,
    faBan,
    faCircleCheck,
    faMagnifyingGlass,
    faImage,
    faUser,
    faIdCard,
    faCreditCard
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import '../../../css/staff-manager.css';

// Thêm constant cho danh sách ngân hàng
const BANK_OPTIONS = [
    { value: 'Agribank', label: 'Agribank' },
    { value: 'Vietcombank', label: 'Vietcombank' },
    { value: 'MBbank', label: 'MBbank' }
];

const StaffManager = () => {
    const [staffs, setStaffs] = useState([]);
    const [groups, setGroups] = useState([]); // Để chọn nhóm nhân viên
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [formData, setFormData] = useState({
        type: 'DRIVER',
        group_id: '',
        code: '',
        name: '',
        username: '',
        password: '',
        birthdate: '',
        address: '',
        card_id: '',
        status: 'ACTIVE',
        vehical_size: 0,
        phone: '',
        card_date: '',
        bank_name: 'Agribank',
        bank_account: '',
    });
    const [alert, setAlert] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);
    const [filterGroupId, setFilterGroupId] = useState(''); // Thêm state cho filter nhóm
    const [filterStatus, setFilterStatus] = useState('ACTIVE'); // Mặc định là ACTIVE
    const [avatarPreview, setAvatarPreview] = useState(null);

    // Tách các state filter ra riêng để dễ quản lý
    const [filters, setFilters] = useState({
        search: '',
        groupId: '',
        status: 'ACTIVE'
    });

    // Tạo state để theo dõi việc cần fetch data
    const [shouldFetch, setShouldFetch] = useState(true);

    // Cập nhật hàm format ngày
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            
            // Format dd/mm/yyyy
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            
            return `${day}/${month}/${year}`;
        } catch (error) {
            return '';
        }
    };

    // Thêm hàm format ngày từ dd/mm/yyyy sang yyyy-mm-dd cho input
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        try {
            // Nếu là định dạng dd/mm/yyyy
            if (dateString.includes('/')) {
                const [day, month, year] = dateString.split('/');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            // Nếu là định dạng ISO hoặc yyyy-mm-dd
            const date = new Date(dateString);
            console.log(date.toISOString().split('T')[0]);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
            return '';
        } catch (error) {
            return '';
        }
    };

    // Fetch staffs data with pagination and search
    const fetchStaffs = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/staffs', {
                params: {
                    page: page + 1,
                    per_page: rowsPerPage,
                    search: filters.search,
                    group_id: filters.groupId,
                    status: filters.status || null
                }
            });
            setStaffs(response.data.data);
            setTotalItems(response.data.total);
        } catch (error) {
            showAlert('Lỗi khi tải dữ liệu', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch staff groups
    const fetchGroups = async () => {
        try {
            const response = await axios.get('/api/admin/staff-groups');
            setGroups(response.data);
        } catch (error) {
            showAlert('Lỗi khi tải danh sách nhóm', 'error');
        }
    };

    useEffect(() => {
        // Chỉ gọi fetchGroups một lần khi component mount
        fetchGroups();
    }, []); // Empty dependency array

    // Effect chính để fetch data
    useEffect(() => {
        if (shouldFetch) {
            fetchStaffs();
            setShouldFetch(false);
        }
    }, [shouldFetch, page, rowsPerPage]);

    // Effect riêng cho việc thay đổi filter
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setPage(0);
            setShouldFetch(true);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [filters]);

    // Handle dialog
    const handleOpenDialog = (staff = null) => {
        if (staff) {
            setSelectedStaff(staff);
            setFormData({
                ...staff,
                birthdate: formatDateForInput(staff.birthdate), // Format ngày sinh cho input
                password: '' // Reset password khi edit
            });
        } else {
            setSelectedStaff(null);
            setFormData({
                type: 'STAFF',
                group_id: '',
                code: '',
                name: '',
                username: '',
                password: '',
                birthdate: '',
                address: '',
                card_id: '',
                status: 'ACTIVE',
                vehical_size: 0,
                phone: '',
                card_date: '',
                bank_name: 'Agribank',
                bank_account: '',
            });
        }
        setOpenDialog(true);
    };
    
    // Xử lý submit form
    const handleSubmit = async () => {
        try {
            const formDataToSend = new FormData();
            
            Object.keys(formData).forEach(key => {
                if (key === 'avatar' && formData[key]) {
                    formDataToSend.append('avatar', formData[key]);
                } else if (key === 'birthdate' && formData[key]) {
                    // Đảm bảo ngày sinh đúng định dạng Y-m-d
                    formDataToSend.append('birthdate', formData[key]); // Gửi trực tiếp định dạng yyyy-mm-dd
                } else {
                    formDataToSend.append(key, formData[key]);
                }
            });

            if (selectedStaff) {
                formDataToSend.append('_method', 'PUT');
                await axios.post(`/admin/staffs/${selectedStaff.id}`, formDataToSend, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                showAlert('Cập nhật nhân viên thành công');
            } else {
                await axios.post('/admin/staffs', formDataToSend, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                showAlert('Thêm nhân viên thành công');
            }
            
            setOpenDialog(false);
            setShouldFetch(true); // Thay vì gọi fetchStaffs trực tiếp
        } catch (error) {
            if (error.response?.data?.errors) {
                const errorMessages = Object.values(error.response.data.errors).join('\n');
                showAlert(errorMessages, 'error');
            } else {
                showAlert(error.response?.data?.message || 'Có lỗi xảy ra', 'error');
            }
        }
    };

    // Tối ưu lại hàm debounce
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    // Tạo hàm search với debounce
    const debouncedSearch = React.useCallback(
        debounce((value) => {
            setFilters(prev => ({
                ...prev,
                search: value
            }));
        }, 500),
        []
    );

    // Sửa lại hàm handleSearchChange
    const handleSearchChange = (e) => {
        // Cập nhật giá trị hiển thị ngay lập tức
        e.persist();
        // Thc hiện search sau khi người dùng ngừng gõ
        debouncedSearch(e.target.value);
    };

    // Effect duy nhất để fetch data
    useEffect(() => {
        fetchStaffs();
    }, [page, rowsPerPage, filters]);

    // Handle page change
    const handlePageChange = (event, newPage) => {
        setPage(newPage);
    };

    // Handle rows per page change
    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Thêm handler cho việc thay đổi filter nhóm
    const handleFilterGroupChange = (event) => {
        setFilters(prev => ({
            ...prev,
            groupId: event.target.value
        }));
    };

    // Thêm handler cho việc thay đổi filter status
    const handleFilterStatusChange = (event) => {
        setFilters(prev => ({
            ...prev,
            status: event.target.value
        }));
    };

    // Thêm hàm showAlert
    const showAlert = (message, severity = 'success') => {
        setAlert({
            open: true,
            message,
            severity
        });
    };

    // Thay đổi hàm handleDelete với message rõ ràng hơn
    const handleDelete = async (staffId) => {
        const staff = staffs.find(s => s.id === staffId);
        const isActive = staff?.status === 'ACTIVE';
        const confirmMessage = isActive 
            ? 'Bạn có chắc chắn muốn vô hiệu hóa nhân viên này?' 
            : 'Bạn có chắc chắn muốn kích hoạt lại nhân viên này?';

        if (window.confirm(confirmMessage)) {
            try {
                await axios.put(`/admin/staffs/${staffId}/toggle-status`);
                showAlert(
                    isActive 
                        ? 'Vô hiệu hóa nhân viên thành công'
                        : 'Kích hoạt nhân viên thành công'
                );
                setShouldFetch(true); // Thay vì gọi fetchStaffs trực tiếp
            } catch (error) {
                showAlert('Lỗi khi vô hiệu hóa nhân viên', 'error');
            }
        }
    };

    // Cập nhật hàm xử lý ngày sinh
    const handleDateChange = (e) => {
        const inputDate = e.target.value; // yyyy-mm-dd
        if (!inputDate) {
            setFormData({ ...formData, birthdate: '' });
            return;
        }
        setFormData({ ...formData, birthdate: inputDate }); // Lưu trực tiếp định dạng yyyy-mm-dd
    };

    const handleAvatarChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setFormData({ ...formData, avatar: file });
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handlePhoneChange = (e) => {
        const phoneNumber = e.target.value;
        setFormData(prev => ({
            ...prev,
            phone: phoneNumber,
            username: phoneNumber
        }));
    };

    // Thêm hàm xử lý ngày cấp CMND/CCCD
    const handleCardDateChange = (e) => {
        const inputDate = e.target.value;
        if (!inputDate) {
            setFormData({ ...formData, card_date: '' });
            return;
        }
        setFormData({ ...formData, card_date: inputDate });
    };

    return (
        <AdminLayout>
            <Box className="staff-manager">
                {/* Header */}
                <Box className="staff-manager-header">
                    <Typography className="staff-manager-title">
                        Quản lý nhân viên
                    </Typography>
                    
                    <Box className="staff-manager-controls">
                        {/* Status Filter */}
                        <TextField
                            select
                            size="small"
                            label="Trạng thái"
                            value={filterStatus}
                            onChange={handleFilterStatusChange}
                            className="staff-manager-filter"
                        >
                            <MenuItem value="ACTIVE">Hoạt động</MenuItem>
                            <MenuItem value="INACTIVE">Không hoạt động</MenuItem>
                            <MenuItem value="">Tất cả</MenuItem>
                        </TextField>

                        {/* Group Filter */}
                        <TextField
                            select
                            size="small"
                            label="Lọc theo nhóm"
                            placeholder="Tất cả nhóm"
                            value={filterGroupId}
                            onChange={handleFilterGroupChange}
                            sx={{ 
                                width: '200px',
                                '& .MuiOutlinedInput-root': {
                                    '&:hover fieldset': {
                                        borderColor: '#2c3e50',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#2c3e50',
                                    },
                                }
                            }}
                        >
                            <MenuItem value="">
                                <em>Tất cả nhóm</em>
                            </MenuItem>
                            {groups.filter(group => group.status === 'ACTIVE').map((group) => (
                                <MenuItem key={group.id} value={group.id}>
                                    {group.name}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Search */}
                        <TextField
                            size="small"
                            variant="outlined"
                            placeholder="Tìm kiếm..."
                            onChange={handleSearchChange}
                            className="staff-manager-search"
                            InputProps={{
                                startAdornment: (
                                    <Box sx={{ mr: 1, color: '#2c3e50' }}>
                                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                                    </Box>
                                )
                            }}
                        />

                        {/* Add Button */}
                        <Button
                            variant="contained"
                            startIcon={<FontAwesomeIcon icon={faPlus} />}
                            onClick={() => handleOpenDialog()}
                            className="staff-manager-add-btn"
                        >
                            Thêm mới
                        </Button>
                    </Box>
                </Box>

                {/* Table */}
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ 
                                bgcolor: '#2c3e50',
                            }}>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Avatar</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Tên nhân viên</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Nhóm</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Ngày sinh</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>CMND/CCCD</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Ngày cấp</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Tải trọng</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Ngân hàng</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Trạng thái</TableCell>
                                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        Đang tải dữ liệu...
                                    </TableCell>
                                </TableRow>
                            ) : staffs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        Không có dữ liệu
                                    </TableCell>
                                </TableRow>
                            ) : (
                                staffs.map((staff) => (
                                    <TableRow 
                                        key={staff.id}
                                        sx={{ '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.04)' } }}
                                    >
                                        <TableCell>
                                            <Box 
                                                className="staff-manager-avatar-wrapper"
                                                component="label"
                                            >
                                                <Avatar
                                                    src={staff.avatar_url} 
                                                    alt={staff.name}
                                                    sx={{ width: 40, height: 40 }}
                                                />
                                                <input
                                                    type="file"
                                                    hidden
                                                    accept="image/*"
                                                    onChange={handleAvatarChange}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell>{staff.name}</TableCell>
                                        <TableCell>
                                            {staff.group ? (
                                                <Chip 
                                                    label={staff.group.name}
                                                    color="primary"
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            ) : (
                                                <Chip 
                                                    label="Chưa phân nhóm"
                                                    color="default"
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(staff.birthdate)}
                                        </TableCell>
                                        <TableCell>{staff.card_id}</TableCell>
                                        <TableCell>{formatDate(staff.card_date)}</TableCell>
                                        <TableCell>{staff.vehical_size}</TableCell>
                                        <TableCell>
                                            {staff.bank_name && staff.bank_account ? (
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                                        {staff.bank_name}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {staff.bank_account}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    Chưa cập nhật
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={staff.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
                                                color={staff.status === 'ACTIVE' ? 'success' : 'error'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                color="primary"
                                                onClick={() => handleOpenDialog(staff)}
                                                sx={{ mr: 1 }}
                                            >
                                                <FontAwesomeIcon icon={faPenToSquare} />
                                            </IconButton>
                                            <IconButton
                                                color="error"
                                                onClick={() => handleDelete(staff.id)}
                                                title={staff.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                            >
                                                {staff.status === 'ACTIVE' ? <FontAwesomeIcon icon={faBan} /> : <FontAwesomeIcon icon={faCircleCheck} />}
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={totalItems}
                        page={page}
                        onPageChange={handlePageChange}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        labelRowsPerPage="Số dòng mỗi trang:"
                        labelDisplayedRows={({ from, to, count }) => 
                            `${from}-${to} của ${count !== -1 ? count : `hơn ${to}`}`
                        }
                    />
                </TableContainer>

                {/* Dialog */}
                <Dialog 
                    open={openDialog} 
                    onClose={() => setOpenDialog(false)}
                    maxWidth={false}
                    className="staff-manager-dialog"
                >
                    <DialogTitle className="staff-manager-dialog-title">
                        {selectedStaff ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
                    </DialogTitle>
                    
                    <DialogContent>
                        <Box className="staff-manager-form">
                            {/* Left side - Avatar */}
                            <Box className="staff-manager-avatar-container">
                                <Box 
                                    className="staff-manager-avatar-wrapper"
                                    component="label"
                                >
                                    <Avatar
                                        src={avatarPreview || formData.avatar_url}
                                        className="staff-manager-avatar"
                                    />
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                    />
                                </Box>
                            </Box>

                            {/* Right side - Main content */}
                            <Box className="staff-manager-main-content">
                                {/* Thông tin cá nhân */}
                                <Box className="staff-manager-form-section">
                                    <Typography variant="h6" className="staff-manager-section-title">
                                        <FontAwesomeIcon icon={faUser} className="staff-manager-section-icon" />
                                        Thông tin cá nhân
                                    </Typography>
                                    <Box className="staff-manager-section-content">
                                        <TextField
                                            label="Mã nhân viên"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        />
                                        
                                        <TextField
                                            label="Tên nhân viên"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />

                                        <TextField
                                            label="Số điện thoại"
                                            value={formData.phone}
                                            onChange={handlePhoneChange}
                                            inputProps={{
                                                maxLength: 10,
                                                pattern: '[0-9]*'
                                            }}
                                            helperText="Số điện thoại sẽ được sử dụng làm tên đăng nhập"
                                        />

                                        <TextField
                                            label="CMND/CCCD"
                                            value={formData.card_id}
                                            onChange={(e) => setFormData({ ...formData, card_id: e.target.value })}
                                        />

                                        <TextField
                                            label="Ngày cấp CMND/CCCD"
                                            type="date"
                                            value={formData.card_date ? formatDateForInput(formData.card_date) : ''}
                                            onChange={handleCardDateChange}
                                            InputLabelProps={{ shrink: true }}
                                        />

                                        <TextField
                                            label="Ngày sinh"
                                            type="date"
                                            value={formData.birthdate ? formatDateForInput(formData.birthdate) : ''}
                                            onChange={handleDateChange}
                                            InputLabelProps={{ shrink: true }}
                                        />

                                        <TextField
                                            label="Địa chỉ"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </Box>
                                </Box>

                                {/* Thông tin tài khoản và ngân hàng */}
                                <Box className="staff-manager-secondary-sections">
                                    <Box className="staff-manager-form-section">
                                        <Typography variant="h6" className="staff-manager-section-title">
                                            <FontAwesomeIcon icon={faIdCard} className="staff-manager-section-icon" />
                                            Thông tin tài khoản
                                        </Typography>
                                        <Box className="staff-manager-section-content">
                                            <TextField
                                                label="Username"
                                                value={formData.username}
                                                disabled
                                                helperText="Username tự động theo số điện thoại"
                                            />

                                            <TextField
                                                label="Mật khẩu"
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            />

                                            <TextField
                                                label="Nhập lại mật khẩu"
                                                type="password"
                                                value={formData.password_confirmation || ''}
                                                onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                                                error={formData.password !== formData.password_confirmation}
                                                helperText={formData.password !== formData.password_confirmation ? "Mật khẩu không khớp" : ""}
                                            />

                                            <TextField
                                                label="Tải trọng phương tiện (Người)"
                                                type="number"
                                                value={formData.vehical_size}
                                                onChange={(e) => setFormData({ ...formData, vehical_size: parseInt(e.target.value) || 0 })}
                                                InputProps={{
                                                    inputProps: { min: 0 }
                                                }}
                                                helperText="Nhập 0 nếu không có phương tiện"
                                            />
                                        </Box>
                                    </Box>

                                    <Box className="staff-manager-form-section">
                                        <Typography variant="h6" className="staff-manager-section-title">
                                            <FontAwesomeIcon icon={faCreditCard} className="staff-manager-section-icon" />
                                            Thông tin ngân hàng
                                        </Typography>
                                        <Box className="staff-manager-section-content">
                                            <TextField
                                                select
                                                label="Tên ngân hàng"
                                                value={formData.bank_name || 'Agribank'}
                                                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                                placeholder="Chọn ngân hàng"
                                            >
                                                {BANK_OPTIONS.map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </MenuItem>
                                                ))}
                                            </TextField>

                                            <TextField
                                                label="Số tài khoản"
                                                value={formData.bank_account}
                                                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                                                placeholder="Nhập số tài khoản ngân hàng"
                                                inputProps={{
                                                    pattern: '[0-9]*'
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button 
                            onClick={() => setOpenDialog(false)}
                            sx={{ 
                                color: '#2c3e50',
                                '&:hover': {
                                    bgcolor: 'rgba(44, 62, 80, 0.1)',
                                }
                            }}
                        >
                            Hủy
                        </Button>
                        <Button 
                            variant="contained" 
                            onClick={handleSubmit}
                            sx={{ 
                                bgcolor: '#2c3e50', 
                                color: 'white',
                                '&:hover': {
                                    bgcolor: '#1a252f'
                                }
                            }}
                        >
                            {selectedStaff ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={alert.open}
                    autoHideDuration={6000}
                    onClose={() => setAlert({ ...alert, open: false })}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Alert
                        onClose={() => setAlert({ ...alert, open: false })}
                        severity={alert.severity}
                        sx={{ width: '100%' }}
                        elevation={6}
                        variant="filled"
                    >
                        {alert.message}
                    </Alert>
                </Snackbar>
            </Box>
        </AdminLayout>
    );
};

export default StaffManager;
