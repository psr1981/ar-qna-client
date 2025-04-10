import { useEffect, useRef } from 'react';

interface SVGRendererProps {
  svgContent: string;
}

const SVGRenderer: React.FC<SVGRendererProps> = ({ svgContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = svgContent;
    }
  }, [svgContent]);

  return (
    <div className="svg-container my-4 overflow-auto flex justify-center">
      <div ref={containerRef} className="max-w-full" />
    </div>
  );
};

export default SVGRenderer; 