import React, { useState } from 'react';
import AdminLayout from './Layout/AdminLayout';
import { Card, Form, Button, Alert, Row, Col, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../css/Report.css';

const ChangePassword = () => {
    const [formData, setFormData] = useState({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
    });

    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState({
        current_password: false,
        new_password: false,
        new_password_confirmation: false
    });

    const togglePasswordVisibility = (field) => {
        setShowPassword({
            ...showPassword,
            [field]: !showPassword[field]
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        // Xóa lỗi khi user nhập lại
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: null
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setMessage({ type: '', text: '' });

        try {
            const response = await axios.post('/admin/change-password', formData);

            if (response.data.status === 'success') {
                setMessage({
                    type: 'success',
                    text: response.data.message
                });
                
                // Reset form
                setFormData({
                    current_password: '',
                    new_password: '',
                    new_password_confirmation: ''
                });

                // Redirect sau 2 giây
                setTimeout(() => {
                    window.location.href = response.data.redirect;
                }, 2000);
            }
        } catch (error) {
            if (error.response) {
                if (error.response.status === 422) {
                    // Validation errors
                    const validationErrors = error.response.data.errors || {};
                    setErrors(validationErrors);
                    setMessage({
                        type: 'danger',
                        text: error.response.data.message || 'Vui lòng kiểm tra lại thông tin'
                    });
                } else {
                    setMessage({
                        type: 'danger',
                        text: error.response.data.message || 'Có lỗi xảy ra khi đổi mật khẩu'
                    });
                }
            } else {
                setMessage({
                    type: 'danger',
                    text: 'Có lỗi xảy ra. Vui lòng thử lại sau.'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="rp-container">
                <Card>
                    <Card.Header>
                        <h4 className="mb-0">Đổi mật khẩu</h4>
                    </Card.Header>
                    <Card.Body>
                        <Row className="justify-content-center">
                            <Col md={8} lg={6}>
                                {message.text && (
                                    <Alert 
                                        variant={message.type} 
                                        dismissible 
                                        onClose={() => setMessage({ type: '', text: '' })}
                                    >
                                        {message.text}
                                    </Alert>
                                )}

                                <Form onSubmit={handleSubmit}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Mật khẩu hiện tại <span className="text-danger">*</span></Form.Label>
                                        <InputGroup>
                                            <Form.Control
                                                type={showPassword.current_password ? "text" : "password"}
                                                name="current_password"
                                                value={formData.current_password}
                                                onChange={handleChange}
                                                isInvalid={!!errors.current_password}
                                                placeholder="Nhập mật khẩu hiện tại"
                                                autoComplete="current-password"
                                            />
                                            <Button
                                                variant="outline-secondary"
                                                type="button"
                                                onClick={() => togglePasswordVisibility('current_password')}
                                                style={{ borderLeft: 'none' }}
                                            >
                                                <FontAwesomeIcon 
                                                    icon={showPassword.current_password ? faEyeSlash : faEye} 
                                                />
                                            </Button>
                                        </InputGroup>
                                        {errors.current_password && (
                                            <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                                                {errors.current_password[0]}
                                            </Form.Control.Feedback>
                                        )}
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Mật khẩu mới <span className="text-danger">*</span></Form.Label>
                                        <InputGroup>
                                            <Form.Control
                                                type={showPassword.new_password ? "text" : "password"}
                                                name="new_password"
                                                value={formData.new_password}
                                                onChange={handleChange}
                                                isInvalid={!!errors.new_password}
                                                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                                autoComplete="new-password"
                                            />
                                            <Button
                                                variant="outline-secondary"
                                                type="button"
                                                onClick={() => togglePasswordVisibility('new_password')}
                                                style={{ borderLeft: 'none' }}
                                            >
                                                <FontAwesomeIcon 
                                                    icon={showPassword.new_password ? faEyeSlash : faEye} 
                                                />
                                            </Button>
                                        </InputGroup>
                                        {errors.new_password && (
                                            <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                                                {errors.new_password[0]}
                                            </Form.Control.Feedback>
                                        )}
                                        <Form.Text className="text-muted">
                                            Mật khẩu phải có ít nhất 6 ký tự
                                        </Form.Text>
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label>Xác nhận mật khẩu mới <span className="text-danger">*</span></Form.Label>
                                        <InputGroup>
                                            <Form.Control
                                                type={showPassword.new_password_confirmation ? "text" : "password"}
                                                name="new_password_confirmation"
                                                value={formData.new_password_confirmation}
                                                onChange={handleChange}
                                                isInvalid={!!errors.new_password_confirmation}
                                                placeholder="Nhập lại mật khẩu mới"
                                                autoComplete="new-password"
                                            />
                                            <Button
                                                variant="outline-secondary"
                                                type="button"
                                                onClick={() => togglePasswordVisibility('new_password_confirmation')}
                                                style={{ borderLeft: 'none' }}
                                            >
                                                <FontAwesomeIcon 
                                                    icon={showPassword.new_password_confirmation ? faEyeSlash : faEye} 
                                                />
                                            </Button>
                                        </InputGroup>
                                        {errors.new_password_confirmation && (
                                            <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                                                {errors.new_password_confirmation[0]}
                                            </Form.Control.Feedback>
                                        )}
                                    </Form.Group>

                                    <div className="d-grid gap-2">
                                        <Button 
                                            variant="primary" 
                                            type="submit"
                                            disabled={loading}
                                            size="lg"
                                        >
                                            {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                                        </Button>
                                    </div>
                                </Form>

                                <div className="mt-4 p-3 bg-light rounded">
                                    <h6 className="fw-bold">Lưu ý:</h6>
                                    <ul className="mb-0 small">
                                        <li>Mật khẩu mới phải có ít nhất 6 ký tự</li>
                                        <li>Mật khẩu mới phải khác với mật khẩu hiện tại</li>
                                        <li>Sau khi đổi mật khẩu thành công, bạn sẽ cần đăng nhập lại</li>
                                    </ul>
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default ChangePassword;

