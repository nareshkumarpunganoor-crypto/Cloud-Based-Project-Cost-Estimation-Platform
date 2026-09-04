/**
 * Cost Calculator Utility
 * Provides various cost estimation methods
 */

class CostCalculator {

    /**
     * Calculate total from cost items
     */
    static calculateSubtotal(costItems) {
        return costItems.reduce((sum, item) => {
            return sum + (item.unitCost * item.quantity);
        }, 0);
    }

    /**
     * Calculate cost breakdown by category
     */
    static calculateBreakdown(costItems) {
        const breakdown = {
            laborCost: 0,
            softwareCost: 0,
            hardwareCost: 0,
            infrastructureCost: 0,
            licensingCost: 0,
            trainingCost: 0,
            consultingCost: 0,
            testingCost: 0,
            maintenanceCost: 0,
            miscellaneousCost: 0
        };

        costItems.forEach(item => {
            const total = item.unitCost * item.quantity;
            switch (item.category) {
                case 'labor': breakdown.laborCost += total; break;
                case 'software': breakdown.softwareCost += total; break;
                case 'hardware': breakdown.hardwareCost += total; break;
                case 'infrastructure': breakdown.infrastructureCost += total; break;
                case 'licensing': breakdown.licensingCost += total; break;
                case 'training': breakdown.trainingCost += total; break;
                case 'consulting': breakdown.consultingCost += total; break;
                case 'testing': breakdown.testingCost += total; break;
                case 'maintenance': breakdown.maintenanceCost += total; break;
                default: breakdown.miscellaneousCost += total;
            }
        });

        return breakdown;
    }

    /**
     * Calculate grand total with contingency, tax, and discount
     */
    static calculateTotals(subtotal, contingencyRate = 10, taxRate = 0, discountRate = 0) {
        const contingency = subtotal * (contingencyRate / 100);
        const afterContingency = subtotal + contingency;
        const discount = afterContingency * (discountRate / 100);
        const afterDiscount = afterContingency - discount;
        const tax = afterDiscount * (taxRate / 100);
        const grandTotal = afterDiscount + tax;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            contingency: Math.round(contingency * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            discount: Math.round(discount * 100) / 100,
            grandTotal: Math.round(grandTotal * 100) / 100
        };
    }

    /**
     * Three-Point Estimation (PERT)
     * E = (O + 4M + P) / 6
     */
    static threePointEstimate(optimistic, mostLikely, pessimistic) {
        const expected = (optimistic + 4 * mostLikely + pessimistic) / 6;
        const standardDeviation = (pessimistic - optimistic) / 6;

        return {
            expected: Math.round(expected * 100) / 100,
            standardDeviation: Math.round(standardDeviation * 100) / 100,
            optimistic,
            mostLikely,
            pessimistic,
            // Confidence ranges
            confidence68: {
                low: Math.round((expected - standardDeviation) * 100) / 100,
                high: Math.round((expected + standardDeviation) * 100) / 100
            },
            confidence95: {
                low: Math.round((expected - 2 * standardDeviation) * 100) / 100,
                high: Math.round((expected + 2 * standardDeviation) * 100) / 100
            }
        };
    }

    /**
     * Risk-adjusted cost calculation
     */
    static calculateRiskAdjustedCost(baseCost, riskFactor) {
        const riskAmount = baseCost * (riskFactor / 100);
        return {
            baseCost,
            riskFactor,
            riskAmount: Math.round(riskAmount * 100) / 100,
            adjustedCost: Math.round((baseCost + riskAmount) * 100) / 100
        };
    }

    /**
     * Labor cost calculation
     */
    static calculateLaborCost(hourlyRate, hoursPerDay, days, numberOfResources) {
        const totalHours = hoursPerDay * days * numberOfResources;
        const totalCost = totalHours * hourlyRate;

        return {
            hourlyRate,
            totalHours,
            totalCost: Math.round(totalCost * 100) / 100,
            costPerResource: Math.round((totalCost / numberOfResources) * 100) / 100
        };
    }

    /**
     * ROI (Return on Investment) calculation
     */
    static calculateROI(totalInvestment, expectedReturn, timeframeMonths) {
        const roi = ((expectedReturn - totalInvestment) / totalInvestment) * 100;
        const monthlyROI = roi / timeframeMonths;

        return {
            totalInvestment,
            expectedReturn,
            roi: Math.round(roi * 100) / 100,
            monthlyROI: Math.round(monthlyROI * 100) / 100,
            paybackPeriod: Math.round((totalInvestment / (expectedReturn / timeframeMonths)) * 100) / 100
        };
    }

    /**
     * Generate cost summary statistics
     */
    static generateSummary(costItems) {
        if (costItems.length === 0) {
            return { totalItems: 0, subtotal: 0, average: 0, highest: 0, lowest: 0 };
        }

        const costs = costItems.map(item => item.unitCost * item.quantity);
        const subtotal = costs.reduce((a, b) => a + b, 0);

        return {
            totalItems: costItems.length,
            subtotal: Math.round(subtotal * 100) / 100,
            average: Math.round((subtotal / costs.length) * 100) / 100,
            highest: Math.max(...costs),
            lowest: Math.min(...costs),
            categories: [...new Set(costItems.map(item => item.category))]
        };
    }
}

module.exports = CostCalculator;