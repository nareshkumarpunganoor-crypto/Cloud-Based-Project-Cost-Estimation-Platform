const mongoose = require('mongoose');

const costItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Cost item name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            'labor',
            'software',
            'hardware',
            'infrastructure',
            'licensing',
            'training',
            'consulting',
            'testing',
            'maintenance',
            'miscellaneous'
        ]
    },
    costType: {
        type: String,
        enum: ['fixed', 'variable', 'recurring'],
        default: 'fixed'
    },
    unit: {
        type: String,
        enum: ['hour', 'day', 'week', 'month', 'year', 'unit', 'project'],
        default: 'unit'
    },
    unitCost: {
        type: Number,
        required: [true, 'Unit cost is required'],
        min: 0
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: 0,
        default: 1
    },
    totalCost: {
        type: Number,
        default: 0
    },
    riskFactor: {
        type: Number,
        min: 0,
        max: 100,
        default: 10  // percentage
    },
    estimate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Estimate',
        required: true
    },
    notes: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Calculate total cost before saving
costItemSchema.pre('save', function (next) {
    this.totalCost = this.unitCost * this.quantity;
    next();
});

module.exports = mongoose.model('CostItem', costItemSchema);