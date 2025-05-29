import React, {
    useRef,
    useEffect,
    useImperativeHandle,
    forwardRef,
    useState,
  } from "react";
  import "./Whiteboard.css";
  
  const Whiteboard = forwardRef(
    ({ tool, color = "#4a9eff", lineWidth, setCanUndo, setCanRedo }, ref) => {
      const canvasRef = useRef(null);
      const ctxRef = useRef(null);
      const isDrawing = useRef(false);
      const [paths, setPaths] = useState([]);
      const [previewShape, setPreviewShape] = useState(null); // for live preview of shapes
      const lastPoint = useRef(null);
  
      // Update canvas size and context with device pixel ratio correction
      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
  
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
  
        const resizeCanvas = () => {
          const rect = canvas.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
  
          // Set canvas size accounting for device pixel ratio
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
  
          // Scale context to match device pixel ratio
          ctx.scale(dpr, dpr);
  
          // Set canvas CSS size to match container
          canvas.style.width = `${rect.width}px`;
          canvas.style.height = `${rect.height}px`;
  
          // Store context for later use
          ctxRef.current = ctx;
  
          // Apply current settings
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
  
          // Redraw content
          redraw(paths, previewShape);
        };
  
        // Initial resize
        resizeCanvas();
  
        // Add resize observer for more accurate resizing
        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(canvas.parentElement);
  
        // Add window resize listener
        window.addEventListener('resize', resizeCanvas);
  
        // Cleanup
        return () => {
          resizeObserver.disconnect();
          window.removeEventListener('resize', resizeCanvas);
        };
      }, [color, lineWidth, paths, previewShape]); // Add dependencies
  
      useEffect(() => {
        console.log("Whiteboard tool/color/lineWidth useEffect: Settings changed.", { tool, color, lineWidth });
  
        // Re-apply tool-specific settings when tool/color/lineWidth changes
         const ctx = ctxRef.current;
         if(!ctx) return;
  
          if (tool === "eraser") {
              ctx.globalCompositeOperation = "destination-out";
               ctx.globalAlpha = 1.0; // Ensure opacity is 1 for eraser
          } else if (tool === "highlighter") {
              ctx.globalCompositeOperation = "multiply";
              ctx.globalAlpha = 0.5;
          } else {
              ctx.globalCompositeOperation = "source-over";
              ctx.globalAlpha = 1.0;
          }
  
           ctx.strokeStyle = color;
           ctx.lineWidth = lineWidth;
  
        // Redraw to show changes if necessary (e.g., highlighter opacity)
         redraw(paths, previewShape);
  
      }, [tool, color, lineWidth]); // Dependencies
  
      // Redraw all paths and optionally the preview shape (while dragging)
      const redraw = (pathsToDraw, preview) => {
        const ctx = ctxRef.current;
        if (!ctx) {
          console.log("redraw: Context not available.");
          return;
        }
        const canvas = canvasRef.current;
        if (!canvas) {
          console.log("redraw: Canvas not available.");
          return;
        }
        const rect = canvas.getBoundingClientRect();
  
        console.log("redraw: Clearing and redrawing canvas.");
  
        // Clear the canvas using the logical dimensions
        ctx.clearRect(0, 0, rect.width, rect.height);
  
        // Draw background explicitly after clearing
        ctx.fillStyle = '#1e1e1e'; // Use the dark theme background
        ctx.fillRect(0, 0, rect.width, rect.height);
  
        // Save current drawing state before drawing paths/preview
        ctx.save();
  
        // Draw existing paths/shapes
        console.log("redraw: Drawing", pathsToDraw.length, "existing paths.");
        for (const path of pathsToDraw) {
          drawPath(ctx, path);
        }
  
        // Draw preview shape on top (if any)
        if (preview) {
          console.log("redraw: Drawing preview shape.", preview);
          ctx.save();
          ctx.strokeStyle = preview.color;
          ctx.lineWidth = preview.lineWidth;
          ctx.setLineDash([5, 5]); // dashed for preview
           // Temporarily set composite operation and alpha for preview based on tool
           if (preview.tool === "highlighter") {
              ctx.globalCompositeOperation = "multiply";
              ctx.globalAlpha = 0.5;
          } else {
              ctx.globalCompositeOperation = "source-over";
               ctx.globalAlpha = 1.0;
          }
          drawShape(ctx, preview);
          ctx.restore();
        }
  
        // Restore the drawing state saved before drawing paths/preview
         ctx.restore();
        console.log("redraw: Finished redrawing.");
      };
  
      // Draw a path or shape on canvas context
      const drawPath = (ctx, path) => {
        if (!path.points || path.points.length === 0) return;
  
        ctx.save();
  
        if (path.tool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
        } else if (path.tool === "highlighter") {
          ctx.globalCompositeOperation = "multiply";
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = path.color;
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = path.color;
        }
  
        ctx.lineWidth = path.lineWidth;
  
        if (path.tool === "pencil" || path.tool === "eraser" || path.tool === "highlighter") {
          ctx.beginPath();
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.stroke();
        } else if (path.tool === "rectangle" || path.tool === "circle" || path.tool === "line" || path.tool === "arrow") {
          drawShape(ctx, path);
        }
  
        ctx.restore();
      };
  
      // Helper: Draw a shape (rectangle, circle, line, or arrow)
      const drawShape = (ctx, shape) => {
        console.log("drawShape: Drawing shape for tool", shape.tool);
        const points = shape.points;
        if (points.length < 2) {
          console.log("drawShape: Not enough points to draw shape.");
          return;
        }
  
        const start = points[0];
        const end = points[points.length - 1];
  
        ctx.beginPath();
  
        switch (shape.tool) {
          case "rectangle": {
            const x = Math.min(start.x, end.x);
            const y = Math.min(start.y, end.y);
            const width = Math.abs(end.x - start.x);
            const height = Math.abs(end.y - start.y);
            console.log("drawShape: Drawing rectangle at", x, y, "with dimensions", width, height);
            ctx.strokeRect(x, y, width, height);
            break;
          }
          case "circle": {
            const centerX = (start.x + end.x) / 2;
            const centerY = (start.y + end.y) / 2;
            // Use distance for radius for a perfect circle if desired, or separate radii for ellipse
            const radiusX = Math.abs(end.x - start.x) / 2;
            const radiusY = Math.abs(end.y - start.y) / 2;
             // To draw a circle based on the bounding box of the drag:
             // const radius = Math.max(radiusX, radiusY); // This variable is not used
             // Using ellipse to allow for non-circular shapes if needed later
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
            break;
          }
          case "line":
            console.log("drawShape: Drawing line from", start, "to", end);
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            break;
          case "arrow": {
            // Drawing an arrow involves a line and then calculating points for the arrowhead
            const headLength = 20;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
  
            // Draw the line part of the arrow
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
  
            // Draw the arrowhead lines
            ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
            // Move back to the end point to draw the other side of the arrowhead
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
  
            ctx.stroke();
            break;
          }
          default:
            console.log("drawShape: Unknown shape tool", shape.tool);
            break;
        }
        console.log("drawShape: Finished drawing shape.");
      };
  
      const getCanvasCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
  
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
  
        // Get the correct coordinates based on event type
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          clientX = e.clientX;
          clientY = e.clientY;
        }
  
        // Calculate coordinates accounting for device pixel ratio and canvas scaling
        const x = ((clientX - rect.left) * canvas.width) / (rect.width * dpr);
        const y = ((clientY - rect.top) * canvas.height) / (rect.height * dpr);
  
        return { x, y };
      };
  
      const startDrawing = (e) => {
        e.preventDefault();
        const coords = getCanvasCoordinates(e);
        isDrawing.current = true;
        lastPoint.current = coords;
  
        if (tool === "pencil" || tool === "eraser" || tool === "highlighter") {
          const ctx = ctxRef.current;
          if (!ctx) return;
  
          // Apply tool-specific settings
          if (tool === "eraser") {
            ctx.globalCompositeOperation = "destination-out";
            ctx.globalAlpha = 1.0;
          } else if (tool === "highlighter") {
            ctx.globalCompositeOperation = "multiply";
            ctx.globalAlpha = 0.5;
          } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1.0;
          }
  
          ctx.beginPath();
          ctx.moveTo(coords.x, coords.y);
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
  
          // Start a new path
          const newPath = {
            tool,
            color,
            lineWidth,
            points: [coords], // Store as object instead of array
          };
  
          setPaths((prevPaths) => [...prevPaths, newPath]);
        } else if (tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") {
          setPreviewShape({
            tool,
            color,
            lineWidth,
            points: [coords, coords],
          });
        }
      };
  
      const draw = (e) => {
        e.preventDefault();
        if (!isDrawing.current || !lastPoint.current) return;
  
        const coords = getCanvasCoordinates(e);
        const ctx = ctxRef.current;
        if (!ctx) return;
  
        if (tool === "pencil" || tool === "eraser" || tool === "highlighter") {
          // Draw line from last point to current point
          ctx.beginPath();
          ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
  
          // Update last point
          lastPoint.current = coords;
  
          // Add point to current path
          setPaths((prevPaths) => {
            const newPaths = [...prevPaths];
            const currentPath = newPaths[newPaths.length - 1];
            if (currentPath) {
              currentPath.points.push(coords); // Store as object
            }
            return newPaths;
          });
        } else if (tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") {
          // Update preview shape
          setPreviewShape((prev) => ({
            ...prev,
            points: [prev.points[0], coords],
          }));
        }
      };
  
      const stopDrawing = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
  
        const ctx = ctxRef.current;
        if (ctx) {
            // Reset composite operation and alpha
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1.0;
        }
  
        if (tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") {
            if (previewShape) {
                // Only add the shape if it's not just a single point
                const [start, end] = previewShape.points;
                if (Math.abs(end.x - start.x) > 1 || Math.abs(end.y - start.y) > 1) {
                    setPaths((prev) => [...prev, previewShape]);
                    setCanUndo(true);
                    setCanRedo(false);
                }
                setPreviewShape(null);
            }
        }
        lastPoint.current = null;
      };
  
      useImperativeHandle(ref, () => ({
        // Undo the last drawing action
        undo() {
            setPaths((prev) => {
                if (prev.length === 0) return prev;
                const newPaths = [...prev];
                newPaths.pop();
                setCanUndo(newPaths.length > 0);
                setCanRedo(true);
                return newPaths;
            });
        },
        // Redo the last undone drawing action
        redo() {
            setPaths((prev) => {
                if (prev.length === 0) return prev;
                const newPaths = [...prev];
                const restoredPath = newPaths.pop();
                setPaths(p => [...p, restoredPath]);
                setCanUndo(true);
                setCanRedo(newPaths.length > 0);
                return newPaths;
            });
        },
        // Clear the entire canvas
        clear() {
          setPaths([]);
          setCanUndo(false);
          setCanRedo(false);
          const canvas = canvasRef.current;
          const ctx = ctxRef.current;
          if (canvas && ctx) {
            const rect = canvas.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, rect.width, rect.height);
          }
        },
        // Force a canvas redraw
        forceCanvasUpdate() {
          redraw(paths, previewShape);
        }
      }));
  
      return (
        <div className="whiteboard-container">
          <canvas
            ref={canvasRef}
            className="whiteboard-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      );
    }
  );
  
  export default Whiteboard;
  