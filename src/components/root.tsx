import ActionBar from './action-bar';

declare global {
    interface Window {
      root?: any;
    }
  }

export default function Root() {
  return (
    <>
      <ActionBar />
    </>
  );
}
