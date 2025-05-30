import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaCode, FaHome, FaPlus, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
    const [user, setUser] = useState(null);

    // Fetch current user when the component mounts
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/current_user`, {
                    credentials: 'include',
                });

                if (!res.ok) {
                    console.error(`HTTP error: ${res.status}`);
                    setUser(null); // Assume logged out on non-OK response
                    return;
                }

                const text = await res.text();
                // Check if the response text is not empty before attempting to parse
                const data = text ? JSON.parse(text) : null;

                // If data is null, undefined, or an empty object, treat as logged out
                setUser(data && Object.keys(data).length > 0 ? data : null);

            } catch (error) {
                console.error("Error fetching current user:", error);
                setUser(null); // Assume logged out on error
            }
        };

        fetchUser();
    }, []); // Empty dependency array means this runs once on mount

    const handleLogout = async () => {
        try {
            // Redirecting directly to the backend logout route
            window.location.href = `${import.meta.env.VITE_API_URL}/api/logout`;
        } catch (err) {
            console.error('Error during logout:', err);
        }
    };

    return (
        <nav className="navbar">
            <Link to="/" className="nav-brand">
                <FaCode className="brand-icon" />
                <h1>Kodr</h1>
            </Link>
            <div className="nav-links">
                {/* Conditionally render Sign In or Logout */} 
                {user ? (
                    // Logged in: Show user name/email and Logout button
                    <>
                        <span className="nav-user">Hello, {user.displayName || user.email}</span>
                        <button className="nav-link btn-text" onClick={handleLogout}>
                            <FaSignOutAlt /> Logout
                        </button>
                    </>
                ) : (
                    // Not logged in: Show Sign In button
                    <a href={`${import.meta.env.VITE_API_URL}/auth/google`} className="nav-link">
                        <FaSignInAlt /> Sign In
                    </a>
                )}

                {/* Keep New Project button - can adjust visibility/behavior later if needed */}
                <Link 
                    to="/" 
                    className="nav-link"
                    onClick={(e) => {
                        e.preventDefault();
                        // This will be handled by the Home component
                        window.dispatchEvent(new CustomEvent('openNewProjectModal'));
                    }}
                >
                    <FaPlus /> New Project
                </Link>
            </div>
        </nav>
    );
};

export default Navbar; 