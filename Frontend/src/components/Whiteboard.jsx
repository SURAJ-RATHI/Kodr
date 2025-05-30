import React, {
    useRef,
    useEffect,
    useImperativeHandle,
    forwardRef,
    useState,
  } from "react";
  import { FaExpand, FaCompress } from 'react-icons/fa';
  import "./Whiteboard.css";
  
  const Whiteboard = forwardRef(
    ({ tool, color = "#4a9eff", lineWidth, setCanUndo, setCanRedo }, ref) => {
      const canvasRef = useRef(null);
      const ctxRef = useRef(null);
      const isDrawing = useRef(false);
      const [paths, setPaths] = useState([]);
      const [redoStack, setRedoStack] = useState([]);
      const [previewShape, setPreviewShape] = useState(null);
      const [isMaximized, setIsMaximized] = useState(false);
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
  
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
  
          ctx.scale(dpr, dpr);
  
          canvas.style.width = `${rect.width}px`;
          canvas.style.height = `${rect.height}px`;
  
          ctxRef.current = ctx;
  
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
  
          redraw(paths, previewShape);
        };
  
        resizeCanvas();
  
        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(canvas.parentElement);
  
        window.addEventListener('resize', resizeCanvas);
  
        return () => {
          resizeObserver.disconnect();
          window.removeEventListener('resize', resizeCanvas);
        };
      }, [color, lineWidth, paths, previewShape]);
  
      useEffect(() => {
        const ctx = ctxRef.current;
        if(!ctx) return;
  
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
  
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
  
        redraw(paths, previewShape);
      }, [tool, color, lineWidth]);
  
      // Update undo/redo button states
      useEffect(() => {
        setCanUndo(paths.length > 0);
        setCanRedo(redoStack.length > 0);
      }, [paths, redoStack, setCanUndo, setCanRedo]);
  
      const redraw = (pathsToDraw, preview) => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
  
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, rect.width, rect.height);
  
        ctx.save();
  
        for (const path of pathsToDraw) {
          drawPath(ctx, path);
        }
  
        if (preview) {
          ctx.save();
          ctx.strokeStyle = preview.color;
          ctx.lineWidth = preview.lineWidth;
          ctx.setLineDash([5, 5]);
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
  
        ctx.restore();
      };
  
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
  
      const drawShape = (ctx, shape) => {
        const points = shape.points;
        if (points.length < 2) return;
  
        const start = points[0];
        const end = points[points.length - 1];
  
        ctx.beginPath();
  
        switch (shape.tool) {
          case "rectangle": {
            const x = Math.min(start.x, end.x);
            const y = Math.min(start.y, end.y);
            const width = Math.abs(end.x - start.x);
            const height = Math.abs(end.y - start.y);
            ctx.strokeRect(x, y, width, height);
            break;
          }
          case "circle": {
            const centerX = (start.x + end.x) / 2;
            const centerY = (start.y + end.y) / 2;
            const radiusX = Math.abs(end.x - start.x) / 2;
            const radiusY = Math.abs(end.y - start.y) / 2;
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
            break;
          }
          case "line":
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            break;
          case "arrow": {
            const headLength = 20;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
  
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
  
            ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
  
            ctx.stroke();
            break;
          }
        }
      };
  
      const getCanvasCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
  
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
  
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          clientX = e.clientX;
          clientY = e.clientY;
        }
  
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
  
          const newPath = {
            tool,
            color,
            lineWidth,
            points: [coords],
          };
  
          setPaths(prev => [...prev, newPath]);
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
          ctx.beginPath();
          ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
  
          lastPoint.current = coords;
  
          setPaths(prev => {
            const newPaths = [...prev];
            const currentPath = newPaths[newPaths.length - 1];
            if (currentPath) {
              currentPath.points.push(coords);
            }
            return newPaths;
          });
        } else if (tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") {
          setPreviewShape(prev => ({
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
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1.0;
        }
  
        if (tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") {
          if (previewShape) {
            const [start, end] = previewShape.points;
            if (Math.abs(end.x - start.x) > 1 || Math.abs(end.y - start.y) > 1) {
              setPaths(prev => [...prev, previewShape]);
            }
            setPreviewShape(null);
          }
        }
        lastPoint.current = null;
      };
  
      const handleMaximizeToggle = () => {
        setIsMaximized(!isMaximized);
        setTimeout(() => {
          if (ref) {
            ref.current.forceCanvasUpdate();
          }
        }, 300);
      };
  
      useImperativeHandle(ref, () => ({
        undo() {
          if (paths.length === 0) return;
          
          const lastPath = paths[paths.length - 1];
          setPaths(prev => prev.slice(0, -1));
          setRedoStack(prev => [...prev, lastPath]);
        },
        redo() {
          if (redoStack.length === 0) return;
          
          const pathToRestore = redoStack[redoStack.length - 1];
          setRedoStack(prev => prev.slice(0, -1));
          setPaths(prev => [...prev, pathToRestore]);
        },
        clear() {
          setPaths([]);
          setRedoStack([]);
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
        forceCanvasUpdate() {
          redraw(paths, previewShape);
        }
      }));
  
      return (
        <div className={`whiteboard-container ${isMaximized ? 'maximized' : ''}`}>
          <button className="maximize-btn" onClick={handleMaximizeToggle}>
            {isMaximized ? <FaCompress /> : <FaExpand />}
          </button>
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
  