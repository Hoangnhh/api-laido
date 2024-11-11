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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faPenToSquare,
    faTrash,
    faMagnifyingGlass
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const GateManager = () => {
    const [gates, setGates] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedGate, setSelectedGate] = useState(null);
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
    const [filteredGates, setFilteredGates] = useState([]);

    const fetchGates = async () => {
        try {
            const response = await axios.get('/api/admin/gates');
            setGates(response.data);
            setFilteredGates(response.data);
        } catch (error) {
            showAlert('Lỗi khi tải dữ liệu', 'error');
        }
    };

    useEffect(() => {
        fetchGates();
    }, []);

    useEffect(() => {
        if (!gates.length) return;
        
        const filtered = gates.filter(gate => 
            gate.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredGates(filtered);
    }, [gates, searchTerm]);

    const handleOpenDialog = (gate = null) => {
        if (gate) {
            setSelectedGate(gate);
            setFormData({
                name: gate.name,
                status: gate.status
            });
        } else {
            setSelectedGate(null);
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
            if (selectedGate) {
                await axios.put(`/api/admin/gates/${selectedGate.id}`, formData);
                showAlert('Cập nhật vị trí thành công');
            } else {
                await axios.post('/api/admin/gates', formData);
                showAlert('Thêm vị trí mới thành công');
            }
            fetchGates();
            setOpenDialog(false);
        } catch (error) {
            const message = error.response?.data?.message || 'Có lỗi xảy ra';
            showAlert(message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa vị trí này?')) {
            try {
                await axios.delete(`/api/admin/gates/${id}`);
                showAlert('Xóa vị trí thành công');
                fetchGates();
            } catch (error) {
                showAlert('Lỗi khi xóa vị trí', 'error');
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h5" sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
                        Quản lý vị trí
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            size="small"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <Box sx={{ mr: 1, color: 'text.secondary' }}>
                                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                                    </Box>
                                )
                            }}
                        />
                        <Button
                            variant="contained"
                            startIcon={<FontAwesomeIcon icon={faPlus} />}
                            onClick={() => handleOpenDialog()}
                            sx={{ bgcolor: '#2c3e50', '&:hover': { bgcolor: '#1a252f' } }}
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
                                <TableCell sx={{ color: 'white' }}>Tên vị trí</TableCell>
                                <TableCell sx={{ color: 'white' }}>Trạng thái</TableCell>
                                <TableCell sx={{ color: 'white' }} align="right">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredGates
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((gate, index) => (
                                    <TableRow key={gate.id}>
                                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                                        <TableCell>{gate.name}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={gate.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
                                                color={gate.status === 'ACTIVE' ? 'success' : 'error'}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton onClick={() => handleOpenDialog(gate)}>
                                                <FontAwesomeIcon icon={faPenToSquare} />
                                            </IconButton>
                                            <IconButton onClick={() => handleDelete(gate.id)}>
                                                <FontAwesomeIcon icon={faTrash} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {filteredGates.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                        <Typography variant="body1" color="text.secondary">
                                            Không tìm thấy kết quả phù hợp
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={filteredGates.length}
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
                        {selectedGate ? 'Chỉnh sửa vị trí' : 'Thêm vị trí mới'}
                    </DialogTitle>
                    <DialogContent>
                        <Box component="form" sx={{ pt: 2 }}>
                            <TextField
                                fullWidth
                                label="Tên vị trí"
                                margin="normal"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
                        <Button variant="contained" onClick={handleSubmit}>
                            {selectedGate ? 'Cập nhật' : 'Thêm mới'}
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

export default GateManager; 