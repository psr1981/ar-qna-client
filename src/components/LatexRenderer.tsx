import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface LatexRendererProps {
  content: string;
}

const LatexRenderer: React.FC<LatexRendererProps> = ({ content }) => {
  // Split content into text and LaTeX parts
  const parts = content.split(/(\$\$.*?\$\$|\$.*?\$)/gs);

  return (
    <div className="latex-content">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // Display math mode (centered, block-level)
          const latex = part.slice(2, -2).trim();
          return (
            <div key={index} className="my-4">
              <BlockMath math={latex} errorColor="#cc0000" />
            </div>
          );
        } else if (part.startsWith('$') && part.endsWith('$')) {
          // Inline math mode
          const latex = part.slice(1, -1).trim();
          return <InlineMath key={index} math={latex} errorColor="#cc0000" />;
        } else {
          // Regular text
          return <span key={index}>{part}</span>;
        }
      })}
    </div>
  );
};

export default LatexRenderer; 