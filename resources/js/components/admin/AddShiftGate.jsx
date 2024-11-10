import React, { useState, useEffect } from 'react';
import AdminLayout from './Layout/AdminLayout';
import axios from 'axios';
import '../../../css/AddShiftGate.css';
import { 
    TextField, 
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel,
    TextareaAutosize 
} from '@mui/material';

const AddShiftGate = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [staffs, setStaffs] = useState([]);
    const [gates, setGates] = useState([]);
    const [staffGroups, setStaffGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedStaffs, setSelectedStaffs] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [assignmentType, setAssignmentType] = useState('');
    const [selectedGates, setSelectedGates] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const response = await axios.get('/api/admin/shift-assignments-data');
            const { gates, shifts } = response.data;
            
            setGates(gates || []);
            setStaffGroups(shifts || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const fetchStaffsByGroup = async (groupId) => {
        setStaffLoading(true);
        try {
            const response = await axios.get(`/api/admin/staffs-by-group/${groupId}`);
            setStaffs(response.data.data || []);
        } catch (error) {
            console.error('Error fetching staffs:', error);
        } finally {
            setStaffLoading(false);
        }
    };

    const handleGroupChange = (e) => {
        const groupId = e.target.value;
        setSelectedGroup(groupId);
        if (groupId) {
            fetchStaffsByGroup(groupId);
        } else {
            setStaffs([]);
        }
    };

    const filteredStaffs = staffs.filter(staff => {
        const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            staff.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGroup = !selectedGroup || staff.group_id === parseInt(selectedGroup);
        return matchesSearch && matchesGroup;
    });

    const handleStaffSelect = (staffId) => {
        setSelectedStaffs(prev => {
            if (prev.includes(staffId)) {
                return prev.filter(id => id !== staffId);
            }
            return [...prev, staffId];
        });
    };

    const handleSelectAll = () => {
        if (selectedStaffs.length === filteredStaffs.length) {
            setSelectedStaffs([]);
        } else {
            const allStaffIds = filteredStaffs.map(staff => staff.id);
            setSelectedStaffs(allStaffIds);
        }
    };

    const handleAssignmentTypeChange = (e) => {
        const type = e.target.value;
        setAssignmentType(type);
        if (type === 'all') {
            setSelectedGates(gates.map(gate => gate.id));
        } else {
            setSelectedGates([]);
        }
    };

    const handleGateChange = (event) => {
        const {
            target: { value },
        } = event;
        setSelectedGates(typeof value === 'string' ? value.split(',') : value);
    };

    if (loading) {
        return (
            <AdminLayout>
                <div>Đang tải...</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="add-shift-container">
                <div className="shift-header">
                    <h1>Phân ca làm việc</h1>
                </div>

                <div className="shift-content">
                    <div className="staff-selection">
                        <div className="search-section">
                            <FormControl variant="outlined" size="small" className="group-select">
                                <InputLabel>Nhóm nhân viên</InputLabel>
                                <Select
                                    value={selectedGroup}
                                    onChange={handleGroupChange}
                                    label="Nhóm nhân viên"
                                >
                                    {staffGroups.map(group => (
                                        <MenuItem key={group.id} value={group.id}>
                                            {group.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            
                            <TextField
                                size="small"
                                variant="outlined"
                                placeholder="Tìm kiếm nhân viên"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />

                            {filteredStaffs.length > 0 && (
                                <button 
                                    className={`select-all-btn ${selectedStaffs.length === filteredStaffs.length ? 'active' : ''}`}
                                    onClick={handleSelectAll}
                                >
                                    {selectedStaffs.length === filteredStaffs.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                </button>
                            )}
                        </div>

                        <div className="staff-list-container">
                            {staffLoading ? (
                                <div className="staff-loading">
                                    <div className="loading-spinner"></div>
                                    <span>Đang tải danh sách nhân viên...</span>
                                </div>
                            ) : (
                                <div className="staff-grid">
                                    {filteredStaffs.map((staff) => (
                                        <div key={staff.id} className="staff-card">
                                            <input 
                                                type="checkbox" 
                                                id={`staff-${staff.id}`}
                                                checked={selectedStaffs.includes(staff.id)}
                                                onChange={() => handleStaffSelect(staff.id)}
                                            />
                                            <label htmlFor={`staff-${staff.id}`}>
                                                <div className="staff-info">
                                                    <span className="staff-name">{staff.name}</span>
                                                    <span className="staff-code">{staff.code}</span>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="assignment-section">
                        <div className="selected-staff">
                            <h3>Đã chọn {selectedStaffs.length} nhân viên</h3>
                            
                            <FormControl fullWidth size="small">
                                <InputLabel>Cách phân ca</InputLabel>
                                <Select
                                    value={assignmentType}
                                    onChange={handleAssignmentTypeChange}
                                    label="Cách phân ca"
                                >
                                    <MenuItem value="">Chọn cách phân ca</MenuItem>
                                    <MenuItem value="all">Chia đều cho tất cả các cổng</MenuItem>
                                    <MenuItem value="specific">Chọn cổng phân ca</MenuItem>
                                </Select>
                            </FormControl>

                            {assignmentType === 'specific' && (
                                <FormControl fullWidth size="small">
                                    <InputLabel>Cổng phân ca</InputLabel>
                                    <Select
                                        multiple
                                        value={selectedGates}
                                        onChange={handleGateChange}
                                        label="Cổng phân ca"
                                        renderValue={(selected) => {
                                            const selectedNames = selected.map(id => 
                                                gates.find(gate => gate.id === id)?.name
                                            );
                                            return selectedNames.join(', ');
                                        }}
                                    >
                                        {gates.map(gate => (
                                            <MenuItem key={gate.id} value={gate.id}>
                                                {gate.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}

                            <FormControl fullWidth size="small">
                                <InputLabel>Ca làm việc</InputLabel>
                                <Select
                                    label="Ca làm việc"
                                    defaultValue=""
                                >
                                    <MenuItem value="">Chọn ca làm việc</MenuItem>
                                    {/* Thêm options cho ca làm việc */}
                                </Select>
                            </FormControl>

                            <TextField
                                size="small"
                                variant="outlined"
                                type="date"
                                className="date-input"
                                defaultValue="2024-11-10"
                            />

                            <TextareaAutosize
                                className="note-input"
                                placeholder="Thêm ca làm việc..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AddShiftGate;