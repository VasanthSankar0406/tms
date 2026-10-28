import React, { useEffect, useState } from 'react';
import '../styles/DriverPageHeader.css';

const DriverPageHeader = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="driver-page-clock-fixed">
      <span className="driver-clock-label">Driver Portal</span>
      <span>
        {currentTime.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </span>
      <span className="driver-clock-time">
        {currentTime.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </span>
    </div>
  );
};

export default DriverPageHeader;
