# Shingle Removal Workflow Check

## Overview
Added a validation step to the User Prompt Workflow that ensures at least one shingle removal line item exists before proceeding. This prevents incomplete estimates and guides users to add required items.

## Feature Implementation

### When Does It Trigger?
The shingle removal check **only appears** when:
1. User clicks "User Prompt Workflow" button
2. **NONE** of the 4 shingle removal items exist in the estimate

### Required Shingle Removal Items (Any One):
- Remove Laminated comp. shingle rfg. - w/out felt
- Remove 3 tab- 25 yr. comp. shingle roofing - w/out felt
- Remove 3 tab 25 yr. composition shingle roofing - incl. felt
- Remove Laminated comp. shingle rfg. - w/ felt

### Workflow Logic

**Scenario 1: Shingle Removal Exists**
```
User clicks "User Prompt Workflow"
  → Check for shingle removal items
  → ✅ At least one exists
  → Skip modal, continue workflow normally
  → Show User Prompt Workflow modal
```

**Scenario 2: No Shingle Removal**
```
User clicks "User Prompt Workflow"
  → Check for shingle removal items
  → ❌ None exist
  → Show Shingle Removal Modal
  → User has 3 options:
      1. Add shingle removal → Continue workflow automatically
      2. Skip & Continue → Continue workflow without adding
      3. Cancel → Exit workflow
```

## User Interface

### Shingle Removal Modal

**Header (Orange)**
- Title: "⚠️ Shingle Removal Required"
- Subtitle: "No shingle removal items found in estimate"

**Body**
- Warning message explaining requirement
- Dropdown to select shingle removal type (4 options)
- Quantity input field (number, step 0.01)
- Live price preview showing:
  - Unit Price (from Roof Master Macro)
  - Quantity (user input)
  - Total RCV (calculated)

**Footer Options**
1. **Cancel** (Gray) - Close modal, exit workflow
2. **Skip & Continue** (Dark Gray) - Proceed without adding
3. **Add to Estimate** (Orange) - Add item and continue workflow

## Technical Details

### Data Source
- Pricing pulled from Roof Master Macro (`/public/roof_master_macro.txt`)
- Automatic lookup by exact description match
- Includes unit price, RCV, ACV, and unit type

### New Line Item Creation
When adding a shingle removal item:
```typescript
{
  line_number: (max existing + 1),
  description: (selected option),
  quantity: (user input),
  unit: (from macro, default 'SQ'),
  unit_price: (from macro),
  RCV: quantity × unit_price,
  age_life: '0/NA',
  condition: 'Avg.',
  dep_percent: 0,
  depreciation_amount: 0,
  ACV: RCV - 0,
  location_room: 'Roof',
  category: 'Roof',
  page_number: (max existing)
}
```

### Workflow Continuation
After adding item:
1. Item added to `extractedLineItems` state
2. Modal closes automatically
3. User Prompt Workflow continues with updated line items
4. No interruption or re-click needed

## Benefits

1. **Data Quality**: Ensures critical shingle removal items are present
2. **User Guidance**: Clear prompts guide users to add missing items
3. **Flexibility**: Skip option allows override if needed
4. **Automation**: Workflow continues seamlessly after adding item
5. **Accuracy**: Pricing automatically pulled from authoritative source

## Example Flow

```
1. User clicks "User Prompt Workflow"
2. System checks: No shingle removal items found
3. Modal appears: "⚠️ Shingle Removal Required"
4. User selects: "Remove Laminated comp. shingle rfg. - w/out felt"
5. User enters: 25.50 SQ
6. Preview shows: Unit Price $XX.XX, Total RCV $XXX.XX
7. User clicks: "Add to Estimate"
8. ✅ Item added automatically
9. ✅ Modal closes
10. ✅ User Prompt Workflow continues
11. ✅ Prompts modal appears
```

## Future Enhancements

- Add validation for other required item types
- Remember user's last selection
- Show which existing items prevent the modal
- Allow editing quantity after adding

