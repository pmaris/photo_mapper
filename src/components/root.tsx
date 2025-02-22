import ActionBar from './action-bar';
import Map from './map'

declare global {
    interface Window {
      root?: any;
    }
  }

export default function Root() {
  return (
    <>
      <ActionBar />
      <Map />
    </>
  );
}
