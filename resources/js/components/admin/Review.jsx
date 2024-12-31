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
    Rating,
    Chip,
    Typography,
    IconButton,
    InputAdornment,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faMagnifyingGlass, 
    faEye, 
    faEyeSlash,
    faFileExport,
    faCalendarDays
} from '@fortawesome/free-solid-svg-icons';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import axios from 'axios';
import '../../../css/Review.css';

const Review = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [filters, setFilters] = useState({
        search: '',
        stars: '',
        from_date: dayjs().startOf('month'),
        to_date: dayjs()
    });
    const [selectedNote, setSelectedNote] = useState({
        open: false,
        content: ''
    });

    // Fetch reviews data
    const fetchReviews = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/reviews', {
                params: {
                    page: page + 1,
                    per_page: rowsPerPage,
                    search: filters.search,
                    stars: filters.stars,
                    from_date: filters.from_date.format('YYYY-MM-DD'),
                    to_date: filters.to_date.format('YYYY-MM-DD')
                }
            });
            setReviews(response.data.data.data);
            setTotalItems(response.data.data.total);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
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

    // Handle date changes
    const handleDateChange = (field) => (date) => {
        setFilters(prev => ({
            ...prev,
            [field]: date
        }));
        setPage(0);
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    // Handle mark as viewed
    const handleMarkAsViewed = async (id) => {
        try {
            await axios.put(`/api/admin/reviews/${id}/mark-as-viewed`);
            fetchReviews();
        } catch (error) {
            console.error('Error marking review as viewed:', error);
        }
    };

    // Handle export
    const handleExport = async () => {
        try {
            const response = await axios.get('/api/admin/reviews/export', {
                params: {
                    search: filters.search,
                    stars: filters.stars,
                    from_date: filters.from_date.format('YYYY-MM-DD'),
                    to_date: filters.to_date.format('YYYY-MM-DD')
                },
                responseType: 'blob'
            });
            
            // Tạo URL từ blob
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `danh-sach-danh-gia-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting reviews:', error);
        }
    };

    // Thêm hàm xử lý hiển thị/ẩn note
    const handleNoteClick = (note) => {
        setSelectedNote({
            open: true,
            content: note
        });
    };

    const handleCloseNote = () => {
        setSelectedNote({
            open: false,
            content: ''
        });
    };

    // Hàm cắt ngắn text
    const truncateText = (text, length = 20) => {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    };

    return (
        <AdminLayout>
            <Box className="review-manager">
                {/* Header */}
                <Box className="review-manager-header">
                    <Typography variant="h5" className="review-manager-title">
                        Quản lý đánh giá
                    </Typography>

                    <Box className="review-manager-filters">
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
                            <DatePicker
                                label="Từ ngày"
                                value={filters.from_date}
                                onChange={handleDateChange('from_date')}
                                format="DD/MM/YYYY"
                                className="review-filter"
                                slotProps={{
                                    textField: {
                                        size: "small",
                                        InputProps: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <FontAwesomeIcon icon={faCalendarDays} />
                                                </InputAdornment>
                                            )
                                        }
                                    }
                                }}
                            />
                            <DatePicker
                                label="Đến ngày"
                                value={filters.to_date}
                                onChange={handleDateChange('to_date')}
                                format="DD/MM/YYYY"
                                className="review-filter"
                                slotProps={{
                                    textField: {
                                        size: "small",
                                        InputProps: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <FontAwesomeIcon icon={faCalendarDays} />
                                                </InputAdornment>
                                            )
                                        }
                                    }
                                }}
                            />
                        </LocalizationProvider>

                        {/* Filter by stars */}
                        <TextField
                            select
                            size="small"
                            label="Số sao"
                            value={filters.stars}
                            onChange={handleFilterChange('stars')}
                            className="review-filter"
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <MenuItem key={star} value={star}>
                                    {star} sao
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Search */}
                        <TextField
                            size="small"
                            placeholder="Tìm kiếm"
                            value={filters.search}
                            onChange={handleFilterChange('search')}
                            className="review-search"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                                    </InputAdornment>
                                )
                            }}
                        />

                        {/* Export button */}
                        <Button
                            variant="contained"
                            onClick={handleExport}
                            startIcon={<FontAwesomeIcon icon={faFileExport} />}
                            className="review-export-btn"
                        >
                            Xuất Excel
                        </Button>
                    </Box>
                </Box>

                {/* Table */}
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Mã lái đò</TableCell>
                                <TableCell>Tên khách hàng</TableCell>
                                <TableCell>Số điện thoại</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Đánh giá</TableCell>
                                <TableCell>Nhận xét khác</TableCell>
                                <TableCell>Ghi chú</TableCell>
                                <TableCell>Thời gian</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        Đang tải dữ liệu...
                                    </TableCell>
                                </TableRow>
                            ) : reviews.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        Không có dữ liệu
                                    </TableCell>
                                </TableRow>
                            ) : (
                                reviews.map((review) => (
                                    <TableRow key={review.id}>
                                        <TableCell>{review.staff_code}</TableCell>
                                        <TableCell>{review.customer_name}</TableCell>
                                        <TableCell>{review.customer_phone}</TableCell>
                                        <TableCell>{review.email}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Rating value={review.stars} readOnly />
                                                <Typography variant="body2" sx={{ ml: 1 }}>
                                                    ({review.stars})
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{review.other_review_names}</TableCell>
                                        <TableCell>
                                            {review.note ? (
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        cursor: 'pointer',
                                                        '&:hover': {
                                                            textDecoration: 'underline',
                                                            color: 'primary.main'
                                                        }
                                                    }}
                                                    onClick={() => handleNoteClick(review.note)}
                                                >
                                                    {truncateText(review.note)}
                                                </Typography>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell>{formatDate(review.created_at)}</TableCell>
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

                {/* Dialog hiển thị note */}
                <Dialog
                    open={selectedNote.open}
                    onClose={handleCloseNote}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        Ghi chú
                    </DialogTitle>
                    <DialogContent>
                        <Typography sx={{ mt: 2 }}>
                            {selectedNote.content}
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseNote}>Đóng</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AdminLayout>
    );
};

export default Review; 