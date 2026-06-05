import React from 'react';

export default function Loader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '50vh' }}>
      <div className="loader-card">
        <div className="loader">
          <p>loading</p>
          <div className="words">
            <span className="word">members</span>
            <span className="word">programs</span>
            <span className="word">workouts</span>
            <span className="word">metrics</span>
            <span className="word">members</span>
          </div>
        </div>
      </div>
    </div>
  );
}
