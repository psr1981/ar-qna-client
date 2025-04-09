import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Components } from 'react-markdown';

interface LatexRendererProps {
  content: string;
}

interface CodeProps {
  inline?: boolean;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

interface MarkdownComponentProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

const katexOptions = {
  throwOnError: false,
  strict: false,
  trust: true,
  displayMode: true,
  leqno: false,
  fleqn: false,
  macros: {
    "\\eqref": "\\href{#1}{}",
    "\\label": "\\htmlId{#1}{}",
    "\\ref": "\\href{##1}{}",
  },
};

const LatexRenderer: React.FC<LatexRendererProps> = ({ content }) => {
  const components: Components = {
    // Customize heading styles
    h1: ({ children, ...props }: MarkdownComponentProps) => (
      <h1 className="text-2xl font-bold my-4" {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }: MarkdownComponentProps) => (
      <h2 className="text-xl font-bold my-3" {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: MarkdownComponentProps) => (
      <h3 className="text-lg font-bold my-2" {...props}>{children}</h3>
    ),
    // Customize list styles
    ul: ({ children, ...props }: MarkdownComponentProps) => (
      <ul className="list-disc list-inside my-2" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }: MarkdownComponentProps) => (
      <ol className="list-decimal list-inside my-2" {...props}>{children}</ol>
    ),
    // Customize code block styles
    code: ({ inline, children, ...props }: CodeProps) => (
      inline ? (
        <code className="bg-gray-100 rounded px-1 py-0.5" {...props}>{children}</code>
      ) : (
        <code className="block bg-gray-100 rounded p-2 my-2 overflow-x-auto" {...props}>{children}</code>
      )
    ),
    // Customize blockquote styles
    blockquote: ({ children, ...props }: MarkdownComponentProps) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic" {...props}>{children}</blockquote>
    ),
    // Customize table styles
    table: ({ children, ...props }: MarkdownComponentProps) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-gray-300" {...props}>{children}</table>
      </div>
    ),
    th: ({ children, ...props }: MarkdownComponentProps) => (
      <th className="border border-gray-300 px-4 py-2 bg-gray-100" {...props}>{children}</th>
    ),
    td: ({ children, ...props }: MarkdownComponentProps) => (
      <td className="border border-gray-300 px-4 py-2" {...props}>{children}</td>
    ),
  };

  return (
    <div className="latex-content prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, katexOptions]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default LatexRenderer; 