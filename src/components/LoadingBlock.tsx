const LoadingBlock = () => {
  return (
    <div className="mt-4 p-4 bg-navy-600 text-white rounded-lg shadow-lg">
      <div className="flex items-center justify-center space-x-2">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        <span className="text-lg font-medium">Processing image...</span>
      </div>
    </div>
  );
};

export default LoadingBlock; 