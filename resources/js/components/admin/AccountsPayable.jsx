import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faEye } from '@fortawesome/free-solid-svg-icons';
import '../../../css/AccountsPayable.css';
import AdminLayout from './Layout/AdminLayout';

const AccountsPayable = () => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [keyword, setKeyword] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statistics, setStatistics] = useState({
        total_paid: 0,
        total_unpaid: 0,
        total_unpaid_num: 0
    });

    useEffect(() => {
        const fetchStaffPayments = async () => {
            setLoading(true);
            try {
                const response = await axios.get('/api/admin/get-staff-payments', {
                    params: { search: keyword }
                });
                setData(response.data.data);
            } catch (error) {
                console.error('Error fetching staff payments:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStaffPayments();
    }, [keyword]);

    useEffect(() => {
        const fetchStatistics = async () => {
            try {
                const response = await axios.get('/api/admin/get-payment-summary');
                setStatistics(response.data);
            } catch (error) {
                console.error('Error fetching statistics:', error);
            }
        };

        fetchStatistics();
    }, []);

    const handleChangePage = (newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSearch = () => {
        setPage(0);
    };

    const getStatusColor = (status) => {
        return status === 'ACTIVE' ? 'green' : 'gray';
    };

    return (
        <AdminLayout>
            <div className="ap-container">
                <div className="ap-header">
                    <h1 className="ap-title">Quản lý công nợ phải trả</h1>
                    
                    <div className="ap-header-filter">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="ap-filter-field"
                        >
                            <option value="all">Tất cả</option>
                            <option value="pending">Chờ thanh toán</option>
                            <option value="paid">Đã thanh toán</option>
                        </select>
                        <input
                            type="text"
                            className="ap-filter-field"
                            placeholder="Tên khách hàng, số điện thoại..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                        <button onClick={handleSearch} className="ap-button">
                            <FontAwesomeIcon icon={faSearch} /> Tìm kiếm
                        </button>
                    </div>
                </div>

                <div className="ap-statistics-cards">
                    <div className="ap-statistics-card ap-statistics-card--debt">
                        <div className="ap-statistics-card__content">
                            <span className="ap-statistics-card__label">Tổng công nợ</span>
                            <span className="ap-statistics-card__value">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(statistics.total_unpaid)}
                            </span>
                        </div>
                    </div>

                    <div className="ap-statistics-card ap-statistics-card--paid">
                        <div className="ap-statistics-card__content">
                            <span className="ap-statistics-card__label">Đã thanh toán</span>
                            <span className="ap-statistics-card__value">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(statistics.total_paid)}
                            </span>
                        </div>
                    </div>

                    <div className="ap-statistics-card ap-statistics-card--pending">
                        <div className="ap-statistics-card__content">
                            <span className="ap-statistics-card__label">Chờ thanh toán</span>
                            <span className="ap-statistics-card__value">
                                {statistics.total_unpaid_num}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="ap-data-table-container">
                    <table className="ap-data-table">
                        <thead className="ap-data-table__header">
                            <tr>
                                <th>Mã nhân viên</th>
                                <th>Tên</th>
                                <th>Số điện thoại</th>
                                <th align="right">Tổng hoa hồng</th>
                                <th align="right">Đã thanh toán</th>
                                <th>Trạng thái</th>
                                <th align="center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item) => (
                                <tr key={item.id}>
                                    <td>{item.code}</td>
                                    <td>{item.name}</td>
                                    <td>{item.phone}</td>
                                    <td align="right">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_commission)}
                                    </td>
                                    <td align="right">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_paid)}
                                    </td>
                                    <td>
                                        <span style={{ color: getStatusColor(item.status) }}>{item.status}</span>
                                    </td>
                                    <td align="center">
                                        <button title="Xem chi tiết">
                                            <FontAwesomeIcon icon={faEye} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="ap-data-table__footer">
                    <span>Số dòng mỗi trang:</span>
                    <select value={rowsPerPage} onChange={handleChangeRowsPerPage}>
                        {[5, 10, 25, 50].map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                    <span>
                        {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, data.length)} trên {data.length}
                    </span>
                    <button onClick={() => handleChangePage(page - 1)} disabled={page === 0}>
                        Trang trước
                    </button>
                    <button onClick={() => handleChangePage(page + 1)} disabled={(page + 1) * rowsPerPage >= data.length}>
                        Trang sau
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AccountsPayable; 