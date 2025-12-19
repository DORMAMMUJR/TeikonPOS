
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
    >
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <filter id="teikon-neon" x="-50%" y="-50%" width="200%" height="200%">
            {/* Capas de resplandor morado */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur1" />
            <feFlood floodColor="#a855f7" result="color1" />
            <feComposite in="color1" in2="blur1" operator="in" result="glow1" />
            
            <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur2" />
            <feFlood floodColor="#a855f7" result="color2" />
            <feComposite in="color2" in2="blur2" operator="in" result="glow2" />

            {/* Fusión de resplandores con la forma original */}
            <feMerge>
              <feMergeNode in="glow2" />
              <feMergeNode in="glow1" />
              <feMergeNode in="glow1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#teikon-neon)">
          {/* Pieza Izquierda: Tallo y mitad de la barra superior con muesca */}
          <path 
            d="M47 12 L10 35 V56 L23 56 V45 L37 49 V89 L47 94 Z" 
            fill="white" 
          />
          
          {/* Pieza Derecha: Ala trapezoidal isométrica */}
          <path 
            d="M53 18 L88 38 L98 84 L68 84 V72 L53 50 Z" 
            fill="white" 
          />
        </g>
      </svg>
    </div>
  );
};

export default TeikonLogo;
