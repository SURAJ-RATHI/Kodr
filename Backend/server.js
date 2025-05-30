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
const fs = require('fs');
const fsPromises = require('fs').promises;
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

        try {
            // Create a temp directory if it doesn't exist
            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const timestamp = Date.now();
            
            switch (language) {
                case 'javascript':
                    tempFilePath = path.join(tempDir, `temp_${timestamp}.js`);
                    command = `node "${tempFilePath}"`;
                    break;
                case 'python':
                    tempFilePath = path.join(tempDir, `temp_${timestamp}.py`);
                    command = `python "${tempFilePath}"`;
                    break;
                case 'cpp':
                    const cppFileName = `temp_${timestamp}`;
                    tempFilePath = path.join(tempDir, `${cppFileName}.cpp`);
                    const compiledFilePath = path.join(tempDir, cppFileName);
                    command = `g++ "${tempFilePath}" -o "${compiledFilePath}" && "${compiledFilePath}"`;
                    cleanupCommand = `del "${tempFilePath}" && del "${compiledFilePath}.exe"`;
                    break;
                case 'java':
                    tempFilePath = path.join(tempDir, 'Main.java');
                    command = `cd "${tempDir}" && javac Main.java && java Main`;
                    cleanupCommand = `del "${tempFilePath}" && del "${path.join(tempDir, 'Main.class')}"`;
                    break;
                default:
                    return reject('Unsupported language');
            }

            console.log('Writing code to:', tempFilePath);
            console.log('Executing command:', command);

            // Write the code to a temporary file synchronously, always appending a newline
            fs.writeFileSync(tempFilePath, code + '\n');
            console.log('File content after write:', fs.readFileSync(tempFilePath, 'utf-8'));
            console.log('Temp file path:', tempFilePath);

            // Execute the code
            exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
                // Log before deleting
                console.log('About to delete temp file:', tempFilePath);
                if (fs.existsSync(tempFilePath)) {
                    console.log('Temp file still exists, content before delete:', fs.readFileSync(tempFilePath, 'utf-8'));
                    fs.unlinkSync(tempFilePath);
                }
                
                if (cleanupCommand) {
                    console.log('Running cleanup command:', cleanupCommand);
                    exec(cleanupCommand, (cleanupError) => {
                        if (cleanupError) {
                            console.error('Error during cleanup:', cleanupError);
                        }
                    });
                }

                if (error) {
                    console.error('Execution error:', error);
                    console.error('stderr:', stderr);
                    // Return both stdout and stderr for better error reporting
                    reject({
                        error: true,
                        output: stderr || error.message,
                        stdout: stdout,
                        details: error
                    });
                } else {
                    console.log('Execution successful, output:', stdout);
                    resolve({
                        error: false,
                        output: stdout,
                        stderr: stderr
                    });
                }
            });
        } catch (err) {
            console.error('Error in executeCode:', err);
            reject({
                error: true,
                output: `Error: ${err.message}`,
                details: err
            });
        }
    });
};

// Function to get boilerplate code based on language
function getBoilerplateCode(language) {
    const boilerplates = {
        javascript: `// JavaScript Boilerplate
// Author: Your Name
// Date: ${new Date().toLocaleDateString()}

// Main function
function main() {
    console.log("Hello, World!");
    
    // Example function
    function exampleFunction() {
        return "This is an example function";
    }
    
    // Example class
    class ExampleClass {
        constructor() {
            this.value = 0;
        }
        
        increment() {
            this.value++;
            return this.value;
        }
    }
    
    // Call example function
    console.log(exampleFunction());
    
    // Use example class
    const example = new ExampleClass();
    console.log(example.increment());
}

// Run the main function
main();`,
        java: `// Java Boilerplate
// Author: Your Name
// Date: ${new Date().toLocaleDateString()}

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // Example method call
        String result = exampleMethod();
        System.out.println(result);
        
        // Example class usage
        ExampleClass example = new ExampleClass();
        System.out.println(example.increment());
    }
    
    // Example method
    public static String exampleMethod() {
        return "This is an example method";
    }
}

// Example class
class ExampleClass {
    private int value;
    
    public ExampleClass() {
        this.value = 0;
    }
    
    public int increment() {
        value++;
        return value;
    }
}`,
        python: `#!/usr/bin/env python3
# Python Boilerplate
# Author: Your Name
# Date: ${new Date().toLocaleDateString()}

def example_function():
    """Example function that returns a string."""
    return "This is an example function"

class ExampleClass:
    """Example class with basic functionality."""
    
    def __init__(self):
        self.value = 0
    
    def increment(self):
        """Increment the value and return it."""
        self.value += 1
        return self.value

def main():
    print("Hello, World!")
    
    # Call example function
    result = example_function()
    print(result)
    
    # Use example class
    example = ExampleClass()
    print(example.increment())

if __name__ == "__main__":
    main()`,
        cpp: `// C++ Boilerplate
// Author: Your Name
// Date: ${new Date().toLocaleDateString()}

#include <iostream>
#include <string>

// Example function
std::string exampleFunction() {
    return "This is an example function";
}

// Example class
class ExampleClass {
private:
    int value;

public:
    ExampleClass() : value(0) {}
    
    int increment() {
        value++;
        return value;
    }
};

int main() {
    std::cout << "Hello, World!" << std::endl;
    
    // Call example function
    std::string result = exampleFunction();
    std::cout << result << std::endl;
    
    // Use example class
    ExampleClass example;
    std::cout << example.increment() << std::endl;
    
    return 0;
}`
    };
    
    return boilerplates[language] || '// Start coding here...';
}

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

        const { name, language = 'javascript' } = req.body;
        const project = new Project({
            name,
            userId: req.user._id,
            files: [{
                name: `main.${language}`,
                content: getBoilerplateCode(language),
                language: language
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
    let { content, language } = req.body;
    
    if (!content || !language) {
        return res.status(400).json({ 
            error: true, 
            output: 'Missing required fields: content and language' 
        });
    }

    try {
        if (language === 'java') {
            console.log('Java code received:', content);
            // If code is empty or does not contain System.out.println, add a default print
            if (!content || !content.includes('System.out.println')) {
                content = `public class Main { public static void main(String[] args) { System.out.println("Hello from backend!"); } }`;
            }
            // Force the class name to 'Main' for all Java code
            content = content.replace(/public\s+class\s+\w+/g, 'public class Main');
        }
        const result = await executeCode(content, language);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/run:', error);
        res.status(500).json(error);
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

// Add boilerplate endpoint
app.post('/api/boilerplate', (req, res) => {
    const { language } = req.body;
    const boilerplate = getBoilerplateCode(language);
    res.json({ boilerplate });
});

// Connect to MongoDB and start the server
connectDB().then(() => {
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => console.error(err));

