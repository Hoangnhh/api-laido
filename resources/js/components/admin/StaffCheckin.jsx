import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCheck} from '@fortawesome/free-solid-svg-icons';
import '../../../css/StaffCheckin.css';
import { 
    Dialog,
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    CardHeader,
    Avatar,
    Chip,
    Divider,
    Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';
import Loading from '../common/Loading';

const StaffCheckin = () => {
    const [selectedPosition, setSelectedPosition] = useState(0);
    const [cardId, setCardId] = useState('');
    const [error, setError] = useState('');
    const [positions, setPositions] = useState([]);
    const [maxWaitingItems, setMaxWaitingItems] = useState(5);
    const [checkedInStaff, setCheckedInStaff] = useState(null);
    const [checkedTickets, setCheckedTickets] = useState([]);
    const [ticketStats, setTicketStats] = useState({
        total_ticket_in: 0,
        total_ticket_out: 0
    });
    const [showModal, setShowModal] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [cardBuffer, setCardBuffer] = useState('');
    const [lastKeyTime, setLastKeyTime] = useState(Date.now());
    const SCAN_TIMEOUT = 100; // 100ms timeout giữa các ký tự
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastSubmitTime, setLastSubmitTime] = useState(0);
    const SUBMIT_DELAY = 500; // 500ms delay giữa các lần submit
    const [checkedTicketsCount, setCheckedTicketsCount] = useState(0);
    const [audioQueue, setAudioQueue] = useState([]);
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [ticketMessage, setTicketMessage] = useState(null);
    const [ticketCode, setTicketCode] = useState('');
    const [isCheckingTicket, setIsCheckingTicket] = useState(false);
    const ticketInputRef = useRef(null);
    const isTestMode = new URLSearchParams(window.location.search).get('test') === '1';
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const inputRef = useRef(null);
    const isSubmitting = useRef(false);

    useEffect(() => {
        calculateMaxWaitingItems();
        window.addEventListener('resize', calculateMaxWaitingItems);
        return () => window.removeEventListener('resize', calculateMaxWaitingItems);
    }, []);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [checkedInStaff, error]);

    useEffect(() => {
        if (selectedPosition !== 0) {
            setShowModal(false);
        }
    }, [selectedPosition]);

    useEffect(() => {
        const handleKeyPress = (e) => {
            const currentTime = Date.now();
            
            if (currentTime - lastKeyTime > SCAN_TIMEOUT) {
                setCardBuffer('');
            }
            
            setLastKeyTime(currentTime);

            if (e.key === 'Enter') {
                e.preventDefault(); // Ngăn form submit
                
                // Xử lý ngay khi có mã hợp lệ
                if (cardBuffer) {
                    const scannedCode = cardBuffer.trim();
                    setCardId(scannedCode);
                    
                    // Kiểm tra độ dài và xử lý ngay
                    if (scannedCode.length === 10 || scannedCode.length > 10) {
                        if (currentTime - lastSubmitTime >= SUBMIT_DELAY) {
                            setLastSubmitTime(currentTime);
                            handleSubmit(e, scannedCode); // Truyền scannedCode trực tiếp
                        }
                    }
                }
                setCardBuffer('');
            } else if (e.key.length === 1) { // Chỉ nhận ký tự in được
                setCardBuffer(prev => prev + e.key);
            }
        };

        if (!showModal) {
            window.addEventListener('keypress', handleKeyPress);
        }

        return () => {
            window.removeEventListener('keypress', handleKeyPress);
        };
    }, [cardBuffer, lastKeyTime, lastSubmitTime, showModal]);

    useEffect(() => {
        fetchGates();
        // Kiểm tra tham số gate_id trên URL
        const params = new URLSearchParams(window.location.search);
        const gateId = params.get('gate_id');
        if (gateId) {
            setSelectedPosition(Number(gateId));
        }
    }, []);

    useEffect(() => {
        if (audioQueue.length > 0 && !isPlaying) {
            playNextInQueue();
        }
    }, [audioQueue, isPlaying]);

    useEffect(() => {
        if (showCheckinModal) {
            const handleKeyPress = (e) => {
                const currentTime = Date.now();
                
                if (currentTime - lastKeyTime > SCAN_TIMEOUT) {
                    setCardBuffer('');
                }
                setLastKeyTime(currentTime);

                if (e.key.length === 1) {
                    setCardBuffer(prev => prev + e.key);
                }

                if (e.key === 'Enter') {
                    const scannedCode = cardBuffer.trim();
                    setCardBuffer('');

                    if (scannedCode.length === 0) return;

                    if (scannedCode.length === 10) {
                        handleScanTicket(scannedCode);
                    } else if (scannedCode.length > 10) {
                        handleCheckin(scannedCode);
                    }
                }
            };

            window.addEventListener('keypress', handleKeyPress);
            return () => window.removeEventListener('keypress', handleKeyPress);
        }
    }, [showCheckinModal, cardBuffer, lastKeyTime]);

    const handleCheckin = async (code) => {
        if (isProcessing || isSubmitting.current) return;
        
        try {
            isSubmitting.current = true;
            setIsProcessing(true);
            setError('');
            
            const response = await axios.post('/api/admin/staff-checkin', {
                card_id: code,
                gate_id: selectedPosition,
            });

            if (response.data.status === 'success') {
                setShowCheckinModal(false);
                
                const { checked_tickets, ...staffData } = response.data.data;
                
                setCheckedInStaff({
                    ...staffData,
                    success: true
                });
                
                setCheckedTickets(checked_tickets?.data || []);
                setTicketStats({
                    total_ticket_in: checked_tickets?.total_ticket_in || 0,
                    total_ticket_out: checked_tickets?.total_ticket_out || 0
                });

                setShowCheckinModal(true);
                setMessage({ type: response.data.message_color, text: response.data.message });
            } else {
                setCheckedInStaff({
                    staff: response.data.data.staff,
                    error: true
                });
                setMessage({ type: 'error', text: response.data.message });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra khi checkin');
            if (err.response?.data?.data?.staff) {
                setCheckedInStaff({
                    staff: err.response.data.data.staff,
                    error: true
                });
            }
        } finally {
            setCardId('');
            setCardBuffer('');
            setIsProcessing(false);
            isSubmitting.current = false;
        }
    };

    const calculateMaxWaitingItems = () => {
        const containerHeight = window.innerHeight - 340;
        const headerHeight = 52;
        const itemHeight = 116;
        const contentPadding = 30;
        
        const availableHeight = containerHeight - headerHeight - contentPadding;
        const maxItems = Math.floor(availableHeight / itemHeight);
        
        setMaxWaitingItems(Math.min(Math.max(maxItems, 3), 8));
    };

    const handleSubmit = async (e, code = null) => {
        e.preventDefault();
        const submitCode = code || cardId; // Sử dụng code được truyền vào hoặc cardId từ state
        
        if (!submitCode || isProcessing) return;

        setIsLoading(true);
        try {
            if (submitCode.length === 10) {
                await handleScanTicket(submitCode);
            } else if (submitCode.length > 10) {
                await handleCheckin(submitCode);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchGates = async () => {
        try {
            const response = await axios.get('/api/admin/gates');
            const gates = response.data;
            setPositions(gates);
        } catch (err) {
            console.error('Lỗi khi lấy danh sách cửa:', err);
        }
    };

    const handleScanTicket = async (code) => {
        if (isProcessing || !checkedInStaff?.staff?.id) {
            setMessage({ type: 'error', text: 'Vui lòng checkin nhân viên trước khi quét vé' });
            setCardId('');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await axios.post('/api/admin/use-ticket', {
                code: code,
                staff_id: checkedInStaff.staff.id,
                is_master: checkedInStaff.staff.is_master
            });

            if (response.data.success === true) {
                let newTicketData = response.data.data;
                const newTicket = {
                    id: newTicketData.id,
                    code: code,
                    name: newTicketData.name,
                    status: newTicketData.status,
                    checkin_at: newTicketData.checkin_time ?? '',
                    checkout_at: newTicketData.checkout_time ?? ''
                };

                const existingTicketIndex = checkedTickets.findIndex(
                    ticket => ticket.code === code
                );

                if (existingTicketIndex >= 0) {
                    const updatedTickets = [...checkedTickets];
                    updatedTickets[existingTicketIndex] = newTicket;
                    setCheckedTickets(updatedTickets);
                } else {
                    setCheckedTickets([newTicket, ...checkedTickets]);
                }

                setTicketStats(prev => ({
                    total_ticket_in: newTicket.status === 'CHECKIN' ? prev.total_ticket_in + 1 : prev.total_ticket_in,
                    total_ticket_out: newTicket.status === 'CHECKOUT' ? prev.total_ticket_out + 1 : prev.total_ticket_out
                }));

                setMessage({ type: 'success', text: response.data.message });
            } else {
                setMessage({ type: 'error', text: response.data.message });
            }
        } catch (err) {
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.message || 'Có lỗi xảy ra khi checkin vé'
            });
        } finally {
            setIsProcessing(false);
            setCardId('');
        }
    };

    const handleTicketCheckin = async (e) => {
        e.preventDefault();
        if (!ticketCode || isCheckingTicket) return;

        setIsCheckingTicket(true);
        try {
            const response = await axios.post('/api/admin/use-ticket', {
                code: ticketCode,
                staff_id: checkedInStaff.staff.id
            });

            if (response.data.success === true) {
                setTicketCode('');
                setTicketMessage({ type: 'success', text: response.data.message });
            } else {
                setTicketMessage({ type: 'error', text: response.data.message });
            }
        } catch (err) {
            setTicketMessage({ 
                type: 'error', 
                text: err.response?.data?.message || 'Có lỗi xảy ra khi checkin vé'
            });
        } finally {
            setIsCheckingTicket(false);
        }
    };

    // Styled components
    const StyledDialog = styled(Dialog)(({ theme }) => ({
        '& .MuiDialog-paper': {
            width: '95%',
            maxWidth: '1600px',
            maxHeight: '95vh',
        }
    }));

    const StyledAvatar = styled(Avatar)(({ theme, hasIndex }) => ({
        width: 300,
        height: 300,
        border: `4px solid ${theme.palette.primary.main}`,
        margin: '0 auto',
        boxShadow: theme.shadows[3],
        position: 'relative',
        '&::after': !hasIndex ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(45deg, transparent 45%, ${theme.palette.error.main} 45%, ${theme.palette.error.main} 55%, transparent 55%)`,
            pointerEvents: 'none'
        } : {}
    }));

    return (
        <div className="sc-wrapper">
            {isLoading && <Loading message={cardId.length === 10 ? "Đang xử lý vé..." : "Đang xử lý thẻ nhân viên..."} />}

            <div className="sc-fixed-header">
                <h1 className="sc-title">
                    <div className="sc-controls">
                        <div className="sc-position-selector">
                            <select 
                                value={selectedPosition}
                                onChange={(e) => setSelectedPosition(Number(e.target.value))}
                                className="sc-position-select"
                            >
                                <option value={0}>Lựa chọn vị trí</option>
                                {positions.map(pos => (
                                    <option key={pos.id} value={pos.id}>©
                                        {pos.name}
                                    </option>
                                ))}
                            </select>
                            {isTestMode && (
                                <form 
                                    onSubmit={handleSubmit} 
                                    className={`sc-search-form ${
                                        isTestMode ? 'show' : ''
                                    }`}
                                >
                                    <input
                                        type="text"
                                        value={cardId}
                                        onChange={(e) => setCardId(e.target.value.toUpperCase())}
                                        placeholder="Quẹt thẻ..."
                                        className="sc-search-input"
                                        ref={inputRef}
                                        autoComplete="off"
                                        disabled={isProcessing}
                                    />
                                    <button 
                                        type="submit" 
                                        className="sc-search-button"
                                        disabled={isProcessing || !cardId}
                                    >
                                        <FontAwesomeIcon icon={faUserCheck} className="fa-icon" />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </h1>
            </div>

            <div className="sc-container">
                {ticketMessage && (
                    <Box
                        sx={{
                            p: 2,
                            mb: 3,
                            bgcolor: ticketMessage.type === 'error' ? 'error.light' : 'success.light',
                            color: 'white',
                            borderRadius: 1
                        }}
                    >
                        <Typography variant="h6">
                            {ticketMessage.text}
                        </Typography>
                    </Box>
                )}

                {checkedInStaff?.staff ? (
                    <Grid container spacing={3}>
                        {/* Left Column - Staff Info */}
                        <Grid item xs={12} md={4}>
                            <Paper elevation={3} sx={{ p: 3, bgcolor: 'grey.50' }}>
                                <StyledAvatar
                                    src={`http://admin-laido.invade.vn/${checkedInStaff.staff?.avatar_url}`}
                                    alt={checkedInStaff.staff?.name}
                                    hasIndex={!!checkedInStaff.assignment?.index}
                                />
                                <Typography 
                                    variant="h2" 
                                    sx={{ 
                                        my: 2,
                                        color: 'primary.main',
                                        fontWeight: 'bold',
                                        textAlign: 'center'
                                    }}
                                >
                                    {checkedInStaff.staff?.code}
                                </Typography>
                                <Stack spacing={2}>
                                    <Box sx={{ 
                                        p: 2, 
                                        borderBottom: 1, 
                                        borderColor: 'divider',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 2 }}>
                                            Số Đò:
                                        </Typography>
                                        <Typography variant="h6" sx={{ flex: 1, textAlign: 'right' }}>
                                            {checkedInStaff.staff?.code}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ 
                                        p: 2, 
                                        borderBottom: 1, 
                                        borderColor: 'divider',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Typography variant="subtitle1" color="text.secondary" sx={{ mr: 2 }}>
                                            Họ tên:
                                        </Typography>
                                        <Typography variant="h6" sx={{ flex: 1, textAlign: 'right' }}>
                                            {checkedInStaff.staff?.name}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ 
                                        p: 2, 
                                        borderBottom: 1, 
                                        borderColor: 'divider',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Typography variant="subtitle1" color="text.secondary" sx={{ mr: 2 }}>
                                            Ca làm việc:
                                        </Typography>
                                        <Typography variant="h6" sx={{ flex: 1, textAlign: 'right' }}>
                                            {checkedInStaff.staff?.group_name}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>

                        {/* Right Column - Tickets List */}
                        <Grid item xs={12} md={8}>
                            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="h4" color="primary" sx={{ mb: 3 }}>
                                    Vé vào: {ticketStats.total_ticket_in} - Vé ra: {ticketStats.total_ticket_out}
                                </Typography>
                                
                                <Box 
                                    sx={{ 
                                        flexGrow: 1,
                                        overflow: 'auto',
                                        maxHeight: 'calc(90vh - 200px)',
                                        pr: 1
                                    }}
                                >
                                    <Grid container spacing={2}>
                                        {checkedTickets.map((ticket, index) => (
                                            <Grid item xs={12} md={6} lg={4} key={ticket.id}>
                                                <Card 
                                                    sx={{ 
                                                        height: '100%',
                                                        borderLeft: 6,
                                                        borderColor: ticket.status === 'CHECKIN' ? 'success.main' : 'primary.main'
                                                    }}
                                                >
                                                    <CardHeader
                                                        // avatar={<ConfirmationNumber />}
                                                        title={ticket.code}
                                                        action={
                                                            <Chip
                                                                label={ticket.status}
                                                                color={ticket.status === 'CHECKIN' ? 'success' : 'primary'}
                                                                size="small"
                                                            />
                                                        }
                                                    />
                                                    <Divider />
                                                    <CardContent>
                                                        <Typography variant="body1" gutterBottom>
                                                            {ticket.name}
                                                        </Typography>
                                                        <Stack 
                                                            direction="row" 
                                                            justifyContent="space-between"
                                                            sx={{ mt: 1 }}
                                                        >
                                                            <Typography variant="body2" color="text.secondary">
                                                                VÀO: {ticket.checkin_at}
                                                            </Typography>
                                                            {ticket.checkout_at && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    RA: {ticket.checkout_at}
                                                                </Typography>
                                                            )}
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                        {(!checkedTickets.length && checkedInStaff.checked_tickets?.data?.length === 0) && (
                                            <Grid item xs={12}>
                                                <Box 
                                                    sx={{ 
                                                        textAlign: 'center',
                                                        p: 3,
                                                        color: 'text.secondary'
                                                    }}
                                                >
                                                    <Typography variant="h3">
                                                        Chưa có vé nào được quẹt
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                ) : (
                    <Box sx={{ textAlign: 'center', p: 5, color: 'text.secondary' }}>
                        <Typography variant="h3">
                            Vui lòng quẹt thẻ nhân viên để checkin
                        </Typography>
                    </Box>
                )}
            </div>

            <div className="sc-footer">
                {message && (
                    <div 
                        className={`sc-message ${message.type}`}
                        style={{
                            animation: 'fadeInOut 5s ease-in-out'
                        }}
                    >
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffCheckin; 