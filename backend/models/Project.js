const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: 1000
    },
    client: {
        name: { type: String, required: true },
        email: { type: String },
        phone: { type: String },
        company: { type: String }
    },
    category: {
        type: String,
        required: true,
        enum: [
            'web-development',
            'mobile-app',
            'desktop-software',
            'cloud-infrastructure',
            'data-analytics',
            'ai-ml',
            'iot',
            'cybersecurity',
            'other'
        ]
    },
    status: {
        type: String,
        enum: ['draft', 'in-progress', 'review', 'approved', 'completed', 'cancelled'],
        default: 'draft'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    budget: {
        estimated: { type: Number, default: 0 },
        approved: { type: Number, default: 0 },
        spent: { type: Number, default: 0 },
        currency: { type: String, default: 'USD' }
    },
    team: [{
        member: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        hoursAllocated: { type: Number, default: 0 }
    }],
    tags: [String],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: Get all estimates for this project
projectSchema.virtual('estimates', {
    ref: 'Estimate',
    localField: '_id',
    foreignField: 'project',
    justOne: false
});

// Virtual: Calculate duration in days
projectSchema.virtual('durationDays').get(function () {
    if (this.startDate && this.endDate) {
        const diff = this.endDate - this.startDate;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    return 0;
});

// Index for search
projectSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Project', projectSchema);