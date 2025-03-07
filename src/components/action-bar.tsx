import React from "react";
import ConfirmationModal from "./confirmation-modal";
import FinderModal from "./finder-modal";
import { Config } from "../types";

export default function ActionBar({ map, config }: { map: google.maps.Map, config: Config }) {
    const [showSaveMapStartModal, setShowMapStartModal] = React.useState(false);
    const [showFinder, setShowFinder] = React.useState(false);
    const [dateFiltersVisible, setDateFiltersVisible] = React.useState(false);

    function saveMap() {
        config.mapCenterLatitude = map.getCenter().lat();
        config.mapCenterLongitude = map.getCenter().lng();
        config.mapZoom = map.getZoom();
        window.electronContext.saveConfig(config);
        setShowMapStartModal(false);
    }

    return (
        <div className="action-bar">
            <input type="image" src="icons/home.png" className="button action-bar-button" onClick={ () => { setShowMapStartModal(true) }} title="Save the current view of the map as the default when the application starts" />
            <input type="image" src="icons/search.png" className="button action-bar-button" onClick={ () => { setShowFinder(true) } } title="Search your computer for geotagged photos" />
            <input type="image" src="icons/calendar.png" className="button action-bar-button" id="date-filter-enable-button" onClick={ () => { setDateFiltersVisible(!dateFiltersVisible) } } title="Filter photos shown on the map by the date they were taken" />
            { dateFiltersVisible && (
                <span id="date-filter">
                    Start date:
                    <input type="date" id="filter-begin-date" onChange={ () => console.log('filter changed') /* filterDatesChanged */ } />
                    End date:
                    <input type="date" id="filter-end-date" onChange={ () => console.log('filter changed') /* filterDatesChanged */} />
                </span> 
            )}
            <ConfirmationModal title="Save start location" message="Save current map view as the default start location?" show={showSaveMapStartModal} onClose={() => setShowMapStartModal(false)} onConfirm={saveMap} />
            <FinderModal show={showFinder} onClose={() => setShowFinder(false)} />
        </div>
    )
}
