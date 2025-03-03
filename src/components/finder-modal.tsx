import React, { SyntheticEvent } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import ProgressModal from './progress-modal';
import { GeotaggedPhoto } from '../types';
import { InputGroup } from 'react-bootstrap';

export default function Finder({show, onClose}: { show: boolean, onClose: () => void }) {
    const [showProgressModal, setShowProgressModal] = React.useState(false);
    const [photosRead, setPhotosRead] = React.useState(0);
    const [totalNumberOfPhotos, setTotalNumberOfPhotos] = React.useState(null);
    const [abort, setAbort] = React.useState(false);
    const [validated, setValidated] = React.useState(false);

    function startFinder(directory: string, fileExtensions: string[]) {
        setShowProgressModal(true);
        window.electronContext.getGeotaggedPhotos(directory, fileExtensions, updateProgress, savePhotos, abort)
    }

    function updateProgress(count: number, total: number) {
        setPhotosRead(count);
        setTotalNumberOfPhotos(total)
    }

    async function openDirectorySelect() {
        let filePath = await window.electronContext.selectDirectory();
        if (!filePath) {
            filePath = '';
        }
        document.getElementById('directory-path').setAttribute('value', filePath);
    }

    function savePhotos(photos: GeotaggedPhoto[]) {
        console.log('save');
        console.log(photos);
        window.electronContext.savePhotos(photos);
        // TODO: Update map markers
    }

    function submit(event: SyntheticEvent) {
        event.preventDefault();
        setValidated(true)

        const form = event.currentTarget as HTMLFormElement;
        
        if (form.checkValidity()) {
            const directory = (form.elements.namedItem('directory-path') as HTMLInputElement).value;
            const fileExtensions = (form.elements.namedItem('file-extensions') as HTMLInputElement).value.split(' ');

            startFinder(directory, fileExtensions);
        }
    }

    return (
        <div id="find-photos-modal">
            <Modal show={show} onHide={onClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Find geotagged photos</Modal.Title>
                </Modal.Header>

                <Form noValidate validated={validated} onSubmit={submit}>
                    <Modal.Body>
                        <Form.Group>
                            <Form.Label htmlFor="directory-path">
                                Select a directory
                            </Form.Label>
                            <InputGroup>
                                <Button variant="outline-primary" onClick={openDirectorySelect}>Open</Button>
                                <Form.Control id="directory-path" readOnly required placeholder="No directory selected" />
                            </InputGroup>
                            <Form.Control.Feedback type="invalid">
                                You must select a folder to search for geotagged photos
                            </Form.Control.Feedback>
                        </Form.Group>
                        <br />
                        <Form.Group>
                            <Form.Label htmlFor="file-extensions">
                                Select file types to check. Separate multiple file types with spaces. Periods are not required.
                            </Form.Label>
                            <Form.Control id="file-extensions" type="text" min="1" required={ true } defaultValue="jpg jpeg" />
                            <Form.Control.Feedback type="invalid">
                                You must select which file types to check
                            </Form.Control.Feedback>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="submit">Start</Button>
                    </Modal.Footer>
                </Form>
                <ProgressModal count={photosRead} maxValue={totalNumberOfPhotos} show={showProgressModal} setShow={setShowProgressModal} setAbort={setAbort}/>
            </Modal>
        </div>
    )
}
