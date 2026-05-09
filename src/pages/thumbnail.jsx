import React from 'react';
import VideoHoverDistortionCard from '../components/VideoHoverDistortionCard';
import './thumbnail.css';

export default function ThumbnailPage() {
  return (
    <div className="thumbnail-page-container">
      <div className="thumbnail-center-wrapper">
        <VideoHoverDistortionCard 
          videoSrc="/videos/cosmos.mp4" 
          title="Cosmos Explorer" 
          tag="Creative Direction"
          className="card-main"
        />
      </div>
    </div>
  );
}
