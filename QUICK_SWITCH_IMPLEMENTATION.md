# Line Item Quick Switch Implementation

## Overview
Added the ability to quickly switch specific line items to alternative items with automatic recalculation based on Roof Master Macro pricing.

## Features Implemented

### 1. **Hover Quick Switch** 
When hovering over eligible line items, a "🔄 Switch" button appears that allows instant switching.

### 2. **Right-Click Context Menu**
Right-clicking on eligible line items opens a context menu with quick switch option.

### 3. **Automatic Recalculation**
When switching items:
- New description is pulled from the selected alternative
- Unit price is fetched from Roof Master Macro
- RCV is recalculated: `quantity × new_unit_price`
- ACV is recalculated: `RCV - depreciation_amount`
- Quantity remains unchanged

## Supported Quick Switches

| Original Item | Switch To |
|--------------|-----------|
| Hip/Ridge cap Standard profile - composition shingles | Hip/Ridge cap High profile - composition shingles |
| Drip edge/gutter apron | Drip edge |
| Sheathing - OSB - 5/8" | Sheathing OSB 1/2" |

## How to Use

### Method 1: Hover Switch
1. Hover over an eligible line item in the estimate table
2. Click the blue "🔄 Switch" button that appears
3. Item is instantly switched with recalculated values

### Method 2: Right-Click Switch
1. Right-click on an eligible line item
2. Click "Quick Switch" in the context menu
3. Item is instantly switched with recalculated values

## Technical Implementation

### State Management
```typescript
const [roofMasterMacro, setRoofMasterMacro] = useState<Map<string, any>>(new Map());
const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemIndex: number } | null>(null);
const [hoveredItem, setHoveredItem] = useState<number | null>(null);
```

### Quick Switch Definitions
```typescript
const quickSwitchOptions: Record<string, string> = {
  'Hip/Ridge cap Standard profile - composition shingles': 'Hip/Ridge cap High profile - composition shingles',
  'Drip edge/gutter apron': 'Drip edge',
  'Sheathing - OSB - 5/8"': 'Sheathing OSB 1/2"'
};
```

### Data Source
- Roof Master Macro loaded from `/public/roof_master_macro.txt`
- Parsed as CSV with columns: Description, Unit Price, RCV, ACV, Unit
- Stored in a Map for O(1) lookup performance

## Benefits

1. **Speed**: Instant switching without manual editing
2. **Accuracy**: Automatic pricing from authoritative Roof Master Macro
3. **UX**: Intuitive hover and right-click interactions
4. **Reliability**: All calculations handled automatically

## Future Enhancements

- Add more quick switch pairs based on user needs
- Allow custom quick switch definitions
- Show price difference on hover
- Add undo/redo functionality for switches

