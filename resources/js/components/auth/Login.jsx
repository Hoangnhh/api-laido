import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Container,
    Paper,
    InputAdornment,
    IconButton,
    Avatar,
    CircularProgress
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUser, 
    faLock, 
    faEye, 
    faEyeSlash, 
    faUserShield 
} from '@fortawesome/free-solid-svg-icons';
import '../../../css/login-bg.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [licenseInfo, setLicenseInfo] = useState(null);

    useEffect(() => {
        // Tạo animation cho background
        const circles = document.querySelectorAll('.circles li');
        circles.forEach((circle, index) => {
            const randomLeft = Math.floor(Math.random() * 90);
            const randomDelay = Math.random() * -20;
            const randomDuration = Math.random() * 10 + 20;
            
            circle.style.left = `${randomLeft}%`;
            circle.style.animationDelay = `${randomDelay}s`;
            circle.style.animationDuration = `${randomDuration}s`;
        });

        // Kiểm tra license khi component mount
        checkLicense();
    }, []);

    const checkLicense = async () => {
        try {
            const response = await fetch('/api/admin/check-license');
            const data = await response.json();
            setLicenseInfo(data);
        } catch (error) {
            console.error('Error checking license:', error);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        try {
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('XSRF-TOKEN='))
                ?.split('=')[1];

            if (!csrfToken) {
                throw new Error('CSRF token không tìm thấy');
            }

            const response = await fetch('/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(csrfToken),
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = data.redirect;
            } else {
                setError(typeof data.message === 'string' ? data.message : 'Có lỗi xảy ra khi đăng nhập');
            }
        } catch (error) {
            setError('Có lỗi xảy ra khi đăng nhập');
            console.error('Login error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="area">
                <ul className="circles">
                    {[...Array(10)].map((_, index) => (
                        <li key={index}></li>
                    ))}
                </ul>
            </div>
            <Container 
                component="main" 
                maxWidth="xs"
                sx={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Typography 
                    component="h1" 
                    variant="h3" 
                    sx={{ 
                        mb: 4,
                        fontWeight: 'bold',
                        color: 'white',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                    }}
                >
                    THink System
                </Typography>
                
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%'
                    }}
                >
                    <Paper 
                        elevation={6} 
                        sx={{ 
                            padding: 4, 
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 3
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                mb: 3
                            }}
                        >
                            <Avatar 
                                sx={{ 
                                    m: 1, 
                                    bgcolor: 'primary.main',
                                    width: 56,
                                    height: 56
                                }}
                            >
                                <FontAwesomeIcon icon={faUserShield} size="lg" />
                            </Avatar>
                            <Typography 
                                component="h2" 
                                variant="h5" 
                                sx={{ mt: 1 }}
                            >
                                Đăng nhập Admin
                            </Typography>
                        </Box>
                        
                        <Box component="form" onSubmit={handleSubmit}>
                            {error && (
                                <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
                                    {error}
                                </Typography>
                            )}
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="username"
                                label="Tên đăng nhập"
                                name="username"
                                autoComplete="username"
                                autoFocus
                                value={formData.username}
                                onChange={handleChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <FontAwesomeIcon icon={faUser} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    }
                                }}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Mật khẩu"
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                autoComplete="current-password"
                                value={formData.password}
                                onChange={handleChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <FontAwesomeIcon icon={faLock} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                            >
                                                {showPassword ? <FontAwesomeIcon icon={faEyeSlash} /> : <FontAwesomeIcon icon={faEye} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    }
                                }}
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                disabled={isLoading}
                                sx={{ 
                                    mt: 3, 
                                    mb: 2,
                                    py: 1.5,
                                    fontSize: '1.1rem',
                                    borderRadius: 2,
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.12)',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 6px 8px rgba(0,0,0,0.2)',
                                    },
                                    transition: 'all 0.2s ease-in-out'
                                }}
                            >
                                {isLoading ? (
                                    <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                                ) : null}
                                {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                            </Button>
                            <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                align="center"
                                sx={{ 
                                    mt: 1,
                                    fontStyle: 'italic',
                                    '& a': {
                                        color: 'inherit',
                                        textDecoration: 'none',
                                        '&:hover': {
                                            textDecoration: 'underline'
                                        }
                                    }
                                }}
                            >
                                <a 
                                    href="https://thinksoft.com.vn" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                >
                                    Powered by Thinksoft.com.vn
                                </a>
                            </Typography>
                        </Box>
                    </Paper>
                </Box>

                {licenseInfo && (
                    <Box
                        sx={{
                            position: 'fixed',
                            bottom: 20,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: 2,
                            backdropFilter: 'blur(5px)',
                            zIndex: 1000
                        }}
                    >
                        
                    { licenseInfo.days_remaining <= 30 ? (
                        <Typography variant="body2">
                            {licenseInfo.valid ? (
                                <>
                                        <>
                                            License sử dụng phần mềm còn hiệu lực: {licenseInfo.days_remaining} ngày
                                            <span style={{ color: '#ff9800', marginLeft: 8 }}>
                                                (Sắp hết hạn)
                                            </span>
                                        </>
                                </>
                            ) : (
                                <span style={{ color: '#f44336' }}>
                                    {licenseInfo.message}
                                </span>
                            )}
                        </Typography>
                        ) : null
                    }
                    </Box>
                )}
            </Container>
        </>
    );
};

export default Login;