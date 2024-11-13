import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import '../../../css/Loading.css';

const Loading = ({ message = 'Đang tải dữ liệu...' }) => {
    return (
        <div className="loading-overlay">
            <div className="loading-content">
                <FontAwesomeIcon icon={faSpinner} spin className="loading-icon" />
                <span className="loading-message">{message}</span>
            </div>
        </div>
    );
};

export default Loading; 