import React, { useState, useEffect } from 'react';
import '../styles/BackgroundSlideshow.css';

const images = [
    '/Images/National-Engineering-View-1.jpg',
    '/Images/Nec.jpg',
    '/Images/NEC-2.jpg'
];

const BackgroundSlideshow = () => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
        }, 5000); // Change image every 5 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="background-slideshow">
            {images.map((image, index) => (
                <img
                    key={index}
                    src={image}
                    alt={`Background slide ${index + 1}`}
                    className={`slide-image ${index === currentImageIndex ? 'active' : ''}`}
                />
            ))}
            <div className="slideshow-overlay"></div>
        </div>
    );
};

export default BackgroundSlideshow;
