
import React from 'react';

interface TeikonWordmarkProps {
  height?: number;
  className?: string;
}

const TeikonWordmark: React.FC<TeikonWordmarkProps> = ({ height = 32, className = "" }) => {
  return (
    <svg 
      height={height} 
      viewBox="0 0 320 60" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-colors duration-500 ${className}`}
    >
      {/* T - Agresiva */}
      <path d="M5 5 H55 V18 H35 V55 H25 V18 H5 V5Z" className="fill-current" />
      
      {/* E - Tres barras horizontales puras */}
      <path d="M70 5 H110 V15 H70 V5Z" className="fill-current" />
      <path d="M70 25 H110 V35 H70 V25Z" className="fill-current" />
      <path d="M70 45 H110 V55 H70 V45Z" className="fill-current" />

      {/* I - Bloque sólido */}
      <path d="M125 5 H137 V55 H125 V5Z" className="fill-current" />

      {/* K - Cortes angulares afilados */}
      <path d="M150 5 H162 V28 L182 5 H198 L170 32 L200 55 H184 L162 38 V55 H150 V5Z" className="fill-current" />

      {/* O - Octogonal puro */}
      <path d="M225 5 H250 L262 17 V43 L250 55 H225 L213 43 V17 L225 5ZM226 15 V45 H249 V15 H226Z" className="fill-current" fillRule="evenodd" />

      {/* N - Estilo militar geométrico */}
      <path d="M275 5 H287 L305 35 V5 H317 V55 H305 L287 25 V55 H275 V5Z" className="fill-current" />
    </svg>
  );
};

export default TeikonWordmark;
