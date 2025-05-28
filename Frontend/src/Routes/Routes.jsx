import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Home from "../pages/home/Home"
import Project from '../pages/project/Project'

const AppRoutes = () => {
    return (

        <Router>
            <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/project/:projectId' element={<Project />} />
            </Routes>
        </Router>

    )
}

export default AppRoutes