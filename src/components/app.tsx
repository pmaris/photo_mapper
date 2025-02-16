import React from 'react';
import ActionBar from './action-bar';

declare global {
    interface Window {
      root?: any;
    }
  }

export default function App() {
  return (
    <>
      <ActionBar />
    </>
  );
}
