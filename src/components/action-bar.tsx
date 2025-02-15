import React from 'react';
import { createRoot } from 'react-dom/client';

import { filterDatesChanged, saveMapStartLocation } from '../main';
import { confirmSaveMapStartLocation, openFindPhotosModal } from '../ui';

export function ActionBar() {
    return (
        <div>
            <input type="image" src="icons/home.png" className="button" onClick={ () => { confirmSaveMapStartLocation(saveMapStartLocation) }} title="Save the current view of the map as the default when the application starts" />
            <input type="image" src="icons/search.png" className="button" onClick={ openFindPhotosModal } title="Search your computer for geotagged photos" />
            <input type="image" src="icons/calendar.png" className="button" id="date-filter-enable-button" /*onClick={ jQuery('#date-filter').toggle() }*/ title="Filter photos shown on the map by the date they were taken" />
            <span id="date-filter">
                Start date:
                <input type="date" id="filter-begin-date" onChange={ filterDatesChanged } />
                End date:
                <input type="date" id="filter-end-date" onChange={ filterDatesChanged } />
            </span>
        </div>
    )
}

const domNode = document.getElementById('action-bar');
const root = createRoot(domNode);
root.render(<ActionBar />);