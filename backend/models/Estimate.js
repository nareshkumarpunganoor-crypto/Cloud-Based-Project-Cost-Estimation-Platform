const mongoose = require('mongoose');

const estimateSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Estimate title is required'],
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        maxlength: 2000
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    version: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected', 'revised'],
        default: 'draft'
    },
    methodology: {
        type: String,
        enum: ['bottom-up', 'top-down', 'analogous', 'parametric', 'three-point'],
        default: 'bottom-up'
    },
    costBreakdown: {
        laborCost: { type: Number, default: 0 },
        softwareCost: { type: Number, default: 0 },
        hardwareCost: { type: Number, default: 0 },
        infrastructureCost: { type: Number, default: 0 },
        licensingCost: { type: Number, default: 0 },
        trainingCost: { type: Number, default: 0 },
        consultingCost: { type: Number, default: 0 },
        testingCost: { type: Number, default: 0 },
        maintenanceCost: { type: Number, default: 0 },
        miscellaneousCost: { type: Number, default: 0 }
    },
    totals: {
        subtotal: { type: Number, default: 0 },
        contingency: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 }
    },
    contingencyRate: {
        type: Number,
        min: 0,
        max: 50,
        default: 10
    },
    taxRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    discountRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    assumptions: [String],
    risks: [{
        description: String,
        impact: { type: String, enum: ['low', 'medium', 'high'] },
        probability: { type: String, enum: ['low', 'medium', 'high'] },
        mitigation: String
    }],
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedDate: Date,
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    validUntil: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: Get all cost items
estimateSchema.virtual('costItems', {
    ref: 'CostItem',
    localField: '_id',
    foreignField: 'estimate',
    justOne: false
});

module.exports = mongoose.model('Estimate', estimateSchema);