import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaPlay, FaCaretDown, FaSignInAlt, FaDrawPolygon, FaEdit, FaPencilAlt, FaEraser, FaUndo, FaRedo, FaHighlighter, FaSquare, FaCircle, FaMinus, FaArrowRight, FaExpand, FaCompress, FaTrash } from 'react-icons/fa';
import CodeEditor from '../../components/CodeEditor';
import Whiteboard from '../../components/Whiteboard';
import "../../components/Whiteboard.css";
import './Project.css'; // Assuming Project.css is in the same directory as Project.jsx

const Project = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [content, setContent] = useState('// Start coding here...');
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('javascript');
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const [isGuestMode, setIsGuestMode] = useState(false);
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const [isWhiteboardMaximized, setIsWhiteboardMaximized] = useState(false);

    // Drawing tools states
    const whiteboardRef = useRef(null);
    const [tool, setTool] = useState("pencil");
    const [color, setColor] = useState("#000000");
    const [lineWidth, setLineWidth] = useState(3); // Adjusted initial line width
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // State for resizing the split view
    const [editorWidth, setEditorWidth] = useState(50); // percentage
    const [isResizing, setIsResizing] = useState(false);
    const projectContainerRef = useRef(null); // Ref for the main project container

    const supportedLanguages = [
        { name: 'JavaScript', value: 'javascript', prismAlias: 'javascript' },
        { name: 'Python', value: 'python', prismAlias: 'python' },
        { name: 'C++', value: 'cpp', prismAlias: 'cpp' },
        { name: 'Java', value: 'java', prismAlias: 'java' },
    ];

    useEffect(() => {
        const guestMode = localStorage.getItem('guestMode') === 'true';
        setIsGuestMode(guestMode);

        if (guestMode) {
            const tempProject = {
                _id: projectId,
                name: 'Untitled Project',
                content: '// Start coding here...',
                language: 'javascript',
                isGuest: true
            };
            setProject(tempProject);
            setContent(tempProject.content);
            setLoading(false);
        } else {
            fetchProject();
        }
    }, [projectId]);

    const fetchProject = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`);
            if (!response.ok) {
                throw new Error('Project not found');
            }
            const data = await response.json();
            setProject(data);
            setContent(data.content || '// Start coding here...');
            setSelectedLanguage(data.language || 'javascript');
            setLoading(false);
        } catch (err) {
            console.error('Error fetching project:', err);
            navigate('/');
        }
    };

    const handleRunCode = async () => {
        if (showWhiteboard) return; // Prevent running code in whiteboard view

        setIsRunning(true);
        setOutput('');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: content,
                    language: selectedLanguage,
                }),
            });
            if (!response.ok) throw new Error('Failed to run code');
            const data = await response.json();
            setOutput(data.output);
        } catch (err) {
            setError(err.message);
            setOutput(`Error: ${err.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const handleSave = async () => {
        if (isGuestMode) {
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...project,
                    content,
                    language: selectedLanguage
                }),
            });
            if (!response.ok) throw new Error('Failed to save project');
            const updatedProject = await response.json();
            setProject(updatedProject);
        } catch (err) {
            console.error('Error saving project:', err);
        }
    };

    const handleContentChange = (newContent) => {
        if (showWhiteboard) return; // Prevent content changes in whiteboard view
        setContent(newContent);
    };

    // Resizing handlers
    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsResizing(true);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!isResizing || !projectContainerRef.current) return;

        const containerRect = projectContainerRef.current.getBoundingClientRect();
        const newEditorWidthPx = e.clientX - containerRect.left;
        const newEditorWidthPercent = (newEditorWidthPx / containerRect.width) * 100;

        // Constrain the width between min/max percentages defined in CSS or here
        const constrainedWidth = Math.min(Math.max(newEditorWidthPercent, 20), 80); // Example constraints
        setEditorWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleTouchMove = (e) => {
        if (!isResizing || !projectContainerRef.current) return;

        const containerRect = projectContainerRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        const newEditorWidthPx = touch.clientX - containerRect.left;
        const newEditorWidthPercent = (newEditorWidthPx / containerRect.width) * 100;

        // Constrain the width between min/max percentages
        const constrainedWidth = Math.min(Math.max(newEditorWidthPercent, 20), 80); // Example constraints
        setEditorWidth(constrainedWidth);
    };

    const handleTouchEnd = () => {
        setIsResizing(false);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
    };

    // Cleanup event listeners
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            
        };
    }, [isResizing]); // Add isResizing as a dependency

    const handleToggleWhiteboard = () => {
        setShowWhiteboard(!showWhiteboard);
        // No need to reset width here, flex will handle it
    };

    const handleToggleMaximize = () => {
        setIsWhiteboardMaximized(!isWhiteboardMaximized);
    };

    // Effect to force whiteboard update when shown or maximized state changes
    useEffect(() => {
        if (showWhiteboard && whiteboardRef.current) {
            // Force a redraw when switching to whiteboard view or changing maximize state
            whiteboardRef.current.forceCanvasUpdate();
        }
    }, [showWhiteboard, isWhiteboardMaximized]);

    const handleClearWhiteboard = () => {
        if (whiteboardRef.current) {
            whiteboardRef.current.clear();
        }
    };

    if (loading) return <div className="loading">Loading project...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="project">
            <div className="project-header">
                <h1>{project?.name}</h1>
                <div className="project-actions">
                    {/* Toggle Button for Whiteboard/Code View */}
                    <button className="btn btn-secondary" onClick={handleToggleWhiteboard}>
                        {showWhiteboard ? <><FaEdit /> Code View</> : <><FaDrawPolygon /> Whiteboard</>}
                    </button>
                    {showWhiteboard && (
                        <button className="btn btn-secondary" onClick={handleToggleMaximize}>
                            {isWhiteboardMaximized ? <><FaCompress /> Minimize</> : <><FaExpand /> Maximize</>}
                        </button>
                    )}

                    {/* Language Dropdown (shown only in code view header) */}
                    {!showWhiteboard && (
                        <div className="dropdown">
                            <button className="btn btn-secondary dropdown-toggle" onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}>
                                {supportedLanguages.find(lang => lang.value === selectedLanguage)?.name || 'Language'} <FaCaretDown />
                            </button>
                            {showLanguageDropdown && (
                                <div className="dropdown-menu">
                                    {supportedLanguages.map(lang => (
                                        <button
                                            key={lang.value}
                                            className="dropdown-item"
                                            onClick={() => {
                                                setSelectedLanguage(lang.value);
                                                setShowLanguageDropdown(false);
                                            }}
                                        >
                                            {lang.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area (Code Editor/Output or Whiteboard) */}
            <div className="project-content" ref={projectContainerRef}>
                <div className={`code-editor-container ${showWhiteboard && !isWhiteboardMaximized ? 'shrink' : ''}`} 
                     style={{ flexBasis: `${editorWidth}%` }}>
                    {/* Editor Controls (Run/Save) */}
                    <div className="editor-controls">
                        {!showWhiteboard && (
                            <>
                                <button className="btn btn-primary" onClick={handleRunCode} disabled={isRunning}>
                                    <FaPlay /> {isRunning ? 'Running...' : 'Run'}
                                </button>
                                {!isGuestMode && (
                                    <button className="btn btn-success" onClick={handleSave}>
                                        <FaSave /> Save
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    {/* Code Editor */}
                    <CodeEditor
                        language={supportedLanguages.find(lang => lang.value === selectedLanguage)?.prismAlias || 'javascript'}
                        value={content}
                        onValueChange={handleContentChange}
                    />
                </div>

                {/* Resizer handle */}
                <div 
                    className="resizer"
                    onMouseDown={handleMouseDown}
                    onTouchStart={(e) => {
                        e.preventDefault();
                        setIsResizing(true);
                        document.addEventListener('touchmove', handleTouchMove);
                        document.addEventListener('touchend', handleTouchEnd);
                    }}
                />

                {/* Output/Whiteboard Container */}
                <div className="output-container">
                    {!showWhiteboard ? (
                        // Output View
                        <>
                            {/* Output header and content */}
                            <h3>Output</h3>
                            <div className="output-content">
                                <pre>{output}</pre>
                            </div>
                        </>
                    ) : (
                        // Whiteboard View
                        <div className={`whiteboard-container ${isWhiteboardMaximized ? 'maximized' : ''}`}> {/* Use CSS for flex and width */}
                            {/* Drawing tools (moved inside whiteboard container) */}
                            <div className="drawing-tools-container">
                                <div className="drawing-tools"> {/* Original drawing tools div */}
                                    <button
                                        className={`btn-icon ${tool === 'pencil' ? 'active' : ''}`}
                                        onClick={() => setTool('pencil')}
                                        title="Pencil">
                                        <FaPencilAlt />
                                    </button>
                                    {/* Added Highlighter Tool */}
                                    <button
                                        className={`btn-icon ${tool === 'highlighter' ? 'active' : ''}`}
                                        onClick={() => setTool('highlighter')}
                                        title="Highlighter">
                                        <FaHighlighter />
                                    </button>
                                    <button
                                        className={`btn-icon ${tool === 'eraser' ? 'active' : ''}`}
                                        onClick={() => setTool('eraser')}
                                        title="Eraser">
                                        <FaEraser />
                                    </button>
                                    {/* Added Shape Tools */}
                                    <button
                                        className={`btn-icon ${tool === 'rectangle' ? 'active' : ''}`}
                                        onClick={() => setTool('rectangle')}
                                        title="Rectangle">
                                        <FaSquare />
                                    </button>
                                    <button
                                        className={`btn-icon ${tool === 'circle' ? 'active' : ''}`}
                                        onClick={() => setTool('circle')}
                                        title="Circle">
                                        <FaCircle />
                                    </button>
                                    {/* Added Line and Arrow Tools */}
                                    <button
                                        className={`btn-icon ${tool === 'line' ? 'active' : ''}`}
                                        onClick={() => setTool('line')}
                                        title="Line">
                                        <FaMinus />
                                    </button>
                                    <button
                                        className={`btn-icon ${tool === 'arrow' ? 'active' : ''}`}
                                        onClick={() => setTool('arrow')}
                                        title="Arrow">
                                        <FaArrowRight />
                                    </button>

                                    {/* Color Picker */}
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        disabled={tool === 'eraser'}
                                        title="Color Picker"
                                        className="color-picker"
                                        aria-label="Choose color"
                                    />

                                    {/* Line Width Slider */}
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        value={lineWidth}
                                        onChange={(e) => setLineWidth(Number(e.target.value))}
                                        title="Line Width"
                                        className="line-width-slider"
                                        aria-label="Select line width"
                                    />

                                    {/* Undo/Redo/Clear for Whiteboard */}
                                    <button
                                        className="btn-icon"
                                        onClick={() => whiteboardRef.current?.undo()}
                                        disabled={!canUndo}
                                        title="Undo"
                                        aria-label="Undo drawing"
                                    >
                                        <FaUndo />
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={() => whiteboardRef.current?.redo()}
                                        disabled={!canRedo}
                                        title="Redo"
                                        aria-label="Redo drawing"
                                    >
                                        <FaRedo />
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={handleClearWhiteboard}
                                        title="Clear Whiteboard"
                                        aria-label="Clear whiteboard"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>

                            {/* Whiteboard Canvas */}
                            <Whiteboard
                                ref={whiteboardRef}
                                tool={tool}
                                color={color}
                                lineWidth={lineWidth}
                                setCanUndo={setCanUndo}
                                setCanRedo={setCanRedo}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Project;
