import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const Loading = ({ message = 'Đang xử lý...' }) => {
    return (
        <div className="loading-overlay">
            <div className="loading-content">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                <p>{message}</p>
            </div>
        </div>
    );
};

export default Loading; 