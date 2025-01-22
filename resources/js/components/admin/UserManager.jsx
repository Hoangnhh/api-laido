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
    Chip,
    Alert,
    Snackbar,
    Checkbox,
    FormControlLabel,
    List,
    ListItem,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faPenToSquare,
    faTrash,
    faMagnifyingGlass,
    faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const menuItems = [
    { 
        text: 'Trang chủ', 
        path: '/admin/dashboard'
    },
    { 
        text: 'Phân ca', 
        path: '/admin/shift-assignments'
    },
    { 
        text: 'Màn hình xếp hàng', 
        path: '/admin/queue-display'
    },
    { 
        text: 'Màn hình Checkout', 
        path: '/admin/checkout-screen'
    },
    { 
        text: 'Quản lý vị trí',
        path: '/admin/gate'
    },
    { 
        text: 'Quản lý người dùng', 
        path: '/admin/users'
    },
    
    { 
        text: 'Quản lý nhóm nhân viên', 
        path: '/admin/staff-group'
    },
    { 
        text: 'Quản lý nhân viên', 
        path: '/admin/staff'
    },
    {
        text: 'Báo cáo thanh toán',
        path: '/admin/payment-report'
    },
    { 
        text: 'Danh sách vé sử dụng', 
        path: '/admin/tickets'
    },
    { 
        text: 'Cấu hình hệ thống', 
        path: '/admin/settings'
    },
    { 
        text: 'Vé đã sử dụng', 
        path: '/admin/used-tickets-list-report'
    },
    { 
        text: 'Lái đò đang chờ', 
        path: '/admin/waiting-list-for-checkin-report'
    },
    { 
        text: 'Lái đò đang hoạt động', 
        path: '/admin/checkin-list-report'
    },
    { 
        text: 'Thanh toán', 
        path: '/admin/accounts-payable'
    },
    { 
        text: 'Lái đò đã kết ca', 
        path: '/admin/checkout-list-report'
    },
    { 
        text: 'Tổng hợp vé đã in', 
        path: '/admin/revenue-report'
    },
    { 
        text: 'Vé đã in theo thu ngân', 
        path: '/admin/revenue-detail-report'
    },
    { 
        text: 'Lịch sử in lại vé', 
        path: '/admin/ticket-print-history-report'
    }
    
];

const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: ''
    });
    const [alert, setAlert] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    const [openPermissionDialog, setOpenPermissionDialog] = useState(false);
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    // Fetch users data
    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/admin/users');
            setUsers(response.data);
        } catch (error) {
            showAlert('Lỗi khi tải dữ liệu', 'error');
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Handle dialog
    const handleOpenDialog = (user = null) => {
        if (user) {
            setSelectedUser(user);
            setFormData({
                name: user.name,
                username: user.username,
                email: user.email,
                password: ''
            });
        } else {
            setSelectedUser(null);
            setFormData({
                name: '',
                username: '',
                email: '',
                password: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedUser(null);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedUser) {
                await axios.put(`/api/admin/users/${selectedUser.id}`, formData);
                showAlert('Cập nhật người dùng thành công');
            } else {
                await axios.post('/api/admin/users', formData);
                showAlert('Thêm người dùng mới thành công');
            }
            fetchUsers();
            handleCloseDialog();
        } catch (error) {
            const message = error.response?.data?.message || 'Có lỗi xảy ra';
            showAlert(message, 'error');
        }
    };

    // Handle delete
    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
            try {
                await axios.delete(`/api/admin/users/${id}`);
                showAlert('Xóa người dùng thành công');
                fetchUsers();
            } catch (error) {
                showAlert('Lỗi khi xóa người dùng', 'error');
            }
        }
    };

    const showAlert = (message, severity = 'success') => {
        setAlert({
            open: true,
            message,
            severity
        });
    };

    const handleCloseAlert = () => {
        setAlert({ ...alert, open: false });
    };

    const handleOpenPermissionDialog = (user) => {
        setSelectedUser(user);
        setSelectedPermissions(user.permission || []);
        setOpenPermissionDialog(true);
    };

    const handleClosePermissionDialog = () => {
        setOpenPermissionDialog(false);
        setSelectedUser(null);
    };

    const handlePermissionChange = (path) => {
        setSelectedPermissions(prev => {
            if (prev.includes(path)) {
                return prev.filter(p => p !== path);
            }
            return [...prev, path];
        });
    };

    const handleSavePermissions = async () => {
        try {
            await axios.post(`/api/admin/users/${selectedUser.id}/permissions`, {
                permissions: selectedPermissions
            });
            
            showAlert('Cập nhật quyền truy cập thành công');
            handleClosePermissionDialog();
            fetchUsers();
        } catch (error) {
            const message = error.response?.data?.message || 'Lỗi khi cập nhật quyền truy cập';
            showAlert(message, 'error');
        }
    };

    return (
        <AdminLayout>
            <Box sx={{ p: 3 }}>
                {/* Header with Search and Add Button */}
                <Box 
                    sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mb: 3 
                    }}
                >
                    <Typography 
                        variant="h5" 
                        component="h1"
                        sx={{ 
                            color: '#2c3e50',
                            fontWeight: 'bold'
                        }}
                    >
                        Quản lý người dùng
                    </Typography>
                    
                    <Box sx={{ 
                        display: 'flex', 
                        gap: 2,
                        alignItems: 'center' 
                    }}>
                        {/* Search Field */}
                        <TextField
                            size="small"
                            variant="outlined"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ width: '300px' }}
                            InputProps={{
                                startAdornment: (
                                    <Box sx={{ mr: 1, color: 'text.secondary' }}>
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
                            sx={{ 
                                bgcolor: '#2c3e50', 
                                color: 'white',
                                '&:hover': {
                                    bgcolor: '#1a252f'
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
                        <TableHead sx={{ bgcolor: '#2c3e50' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'white' }}>ID</TableCell>
                                <TableCell sx={{ color: 'white' }}>Tên</TableCell>
                                <TableCell sx={{ color: 'white' }}>Username</TableCell>
                                <TableCell sx={{ color: 'white' }}>Email</TableCell>
                                <TableCell sx={{ color: 'white' }} align="right">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users
                                .filter(user => 
                                    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    user.email.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.id}</TableCell>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.username}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                color="primary"
                                                onClick={() => handleOpenDialog(user)}
                                            >
                                                <FontAwesomeIcon icon={faPenToSquare} />
                                            </IconButton>
                                            <IconButton
                                                color="info"
                                                onClick={() => handleOpenPermissionDialog(user)}
                                            >
                                                <FontAwesomeIcon icon={faUserShield} />
                                            </IconButton>
                                            <IconButton
                                                color="error"
                                                onClick={() => handleDelete(user.id)}
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={users.length}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        labelRowsPerPage="Số dòng mỗi trang:"
                    />
                </TableContainer>

                {/* Dialog Form */}
                <Dialog open={openDialog} onClose={handleCloseDialog}>
                    <DialogTitle>
                        {selectedUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                    </DialogTitle>
                    <DialogContent>
                        <Box component="form" sx={{ pt: 2 }}>
                            <TextField
                                fullWidth
                                label="Tên"
                                margin="normal"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                label="Username"
                                margin="normal"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                margin="normal"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                label="Mật khẩu"
                                type="password"
                                margin="normal"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Hủy</Button>
                        <Button variant="contained" onClick={handleSubmit}>
                            {selectedUser ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Dialog Permission */}
                <Dialog open={openPermissionDialog} onClose={handleClosePermissionDialog}>
                    <DialogTitle>
                        Quản lý quyền truy cập
                    </DialogTitle>
                    <DialogContent>
                        <List>
                            {menuItems.map(item => (
                                <ListItem key={item.path}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={selectedPermissions.includes(item.path)}
                                                onChange={() => handlePermissionChange(item.path)}
                                            />
                                        }
                                        label={item.text}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClosePermissionDialog}>Hủy</Button>
                        <Button variant="contained" onClick={handleSavePermissions}>
                            Lưu
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Add Snackbar for alerts */}
                <Snackbar
                    open={alert.open}
                    autoHideDuration={6000}
                    onClose={handleCloseAlert}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Alert
                        onClose={handleCloseAlert}
                        severity={alert.severity}
                        sx={{ width: '100%' }}
                    >
                        {alert.message}
                    </Alert>
                </Snackbar>
            </Box>
        </AdminLayout>
    );
};

export default UserManager; 