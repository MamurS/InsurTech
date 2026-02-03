import React, { useCallback, useRef } from 'react';

interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps {
  label?: string;
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

const sizeConfig = {
  sm: {
    padding: 'px-3 py-1.5',
    text: 'text-xs',
    gap: 'gap-1',
    container: 'p-0.5',
    height: 'h-8'
  },
  md: {
    padding: 'px-4 py-2',
    text: 'text-sm',
    gap: 'gap-1.5',
    container: 'p-1',
    height: 'h-10'
  },
  lg: {
    padding: 'px-5 py-2.5',
    text: 'text-sm',
    gap: 'gap-2',
    container: 'p-1',
    height: 'h-12'
  }
};

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  label,
  options,
  value,
  onChange,
  size = 'md',
  disabled = false,
  className = '',
  fullWidth = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const config = sizeConfig[size];

  const handleKeyDown = useCallback((e: React.KeyboardEvent, currentIndex: number) => {
    if (disabled) return;

    let newIndex = currentIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      newIndex = (currentIndex + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      newIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = options.length - 1;
    }

    if (newIndex !== currentIndex) {
      onChange(options[newIndex].value);
      // Focus the new button
      const buttons = containerRef.current?.querySelectorAll('button');
      buttons?.[newIndex]?.focus();
    }
  }, [disabled, onChange, options]);

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label={label}
        className={`
          inline-flex ${fullWidth ? 'w-full' : ''}
          ${config.container}
          bg-slate-100 rounded-lg
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {options.map((option, index) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              disabled={disabled}
              onClick={() => !disabled && onChange(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`
                ${fullWidth ? 'flex-1' : ''}
                ${config.padding}
                ${config.text}
                ${config.height}
                inline-flex items-center justify-center ${config.gap}
                font-medium rounded-md
                transition-all duration-200 ease-out
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
                ${isSelected
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }
                ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SegmentedControl;
