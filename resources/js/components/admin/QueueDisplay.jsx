import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeMute, faVolumeUp, faUserClock, faUserCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import '../../../css/QueueDisplay.css';

const QueueDisplay = () => {
    const [selectedPosition, setSelectedPosition] = useState(0);
    const [cardId, setCardId] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [assignments, setAssignments] = useState([]);
    const [checkedInAssignments, setCheckedInAssignments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [maxWaitingItems, setMaxWaitingItems] = useState(5);
    const [checkedInStaff, setCheckedInStaff] = useState(null);
    const [isMuted, setIsMuted] = useState(() => {
        const savedMute = localStorage.getItem('queueDisplay_isMuted');
        return savedMute ? JSON.parse(savedMute) : false;
    });
    const [showModal, setShowModal] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [lastAnnounced, setLastAnnounced] = useState(null);
    const [cardBuffer, setCardBuffer] = useState('');
    const [lastKeyTime, setLastKeyTime] = useState(Date.now());
    const SCAN_TIMEOUT = 100; // 100ms timeout giữa các ký tự
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastSubmitTime, setLastSubmitTime] = useState(0);
    const SUBMIT_DELAY = 500; // 500ms delay giữa các lần submit
    const [checkedTicketsCount, setCheckedTicketsCount] = useState(0);

    const inputRef = useRef(null);
    const isSubmitting = useRef(false);

    useEffect(() => {
        fetchAssignments();
        fetchCheckedTicketsCount();
        
        const intervalId = setInterval(() => {
            fetchAssignments();
            fetchCheckedTicketsCount();
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
    }, []);

    const fetchAssignments = async () => {
        if(selectedPosition === 0) return;
        try {
            const response = await axios.get(`/api/admin/get-assignments-by-gate?gate_id=${selectedPosition}`);
            setAssignments(response.data.assignments.waiting);
            setCheckedInAssignments(response.data.assignments.checkin);

            const firstWaitingStaff = response.data.assignments.waiting[0];
            if (firstWaitingStaff) {
                await announceStaff(firstWaitingStaff.staff.name,firstWaitingStaff.index);
            }

        } catch (err) {
            console.error('Lỗi khi lấy danh sách phân ca:', err);
        }
    };

    const handleCheckin = async (code) => {
        if (isProcessing || isSubmitting.current) return;
        
        try {
            isSubmitting.current = true;
            setIsProcessing(true);
            setError('');
            setCheckedInStaff(null);
            
            const response = await axios.post('/api/admin/staff-checkin', {
                card_id: code,
                gate_id: selectedPosition,
            });

            if (response.data.status === 'success') {
                setCheckedInStaff({
                    ...response.data.data,
                    success: true
                });
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

    const renderWaitingList = () => {
        if (!assignments || assignments.length === 0) {
            return (
                <div className="qd-empty-state">
                    <FontAwesomeIcon icon={faUserClock} className="qd-empty-icon" />
                    <p>Không có nhân viên nào trong danh sách chờ</p>
                </div>
            );
        }

        return assignments
            .slice(0, maxWaitingItems)
            .map((assignment) => (
                <div key={assignment.staff.id} className="qd-waiting-item">
                    <div className="qd-waiting-number">{assignment.index}</div>
                    <div className="qd-waiting-info">
                        <div className="qd-waiting-header">
                            <div className="qd-waiting-name">
                                {assignment.staff?.name}
                            </div>
                            <div className="qd-waiting-group">
                                {assignment.staff?.group_name || 'Chưa phân nhóm'}
                            </div>
                        </div>
                        <div className="qd-waiting-details">
                            <span className="qd-waiting-code">Mã NV: {assignment.staff?.code}</span>
                            {/* <span className="qd-waiting-card">CCCD: {assignment.staff?.card_id || 'N/A'}</span> */}
                        </div>
                    </div>
                </div>
            ));
    };

    const renderCheckedInList = () => {
        if (!checkedInAssignments || checkedInAssignments.length === 0) {
            return (
                <div className="qd-empty-state">
                    <FontAwesomeIcon icon={faUserCheck} className="qd-empty-icon" />
                    <p>Chưa có nhân viên nào checkin</p>
                </div>
            );
        }

        return checkedInAssignments
            .slice(0, maxWaitingItems)
            .map((assignment) => (
                <div key={assignment.staff.id} className="qd-checkedin-item">
                    <div className="qd-checkedin-number">{assignment.index}</div>
                    <div className="qd-checkedin-info">
                        <div className="qd-checkedin-header">
                            <div className="qd-checkedin-name">
                                {assignment.staff?.name}
                            </div>
                            <div className="qd-checkedin-group">
                                {assignment.staff?.group_name || 'Chưa phân nhóm'}
                            </div>
                        </div>
                        <div className="qd-checkedin-details">
                            <span className="qd-checkedin-code">Mã NV: {assignment.staff?.code}</span>
                            <span className="qd-checkedin-card">Thẻ: {assignment.staff?.card_id || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            ));
    };

    const announceStaff = async (staffName, staffIndex) => {
        if (isMuted || isPlaying) return;
        
        const currentAnnouncement = `${staffIndex}-${staffName}`;
        if (currentAnnouncement === lastAnnounced) return;
        
        try {
            setIsPlaying(true);
            setLastAnnounced(currentAnnouncement);
            
            const response = await axios.post(
                'https://texttospeech.googleapis.com/v1/text:synthesize',
                {
                    input: {
                        text: `Mời lái đò số thứ tự ${staffIndex} ,${staffName}, tới cửa số ${selectedPosition} để checkin`
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
                setIsPlaying(false);
            });
            
            await audio.play();

        } catch (error) {
            console.error('Lỗi khi đọc tên nhân viên:', error);
            setIsPlaying(false);
        }
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

    return (
        <div className="qd-wrapper">
            <h1 className="qd-title">
                <div className="qd-controls">
                    <span className="qd-header-title">Hệ thống checkin tự động</span>
                    <div className="qd-position-selector">
                        <span></span>
                        <select 
                            value={selectedPosition}
                            onChange={(e) => setSelectedPosition(Number(e.target.value))}
                            className="qd-position-select"
                        >
                            <option value={0}>Lựa chọn vị trí</option>
                            {positions.map(pos => (
                                <option key={pos.id} value={pos.id}>
                                    {pos.name}
                                </option>
                            ))}
                        </select>
                        {selectedPosition !== 0 && (
                            <div className="qd-ticket-count">
                                <span className="qd-ticket-label">SL vé:</span>
                                <span className="qd-ticket-number">{checkedTicketsCount}</span>
                            </div>
                        )}
                        <button 
                            className={`qd-sound-toggle ${isMuted ? 'muted' : ''}`}
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
            <div className="qd-container">
                <div className="qd-section qd-search">
                    <h2>CHECKIN NHÂN VIÊN</h2>
                    <div className="qd-content">
                        <form onSubmit={handleSubmit} className="qd-search-form">
                            <input
                                type="text"
                                value={cardId}
                                onChange={(e) => setCardId(e.target.value.toUpperCase())}
                                placeholder="Quẹt thẻ hoặc nhập mã thẻ..."
                                className="qd-search-input"
                                ref={inputRef}
                                autoComplete="off"
                                disabled={isProcessing}
                            />
                            <button 
                                type="submit" 
                                className="qd-search-button"
                                disabled={isProcessing || !cardId}
                            >
                                <FontAwesomeIcon icon={faUserCheck} className="fa-icon" />
                            </button>
                        </form>
                        
                        {isProcessing && (
                            <div className="qd-processing">
                                <div className="qd-spinner"></div>
                                <p>Đang xử lý checkin...</p>
                            </div>
                        )}

                        {checkedInStaff && (
                            <div className="qd-staff-info">
                                <div className="qd-staff-avatar">
                                    <img src={checkedInStaff.staff?.avatar_url || "/images/default-avatar.png"} alt="" />
                                </div>
                                <div className="qd-staff-number">
                                    #{checkedInStaff.assignment?.index || "000"}
                                </div>
                                <div className="qd-staff-details">
                                    <div className="qd-info-row">
                                        <div className="qd-info-label">Mã NV:</div>
                                        <div className="qd-info-value">
                                            {checkedInStaff.staff?.code}
                                        </div>
                                    </div>
                                    <div className="qd-info-row">
                                        <div className="qd-info-label">Họ tên:</div>
                                        <div className="qd-info-value">
                                            {checkedInStaff.staff?.name}
                                        </div>
                                    </div>
                                    <div className="qd-info-row">
                                        <div className="qd-info-label">Ca làm việc:</div>
                                        <div className={`qd-info-value ${checkedInStaff.error ? 'error' : ''}`}>
                                            {checkedInStaff.staff?.group_name || 'Chưa phân nhóm'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {checkedInStaff?.success && (
                            <div className="qd-success">
                                {successMessage}
                            </div>
                        )}

                        {error && <div className="qd-error">{error}</div>}
                    </div>
                </div>
                
                <div className="qd-section qd-waiting">
                    <h2>Danh sách nhân viên chờ</h2>
                    <div className="qd-content">
                        {renderWaitingList()}
                    </div>
                </div>

                <div className="qd-section qd-serving">
                    <h2>Nhân viên đã checkin</h2>
                    <div className="qd-content">
                        {renderCheckedInList()}
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
                    className="qd-position-select"
                >
                    <option value={0}>Chọn vị trí Làm Việc</option>
                    {positions.map(pos => (
                        <option key={pos.id} value={pos.id}>
                            {pos.name}
                        </option>
                    ))}
                </select>
            </Modal>
            <div className="qd-footer">
             Powered by <a href="https://thinksoft.com.vn" target="_blank" rel="noopener noreferrer">thinksoft.com.vn</a>
            </div>
        </div>
    );
};

export default QueueDisplay; 