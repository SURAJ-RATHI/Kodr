import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaFolder, FaCode, FaSignInAlt, FaUserSecret, FaPlayCircle } from 'react-icons/fa';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isGuestMode, setIsGuestMode] = useState(false);

    useEffect(() => {
        // Check if user is in guest mode
        const guestMode = localStorage.getItem('guestMode') === 'true';
        setIsGuestMode(guestMode);

        // Only fetch projects if not in guest mode
        if (!guestMode) {
            fetchProjects();
        }

        // Listen for the custom event to open the new project modal
        const handleOpenNewProjectModal = () => setShowNewProjectModal(true);
        window.addEventListener('openNewProjectModal', handleOpenNewProjectModal);

        return () => {
            window.removeEventListener('openNewProjectModal', handleOpenNewProjectModal);
        };
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`);
            if (!response.ok) {
                console.error('Failed to fetch projects');
                return;
            }
            const data = await response.json();
            setProjects(data);
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            if (isGuestMode) {
                // Create a temporary project for guest mode
                const tempProject = {
                    _id: `guest_${Date.now()}`,
                    name: newProjectName || 'Untitled Project',
                    isGuest: true
                };
                setProjects([...projects, tempProject]);
                setShowNewProjectModal(false);
                setNewProjectName('');
                navigate(`/project/${tempProject._id}`);
                return;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newProjectName }),
            });
            if (!response.ok) throw new Error('Failed to create project');
            const project = await response.json();
            setProjects([...projects, project]);
            setShowNewProjectModal(false);
            setNewProjectName('');
            navigate(`/project/${project._id}`);
        } catch (err) {
            console.error('Error creating project:', err);
        }
    };

    const handleGuestMode = () => {
        setIsGuestMode(true);
        localStorage.setItem('guestMode', 'true');
        // Clear any existing projects in guest mode
        setProjects([]);
    };

    // The welcome screen is always the initial view
    return (
        <div className="home">
            <div className="welcome-container">
                <FaCode size={64} className="welcome-icon" />
                <h1>Welcome to Kodr</h1>
                <p className="intro-text">
                    Kodr is a minimalist web-based code editor designed for coding interviews 
                    and practicing data structures and algorithms. Write, run, and test your 
                    code efficiently in multiple languages.
                </p>
                <div className="welcome-actions">
                    {!isGuestMode ? (
                        <button className="btn btn-secondary btn-lg" onClick={handleGuestMode}>
                            <FaUserSecret /> Guest Mode
                        </button>
                    ) : (
                        <button 
                            className="btn btn-secondary btn-lg"
                            onClick={() => {
                                setIsGuestMode(false);
                                localStorage.removeItem('guestMode');
                                fetchProjects();
                            }}
                        >
                            <FaSignInAlt /> Sign In
                        </button>
                    )}
                    {!isGuestMode && (
                        <button 
                            className="btn btn-secondary btn-lg"
                            onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`}}
                        >
                            <FaSignInAlt /> Sign In
                        </button>
                    )}
                    <button className="btn btn-primary btn-lg" onClick={() => setShowNewProjectModal(true)}>
                        <FaPlayCircle /> Start Test
                    </button>
                </div>

                {/* Optional: Show recent projects or a link to all projects below welcome */} 
                 {projects.length > 0 && (
                    <div className="recent-projects-section">
                        <h2>Recent Projects</h2>
                         <div className="projects-grid">
                            {projects.slice(0, 6).map(project => (
                                <div
                                     key={project._id}
                                    className="project-card"
                                     onClick={() => navigate(`/project/${project._id}`)}
                                >
                                     <h3>{project.name}</h3>
                                     <p className="project-date">
                                         Last modified: {new Date(project.updatedAt).toLocaleDateString()}
                                     </p>
                                </div>
                            ))}
                        </div>
                         {/* Add a button to view all projects if needed */}
                    </div>
                 )}
            </div>

            {showNewProjectModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Create New Project</h2>
                        <form onSubmit={handleCreateProject}>
                            <div className="form-group">
                                <label className="form-label">Project Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="Enter project name"
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setShowNewProjectModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;