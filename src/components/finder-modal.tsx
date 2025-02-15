import React from "react"
import { createRoot } from "react-dom/client";

import { selectFolder } from "../ui"

export function Finder() {
    return (
        <div id="find-photos-modal" title="Find geotagged photos" hidden>
            <div id="select-options">
                <div id="folder-select">
                    <button id="select-folder-button" onClick={ selectFolder }>Select a folder</button>
                    <input id="folder-path" type="text" readOnly />
                </div>
                <p>
                    Select file types to check:
                    <input id="file-extensions" type="text" min="1" required={ true } value="jpg jpeg" size={ 5 }/>
                    <br />
                    Separate multiple file types with spaces. Periods are not required.
                </p>
                <p id="no-folder-selected" hidden>
                    You must select a folder to search for geotagged photos
                </p>
            </div>
        </div>
    )
}


const domNode = document.getElementById('finder');
const root = createRoot(domNode);
root.render(<Finder />);