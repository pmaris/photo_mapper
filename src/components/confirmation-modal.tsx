import React from "react"

function ConfirmationModal({ title, message }) {
    return (
        <div id="confirmation-modal" title={title} hidden>
            <p>
                {message}
            </p>
        </div>
    )
}