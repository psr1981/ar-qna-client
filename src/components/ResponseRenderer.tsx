import LatexRenderer from './LatexRenderer';
import SVGRenderer from './SVGRenderer';

interface AnswerData {
  status: "success" | "error";
  answer: string;
  diagram?: string;
}

interface ResponseRendererProps {
  data: AnswerData;
}

const ResponseRenderer: React.FC<ResponseRendererProps> = ({ data }) => {

  console.log(data);
  
  const hasDiagram = !!data.diagram && data.diagram.trim().length > 0;
  
  return (
    <div className="response-content">
      {hasDiagram && (
        <div className="diagram-section mb-4">
          <h4 className="text-lg font-semibold text-blue-600 mb-3">Diagram</h4>
          <SVGRenderer svgContent={data.diagram || ''} />
        </div>
      )}
      
      <div className="answer-section">
        {hasDiagram && <h4 className="text-lg font-semibold text-blue-600 mb-3">Explanation</h4>}
        <LatexRenderer content={data.answer} />
      </div>
    </div>
  );
};

export default ResponseRenderer; 