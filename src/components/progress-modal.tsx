import Button from 'react-bootstrap/Button';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Modal from 'react-bootstrap/Modal';
import React from 'react';
import ConfirmationModal from './confirmation-modal';
import '../../css/photo_mapper.css';

export default function ProgressModal({count, maxValue, show, setShow, setAbort}: { count: number, maxValue: number, show: boolean, setShow: (value: boolean) => void, setAbort: (value: boolean) => void }) {
    const [complete, setComplete] = React.useState(false);
    const [progressLabel, setProgressLabel] = React.useState("Counting photos...");
    const [showCancelModal, setShowCancelModal] = React.useState(false)

    function cancel() {
        setAbort(true);
        setShowCancelModal(false);
        setShow(false);
    }

    React.useEffect(() => {
        if (maxValue && count == maxValue) {
            setComplete(true);
            setProgressLabel('Finished');
        }
        else if (maxValue) {
            setProgressLabel(`${count} / ${maxValue} photos checked`);
        }
        else {
            setProgressLabel("Counting photos...");
        }
    }, [count, maxValue])

    return (
        <Modal show={show}>
            <Modal.Header>
                <Modal.Title>Searching for geotagged photos</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <ProgressBar min={0} now={count} max={maxValue} label={progressLabel}/>
            </Modal.Body>
            <Modal.Footer>
                { complete ? (
                    <Button variant="secondary" onClick={() => { setShow(false) }}>Close</Button>
                ) : (
                    <Button variant="danger" onClick={() => { setShowCancelModal(true) }}>Cancel</Button>
                )}
            </Modal.Footer>
            <ConfirmationModal 
                title="Cancel search"
                message="Cancel the search for geotagged photos? Photos that have been found will not be saved." 
                show={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={cancel}
            />
        </Modal>
    )
}
