import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaPlay, FaCaretDown, FaSignInAlt, FaDrawPolygon, FaEdit, FaPencilAlt, FaEraser, FaUndo, FaRedo, FaHighlighter, FaSquare, FaCircle, FaMinus, FaArrowRight, FaExpand, FaCompress, FaTrash } from 'react-icons/fa';
import CodeEditor from '../../components/CodeEditor';
import Whiteboard from '../../components/Whiteboard';
import { getBoilerplateCode } from '../../utils/boilerplate';
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
        { name: 'Java', value: 'java', prismAlias: 'java' },
        { name: 'C++', value: 'cpp', prismAlias: 'cpp' }
    ];

    useEffect(() => {
        const guestMode = localStorage.getItem('guestMode') === 'true';
        setIsGuestMode(guestMode);

        if (guestMode) {
            const tempProject = {
                _id: projectId,
                name: localStorage.getItem('projectName') || 'New Project',
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
        setContent(newContent);
    };

    const handleLanguageChange = async (newLanguage) => {
        setSelectedLanguage(newLanguage);
        setShowLanguageDropdown(false);
        
        // Get boilerplate code for the selected language
        const boilerplate = getBoilerplateCode(newLanguage);
        setContent(boilerplate);
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

    const handleWhiteboardToggle = () => {
        setShowWhiteboard(!showWhiteboard);
    };

    const handleWhiteboardToolChange = (tool) => {
        setTool(tool);
    };

    const handleWhiteboardColorChange = (color) => {
        setColor(color);
    };

    const handleWhiteboardLineWidthChange = (width) => {
        setLineWidth(width);
    };

    const handleWhiteboardUndo = () => {
        if (whiteboardRef.current) {
            whiteboardRef.current.undo();
        }
    };

    const handleWhiteboardRedo = () => {
        if (whiteboardRef.current) {
            whiteboardRef.current.redo();
        }
    };

    const handleWhiteboardClear = () => {
        if (whiteboardRef.current) {
            whiteboardRef.current.clear();
        }
    };

    if (loading) return <div className="loading">Loading project...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="project" ref={projectContainerRef}>
            <div className="project-header">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {project?.name}
                    <div className="language-selector" style={{ marginLeft: '1rem' }}>
                        <button 
                            className="language-button"
                            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                        >
                            {supportedLanguages.find(lang => lang.value === selectedLanguage)?.name || 'Select Language'}
                            <FaCaretDown />
                        </button>
                        {showLanguageDropdown && (
                            <div className="language-dropdown">
                                {supportedLanguages.map(lang => (
                                    <button
                                        key={lang.value}
                                        onClick={() => handleLanguageChange(lang.value)}
                                        className={selectedLanguage === lang.value ? 'active' : ''}
                                    >
                                        {lang.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="action-button" onClick={handleRunCode} disabled={isRunning} style={{ marginLeft: '1rem' }}>
                        <FaPlay /> {isRunning ? 'Running...' : 'Run'}
                    </button>
                </h1>
                <div className="project-actions">
                    {!isGuestMode && (
                        <button className="action-button" onClick={handleSave}>
                            <FaSave /> Save
                        </button>
                    )}
                    <button className="action-button" onClick={handleToggleWhiteboard}>
                        <FaDrawPolygon /> {showWhiteboard ? 'Code' : 'Whiteboard'}
                    </button>
                </div>
            </div>
            <div className="project-content" style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
                {!showWhiteboard && (
                    <div className="editor-container" style={{ flex: `${editorWidth}%` }}>
                        <CodeEditor
                            value={content}
                            language={selectedLanguage}
                            onValueChange={handleContentChange}
                            hideLanguageSelector={true}
                        />
                    </div>
                )}
                {showWhiteboard && (
                    <div className="whiteboard-section" style={{ flex: `${100 - editorWidth}%` }}>
                        <div className="whiteboard-tools">
                            <button
                                className={`tool-btn ${tool === 'pencil' ? 'active' : ''}`}
                                onClick={() => handleWhiteboardToolChange('pencil')}
                                title="Pencil"
                            >
                                <FaPencilAlt />
                            </button>
                            <button
                                className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                                onClick={() => handleWhiteboardToolChange('eraser')}
                                title="Eraser"
                            >
                                <FaEraser />
                            </button>
                            <button
                                className={`tool-btn ${tool === 'highlighter' ? 'active' : ''}`}
                                onClick={() => handleWhiteboardToolChange('highlighter')}
                                title="Highlighter"
                            >
                                <FaHighlighter />
                            </button>
                            <button
                                className={`tool-btn ${tool === 'rectangle' ? 'active' : ''}`}
                                onClick={() => handleWhiteboardToolChange('rectangle')}
                                title="Rectangle"
                            >
                                <FaSquare />
                            </button>
                            <button
                                className={`tool-btn ${tool === 'circle' ? 'active' : ''}`}
                                onClick={() => handleWhiteboardToolChange('circle')}
                                title="Circle"
                            >
                                <FaCircle />
                            </button>
                            <button
                                className={`tool-btn ${tool === 'line' ? 'active' : ''}`}
                                onClick={() => handleWhiteboardToolChange('line')}
                                title="Line"
                            >
                                <FaArrowRight />
                            </button>
                            <button
                                className={`tool-btn ${tool === 'arrow' ? 'active' : ''}`}
                                onClick={() => handleWhiteboardToolChange('arrow')}
                                title="Arrow"
                            >
                                <FaArrowRight />
                            </button>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => handleWhiteboardColorChange(e.target.value)}
                                title="Color"
                            />
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={lineWidth}
                                onChange={(e) => handleWhiteboardLineWidthChange(parseInt(e.target.value))}
                                title="Line Width"
                            />
                            <button
                                className="tool-btn"
                                onClick={handleWhiteboardUndo}
                                disabled={!canUndo}
                                title="Undo"
                            >
                                <FaUndo />
                            </button>
                            <button
                                className="tool-btn"
                                onClick={handleWhiteboardRedo}
                                disabled={!canRedo}
                                title="Redo"
                            >
                                <FaRedo />
                            </button>
                            <button
                                className="tool-btn"
                                onClick={handleWhiteboardClear}
                                title="Clear"
                            >
                                <FaTrash />
                            </button>
                        </div>
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
                {!showWhiteboard && (
                    <div className="resizer" onMouseDown={handleMouseDown} onTouchStart={handleMouseDown} />
                )}
                {!showWhiteboard && (
                    <div className="output-container" style={{ flex: `${100 - editorWidth}%` }}>
                        <div className="output-header">
                            <h3>Output</h3>
                            <button className="clear-button" onClick={() => setOutput('')}>
                                Clear
                            </button>
                        </div>
                        <pre className="output-content">{output || 'No output yet'}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Project;
