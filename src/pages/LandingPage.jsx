import React, { useState, useEffect } from 'react';
import EarphoneScene from '../three/EarphoneScene';
import UIOverlay from '../components/UIOverlay';

export default function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // Calculate scroll progress from 0 to 1
      const totalScrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScrollableHeight <= 0) return;
      
      const progress = window.scrollY / totalScrollableHeight;
      // Clamp between 0 and 1 just in case of overscrolling (like on Mac)
      const clampedProgress = Math.max(0, Math.min(1, progress));
      setScrollProgress(clampedProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial call to set correct progress if reloaded mid-page
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      {/* 
        This is the massive scrollable container. 
        We use 400vh to give the user enough 'scroll distance' to feel the animation smoothly. 
        Higher values mean slower animation per scroll tick.
      */}
      <div style={{ height: '400vh' }}></div>

      {/* The 3D Scene stays fixed in the background */}
      <EarphoneScene scrollProgress={scrollProgress} />

      {/* The HTML UI stays fixed on top */}
      <UIOverlay />
    </>
  );
}
