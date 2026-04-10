import React from 'react';
import './UIOverlay.css'; // We'll add some CSS here

export default function UIOverlay() {
  return (
    <div className="ui-overlay-container">
      {/* Top Navigation */}
      <header className="ui-header">
        <div className="ui-logo">AETHER 1</div>
        <div className="ui-menu-container">
          <span className="ui-menu-text">Sound MENU</span>
          <div className="ui-menu-icon">
            <div className="dot"></div><div className="dot"></div><div className="dot"></div>
            <div className="dot"></div><div className="dot"></div><div className="dot"></div>
            <div className="dot"></div><div className="dot"></div><div className="dot"></div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="ui-content">
        <div className="ui-left">
          <h1 className="ui-title">Sound Without<br />Boundaries</h1>
        </div>
        <div className="ui-right">
          <div className="ui-equalizer">
            {/* Simple static equalizer representation */}
            <div className="bar"></div>
            <div className="bar" style={{height: '24px'}}></div>
            <div className="bar" style={{height: '14px'}}></div>
            <div className="bar" style={{height: '30px'}}></div>
            <div className="bar"></div>
            <div className="bar" style={{height: '20px'}}></div>
            <div className="bar" style={{height: '12px'}}></div>
          </div>
          <p className="ui-subtitle">
            Elevate your senses through<br />
            timeless resonance
          </p>
        </div>
      </main>
      
      {/* Scroll indicator */}
      <div className="ui-scroll-indicator">
        Scroll
      </div>
    </div>
  );
}
