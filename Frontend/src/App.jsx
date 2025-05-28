import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/home/Home';
import Project from './pages/project/Project';
import '@fontsource/fira-code';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/project/:projectId" element={<Project />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
