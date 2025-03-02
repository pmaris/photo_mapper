import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

export default function ConfirmationModal({ title, message, show, onClose, onConfirm }: { title: string, message: string, show: boolean, onClose: () => void, onConfirm: () => void }) {
    return (
        <div id="confirmation-modal">
            <Modal show={show} onHide={onClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{title}</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <p>{message}</p>
                </Modal.Body>

                <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>Close</Button>
                <Button variant="primary" onClick={onConfirm}>Confirm</Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}