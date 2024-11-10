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
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Block as BlockIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import axios from 'axios';

const StaffManager = () => {
    const [staffs, setStaffs] = useState([]);
    const [groups, setGroups] = useState([]); // Để chọn nhóm nhân viên
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
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
        phone: ''
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
                    search: searchTerm,
                    group_id: filterGroupId,
                    status: filterStatus || null
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

    // Tạo một effect duy nhất để xử lý tất cả các thay đổi liên quan đến fetch staffs
    useEffect(() => {
        // Reset page về 0 khi thay đổi filter hoặc search
        if (searchTerm || filterGroupId || filterStatus !== 'ACTIVE') {
            setPage(0);
        }
        
        // Debounce cho search và filter
        const timeoutId = setTimeout(() => {
            fetchStaffs();
        }, 300); // Giảm thời gian debounce xuống

        return () => clearTimeout(timeoutId);
    }, [page, rowsPerPage, searchTerm, filterGroupId, filterStatus]); // Thêm filterStatus vào dependencies

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
                phone: ''
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
            fetchStaffs();
        } catch (error) {
            if (error.response?.data?.errors) {
                const errorMessages = Object.values(error.response.data.errors).join('\n');
                showAlert(errorMessages, 'error');
            } else {
                showAlert(error.response?.data?.message || 'Có lỗi xảy ra', 'error');
            }
        }
    };

    // Thêm debounce cho search
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // Debounced search function
    const debouncedSearch = React.useCallback(
        debounce(() => {
            setPage(0); // Reset về trang đầu khi search
            fetchStaffs();
        }, 500),
        [searchTerm]
    );

    // Effect cho search
    useEffect(() => {
        debouncedSearch();
    }, [searchTerm]);

    // Effect cho pagination
    useEffect(() => {
        fetchStaffs();
    }, [page, rowsPerPage]);

    // Handle search change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

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
        setFilterGroupId(event.target.value);
        setPage(0); // Reset về trang đầu khi đổi filter
    };

    // Thêm handler cho việc thay đổi filter status
    const handleFilterStatusChange = (event) => {
        setFilterStatus(event.target.value);
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
                fetchStaffs();
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

    return (
        <AdminLayout>
            <Box sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 3
                }}>
                    <Typography 
                        variant="h5" 
                        component="h1"
                        sx={{ 
                            color: '#2c3e50',
                            fontWeight: 'bold'
                        }}
                    >
                        Quản lý nhân viên
                    </Typography>
                    
                    <Box sx={{ 
                        display: 'flex', 
                        gap: 2,
                        alignItems: 'center' 
                    }}>
                        {/* Status Filter */}
                        <TextField
                            select
                            size="small"
                            label="Trạng thái"
                            placeholder="Tất cả trạng thái"
                            value={filterStatus}
                            onChange={handleFilterStatusChange}
                            sx={{ 
                                width: '150px',
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

                        {/* Search Field */}
                        <TextField
                            size="small"
                            variant="outlined"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            sx={{ 
                                width: '300px',
                                '& .MuiOutlinedInput-root': {
                                    '&:hover fieldset': {
                                        borderColor: '#2c3e50',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#2c3e50',
                                    },
                                }
                            }}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ mr: 1, color: '#2c3e50' }} />
                            }}
                        />

                        {/* Add Button */}
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                            sx={{ 
                                bgcolor: '#2c3e50',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: '#1a252f',
                                }
                            }}
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
                                <TableCell sx={{ color: 'white' }}>Mã NV</TableCell>
                                <TableCell sx={{ color: 'white' }}>Ảnh</TableCell>
                                <TableCell sx={{ color: 'white' }}>Tên</TableCell>
                                <TableCell sx={{ color: 'white' }}>Nhóm</TableCell>
                                <TableCell sx={{ color: 'white' }}>Ngày sinh</TableCell>
                                <TableCell sx={{ color: 'white' }}>CMND/CCCD</TableCell>
                                <TableCell sx={{ color: 'white' }}>Tải trọng</TableCell>
                                <TableCell sx={{ color: 'white' }}>Trạng thái</TableCell>
                                <TableCell sx={{ color: 'white' }} align="right">Thao tác</TableCell>
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
                                        <TableCell>{staff.code}</TableCell>
                                        <TableCell>
                                            <Avatar 
                                                src={staff.avatar_url} 
                                                alt={staff.name}
                                                sx={{ width: 40, height: 40 }}
                                            />
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
                                        <TableCell>{staff.vehical_size}</TableCell>
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
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                color="error"
                                                onClick={() => handleDelete(staff.id)}
                                                title={staff.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                            >
                                                {staff.status === 'ACTIVE' ? <BlockIcon /> : <CheckCircleIcon />}
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

                {/* Form Dialog */}
                <Dialog 
                    open={openDialog} 
                    onClose={() => setOpenDialog(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle sx={{ 
                        bgcolor: '#2c3e50', 
                        color: 'white',
                        fontWeight: 'bold'
                    }}>
                        {selectedStaff ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
                    </DialogTitle>
                    <DialogContent>
                        <Box component="form" sx={{ pt: 2, display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar
                                    src={avatarPreview || formData.avatar_url}
                                    sx={{ 
                                        width: 150, 
                                        height: 150,
                                        border: '2px solid #2c3e50',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <Button
                                    variant="outlined"
                                    component="label"
                                    startIcon={<AddIcon />}
                                    sx={{ 
                                        color: '#2c3e50',
                                        borderColor: '#2c3e50',
                                        '&:hover': {
                                            borderColor: '#1a252f',
                                            bgcolor: 'rgba(44, 62, 80, 0.1)',
                                        }
                                    }}
                                >
                                    Chọn ảnh đại diện
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                    />
                                </Button>
                            </Box>

                            <TextField
                                label="Mã nhân viên"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                            <TextField
                                select
                                fullWidth
                                label="Nhóm"
                                value={formData.group_id}
                                onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                                error={!formData.group_id}
                                helperText={!formData.group_id ? "Vui lòng chọn nhóm" : ""}
                            >
                                <MenuItem value="">
                                    <em>Chọn nhóm</em>
                                </MenuItem>
                                {groups.filter(group => group.status === 'ACTIVE').map((group) => (
                                    <MenuItem key={group.id} value={group.id}>
                                        {group.name}
                                    </MenuItem>
                                ))}
                            </TextField>
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
                                label="Username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                disabled={!!formData.phone}
                                helperText={formData.phone ? "Username tự động theo số điện thoại" : ""}
                            />
                            <TextField
                                label="Mật khẩu"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <TextField
                                label="CMND/CCCD"
                                value={formData.card_id}
                                onChange={(e) => setFormData({ ...formData, card_id: e.target.value })}
                            />
                            <TextField
                                label="Ngày sinh"
                                type="date"
                                value={formData.birthdate ? formatDateForInput(formData.birthdate) : ''}
                                onChange={handleDateChange}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                            <TextField
                                label="Địa chỉ"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
