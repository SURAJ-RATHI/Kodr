const projectModel = require('../models/project.model');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Create a new project
module.exports.create = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: 'Project name is required and cannot be empty'
            });
        }

        const project = await projectModel.create({
            name: name.trim(),
            code: "// Start coding here...",
            files: [
                {
                    name: 'main.js',
                    content: '// Start coding here...',
                    language: 'javascript'
                }
            ]
        });

        res.status(201).json({
            message: 'Project created successfully',
            data: project
        });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({
            message: 'Error creating project',
            error: error.message
        });
    }
};

// Get all projects
module.exports.list = async (req, res) => {
    try {
        const projects = await projectModel.find().sort({ createdAt: -1 });
        res.status(200).json({ projects });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            message: 'Error fetching projects',
            error: error.message
        });
    }
};

// Get a single project
module.exports.getOne = async (req, res) => {
    try {
        const project = await projectModel.findById(req.params.id);
        if (!project) {
            return res.status(404).json({
                message: 'Project not found'
            });
        }
        res.status(200).json({ project });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({
            message: 'Error fetching project',
            error: error.message
        });
    }
};

// Update project code
module.exports.updateCode = async (req, res) => {
    try {
        const { code, fileId } = req.body;
        const project = await projectModel.findById(req.params.id);
        
        if (!project) {
            return res.status(404).json({
                message: 'Project not found'
            });
        }

        if (fileId) {
            const file = project.files.id(fileId);
            if (file) {
                file.content = code;
            }
        } else {
            project.code = code;
        }

        await project.save();
        res.status(200).json({
            message: 'Code updated successfully',
            project
        });
    } catch (error) {
        console.error('Error updating code:', error);
        res.status(500).json({
            message: 'Error updating code',
            error: error.message
        });
    }
};

// Review code using Google AI
module.exports.reviewCode = async (req, res) => {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const code = req.body.code;
        const prompt = `Review this code and provide suggestions for improvement:\n\n${code}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({
            review: text
        });
    } catch (error) {
        console.error('Error reviewing code:', error);
        res.status(500).json({
            message: 'Error reviewing code',
            error: error.message
        });
    }
};