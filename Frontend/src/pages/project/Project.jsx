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
    const [showWhiteboard, setShowWhiteboard] = useState(false); // State to toggle whiteboard view

    // Drawing tools states
    const whiteboardRef = useRef(null);
    const [tool, setTool] = useState("pencil");
    const [color, setColor] = useState("#000000");
    const [lineWidth, setLineWidth] = useState(3); // Adjusted initial line width
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const [editorWidth, setEditorWidth] = useState(60); // Initial width percentage for editor
    const [isResizing, setIsResizing] = useState(false);
    const editorAndOutputRef = useRef(null); // Ref for the editor-and-output container

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

    const handleSignIn = () => {
        localStorage.setItem('tempProject', JSON.stringify({
            ...project,
            content,
            language: selectedLanguage
        }));
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
    };

    const handleMouseDown = () => {
        setIsResizing(true);
        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ew-resize';
    };

    const handleMouseMove = (e) => {
        if (!isResizing || !editorAndOutputRef.current) return;
        
        const container = editorAndOutputRef.current; // Use the ref
        const containerWidth = container.offsetWidth;
        const newEditorWidth = ((e.clientX - container.getBoundingClientRect().left) / containerWidth) * 100;

        // Clamp width to prevent panels from becoming too small
        const clampedWidth = Math.max(10, Math.min(90, newEditorWidth));
        setEditorWidth(clampedWidth);
    };

    const handleMouseUp = () => {
        setIsResizing(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    };

    // Attach mousemove and mouseup listeners to the window to ensure drag works even if cursor leaves the divider
    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }

        // Clean up listeners on component unmount
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]); // Re-run effect when isResizing changes

    const handleToggleWhiteboard = () => {
        setShowWhiteboard(!showWhiteboard);
    };

    // Effect to force whiteboard update when shown
    useEffect(() => {
        if (showWhiteboard && whiteboardRef.current) {
            // Force a redraw when switching to whiteboard view
            whiteboardRef.current.forceCanvasUpdate();
        }
    }, [showWhiteboard]);

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

                    {/* Whiteboard Tools (shown only in whiteboard view) */}
                    {showWhiteboard && (
                        <>
                            <div className="drawing-tools">
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
                        </>
                    )}

                    {/* Code Editor Controls (shown only in code view) */}
                    {!showWhiteboard && (
                        <>
                            <button className="btn btn-primary" onClick={handleRunCode} disabled={isRunning}>
                                <FaPlay /> {isRunning ? 'Running...' : 'Run'}
                            </button>

                            {/* Language Dropdown */}
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

                            {/* Sign In Prompt for Guests */}
                            {isGuestMode && (
                                null
                            )}

                            {/* Save Button */}
                            {!isGuestMode && (
                                <button className="btn btn-success" onClick={handleSave}>
                                    <FaSave /> Save
                                </button>
                            )}
                        </>
                    )}

                </div>
            </div>

            {/* Main Content Area (Code Editor/Output or Whiteboard) */}
            <div className="project-content">
                {!showWhiteboard ? (
                    // Code Editor and Output View
                    <div className="editor-and-output" ref={editorAndOutputRef}>
                         <div className="editor-pane" style={{ width: `${editorWidth}%` }}>
                            <CodeEditor
                                language={supportedLanguages.find(lang => lang.value === selectedLanguage)?.prismAlias || 'javascript'}
                                value={content}
                                onChange={handleContentChange}
                            />
                         </div>
                        {/* Resizer Handle */}
                        <div className="resizer" onMouseDown={handleMouseDown}></div>
                         <div className="output-pane" style={{ width: `${100 - editorWidth}%` }}>
                             <pre>{output}</pre>
                         </div>
                    </div>
                ) : (
                    // Whiteboard View
                    <div className="whiteboard-container">
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
    );
};

export default Project;
