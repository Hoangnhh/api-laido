import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeMute, faVolumeUp, faUserClock, faUserCheck, faTimes, faTicketAlt, faClose } from '@fortawesome/free-solid-svg-icons';
import '../../../css/StaffCheckin.css';
import { 
    Dialog, 
    DialogContent,
    DialogTitle,
    IconButton,
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

const StaffCheckin = () => {
    const [selectedPosition, setSelectedPosition] = useState(0);
    const [cardId, setCardId] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [assignments, setAssignments] = useState({
        type_1: [], // Danh sách Đò
        type_2: []  // Danh sách xuồng
    });
    const [positions, setPositions] = useState([]);
    const [maxWaitingItems, setMaxWaitingItems] = useState(5);
    const [checkedInStaff, setCheckedInStaff] = useState(null);
    const [isMuted, setIsMuted] = useState(() => {
        const savedMute = localStorage.getItem('queueDisplay_isMuted');
        return savedMute ? JSON.parse(savedMute) : false;
    });
    const [showModal, setShowModal] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [lastAnnounced, setLastAnnounced] = useState({
        type_1: null,
        type_2: null
    });
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

    const inputRef = useRef(null);
    const isSubmitting = useRef(false);

    useEffect(() => {
        fetchAssignments();
        fetchCheckedTicketsCount();
        
        const intervalId = setInterval(() => {
            // fetchAssignments();
            // fetchCheckedTicketsCount();
        }, 30000);

        return () => clearInterval(intervalId);
    }, [selectedPosition,isMuted]);

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
        localStorage.setItem('queueDisplay_isMuted', JSON.stringify(isMuted));
    }, [isMuted]);

    useEffect(() => {
        const handleKeyPress = (e) => {
            const currentTime = Date.now();
            
            if (currentTime - lastKeyTime > SCAN_TIMEOUT) {
                setCardBuffer('');
            }
            
            setLastKeyTime(currentTime);

            if (e.key === 'Enter') {
                e.preventDefault(); // Ngăn form submit
                
                if (currentTime - lastSubmitTime < SUBMIT_DELAY) {
                    setCardBuffer('');
                    return;
                }

                if (cardBuffer && !isSubmitting.current) {
                    const scannedCode = cardBuffer;
                    setCardId(scannedCode);
                    setLastSubmitTime(currentTime);
                    
                    handleCheckin(scannedCode);
                }
                setCardBuffer('');
            } else {
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
        if (!isMuted && audioQueue.length > 0 && !isPlaying) {
            playNextInQueue();
        }
    }, [audioQueue, isPlaying, isMuted]);

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

    const playNextInQueue = async () => {
        if (audioQueue.length === 0 || isPlaying) return;

        try {
            setIsPlaying(true);
            const announcement = audioQueue[0];
            
            const response = await axios.post(
                'https://texttospeech.googleapis.com/v1/text:synthesize',
                {
                    input: {
                        text: announcement.text
                    },
                    voice: {
                        languageCode: 'vi-VN',
                        name: 'vi-VN-Wavenet-A',
                        ssmlGender: 'FEMALE'
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        pitch: 0,
                        speakingRate: 1
                    }
                },
                {
                    params: {
                        key: 'AIzaSyCs1WxI4euLChHIacdFZr1g00xgjAVmENA'
                    }
                }
            );

            const audio = new Audio(`data:audio/mp3;base64,${response.data.audioContent}`);
            
            audio.addEventListener('ended', () => {
                setAudioQueue(prevQueue => prevQueue.slice(1));
                setIsPlaying(false);
            });
            
            await audio.play();

        } catch (error) {
            console.error('Lỗi khi đọc thông báo:', error);
            setAudioQueue(prevQueue => prevQueue.slice(1));
            setIsPlaying(false);
        }
    };

    const announceStaff = async (staffName, staffIndex, type) => {
        if (isMuted) return;
        
        const currentAnnouncement = `${type}-${staffIndex}-${staffName}`;
        const lastAnnouncedForType = lastAnnounced[type];
        
        if (currentAnnouncement === lastAnnouncedForType) return;
        
        setLastAnnounced(prev => ({
            ...prev,
            [type]: currentAnnouncement
        }));

        const announcementText = type === 'type_1' 
            ? `Mời lái đò số thứ tự ${staffIndex} ,${staffName}, tới cửa số ${selectedPosition} để checkin`
            : `Mời lái xuồng số thứ tự ${staffIndex} ,${staffName}, tới cửa số ${selectedPosition} để checkin`;

        setAudioQueue(prevQueue => [...prevQueue, {
            text: announcementText,
            type: type
        }]);
    };

    const fetchAssignments = async () => {
        if(selectedPosition === 0) return;
        try {
            const response = await axios.get(`/api/admin/get-assignments-by-gate?gate_id=${selectedPosition}`);
            setAssignments({
                type_1: Array.isArray(response.data.assignments.type_1) ? response.data.assignments.type_1 : [],
                type_2: Array.isArray(response.data.assignments.type_2) ? response.data.assignments.type_2 : []
            });

            // Thông báo cho nhân viên đầu tiên của mỗi loại
            const firstType1Staff = response.data.assignments.type_1?.[0];
            const firstType2Staff = response.data.assignments.type_2?.[0];
            
            if (firstType1Staff) {
                await announceStaff(firstType1Staff.staff.name, firstType1Staff.index, 'type_1');
            }
            if (firstType2Staff) {
                await announceStaff(firstType2Staff.staff.name, firstType2Staff.index, 'type_2');
            }

        } catch (err) {
            console.error('Lỗi khi lấy danh sách phân ca:', err);
            setAssignments({
                type_1: [],
                type_2: []
            });
        }
    };

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
                
                setCheckedInStaff({
                    ...response.data.data,
                    success: true
                });
                setShowCheckinModal(true);
                fetchAssignments();
                setSuccessMessage(response.data.message);
            } else {
                setError(response.data.message);
                setCheckedInStaff({
                    ...response.data.data,
                    error: true
                });
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

    const Modal = ({ isOpen, onClose, children }) => {
        if (!isOpen) return null;

        return (
            <div className="qd-modal-overlay">
                <div className="qd-modal">
                    {children}
                    <button className="qd-modal-close" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
            </div>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cardId) {
            handleCheckin(cardId);
        }
    };

    const fetchCheckedTicketsCount = async () => {
        if (selectedPosition === 0) return;
        
        try {
            const response = await axios.get('/api/admin/get-checked-tickets-by-gate', {
                params: {
                    gate_ids: [selectedPosition],
                    from_date: new Date().toISOString().split('T')[0]
                }
            });
            
            const gateStats = response.data.data;
            if (gateStats && gateStats.length > 0) {
                setCheckedTicketsCount(gateStats[0].total_tickets);
            }
        } catch (error) {
            console.error('Lỗi khi lấy số lượng vé:', error);
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

    const handleScanTicket = async (ticketCode) => {
        if (isProcessing || !checkedInStaff?.staff?.id) return;

        setIsProcessing(true);
        try {
            const response = await axios.post('/api/admin/use-ticket', {
                code: ticketCode,
                staff_id: checkedInStaff.staff.id
            });

            if (response.data.success === true) {
                let newTicketData = response.data.data;
                const newTicket = {
                    id: newTicketData.id,
                    code: ticketCode,
                    name: newTicketData.name,
                    status: newTicketData.status,
                    checkin_at: newTicketData.checkin_time,
                    checkout_at: newTicketData.checkout_time
                };

                setCheckedInStaff(prev => {
                    const existingTicketIndex = prev.checked_tickets?.findIndex(
                        ticket => ticket.code === ticketCode
                    );

                    if (existingTicketIndex >= 0) {
                        const updatedTickets = [...prev.checked_tickets];
                        updatedTickets[existingTicketIndex] = newTicket;
                        return {
                            ...prev,
                            checked_tickets: updatedTickets
                        };
                    } else {
                        return {
                            ...prev,
                            checked_tickets: [newTicket, ...(prev.checked_tickets || [])]
                        };
                    }
                });

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
            setIsProcessing(false);
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

    const StyledAvatar = styled(Avatar)(({ theme }) => ({
        width: 300,
        height: 300,
        border: `4px solid ${theme.palette.primary.main}`,
        margin: '0 auto',
        boxShadow: theme.shadows[3]
    }));

    // CheckinModal component
    const CheckinModal = React.memo(({ isOpen, onClose, staffData, setCheckedInStaff, ticketMessage, setTicketMessage }) => {
        const [ticketCode, setTicketCode] = useState('');
        const [isCheckingTicket, setIsCheckingTicket] = useState(false);
        const ticketInputRef = useRef(null);
        const isTestMode = new URLSearchParams(window.location.search).get('test') === '1';

        if (!isOpen || !staffData || !staffData.staff) return null;

        useEffect(() => {
            if (isOpen && ticketInputRef.current) {
                ticketInputRef.current.focus();
            }
        }, [isOpen]);

        const handleTicketCheckin = async (e) => {
            e.preventDefault();
            if (!ticketCode || isCheckingTicket) return;

            setIsCheckingTicket(true);
            try {
                const response = await axios.post('/api/admin/use-ticket', {
                    code: ticketCode,
                    staff_id: staffData.staff.id
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

        return (
            <StyledDialog open={isOpen} onClose={onClose} maxWidth={false}>
                <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
                    {ticketMessage && (
                        <Box
                            sx={{
                                p: 2,
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
                    <IconButton
                        onClick={onClose}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: 'white'
                        }}
                    >
                        <FontAwesomeIcon icon={faClose} />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    <Grid container spacing={3}>
                        {/* Left Column - Staff Info */}
                        <Grid item xs={12} md={4}>
                            <Paper elevation={3} sx={{ p: 3, bgcolor: 'grey.50' }}>
                                <StyledAvatar
                                    src={`http://admin-laido.invade.vn/${staffData.staff?.avatar_url}`}
                                    alt={staffData.staff?.name}
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
                                    #{staffData.assignment?.index || "000"}
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
                                        <Typography variant="subtitle1" color="text.secondary" sx={{ mr: 2 }}>
                                            Số Đò:
                                        </Typography>
                                        <Typography variant="h6" sx={{ flex: 1, textAlign: 'right' }}>
                                            {staffData.staff?.code}
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
                                            {staffData.staff?.name}
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
                                            {staffData.staff?.group_name}
                                        </Typography>
                                    </Box>
                                </Stack>
                                
                                {/* Chỉ hiển thị form nhập mã khi có test=1 */}
                                {isTestMode && (
                                    <Box 
                                        component="form" 
                                        onSubmit={handleTicketCheckin}
                                        sx={{ 
                                            mt: 3,
                                            p: 2,
                                            bgcolor: 'white',
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                        }}
                                    >
                                        <Stack direction="row" spacing={1}>
                                            <input
                                                type="text"
                                                value={ticketCode}
                                                onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                                                placeholder="Nhập mã vé..."
                                                ref={ticketInputRef}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    borderRadius: '4px',
                                                    fontSize: '16px'
                                                }}
                                                disabled={isCheckingTicket}
                                            />
                                            <button
                                                type="submit"
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: '#22c55e',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    opacity: isCheckingTicket ? 0.7 : 1
                                                }}
                                                disabled={isCheckingTicket || !ticketCode}
                                            >
                                                =
                                            </button>
                                        </Stack>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>

                        {/* Right Column - Tickets List */}
                        <Grid item xs={12} md={8}>
                            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="h5" sx={{ mb: 3 }}>
                                    Tổng số vé đã quét trong ngày: {staffData.checked_tickets?.length}
                                </Typography>
                                
                                {/* Thêm Box có thể cuộn */}
                                <Box 
                                    sx={{ 
                                        flexGrow: 1,
                                        overflow: 'auto',
                                        maxHeight: 'calc(90vh - 200px)', // Chiều cao tối đa
                                        pr: 1 // Padding right để tránh thanh cuộn che content
                                    }}
                                >
                                    <Grid container spacing={2}>
                                        {staffData.checked_tickets?.map((ticket, index) => (
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
                                        {(!staffData.checked_tickets || staffData.checked_tickets.length === 0) && (
                                            <Grid item xs={12}>
                                                <Box 
                                                    sx={{ 
                                                        textAlign: 'center',
                                                        p: 3,
                                                        color: 'text.secondary'
                                                    }}
                                                >
                                                    <Typography variant="h6">
                                                        Chưa có vé nào được check
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
            </StyledDialog>
        );
    });

    return (
        <div className="sc-wrapper">
            <div className="sc-fixed-header">
                <h1 className="sc-title">
                    <div className="sc-controls">
                        <span className="sc-header-title">Hệ thống checkin tự động</span>
                        <div className="sc-position-selector">
                            <select 
                                value={selectedPosition}
                                onChange={(e) => setSelectedPosition(Number(e.target.value))}
                                className="sc-position-select"
                            >
                                <option value={0}>Lựa chọn vị trí</option>
                                {positions.map(pos => (
                                    <option key={pos.id} value={pos.id}>
                                        {pos.name}
                                    </option>
                                ))}
                            </select>
                            {new URLSearchParams(window.location.search).get('test') === '1' && (
                                <form 
                                    onSubmit={handleSubmit} 
                                    className={`sc-search-form ${
                                        new URLSearchParams(window.location.search).get('test') === '1' ? 'show' : ''
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
                            {selectedPosition !== 0 && (
                                <div className="sc-ticket-count">
                                    <span className="sc-ticket-label">SL vé:</span>
                                    <span className="sc-ticket-number">{checkedTicketsCount}</span>
                                </div>
                            )}
                            <button 
                                className={`sc-sound-toggle ${isMuted ? 'muted' : ''}`}
                                onClick={() => setIsMuted(!isMuted)}
                                title={isMuted ? 'Bật loa' : 'Tắt loa'}
                            >
                                <FontAwesomeIcon 
                                    icon={isMuted ? faVolumeMute : faVolumeUp} 
                                    className="fa-icon"
                                />
                            </button>
                        </div>
                    </div>
                </h1>
            </div>

            <div className="sc-container sc-two-columns">
                <div className="sc-section sc-type-1">
                    <h2>DANH SÁCH ĐÒ</h2>
                    <div className="sc-content">
                        {assignments.type_1.length === 0 ? (
                            <div className="sc-empty-state">
                                <FontAwesomeIcon icon={faUserClock} className="sc-empty-icon" />
                                <p>Không có Đò nào trong danh sách</p>
                            </div>
                        ) : (
                            assignments.type_1
                                .slice(0, maxWaitingItems)
                                .map((assignment) => (
                                    <div key={assignment.staff.id} className="sc-waiting-item">
                                        <div className="sc-waiting-number">{assignment.index}</div>
                                        <div className="sc-waiting-info">
                                            <div className="sc-waiting-header">
                                                <div className="sc-waiting-name">
                                                    {assignment.staff?.name}
                                                </div>
                                            </div>
                                            <div className="sc-waiting-details">
                                                <span className="sc-waiting-code">Số Đò: {assignment.staff?.code}</span>
                                                <div className="sc-waiting-group">
                                                    {assignment.staff?.group_name || 'Chưa phân nhóm'}
                                                </div>
                                                {/* <div className="sc-waiting-group">
                                                    {assignment.staff?.card_id || ''}
                                                </div> */}
                                            </div>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>

                <div className="sc-section sc-type-2">
                    <h2>DANH SÁCH XUỒNG</h2>
                    <div className="sc-content">
                        {assignments.type_2.length === 0 ? (
                            <div className="sc-empty-state">
                                <FontAwesomeIcon icon={faUserClock} className="sc-empty-icon" />
                                <p>Không có Xuồng nào trong danh sách</p>
                            </div>
                        ) : (
                            assignments.type_2
                                .slice(0, maxWaitingItems)
                                .map((assignment) => (
                                    <div key={assignment.staff.id} className="sc-waiting-item">
                                        <div className="sc-waiting-number">{assignment.index}</div>
                                        <div className="sc-waiting-info">
                                            <div className="sc-waiting-header">
                                                <div className="sc-waiting-name">
                                                    {assignment.staff?.name}
                                                </div>
                                            </div>
                                            <div className="sc-waiting-details">
                                                <span className="sc-waiting-code">Số Xuồng: {assignment.staff?.code}</span>
                                                <div className="sc-waiting-group">
                                                    {assignment.staff?.group_name || 'Chưa phân nhóm'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
                <h2>Chọn vị trí Làm Việc</h2>
                <p>Vui lòng chọn một vị trí để bắt đầu quản lý hàng đợi của bạn</p>
                <select 
                    value={selectedPosition}
                    onChange={(e) => {
                        setSelectedPosition(Number(e.target.value));
                        setShowModal(false);
                    }}
                    className="sc-position-select"
                >
                    <option value={0}>Chọn vị trí Làm Việc</option>
                    {positions.map(pos => (
                        <option key={pos.id} value={pos.id}>
                            {pos.name}
                        </option>
                    ))}
                </select>
            </Modal>

            <CheckinModal 
                isOpen={showCheckinModal} 
                onClose={() => setShowCheckinModal(false)}
                staffData={checkedInStaff}
                setCheckedInStaff={setCheckedInStaff}
                ticketMessage={ticketMessage}
                setTicketMessage={setTicketMessage}
            />

            <div className="sc-footer">
             Powered by <a href="https://thinksoft.com.vn" target="_blank" rel="noopener noreferrer">thinksoft.com.vn</a>
            </div>
        </div>
    );
};

export default StaffCheckin; 