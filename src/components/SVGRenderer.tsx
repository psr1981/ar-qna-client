import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { SVGLoader, SVGResult } from 'three/examples/jsm/loaders/SVGLoader.js';
import * as THREE from 'three';
import { OrbitControls, PresentationControls, Html, useGLTF } from '@react-three/drei';

interface SVGRendererProps {
  svgContent: string;
}

// Custom hook to detect device capabilities
const useDeviceCapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    has3D: false,
    hasAR: false,
    isIOS: false,
    isARCore: false,
    hasWebXR: false,
    isLoading: true
  });

  useEffect(() => {
    const detectCapabilities = async () => {
      // Check for WebXR AR mode support
      const hasWebXR = 'xr' in navigator;
      
      // Check for WebGL support for 3D rendering
      let hasWebGL = false;
      try {
        const canvas = document.createElement('canvas');
        hasWebGL = !!(window.WebGLRenderingContext && 
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch (e) {
        hasWebGL = false;
      }
      
      // Check for iOS ARKit
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      // Check for ARCore on Android
      const isARCore = /Android/i.test(navigator.userAgent);
      
      setCapabilities({
        has3D: hasWebGL,
        hasAR: hasWebXR || isIOS || isARCore,
        isIOS,
        isARCore,
        hasWebXR,
        isLoading: false
      });
    };
    
    detectCapabilities();
  }, []);
  
  return capabilities;
};

// Convert SVG content to a 3D object using Three.js
const SVGIn3D = ({ svgContent, extrusion = 2 }: { svgContent: string; extrusion?: number }) => {
  const { scene, camera } = useThree();
  const svgGroup = useRef<THREE.Group>();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [scaleVal, setScaleVal] = useState(0.05); // Default scale value
  
  // Initialize the group on first render
  useEffect(() => {
    if (!svgGroup.current) {
      const group = new THREE.Group();
      scene.add(group);
      svgGroup.current = group;
      console.log("Created new THREE.Group for SVG content");
      
      // Set initial rotation to make model oriented correctly
      group.rotation.set(0, 0, Math.PI);
    }
    
    return () => {
      // Cleanup on unmount
      if (svgGroup.current) {
        scene.remove(svgGroup.current);
      }
    };
  }, [scene]);

  useEffect(() => {
    // Basic validation to check if input is actually SVG
    if (!svgContent) {
      setError("No SVG content provided");
      return;
    }

    if (!svgContent.includes('<svg') && !svgContent.includes('<?xml')) {
      setError("Invalid SVG content - missing SVG tags");
      setDebugInfo("The provided content doesn't appear to be valid SVG");
      console.error("Invalid SVG content:", svgContent.substring(0, 100));
      return;
    }
    
    setDebugInfo(`Processing SVG content (length: ${svgContent.length})`);
    console.log("SVG content in 3D renderer:", svgContent.substring(0, 100) + "...");
  
    try {
      // Create basic group if it doesn't exist yet
      if (!svgGroup.current) {
        const group = new THREE.Group();
        scene.add(group);
        svgGroup.current = group;
        console.log("Created new THREE.Group for SVG content");
      }
      
      // Always create a simple fallback model first - will be replaced if SVG loads
      if (svgGroup.current) {
        const fallbackGeometry = new THREE.SphereGeometry(5, 16, 16);
        const fallbackMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x888888,
          wireframe: true 
        });
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        
        // Clear any existing children
        while (svgGroup.current.children.length > 0) {
          svgGroup.current.remove(svgGroup.current.children[0]);
        }
        
        svgGroup.current.add(fallbackMesh);
      }
      
      // Process SVG content
      let processedSvgContent = svgContent.trim();
      
      // Ensure SVG has xmlns attribute
      if (!processedSvgContent.includes('xmlns=')) {
        processedSvgContent = processedSvgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        setDebugInfo(prev => prev + "\nAdded xmlns attribute");
      }
      
      // Create blob URL
      try {
    const blob = new Blob([processedSvgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

        setDebugInfo(prev => prev + "\nCreated blob URL");
        
        // Create the loader
    const loader = new SVGLoader();
        
        // Try direct string parsing
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(processedSvgContent, 'image/svg+xml');
        
        // Check for parsing errors
        const parserError = svgDoc.querySelector('parsererror');
        if (!parserError) {
          setDebugInfo(prev => prev + "\nSVG parsed successfully");
          
          // Try using SVGLoader's parse method directly
          const serializedData = new XMLSerializer().serializeToString(svgDoc);
          
          try {
            const directResult = loader.parse(serializedData);
            
            if (directResult.paths && directResult.paths.length > 0) {
              processParsedData(directResult);
              return;
            } else {
              setDebugInfo(prev => prev + "\nNo paths found in direct parsing");
            }
          } catch (err) {
            console.error("SVG direct parse error:", err);
            setDebugInfo(prev => prev + "\nSVG direct parse error");
          }
        }
        
        // If direct parsing failed, try loading via URL
        setDebugInfo(prev => prev + "\nTrying URL loading approach");
        
      loader.load(
        url,
          (data) => {
            // Successfully loaded
            URL.revokeObjectURL(url);
            processParsedData(data);
          },
          undefined,
          (err) => {
            console.error("SVG load error:", err);
            setDebugInfo(prev => prev + "\nSVG load error: " + err);
            URL.revokeObjectURL(url);
            
            // Show error and basic model
            setError("Failed to load SVG: " + err);
            setLoaded(true);
          }
        );
        
      } catch (err) {
        console.error("Blob creation error:", err);
        setError("Failed to process SVG: " + (err instanceof Error ? err.message : String(err)));
        setLoaded(true); // Show error message
      }
      
    } catch (err) {
      console.error("SVG processing error:", err);
      setError("SVG processing error: " + (err instanceof Error ? err.message : String(err)));
      setLoaded(true); // Show error message
    }
    
    // Function to handle the parsed SVG data
    function processParsedData(data: SVGResult) {
      try {
        setDebugInfo(prev => prev + `\nSVG loaded, found ${data.paths.length} paths`);
        
        if (!svgGroup.current) {
          setError("Reference to 3D group is missing");
          console.error("svgGroup.current is null in processParsedData");
          // Create an emergency group if needed
          const group = new THREE.Group();
          scene.add(group);
          svgGroup.current = group;
        }
        
        // Clear any existing children
        while (svgGroup.current.children.length > 0) {
          svgGroup.current.remove(svgGroup.current.children[0]);
        }
        
        // If no paths, show error
        if (!data.paths || data.paths.length === 0) {
          setError("No paths found in SVG");
          createBasicShape(); // Create a placeholder
            return;
        }
        
        // Process the paths
        const group = new THREE.Group();
        let shapesCreated = 0;
        
        data.paths.forEach((path) => {
          try {
            const shapes = path.toShapes(true);
            
            shapes.forEach((shape) => {
              try {
                // Create extrusion geometry
                const geometry = new THREE.ExtrudeGeometry(shape, {
                  depth: extrusion,
                  bevelEnabled: true,
                  bevelThickness: 0.2,
                  bevelSize: 0.1,
                  bevelSegments: 2
                });
                
                // Create material
                const material = new THREE.MeshStandardMaterial({
                  color: new THREE.Color(path.color.r || 0.5, path.color.g || 0.5, path.color.b || 0.5),
                  side: THREE.DoubleSide,
                  metalness: 0.1,
                  roughness: 0.7
                });
                
                // Create mesh and add to group
                const mesh = new THREE.Mesh(geometry, material);
                group.add(mesh);
                shapesCreated++;
              } catch (shapeErr) {
                console.error("Error creating shape:", shapeErr);
              }
            });
          } catch (pathErr) {
            console.error("Error processing path:", pathErr);
          }
        });
        
        // If we created shapes, proceed with setup
        if (shapesCreated > 0) {
          setDebugInfo(prev => prev + `\nCreated ${shapesCreated} shapes`);
          
          // Center the model
          const box = new THREE.Box3().setFromObject(group);
          const center = new THREE.Vector3();
          const size = new THREE.Vector3();
          
          box.getCenter(center);
          box.getSize(size);
          
          // Translate to center
          group.position.sub(center);
          
          // Add to scene
          if (svgGroup.current) {
            svgGroup.current.add(group);
          } else {
            console.error("svgGroup ref lost during processing");
            scene.add(group); // Emergency fallback
          }
          
          // Calculate scale - IMPROVED SCALING
          const maxDim = Math.max(size.x, size.y, size.z, 0.1);
          
          // Use a much smaller scale factor to make the model more visible
          // We divide by maxDim to normalize the size, then multiply by a reasonable factor
          let newScale = 0.02; // Default small scale
          
          if (maxDim > 0.1) {
            // Calculate more appropriate scale based on model size
            newScale = Math.min(5 / maxDim, 0.02); // Cap the maximum scale
          }
          
          // Make sure the scale is neither too large nor too small
          newScale = Math.max(Math.min(newScale, 0.02), 0.001);
          
          setScaleVal(newScale);
          console.log("Setting scale to:", newScale, "for model size:", maxDim);
          
          // Position camera - IMPROVED POSITIONING with 6x distance
          const distance = 180; // Increased from 90 to 180 (additional 2x, total 6x)
          camera.position.set(0, 0, distance);
          camera.lookAt(0, 0, 0);
          
          setDebugInfo(prev => prev + `\nModel positioned with scale ${newScale.toFixed(5)}, size: ${maxDim.toFixed(2)}`);
          setLoaded(true);
        } else {
          // No shapes created - use fallback
          setDebugInfo(prev => prev + "\nNo shapes could be created from SVG");
          createBasicShape();
        }
      } catch (processErr) {
        console.error("Error processing SVG data:", processErr);
        setError("Error processing SVG: " + (processErr instanceof Error ? processErr.message : String(processErr)));
        createBasicShape();
      }
    }
    
    // Function to create a basic shape when SVG fails
    function createBasicShape() {
      try {
        if (!svgGroup.current) {
          console.error("svgGroup.current is null in createBasicShape");
          // Create emergency group
          const group = new THREE.Group();
          scene.add(group);
          svgGroup.current = group;
        }
        
        // Clear any existing children
        while (svgGroup.current.children.length > 0) {
          svgGroup.current.remove(svgGroup.current.children[0]);
        }
        
        // Create a cube
        const geometry = new THREE.BoxGeometry(10, 10, extrusion);
        const material = new THREE.MeshStandardMaterial({ 
          color: 0x888888,
          metalness: 0.1,
          roughness: 0.8
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Add wireframe
        const wireframe = new THREE.LineSegments(
          new THREE.WireframeGeometry(geometry),
          new THREE.LineBasicMaterial({ color: 0x000000 })
        );
        mesh.add(wireframe);
        
        svgGroup.current.add(mesh);
        
        // Set scale and camera with 6x distance
        setScaleVal(0.2);
        camera.position.set(0, 0, 150); // Increased from 75 to 150 (additional 2x, total 6x)
        camera.lookAt(0, 0, 0);
        
        setDebugInfo(prev => prev + "\nCreated fallback 3D shape");
        setLoaded(true);
      } catch (err) {
        console.error("Error creating basic shape:", err);
        setError("Failed to create fallback shape");
        setLoaded(true);
      }
    }
    
    // Cleanup function
    return () => {
      // Nothing specific to clean up
    };
  }, [svgContent, camera, extrusion, scene]);

  // Return the model with dynamic scale - don't use the ref for rendering since we're manually creating the group
  return (
    <>
      {/* Error state */}
      {error && (
        <Html center>
          <div className="p-4 bg-red-100 text-red-800 rounded max-w-md">
            <h3 className="font-bold mb-2">Error Loading 3D Model</h3>
            <p>{error}</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-red-600">Debug Details</summary>
              <pre className="mt-2 text-xs bg-red-50 p-2 overflow-auto max-h-40">{debugInfo}</pre>
            </details>
          </div>
        </Html>
      )}
      
      {/* Loading state */}
      {!loaded && !error && (
        <Html center>
          <div className="p-4 bg-blue-100 text-blue-800 rounded">
            <div className="animate-pulse flex space-x-2 items-center">
              <div className="rounded-full bg-blue-400 h-3 w-3 animate-bounce"></div>
              <div className="rounded-full bg-blue-400 h-3 w-3 animate-bounce delay-150"></div>
              <div className="rounded-full bg-blue-400 h-3 w-3 animate-bounce delay-300"></div>
              <div className="ml-2">Loading 3D model...</div>
            </div>
            <div className="mt-2 text-xs text-blue-600">{debugInfo}</div>
            {debugInfo.includes('found') && (
              <button 
                onClick={() => setLoaded(true)}
                className="mt-3 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded"
              >
                Show model anyway
              </button>
            )}
          </div>
        </Html>
      )}
      
      {/* Fallback mesh in case nothing else renders */}
      <mesh visible={false} scale={0.1}>
        <boxGeometry />
        <meshBasicMaterial color="hotpink" />
            </mesh>
    </>
  );
};

// Basic HTML SVG renderer
const SVGInHTML = ({ svgContent }: { svgContent: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && svgContent) {
      containerRef.current.innerHTML = svgContent;
      
      // Style any SVG element for better visibility
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        svg.style.maxWidth = '100%';
        svg.style.height = 'auto';
        svg.style.display = 'block';
        svg.style.margin = '0 auto';
      }
    }
  }, [svgContent]);
  
  return <div ref={containerRef} className="max-w-full" />;
};

// AR/3D View Overlay Component 
const AR3DView = ({ svgContent, onClose }: { svgContent: string; onClose: () => void }) => {
  const [extrusion, setExtrusion] = useState(2);
  const [viewMode, setViewMode] = useState<'3d' | 'ar'>('3d');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [isModelVisible, setIsModelVisible] = useState(false);
  const [modelScale, setModelScale] = useState(0.001); // Even smaller default scale value (reduced from 0.002)
  
  const capabilities = useDeviceCapabilities();
  const canvasRef = useRef<any>(null);

  // Function to reset camera view
  const resetCamera = () => {
    if (canvasRef.current?.controls) {
      canvasRef.current.controls.reset();
      setDebugInfo("Camera view reset");
    }
  };

  // Function to zoom out camera more
  const zoomOutMore = () => {
    if (canvasRef.current?.camera) {
      const camera = canvasRef.current.camera;
      const currentZ = camera.position.z;
      camera.position.set(0, 0, currentZ * 1.5); // Zoom out 50% more
      setDebugInfo("Camera zoomed out more");
    }
  };

  // Function to generate QR code for AR view
  const generateQRCode = () => {
    setIsGeneratingQR(true);
    
    // In a real app, this would generate a URL that opens AR experience on mobile
    // For demo, creating a simulated delay
    setTimeout(() => {
      // This is a placeholder - in a real app, you would generate a unique URL for this SVG
      // and encode it in a QR code
      setQrCodeUrl('https://placeholder-qr-code-url.com');
      setIsGeneratingQR(false);
    }, 1500);
  };

  // When component mounts, start a timer to force model visibility
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isModelVisible) {
        setIsModelVisible(true);
        setDebugInfo("Forced model visibility after timeout");
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [isModelVisible]);

  // Add a zoom in function to the AR3DView component
  // Function to zoom in camera
  const zoomInMore = () => {
    if (canvasRef.current?.camera) {
      const camera = canvasRef.current.camera;
      const currentZ = camera.position.z;
      camera.position.set(0, 0, currentZ / 1.5); // Zoom in by reducing distance
      setDebugInfo("Camera zoomed in more");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <button 
        className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg"
        onClick={onClose}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      
      {/* Controls panel */}
      <div className="absolute top-4 left-4 z-10 bg-white bg-opacity-90 rounded-lg shadow-lg p-3">
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Extrusion Depth</label>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={extrusion}
            onChange={(e) => setExtrusion(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">{extrusion.toFixed(1)}</div>
        </div>
        
        {/* Model scale slider with wider range */}
        <div className="mb-3 relative">
          <div className="flex items-center">
            <label className="block text-sm font-medium text-gray-700 mb-1">Model Scale</label>
            <div className="relative ml-1 group">
              <button 
                type="button" 
                className="text-gray-400 hover:text-gray-600 text-xs rounded-full h-4 w-4 flex items-center justify-center"
              >
                ?
              </button>
              <div className="absolute hidden group-hover:block left-0 bottom-full mb-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg max-w-xs z-10">
                Adjust this slider if the model appears too small or too large. 
                Lower values make the model smaller, higher values make it larger.
              </div>
            </div>
          </div>
          <input
            type="range"
            min="0.0002"
            max="0.05"
            step="0.0001"
            value={modelScale}
            onChange={(e) => setModelScale(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Smaller</span>
            <span>{modelScale.toFixed(3)}</span>
            <span>Larger</span>
          </div>
        </div>
        
        {/* Replace the Scale Presets section with Zoom controls */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Camera Controls</label>
          <div className="grid grid-cols-2 gap-1">
            <button 
              className="text-xs bg-gray-100 hover:bg-gray-200 p-1 rounded flex items-center justify-center"
              onClick={() => zoomInMore()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              Zoom In
            </button>
            <button 
              className="text-xs bg-gray-100 hover:bg-gray-200 p-1 rounded flex items-center justify-center"
              onClick={() => zoomOutMore()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              Zoom Out
            </button>
          </div>
        </div>
        
        {/* Add a button to auto-fit model scale at the bottom of the control panel */}
        <button 
          className="w-full px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center justify-center"
          onClick={() => {
            // Auto-adjust scale based on model size
            setModelScale(0.001); // Reset to a much smaller value (reduced from 0.002)
            setDebugInfo("Auto-adjusted model scale");
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <path d="M15 3h6v6"></path>
            <path d="M9 21H3v-6"></path>
            <path d="M21 3l-7 7"></path>
            <path d="M3 21l7-7"></path>
          </svg>
          Auto-fit Model
        </button>
        
        {capabilities.hasAR && (
          <div className="mb-2 mt-2">
            <div className="flex space-x-1">
              <button 
                className={`flex-1 px-2 py-1 text-xs rounded-l-md ${viewMode === '3d' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => setViewMode('3d')}
              >
                3D View
              </button>
              <button 
                className={`flex-1 px-2 py-1 text-xs rounded-r-md ${viewMode === 'ar' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => {
                  setViewMode('ar');
                  if (!qrCodeUrl) generateQRCode();
                }}
              >
                AR View
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-3 space-y-1">
          <button 
            className="w-full px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
            onClick={resetCamera}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z"></path>
              <path d="M17 12H7"></path>
              <path d="M12 17V7"></path>
            </svg>
            Reset View
          </button>
          
          <button 
            className="w-full px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
            onClick={() => setIsModelVisible(!isModelVisible)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            {isModelVisible ? 'Hide Model' : 'Show Model'}
          </button>
        </div>
        
        {debugInfo && (
          <div className="mt-2 text-xs text-gray-600 border-t pt-2">
            {debugInfo}
          </div>
        )}
      </div>
      
      {/* QR Code overlay for AR on mobile */}
      {viewMode === 'ar' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-20">
          <div className="bg-white p-6 rounded-lg max-w-sm text-center">
            <h3 className="text-lg font-bold mb-3">View in AR on your mobile device</h3>
            
            {isGeneratingQR ? (
              <div className="py-10 px-12">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="rounded-lg bg-gray-200 h-40 w-40 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ) : qrCodeUrl ? (
              <div className="py-4">
                <div className="bg-gray-100 h-48 w-48 mx-auto flex items-center justify-center border">
                  {/* In a real app, this would be an actual QR code image */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <rect x="7" y="7" width="3" height="3"></rect>
                    <rect x="14" y="7" width="3" height="3"></rect>
                    <rect x="7" y="14" width="3" height="3"></rect>
                    <rect x="14" y="14" width="3" height="3"></rect>
                  </svg>
                </div>
                <p className="text-sm text-gray-600 mt-4">Scan with your mobile device camera</p>
              </div>
            ) : (
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                onClick={generateQRCode}
              >
                Generate QR Code
              </button>
            )}
            
            <button
              className="mt-4 text-sm text-blue-600"
              onClick={() => setViewMode('3d')}
            >
              Back to 3D View
            </button>
          </div>
        </div>
      )}
      
      {/* Visible loading indicator while model is loading */}
      {!isModelVisible && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-white bg-opacity-80 p-4 rounded-lg shadow-lg">
            <div className="flex items-center">
              <svg className="animate-spin mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading 3D Model...</span>
            </div>
            <button
              className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded text-sm"
              onClick={() => setIsModelVisible(true)}
            >
              Show Model Anyway
            </button>
          </div>
        </div>
      )}
      
      {/* 3D canvas with more distant camera */}
      <Canvas 
        ref={canvasRef}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]} // Responsive to screen density
        camera={{ position: [0, 0, 600], fov: 45, near: 0.1, far: 4000 }} // Increased from 300 to 600 (additional 2x, total 6x)
        style={{ background: '#f8f8f8' }}
        shadows
        onCreated={(state) => {
          // Store reference to controls for reset button
          if (canvasRef.current) {
            canvasRef.current.controls = state.controls;
            canvasRef.current.camera = state.camera;
          }
          console.log("Canvas created with Three.js version:", THREE.REVISION);
          setDebugInfo("3D Canvas initialized");
          
          // Force model to be visible after canvas is created
          setTimeout(() => {
            setIsModelVisible(true);
          }, 1000);
        }}
      >
        {/* Scene lighting */}
        <color attach="background" args={['#f8f8f8']} />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <spotLight position={[-10, -10, 10]} angle={0.3} intensity={0.5} castShadow />
        <directionalLight
          position={[5, 5, 5]}
          intensity={0.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        
        {/* Use PresentationControls for intuitive interaction */}
        <PresentationControls
          global
          rotation={[0, 0, 0]}
          polar={[-Math.PI / 3, Math.PI / 3]}
          azimuth={[-Math.PI / 3, Math.PI / 3]}
          config={{ mass: 1, tension: 170, friction: 26 }}
          snap={{ mass: 4, tension: 400, friction: 40 }}
        >
          {/* SVG 3D model - Only render when isModelVisible is true */}
          {isModelVisible && 
            <group scale={modelScale}>
              <SVGIn3D svgContent={svgContent} extrusion={extrusion} />
            </group>
          }
          
          {/* Fallback geometry if no model is visible */}
          {!isModelVisible && (
            <mesh scale={[3, 3, 3]} visible={true}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial color="#cccccc" wireframe />
            </mesh>
          )}
        </PresentationControls>
        
        {/* Standard OrbitControls for additional control with increased max distance */}
        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
          minDistance={5}
          maxDistance={1200} // Increased from 600 to 1200 (additional 2x, total 6x)
          makeDefault
        />
        
        {/* Ground plane with grid for better spatial reference */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -10, 0]} 
          receiveShadow
        >
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#f0f0f0" />
          <gridHelper args={[100, 20, '#ccc', '#ddd']} rotation={[Math.PI / 2, 0, 0]} />
        </mesh>
        
        {/* Add coordinate helpers for orientation */}
        <axesHelper args={[10]} />
      </Canvas>
      
      {/* Interactive controls at bottom */}
      <div className="absolute inset-x-0 bottom-4 flex justify-center space-x-2 z-10">
        <button 
          onClick={resetCamera}
          className="px-3 py-1.5 bg-white rounded-lg shadow-lg text-sm flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
          </svg>
          Reset
        </button>
        <button 
          onClick={zoomInMore}
          className="px-3 py-1.5 bg-white rounded-lg shadow-lg text-sm flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          Zoom In
        </button>
        <button 
          onClick={zoomOutMore}
          className="px-3 py-1.5 bg-white rounded-lg shadow-lg text-sm flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          Zoom Out
        </button>
        <button 
          onClick={() => setIsModelVisible(!isModelVisible)}
          className="px-3 py-1.5 bg-white rounded-lg shadow-lg text-sm flex items-center"
        >
          {isModelVisible ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
              Hide Model
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Show Model
            </>
          )}
        </button>
        {capabilities.hasAR && (
          <button 
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg shadow-lg text-sm flex items-center"
            onClick={() => setViewMode('ar')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M21 7v6M3 7v6m0-6h18M3 13h18"></path>
              <rect x="7" y="3" width="10" height="18" rx="2"></rect>
            </svg>
            View in AR
          </button>
        )}
      </div>
    </div>
  );
};

// Component to display view options based on device capabilities
const ViewOptions = ({ 
  svgContent, 
  onModelLoadStart, 
  onModelLoadComplete 
}: { 
  svgContent: string; 
  onModelLoadStart: () => void; 
  onModelLoadComplete: () => void 
}) => {
  const [showAR, setShowAR] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const capabilities = useDeviceCapabilities();
  
  // Better error handling
  const handleARClick = () => {
    if (!svgContent || svgContent.trim() === '') {
      setLoadingError("Cannot load 3D view: SVG content is empty");
      setTimeout(() => setLoadingError(null), 3000);
        } else {
      // Signal model loading start
      onModelLoadStart();
      
      // Show the AR view
      setShowAR(true);
      
      // When AR view is closed, signal completion
      setTimeout(() => {
        onModelLoadComplete();
      }, 1000);
    }
  };
  
  // When AR view closes, signal completion
  const handleARClose = () => {
    setShowAR(false);
    onModelLoadComplete();
  };
  
  if (capabilities.isLoading) {
    return (
      <div className="flex justify-center mt-2">
        <div className="inline-flex items-center px-4 py-2 rounded-md bg-gray-100 text-gray-500 text-sm">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Checking capabilities...
        </div>
      </div>
    );
  }

  if (!capabilities.has3D) {
    return null; // Don't show options if 3D is not supported
  }
  
  if (showAR) {
    return <AR3DView svgContent={svgContent} onClose={handleARClose} />;
  }
  
  return (
    <div className="mt-4 flex flex-col items-center">
      {loadingError && (
        <div className="mb-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">
          {loadingError}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 justify-center">
        <button 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow transition-colors"
          onClick={handleARClick}
          title="Open interactive 3D view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          View in 3D
        </button>
        
        {capabilities.hasAR && (
          <button 
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg shadow transition-colors"
            onClick={handleARClick}
            title="View in augmented reality on compatible devices"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6M3 7v6m0-6h18M3 13h18"></path>
              <rect x="7" y="3" width="10" height="18" rx="2"></rect>
            </svg>
            View in AR
          </button>
        )}
      </div>
      
      <div className="mt-2 text-gray-500 text-xs italic">
        Opens a 3D interactive model of the diagram
      </div>
    </div>
  );
};

const SVGRenderer: React.FC<SVGRendererProps> = ({ svgContent }) => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [forceModelShow, setForceModelShow] = useState(false);
  const capabilities = useDeviceCapabilities();
  
  // Smooth highlight animation to draw attention to 3D/AR features
  useEffect(() => {
    if (capabilities.has3D && !hasInteracted) {
      const timer = setTimeout(() => {
        setHasInteracted(true);
      }, 5000); // Stop highlighting after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [capabilities.has3D, hasInteracted]);

  return (
    <div className="svg-container my-4">
      <div className="overflow-auto max-w-full bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <SVGInHTML svgContent={svgContent} />
      </div>
      
      {/* Add a notice about model loading if it's been requested but not shown yet */}
      {forceModelShow && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-center text-sm text-blue-700">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading 3D model. This may take a moment...
        </div>
      )}
      
      {/* Show AR/3D viewing options with highlight animation for new users */}
      {capabilities.has3D && (
        <div className="mt-4 flex flex-wrap justify-center">
          <div className={`relative transition-all duration-300 ${!hasInteracted ? 'animate-pulse' : ''}`}>
            <ViewOptions 
              svgContent={svgContent} 
              onModelLoadStart={() => setForceModelShow(true)} 
              onModelLoadComplete={() => setForceModelShow(false)}
            />
            
            {/* Highlight indicator for new users */}
            {!hasInteracted && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                New
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Info text about 3D/AR features */}
      {capabilities.has3D && !capabilities.isLoading && (
        <div className="mt-2 text-center text-xs text-gray-500">
          {capabilities.hasAR 
            ? "View this SVG in 3D or Augmented Reality on compatible devices" 
            : "View this SVG in interactive 3D"}
        </div>
      )}
    </div>
  );
};

export default SVGRenderer; 