import React from "react"

export function ProgressModal() {
    return (
        <div id="progress-modal" hidden>
        <div id="finder-progress-bar">
            <div id="progress-bar-label">Counting photos...</div>
        </div>
        <p id="finder-result" hidden></p>
            <button id="finderResultCloseButton" hidden>Close</button>
        </div>
    )
}
