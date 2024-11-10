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
    Snackbar
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import axios from 'axios';

const StaffGroup = () => {
    const [groups, setGroups] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        status: 'ACTIVE'
    });
    const [alert, setAlert] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    const [filteredGroups, setFilteredGroups] = useState([]);

    const fetchGroups = async () => {
        try {
            const response = await axios.get('/api/admin/staff-groups');
            setGroups(response.data);
            setFilteredGroups(response.data);
        } catch (error) {
            showAlert('Lỗi khi tải dữ liệu', 'error');
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    useEffect(() => {
        if (!groups.length) return;
        const filtered = groups.filter(group => 
            group.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredGroups(filtered);
    }, [groups, searchTerm]);

    const handleOpenDialog = (group = null) => {
        if (group) {
            setSelectedGroup(group);
            setFormData({
                name: group.name,
                status: group.status
            });
        } else {
            setSelectedGroup(null);
            setFormData({
                name: '',
                status: 'ACTIVE'
            });
        }
        setOpenDialog(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedGroup) {
                await axios.put(`/api/admin/staff-groups/${selectedGroup.id}`, formData);
                showAlert('Cập nhật nhóm thành công');
            } else {
                await axios.post('/api/admin/staff-groups', formData);
                showAlert('Thêm nhóm mới thành công');
            }
            fetchGroups();
            setOpenDialog(false);
        } catch (error) {
            const message = error.response?.data?.message || 'Có lỗi xảy ra';
            showAlert(message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa nhóm này?')) {
            try {
                await axios.delete(`/api/admin/staff-groups/${id}`);
                showAlert('Xóa nhóm thành công');
                fetchGroups();
            } catch (error) {
                showAlert('Lỗi khi xóa nhóm', 'error');
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

    return (
        <AdminLayout>
            <Box sx={{ p: 3 }}>
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
                        Quản lý nhóm nhân viên
                    </Typography>
                    
                    <Box sx={{ 
                        display: 'flex', 
                        gap: 2,
                        alignItems: 'center' 
                    }}>
                        <TextField
                            size="small"
                            variant="outlined"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ width: '300px' }}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                        />

                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                            sx={{ 
                                bgcolor: '#2c3e50', 
                                '&:hover': {
                                    bgcolor: '#1a252f'
                                }
                            }}
                        >
                            Thêm mới
                        </Button>
                    </Box>
                </Box>

                <TableContainer component={Paper}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#2c3e50' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'white' }}>STT</TableCell>
                                <TableCell sx={{ color: 'white' }}>Tên nhóm</TableCell>
                                <TableCell sx={{ color: 'white' }}>Trạng thái</TableCell>
                                <TableCell sx={{ color: 'white' }} align="right">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredGroups
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((group, index) => (
                                    <TableRow key={group.id}>
                                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                                        <TableCell>{group.name}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={group.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
                                                color={group.status === 'ACTIVE' ? 'success' : 'error'}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton onClick={() => handleOpenDialog(group)}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton onClick={() => handleDelete(group.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={filteredGroups.length}
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

                <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                    <DialogTitle>
                        {selectedGroup ? 'Chỉnh sửa nhóm' : 'Thêm nhóm mới'}
                    </DialogTitle>
                    <DialogContent>
                        <Box component="form" sx={{ pt: 2 }}>
                            <TextField
                                fullWidth
                                label="Tên nhóm"
                                margin="normal"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
                        <Button variant="contained" onClick={handleSubmit}>
                            {selectedGroup ? 'Cập nhật' : 'Thêm mới'}
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

export default StaffGroup; 