const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'File name is required']
    },
    content: {
        type: String,
        default: ''
    },
    language: {
        type: String,
        enum: ['javascript', 'html', 'css'],
        default: 'javascript'
    }
});

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Project name is required']
    },
    code: {
        type: String,
        default: '// Start coding here...'
    },
    files: [fileSchema],
    collaborators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isPublic: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
projectSchema.index({ name: 'text' });
projectSchema.index({ createdAt: -1 });

const projectModel = mongoose.model('project', projectSchema);

module.exports = projectModel;