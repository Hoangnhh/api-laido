import React, { useState, useEffect } from 'react';
import AdminLayout from './Layout/AdminLayout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faFileExport,
    faEye,
    faMoneyBillWave,
    faPlus,
    faFilter,
    faSync,
    faCheck,
    faClock,
    faTrash
} from '@fortawesome/free-solid-svg-icons';
import { 
    Paper, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow,
    TablePagination,
    TextField,
    Button,
    Box,
    Typography,
    IconButton,
    Chip,
    Grid,
    Card,
    CardContent,
    Divider,
    Menu,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Checkbox,
    Tabs,
    Tab
} from '@mui/material';
import axios from 'axios';
import '../../../css/AccountsPayable.css';

// Thêm hàm helper để lấy ngày đầu và cuối tháng
const getFirstDayOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1)
        .toISOString().split('T')[0];
};

const getLastDayOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0)
        .toISOString().split('T')[0];
};

const AccountsPayable = () => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [keyword, setKeyword] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openHistory, setOpenHistory] = useState(false);
    const [selectedBoatman, setSelectedBoatman] = useState(null);
    const [scanHistory, setScanHistory] = useState([]);
    const [selectedTickets, setSelectedTickets] = useState([]);
    const [ticketFilterStatus, setTicketFilterStatus] = useState('all');
    const [activeTab, setActiveTab] = useState(0);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
    const [toDate, setToDate] = useState(getLastDayOfMonth());
    const [paymentFromDate, setPaymentFromDate] = useState(getFirstDayOfMonth());
    const [paymentToDate, setPaymentToDate] = useState(getLastDayOfMonth());

    // Thêm dữ liệu mẫu
    useEffect(() => {
        setData([
            {
                id: 1,
                code: 'CN001',
                customerName: 'Nguyễn Văn A',
                phone: '0123456789',
                totalAmount: 5000000,
                paidAmount: 3000000,
                remainingAmount: 2000000,
                dueDate: '2024-03-20',
                status: 'pending'
            },
            {
                id: 2,
                code: 'CN002',
                customerName: 'Trần Thị B',
                phone: '0987654321',
                totalAmount: 8000000,
                paidAmount: 8000000,
                remainingAmount: 0,
                dueDate: '2024-03-15',
                status: 'paid'
            },
            {
                id: 3,
                code: 'CN003',
                customerName: 'Lê Văn C',
                phone: '0369852147',
                totalAmount: 3000000,
                paidAmount: 0,
                remainingAmount: 3000000,
                dueDate: '2024-02-28',
                status: 'pending'
            }
        ]);
    }, []);

    // Thống kê tổng quan
    const statistics = {
        totalDebt: data.reduce((sum, item) => sum + item.remainingAmount, 0),
        totalPaid: data.reduce((sum, item) => sum + item.paidAmount, 0),
        totalPending: data.filter(item => item.status === 'pending').length
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSearch = () => {
        setPage(0);
    };

    const handleExport = () => {
        console.log('Exporting...');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid':
                return 'success';
            case 'pending':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'paid':
                return 'Đã thanh toán';
            case 'pending':
                return 'Chờ thanh toán';
            default:
                return 'Không xác định';
        }
    };

    const handleViewHistory = (boatman) => {
        setSelectedBoatman(boatman);
        setFromDate(getFirstDayOfMonth());
        setToDate(getLastDayOfMonth());
        
        const sampleScanHistory = [
            {
                id: 1,
                ticketCode: 'VE001',
                scanTime: '2024-03-15 08:30:00',
                checkinTime: '2024-03-15 09:00:00',
                checkoutTime: '2024-03-15 11:30:00',
                amount: 150000,
                status: 'success',
                paymentStatus: 'paid',
                customerName: 'Nguyễn Văn A',
                customerPhone: '0123456789',
                ticketType: 'Vé người lớn',
                route: 'Bến Ninh Kiều - Cồn Sơn'
            },
            {
                id: 2,
                ticketCode: 'VE002',
                scanTime: '2024-03-15 09:15:00',
                checkinTime: '2024-03-15 09:45:00',
                checkoutTime: '2024-03-15 12:15:00',
                amount: 100000,
                status: 'success',
                paymentStatus: 'unpaid',
                customerName: 'Trần Thị B',
                customerPhone: '0987654321',
                ticketType: 'Vé trẻ em',
                route: 'Bến Ninh Kiều - Cồn Phó Ba'
            },
            {
                id: 3,
                ticketCode: 'VE003',
                scanTime: '2024-03-15 10:00:00',
                checkinTime: '2024-03-15 10:30:00',
                checkoutTime: '2024-03-15 13:00:00',
                amount: 150000,
                status: 'success',
                paymentStatus: 'paid',
                customerName: 'Lê Văn C',
                customerPhone: '0369852147',
                ticketType: 'Vé người lớn',
                route: 'Bến Ninh Kiều - Cồn Sơn'
            },
            {
                id: 4,
                ticketCode: 'VE004',
                scanTime: '2024-03-15 13:20:00',
                checkinTime: '2024-03-15 13:45:00',
                checkoutTime: '2024-03-15 16:15:00',
                amount: 150000,
                status: 'success',
                paymentStatus: 'unpaid',
                customerName: 'Phạm Thị D',
                customerPhone: '0912345678',
                ticketType: 'Vé người lớn',
                route: 'Bến Ninh Kiều - Cồn Phó Ba'
            },
            {
                id: 5,
                ticketCode: 'VE005',
                scanTime: '2024-03-15 14:00:00',
                checkinTime: '2024-03-15 14:30:00',
                checkoutTime: '2024-03-15 17:00:00',
                amount: 100000,
                status: 'success',
                paymentStatus: 'unpaid',
                customerName: 'Hoàng Văn E',
                customerPhone: '0898765432',
                ticketType: 'Vé trẻ em',
                route: 'Bến Ninh Kiều - Cồn Sơn'
            }
        ];

        console.log('Sample Scan History:', sampleScanHistory);
        setScanHistory(sampleScanHistory);

        // Thêm dữ liệu mẫu lịch sử thanh toán
        setPaymentHistory([
            {
                id: 1,
                paymentDate: '2024-03-15 09:00',
                amount: 150000,
                tickets: ['VE001', 'VE003', 'VE005'],
                paymentMethod: 'cash'
            },
            {
                id: 2,
                paymentDate: '2024-03-16 14:30',
                amount: 100000,
                tickets: ['VE007', 'VE008'],
                paymentMethod: 'transfer'
            }
        ]);
        setOpenHistory(true);
    };

    // Lọc ra danh sách vé chưa thanh toán
    const unpaidTickets = scanHistory.filter(ticket => ticket.paymentStatus !== 'paid');

    // Cập nhật hàm handleSelectAllClick
    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            // Chỉ chọn ID của các vé chưa thanh toán
            setSelectedTickets(unpaidTickets.map(ticket => ticket.id));
        } else {
            setSelectedTickets([]);
        }
    };

    const handleSelectTicket = (ticketId) => {
        const selectedIndex = selectedTickets.indexOf(ticketId);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedTickets, ticketId);
        } else {
            newSelected = newSelected.concat(
                selectedTickets.slice(0, selectedIndex),
                selectedTickets.slice(selectedIndex + 1)
            );
        }

        setSelectedTickets(newSelected);
    };

    const handlePaySelectedTickets = () => {
        console.log('Thanh toán các vé:', selectedTickets);
        // Xử lý thanh toán ở đây
    };

    // Thêm hàm lọc vé theo trạng thái thanh toán
    const filteredTickets = scanHistory.filter(ticket => {
        // Lọc theo trạng thái thanh toán
        let statusMatch = true;
        if (ticketFilterStatus === 'paid') {
            statusMatch = ticket.paymentStatus === 'paid';
        } else if (ticketFilterStatus === 'unpaid') {
            statusMatch = ticket.paymentStatus !== 'paid';
        }
        
        // Lọc theo ngày
        const ticketDate = new Date(ticket.scanTime);
        const fromDateMatch = !fromDate || ticketDate >= new Date(fromDate);
        const toDateMatch = !toDate || ticketDate <= new Date(toDate + ' 23:59:59');
        
        return statusMatch && fromDateMatch && toDateMatch;
    });

    // Thêm hàm lọc dữ liệu
    const filteredData = data.filter(item => {
        // Lọc theo từ khóa tìm kiếm
        const searchMatch = 
            item.customerName.toLowerCase().includes(keyword.toLowerCase()) ||
            item.phone.includes(keyword) ||
            item.code.toLowerCase().includes(keyword.toLowerCase());
        
        // Lọc theo trạng thái
        const statusMatch = filterStatus === 'all' ? true : item.status === filterStatus;
        
        return searchMatch && statusMatch;
    });

    // Thêm hàm xử lý xóa thanh toán
    const handleDeletePayment = (paymentId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa thanh toán này không?')) {
            setPaymentHistory(prevHistory => 
                prevHistory.filter(payment => payment.id !== paymentId)
            );
            // TODO: Cập nhật lại trạng thái các vé liên quan
            // Đặt lại trạng thái "chưa thanh toán" cho các vé trong payment này
        }
    };

    // Thêm hàm lọc thanh toán theo thời gian
    const filteredPaymentHistory = paymentHistory.filter(payment => {
        const paymentDate = new Date(payment.paymentDate);
        const fromDateMatch = !paymentFromDate || paymentDate >= new Date(paymentFromDate);
        const toDateMatch = !paymentToDate || paymentDate <= new Date(paymentToDate + ' 23:59:59');
        return fromDateMatch && toDateMatch;
    });

    return (
        <AdminLayout>
            <Box className="ap-container">
                <Box className="ap-header">
                    <h1 className="ap-title">
                        Quản lý công nợ phải trả
                    </h1>
                    
                    <Box className="ap-header-filter">
                        <FormControl className="ap-filter-field" size="small">
                            <InputLabel>Trạng thái</InputLabel>
                            <Select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                label="Trạng thái"
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                <MenuItem value="pending">Chờ thanh toán</MenuItem>
                                <MenuItem value="paid">Đã thanh toán</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            className="ap-filter-field"
                            label="Tìm kiếm"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            size="small"
                            placeholder="Tên khách hàng, số điện thoại..."
                        />
                        <Button
                            variant="contained"
                            onClick={handleSearch}
                            startIcon={<FontAwesomeIcon icon={faSearch} />}
                            className="ap-button"
                        >
                            Tìm kiếm
                        </Button>
                    </Box>
                </Box>

                <Box className="ap-statistics-cards">
                    <Card className="ap-statistics-card ap-statistics-card--debt">
                        <CardContent className="ap-statistics-card__content">
                            <Typography className="ap-statistics-card__label">
                                Tổng công nợ
                            </Typography>
                            <Typography className="ap-statistics-card__value">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(statistics.totalDebt)}
                            </Typography>
                        </CardContent>
                    </Card>

                    <Card className="ap-statistics-card ap-statistics-card--paid">
                        <CardContent className="ap-statistics-card__content">
                            <Typography className="ap-statistics-card__label">
                                Đã thanh toán
                            </Typography>
                            <Typography className="ap-statistics-card__value">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(statistics.totalPaid)}
                            </Typography>
                        </CardContent>
                    </Card>

                    <Card className="ap-statistics-card ap-statistics-card--pending">
                        <CardContent className="ap-statistics-card__content">
                            <Typography className="ap-statistics-card__label">
                                Chờ thanh toán
                            </Typography>
                            <Typography className="ap-statistics-card__value">
                                {statistics.totalPending}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                <TableContainer className="ap-data-table">
                    <Table>
                        <TableHead>
                            <TableRow className="ap-data-table__header">
                                <TableCell className="ap-data-table__header-cell">
                                    Mã công nợ
                                </TableCell>
                                <TableCell className="ap-data-table__header-cell">
                                    Lái đò
                                </TableCell>
                                <TableCell className="ap-data-table__header-cell">
                                    Số điện thoại
                                </TableCell>
                                <TableCell className="ap-data-table__header-cell" align="right">
                                    Tổng tiền
                                </TableCell>
                                <TableCell className="ap-data-table__header-cell" align="right">
                                    Đã thanh toán
                                </TableCell>
                                <TableCell className="ap-data-table__header-cell" align="right">
                                    Còn lại
                                </TableCell>
                                <TableCell className="ap-data-table__header-cell">
                                    Trạng thái
                                </TableCell>
                                <TableCell className="ap-data-table__header-cell" align="center">
                                    Thao tác
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredData
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>{row.code}</TableCell>
                                        <TableCell>{row.customerName}</TableCell>
                                        <TableCell>{row.phone}</TableCell>
                                        <TableCell align="right">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.totalAmount)}
                                        </TableCell>
                                        <TableCell align="right">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.paidAmount)}
                                        </TableCell>
                                        <TableCell align="right">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.remainingAmount)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={getStatusText(row.status)}
                                                color={getStatusColor(row.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton 
                                                size="small" 
                                                color="primary"
                                                title="Xem chi tiết"
                                                onClick={() => handleViewHistory(row)}
                                            >
                                                <FontAwesomeIcon icon={faEye} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={filteredData.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Số dòng mỗi trang:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} trên ${count}`}
                    />
                </TableContainer>

                <Dialog
                    open={openHistory}
                    onClose={() => setOpenHistory(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle className="ap-dialog-title">
                        Chi tiết công nợ - {selectedBoatman?.customerName}
                    </DialogTitle>
                    <DialogContent className="ap-dialog__content">
                        <Tabs
                            value={activeTab}
                            onChange={(e, newValue) => setActiveTab(newValue)}
                            sx={{ borderBottom: 1, borderColor: 'divider' }}
                        >
                            <Tab label="Lịch sử vé" />
                            <Tab label="Lịch sử thanh toán" />
                        </Tabs>

                        {activeTab === 0 ? (
                            <>
                                <Box className="ap-dialog__filter-container">
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <FormControl size="small" sx={{ minWidth: 200 }}>
                                            <InputLabel>Trạng thái thanh toán</InputLabel>
                                            <Select 
                                                value={ticketFilterStatus} 
                                                onChange={(e) => setTicketFilterStatus(e.target.value)} 
                                                label="Trạng thái thanh toán"
                                            >
                                                <MenuItem value="all">Tất cả</MenuItem>
                                                <MenuItem value="paid">Đã thanh toán</MenuItem>
                                                <MenuItem value="unpaid">Chưa thanh toán</MenuItem>
                                            </Select>
                                        </FormControl>
                                        
                                        <TextField
                                            size="small"
                                            type="date"
                                            label="Từ ngày"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                        
                                        <TextField
                                            size="small" 
                                            type="date"
                                            label="Đến ngày"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Box>
                                </Box>
                                
                                <Box className="ap-dialog__table-container">
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        color="primary"
                                                        indeterminate={
                                                            selectedTickets.length > 0 && 
                                                            selectedTickets.length < unpaidTickets.length
                                                        }
                                                        checked={
                                                            unpaidTickets.length > 0 && 
                                                            selectedTickets.length === unpaidTickets.length
                                                        }
                                                        onChange={handleSelectAllClick}
                                                        disabled={unpaidTickets.length === 0}
                                                    />
                                                </TableCell>
                                                <TableCell>Mã vé</TableCell>
                                                <TableCell>Thời gian quét</TableCell>
                                                <TableCell>Giờ vào</TableCell>
                                                <TableCell>Giờ ra</TableCell>
                                                <TableCell align="right">Số tiền</TableCell>
                                                <TableCell>Trạng thái thanh toán</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredTickets.map((history) => (
                                                <TableRow 
                                                    key={history.id} 
                                                    hover
                                                    selected={selectedTickets.indexOf(history.id) !== -1}
                                                >
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            color="primary"
                                                            checked={selectedTickets.indexOf(history.id) !== -1}
                                                            onChange={() => handleSelectTicket(history.id)}
                                                            disabled={history.paymentStatus === 'paid'}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{history.ticketCode}</TableCell>
                                                    <TableCell>{history.scanTime}</TableCell>
                                                    <TableCell>{history.checkinTime}</TableCell>
                                                    <TableCell>{history.checkoutTime}</TableCell>
                                                    <TableCell align="right">
                                                        {new Intl.NumberFormat('vi-VN', { 
                                                            style: 'currency', 
                                                            currency: 'VND' 
                                                        }).format(history.amount)}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {history.paymentStatus === 'paid' ? (
                                                            <FontAwesomeIcon 
                                                                icon={faCheck} 
                                                                className="ap-payment-status-icon"
                                                            />
                                                        ) : (
                                                            <FontAwesomeIcon 
                                                                icon={faClock} 
                                                                className="ap-payment-status-icon ap-payment-status-icon--pending"
                                                            />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </>
                        ) : (
                            <>
                                <Box className="ap-dialog__filter-container">
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <TextField
                                            size="small"
                                            type="date"
                                            label="Từ ngày"
                                            value={paymentFromDate}
                                            onChange={(e) => setPaymentFromDate(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                        
                                        <TextField
                                            size="small" 
                                            type="date"
                                            label="Đến ngày"
                                            value={paymentToDate}
                                            onChange={(e) => setPaymentToDate(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Box>
                                </Box>
                                
                                <Box className="ap-dialog__table-container">
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                <TableCell>Thời gian</TableCell>
                                                <TableCell>Mã vé</TableCell>
                                                <TableCell align="right">Số tiền</TableCell>
                                                <TableCell>Phương thức</TableCell>
                                                <TableCell align="center">Thao tác</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredPaymentHistory.map((payment) => (
                                                <TableRow key={payment.id} hover>
                                                    <TableCell>{payment.paymentDate}</TableCell>
                                                    <TableCell>{payment.tickets.join(', ')}</TableCell>
                                                    <TableCell align="right">
                                                        {new Intl.NumberFormat('vi-VN', { 
                                                            style: 'currency', 
                                                            currency: 'VND' 
                                                        }).format(payment.amount)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {payment.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDeletePayment(payment.id)}
                                                            title="Xóa thanh toán"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
                        {activeTab === 0 && selectedTickets.length > 0 && (
                            <Button
                                variant="contained"
                                color="success"
                                onClick={handlePaySelectedTickets}
                                startIcon={<FontAwesomeIcon icon={faMoneyBillWave} />}
                            >
                                Thanh toán ({selectedTickets.length} vé)
                            </Button>
                        )}
                        <Button onClick={() => {
                            setOpenHistory(false);
                            setSelectedTickets([]);
                            setActiveTab(0); // Reset về tab đầu tiên khi đóng
                        }} className="ap-close-button" sx={{ color: '#2c3e50', '&:hover': { bgcolor: '#f5f5f5' } }}>
                            Đóng
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AdminLayout>
    );
};

export default AccountsPayable; 