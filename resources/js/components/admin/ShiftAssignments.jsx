import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faDesktop, 
    faUsers,
    faSpinner 
} from '@fortawesome/free-solid-svg-icons';
import AdminLayout from './Layout/AdminLayout';
import axios from 'axios';
import '../../../css/ShiftAssignments.css';

const ShiftAssignments = () => {
    const [gates, setGates] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await axios.get('/api/admin/shift-assignments-data');
            setGates(response.data.gates);
            setShifts(response.data.shifts);
            setLoading(false);
        } catch (err) {
            setError('Có lỗi xảy ra khi tải dữ liệu');
            setLoading(false);
            console.error('Error fetching data:', err);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="loading-container">
                    <FontAwesomeIcon icon={faSpinner} spin />
                    <span>Đang tải dữ liệu...</span>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="error-container">
                    <span>{error}</span>
                    <button onClick={fetchData}>Thử lại</button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="shift-assignments">
                <div className="shift-header">
                    <h1>Phân ca làm việc</h1>
                    <div className="shift-controls">
                        <a 
                            href="/admin/add-shift-gate"
                            className="shift-button"
                            style={{ textDecoration: 'none' }}
                        >
                            Phân ca làm việc
                        </a>
                    </div>
                </div>
                
                <table className="shift-table">
                    <thead>
                        <tr>
                            <th>Vị trí</th>
                            {shifts.map((shift) => (
                                <th key={shift.id}>
                                    <div className="shift-header-cell">
                                        <span>{shift.name}</span>
                                        <div className="shift-count">
                                            <FontAwesomeIcon icon={faUsers} />
                                            <span>{shift.staffs_count}</span>
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {gates.map((gate) => (
                            <tr key={gate.id}>
                                <td>
                                    <div className="gate-cell">
                                        <FontAwesomeIcon icon={faDesktop} className="gate-icon" />
                                        <span>{gate.name}</span>
                                    </div>
                                </td>
                                {shifts.map((shift) => (
                                    <td key={`${gate.id}-${shift.id}`}>
                                        <div 
                                            className="shift-cell"
                                            onClick={() => {
                                                console.log(`Clicked: ${gate.name} - ${shift.name}`);
                                            }}
                                        >
                                            {/* Nội dung của ô */}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
};

export default ShiftAssignments;