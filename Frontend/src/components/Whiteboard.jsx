import React, {
    useRef,
    useEffect,
    useImperativeHandle,
    forwardRef,
    useState,
  } from "react";
  import "./Whiteboard.css";
  
  const Whiteboard = forwardRef(
    ({ tool, color, lineWidth, setCanUndo, setCanRedo }, ref) => {
      const canvasRef = useRef(null);
      const ctxRef = useRef(null);
      const isDrawing = useRef(false);
      const [paths, setPaths] = useState([]);
      const [redoStack, setRedoStack] = useState([]);
      const [previewShape, setPreviewShape] = useState(null); // for live preview of shapes
  
      // Setup canvas size and context with device pixel ratio correction
      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
          console.log("Whiteboard useEffect: Canvas not available.");
          return;
        }
  
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          console.log("Whiteboard useEffect: Canvas context not available.");
          return;
        }
  
        ctxRef.current = ctx;
        console.log("Whiteboard useEffect: Canvas context initialized.", ctx);
  
        const resizeCanvas = () => {
          const parent = canvas.parentElement;
          if (!parent) {
            console.log("resizeCanvas: Parent element not found.");
            return;
          }
  
          const rect = parent.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
  
          // Set the canvas's internal size to be higher for HiDPI displays
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
  
          // Scale the context so that drawing operations are done at the logical pixel level
          ctx.scale(dpr, dpr);
  
          // Set the canvas's display size using CSS
          canvas.style.width = `${rect.width}px`;
          canvas.style.height = `${rect.height}px`;
  
          // Restore drawing styles after scaling
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          // Re-apply tool-specific settings like globalCompositeOperation and globalAlpha
           if (tool === "eraser") {
              ctx.globalCompositeOperation = "destination-out";
          } else if (tool === "highlighter") {
              ctx.globalCompositeOperation = "multiply";
              ctx.globalAlpha = 0.5;
          } else {
              ctx.globalCompositeOperation = "source-over";
               ctx.globalAlpha = 1.0;
          }
           ctx.strokeStyle = color; // Apply current color
           ctx.lineWidth = lineWidth; // Apply current line width
  
          console.log("resizeCanvas: Canvas resized to", rect.width, "x", rect.height, "(display)", canvas.width, "x", canvas.height, "(internal)");
          console.log("resizeCanvas: Context scaled by", dpr);
  
          // Redraw existing paths after resize
          redraw(paths, previewShape);
        };
  
        resizeCanvas();
  
        window.addEventListener("resize", resizeCanvas);
  
        return () => {
          window.removeEventListener("resize", resizeCanvas);
          console.log("Whiteboard useEffect cleanup: Resize listener removed.");
        };
      }, [paths, previewShape, tool, color, lineWidth]); // Added dependencies
  
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
        console.log("drawPath: Drawing path for tool", path.tool);
        // Save state for path specific styles
        ctx.save();
  
        if (path.tool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)"; // Eraser color doesn't matter with destination-out
          ctx.lineWidth = path.lineWidth;
          ctx.beginPath();
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.stroke();
        } else if (path.tool === "pencil" || path.tool === "highlighter") {
           if (path.tool === "highlighter") {
             ctx.globalCompositeOperation = "multiply";
             ctx.globalAlpha = 0.5;
           } else {
             ctx.globalCompositeOperation = "source-over";
             ctx.globalAlpha = 1.0;
           }
          ctx.strokeStyle = path.color;
          ctx.lineWidth = path.lineWidth;
          ctx.beginPath();
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.stroke();
        } else if (path.tool === "rectangle" || path.tool === "circle" || path.tool === "line" || path.tool === "arrow") {
           ctx.globalCompositeOperation = "source-over";
           ctx.globalAlpha = 1.0;
          ctx.strokeStyle = path.color;
          ctx.lineWidth = path.lineWidth;
          drawShape(ctx, path);
        }
  
        // Restore state after path specific styles
        ctx.restore();
        console.log("drawPath: Finished drawing path.");
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
  
      // Get mouse or touch position relative to canvas, adjusted for scaling
      const getCoordinates = (e) => {
        console.log("getCoordinates: Raw event clientX/Y", e.clientX, e.clientY);
        const canvas = canvasRef.current;
        if (!canvas) {
          console.log("getCoordinates: Canvas not available.");
          return { x: 0, y: 0 };
        }
  
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1; // Get device pixel ratio
  
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          clientX = e.clientX;
          clientY = e.clientY;
        }
  
        // Calculate position relative to the canvas element's top-left corner
        const x = clientX - rect.left;
        const y = clientY - rect.top;
  
        // Scale the coordinates by the device pixel ratio to match the canvas's internal resolution
        const scaledX = x * dpr;
        const scaledY = y * dpr;
  
        console.log("getCoordinates: Processed coordinates (scaled)", scaledX, scaledY);
  
        return {
          x: scaledX,
          y: scaledY,
        };
      };
  
      const startDrawing = (e) => {
        // Check if the primary mouse button is pressed (for desktop)
         if (e.type === 'mousedown' && e.button !== 0) {
            return; // Only proceed if left mouse button
        }
        e.preventDefault(); // Prevent default touch/mouse behavior
        isDrawing.current = true;
        const point = getCoordinates(e);
  
        if (tool === "pencil" || tool === "eraser" || tool === "highlighter") {
          // Start a new path for free drawing tools
          setPaths((prev) => [
            ...prev,
            { tool, color, lineWidth, points: [point] },
          ]);
        } else if (tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") {
          // Start a new shape with the initial point for shape tools
          setPreviewShape({
            tool,
            color,
            lineWidth,
            points: [point, point], // Start and end points are initially the same
          });
        }
        setRedoStack([]); // Clear redo stack on new drawing action
        setCanUndo(true); // Can always undo after a drawing action
        setCanRedo(false); // Cannot redo after a new drawing action
      };
  
      const draw = (e) => {
        if (!isDrawing.current) return;
        // Only track movement if the primary button is held down (for desktop)
        if (e.type === 'mousemove' && e.buttons === 0) {
            return; // Stop drawing if mouse button is released during move
        }
        e.preventDefault(); // Prevent default touch/mouse behavior

        const point = getCoordinates(e);
        const ctx = ctxRef.current;

        if (tool === "pencil" || tool === "eraser" || tool === "highlighter") {
           if (!ctx) return;
            // For free drawing tools, draw directly on the canvas
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
             // Add the point to the current path in the state for saving/undo/redo later
             setPaths((prev) => {
                const newPaths = [...prev];
                const currentPath = newPaths[newPaths.length - 1];
                 // Prevent adding the same point multiple times if mouse doesn't move
                 if (currentPath.points[currentPath.points.length - 1].x !== point.x || currentPath.points[currentPath.points.length - 1].y !== point.y) {
                     currentPath.points.push(point);
                 }
                return newPaths;
            });

        } else if (tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") {
          // For shape tools, update the end point of the preview shape
          setPreviewShape((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              points: [prev.points[0], point], // Update the end point while keeping the start point
            };
          });
        }
      };
  
      const stopDrawing = (e) => {
        // Check if the event is a mouseup and the primary button was released
         if (e.type === 'mouseup' && e.button !== 0) {
             return; // Only stop drawing if left mouse button is released
         }
         // For touch events, onTouchEnd will handle stopping.

        if (!isDrawing.current) return; // Only stop if currently drawing

        isDrawing.current = false;

        const ctx = ctxRef.current;
        if (!ctx) return;

        if (tool === "pencil" || tool === "eraser" || tool === "highlighter") {
            // For free drawing tools, finalize the path (already drawn, just ensure path is complete in state)
            ctx.closePath(); // Optional: Close the path
             // The path is already added to state in the draw function, so no need to add it again here

        } else if (tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") {
          // Finalize the shape after drawing stops
          if (previewShape) {
            // Only add the shape to paths if it's not just a single point (no movement)
            if (previewShape.points.length > 1 && (previewShape.points[0].x !== previewShape.points[1].x || previewShape.points[0].y !== previewShape.points[1].y)) {
                 setPaths((prev) => [...prev, previewShape]); // Add the finalized shape to the paths
                 setCanUndo(true); // Can undo after adding a shape
                 setCanRedo(false); // Cannot redo after a new shape is added
            }
            setPreviewShape(null); // Clear the preview shape
          }
        }
         // For free drawing tools (pencil, eraser, highlighter), the path is added in the 'draw' function on each mousemove.
         // So here we just stop the drawing flag.
      };
  
      useImperativeHandle(ref, () => ({
        // Undo the last drawing action
        undo() {
          setPaths((prev) => {
            if (prev.length === 0) return prev; // Cannot undo if there are no paths
            const newPaths = [...prev];
            const undone = newPaths.pop(); // Remove the last path
            setRedoStack((r) => [...r, undone]); // Add the undone path to the redo stack
            setCanUndo(newPaths.length > 0); // Can undo if there are still paths left
            setCanRedo(true); // Can redo after an undo action
            // Redraw the canvas with the updated paths (this is handled by the useEffect on paths)
            return newPaths;
          });
        },
        // Redo the last undone drawing action
        redo() {
          setRedoStack((prev) => {
            if (prev.length === 0) return prev; // Cannot redo if there are no undone paths
            const redoPaths = [...prev];
            const restored = redoPaths.pop(); // Get the last undone path from the redo stack
            setPaths((p) => [...p, restored]); // Add the restored path back to the paths
            setCanUndo(true); // Can undo after a redo action
            setCanRedo(redoPaths.length > 0); // Can redo if there are still paths in the redo stack
            // Redraw the canvas with the updated paths (this is handled by the useEffect on paths)
            return redoPaths;
          });
        },
        // Clear the entire canvas
        clear() {
          setPaths([]); // Clear all paths
          setRedoStack([]); // Clear the redo stack
          setCanUndo(false); // Cannot undo after clearing
          setCanRedo(false); // Cannot redo after clearing
          // Explicitly clear canvas and redraw background
          const canvas = canvasRef.current;
          const ctx = ctxRef.current;
          if(canvas && ctx) {
             const rect = canvas.getBoundingClientRect();
             // Clear using the logical dimensions
            ctx.clearRect(0, 0, rect.width, rect.height);
             // Re-apply background after clearing
            ctx.fillStyle = '#1e1e1e'; // Use the dark theme background
            ctx.fillRect(0, 0, rect.width, rect.height);
          }
        },
        // Force a canvas redraw (useful for external triggers like toggling visibility)
        forceCanvasUpdate: () => {
            redraw(paths, previewShape);
        }
      }));
  
      return (
        // Add a container div to manage the canvas size if needed, or rely on parent flex/grid
        // For now, assuming parent handles layout and canvas fills it due to CSS width/height 100%
        <canvas
          ref={canvasRef}
          className="whiteboard-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing} // Treat mouse leaving as stopping drawing
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing} // Use onTouchEnd for touch release
          // Prevent default touch actions like scrolling and zooming
          // style={{ touchAction: 'none' }} is already handled by CSS class
        />
      );
    }
  );
  
  export default Whiteboard;
  