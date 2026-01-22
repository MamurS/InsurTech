
import React from 'react';

interface MosaicLogoProps {
  className?: string;
  variant?: 'color' | 'white' | 'monochrome';
  withText?: boolean;
}

export const MosaicLogo: React.FC<MosaicLogoProps> = ({ className = "w-10 h-10", variant = 'color', withText = false }) => {
  
  const getFill = (index: number) => {
    if (variant === 'white') {
        // All white with opacity variations
        return `rgba(255, 255, 255, ${1 - (index * 0.15)})`;
    }
    if (variant === 'monochrome') {
        // Grayscale
        return index === 0 ? '#1f2937' : index === 1 ? '#4b5563' : index === 2 ? '#9ca3af' : '#d1d5db';
    }
    // Brand Colors (Blue & Green mix)
    // 0: Blue-600, 1: Emerald-500, 2: Blue-400, 3: Emerald-300
    const colors = ['#2563EB', '#10B981', '#60A5FA', '#6EE7B7'];
    return colors[index];
  };

  const getTextColor = () => {
      if (variant === 'white') return '#ffffff';
      if (variant === 'monochrome') return '#1f2937';
      return '#0f172a'; // Slate-900
  };

  return (
    <div className="flex items-center gap-3 select-none">
      <div className={`${className} relative flex-shrink-0`}>
         <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
            {/* Top Left - Primary */}
            <path d="M10 30C10 18.9543 18.9543 10 30 10H48V48H10V30Z" fill={getFill(0)} />
            {/* Top Right - Secondary */}
            <path d="M52 10H70C81.0457 10 90 18.9543 90 30V48H52V10Z" fill={getFill(1)} />
            {/* Bottom Left - Tertiary */}
            <path d="M10 52H48V90H30C18.9543 90 10 81.0457 10 70V52Z" fill={getFill(2)} />
            {/* Bottom Right - Quaternary */}
            <path d="M52 52H90V70C90 81.0457 81.0457 90 70 90H52V52Z" fill={getFill(3)} />
         </svg>
      </div>
      
      {withText && (
          <div className="flex flex-col justify-center">
             <span className="font-sans tracking-tight leading-none font-bold" 
                   style={{ color: getTextColor(), fontSize: '1.5em' }}>
                 MIG
             </span>
          </div>
      )}
    </div>
  );
};
