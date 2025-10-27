import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip = ({ content, children }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
      });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  const tooltipContent = isVisible ? (
    <div
      className="fixed pointer-events-none"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 999999,
      }}
    >
      <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-2xl border-2 border-gray-700 max-w-xs">
        <div className="flex items-start gap-2">
          <div className="h-4 w-4 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Info className="h-2.5 w-2.5 text-blue-400" />
          </div>
          <p className="leading-relaxed text-gray-100">{content}</p>
        </div>
        {/* Flecha */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: '100%' }}
        >
          <svg width="16" height="8" viewBox="0 0 16 8" className="text-gray-900">
            <path d="M8 8L0 0h16L8 8z" fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => {
          setIsVisible(true);
          updatePosition();
        }}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-block w-full"
      >
        {children}
      </div>
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
};

// Componente simple de icono con tooltip
export const InfoTooltip = ({ text }: { text: string }) => {
  return (
    <Tooltip content={text}>
      <div className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors cursor-help ml-1.5">
        <Info className="h-2.5 w-2.5 text-blue-600" />
      </div>
    </Tooltip>
  );
};
