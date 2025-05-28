const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    name: String,
    content: String,
    language: String
});

const projectSchema = new mongoose.Schema({
    name: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    files: [fileSchema],
    createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);
const File = mongoose.model('File', fileSchema);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

module.exports = { connectDB, Project, File };