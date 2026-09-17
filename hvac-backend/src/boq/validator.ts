import { BOQItem, BOQValidationResult, BOQValidationIssue } from '../domain/models';

export class BOQValidator {
  public static validateBOQ(boq: BOQItem[]): BOQValidationResult {
    const issues: BOQValidationIssue[] = [];
    const itemCodesSeen = new Set<string>();
    let hasUnpricedItems = false;
    let verifiedSubtotal: number | null = 0;
    let pricedItemsCount = 0;
    let unpricedItemsCount = 0;
    let detectedCurrency: string | null = null;

    const validatedBOQ: BOQItem[] = boq.map((item, index) => {
      const itemCode = item.item_code || `LINE-${index + 1}`;
      let quantity = item.quantity;
      let unitRate = item.unit_rate;
      let totalAmount = item.total_amount;
      let status = item.verification_status || 'NEEDS_REVIEW';
      const currency = item.currency || null;

      // 1. DUPLICATE CHECK
      if (itemCodesSeen.has(itemCode)) {
        issues.push({
          item_code: itemCode,
          issue_type: 'DUPLICATE_ITEM',
          message: `Duplicate BOQ item code '${itemCode}' detected.`,
          severity: 'ERROR',
        });
      } else {
        itemCodesSeen.add(itemCode);
      }

      // 2. CURRENCY CONSISTENCY CHECK
      if (currency) {
        if (!detectedCurrency) {
          detectedCurrency = currency;
        } else if (detectedCurrency !== currency) {
          issues.push({
            item_code: itemCode,
            issue_type: 'CURRENCY_MISMATCH',
            message: `Currency mismatch detected: item currency '${currency}' does not match project currency '${detectedCurrency}'.`,
            severity: 'ERROR',
          });
        }
      }

      // 3. QUANTITY VALIDATION
      if (quantity === null) {
        if (totalAmount !== null) {
          issues.push({
            item_code: itemCode,
            issue_type: 'QUANTITY_MISMATCH',
            message: `Line item '${itemCode}' has null quantity but non-null total amount (${totalAmount}). Line total reset to null.`,
            severity: 'ERROR',
          });
          totalAmount = null;
        }
      } else if (typeof quantity !== 'number' || isNaN(quantity) || quantity < 0) {
        issues.push({
          item_code: itemCode,
          issue_type: 'QUANTITY_MISMATCH',
          message: `Line item '${itemCode}' has invalid quantity (${quantity}). Line total reset to null.`,
          severity: 'ERROR',
        });
        totalAmount = null;
      }

      // 4. UNIT RATE & PRICE VERIFICATION CHECK
      if (unitRate === null || status !== 'VERIFIED') {
        if (totalAmount !== null) {
          issues.push({
            item_code: itemCode,
            issue_type: 'UNVERIFIED_PRICE',
            message: `Line item '${itemCode}' has total amount (${totalAmount}) but unit rate is ${unitRate} and status is ${status}. Line total reset to null.`,
            severity: 'ERROR',
          });
          totalAmount = null;
        }
      }

      // 5. ARITHMETIC VALIDATION FOR PRICED LINES
      if (quantity !== null && quantity >= 0 && unitRate !== null && status === 'VERIFIED') {
        const expectedTotal = Math.round(quantity * unitRate * 100) / 100;
        if (totalAmount === null) {
          issues.push({
            item_code: itemCode,
            issue_type: 'ARITHMETIC_MISMATCH',
            message: `Line item '${itemCode}' has verified quantity and unit rate but null total amount. Expected ${expectedTotal}.`,
            severity: 'ERROR',
          });
          totalAmount = expectedTotal;
        } else if (Math.abs(totalAmount - expectedTotal) > 0.01) {
          issues.push({
            item_code: itemCode,
            issue_type: 'RATE_MISMATCH',
            message: `Line item '${itemCode}' line total arithmetic mismatch: expected ${expectedTotal} (${quantity} * ${unitRate}), found ${totalAmount}.`,
            severity: 'ERROR',
          });
          totalAmount = expectedTotal;
        }
      }

      // 6. SUBTOTAL & PRICED/UNPRICED CLASSIFICATION
      if (status === 'VERIFIED' && totalAmount !== null && quantity !== null && unitRate !== null) {
        pricedItemsCount++;
        if (verifiedSubtotal !== null) {
          verifiedSubtotal = Math.round((verifiedSubtotal + totalAmount) * 100) / 100;
        }
      } else {
        hasUnpricedItems = true;
        unpricedItemsCount++;
      }

      return {
        ...item,
        quantity,
        unit_rate: unitRate,
        total_amount: totalAmount,
        currency: currency || detectedCurrency || 'INR',
        verification_status: status,
      };
    });

    const unpricedScopeStatus = hasUnpricedItems ? 'NOT_AVAILABLE' : 'FULLY_VERIFIED';
    const isValid = issues.filter((i) => i.severity === 'ERROR').length === 0;

    return {
      is_valid: isValid,
      has_unpriced_items: hasUnpricedItems,
      unpriced_scope_status: unpricedScopeStatus,
      verified_subtotal: pricedItemsCount > 0 ? verifiedSubtotal : null,
      total_items_count: boq.length,
      priced_items_count: pricedItemsCount,
      unpriced_items_count: unpricedItemsCount,
      currency: detectedCurrency || 'INR',
      issues,
      validated_boq: validatedBOQ,
    };
  }
}
