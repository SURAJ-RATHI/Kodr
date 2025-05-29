require('dotenv').config();

// Debug logging
console.log('Environment variables:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '***' : undefined);
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '***' : undefined);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { connectDB, Project, File } = require('./src/db/db');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const User = require('./src/db/User'); // We will create this User model next

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true // Allow sending cookies
    }
});

// CORS configuration for Express app
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // Allow sending cookies
}));

app.use(express.json());

// --- Passport Initialization ---
app.use(passport.initialize());

// --- Session Middleware ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_very_secret_key', // Replace with a strong secret
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

app.use(express.json());

// --- Passport Initialization ---
app.use(passport.session());

// --- Google OAuth Strategy ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    proxy: true // Use proxy if running behind a load balancer (like Heroku)
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists in our database
        let existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
            // User exists, return that user
            done(null, existingUser);
        } else {
            // User does not exist, create a new user
            const newUser = new User({
                googleId: profile.id,
                displayName: profile.displayName,
                email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null,
                // You can add more fields from profile here if needed
            });
            await newUser.save();
            done(null, newUser);
        }
    } catch (err) {
        done(err, null);
    }
}));

// --- Passport Serialization and Deserialization ---
// User is serialized to the session (store user ID in cookie)
passport.serializeUser((user, done) => {
    done(null, user.id); // Use Mongoose's default _id
});

// User is deserialized from the session (retrieve user from database using ID)
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Helper function to execute code
const executeCode = (code, language) => {
    return new Promise((resolve, reject) => {
        let tempFilePath;
        let command;
        let cleanupCommand = '';

        switch (language) {
            case 'javascript':
                tempFilePath = path.join(__dirname, `temp_${Date.now()}.js`);
                command = `node ${tempFilePath}`;
                break;
            case 'python':
                tempFilePath = path.join(__dirname, `temp_${Date.now()}.py`);
                command = `python ${tempFilePath}`;
                break;
            case 'cpp':
                const cppFileName = `temp_${Date.now()}`;
                tempFilePath = path.join(__dirname, `${cppFileName}.cpp`);
                const compiledFilePath = path.join(__dirname, cppFileName);
                // Compile and then run
                command = `g++ ${tempFilePath} -o ${compiledFilePath} && ${compiledFilePath}`;
                // Clean up source and compiled files
                cleanupCommand = `del ${tempFilePath} && del ${compiledFilePath}`;
                break;
            case 'java':
                const javaFileName = `Main_${Date.now()}`;
                tempFilePath = path.join(__dirname, `${javaFileName}.java`);
                // Assuming the class name inside is the same as file name (required by Java)
                // Compile and then run. Need to cd into __dirname because java command is sensitive to file path.
                command = `cd ${__dirname} && javac ${javaFileName}.java && java ${javaFileName}`;
                // Clean up source and class files
                cleanupCommand = `del ${tempFilePath} && del ${path.join(__dirname, `${javaFileName}.class`)}`;
                break;
            default:
                return reject('Unsupported language');
        }
        
        fs.writeFile(tempFilePath, code)
            .then(() => {
                exec(command, (error, stdout, stderr) => {
                    // Clean up temporary files
                    fs.unlink(tempFilePath).catch(console.error);
                    if (cleanupCommand) {
                        exec(cleanupCommand, (cleanupError, cleanupStdout, cleanupStderr) => {
                            if (cleanupError) {
                                console.error('Error during cleanup:', cleanupError);
                            }
                        });
                    }

                    if (error) {
                        // Prioritize stderr for error messages
                        reject(stderr || error.message);
                    } else {
                        resolve(stdout);
                    }
                });
            })
            .catch(reject);
    });
};

// API Routes (Updated - Note: Project and File routes still need protection)
// We will protect Project and File routes in a later step
app.get('/api/projects', async (req, res) => {
    try {
        // If user is not authenticated, return empty array
        if (!req.user) {
            return res.json([]);
        }
        const projects = await Project.find({ userId: req.user._id });
        res.json(projects);
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        // If user is not authenticated, return error
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { name } = req.body;
        const project = new Project({
            name,
            userId: req.user._id,
            files: [{
                name: 'main.js',
                content: '// Start coding here...',
                language: 'javascript'
            }]
        });
        await project.save();
        res.json(project);
    } catch (err) {
        console.error('Error creating project:', err);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        // In a real app, ensure the user has access to this project
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:projectId/files', async (req, res) => {
    try {
        // In a real app, ensure the user has access to the project
        const files = await File.find({ projectId: req.params.projectId });
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/projects/:projectId/files', async (req, res) => {
    try {
        const { name } = req.body;
        const { projectId } = req.params;
        // In a real app, ensure the user has access to the project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const file = new File({ projectId, name });
        await file.save();
        res.status(201).json(file);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/files/:id', async (req, res) => {
    try {
        // In a real app, ensure the user has access to this file's project
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json(file);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/files/:id', async (req, res) => {
    try {
        const { content } = req.body;
        // In a real app, ensure the user has access to this file's project
        const file = await File.findByIdAndUpdate(
            req.params.id,
            { content },
            { new: true }
        );
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json(file);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/files/:id', async (req, res) => {
    try {
        // In a real app, ensure the user has access to this file's project
        const file = await File.findByIdAndDelete(req.params.id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json({ message: 'File deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add this new route for running code
app.post('/api/run', async (req, res) => {
    const { content, language } = req.body;
    try {
        const output = await executeCode(content, language);
        res.json({ output });
    } catch (error) {
        res.status(500).json({ output: `Execution Error: ${error}` });
    }
});

// Google OAuth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    // Successful authentication, redirect to the frontend URL
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
});

// Add a route to check the current user status
app.get('/api/current_user', (req, res) => {
    res.send(req.user);
});

// Optional: Logout route
app.get('/auth/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
    });
});

// Connect to MongoDB and start the server
connectDB().then(() => {
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => console.error(err));

