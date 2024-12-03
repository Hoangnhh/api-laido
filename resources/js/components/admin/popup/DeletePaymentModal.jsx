import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const DeletePaymentModal = React.memo(({ 
    show, 
    payment, 
    onHide, 
    onDelete 
}) => {
    const [reason, setReason] = useState('');

    const handleDelete = () => {
        if (!reason.trim()) {
            alert('Vui lòng nhập lý do xóa.');
            return;
        }
        onDelete(reason);
        setReason('');
    };

    const handleClose = () => {
        setReason('');
        onHide();
    };

    if (!payment) return null;

    return (
        <Modal 
            show={show} 
            onHide={handleClose}
            size="md"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title>Xóa thanh toán #{payment.transaction_code}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Bạn có chắc chắn muốn xóa thanh toán này không?</p>
                <Form.Group>
                    <Form.Label>Lý do xóa</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        maxLength={200}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Nhập lý do xóa (tối đa 200 ký tự)"
                    />
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Hủy
                </Button>
                <Button variant="danger" onClick={handleDelete}>
                    Xóa
                </Button>
            </Modal.Footer>
        </Modal>
    );
});

export default DeletePaymentModal; 