import React from 'react';

interface TeikonLogoProps {
  size?: number;
  className?: string;
}

const TeikonLogo: React.FC<TeikonLogoProps> = ({ size = 80, className = "" }) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Teikon Brand Logo"
    >
      <svg 
        viewBox="0 0 400 400" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="gradLeftFinal" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#005ea8"/>
            <stop offset="100%" stopColor="#00c6ff"/>
          </linearGradient>
          <linearGradient id="gradRightFinal" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#007e9e"/>
            <stop offset="100%" stopColor="#89d62d"/>
          </linearGradient>
          <linearGradient id="gradTopFinal" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#00c6ff"/>
            <stop offset="100%" stopColor="#89d62d"/>
          </linearGradient>
        </defs>

        <g transform="translate(40, 50)">
          {/* Main 3D isometric surfaces */}
          <path d="M160 10 L275 60 L160 105 L45 60 Z" fill="url(#gradTopFinal)" />
          <path d="M40 70 L153 115 L153 260 L40 215 Z" fill="url(#gradLeftFinal)" />
          <path d="M167 115 L280 70 L280 215 L167 260 Z" fill="url(#gradRightFinal)" />
          
          {/* Highlight dividers simulating light edges */}
          <path d="M160 10 L160 105" stroke="white" strokeWidth="2" strokeOpacity="0.6"/>
          <path d="M45 60 L275 60" stroke="white" strokeWidth="2" strokeOpacity="0.4"/>
          <path d="M96.5 92.5 L96.5 237.5" stroke="white" strokeWidth="2" strokeOpacity="0.5"/>
          <path d="M40 142.5 L153 187.5" stroke="white" strokeWidth="2" strokeOpacity="0.3"/>

          {/* Central brand checkmark symbol */}
          <path 
            d="M 90 180 Q 130 200 150 225 L 160 235 L 290 90 L 260 75 L 155 190 L 120 160 Z" 
            fill="white" 
          />
        </g>

        {/* Decorative branding blocks */}
        <g transform="translate(250, 10)">
          <rect x="22" y="0" width="18" height="18" fill="#00c6ff"/>
          <rect x="44" y="22" width="18" height="18" fill="#4caf50"/>
          <rect x="22" y="44" width="18" height="18" fill="#005ea8"/>
          <rect x="0" y="22" width="18" height="18" fill="#008ba3"/>
        </g>
      </svg>
    </div>
  );
};

export default TeikonLogo;