import React from 'react';
import VideoHoverDistortionCard from '../components/VideoHoverDistortionCard';
import './thumbnail.css';

export default function ThumbnailPage() {
  return (
    <div className="thumbnail-page-container">
      <div className="thumbnail-grid">
        
        {/* Main large thumbnail */}
        <div className="thumbnail-main">
          <div className="thumbnail-header">
            <div>
              <h1 className="thumbnail-title">Selected Works</h1>
              <p className="thumbnail-subtitle">Hover to interact with the fluid WebGL surfaces.</p>
            </div>
            <a href="#" className="thumbnail-link">
              View all projects
            </a>
          </div>
          
          <VideoHoverDistortionCard 
            videoSrc="/videos/cosmos.mp4" 
            title="Cosmos Explorer" 
            tag="Creative Direction"
            className="card-main"
          />
        </div>

        {/* Smaller thumbnails for context */}
        <VideoHoverDistortionCard 
          videoSrc="/videos/cosmos.mp4" 
          title="Nebula Visualizer" 
          tag="WebGL Dev"
          className="card-secondary"
        />
        
        <VideoHoverDistortionCard 
          videoSrc="/videos/cosmos.mp4" 
          title="Space Dynamics" 
          tag="Motion Design"
          className="card-secondary"
        />

      </div>
    </div>
  );
}
