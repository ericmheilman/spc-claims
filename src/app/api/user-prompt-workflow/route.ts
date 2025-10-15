import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀🚀🚀 USER PROMPT WORKFLOW API CALLED - LATEST VERSION WITH REFACTORED CHIMNEY ANALYSIS - TIMESTAMP:', new Date().toISOString());
    const inputData = await request.json();
    
    console.log('Received request for user prompt workflow with data:', {
      lineItemsCount: inputData.line_items?.length || 0,
      hasRoofMeasurements: !!inputData.roof_measurements
    });

    // Validate input data
    if (!inputData.line_items || !Array.isArray(inputData.line_items)) {
      return NextResponse.json(
        { success: false, error: 'Invalid line items data' },
        { status: 400 }
      );
    }

    if (!inputData.roof_measurements || typeof inputData.roof_measurements !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid roof measurements data' },
        { status: 400 }
      );
    }

    // Analyze line items and generate prompts
    const prompts = analyzeLineItems(inputData.line_items, inputData.roof_measurements);
    
    console.log('Generated prompts:', prompts);

    return NextResponse.json({
      success: true,
      data: {
        prompts: prompts,
        analysis: {
          totalLineItems: inputData.line_items.length,
          promptsGenerated: prompts.length
        }
      }
    });

  } catch (error) {
    console.error('Error in user prompt workflow:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

function analyzeLineItems(lineItems: any[], roofMeasurements: any): any[] {
  const prompts: any[] = [];
  
  console.log('🔍 Analyzing line items for user prompts...');
  
  // Rule 1: Check for shingle removal items
  const shingleRemovalItems = [
    "Remove Laminated comp. shingle rfg. - w/out felt",
    "Remove 3 tab- 25 yr. comp. shingle roofing - w/out felt", 
    "Remove 3 tab 25 yr. composition shingle roofing - incl. felt",
    "Remove Laminated comp. shingle rfg. - w/ felt"
  ];
  
  const foundRemovalItems = shingleRemovalItems.filter(item => 
    lineItems.some(lineItem => lineItem.description === item)
  );
  
  if (foundRemovalItems.length === 0) {
    prompts.push({
      id: 'shingle_removal_missing',
      type: 'warning',
      title: 'Missing Shingle Removal Items',
      message: 'No shingle removal items found in the estimate. Please add at least one of the following:',
      items: shingleRemovalItems,
      action: 'add_required',
      priority: 'high'
    });
  }
  
  // Rule 2: Check for O&P (Overhead and Profit)
  const opItem = lineItems.find(item => 
    item.description.toLowerCase().includes('o&p') || 
    item.description.toLowerCase().includes('overhead') ||
    item.description.toLowerCase().includes('profit')
  );
  
  if (!opItem) {
    prompts.push({
      id: 'op_missing',
      type: 'recommendation',
      title: 'Missing Overhead & Profit',
      message: 'O&P (Overhead and Profit) is not present in the estimate.',
      suggestion: 'Would you like to add "O&P" with a value of 20%?',
      action: 'add_op',
      value: '20%',
      priority: 'high'
    });
  }
  
  // Rule 3: Check for shingle installation items
  const shingleInstallItems = [
    "Laminated comp. shingle rfg. w/out felt",
    "3 tab 25 yr. comp. shingle roofing - w/out felt",
    "3 tab 25 yr. composition shingle roofing incl. felt", 
    "Laminated comp. shingle rfg. - w/ felt"
  ];
  
  const foundInstallItems = shingleInstallItems.filter(item => 
    lineItems.some(lineItem => lineItem.description === item)
  );
  
  if (foundInstallItems.length === 0) {
    prompts.push({
      id: 'shingle_install_missing',
      type: 'warning',
      title: 'Missing Shingle Installation Items',
      message: 'No shingle installation items found in the estimate. Please manually add one of the following:',
      items: shingleInstallItems,
      action: 'add_required',
      priority: 'high'
    });
  }
  
  // Rule 4: Check for ridge vent items
  const ridgeVentItems = [
    "Continuous ridge vent shingle-over style",
    "Continuous ridge vent aluminum"
  ];
  
  const foundRidgeVentItems = ridgeVentItems.filter(item => 
    lineItems.some(lineItem => lineItem.description === item)
  );
  
  const totalRidgesLength = roofMeasurements["Total Line Lengths (Ridges)"]?.value || 0;
  
  if (foundRidgeVentItems.length === 0 && totalRidgesLength > 0) {
    const suggestedQuantity = totalRidgesLength / 100;
    prompts.push({
      id: 'ridge_vent_missing',
      type: 'recommendation',
      title: 'Missing Ridge Vent',
      message: `Neither "Continuous ridge vent shingle-over style" nor "Continuous ridge vent aluminum" is present, but ridges were detected (${totalRidgesLength} ft).`,
      suggestion: `Would you like to add a ridge vent? If so, which type and how much?`,
      action: 'add_ridge_vent',
      suggestedQuantity: suggestedQuantity,
      totalRidgesLength: totalRidgesLength,
      options: ridgeVentItems,
      priority: 'medium'
    });
  }
  
  // Rule 5: Step Flashing and Gutters Analysis with Kickout Diverter Logic
  const kickoutDiverterItem = lineItems.find(item => 
    item.description === "Flashing - kick-out diverter"
  );
  
  // Only prompt if kickout diverter is not already present
  if (!kickoutDiverterItem) {
    prompts.push({
      id: 'step_flashing_gutters_analysis',
      type: 'question',
      title: 'Step Flashing and Gutters Analysis',
      message: 'Are "Step flashing" and "Gutters" present?',
      question: 'Step flashing and gutters present?',
      action: 'step_flashing_gutters_check',
      options: ['Yes', 'No'],
      priority: 'medium',
      followUp: {
        ifYes: {
          question: 'How many kickouts are present?',
          customField: {
            id: 'kickout_count',
            label: 'Number of kickouts',
            type: 'number',
            min: 0,
            max: 50
          },
          addLineItem: {
            description: 'Flashing - kick-out diverter',
            unit: 'EA',
            fromRoofMasterMacro: true
          }
        }
      }
    });
  }
  
  // Rule 6: Category C Rule - Chimney Analysis and Cricket Logic
  const chimneyFlashingItems = [
    "Chimney flashing - small (24\" x 24\")",
    "Chimney flashing - average (32\" x 36\")",
    "Chimney flashing - large (32\" x 60\")"
  ];

  const foundChimneyItems = chimneyFlashingItems.filter(item =>
    lineItems.some(lineItem => lineItem.description === item)
  );

  // Category C Rule: IF none of the chimney flashing items are present, prompt user to confirm chimney_present
  if (foundChimneyItems.length === 0) {
    console.log('🔥🔥🔥 Adding REFACTORED chimney analysis step - no chimney flashing items found - CURRENT TIME:', new Date().toISOString());
    prompts.push({
      id: 'chimney_analysis',
      type: 'question',
      title: 'Chimney Analysis Required - UPDATED VERSION',
      message: 'No chimney flashing items found in the estimate. (This is the NEW version with proper follow-up logic)',
      question: 'Is there a chimney present on this roof?',
      action: 'chimney_analysis',
      options: ['Yes', 'No'],
      priority: 'medium'
    });
    
    // Add the follow-up question as a separate prompt that will be triggered
    prompts.push({
      id: 'chimney_size_selection',
      type: 'question',
      title: 'Chimney Size Selection - NEW VERSION',
      message: 'Select chimney size or enter dimensions: (This will now work properly when you click Yes)',
      question: 'What size chimney or custom dimensions?',
      action: 'chimney_size_selection',
      options: ['Small (24" x 24")', 'Medium (32" x 36")', 'Large (32" x 60")', 'Custom dimensions'],
      priority: 'medium',
      dependsOn: 'chimney_analysis', // This will only show if chimney_analysis = 'Yes'
      addLineItem: {
        'Small (24" x 24")': null, // Do not add cricket for small
        'Medium (32" x 36")': {
          description: 'Saddle or cricket - up to 25 SF',
          unit: 'EA',
          quantity: 1,
          fromRoofMasterMacro: true
        },
        'Large (32" x 60")': {
          description: 'Saddle or cricket - 26 to 50 SF',
          unit: 'EA',
          quantity: 1,
          fromRoofMasterMacro: true
        },
        'Custom dimensions': {
          description: 'Saddle or cricket - up to 25 SF', // Default, will be calculated based on dimensions
          unit: 'EA',
          quantity: 1,
          fromRoofMasterMacro: true,
          requiresCalculation: true
        }
      },
      customField: {
        id: 'chimney_dimensions',
        label: 'Enter dimensions (length x width in inches)',
        type: 'text',
        placeholder: 'e.g., 30 x 36'
      }
    });
  }
  
  // Rule 7: Additional Layers Analysis
  prompts.push({
    id: 'additional_layers',
    type: 'question',
    title: 'Additional Shingle Layers',
    message: 'Are there additional layers of shingles present?',
    question: 'Additional layers present?',
    action: 'additional_layers',
    options: ['Yes', 'No'],
    priority: 'medium',
    followUp: {
      ifYes: {
        questions: [
          {
            id: 'layer_count',
            question: 'How many additional layers?',
            type: 'number',
            min: 1,
            max: 5
          },
          {
            id: 'layer_type',
            question: 'What type of shingles?',
            options: ['3-tab', 'laminated']
          },
          {
            id: 'coverage',
            question: 'Coverage area:',
            options: ['entire roof', 'specify squares'],
            customField: {
              id: 'squares',
              label: 'Number of squares',
              type: 'number',
              min: 0.1,
              step: 0.1
            }
          }
        ]
      }
    }
  });
  
  // Rule 8: Number of Stories Analysis
  prompts.push({
    id: 'stories_analysis',
    type: 'question',
    title: 'Building Stories',
    message: 'How many stories does this building have?',
    question: 'Number of stories:',
    action: 'stories_analysis',
    options: ['1', '2', '3+'],
    priority: 'medium',
    followUp: {
      ifAboveOne: {
        question: 'Above one story square footage:',
        options: ['Specify square footage', 'Percentage of total roof area'],
        customFields: [
          {
            id: 'above_one_story_sqft',
            label: 'Square footage above first story',
            type: 'number',
            min: 0
          },
          {
            id: 'above_one_story_percent',
            label: 'Percentage of total roof area',
            type: 'number',
            min: 0,
            max: 100
          }
        ]
      }
    }
  });
  
  // Rule 9: Category C Rule - Permit Analysis
  prompts.push({
    id: 'permit_analysis',
    type: 'question',
    title: 'Permit Requirements',
    message: 'Category C Rule: Is permit_missing == True?',
    question: 'Is permit_missing == True?',
    action: 'permit_analysis',
    options: ['Yes', 'No'],
    priority: 'low',
    followUp: {
      ifYes: {
        question: 'What is the permit cost?',
        customField: {
          id: 'permit_cost',
          label: 'Permit cost ($)',
          type: 'number',
          min: 0,
          step: 0.01
        },
        addLineItem: {
          description: 'Permit',
          unit: 'EA',
          fromRoofMasterMacro: false,
          userDefinedCost: true
        }
      }
    }
  });
  
  // Rule 10: Depreciation Contest
  prompts.push({
    id: 'depreciation_contest',
    type: 'question',
    title: 'Depreciation Contest',
    message: 'Do you want to contest the depreciation?',
    question: 'Contest depreciation?',
    action: 'depreciation_contest',
    options: ['Yes', 'No'],
    priority: 'low',
    followUp: {
      ifYes: {
        question: 'What is the actual shingle age?',
        customField: {
          id: 'shingle_age',
          label: 'Shingle age (years)',
          type: 'number',
          min: 0,
          max: 50
        }
      }
    }
  });
  
  // Rule 11: Hidden Damages
  prompts.push({
    id: 'hidden_damages',
    type: 'question',
    title: 'Hidden Damages',
    message: 'Are there any hidden damages that need to be accounted for?',
    question: 'Hidden damages present?',
    action: 'hidden_damages',
    options: ['Yes', 'No'],
    priority: 'low',
    followUp: {
      ifYes: {
        question: 'What is the estimated cost for hidden damages?',
        customField: {
          id: 'hidden_damages_cost',
          label: 'Hidden damages cost ($)',
          type: 'number',
          min: 0,
          step: 0.01
        }
      }
    }
  });
  
  // Rule 12: Spaced Decking
  prompts.push({
    id: 'spaced_decking',
    type: 'question',
    title: 'Spaced Decking',
    message: 'Is spaced decking present?',
    question: 'Spaced decking present?',
    action: 'spaced_decking',
    options: ['Yes', 'No'],
    priority: 'medium',
    followUp: {
      ifYes: {
        message: 'Will add "Sheathing - OSB - 5/8\"" with quantity based on total roof area.',
        suggestedQuantity: (roofMeasurements["Total Roof Area"]?.value || 0) / 100
      }
    }
  });
  
  // Rule 13: Roof Access Issues
  prompts.push({
    id: 'roof_access',
    type: 'question',
    title: 'Roof Access Issues',
    message: 'Are there any roof access issues?',
    question: 'Roof access issues present?',
    action: 'roof_access',
    options: ['Yes', 'No'],
    priority: 'medium',
    followUp: {
      ifYes: {
        question: 'Does it prevent roofstocking delivery?',
        options: ['Yes', 'No'],
        followUp: {
          ifYes: {
            question: 'Select all applicable issues:',
            checkboxes: [
              'Cracked/broken driveway',
              'Aggregate/paver driveway',
              'Boom truck cannot reach',
              'Gate clearance issues',
              'Landscaping blocks equipment',
              'Other issues'
            ],
            customField: {
              id: 'other_issues',
              label: 'Describe other issues',
              type: 'text'
            }
          }
        }
      }
    }
  });
  
  // Rule 14: Skylights/Roof Windows Analysis
  prompts.push({
    id: 'skylights_roof_windows',
    type: 'question',
    title: 'Skylights/Roof Windows',
    message: 'Are there skylights or roof windows present?',
    question: 'Skylights or roof windows present?',
    action: 'skylights_roof_windows',
    options: ['Yes', 'No'],
    priority: 'medium',
    followUp: {
      ifYes: {
        questions: [
          {
            id: 'vent_type',
            question: 'What type of vent?',
            options: ['Dome/Curb', 'Deckmount']
          },
          {
            id: 'vent_quantity',
            question: 'How many vents?',
            type: 'number',
            min: 1,
            max: 20
          },
          {
            id: 'install_type',
            question: 'Installation type:',
            options: ['Flashing kit only', 'Full unit']
          }
        ]
      }
    }
  });
  
  // Rule 15: Valley Metal Analysis
  const valleyMetalItems = [
    "Valley metal",
    "Valley metal - (W) profile"
  ];
  
  const foundValleyMetalItems = valleyMetalItems.filter(item => 
    lineItems.some(lineItem => lineItem.description === item)
  );
  
  const totalValleysLength = roofMeasurements["Total Valleys Length"]?.value || 0;
  
  if (foundValleyMetalItems.length === 0 && totalValleysLength > 0) {
    prompts.push({
      id: 'valley_metal_analysis',
      type: 'question',
      title: 'Valley Metal Required',
      message: `No valley metal items found, but valleys were detected (${totalValleysLength} ft).`,
      question: 'What type of valley construction?',
      action: 'valley_metal_analysis',
      options: ['Open valley', 'Closed valley'],
      priority: 'medium',
      followUp: {
        calculations: {
          totalValleysLength: totalValleysLength,
          openValleyQuantity: totalValleysLength / 100,
          closedValleyQuantity: (totalValleysLength * 3) / 100,
          note: 'Open valley uses valley metal, closed valley uses ice & water barrier'
        }
      }
    });
  }
  
  // Rule 16: Labor Calculation
  const totalRoofArea = roofMeasurements["Total Roof Area"]?.value || 0;
  if (totalRoofArea > 0) {
    const bundles = totalRoofArea * 3;
    prompts.push({
      id: 'labor_calculation',
      type: 'calculation',
      title: 'Labor Calculation',
      message: 'Labor calculation based on roof area:',
      action: 'labor_calculation',
      calculations: {
        bundles: bundles,
        totalRoofArea: totalRoofArea,
        note: 'Labor time will be calculated based on number of stories and bundles'
      },
      priority: 'low'
    });
  }
  
  console.log(`✅ Generated ${prompts.length} prompts`);
  return prompts;
}
