import React from 'react';
import ActionBar from './action-bar';
import Map from './map'

declare global {
    interface Window {
      root?: any;
    }
  }

export default function Root() {
    const [map, setMap] = React.useState(null)
    
    const config = window.electronContext.loadConfig();

    return (
        <>
            <ActionBar map={map} config={config} />
            <Map map={map} setMap={setMap} config={config} />
        </>
    );
}
