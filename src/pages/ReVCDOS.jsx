import React from 'react';
import BackButton from './BackButton';
import './ReVCDOS.css';

export default function ReVCDOS() {
  return (
    <div className="revc-root">
      <BackButton />
      <div className="revc-iframe-container">
        <iframe
          src="/revcdos/index.html"
          title="GTA Vice City HTML5"
          className="revc-iframe"
          allow="fullscreen; keyboard; gamepad"
        />
      </div>
    </div>
  );
}
