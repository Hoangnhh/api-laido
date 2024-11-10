import React, { useState, useEffect } from 'react';
import AdminLayout from './Layout/AdminLayout';
import axios from 'axios';
import '../../../css/AddShiftGate.css';

const AddShiftGate = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [staffs, setStaffs] = useState([]);
    const [gates, setGates] = useState([]);
    const [staffGroups, setStaffGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedStaffs, setSelectedStaffs] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [staffsResponse, gatesResponse, groupsResponse] = await Promise.all([
                axios.get('/api/admin/staffs'),
                axios.get('/api/admin/gates'),
                axios.get('/api/admin/staff-groups')
            ]);

            setStaffs(staffsResponse.data.data || []);
            setGates(gatesResponse.data.data || []);
            setStaffGroups(groupsResponse.data.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
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
                            <input
                                type="text"
                                placeholder="Tìm kiếm nhân viên"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <select 
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                className="group-select"
                            >
                                <option value="">Tất cả nhóm</option>
                                {staffGroups.map(group => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                        </div>

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
                    </div>

                    <div className="assignment-section">
                        <div className="selected-staff">
                            <h3>Đã chọn {selectedStaffs.length} nhân viên</h3>
                            <select className="position-select">
                                <option value="">Chọn vị trí</option>
                                {gates.map(gate => (
                                    <option key={gate.id} value={gate.id}>
                                        {gate.name}
                                    </option>
                                ))}
                            </select>
                            <select className="shift-select">
                                <option value="">Ca làm việc</option>
                                {/* Thêm options cho ca làm việc */}
                            </select>
                            <input 
                                type="date" 
                                className="date-input"
                                defaultValue="2024-11-10"
                            />
                            <textarea 
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