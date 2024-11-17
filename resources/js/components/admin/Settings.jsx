import React, { useState, useEffect } from 'react';
import AdminLayout from './Layout/AdminLayout';
import Loading from '../common/Loading';
import axios from 'axios';
import { 
    Alert, 
    Snackbar, 
    Box, 
    Typography, 
    Button 
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';

const Settings = () => {
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tempConfigs, setTempConfigs] = useState({});
    const [alert, setAlert] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    useEffect(() => {
        loadConfigs();
    }, []);

    const showAlert = (message, severity = 'success') => {
        setAlert({
            open: true,
            message,
            severity
        });
    };

    const loadConfigs = async () => {
        try {
            const response = await axios.get('/api/admin/system-configs');
            setConfigs(response.data);
            setTempConfigs(JSON.parse(JSON.stringify(response.data)));
            setLoading(false);
        } catch (error) {
            console.error('Lỗi khi tải cấu hình:', error);
            showAlert('Không thể tải cấu hình hệ thống', 'error');
        }
    };

    const handleConfigChange = (key, value) => {
        setTempConfigs(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                value: value
            }
        }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const updates = Object.entries(tempConfigs).map(([key, config]) => ({
                key,
                value: config.value
            }));

            await Promise.all(
                updates.map(update =>
                    axios.post('/api/admin/system-configs', update)
                )
            );

            setConfigs(tempConfigs);
            showAlert('Lưu cấu hình thành công');
        } catch (error) {
            console.error('Lỗi khi lưu cấu hình:', error);
            showAlert('Không thể lưu cấu hình', 'error');
        } finally {
            setSaving(false);
        }
    };

    const renderConfigInput = (key, config) => {
        if (key.startsWith('ENABLE_')) {
            return (
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded"
                        checked={config.value === '1'}
                        onChange={(e) => handleConfigChange(key, e.target.checked ? '1' : '0')}
                    />
                    <label className="ml-2">
                        {config.value === '1' ? 'Bật' : 'Tắt'}
                    </label>
                </div>
            );
        }

        return (
            <input
                type="text"
                className="border rounded-md px-3 py-2 w-full"
                value={config.value || ''}
                onChange={(e) => handleConfigChange(key, e.target.value)}
            />
        );
    };

    if (loading) {
        return <Loading />;
    }

    const hasChanges = JSON.stringify(configs) !== JSON.stringify(tempConfigs);

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
                        Cài đặt hệ thống
                    </Typography>

                    <Button
                        variant="contained"
                        startIcon={<FontAwesomeIcon icon={faSave} />}
                        onClick={handleSaveAll}
                        disabled={!hasChanges || saving}
                        sx={{ 
                            bgcolor: hasChanges ? '#2c3e50' : '#94a3b8', 
                            '&:hover': {
                                bgcolor: hasChanges ? '#1a252f' : '#94a3b8'
                            }
                        }}
                    >
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                </Box>

                {loading ? (
                    <Loading />
                ) : (
                    <Box sx={{ 
                        bgcolor: 'white', 
                        borderRadius: 1,
                        boxShadow: 1,
                        p: 3
                    }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {Object.entries(tempConfigs).map(([key, config]) => (
                                <Box key={key} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography sx={{ fontWeight: 500 }}>
                                        {config.description || key}
                                    </Typography>
                                    {key.startsWith('ENABLE_') ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-blue-600 rounded"
                                                checked={config.value === '1'}
                                                onChange={(e) => handleConfigChange(key, e.target.checked ? '1' : '0')}
                                            />
                                            <Typography>
                                                {config.value === '1' ? 'Bật' : 'Tắt'}
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <input
                                            type="text"
                                            className="border rounded-md px-3 py-2 w-full"
                                            value={config.value || ''}
                                            onChange={(e) => handleConfigChange(key, e.target.value)}
                                        />
                                    )}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

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

export default Settings; 