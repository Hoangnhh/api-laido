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
    TextField,
    MenuItem,
    Chip,
    Typography,
    IconButton,
    InputAdornment,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    CircularProgress,
    Stack
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMagnifyingGlass,
    faEdit,
    faTrash,
    faPlus,
    faFileLines,
    faCalendarDays,
    faImage
} from '@fortawesome/free-solid-svg-icons';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import axios from 'axios';
import Swal from 'sweetalert2';

const PostManager = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        category: ''
    });

    const [dialog, setDialog] = useState({
        open: false,
        mode: 'create', // 'create' or 'edit'
        data: {
            id: '',
            title: '',
            content: '',
            status: 'draft',
            category: '',
            thumbnail: '',
            thumbnail_file: null
        }
    });

    const [saving, setSaving] = useState(false);

    // Fetch posts data
    const fetchPosts = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/posts', {
                params: {
                    page: page + 1,
                    limit: rowsPerPage,
                    search: filters.search,
                    status: filters.status,
                    category: filters.category
                }
            });
            setPosts(response.data.data || []);
            setTotalItems(response.data.total || 0);
        } catch (error) {
            console.error('Error fetching posts:', error);
            Swal.fire('Lỗi', 'Không thể tải danh sách bài viết', 'error');
            setPosts([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
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

    // Handle filter changes
    const handleFilterChange = (field) => (event) => {
        setFilters(prev => ({
            ...prev,
            [field]: event.target.value
        }));
        setPage(0);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    // Open dialog for create
    const handleOpenCreate = () => {
        setDialog({
            open: true,
            mode: 'create',
            data: {
                id: '',
                title: '',
                content: '',
                status: 'draft',
                category: '',
                thumbnail: '',
                thumbnail_file: null
            }
        });
    };

    // Open dialog for edit
    const handleOpenEdit = (post) => {
        setDialog({
            open: true,
            mode: 'edit',
            data: {
                id: post.id,
                title: post.title,
                content: post.content,
                status: post.status,
                category: post.category || '',
                thumbnail: post.thumbnail,
                thumbnail_file: null
            }
        });
    };

    // Handle dialog close
    const handleCloseDialog = () => {
        setDialog(prev => ({ ...prev, open: false }));
    };

    // Handle input change in dialog
    const handleInputChange = (field) => (event) => {
        setDialog(prev => ({
            ...prev,
            data: {
                ...prev.data,
                [field]: event.target.value
            }
        }));
    };

    // Handle file change
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setDialog(prev => ({
                ...prev,
                data: {
                    ...prev.data,
                    thumbnail_file: file,
                    thumbnail: URL.createObjectURL(file) // For preview
                }
            }));
        }
    };

    // Handle save
    const handleSave = async () => {
        if (!dialog.data.title || !dialog.data.content) {
            Swal.fire('Chú ý', 'Vui lòng nhập đầy đủ tiêu đề và nội dung', 'warning');
            return;
        }

        try {
            setSaving(true);
            const formData = new FormData();
            formData.append('title', dialog.data.title);
            formData.append('content', dialog.data.content);
            formData.append('status', dialog.data.status);
            formData.append('category', dialog.data.category);

            if (dialog.data.thumbnail_file) {
                formData.append('thumbnail_file', dialog.data.thumbnail_file);
            }

            if (dialog.mode === 'create') {
                await axios.post('/api/admin/posts', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                Swal.fire('Thành công', 'Đã tạo bài viết mới', 'success');
            } else {
                // Laravel handling PUT/PATCH with FormData is tricky, often requires _method field
                formData.append('_method', 'PUT');
                await axios.post(`/api/admin/posts/${dialog.data.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                Swal.fire('Thành công', 'Đã cập nhật bài viết', 'success');
            }

            handleCloseDialog();
            fetchPosts();
        } catch (error) {
            console.error('Error saving post:', error);
            Swal.fire('Lỗi', 'Không thể lưu bài viết', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Handle delete
    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa?',
            text: 'Bạn không thể hoàn tác hành động này!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/admin/posts/${id}`);
                Swal.fire('Đã xóa!', 'Bài viết đã được xóa thành công.', 'success');
                fetchPosts();
            } catch (error) {
                console.error('Error deleting post:', error);
                Swal.fire('Lỗi', 'Không thể xóa bài viết', 'error');
            }
        }
    };

    const getStatusChip = (status) => {
        switch (status) {
            case 'published':
                return <Chip label="Đã đăng" color="success" size="small" />;
            case 'draft':
                return <Chip label="Nháp" color="default" size="small" />;
            case 'scheduled':
                return <Chip label="Lên lịch" color="primary" size="small" />;
            default:
                return <Chip label={status} size="small" />;
        }
    };

    return (
        <AdminLayout>
            <Box sx={{ p: 3 }}>
                {/* Header */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        <FontAwesomeIcon icon={faFileLines} style={{ marginRight: '10px' }} />
                        Quản lý bài viết
                    </Typography>

                    <Button
                        variant="contained"
                        startIcon={<FontAwesomeIcon icon={faPlus} />}
                        onClick={handleOpenCreate}
                        sx={{ borderRadius: 2 }}
                    >
                        Tạo bài viết
                    </Button>
                </Stack>

                {/* Filters */}
                <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField
                            size="small"
                            placeholder="Tìm kiếm tiêu đề..."
                            value={filters.search}
                            onChange={handleFilterChange('search')}
                            sx={{ flexGrow: 1 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <TextField
                            select
                            size="small"
                            label="Trạng thái"
                            value={filters.status}
                            onChange={handleFilterChange('status')}
                            sx={{ minWidth: 150 }}
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            <MenuItem value="draft">Nháp</MenuItem>
                            <MenuItem value="published">Đã đăng</MenuItem>
                            <MenuItem value="scheduled">Lên lịch</MenuItem>
                        </TextField>
                        <TextField
                            size="small"
                            label="Chuyên mục"
                            value={filters.category}
                            onChange={handleFilterChange('category')}
                            sx={{ minWidth: 150 }}
                        />
                    </Stack>
                </Paper>

                {/* Table */}
                <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Thumbnail</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Tiêu đề</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Chuyên mục</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Tác giả</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Ngày tạo</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        <CircularProgress size={24} sx={{ mr: 1 }} />
                                        Đang tải dữ liệu...
                                    </TableCell>
                                </TableRow>
                            ) : (!posts || posts.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        Không có dữ liệu bài viết
                                    </TableCell>
                                </TableRow>
                            ) : (
                                posts.map((post) => (
                                    <TableRow key={post.id} hover>
                                        <TableCell>
                                            {post.thumbnail ? (
                                                <Box
                                                    component="img"
                                                    src={post.thumbnail}
                                                    alt={post.title}
                                                    sx={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 1, border: '1px solid #eee' }}
                                                />
                                            ) : (
                                                <Box sx={{ width: 60, height: 40, bgcolor: 'grey.100', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <FontAwesomeIcon icon={faImage} style={{ color: '#ccc' }} />
                                                </Box>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 300 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 'medium', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {post.title}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {post.slug}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{post.category || '-'}</TableCell>
                                        <TableCell>{getStatusChip(post.status)}</TableCell>
                                        <TableCell>{post.author?.name || 'Admin'}</TableCell>
                                        <TableCell>{formatDate(post.created_at)}</TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                <Tooltip title="Chỉnh sửa">
                                                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(post)}>
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Xóa">
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(post.id)}>
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
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
                    />
                </TableContainer>

                {/* Create/Edit Dialog */}
                <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ fontWeight: 'bold' }}>
                        {dialog.mode === 'create' ? 'Tạo bài viết mới' : 'Chỉnh sửa bài viết'}
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <TextField
                                label="Tiêu đề"
                                fullWidth
                                value={dialog.data.title}
                                onChange={handleInputChange('title')}
                                required
                            />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    select
                                    label="Trạng thái"
                                    fullWidth
                                    value={dialog.data.status}
                                    onChange={handleInputChange('status')}
                                >
                                    <MenuItem value="draft">Nháp</MenuItem>
                                    <MenuItem value="published">Đã đăng</MenuItem>
                                    <MenuItem value="scheduled">Lên lịch</MenuItem>
                                </TextField>
                                <TextField
                                    label="Chuyên mục"
                                    fullWidth
                                    value={dialog.data.category}
                                    onChange={handleInputChange('category')}
                                />
                            </Stack>

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>Ảnh đại diện (Thumbnail)</Typography>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    {dialog.data.thumbnail && (
                                        <Box
                                            component="img"
                                            src={dialog.data.thumbnail}
                                            sx={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 1, border: '1px solid #ddd' }}
                                        />
                                    )}
                                    <Button
                                        variant="outlined"
                                        component="label"
                                        startIcon={<FontAwesomeIcon icon={faImage} />}
                                    >
                                        Tải ảnh lên
                                        <input
                                            type="file"
                                            hidden
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                    </Button>
                                </Stack>
                            </Box>

                            <TextField
                                label="Nội dung"
                                fullWidth
                                multiline
                                rows={10}
                                value={dialog.data.content}
                                onChange={handleInputChange('content')}
                                required
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleCloseDialog} color="inherit">Hủy</Button>
                        <Button
                            variant="contained"
                            onClick={handleSave}
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={20} /> : null}
                        >
                            {saving ? 'Đang lưu...' : 'Lưu bài viết'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AdminLayout>
    );
};

export default PostManager;
