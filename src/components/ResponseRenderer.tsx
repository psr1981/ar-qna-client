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
    <div className="response-content w-full">
      {hasDiagram && (
        <div className="diagram-section mb-4">
          <h4 className="text-base md:text-lg font-semibold text-blue-600 mb-2 md:mb-3">Diagram</h4>
          <div className="w-full overflow-x-auto">
            <SVGRenderer svgContent={data.diagram || ''} />
          </div>
        </div>
      )}
      
      <div className="answer-section">
        {hasDiagram && <h4 className="text-base md:text-lg font-semibold text-blue-600 mb-2 md:mb-3">Explanation</h4>}
        <div className="w-full overflow-x-auto text-sm md:text-base">
          <LatexRenderer content={data.answer} />
        </div>
      </div>
    </div>
  );
};

export default ResponseRenderer; 