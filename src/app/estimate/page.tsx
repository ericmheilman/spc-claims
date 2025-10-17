'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Settings, FileText, CheckCircle, Building, DollarSign, TrendingUp, Download, Share2, Upload } from 'lucide-react';
import { extractRoofMeasurements, applyRoofAdjustmentRules, type RulesEngineResult } from '../../utils/roofAdjustmentRules';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface LineItem {
  line_number: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  RCV: number;
  age_life: string;
  condition: string;
  dep_percent: number | null;
  depreciation_amount: number;
  ACV: number;
  location_room: string | null;
  category: string;
  page_number: number;
  narrative?: string;
}

interface Category {
  name: string;
  items: LineItem[];
  totals: {
    rcv: number;
    depreciation: number;
    acv: number;
  };
}

function EstimatePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [extractedLineItems, setExtractedLineItems] = useState<LineItem[]>([]);
  const [rawAgentData, setRawAgentData] = useState<any>(null);
  
  // Adjustment agent state
  const [adjustmentAgentResult, setAdjustmentAgentResult] = useState<any>(null);
  const [isRunningAdjustmentAgent, setIsRunningAdjustmentAgent] = useState(false);
  const [showAdjustedEstimate, setShowAdjustedEstimate] = useState(false);
  
  // Claim waste percentage state
  const [claimWasteResult, setClaimWasteResult] = useState<any>(null);
  const [isCalculatingClaimWaste, setIsCalculatingClaimWaste] = useState(false);

  // SPC Adjustment Engine state
  const [ruleResults, setRuleResults] = useState<any>(null);
  const [isRunningRules, setIsRunningRules] = useState(false);
  const [isRunningJSRules, setIsRunningJSRules] = useState(false);
  const [showRuleResults, setShowRuleResults] = useState(false);
  const [showPythonDebugOutput, setShowPythonDebugOutput] = useState(false);
  const [showPythonExecutionDebug, setShowPythonExecutionDebug] = useState(false);
  const [extractedRoofMeasurements, setExtractedRoofMeasurements] = useState<any>({});

  // SPC Shingle Removal Check state
  const [showSPCShingleRemovalModal, setShowSPCShingleRemovalModal] = useState(false);
  const [selectedSPCShingleRemoval, setSelectedSPCShingleRemoval] = useState('');
  const [spcShingleRemovalQuantity, setSPCShingleRemovalQuantity] = useState('');
  const [showSPCItemsFoundModal, setShowSPCItemsFoundModal] = useState(false);
  const [foundRemovalItems, setFoundRemovalItems] = useState<any[]>([]);

  // SPC Installation Shingles Check state
  const [showSPCInstallationModal, setShowSPCInstallationModal] = useState(false);
  const [selectedSPCInstallation, setSelectedSPCInstallation] = useState('');
  const [spcInstallationQuantity, setSPCInstallationQuantity] = useState('');
  const [showSPCInstallationFoundModal, setShowSPCInstallationFoundModal] = useState(false);
  const [foundInstallationItems, setFoundInstallationItems] = useState<any[]>([]);
  const [currentSPCLineItems, setCurrentSPCLineItems] = useState<any[]>([]);

  // SPC Final Step Check state (for automatically added items)
  const [showSPCFinalStepModal, setShowSPCFinalStepModal] = useState(false);
  const [foundSPCAddedItems, setFoundSPCAddedItems] = useState<any[]>([]);

  // SPC Ridge Vent Check state
  const [showSPCRidgeVentModal, setShowSPCRidgeVentModal] = useState(false);
  const [selectedSPCRidgeVent, setSelectedSPCRidgeVent] = useState('');
  const [showSPCRidgeVentFoundModal, setShowSPCRidgeVentFoundModal] = useState(false);
  const [foundRidgeVentItems, setFoundRidgeVentItems] = useState<any[]>([]);

  // SPC Chimney/Cricket Check state
  const [showSPCChimneyModal, setShowSPCChimneyModal] = useState(false);
  const [showSPCChimneyFoundModal, setShowSPCChimneyFoundModal] = useState(false);
  const [foundChimneyItems, setFoundChimneyItems] = useState<any[]>([]);
  const [chimneyPresent, setChimneyPresent] = useState<boolean | null>(null);
  const [chimneySize, setChimneySize] = useState('');
  const [chimneyLength, setChimneyLength] = useState('');
  const [chimneyWidth, setChimneyWidth] = useState('');

  // SPC Additional Layers Check state
  const [showSPCAdditionalLayersModal, setShowSPCAdditionalLayersModal] = useState(false);
  const [showSPCAdditionalLayersFoundModal, setShowSPCAdditionalLayersFoundModal] = useState(false);
  const [foundAdditionalLayersItems, setFoundAdditionalLayersItems] = useState<any[]>([]);
  const [additionalLayersPresent, setAdditionalLayersPresent] = useState<boolean | null>(null);
  const [layerCount, setLayerCount] = useState('');
  const [layerType, setLayerType] = useState('');
  const [coverageType, setCoverageType] = useState('');
  const [coverageSquares, setCoverageSquares] = useState('');

  // SPC Permit Check state
  const [showSPCPermitModal, setShowSPCPermitModal] = useState(false);
  const [showSPCPermitFoundModal, setShowSPCPermitFoundModal] = useState(false);
  const [foundPermitItems, setFoundPermitItems] = useState<any[]>([]);
  const [permitMissing, setPermitMissing] = useState<boolean | null>(null);
  const [permitCost, setPermitCost] = useState('');

  // SPC Hidden Damages Check state
  const [showSPCHiddenDamagesModal, setShowSPCHiddenDamagesModal] = useState(false);
  const [hiddenDamagesCost, setHiddenDamagesCost] = useState('');
  const [hiddenDamagesNarrative, setHiddenDamagesNarrative] = useState('');

  // SPC Roof Access Issues Check state
  const [showSPCRoofAccessModal, setShowSPCRoofAccessModal] = useState(false);
  const [roofAccessIssues, setRoofAccessIssues] = useState<boolean | null>(null);
  const [numberOfStories, setNumberOfStories] = useState('');
  const [roofstockingDelivery, setRoofstockingDelivery] = useState<boolean | null>(null);
  const [roofAccessIssueTypes, setRoofAccessIssueTypes] = useState<string[]>([]);
  const [otherIssueText, setOtherIssueText] = useState<string>('');

  // SPC O&P Check state
  const [showSPCOPModal, setShowSPCOPModal] = useState(false);
  const [showSPCOPFoundModal, setShowSPCOPFoundModal] = useState(false);
  const [foundOPItems, setFoundOPItems] = useState<any[]>([]);

  // Unified Workflow state
  const [showUnifiedWorkflow, setShowUnifiedWorkflow] = useState(false);
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState(0);
  const [workflowData, setWorkflowData] = useState<any>(null);

  // Custom Price and Quantity Edit state
  const [showPriceEditModal, setShowPriceEditModal] = useState(false);
  const [editingPriceItem, setEditingPriceItem] = useState<any>(null);
  const [priceJustification, setPriceJustification] = useState({ 
    unit_price: 0, 
    quantity: 0,
    justification_text: '' 
  });

  // Replace Line Item state
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replacingItem, setReplacingItem] = useState<any>(null);
  const [selectedReplacementItem, setSelectedReplacementItem] = useState('');

  // Add New Line Item state
  const [showAddLineItemModal, setShowAddLineItemModal] = useState(false);
  const [newLineItem, setNewLineItem] = useState({
    description: '',
    quantity: 0,
    unit: 'EA'
  });
  
  // RMM Unit Cost Comparator state
  const [rmmAdjustedClaim, setRmmAdjustedClaim] = useState<any>(null);
  const [isRunningRmmComparator, setIsRunningRmmComparator] = useState(false);
  const [showRmmAdjustedClaim, setShowRmmAdjustedClaim] = useState(false);

  // Combined Workflow state
  const [combinedResults, setCombinedResults] = useState<any>(null);
  const [isRunningCombined, setIsRunningCombined] = useState(false);
  const [showCombinedResults, setShowCombinedResults] = useState(false);

  // Quick Switch state
  const [roofMasterMacro, setRoofMasterMacro] = useState<Map<string, any>>(new Map());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemIndex: number } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);

  // Debug and Error state
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [localStorageData, setLocalStorageData] = useState<any>(null);

  // PDF Export state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Roof Master Macro Upload state
  const [isUploadingRMM, setIsUploadingRMM] = useState(false);
  const [rmmUploadStatus, setRmmUploadStatus] = useState<{ success: boolean; message: string; itemCount?: number } | null>(null);

  // Shingle Removal Check state
  const [showShingleRemovalModal, setShowShingleRemovalModal] = useState(false);
  const [selectedShingleRemoval, setSelectedShingleRemoval] = useState('');
  const [shingleRemovalQuantity, setShingleRemovalQuantity] = useState('');
  const [shingleRemovalSkipped, setShingleRemovalSkipped] = useState(false);
  const [foundShingleRemovalItems, setFoundShingleRemovalItems] = useState<string[]>([]);

  // Installation Shingles Check state
  const [showInstallationShinglesModal, setShowInstallationShinglesModal] = useState(false);
  const [selectedInstallationShingle, setSelectedInstallationShingle] = useState('');
  const [installationShingleQuantity, setInstallationShingleQuantity] = useState('');
  const [installationShinglesSkipped, setInstallationShinglesSkipped] = useState(false);
  const [foundInstallationShingleItems, setFoundInstallationShingleItems] = useState<string[]>([]);

  // O&P Check state
  const [showOPModal, setShowOPModal] = useState(false);
  const [opSkipped, setOPSkipped] = useState(false);

  // Ridge Vent Check state
  const [showRidgeVentModal, setShowRidgeVentModal] = useState(false);
  const [selectedRidgeVent, setSelectedRidgeVent] = useState('');
  const [ridgeVentQuantity, setRidgeVentQuantity] = useState('');
  const [ridgeVentSkipped, setRidgeVentSkipped] = useState(false);

  // Step Flashing Check state
  const [stepFlashingPresent, setStepFlashingPresent] = useState<boolean | null>(null);
  const [guttersPresent, setGuttersPresent] = useState<boolean | null>(null);
  const [kickoutQuantity, setKickoutQuantity] = useState('');

  // Shingle Depreciation Contest state
  const [contestShingleDepreciation, setContestShingleDepreciation] = useState<boolean | null>(null);
  const [shingleAge, setShingleAge] = useState('');

  // Valley Metal Check state
  const [valleyType, setValleyType] = useState<string | null>(null);

  useEffect(() => {
    console.log('=== ESTIMATE PAGE DEBUG START ===');
    
    // Load extracted claim data from localStorage
    const storedData = localStorage.getItem('extractedClaimData');
    
    console.log('StoredData exists:', !!storedData);
    console.log('StoredData length:', storedData?.length || 0);
    
    // Set debug info for display
    setDebugInfo({
      hasStoredData: !!storedData,
      storedDataLength: storedData?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        console.log('Parsed data:', parsedData);
        console.log('=== ESTIMATE PAGE DATA ANALYSIS ===');
        console.log('Data keys:', Object.keys(parsedData));
        console.log('Data structure analysis:', {
          hasClaimAgentResponse: !!parsedData.claimAgentResponse,
          hasRoofAgentResponse: !!parsedData.roofAgentResponse,
          hasClaimOcrResponse: !!parsedData.claimOcrResponse,
          hasRoofOcrResponse: !!parsedData.roofOcrResponse,
          timestamp: parsedData.timestamp,
          fileNames: {
            claim: parsedData.uploadedClaimFileName,
            roof: parsedData.uploadedRoofFileName
          }
        });
        
        setRawAgentData(parsedData);
        setLocalStorageData(parsedData);
        
        // Extract line items from claim agent response
        if (parsedData.claimAgentResponse?.response) {
          console.log('Claim agent response type:', typeof parsedData.claimAgentResponse.response);
          console.log('Claim agent response preview:', parsedData.claimAgentResponse.response.substring(0, 200));
          
          // Try to extract JSON array from the response
          const responseStr = parsedData.claimAgentResponse.response;
          let lineItemsArray = [];
          
          try {
            // Try to parse as JSON directly
            const parsed = JSON.parse(responseStr);
            if (Array.isArray(parsed)) {
              lineItemsArray = parsed;
            } else if (parsed.response && Array.isArray(parsed.response)) {
              lineItemsArray = parsed.response;
            } else if (parsed.line_items && Array.isArray(parsed.line_items)) {
              // Handle JavaScript engine response format
              lineItemsArray = parsed.line_items;
            }
          } catch (e) {
            console.warn('Direct JSON parsing failed, trying alternative methods:', e);
            
            // Method 1: Try to extract JSON array using regex
            const jsonMatch = responseStr.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
              try {
                lineItemsArray = JSON.parse(jsonMatch[0]);
                console.log('✅ Successfully parsed JSON using regex extraction');
              } catch (parseError) {
                console.warn('Regex extraction failed, trying JSON repair:', parseError);
                
                // Method 2: Skip JSON repair and go directly to individual extraction
                console.log('Skipping JSON repair, attempting individual line item extraction...');
                
                // Method 3: Try to extract individual line items
                try {
                  const lineItemMatches = responseStr.match(/\{[^{}]*"line_number"[^{}]*\}/g);
                  if (lineItemMatches && lineItemMatches.length > 0) {
                    lineItemsArray = lineItemMatches.map((item: string) => {
                      try {
                        return JSON.parse(item);
                      } catch {
                        return null;
                      }
                    }).filter((item: any) => item !== null);
                    console.log(`✅ Successfully extracted ${lineItemsArray.length} line items individually`);
                  } else {
                    // Method 4: Fallback - try to extract any JSON-like objects
                    const objectMatches = responseStr.match(/\{[^{}]*\}/g);
                    if (objectMatches && objectMatches.length > 0) {
                      lineItemsArray = objectMatches.map((item: string) => {
                        try {
                          const parsed = JSON.parse(item);
                          // Only include if it looks like a line item
                          if (parsed.description || parsed.line_number || parsed.quantity !== undefined) {
                            return parsed;
                          }
                          return null;
                        } catch {
                          return null;
                        }
                      }).filter((item: any) => item !== null);
                      console.log(`✅ Successfully extracted ${lineItemsArray.length} objects as line items`);
                    }
                  }
                } catch (extractError) {
                  console.error('Individual line item extraction failed:', extractError);
                  // Final fallback - set empty array and provide detailed error
                  lineItemsArray = [];
                  setErrorDetails(`Failed to parse line items after all methods. Original error: ${e instanceof Error ? e.message : 'Unknown'}. Response preview: ${responseStr.substring(0, 200)}...`);
                }
              }
            } else {
              setErrorDetails(`No JSON array found in response. Response preview: ${responseStr.substring(0, 500)}...`);
            }
          }
          
          console.log('Extracted line items array:', lineItemsArray);
          setExtractedLineItems(lineItemsArray);
          
          // Update debug info
          setDebugInfo((prev: any) => ({
            ...prev,
            hasClaimAgentResponse: true,
            claimAgentResponseLength: responseStr?.length || 0,
            extractedLineItemsCount: lineItemsArray.length,
            claimAgentError: null
          }));
        } else {
          // Check if claimAgentResponse exists but doesn't have response
          if (parsedData.claimAgentResponse) {
            console.log('Claim agent response exists but no response field:', parsedData.claimAgentResponse);
            setErrorDetails(`Claim agent response exists but missing 'response' field. Response structure: ${JSON.stringify(parsedData.claimAgentResponse, null, 2)}`);
            setDebugInfo((prev: any) => ({
              ...prev,
              hasClaimAgentResponse: true,
              claimAgentError: 'Missing response field in claimAgentResponse'
            }));
          } else {
            setErrorDetails('No claim agent response found in stored data');
            setDebugInfo((prev: any) => ({
              ...prev,
              hasClaimAgentResponse: false,
              claimAgentError: 'Missing claimAgentResponse entirely'
            }));
          }
        }
      } catch (error) {
        console.error('Error parsing stored data:', error);
        setErrorDetails(`Error parsing localStorage data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setDebugInfo((prev: any) => ({
          ...prev,
          parseError: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    } else {
      setErrorDetails('No data found in localStorage. Please upload and process claim documents first.');
      setDebugInfo((prev: any) => ({
        ...prev,
        localStorageError: 'No extractedClaimData found'
      }));
    }
    
    setLoading(false);
    console.log('=== ESTIMATE PAGE DEBUG END ===');
  }, []);

  // Helper function to extract roof measurements from rawAgentData
  const extractRoofMeasurements = (rawAgentData: any): any => {
    if (!rawAgentData?.roofAgentResponse?.response) {
      console.log('⚠️ No roof agent response found');
      return null;
    }

    const roofResponseStr = rawAgentData.roofAgentResponse.response;
    let roofMeasurementsObj = null;
    
    console.log('=== EXTRACTING ROOF MEASUREMENTS ===');
    console.log('Roof response type:', typeof roofResponseStr);
    console.log('Roof response preview:', roofResponseStr?.substring(0, 500));
    
    try {
      let rawContent = roofResponseStr;
      
      // Step 1: Try to parse as JSON object (might have "response" key)
      try {
        const outerJson = JSON.parse(roofResponseStr);
        console.log('Parsed outer JSON:', outerJson);
        if (outerJson && typeof outerJson === 'object' && 'response' in outerJson) {
          rawContent = outerJson.response;
          console.log('Extracted response from outer JSON object');
        }
      } catch (e) {
        console.log('Not a JSON object, using as-is');
      }
      
      // Step 2: Extract JSON from markdown code block (```json\n{...}\n```)
      const markdownMatch = rawContent.match(/```json\s*\n([\s\S]*?)\n```/);
      if (markdownMatch && markdownMatch[1]) {
        try {
          roofMeasurementsObj = JSON.parse(markdownMatch[1]);
          console.log('✅ Successfully parsed JSON from markdown code block');
          console.log('Parsed roof measurements:', roofMeasurementsObj);
        } catch (e) {
          console.warn('Failed to parse JSON from markdown block:', e);
        }
      }
      
      // Step 3: If no markdown block, try to find a standalone JSON object
      if (!roofMeasurementsObj) {
        const jsonMatch = rawContent.match(/(\{[\s\S]*?\})/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            roofMeasurementsObj = JSON.parse(jsonMatch[1]);
            console.log('✅ Successfully parsed standalone JSON object');
            console.log('Parsed roof measurements:', roofMeasurementsObj);
          } catch (e) {
            console.warn('Failed to parse standalone JSON object:', e);
          }
        }
      }
      
      // Step 4: Try parsing the raw content directly
      if (!roofMeasurementsObj) {
        try {
          roofMeasurementsObj = JSON.parse(rawContent);
          console.log('✅ Successfully parsed raw content as JSON');
          console.log('Parsed roof measurements:', roofMeasurementsObj);
        } catch (e) {
          console.warn('Failed to parse raw content as JSON:', e);
        }
      }
      
    } catch (e) {
      console.error('Error in roof measurements parsing:', e);
    }

    if (!roofMeasurementsObj) {
      console.error('❌ Could not parse roof measurements');
      console.error('Full roof response:', roofResponseStr);
      return null;
    }
    
    console.log('✅ Final roof measurements object:', roofMeasurementsObj);
    return roofMeasurementsObj;
  };

  // Load Roof Master Macro data
  useEffect(() => {
    const loadRoofMasterMacro = async () => {
      try {
        const response = await fetch('/roof_master_macro.csv');
        const csvText = await response.text();
        
        // Parse CSV format
        const lines = csvText.trim().split('\n');
        const macroMap = new Map();
        
        // Skip (Optional) header line
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // More robust CSV parsing that handles quoted fields
          const columns = [];
          let current = '';
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              columns.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          columns.push(current.trim());
          
          if (columns.length >= 3) {
            // Remove surrounding quotes if present
            const description = columns[0].replace(/^"(.*)"$/, '$1').trim();
            const unit = columns[1].replace(/^"(.*)"$/, '$1').trim();
            const unitPriceStr = columns[2].replace(/^"(.*)"$/, '$1').trim();
            
            // Parse unit price (remove $ and commas)
            const unitPrice = parseFloat(unitPriceStr.replace(/[$,\s]/g, ''));
            
            if (!isNaN(unitPrice) && description) {
              macroMap.set(description, { unit_price: unitPrice, unit: unit });
              // Debug log for ridge vents
              if (description.toLowerCase().includes('ridge vent')) {
                console.log('🔍 Found ridge vent:', description, 'Price:', unitPrice);
              }
            }
          }
        }
        
        console.log('✅ Loaded Roof Master Macro from CSV:', macroMap.size, 'items');
        console.log('Sample items:', Array.from(macroMap.keys()).slice(0, 10));
        console.log('Ridge vent items found:', Array.from(macroMap.keys()).filter(key => key.includes('ridge vent')));
        setRoofMasterMacro(macroMap);
      } catch (error) {
        console.error('Error loading Roof Master Macro:', error);
      }
    };
    
    loadRoofMasterMacro();
  }, []);

  // Quick Switch Definitions
  const quickSwitchOptions: Record<string, string> = {
    'Hip/Ridge cap Standard profile - composition shingles': 'Hip/Ridge cap High profile - composition shingles',
    'Drip edge/gutter apron': 'Drip edge',
    'Sheathing - OSB - 5/8"': 'Sheathing OSB 1/2"'
  };

  // Handle Quick Switch
  const handleQuickSwitch = (itemIndex: number, newDescription: string) => {
    const macroData = roofMasterMacro.get(newDescription);
    
    if (!macroData) {
      console.error('Item not found in Roof Master Macro:', newDescription);
      alert(`Item "${newDescription}" not found in Roof Master Macro`);
      return;
    }

    const updatedItems = [...extractedLineItems];
    const item = updatedItems[itemIndex];
    const quantity = item.quantity;

    // Update item with new data from roof master macro
    updatedItems[itemIndex] = {
      ...item,
      description: newDescription,
      unit_price: macroData.unit_price,
      unit: macroData.unit,
      RCV: quantity * macroData.unit_price,
      ACV: quantity * macroData.unit_price - (item.depreciation_amount || 0)
    };

    setExtractedLineItems(updatedItems);
    setContextMenu(null);
    
    console.log('✅ Quick switched to:', newDescription);
  };

  // Handle Right Click
  const handleRightClick = (e: React.MouseEvent, itemIndex: number) => {
    const item = extractedLineItems[itemIndex];
    if (quickSwitchOptions[item.description]) {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        itemIndex
      });
    }
  };

  // Close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Run RMM Unit Cost Comparator
  const runRmmComparator = async () => {
    console.log('=== RUNNING RMM UNIT COST COMPARATOR ===');
    setIsRunningRmmComparator(true);
    
    try {
      if (extractedLineItems.length === 0) {
        alert('No line items available. Please upload and process documents first.');
        setIsRunningRmmComparator(false);
        return;
      }

      console.log('Preparing payload with line items...');
      
      // The agent has a Knowledge Base (roof_master_macro9wdb) with RMM data already
      // So we just need to send the line items JSON
      const lineItemsJson = JSON.stringify(extractedLineItems, null, 2);
      
      console.log('Line items JSON length:', lineItemsJson.length);
      console.log('Line items count:', extractedLineItems.length);
      console.log('Message preview:', lineItemsJson.substring(0, 500));

      // Call the RMM comparator agent
      const agentPayload = {
        user_id: 'gdnaaccount@lyzr.ai',
        agent_id: '68eaf673de8385f5b43204d9',
        session_id: '68eaf673de8385f5b43204d9-' + Date.now(),
        message: lineItemsJson
      };
      
      console.log('Calling RMM agent with payload:', {
        ...agentPayload,
        message: `${agentPayload.message.substring(0, 200)}... (${agentPayload.message.length} chars total)`
      });
      
      const response = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-default-Lpq8P8pB0PGzf8BBaXTJArdMcYa0Fr6K'
        },
        body: JSON.stringify(agentPayload)
      });

      console.log('RMM agent response status:', response.status);

      if (!response.ok) {
        let errorDetails = `${response.status} ${response.statusText}`;
        try {
          const errorBody = await response.text();
          console.error('Error response body:', errorBody);
          errorDetails += `\n\nResponse: ${errorBody}`;
        } catch (e) {
          console.error('Could not read error body');
        }
        throw new Error(`RMM comparator agent failed: ${errorDetails}`);
      }

      const result = await response.json();
      console.log('=== RMM COMPARATOR AGENT RESPONSE ===');
      console.log('Full result:', result);
      
      // Parse the response
      let rmmData = null;
      
      if (result.response) {
        console.log('Response type:', typeof result.response);
        console.log('Response preview:', result.response.substring(0, 1000));
        
        try {
          let parsedResponse = null;
          
          // Try markdown code block
          const jsonMatch = result.response.match(/```json\s*\n([\s\S]*?)\n```/);
          if (jsonMatch && jsonMatch[1]) {
            console.log('Found JSON in markdown block');
            parsedResponse = JSON.parse(jsonMatch[1]);
          } else {
            // Try to find array pattern
            const arrayMatch = result.response.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
              console.log('Found JSON array');
              parsedResponse = JSON.parse(arrayMatch[0]);
            } else {
              // Try standalone JSON object
              const jsonObjectMatch = result.response.match(/\{[\s\S]*"updated_line_items"[\s\S]*\}/);
              if (jsonObjectMatch) {
                console.log('Found standalone JSON object');
                parsedResponse = JSON.parse(jsonObjectMatch[0]);
              } else {
                // Try direct parse
                console.log('Attempting direct parse');
                parsedResponse = JSON.parse(result.response);
              }
            }
          }
          
          // Handle the response format: it could be an array with two objects
          if (Array.isArray(parsedResponse)) {
            console.log('Response is an array with', parsedResponse.length, 'elements');
            // Find the objects containing updated_line_items and audit_log
            const lineItemsObj = parsedResponse.find(obj => obj.updated_line_items);
            const auditLogObj = parsedResponse.find(obj => obj.audit_log);
            
            if (lineItemsObj) {
              rmmData = {
                updated_line_items: lineItemsObj.updated_line_items,
                audit_log: auditLogObj?.audit_log || []
              };
              console.log('✅ Extracted from array format');
            }
          } else if (parsedResponse && parsedResponse.updated_line_items) {
            // It's already in the right format
            rmmData = parsedResponse;
            console.log('✅ Response is in object format');
          }
          
        } catch (e) {
          console.error('Failed to parse RMM comparator response:', e);
          console.error('Parse error:', e);
        }
      }

      if (!rmmData || !rmmData.updated_line_items) {
        console.error('❌ Invalid RMM data structure');
        console.error('Parsed data:', rmmData);
        alert('Failed to parse RMM comparator response. Check console for details.');
        setIsRunningRmmComparator(false);
        return;
      }

      console.log('✅ Parsed RMM data successfully');
      console.log('Updated line items:', rmmData.updated_line_items.length);
      console.log('Audit log entries:', rmmData.audit_log?.length || 0);
      console.log('Sample updated item:', rmmData.updated_line_items[0]);
      console.log('Sample audit entry:', rmmData.audit_log?.[0]);
      
      setRmmAdjustedClaim(rmmData);
      setShowRmmAdjustedClaim(true);
      
    } catch (error) {
      console.error('Error running RMM comparator:', error);
      alert(`Error running RMM comparator: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunningRmmComparator(false);
    }
  };

  // Calculate claim waste percentage
  const calculateClaimWaste = async () => {
    console.log('=== CALCULATING CLAIM WASTE PERCENTAGE ===');
    setIsCalculatingClaimWaste(true);
    
    try {
      if (!rawAgentData?.claimOcrResponse) {
        alert('No claim OCR data available. Please upload and process documents first.');
        setIsCalculatingClaimWaste(false);
        return;
      }

      console.log('Sending claim OCR to waste percentage agent...');
      console.log('Claim OCR length:', rawAgentData.claimOcrResponse.length);

      // Call the claim waste percentage agent
      const response = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-default-Lpq8P8pB0PGzf8BBaXTJArdMcYa0Fr6K'
        },
        body: JSON.stringify({
          user_id: 'gdnaaccount@lyzr.ai',
          agent_id: '68eae51c8d106b3b3abb37f8',
          session_id: '68eae51c8d106b3b3abb37f8-' + Date.now(),
          message: rawAgentData.claimOcrResponse
        })
      });

      if (!response.ok) {
        throw new Error(`Claim waste agent failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('=== CLAIM WASTE AGENT RESPONSE ===');
      console.log('Full result:', result);
      
      // Parse the response
      let wasteData = null;
      
      if (result.response) {
        console.log('Response type:', typeof result.response);
        console.log('Response preview:', result.response.substring(0, 1000));
        
        try {
          // Try markdown code block
          const jsonMatch = result.response.match(/```json\s*\n([\s\S]*?)\n```/);
          if (jsonMatch && jsonMatch[1]) {
            console.log('Found JSON in markdown block');
            wasteData = JSON.parse(jsonMatch[1]);
          } else {
            // Try standalone JSON
            const jsonObjectMatch = result.response.match(/\{[\s\S]*?\}/);
            if (jsonObjectMatch) {
              console.log('Found standalone JSON');
              wasteData = JSON.parse(jsonObjectMatch[0]);
            } else {
              // Try direct parse
              console.log('Attempting direct parse');
              wasteData = JSON.parse(result.response);
            }
          }
        } catch (e) {
          console.error('Failed to parse claim waste response:', e);
        }
      }

      if (!wasteData) {
        alert('Failed to parse claim waste percentage response. Check console for details.');
        setIsCalculatingClaimWaste(false);
        return;
      }

      console.log('✅ Parsed claim waste data:', wasteData);
      setClaimWasteResult(wasteData);
      
    } catch (error) {
      console.error('Error calculating claim waste percentage:', error);
      alert(`Error calculating claim waste percentage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCalculatingClaimWaste(false);
    }
  };

  // Call the adjustment agent with line items and roof measurements
  const runAdjustmentAgent = async () => {
    console.log('=== RUNNING ADJUSTMENT AGENT ===');
    setIsRunningAdjustmentAgent(true);
    
    try {
      if (!rawAgentData?.roofAgentResponse?.response) {
        alert('No roof measurement data available. Please upload and process documents first.');
        setIsRunningAdjustmentAgent(false);
        return;
      }

      if (extractedLineItems.length === 0) {
        alert('No line items available. Please upload and process documents first.');
        setIsRunningAdjustmentAgent(false);
        return;
      }

      // Extract roof measurements JSON from the response
      const roofResponseStr = rawAgentData.roofAgentResponse.response;
      let roofMeasurementsObj = null;
      
      console.log('=== PARSING ROOF MEASUREMENTS ===');
      console.log('Roof response type:', typeof roofResponseStr);
      console.log('Roof response preview:', roofResponseStr?.substring(0, 500));
      
      try {
        let rawContent = roofResponseStr;
        
        // Step 1: Try to parse as JSON object (might have "response" key)
        try {
          const outerJson = JSON.parse(roofResponseStr);
          console.log('Parsed outer JSON:', outerJson);
          if (outerJson && typeof outerJson === 'object' && 'response' in outerJson) {
            rawContent = outerJson.response;
            console.log('Extracted response from outer JSON object');
          }
        } catch (e) {
          console.log('Not a JSON object, using as-is');
        }
        
        // Step 2: Extract JSON from markdown code block (```json\n{...}\n```)
        const markdownMatch = rawContent.match(/```json\s*\n([\s\S]*?)\n```/);
        if (markdownMatch && markdownMatch[1]) {
          try {
            roofMeasurementsObj = JSON.parse(markdownMatch[1]);
            console.log('✅ Successfully parsed JSON from markdown code block');
            console.log('Parsed roof measurements:', roofMeasurementsObj);
          } catch (e) {
            console.warn('Failed to parse JSON from markdown block:', e);
          }
        }
        
        // Step 3: If no markdown block, try to find a standalone JSON object
        if (!roofMeasurementsObj) {
          const jsonMatch = rawContent.match(/(\{[\s\S]*?\})/);
          if (jsonMatch && jsonMatch[1]) {
            try {
              roofMeasurementsObj = JSON.parse(jsonMatch[1]);
              console.log('✅ Successfully parsed standalone JSON object');
              console.log('Parsed roof measurements:', roofMeasurementsObj);
            } catch (e) {
              console.warn('Failed to parse standalone JSON object:', e);
            }
          }
        }
        
        // Step 4: Try parsing the raw content directly
        if (!roofMeasurementsObj) {
          try {
            roofMeasurementsObj = JSON.parse(rawContent);
            console.log('✅ Successfully parsed raw content as JSON');
            console.log('Parsed roof measurements:', roofMeasurementsObj);
          } catch (e) {
            console.warn('Failed to parse raw content as JSON:', e);
          }
        }
        
      } catch (e) {
        console.error('Error in roof measurements parsing:', e);
      }

      if (!roofMeasurementsObj) {
        console.error('❌ Could not parse roof measurements');
        console.error('Full roof response:', roofResponseStr);
        alert('Could not parse roof measurements for adjustment agent. Check console for details.');
        setIsRunningAdjustmentAgent(false);
        return;
      }
      
      console.log('✅ Final roof measurements object:', roofMeasurementsObj);

      // Combine line items and roof measurements into the message
      const messagePayload = JSON.stringify(extractedLineItems) + '\n\n' + JSON.stringify(roofMeasurementsObj);
      
      console.log('Sending to adjustment agent:', {
        lineItemsCount: extractedLineItems.length,
        roofMeasurements: roofMeasurementsObj,
        messageLength: messagePayload.length
      });

      // Call the adjustment agent
      const response = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-default-Lpq8P8pB0PGzf8BBaXTJArdMcYa0Fr6K'
        },
        body: JSON.stringify({
          user_id: 'gdnaaccount@lyzr.ai',
          agent_id: '68e92ded1945df86d876afc6',
          session_id: '68e92ded1945df86d876afc6-' + Date.now(),
          message: messagePayload
        })
      });

      if (!response.ok) {
        throw new Error(`Adjustment agent failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('=== ADJUSTMENT AGENT RESPONSE ===');
      console.log('Full result object:', result);
      console.log('Result keys:', Object.keys(result));
      
      // Parse the response - try multiple strategies
      let adjustedData = null;
      let parseError = null;
      
      if (!result.response) {
        console.error('❌ No response field in result object');
        alert(`Adjustment agent returned no response field.\n\nReceived keys: ${Object.keys(result).join(', ')}\n\nCheck console for full details.`);
        setIsRunningAdjustmentAgent(false);
        return;
      }
      
      console.log('Response type:', typeof result.response);
      console.log('Response length:', result.response?.length || 0);
      console.log('Response preview (first 1000 chars):', result.response.substring(0, 1000));
      
      try {
        // Strategy 1: Try to extract JSON from markdown code block
        console.log('Trying Strategy 1: Markdown code block extraction...');
        const jsonMatch = result.response.match(/```json\s*\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          console.log('✓ Found JSON in markdown block, attempting parse...');
          console.log('Extracted content preview:', jsonMatch[1].substring(0, 500));
          try {
            adjustedData = JSON.parse(jsonMatch[1]);
            console.log('✅ Successfully parsed from markdown block');
          } catch (e) {
            console.error('✗ Failed to parse markdown block:', e);
            parseError = `Markdown parse error: ${e}`;
          }
        } else {
          console.log('✗ No markdown code block found');
        }
        
        // Strategy 2: Try to find a JSON object pattern
        if (!adjustedData) {
          console.log('Trying Strategy 2: JSON object pattern search...');
          const jsonObjectMatch = result.response.match(/\{[\s\S]*?"modified_estimate"[\s\S]*?\}/);
          if (jsonObjectMatch) {
            console.log('✓ Found JSON object pattern, attempting parse...');
            console.log('Extracted content preview:', jsonObjectMatch[0].substring(0, 500));
            try {
              adjustedData = JSON.parse(jsonObjectMatch[0]);
              console.log('✅ Successfully parsed from JSON pattern');
            } catch (e) {
              console.error('✗ Failed to parse JSON pattern:', e);
              parseError = `Pattern parse error: ${e}`;
            }
          } else {
            console.log('✗ No JSON object pattern found');
          }
        }
        
        // Strategy 3: Try to parse directly
        if (!adjustedData) {
          console.log('Trying Strategy 3: Direct parse...');
          try {
            adjustedData = JSON.parse(result.response);
            console.log('✅ Successfully parsed directly');
          } catch (e) {
            console.error('✗ Failed to parse directly:', e);
            parseError = `Direct parse error: ${e}`;
          }
        }
        
        // Strategy 4: Try to find ANY JSON object in the response
        if (!adjustedData) {
          console.log('Trying Strategy 4: Any JSON object search...');
          const anyJsonMatch = result.response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
          if (anyJsonMatch && anyJsonMatch.length > 0) {
            console.log(`✓ Found ${anyJsonMatch.length} potential JSON objects`);
            for (let i = 0; i < anyJsonMatch.length; i++) {
              try {
                const parsed = JSON.parse(anyJsonMatch[i]);
                if (parsed.modified_estimate) {
                  adjustedData = parsed;
                  console.log(`✅ Successfully parsed from JSON object ${i + 1}`);
                  break;
                }
              } catch (e) {
                console.log(`✗ Failed to parse JSON object ${i + 1}`);
              }
            }
          } else {
            console.log('✗ No JSON objects found');
          }
        }
        
      } catch (e) {
        console.error('❌ Unexpected error during parsing:', e);
        parseError = `Unexpected error: ${e}`;
      }
      
      // Validate the parsed data
      if (!adjustedData) {
        console.error('❌ Failed to parse adjustment agent response');
        console.error('Last parse error:', parseError);
        console.error('Full response:', result.response);
        alert(`Failed to parse adjustment agent response.\n\nError: ${parseError}\n\nResponse preview:\n${result.response.substring(0, 500)}\n\nCheck console for full details.`);
        setIsRunningAdjustmentAgent(false);
        return;
      }
      
      console.log('Parsed data structure:', {
        hasModifiedEstimate: !!adjustedData.modified_estimate,
        modifiedEstimateType: typeof adjustedData.modified_estimate,
        isArray: Array.isArray(adjustedData.modified_estimate),
        hasDelta: !!adjustedData.delta,
        keys: Object.keys(adjustedData)
      });
      
      if (!adjustedData.modified_estimate) {
        console.error('❌ Missing modified_estimate field');
        console.error('Available fields:', Object.keys(adjustedData));
        console.error('Parsed data:', adjustedData);
        alert(`Adjustment agent response missing "modified_estimate" field.\n\nAvailable fields: ${Object.keys(adjustedData).join(', ')}\n\nCheck console for full details.`);
        setIsRunningAdjustmentAgent(false);
        return;
      }
      
      if (!Array.isArray(adjustedData.modified_estimate)) {
        console.error('❌ modified_estimate is not an array');
        console.error('Type:', typeof adjustedData.modified_estimate);
        console.error('Value:', adjustedData.modified_estimate);
        alert(`Adjustment agent "modified_estimate" is not an array.\n\nType: ${typeof adjustedData.modified_estimate}\n\nCheck console for full details.`);
        setIsRunningAdjustmentAgent(false);
        return;
      }
      
      if (adjustedData.modified_estimate.length === 0) {
        console.warn('⚠️ Warning: modified_estimate array is empty');
      }
      
      if (!adjustedData.delta) {
        console.warn('⚠️ Warning: No delta object in response, creating empty one');
        adjustedData.delta = { added: [], removed: [], updated: [] };
      }
      
      console.log('✅ Successfully validated adjustment data');
      console.log('Modified estimate items:', adjustedData.modified_estimate.length);
      console.log('Delta - Added:', adjustedData.delta.added?.length || 0);
      console.log('Delta - Updated:', adjustedData.delta.updated?.length || 0);
      console.log('Delta - Removed:', adjustedData.delta.removed?.length || 0);
      console.log('Sample item:', adjustedData.modified_estimate[0]);

      setAdjustmentAgentResult(adjustedData);
      setShowAdjustedEstimate(true);
      console.log('✅ Adjustment agent completed successfully');
      
    } catch (error) {
      console.error('Error running adjustment agent:', error);
      alert(`Error running adjustment agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunningAdjustmentAgent(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Roof Master Macro Upload function
  const handleRmmUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingRMM(true);
    setRmmUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-roof-master', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setRmmUploadStatus({
          success: true,
          message: result.message,
          itemCount: result.itemCount
        });
        
        // Store upload info in localStorage
        localStorage.setItem('rmmUploadInfo', JSON.stringify({
          uploadedAt: new Date().toISOString(),
          fileName: file.name,
          itemCount: result.itemCount
        }));

        console.log('✅ Roof Master Macro uploaded successfully:', result);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading Roof Master Macro:', error);
      setRmmUploadStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed'
      });
    } finally {
      setIsUploadingRMM(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Combined Workflow function
  const runCombinedWorkflow = async () => {
    console.log('=== RUNNING COMBINED WORKFLOW (RMM + PYTHON) ===');
    setIsRunningCombined(true);
    
    try {
      if (extractedLineItems.length === 0) {
        alert('No line items available. Please upload and process documents first.');
        setIsRunningCombined(false);
        return;
      }

      // Step 1: Run RMM Unit Cost Comparator
      console.log('Step 1: Running RMM Unit Cost Comparator...');
      
      // Prepare RMM payload (same as individual RMM function)
      const lineItemsJson = JSON.stringify(extractedLineItems, null, 2);
      const agentPayload = {
        user_id: 'gdnaaccount@lyzr.ai',
        agent_id: '68eaf673de8385f5b43204d9',
        session_id: '68eaf673de8385f5b43204d9-' + Date.now(),
        message: lineItemsJson
      };
      
      const rmmResponse = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-default-Lpq8P8pB0PGzf8BBaXTJArdMcYa0Fr6K'
        },
        body: JSON.stringify(agentPayload)
      });

      if (!rmmResponse.ok) {
        throw new Error(`RMM Comparator failed: ${rmmResponse.statusText}`);
      }

      const rmmResult = await rmmResponse.json();
      console.log('RMM Agent Response:', rmmResult);
      
      // Parse RMM response (same logic as individual function)
      let rmmData = null;
      if (rmmResult.response) {
        try {
          let parsedResponse = null;
          
          // Try markdown code block
          const jsonMatch = rmmResult.response.match(/```json\s*\n([\s\S]*?)\n```/);
          if (jsonMatch && jsonMatch[1]) {
            console.log('Found JSON in markdown block');
            parsedResponse = JSON.parse(jsonMatch[1]);
          } else {
            // Try to find array pattern
            const arrayMatch = rmmResult.response.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
              console.log('Found array pattern');
              parsedResponse = JSON.parse(arrayMatch[0]);
            } else {
              // Try direct JSON parse
              parsedResponse = JSON.parse(rmmResult.response);
            }
          }
          
          if (parsedResponse && Array.isArray(parsedResponse)) {
            rmmData = {
              updated_line_items: parsedResponse,
              audit_log: parsedResponse.filter(item => item.audit_log).map(item => ({
                line_number: item.line_number,
                description: item.description,
                field: 'unit_price',
                before: item.original_unit_price || item.unit_price,
                after: item.unit_price,
                explanation: item.price_justification || 'Unit price adjusted based on Roof Master Macro',
                source: 'RMM Comparator'
              }))
            };
          }
        } catch (parseError) {
          console.error('Failed to parse RMM response:', parseError);
          throw new Error('Failed to parse RMM comparator response');
        }
      }

      if (!rmmData) {
        throw new Error('RMM Comparator did not return valid data');
      }

      console.log('RMM Results:', rmmData);

      // Step 2: Run SPC Adjustment Engine on RMM-adjusted items
      console.log('Step 2: Running SPC Adjustment Engine on RMM-adjusted items...');
      
      // Get roof measurements (same as individual Python function)
      const roofMeasurementsObj = extractRoofMeasurements(rawAgentData);
      if (!roofMeasurementsObj) {
        throw new Error('Could not extract roof measurements for SPC Adjustment Engine');
      }

      let roofMeasurements: Record<string, any> = {};
      if (roofMeasurementsObj.roofMeasurements) {
        roofMeasurements = roofMeasurementsObj.roofMeasurements;
      } else {
        roofMeasurements = roofMeasurementsObj;
      }

      // Prepare Python input data (using RMM-adjusted line items)
      const pythonInputData = {
        line_items: (rmmData.updated_line_items || extractedLineItems).map(item => ({
          line_number: item.line_number || 'N/A',
          description: item.description || 'Unknown',
          quantity: item.quantity || 0,
          unit: item.unit || 'EA',
          unit_price: item.unit_price || 0,
          RCV: item.RCV || 0,
          age_life: item.age_life || '',
          condition: item.condition || '',
          dep_percent: item.dep_percent || 0,
          depreciation_amount: item.depreciation_amount || 0,
          ACV: item.ACV || 0,
          location_room: item.location_room || 'Unknown',
          category: item.category || 'Unknown',
          page_number: item.page_number || 1
        })),
        roof_measurements: roofMeasurements
      };

      const pythonResponse = await fetch('/api/run-python-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pythonInputData)
      });

      if (!pythonResponse.ok) {
        const errorData = await pythonResponse.json();
        throw new Error(`SPC Adjustment Engine failed: ${errorData.error || pythonResponse.statusText}`);
      }

      const pythonResult = await pythonResponse.json();
      console.log('Python Results:', pythonResult);

      if (!pythonResult.success) {
        throw new Error(`Python rule engine error: ${pythonResult.error}`);
      }

      const pythonData = pythonResult.data;

      // Combine results - preserve original line items with adjustments
      const originalItems = pythonData.original_line_items || [];
      const adjustedItems = pythonData.adjusted_line_items || [];
      
      // Create a map of adjusted items by line number for easy lookup
      const adjustedItemsMap = new Map();
      adjustedItems.forEach((item: any) => {
        adjustedItemsMap.set(item.line_number, item);
      });
      
      // Start with original items and replace with adjusted versions where they exist
      const combinedLineItems = originalItems.map((originalItem: any) => {
        const adjustedItem = adjustedItemsMap.get(originalItem.line_number);
        return adjustedItem || originalItem;
      });
      
      // Add any new items that weren't in the original list
      const originalLineNumbers = new Set(originalItems.map((item: any) => item.line_number));
      const newItems = adjustedItems.filter((item: any) => !originalLineNumbers.has(item.line_number));
      
      const finalLineItems = [...combinedLineItems, ...newItems];
      
      const combinedData = {
        rmm_results: rmmData,
        python_results: pythonData,
        final_line_items: finalLineItems,
        audit_log: pythonData.audit_log || [], // Preserve the audit log
        combined_audit_log: [
          ...(rmmData.audit_log || []).map((entry: any) => ({
            ...entry,
            source: 'RMM Comparator',
            badge_color: 'bg-blue-600'
          })),
          ...(pythonData.audit_log || []).map((entry: any) => ({
            ...entry,
            source: 'SPC Adjustment Engine',
            badge_color: 'bg-green-600'
          }))
        ],
        summary: {
          rmm_adjustments: rmmData.audit_log?.length || 0,
          python_adjustments: pythonData.audit_log?.length || 0,
          total_adjustments: (rmmData.audit_log?.length || 0) + (pythonData.audit_log?.length || 0),
          execution_time: new Date().toISOString()
        }
      };

      setCombinedResults(combinedData);
      setShowCombinedResults(true);
      console.log('Combined workflow completed successfully!');

    } catch (error) {
      console.error('Combined workflow error:', error);
      alert(`Combined workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunningCombined(false);
    }
  };

  // SPC Adjustment Engine function
  const runRuleEngine = async () => {
    console.log('=== RUNNING PYTHON RULE ENGINE ===');
    setIsRunningRules(true);
    
    try {
      if (extractedLineItems.length === 0) {
        alert('No line items available. Please upload and process documents first.');
        setIsRunningRules(false);
        return;
      }

      // Get roof measurements using the helper function
      const roofMeasurementsObj = extractRoofMeasurements(rawAgentData);
      
      if (!roofMeasurementsObj) {
        alert('Could not extract roof measurements. Please check that roof report was processed correctly.');
        setIsRunningRules(false);
        return;
      }

      // Convert to the format expected by Python script
      let roofMeasurements: Record<string, any> = {};
      
      // Map the extracted data to the expected format
      if (roofMeasurementsObj.roofMeasurements) {
        roofMeasurements = roofMeasurementsObj.roofMeasurements;
      } else {
        // If the data is at the root level, use it directly
        roofMeasurements = roofMeasurementsObj;
      }
      
      console.log('📊 Using extracted roof measurements:', roofMeasurements);
      
      // Store the extracted measurements for UI display
      setExtractedRoofMeasurements(roofMeasurements);
      
      // If we have individual ridge/hip lengths but no combined field, create it
      if (roofMeasurements.ridgeLength !== undefined && roofMeasurements.hipLength !== undefined && !roofMeasurements["Total Ridges/Hips Length"]) {
        const combinedLength = roofMeasurements.ridgeLength + roofMeasurements.hipLength;
        roofMeasurements["Total Ridges/Hips Length"] = { value: combinedLength };
      }

      console.log('📊 Using LIVE roof measurements:', roofMeasurements);

      // Prepare data for Python script
      const pythonInputData = {
        line_items: extractedLineItems.map(item => ({
          line_number: item.line_number || 'N/A',
          description: item.description || 'Unknown',
          quantity: item.quantity || 0,
          unit: item.unit || 'EA',
          unit_price: item.unit_price || 0,
          RCV: item.RCV || 0,
          age_life: item.age_life || '',
          condition: item.condition || '',
          dep_percent: item.dep_percent || 0,
          depreciation_amount: item.depreciation_amount || 0,
          ACV: item.ACV || 0,
          location_room: item.location_room || 'Unknown',
          category: item.category || 'Unknown',
          page_number: item.page_number || 1
        })),
        roof_measurements: roofMeasurements
      };

      console.log('Sending data to Python script:', pythonInputData);

      // Call the Python rule engine API endpoint
      const response = await fetch('/api/run-python-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pythonInputData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Python rule engine failed: ${errorData.error || response.statusText}`);
      }

      const ruleData = await response.json();
      console.log('Python rule engine results:', ruleData);
      console.log('🔍 Debug: Python audit log:', ruleData.data?.audit_log);
      console.log('🔍 Debug: Python original items count:', ruleData.data?.original_line_items?.length);
      console.log('🔍 Debug: Python adjusted items count:', ruleData.data?.adjusted_line_items?.length);
      console.log('🔍 Debug: Sample adjusted item:', ruleData.data?.adjusted_line_items?.[0]);
      console.log('🔍 Debug: Items with narratives:', ruleData.data?.adjusted_line_items?.filter((item: any) => item.narrative));

      if (!ruleData.success) {
        throw new Error(`Python rule engine error: ${ruleData.error}`);
      }

      // Store the results and ensure line_items is populated
      // Combine original line items with adjusted line items to preserve all items
      const originalItems = ruleData.data?.original_line_items || [];
      const adjustedItems = ruleData.data?.adjusted_line_items || [];
      
      // Create a map of adjusted items by line number for easy lookup
      const adjustedItemsMap = new Map();
      adjustedItems.forEach((item: any) => {
        adjustedItemsMap.set(item.line_number, item);
      });
      
      // Start with original items and replace with adjusted versions where they exist
      const combinedLineItems = originalItems.map((originalItem: any) => {
        const adjustedItem = adjustedItemsMap.get(originalItem.line_number);
        return adjustedItem || originalItem;
      });
      
      // Add any new items that weren't in the original list
      const originalLineNumbers = new Set(originalItems.map((item: any) => item.line_number));
      const newItems = adjustedItems.filter((item: any) => !originalLineNumbers.has(item.line_number));
      
      const finalLineItems = [...combinedLineItems, ...newItems];
      
      console.log('🔍 Debug: Final line items with narratives:', finalLineItems.filter((item: any) => item.narrative));
      console.log('🔍 Debug: Sample final item:', finalLineItems[0]);
      
      const resultsWithLineItems = {
        ...ruleData.data,
        line_items: finalLineItems,
        audit_log: ruleData.data?.audit_log || [] // Preserve the audit log
      };
      setRuleResults(resultsWithLineItems);
      setShowRuleResults(true);

      // After SPC Adjustment Engine completes, check for shingle removal items
      // Get the updated line items from the results
      const updatedLineItems = finalLineItems;
      
      // Store the current line items for the workflow
      setCurrentSPCLineItems(updatedLineItems);
      
      // Check if any of the required removal line items are present (using exact spellings from shingleRemovalOptions)
      console.log('🔍 Checking for shingle removal items in:', updatedLineItems.length, 'line items');
      console.log('🔍 Required items:', shingleRemovalOptions);
      console.log('🔍 All line item descriptions:', updatedLineItems.map((item: any) => item.description));
      
      const foundRemovalItems = updatedLineItems.filter((item: any) => {
        if (!item.description) return false;
        
        console.log('🔍 Checking item:', item.description);
        
        return shingleRemovalOptions.some(requiredItem => {
          // Try exact match first
          if (item.description === requiredItem) {
            console.log('✅ Found exact match:', item.description);
            return true;
          }
          
          // Try case-insensitive match
          if (item.description.toLowerCase() === requiredItem.toLowerCase()) {
            console.log('✅ Found case-insensitive match:', item.description, '===', requiredItem);
            return true;
          }
          
          // Check for removal items containing key terms
          const itemDesc = item.description.toLowerCase();
          const requiredDesc = requiredItem.toLowerCase();
          
          // Check if it's a removal item and contains key shingle type terms
          if (itemDesc.includes('remove')) {
            const hasLaminated = (itemDesc.includes('laminated') && requiredDesc.includes('laminated')) || 
                               (!itemDesc.includes('laminated') && !requiredDesc.includes('laminated'));
            const has3Tab = (itemDesc.includes('3 tab') && requiredDesc.includes('3 tab')) || 
                           (!itemDesc.includes('3 tab') && !requiredDesc.includes('3 tab'));
            const hasComp = itemDesc.includes('comp') && requiredDesc.includes('comp');
            const hasShingle = itemDesc.includes('shingle') && requiredDesc.includes('shingle');
            const hasFelt = (itemDesc.includes('felt') && requiredDesc.includes('felt'));
            
            if (hasComp && hasShingle && (hasLaminated || has3Tab)) {
              console.log('✅ Found removal item match:', item.description, 'matches pattern for', requiredItem);
              return true;
            }
          }
          
          return false;
        });
      });
      
      console.log('🔍 Found removal items:', foundRemovalItems.map((item: any) => item.description));
      
      if (foundRemovalItems.length > 0) {
        // Show message that removal items were found
        console.log('✅ Removal line items found, proceeding without modal');
        setFoundRemovalItems(foundRemovalItems);
        setShowSPCItemsFoundModal(true);
        // After removal check, proceed to installation check
        // We'll trigger this when the modal is closed
      } else {
        // No removal items found, show modal for user selection
        console.log('⚠️ No removal items found, showing SPC modal');
        setShowSPCShingleRemovalModal(true);
      }

    } catch (error) {
      console.error('Error running Python rule engine:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunningRules(false);
    }
  };

  // Check for installation shingle items
  const checkInstallationItems = (updatedLineItems: any[]) => {
    console.log('🔍 Checking for installation shingle items in:', updatedLineItems.length, 'line items');
    console.log('🔍 Required installation items:', installationShingleOptions);
    
    const foundInstallationItems = updatedLineItems.filter((item: any) => {
      if (!item.description) return false;
      
      console.log('🔍 Checking installation item:', item.description);
      
      return installationShingleOptions.some(requiredItem => {
        // Try exact match first
        if (item.description === requiredItem) {
          console.log('✅ Found exact installation match:', item.description);
          return true;
        }
        
        // Try case-insensitive match
        if (item.description.toLowerCase() === requiredItem.toLowerCase()) {
          console.log('✅ Found case-insensitive installation match:', item.description, '===', requiredItem);
          return true;
        }
        
        // Check for installation items containing key terms (not removal items)
        const itemDesc = item.description.toLowerCase();
        const requiredDesc = requiredItem.toLowerCase();
        
        // Check if it's NOT a removal item and contains key shingle type terms
        if (!itemDesc.includes('remove') && itemDesc.includes('shingle')) {
          const hasLaminated = (itemDesc.includes('laminated') && requiredDesc.includes('laminated')) || 
                             (!itemDesc.includes('laminated') && !requiredDesc.includes('laminated'));
          const has3Tab = (itemDesc.includes('3 tab') && requiredDesc.includes('3 tab')) || 
                         (!itemDesc.includes('3 tab') && !requiredDesc.includes('3 tab'));
          const hasComp = itemDesc.includes('comp') && requiredDesc.includes('comp');
          const hasShingle = itemDesc.includes('shingle') && requiredDesc.includes('shingle');
          const hasFelt = (itemDesc.includes('felt') && requiredDesc.includes('felt'));
          
          if (hasComp && hasShingle && (hasLaminated || has3Tab)) {
            console.log('✅ Found installation item match:', item.description, 'matches pattern for', requiredItem);
            return true;
          }
        }
        
        return false;
      });
    });
    
    console.log('🔍 Found installation items:', foundInstallationItems.map((item: any) => item.description));
    
    if (foundInstallationItems.length > 0) {
      // Show message that installation items were found
      console.log('✅ Installation line items found, proceeding without modal');
      setFoundInstallationItems(foundInstallationItems);
      setShowSPCInstallationFoundModal(true);
    } else {
      // No installation items found, show modal for user selection
      console.log('⚠️ No installation items found, showing SPC installation modal');
      setShowSPCInstallationModal(true);
    }
  };

  // JavaScript Rules Engine function
  const runJavaScriptRuleEngine = async () => {
    console.log('=== RUNNING JAVASCRIPT RULE ENGINE ===');
    setIsRunningJSRules(true);
    
    try {
      if (extractedLineItems.length === 0) {
        alert('No line items available. Please upload and process documents first.');
        setIsRunningJSRules(false);
        return;
      }

      // Get roof measurements using the helper function
      const roofMeasurementsObj = extractRoofMeasurements(rawAgentData);
      
      if (!roofMeasurementsObj) {
        alert('Could not extract roof measurements. Please check that roof report was processed correctly.');
        setIsRunningJSRules(false);
        return;
      }

      // Convert to the format expected by JavaScript script
      let roofMeasurements: Record<string, any> = {};
      
      // Map the extracted data to the expected format
      if (roofMeasurementsObj.roofMeasurements) {
        roofMeasurements = roofMeasurementsObj.roofMeasurements;
      } else {
        // If the data is at the root level, use it directly
        roofMeasurements = roofMeasurementsObj;
      }
      
      console.log('📊 Using extracted roof measurements:', roofMeasurements);
      
      // Store the extracted measurements for UI display
      setExtractedRoofMeasurements(roofMeasurements);
      
      // If we have individual ridge/hip lengths but no combined field, create it
      if (roofMeasurements.ridgeLength !== undefined && roofMeasurements.hipLength !== undefined && !roofMeasurements["Total Ridges/Hips Length"]) {
        const combinedLength = roofMeasurements.ridgeLength + roofMeasurements.hipLength;
        roofMeasurements["Total Ridges/Hips Length"] = { value: combinedLength };
      }

      console.log('📊 Using LIVE roof measurements:', roofMeasurements);

      // Prepare data for JavaScript script
      const jsInputData = {
        line_items: extractedLineItems.map(item => ({
          line_number: item.line_number || 'N/A',
          description: item.description || 'Unknown',
          quantity: item.quantity || 0,
          unit: item.unit || 'EA',
          unit_price: item.unit_price || 0,
          RCV: item.RCV || 0,
          age_life: item.age_life || '',
          condition: item.condition || '',
          dep_percent: item.dep_percent || 0,
          depreciation_amount: item.depreciation_amount || 0,
          ACV: item.ACV || 0,
          location_room: item.location_room || 'Unknown',
          category: item.category || 'Unknown',
          page_number: item.page_number || 1
        })),
        roof_measurements: roofMeasurements
      };

      console.log('Sending data to JavaScript script:', jsInputData);

      // Call the JavaScript rule engine API endpoint
      const response = await fetch('/api/run-javascript-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsInputData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`JavaScript rule engine failed: ${errorData.error || response.statusText}`);
      }

      const ruleData = await response.json();
      console.log('JavaScript rule engine results:', ruleData);
      console.log('🔍 Debug: JavaScript audit log:', ruleData.data?.audit_log);
      console.log('🔍 Debug: JavaScript original items count:', ruleData.data?.original_line_items?.length);
      console.log('🔍 Debug: JavaScript adjusted items count:', ruleData.data?.adjusted_line_items?.length);
      console.log('🔍 Debug: Sample adjusted item:', ruleData.data?.adjusted_line_items?.[0]);
      console.log('🔍 Debug: Items with narratives:', ruleData.data?.adjusted_line_items?.filter((item: any) => item.narrative));

      if (!ruleData.success) {
        throw new Error(`JavaScript rule engine error: ${ruleData.error}`);
      }

      // Store the results and ensure line_items is populated
      // Combine original line items with adjusted line items to preserve all items
      const originalItems = ruleData.data?.original_line_items || [];
      const adjustedItems = ruleData.data?.adjusted_line_items || [];
      
      // Create a map of adjusted items by line number for easy lookup
      const adjustedItemsMap = new Map();
      adjustedItems.forEach((item: any) => {
        adjustedItemsMap.set(item.line_number, item);
      });

      // Merge: Start with all original items, then overwrite with adjusted versions
      const finalLineItems = originalItems.map((origItem: any) => {
        const adjustedItem = adjustedItemsMap.get(origItem.line_number);
        if (adjustedItem) {
          adjustedItemsMap.delete(origItem.line_number); // Mark as processed
          return adjustedItem; // Use adjusted version
        }
        return origItem; // Keep original if no adjustment
      });

      // Add any new items that were only in adjusted (newly added items)
      adjustedItemsMap.forEach((item: any) => {
        finalLineItems.push(item);
      });

      console.log('🔍 Debug: Final merged items count:', finalLineItems.length);
      console.log('🔍 Debug: Sample final item:', finalLineItems[0]);
      
      const resultsWithLineItems = {
        ...ruleData.data,
        line_items: finalLineItems,
        audit_log: ruleData.data?.audit_log || [] // Preserve the audit log
      };
      setRuleResults(resultsWithLineItems);
      setShowRuleResults(true);

      // Update extracted line items with the final results
      setExtractedLineItems(finalLineItems);

      // After JavaScript Adjustment Engine completes, check for shingle removal items
      const updatedLineItems = finalLineItems;
      setCurrentSPCLineItems(updatedLineItems);
      
      // Check if any of the required removal line items are present
      console.log('🔍 Checking for shingle removal items in:', updatedLineItems.length, 'line items');
      console.log('🔍 Required items:', shingleRemovalOptions);
      console.log('🔍 All line item descriptions:', updatedLineItems.map((item: any) => item.description));
      
      const foundRemovalItems = updatedLineItems.filter((item: any) => {
        if (!item.description) return false;
        
        console.log('🔍 Checking item:', item.description);
        
        return shingleRemovalOptions.some(requiredItem => {
          // Try exact match first
          if (item.description === requiredItem) {
            console.log('✅ Found exact match:', item.description);
            return true;
          }
          
          // Try case-insensitive match
          if (item.description.toLowerCase() === requiredItem.toLowerCase()) {
            console.log('✅ Found case-insensitive match:', item.description, '===', requiredItem);
            return true;
          }
          
          // Check for removal items containing key terms
          const itemDesc = item.description.toLowerCase();
          const requiredDesc = requiredItem.toLowerCase();
          
          // Check if it's a removal item and contains key shingle type terms
          if (itemDesc.includes('remove')) {
            const hasLaminated = (itemDesc.includes('laminated') && requiredDesc.includes('laminated')) || 
                               (!itemDesc.includes('laminated') && !requiredDesc.includes('laminated'));
            const has3Tab = (itemDesc.includes('3 tab') && requiredDesc.includes('3 tab')) || 
                           (!itemDesc.includes('3 tab') && !requiredDesc.includes('3 tab'));
            const hasComp = itemDesc.includes('comp') && requiredDesc.includes('comp');
            const hasShingle = itemDesc.includes('shingle') && requiredDesc.includes('shingle');
            const hasFelt = (itemDesc.includes('felt') && requiredDesc.includes('felt'));
            
            if (hasComp && hasShingle && (hasLaminated || has3Tab || hasFelt)) {
              console.log('✅ Found removal item match:', item.description, 'matches pattern for', requiredItem);
              return true;
            }
          }
          
          return false;
        });
      });
      
      console.log('🔍 Found removal items:', foundRemovalItems.map((item: any) => item.description));
      
      if (foundRemovalItems.length > 0) {
        // Show message that removal items were found
        console.log('✅ Removal line items found, proceeding without modal');
        setFoundRemovalItems(foundRemovalItems);
        setShowSPCItemsFoundModal(true);
      } else {
        // No removal items found, show modal for user selection
        console.log('⚠️ No removal items found, showing SPC shingle removal modal');
        setShowSPCShingleRemovalModal(true);
      }

    } catch (error) {
      console.error('Error running JavaScript rule engine:', error);
      alert(`JavaScript rule engine failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunningJSRules(false);
    }
  };

  // Check for SPC-added items (final step)
  const checkSPCAddedItems = (updatedLineItems: any[]) => {
    console.log('🔍 Checking for SPC-added items in:', updatedLineItems.length, 'line items');
    
    // Items that are automatically added by the SPC Adjustment Engine
    const spcAddedItemOptions = [
      'Remove Additional charge for steep roof - 7/12 to 9/12 slope',
      'Additional charge for steep roof - 7/12 to 9/12 slope',
      'Asphalt starter - universal starter course',
      'Continuous ridge vent - Detach & reset'
    ];
    
    console.log('🔍 Looking for SPC-added items:', spcAddedItemOptions);
    
    const foundSPCItems = updatedLineItems.filter((item: any) => {
      if (!item.description) return false;
      
      console.log('🔍 Checking SPC item:', item.description);
      
      return spcAddedItemOptions.some(requiredItem => {
        // Try exact match first
        if (item.description === requiredItem) {
          console.log('✅ Found exact SPC-added match:', item.description);
          return true;
        }
        
        // Try case-insensitive match
        if (item.description.toLowerCase() === requiredItem.toLowerCase()) {
          console.log('✅ Found case-insensitive SPC-added match:', item.description, '===', requiredItem);
          return true;
        }
        
        // Try partial matching for variations
        const itemDesc = item.description.toLowerCase();
        const requiredDesc = requiredItem.toLowerCase();
        
        if (itemDesc.includes('steep roof') && requiredDesc.includes('steep roof')) {
          if (itemDesc.includes('7/12') && itemDesc.includes('9/12') && requiredDesc.includes('7/12') && requiredDesc.includes('9/12')) {
            console.log('✅ Found SPC steep roof match:', item.description);
            return true;
          }
        }
        
        if (itemDesc.includes('asphalt starter') && itemDesc.includes('universal') && requiredDesc.includes('asphalt starter') && requiredDesc.includes('universal')) {
          console.log('✅ Found SPC asphalt starter match:', item.description);
          return true;
        }
        
        if (itemDesc.includes('continuous ridge vent') && itemDesc.includes('detach') && requiredDesc.includes('continuous ridge vent') && requiredDesc.includes('detach')) {
          console.log('✅ Found SPC ridge vent match:', item.description);
          return true;
        }
        
        return false;
      });
    });
    
    console.log('🔍 Found SPC-added items:', foundSPCItems.map((item: any) => item.description));
    
    if (foundSPCItems.length > 0) {
      console.log('✅ SPC-added items found, storing for final summary');
      setFoundSPCAddedItems(foundSPCItems);
    }
    
    // Always proceed to ridge vent check after SPC items check
    setTimeout(() => {
      checkRidgeVentItems(updatedLineItems);
    }, 100);
  };

  // Check for ridge vent items
  const checkRidgeVentItems = (updatedLineItems: any[]) => {
    console.log('🔍 Checking for ridge vent items in:', updatedLineItems.length, 'line items');
    
    // Ridge vent options - MUST match Roof Master Macro exactly
    const ridgeVentItemOptions = [
      'Continuous ridge vent - shingle-over style',
      'Continuous ridge vent - aluminum'
    ];
    
    console.log('🔍 Looking for ridge vent items:', ridgeVentItemOptions);
    
    const foundRidgeVentItems = updatedLineItems.filter((item: any) => {
      if (!item.description) return false;
      
      console.log('🔍 Checking ridge vent item:', item.description);
      
      return ridgeVentItemOptions.some(requiredItem => {
        // Try exact match first
        if (item.description === requiredItem) {
          console.log('✅ Found exact ridge vent match:', item.description);
          return true;
        }
        
        // Try case-insensitive match
        if (item.description.toLowerCase() === requiredItem.toLowerCase()) {
          console.log('✅ Found case-insensitive ridge vent match:', item.description, '===', requiredItem);
          return true;
        }
        
        return false;
      });
    });
    
    console.log('🔍 Found ridge vent items:', foundRidgeVentItems.map((item: any) => item.description));
    
    // Get Total Line Lengths (Ridges) from extractedRoofMeasurements
    const totalRidges = extractedRoofMeasurements["Total Line Lengths (Ridges)"];
    const ridgesValue = totalRidges?.value || (typeof totalRidges === 'number' ? totalRidges : 0);
    
    console.log('🔍 Total Line Lengths (Ridges):', ridgesValue);
    
    if (foundRidgeVentItems.length > 0) {
      console.log('✅ Ridge vent items found, proceeding to chimney check');
      setFoundRidgeVentItems(foundRidgeVentItems);
      setShowSPCRidgeVentFoundModal(true);
    } else if (ridgesValue > 0) {
      console.log('⚠️ No ridge vent items found but ridges exist, showing ridge vent modal');
      // Calculate quantity based on Total Line Lengths (Ridges) / 100
      const calculatedQuantity = ridgesValue / 100;
      console.log('🔍 Calculated ridge vent quantity:', calculatedQuantity);
      setShowSPCRidgeVentModal(true);
    } else {
      console.log('ℹ️ No ridge vent items needed (no ridges found), proceeding to chimney check');
      // If no ridges found, proceed to chimney check
      setTimeout(() => {
        checkChimneyFlashingItems(updatedLineItems);
      }, 100);
    }
  };

  // Chimney flashing options - MUST match Roof Master Macro exactly
  const chimneyFlashingOptions = [
    'Chimney flashing - small (24" x 24")',
    'Chimney flashing - average (32" x 36")',
    'Chimney flashing - large (32" x 60")'
  ];

  // Check for chimney flashing items
  const checkChimneyFlashingItems = (updatedLineItems: any[]) => {
    console.log('🔍 Checking for chimney flashing items in:', updatedLineItems.length, 'line items');
    
    console.log('🔍 Looking for chimney flashing items:', chimneyFlashingOptions);
    
    const foundChimneyItems = updatedLineItems.filter((item: any) => {
      if (!item.description) return false;
      
      console.log('🔍 Checking chimney item:', item.description);
      
      return chimneyFlashingOptions.some(requiredItem => {
        // Try exact match first
        if (item.description === requiredItem) {
          console.log('✅ Found exact chimney match:', item.description);
          return true;
        }
        
        // Try case-insensitive match
        if (item.description.toLowerCase() === requiredItem.toLowerCase()) {
          console.log('✅ Found case-insensitive chimney match:', item.description, '===', requiredItem);
          return true;
        }
        
        return false;
      });
    });
    
    console.log('🔍 Found chimney flashing items:', foundChimneyItems.map((item: any) => item.description));
    
    if (foundChimneyItems.length > 0) {
      console.log('✅ Chimney flashing items found, proceeding to final step');
      setFoundChimneyItems(foundChimneyItems);
      setShowSPCChimneyFoundModal(true);
    } else {
      console.log('⚠️ No chimney flashing items found, showing chimney confirmation modal');
      setShowSPCChimneyModal(true);
    }
  };

  // Additional layers options - MUST match Roof Master Macro exactly
  const additionalLayersOptions = [
    'Add. layer of comp. shingles remove & disp. - Laminated',
    'Add. layer of comp. shingles remove & disp. - 3 tab'
  ];

  // Check for additional layers items
  const checkAdditionalLayersItems = (updatedLineItems: any[]) => {
    console.log('🔍 Checking for additional layers items in:', updatedLineItems.length, 'line items');
    
    console.log('🔍 Looking for additional layers items:', additionalLayersOptions);
    
    const foundAdditionalLayersItems = updatedLineItems.filter((item: any) => {
      if (!item.description) return false;
      
      console.log('🔍 Checking additional layers item:', item.description);
      
      return additionalLayersOptions.some(requiredItem => {
        // Try exact match first
        if (item.description === requiredItem) {
          console.log('✅ Found exact additional layers match:', item.description);
          return true;
        }
        
        // Try case-insensitive match
        if (item.description.toLowerCase() === requiredItem.toLowerCase()) {
          console.log('✅ Found case-insensitive additional layers match:', item.description, '===', requiredItem);
          return true;
        }
        
        return false;
      });
    });
    
    console.log('🔍 Found additional layers items:', foundAdditionalLayersItems.map((item: any) => item.description));
    
    if (foundAdditionalLayersItems.length > 0) {
      console.log('✅ Additional layers items found, proceeding to final step');
      setFoundAdditionalLayersItems(foundAdditionalLayersItems);
      setShowSPCAdditionalLayersFoundModal(true);
    } else {
      console.log('⚠️ No additional layers items found, showing additional layers confirmation modal');
      setShowSPCAdditionalLayersModal(true);
    }
  };

  // Check for permit items
  const checkPermitItems = (updatedLineItems: any[]) => {
    console.log('🔍 Checking for permit items in:', updatedLineItems.length, 'line items');
    
    // Check for permit-related items (case insensitive)
    const foundPermitItems = updatedLineItems.filter((item: any) => {
      if (!item.description) return false;
      
      console.log('🔍 Checking permit item:', item.description);
      
      const description = item.description.toLowerCase();
      // Look for permit-related keywords
      return description.includes('permit') || 
             description.includes('license') || 
             description.includes('inspection') ||
             description === 'permit';
    });
    
    console.log('🔍 Found permit items:', foundPermitItems.map((item: any) => item.description));
    
    if (foundPermitItems.length > 0) {
      console.log('✅ Permit items found, proceeding to final step');
      setFoundPermitItems(foundPermitItems);
      setShowSPCPermitFoundModal(true);
    } else {
      console.log('⚠️ No permit items found, showing permit confirmation modal');
      setShowSPCPermitModal(true);
    }
  };

  // Check for hidden damages and prompt user for cost and narrative
  const checkHiddenDamages = (updatedLineItems: any[]) => {
    console.log('🔍 Checking for hidden damages - prompting user for input');
    
    // Always show the hidden damages modal to prompt for cost and narrative
    setShowSPCHiddenDamagesModal(true);
  };

  // Check for roof access issues and prompt user for details
  const checkRoofAccessIssues = (updatedLineItems: any[]) => {
    console.log('🔍 Checking for roof access issues - prompting user for input');
    
    // Always show the roof access issues modal to prompt for details
    setShowSPCRoofAccessModal(true);
  };

  // Check for O&P items
  const checkOPItems = (updatedLineItems: any[]) => {
    console.log('🔍 Checking for O&P items in:', updatedLineItems.length, 'line items');
    
    // Check for O&P-related items (case insensitive)
    const foundOPItems = updatedLineItems.filter((item: any) => {
      if (!item.description) return false;
      
      console.log('🔍 Checking O&P item:', item.description);
      
      const description = item.description.toLowerCase();
      // Look for O&P-related keywords
      return description.includes('o&p') || 
             (description.includes('overhead') && description.includes('profit')) ||
             description.includes('overhead and profit');
    });
    
    console.log('🔍 Found O&P items:', foundOPItems.map((item: any) => item.description));
    
    if (foundOPItems.length > 0) {
      console.log('✅ O&P items found, proceeding to final step');
      setFoundOPItems(foundOPItems);
      setShowSPCOPFoundModal(true);
    } else {
      console.log('⚠️ No O&P items found, showing O&P confirmation modal');
      setShowSPCOPModal(true);
    }
  };

  // Shingle Removal Options - MUST match Roof Master Macro exactly
  const shingleRemovalOptions = [
    'Remove Laminated - comp. shingle rfg. - w/out felt',
    'Remove 3 tab - 25 yr. - comp. shingle roofing - w/out felt',
    'Remove 3 tab - 25 yr. - composition shingle roofing - incl. felt',
    'Remove Laminated - comp. shingle rfg. - w/ felt'
  ];

  // Installation Shingle Options - MUST match Roof Master Macro exactly
  const installationShingleOptions = [
    'Laminated - comp. shingle rfg. - w/out felt',
    '3 tab - 25 yr. - comp. shingle roofing - w/out felt',
    '3 tab - 25 yr. - composition shingle roofing - incl. felt',
    'Laminated - comp. shingle rfg. - w/ felt'
  ];

  // Ridge Vent Options (with display names and macro names)
  const ridgeVentOptions = [
    {
      displayName: 'Continuous ridge vent shingle-over style',
      macroName: 'Continuous ridge vent - shingle-over style'
    },
    {
      displayName: 'Continuous ridge vent aluminum', 
      macroName: 'Continuous ridge vent - aluminum'
    }
  ];

  // Check if shingle removal items are present and return found items
  const checkShingleRemovalItems = () => {
    const foundItems = extractedLineItems.filter(item => {
      const itemDesc = item.description.toLowerCase();
      
      // Check for exact matches first
      if (shingleRemovalOptions.includes(item.description)) {
        return true;
      }
      
      // Check for partial matches to handle variations in formatting
      // Look for "remove" + "shingle" + specific shingle types
      if (itemDesc.includes('remove') && itemDesc.includes('shingle')) {
        
        // Pattern 1: Laminated shingles (with or without felt)
        if (itemDesc.includes('laminated') && itemDesc.includes('comp')) {
          return true;
        }
        
        // Pattern 2: 3 tab shingles (with or without felt)
        if (itemDesc.includes('3 tab') && itemDesc.includes('25 yr') && itemDesc.includes('comp')) {
          return true;
        }
      }
      
      return false;
    });
    
    return {
      hasShingleRemoval: foundItems.length > 0,
      foundItems: foundItems
    };
  };

  // Check if installation shingle items are present and return found items
  const checkInstallationShingleItems = () => {
    const foundItems = extractedLineItems.filter(item => {
      const itemDesc = item.description.toLowerCase();
      
      // Check for exact matches first
      if (installationShingleOptions.includes(item.description)) {
        return true;
      }
      
      // Check for partial matches to handle variations in formatting
      // Look for "shingle" + specific shingle types (without "remove")
      if (itemDesc.includes('shingle') && !itemDesc.includes('remove')) {
        
        // Pattern 1: Laminated shingles (with or without felt)
        if (itemDesc.includes('laminated') && itemDesc.includes('comp')) {
          return true;
        }
        
        // Pattern 2: 3 tab shingles (with or without felt)
        if (itemDesc.includes('3 tab') && itemDesc.includes('25 yr') && itemDesc.includes('comp')) {
          return true;
        }
      }
      
      return false;
    });
    
    return {
      hasInstallationShingles: foundItems.length > 0,
      foundItems: foundItems
    };
  };

  // Add shingle removal item and continue workflow
  const handleAddShingleRemoval = async () => {
    if (!selectedShingleRemoval) {
      alert('Please select a shingle removal type');
      return;
    }

    const quantity = parseFloat(shingleRemovalQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const macroData = roofMasterMacro.get(selectedShingleRemoval);
    if (!macroData) {
      alert(`Item "${selectedShingleRemoval}" not found in Roof Master Macro`);
      return;
    }

    // Get max line number
    const maxLineNumber = Math.max(
      ...extractedLineItems.map(item => parseInt(item.line_number) || 0),
      0
    );

    // Create new line item
    const newItem: LineItem = {
      line_number: String(maxLineNumber + 1),
      description: selectedShingleRemoval,
      quantity: quantity,
      unit: macroData.unit || 'SQ',
      unit_price: macroData.unit_price,
      RCV: quantity * macroData.unit_price,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: quantity * macroData.unit_price,
      location_room: 'Roof',
      category: 'Roof',
      page_number: Math.max(...extractedLineItems.map(item => item.page_number || 0), 1)
    };

    // Add to line items
    const updatedItems = [...extractedLineItems, newItem];
    setExtractedLineItems(updatedItems);
    
    // Close modal and reset
    setShowShingleRemovalModal(false);
    setSelectedShingleRemoval('');
    setShingleRemovalQuantity('');
    
    console.log('✅ Added shingle removal item:', newItem);
    
    // Mark step as completed and continue with the unified workflow
    setShingleRemovalSkipped(true);
    if (showUnifiedWorkflow) {
      setCurrentWorkflowStep(1); // Move to next step
    }
  };

  // Add SPC shingle removal item after SPC Adjustment Engine
  const handleAddSPCShingleRemoval = async () => {
    if (!selectedSPCShingleRemoval) {
      alert('Please select a shingle removal type');
      return;
    }

    const quantity = parseFloat(spcShingleRemovalQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    // Get data from Roof Master Macro
    const macroData = roofMasterMacro.get(selectedSPCShingleRemoval);
    if (!macroData) {
      alert(`Item "${selectedSPCShingleRemoval}" not found in Roof Master Macro`);
      return;
    }

    // Get the current line items (including any from SPC Adjustment Engine results)
    const currentItems = ruleResults?.line_items || extractedLineItems;
    
    // Get max line number
    const maxLineNumber = Math.max(
      ...currentItems.map((item: any) => parseInt(item.line_number) || 0),
      0
    );

    // Create new line item with user prompt workflow marker
    const newItem = {
      line_number: String(maxLineNumber + 1),
      description: selectedSPCShingleRemoval,
      quantity: quantity,
      unit: macroData.unit || 'SQ',
      unit_price: macroData.unit_price,
      RCV: quantity * macroData.unit_price,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: quantity * macroData.unit_price,
      location_room: 'Roof',
      category: 'Roof',
      page_number: Math.max(...currentItems.map((item: any) => item.page_number || 0), 1),
      user_prompt_workflow: true, // Mark as user prompt workflow addition
      user_prompt_step: 'removal' // Track which step added this item
    };

    // Update only the SPC adjusted line items (rule results), NOT the original extractedLineItems
    if (ruleResults) {
      const updatedRuleResults = {
        ...ruleResults,
        line_items: [...(ruleResults.line_items || []), newItem]
      };
      setRuleResults(updatedRuleResults);
    }

    // Close modal and reset
    setShowSPCShingleRemovalModal(false);
    setSelectedSPCShingleRemoval('');
    setSPCShingleRemovalQuantity('');
    
    console.log('✅ Added SPC shingle removal item:', newItem);
    
    // After adding removal item, update current line items and proceed to installation check
    const updatedSPCItems = currentSPCLineItems.concat(newItem);
    setCurrentSPCLineItems(updatedSPCItems);
    setTimeout(() => {
      checkInstallationItems(updatedSPCItems);
    }, 100);
  };

  // Add SPC installation shingle item after removal check
  const handleAddSPCInstallation = async () => {
    if (!selectedSPCInstallation) {
      alert('Please select an installation shingle type');
      return;
    }

    const quantity = parseFloat(spcInstallationQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    // Get data from Roof Master Macro
    const macroData = roofMasterMacro.get(selectedSPCInstallation);
    if (!macroData) {
      alert(`Item "${selectedSPCInstallation}" not found in Roof Master Macro`);
      return;
    }

    // Get the current line items (including any from SPC Adjustment Engine results)
    const currentItems = ruleResults?.line_items || extractedLineItems;
    
    // Get max line number
    const maxLineNumber = Math.max(
      ...currentItems.map((item: any) => parseInt(item.line_number) || 0),
      0
    );

    // Create new line item with user prompt workflow marker
    const newItem = {
      line_number: String(maxLineNumber + 1),
      description: selectedSPCInstallation,
      quantity: quantity,
      unit: macroData.unit || 'SQ',
      unit_price: macroData.unit_price,
      RCV: quantity * macroData.unit_price,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: quantity * macroData.unit_price,
      location_room: 'Roof',
      category: 'Roof',
      page_number: Math.max(...currentItems.map((item: any) => item.page_number || 0), 1),
      user_prompt_workflow: true, // Mark as user prompt workflow addition
      user_prompt_step: 'installation' // Track which step added this item
    };

    // Update only the SPC adjusted line items (rule results), NOT the original extractedLineItems
    if (ruleResults) {
      const updatedRuleResults = {
        ...ruleResults,
        line_items: [...(ruleResults.line_items || []), newItem]
      };
      setRuleResults(updatedRuleResults);
    }

    // Close modal and reset
    setShowSPCInstallationModal(false);
    setSelectedSPCInstallation('');
    setSPCInstallationQuantity('');
    
    console.log('✅ Added SPC installation shingle item:', newItem);
    
    // After adding installation item, update current line items and proceed to final step check
    const updatedSPCItems = currentSPCLineItems.concat(newItem);
    setCurrentSPCLineItems(updatedSPCItems);
    setTimeout(() => {
      checkSPCAddedItems(updatedSPCItems);
    }, 100);
  };

  // Add SPC ridge vent item after installation check
  const handleAddSPCRidgeVent = async () => {
    if (!selectedSPCRidgeVent) {
      alert('Please select a ridge vent type');
      return;
    }

    // Get Total Line Lengths (Ridges) from extractedRoofMeasurements
    const totalRidges = extractedRoofMeasurements["Total Line Lengths (Ridges)"];
    const ridgesValue = totalRidges?.value || (typeof totalRidges === 'number' ? totalRidges : 0);
    const calculatedQuantity = ridgesValue / 100;

    if (calculatedQuantity <= 0) {
      alert('No ridges found - ridge vent not needed');
      return;
    }

    // Get data from Roof Master Macro using the macroName
    const selectedRidgeVentOption = ridgeVentOptions.find(option => option.displayName === selectedSPCRidgeVent);
    if (!selectedRidgeVentOption) {
      alert(`Selected ridge vent type not found`);
      return;
    }

    const macroData = roofMasterMacro.get(selectedRidgeVentOption.macroName);
    if (!macroData) {
      alert(`Ridge vent "${selectedRidgeVentOption.macroName}" not found in Roof Master Macro`);
      return;
    }

    // Get the current line items (including any from previous workflow steps)
    const currentItems = ruleResults?.line_items || extractedLineItems;
    
    // Get max line number
    const maxLineNumber = Math.max(
      ...currentItems.map((item: any) => parseInt(item.line_number) || 0),
      0
    );

    // Create new line item with user prompt workflow marker
    const newItem = {
      line_number: String(maxLineNumber + 1),
      description: selectedRidgeVentOption.macroName,
      quantity: calculatedQuantity,
      unit: macroData.unit || 'LF',
      unit_price: macroData.unit_price,
      RCV: calculatedQuantity * macroData.unit_price,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: calculatedQuantity * macroData.unit_price,
      location_room: 'Roof',
      category: 'Roof',
      page_number: Math.max(...currentItems.map((item: any) => item.page_number || 0), 1),
      user_prompt_workflow: true, // Mark as user prompt workflow addition
      user_prompt_step: 'ridge_vent' // Track which step added this item
    };

    // Update only the SPC adjusted line items (rule results), NOT the original extractedLineItems
    if (ruleResults) {
      const updatedRuleResults = {
        ...ruleResults,
        line_items: [...(ruleResults.line_items || []), newItem]
      };
      setRuleResults(updatedRuleResults);
    }

    // Close modal and reset
    setShowSPCRidgeVentModal(false);
    setSelectedSPCRidgeVent('');
    
    console.log('✅ Added SPC ridge vent item:', newItem);
    
    // After adding ridge vent item, proceed to chimney check
    setTimeout(() => {
      const updatedItems = [...(ruleResults?.line_items || []), newItem];
      checkChimneyFlashingItems(updatedItems);
    }, 100);
  };

  // Add chimney cricket item based on size/length calculations
  const handleAddChimneyCricket = async () => {
    let cricketItemName = '';
    
    // Determine which cricket to add based on the logic
    let length = 0;
    let width = 0;
    
    if (chimneySize) {
      // Use predefined sizes
      if (chimneySize === 'small') {
        length = 24;
        width = 24;
      } else if (chimneySize === 'medium') {
        length = 32;
        width = 36;
      } else if (chimneySize === 'large') {
        length = 32;
        width = 60;
      }
    } else {
      // Use custom dimensions
      length = parseFloat(chimneyLength);
      width = parseFloat(chimneyWidth);
    }
    
    // Apply the business rules
    if (length < 30 || chimneySize === 'small') {
      // No cricket needed for small chimneys or length < 30
      console.log('ℹ️ No cricket needed - chimney too small');
    } else if (length > 30) {
      const area = length * width;
      
      if (area < (32 * 60)) {
        cricketItemName = 'Saddle or cricket - up to 25 SF';
      } else if (area >= (32 * 60)) {
        cricketItemName = 'Saddle or cricket - 26 to 50 SF';
      }
    }

    if (!cricketItemName) {
      // No cricket needed, just close modal and proceed to additional layers check
      setShowSPCChimneyModal(false);
      setTimeout(() => {
        checkAdditionalLayersItems(ruleResults?.line_items || []);
      }, 100);
      return;
    }

    // Get data from Roof Master Macro
    const macroData = roofMasterMacro.get(cricketItemName);
    if (!macroData) {
      alert(`Cricket item "${cricketItemName}" not found in Roof Master Macro`);
      return;
    }

    // Get the current line items
    const currentItems = ruleResults?.line_items || extractedLineItems;
    
    // Get max line number
    const maxLineNumber = Math.max(
      ...currentItems.map((item: any) => parseInt(item.line_number) || 0),
      0
    );

    // Create new line item with user prompt workflow marker
    const newItem = {
      line_number: String(maxLineNumber + 1),
      description: cricketItemName,
      quantity: 1, // Cricket items are typically EA (each)
      unit: macroData.unit || 'EA',
      unit_price: macroData.unit_price,
      RCV: macroData.unit_price, // quantity * unit_price
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: macroData.unit_price,
      location_room: 'Roof',
      category: 'Roof',
      page_number: Math.max(...currentItems.map((item: any) => item.page_number || 0), 1),
      user_prompt_workflow: true, // Mark as user prompt workflow addition
      user_prompt_step: 'chimney_cricket' // Track which step added this item
    };

    // Update only the SPC adjusted line items (rule results), NOT the original extractedLineItems
    if (ruleResults) {
      const updatedRuleResults = {
        ...ruleResults,
        line_items: [...(ruleResults.line_items || []), newItem]
      };
      setRuleResults(updatedRuleResults);
    }

    // Close modal and reset
    setShowSPCChimneyModal(false);
    setChimneyPresent(null);
    setChimneySize('');
    setChimneyLength('');
    setChimneyWidth('');
    
    console.log('✅ Added chimney cricket item:', newItem);
    
    // After adding cricket item, proceed to additional layers check
    setTimeout(() => {
      const updatedItems = [...(ruleResults?.line_items || []), newItem];
      checkAdditionalLayersItems(updatedItems);
    }, 100);
  };

  // Add additional layers item based on layer type and coverage
  const handleAddAdditionalLayers = async () => {
    if (!additionalLayersPresent) {
      // No additional layers, just close modal and proceed to permit check
      setShowSPCAdditionalLayersModal(false);
      setTimeout(() => {
        checkPermitItems(ruleResults?.line_items || []);
      }, 100);
      return;
    }

    if (!layerType || (!coverageType && !coverageSquares)) {
      alert('Please specify layer type and coverage');
      return;
    }

    // Determine the item description based on layer type
    let itemDescription = '';
    if (layerType === 'laminated') {
      itemDescription = 'Add. layer of comp. shingles remove & disp. - Laminated';
    } else if (layerType === '3-tab') {
      itemDescription = 'Add. layer of comp. shingles remove & disp. - 3 tab';
    } else {
      alert('Invalid layer type');
      return;
    }

    // Get data from Roof Master Macro
    const macroData = roofMasterMacro.get(itemDescription);
    if (!macroData) {
      alert(`Additional layer item "${itemDescription}" not found in Roof Master Macro`);
      return;
    }

    // Calculate quantity
    let quantity = 0;
    if (coverageType === 'entire roof') {
      // Use Total Roof Area from extractedRoofMeasurements
      const totalRoofArea = extractedRoofMeasurements["Total Roof Area"];
      const roofAreaValue = totalRoofArea?.value || (typeof totalRoofArea === 'number' ? totalRoofArea : 0);
      quantity = roofAreaValue / 100; // Convert to squares
    } else if (coverageSquares) {
      quantity = parseFloat(coverageSquares);
    } else {
      alert('Please specify coverage');
      return;
    }

    if (quantity <= 0) {
      alert('Invalid quantity calculated');
      return;
    }

    // Get the current line items
    const currentItems = ruleResults?.line_items || extractedLineItems;
    
    // Get max line number
    const maxLineNumber = Math.max(
      ...currentItems.map((item: any) => parseInt(item.line_number) || 0),
      0
    );

    // Create new line item with user prompt workflow marker
    const newItem = {
      line_number: String(maxLineNumber + 1),
      description: itemDescription,
      quantity: quantity,
      unit: macroData.unit || 'SQ',
      unit_price: macroData.unit_price,
      RCV: quantity * macroData.unit_price,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: quantity * macroData.unit_price,
      location_room: 'Roof',
      category: 'Roof',
      page_number: Math.max(...currentItems.map((item: any) => item.page_number || 0), 1),
      user_prompt_workflow: true, // Mark as user prompt workflow addition
      user_prompt_step: 'additional_layers' // Track which step added this item
    };

    // Update only the SPC adjusted line items (rule results), NOT the original extractedLineItems
    if (ruleResults) {
      const updatedRuleResults = {
        ...ruleResults,
        line_items: [...(ruleResults.line_items || []), newItem]
      };
      setRuleResults(updatedRuleResults);
    }

    // Close modal and reset
    setShowSPCAdditionalLayersModal(false);
    setAdditionalLayersPresent(null);
    setLayerCount('');
    setLayerType('');
    setCoverageType('');
    setCoverageSquares('');
    
    console.log('✅ Added additional layers item:', newItem);
    
    // After adding additional layers item, proceed to permit check
    setTimeout(() => {
      const updatedItems = [...(ruleResults?.line_items || []), newItem];
      checkPermitItems(updatedItems);
    }, 100);
  };

  // Add permit item based on user cost input
  const handleAddPermit = async () => {
    if (!permitMissing) {
      // Permit not missing, just close modal and proceed to hidden damages check
      setShowSPCPermitModal(false);
      setTimeout(() => {
        checkHiddenDamages(ruleResults?.line_items || []);
      }, 100);
      return;
    }

    if (!permitCost || parseFloat(permitCost) <= 0) {
      alert('Please enter a valid permit cost');
      return;
    }

    const cost = parseFloat(permitCost);

    // Get the current line items
    const currentItems = ruleResults?.line_items || extractedLineItems;
    
    // Get max line number
    const maxLineNumber = Math.max(
      ...currentItems.map((item: any) => parseInt(item.line_number) || 0),
      0
    );

    // Create new permit line item with user prompt workflow marker
    const newItem = {
      line_number: String(maxLineNumber + 1),
      description: 'Permit',
      quantity: 1,
      unit: 'EA',
      unit_price: cost,
      RCV: cost,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: cost,
      location_room: 'General',
      category: 'Misc',
      page_number: Math.max(...currentItems.map((item: any) => item.page_number || 0), 1),
      user_prompt_workflow: true, // Mark as user prompt workflow addition
      user_prompt_step: 'permit' // Track which step added this item
    };

    // Update only the SPC adjusted line items (rule results), NOT the original extractedLineItems
    if (ruleResults) {
      const updatedRuleResults = {
        ...ruleResults,
        line_items: [...(ruleResults.line_items || []), newItem]
      };
      setRuleResults(updatedRuleResults);
    }

    // Close modal and reset
    setShowSPCPermitModal(false);
    setPermitMissing(null);
    setPermitCost('');
    
    console.log('✅ Added permit item:', newItem);
    
    // After adding permit item, proceed to hidden damages check
    setTimeout(() => {
      const updatedItems = [...(ruleResults?.line_items || []), newItem];
      checkHiddenDamages(updatedItems);
    }, 100);
  };

  // Add hidden damages item based on user cost and narrative input
  const handleAddHiddenDamages = async () => {
    if (!hiddenDamagesCost || parseFloat(hiddenDamagesCost) <= 0) {
      alert('Please enter a valid hidden damages cost');
      return;
    }

    if (!hiddenDamagesNarrative.trim()) {
      alert('Please enter a narrative description for the hidden damages');
      return;
    }

    const cost = parseFloat(hiddenDamagesCost);

    // Get the current line items
    const currentItems = ruleResults?.line_items || extractedLineItems;
    
    // Get max line number
    const maxLineNumber = Math.max(
      ...currentItems.map((item: any) => parseInt(item.line_number) || 0),
      0
    );

    // Create new hidden damages line item with user prompt workflow marker
    const newItem = {
      line_number: String(maxLineNumber + 1),
      description: hiddenDamagesNarrative, // Use the narrative description as the description
      quantity: 1,
      unit: 'EA',
      unit_price: cost,
      RCV: cost,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: cost,
      location_room: 'General',
      category: 'Misc',
      page_number: Math.max(...currentItems.map((item: any) => item.page_number || 0), 1),
      user_prompt_workflow: true, // Mark as user prompt workflow addition
      user_prompt_step: 'hidden_damages' // Track which step added this item
    };

    // Update only the SPC adjusted line items (rule results), NOT the original extractedLineItems
    if (ruleResults) {
      const updatedRuleResults = {
        ...ruleResults,
        line_items: [...(ruleResults.line_items || []), newItem]
      };
      setRuleResults(updatedRuleResults);
    }

    // Close modal and reset
    setShowSPCHiddenDamagesModal(false);
    setHiddenDamagesCost('');
    setHiddenDamagesNarrative('');
    
    console.log('✅ Added hidden damages item:', newItem);
    
    // After adding hidden damages item, proceed to roof access check
    setTimeout(() => {
      const updatedItems = [...(ruleResults?.line_items || []), newItem];
      checkRoofAccessIssues(updatedItems);
    }, 100);
  };

  // Add roof access labor cost based on calculations
  const handleAddRoofAccessLabor = async () => {
    if (!roofAccessIssues) {
      // No roof access issues, just close modal and proceed to O&P check
      setShowSPCRoofAccessModal(false);
      setTimeout(() => {
        checkOPItems(ruleResults?.line_items || []);
      }, 100);
      return;
    }

    if (roofAccessIssueTypes.length === 0) {
      alert('Please select at least one roof access issue');
      return;
    }

    if (roofAccessIssueTypes.includes('Other') && !otherIssueText) {
      alert('Please describe the other issue');
      return;
    }

    if (!numberOfStories || isNaN(parseInt(numberOfStories)) || parseInt(numberOfStories) <= 0) {
      alert('Please enter a valid number of stories');
      return;
    }

    if (roofstockingDelivery === null) {
      alert('Please specify if delivery is prevented');
      return;
    }

    // Only add labor if both roof access issues and delivery prevention are true
    if (!roofstockingDelivery) {
      // No delivery prevention, just close modal and proceed to O&P check
      setShowSPCRoofAccessModal(false);
      setTimeout(() => {
        checkOPItems(ruleResults?.line_items || []);
      }, 100);
      return;
    }

    // Get Total Roof Area from extractedRoofMeasurements
    const totalRoofArea = extractedRoofMeasurements["Total Roof Area"];
    const roofAreaValue = totalRoofArea?.value || (typeof totalRoofArea === 'number' ? totalRoofArea : 0);

    if (roofAreaValue <= 0) {
      alert('No roof area found - cannot calculate bundles');
      return;
    }

    // Calculate bundles = "Total Roof Area" * 3
    const bundles = roofAreaValue * 3;
    
    // Set labor_time = (bundles * (2.75 if "Number of Stories" == 1 else 3.13)) / 60
    const storiesCount = parseInt(numberOfStories);
    const laborTimePerBundle = storiesCount === 1 ? 2.75 : 3.13;
    const laborTime = (bundles * laborTimePerBundle) / 60;

    // Get unit cost for "Roofing - General Laborer - per hour" from roof master macro
    const laborCostKey = "Roofing - General Laborer - per hour";
    const macroData = roofMasterMacro.get(laborCostKey);
    if (!macroData) {
      alert(`Labor cost item "${laborCostKey}" not found in Roof Master Macro`);
      return;
    }

    const laborCost = (laborTime * macroData.unit_price) / 100;

    // Get the current line items
    const currentItems = ruleResults?.line_items || extractedLineItems;
    
    // Get max line number
    const maxLineNumber = Math.max(
      ...currentItems.map((item: any) => parseInt(item.line_number) || 0),
      0
    );

    // Build the narrative based on the selected issue types
    const issueDescriptions = roofAccessIssueTypes.map(type => 
      type === 'Other' ? otherIssueText : type
    );
    const narrative = `Roof access issues: ${issueDescriptions.join(', ')}`;

    // Create new labor cost line item with user prompt workflow marker
    const newItem = {
      line_number: String(maxLineNumber + 1),
      description: `Roof access labor - ${storiesCount} story building`,
      quantity: laborTime,
      unit: macroData.unit || 'HR',
      unit_price: macroData.unit_price,
      RCV: laborCost,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: laborCost,
      location_room: 'Roof',
      category: 'Labor',
      page_number: Math.max(...currentItems.map((item: any) => item.page_number || 0), 1),
      narrative: narrative,
      user_prompt_workflow: true, // Mark as user prompt workflow addition
      user_prompt_step: 'roof_access' // Track which step added this item
    };

    // Update only the SPC adjusted line items (rule results), NOT the original extractedLineItems
    if (ruleResults) {
      const updatedRuleResults = {
        ...ruleResults,
        line_items: [...(ruleResults.line_items || []), newItem]
      };
      setRuleResults(updatedRuleResults);
    }

    // Close modal and reset
    setShowSPCRoofAccessModal(false);
    setRoofAccessIssues(null);
    setNumberOfStories('');
    setRoofstockingDelivery(null);
    setRoofAccessIssueTypes([]);
    setOtherIssueText('');
    
    console.log('✅ Added roof access labor item:', newItem);
    console.log(`Calculations: bundles=${bundles}, laborTime=${laborTime}hrs, laborCost=$${laborCost.toFixed(2)}`);
    
    // After adding roof access labor item, proceed to O&P check
    setTimeout(() => {
      const updatedItems = [...(ruleResults?.line_items || []), newItem];
      checkOPItems(updatedItems);
    }, 100);
  };

  // Add O&P item based on 20% of total RCV
  const handleAddOP = async () => {
    // Calculate 20% of total RCV (excluding O&P itself if it exists)
    const currentItems = ruleResults?.line_items || extractedLineItems;
    const totalRCV = currentItems.reduce((sum: number, item: any) => {
      // Exclude any existing O&P items from the calculation
      if (item.description && (
        item.description.toLowerCase().includes('o&p') ||
        (item.description.toLowerCase().includes('overhead') && item.description.toLowerCase().includes('profit'))
      )) {
        return sum;
      }
      return sum + (item.RCV || 0);
    }, 0);
    
    const opAmount = totalRCV * 0.20;

    // Get max line number
    const maxLineNumber = Math.max(
      ...currentItems.map((item: any) => parseInt(item.line_number) || 0),
      0
    );

    // Create new O&P line item with user prompt workflow marker
    const newItem = {
      line_number: String(maxLineNumber + 1),
      description: 'O&P',
      quantity: 1,
      unit: 'EA',
      unit_price: opAmount,
      RCV: opAmount,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: opAmount,
      location_room: 'General',
      category: 'O&P',
      page_number: Math.max(...currentItems.map((item: any) => item.page_number || 0), 1),
      user_prompt_workflow: true, // Mark as user prompt workflow addition
      user_prompt_step: 'op' // Track which step added this item
    };

    // Update only the SPC adjusted line items (rule results), NOT the original extractedLineItems
    if (ruleResults) {
      const updatedRuleResults = {
        ...ruleResults,
        line_items: [...(ruleResults.line_items || []), newItem]
      };
      setRuleResults(updatedRuleResults);
    }

    // Close modal
    setShowSPCOPModal(false);
    
    console.log('✅ Added O&P item:', newItem);
    console.log(`O&P calculated: 20% of $${totalRCV.toFixed(2)} = $${opAmount.toFixed(2)}`);
    
    // After adding O&P item, proceed to final step
    setTimeout(() => {
      setShowSPCFinalStepModal(true);
    }, 100);
  };

  // Add installation shingle item and continue workflow
  const handleAddInstallationShingle = async () => {
    if (!selectedInstallationShingle) {
      alert('Please select an installation shingle type');
      return;
    }

    if (!installationShingleQuantity) {
      alert('Please enter a quantity');
      return;
    }

    // Get unit price from Roof Master Macro
    const macroData = roofMasterMacro.get(selectedInstallationShingle);
    if (!macroData) {
      alert('Selected installation shingle type not found in Roof Master Macro');
      return;
    }

    // Get the highest line number and add 1
    const quantity = parseFloat(installationShingleQuantity);
    const maxLineNumber = Math.max(
      ...extractedLineItems.map(item => parseInt(item.line_number) || 0),
      0
    );

    // Create new line item
    const newItem: LineItem = {
      line_number: String(maxLineNumber + 1),
      description: selectedInstallationShingle,
      quantity: quantity,
      unit: macroData.unit || 'SQ',
      unit_price: macroData.unit_price,
      RCV: quantity * macroData.unit_price,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: quantity * macroData.unit_price,
      location_room: 'Roof',
      category: 'Roof',
      page_number: Math.max(...extractedLineItems.map(item => item.page_number || 0), 1)
    };
    
    // Add to line items
    const updatedItems = [...extractedLineItems, newItem];
    setExtractedLineItems(updatedItems);
    
    // Close modal and reset
    setShowInstallationShinglesModal(false);
    setSelectedInstallationShingle('');
    setInstallationShingleQuantity('');
    
    console.log('✅ Added installation shingle item:', newItem);
    
    // Mark step as completed and continue with the unified workflow
    setInstallationShinglesSkipped(true);
    if (showUnifiedWorkflow) {
      setCurrentWorkflowStep(2); // Move to next step
    }
  };

  // Check if O&P is present
  const checkOPPresent = (items: LineItem[]) => {
    return items.some(item => 
      item.description.toLowerCase().includes('o&p') || 
      item.description.toLowerCase().includes('overhead') && item.description.toLowerCase().includes('profit')
    );
  };

  // Check if ridge vent items are present (legacy function)
  const hasRidgeVentItems = (items: LineItem[]) => {
    return items.some(item => 
      ridgeVentOptions.some(option => 
        option.displayName === item.description || option.macroName === item.description
      )
    );
  };

  // Check if step flashing is present
  const checkStepFlashingPresent = (items: LineItem[]) => {
    return items.some(item => 
      item.description === 'Step flashing'
    );
  };

  // Check if valley metal is present
  const checkValleyMetalPresent = (items: LineItem[]) => {
    return items.some(item => 
      item.description === 'Valley metal' || 
      item.description === 'Valley metal - (W) profile'
    );
  };


  // Add ridge vent line item
  const handleAddRidgeVent = (items: LineItem[]) => {
    if (!selectedRidgeVent || !ridgeVentQuantity) {
      alert('Please select a ridge vent type and enter quantity');
      return;
    }

    // Find the macro name for the selected ridge vent
    const selectedOption = ridgeVentOptions.find(option => option.displayName === selectedRidgeVent);
    if (!selectedOption) {
      alert(`Ridge vent option "${selectedRidgeVent}" not found`);
      return;
    }

    const macroData = roofMasterMacro.get(selectedOption.macroName);
    if (!macroData) {
      alert(`Item "${selectedOption.macroName}" not found in Roof Master Macro`);
      return;
    }

    const quantity = parseFloat(ridgeVentQuantity);
    
    // Get max line number
    const maxLineNumber = Math.max(
      ...items.map(item => parseInt(item.line_number) || 0),
      0
    );

    const newRidgeVentItem: LineItem = {
      line_number: String(maxLineNumber + 1),
      description: selectedRidgeVent,
      quantity: quantity,
      unit_price: macroData.unit_price,
      unit: macroData.unit,
      RCV: macroData.unit_price * quantity,
      ACV: macroData.unit_price * quantity,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      location_room: 'Roof',
      category: 'Ventilation',
      page_number: Math.max(...items.map(item => item.page_number || 0), 1)
    };

    const updatedItems = [...items, newRidgeVentItem];
    setExtractedLineItems(updatedItems);

    console.log('✅ Added Ridge Vent:', newRidgeVentItem);
    
    // Reset form and close modal
    setSelectedRidgeVent('');
    setRidgeVentQuantity('');
    setShowRidgeVentModal(false);
    
    // Continue workflow
    if (showUnifiedWorkflow) {
      setCurrentWorkflowStep(3); // Move to Step Flashing check
    }
  };

  // Add kick-out diverter line item
  const handleAddKickoutDiverter = (items: LineItem[]) => {
    if (!kickoutQuantity) {
      alert('Please enter the number of kick-out diverters');
      return;
    }

    const quantity = parseFloat(kickoutQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    // Check Roof Master Macro for exact item name
    const macroData = roofMasterMacro.get('Flashing - kick-out diverter');
    if (!macroData) {
      alert('Item "Flashing - kick-out diverter" not found in Roof Master Macro');
      return;
    }

    // Get max line number
    const maxLineNumber = Math.max(
      ...items.map(item => parseInt(item.line_number) || 0),
      0
    );

    const newKickoutItem: LineItem = {
      line_number: String(maxLineNumber + 1),
      description: 'Flashing - kick-out diverter',
      quantity: quantity,
      unit_price: macroData.unit_price,
      unit: macroData.unit || 'EA',
      RCV: macroData.unit_price * quantity,
      ACV: macroData.unit_price * quantity,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      location_room: 'Roof',
      category: 'Flashing',
      page_number: Math.max(...items.map(item => item.page_number || 0), 1)
    };

    const updatedItems = [...items, newKickoutItem];
    setExtractedLineItems(updatedItems);

    console.log('✅ Added Kick-out Diverter:', newKickoutItem);
    
    // Reset form
    setKickoutQuantity('');
    setGuttersPresent(null);
    
    // Continue workflow
    if (showUnifiedWorkflow) {
      setCurrentWorkflowStep(4); // Move to Shingle Depreciation step
    }
  };

  // Add depreciation contest line item
  const handleAddDepreciationContest = (items: LineItem[]) => {
    if (!shingleAge) {
      alert('Please enter the shingle age');
      return;
    }

    const age = parseFloat(shingleAge);
    if (isNaN(age) || age < 0) {
      alert('Please enter a valid shingle age');
      return;
    }

    // Get max line number
    const maxLineNumber = Math.max(
      ...items.map(item => parseInt(item.line_number) || 0),
      0
    );

    const depreciationNarrative = `Shingles are ${shingleAge} years old - contesting depreciation calculation`;

    const newDepreciationItem: LineItem = {
      line_number: String(maxLineNumber + 1),
      description: 'Contest Depreciation - narrative',
      quantity: 1,
      unit_price: 0,
      unit: 'EA',
      RCV: 0,
      ACV: 0,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      location_room: 'General',
      category: 'Depreciation',
      page_number: Math.max(...items.map(item => item.page_number || 0), 1),
      narrative: depreciationNarrative
    };

    const updatedItems = [...items, newDepreciationItem];
    setExtractedLineItems(updatedItems);

    console.log('✅ Added Depreciation Contest:', newDepreciationItem);
    console.log('Narrative:', depreciationNarrative);
    
    // Reset form
    setShingleAge('');
    setContestShingleDepreciation(null);
    
    // Continue workflow
    if (showUnifiedWorkflow) {
      setCurrentWorkflowStep(5); // Move to Valley Metal step
    }
  };

  // Add valley metal line item
  const handleAddValleyMetal = (items: LineItem[]) => {
    if (!valleyType) {
      alert('Please select valley type (open or closed)');
      return;
    }

    // Get Total Valleys Length from extractedRoofMeasurements
    const totalValleysLength = extractedRoofMeasurements["Total Valleys Length"];
    const valleyLengthValue = totalValleysLength?.value || (typeof totalValleysLength === 'number' ? totalValleysLength : 0);

    if (valleyLengthValue <= 0) {
      alert('No valley length found - cannot add valley item');
      return;
    }

    let itemDescription = '';
    let quantity = 0;
    let macroData = null;

    if (valleyType === 'open') {
      itemDescription = 'Valley metal';
      quantity = valleyLengthValue / 100;
      macroData = roofMasterMacro.get('Valley metal');
    } else if (valleyType === 'closed') {
      itemDescription = 'Ice & water barrier';
      quantity = (valleyLengthValue * 3) / 100;
      macroData = roofMasterMacro.get('Ice & water barrier');
    }

    if (!macroData) {
      alert(`Item "${itemDescription}" not found in Roof Master Macro`);
      return;
    }

    // Get max line number
    const maxLineNumber = Math.max(
      ...items.map(item => parseInt(item.line_number) || 0),
      0
    );

    const newValleyItem: LineItem = {
      line_number: String(maxLineNumber + 1),
      description: itemDescription,
      quantity: quantity,
      unit_price: macroData.unit_price,
      unit: macroData.unit || (valleyType === 'open' ? 'LF' : 'SF'),
      RCV: macroData.unit_price * quantity,
      ACV: macroData.unit_price * quantity,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      location_room: 'Roof',
      category: 'Flashing',
      page_number: Math.max(...items.map(item => item.page_number || 0), 1)
    };

    const updatedItems = [...items, newValleyItem];
    setExtractedLineItems(updatedItems);

    console.log('✅ Added Valley Item:', newValleyItem);
    console.log(`Valley Type: ${valleyType}, Length: ${valleyLengthValue}ft, Quantity: ${quantity}`);
    
    // Reset form
    setValleyType(null);
    
    // Continue workflow
    if (showUnifiedWorkflow) {
      setCurrentWorkflowStep(6); // Move to O&P step
    }
  };


  // Unified Workflow Steps - All 13+ steps from original workflow
  const workflowSteps = [
    {
      id: 'shingle-removal',
      title: 'Shingle Removal Check',
      description: 'Checking for shingle removal line items'
    },
    {
      id: 'installation-shingles',
      title: 'Installation Shingles Check', 
      description: 'Checking for installation shingle line items'
    },
    {
      id: 'ridge-vents',
      title: 'Ridge Vent Check',
      description: 'Checking for ridge vent line items'
    },
    {
      id: 'step-flashing',
      title: 'Step Flashing Check',
      description: 'Checking for step flashing and kick-out diverter requirements'
    },
    {
      id: 'shingle-depreciation',
      title: 'Shingle Depreciation Contest',
      description: 'Contest shingle depreciation based on age'
    },
    {
      id: 'valley-metal',
      title: 'Valley Metal Check',
      description: 'Checking for valley metal requirements'
    },
    {
      id: 'oandp',
      title: 'O&P Check',
      description: 'Checking for overhead and profit line items'
    },
    {
      id: 'chimney-analysis',
      title: 'Chimney Analysis',
      description: 'Analyzing chimney presence and flashing requirements'
    },
    {
      id: 'additional-layers',
      title: 'Additional Shingle Layers',
      description: 'Checking for additional shingle layers'
    },
    {
      id: 'stories-analysis',
      title: 'Building Stories Analysis',
      description: 'Determining number of building stories'
    },
    {
      id: 'permit-analysis',
      title: 'Permit Requirements',
      description: 'Checking for missing permits'
    },
    {
      id: 'depreciation-contest',
      title: 'Depreciation Contest',
      description: 'Contesting depreciation calculations'
    },
    {
      id: 'hidden-damages',
      title: 'Hidden Damages',
      description: 'Accounting for hidden damages'
    },
    {
      id: 'spaced-decking',
      title: 'Spaced Decking',
      description: 'Checking for spaced decking requirements'
    },
    {
      id: 'roof-access',
      title: 'Roof Access Issues',
      description: 'Identifying roof access problems'
    },
    {
      id: 'skylights-roof-windows',
      title: 'Skylights/Roof Windows',
      description: 'Analyzing skylights and roof windows'
    },
    {
      id: 'valley-metal',
      title: 'Valley Metal Analysis',
      description: 'Checking valley metal requirements'
    },
    {
      id: 'labor-calculation',
      title: 'Labor Calculation',
      description: 'Calculating labor requirements'
    }
  ];


  // Handle price and quantity editing
  const handlePriceEdit = (item: any) => {
    setEditingPriceItem(item);
    setPriceJustification({
      unit_price: item.unit_price || 0,
      quantity: item.quantity || 0,
      justification_text: ''
    });
    setShowPriceEditModal(true);
  };

  const handlePriceSave = () => {
    if (!priceJustification.justification_text.trim()) {
      alert('Please provide justification text for the changes.');
      return;
    }

    if (!editingPriceItem) return;

    // Check if any changes were made
    const priceChanged = priceJustification.unit_price !== (editingPriceItem.unit_price || 0);
    const quantityChanged = priceJustification.quantity !== (editingPriceItem.quantity || 0);
    
    if (!priceChanged && !quantityChanged) {
      alert('No changes detected. Please modify either the quantity or unit price.');
      return;
    }

    // Build narrative based on what changed
    const changes = [];
    if (priceChanged) changes.push('unit_price');
    if (quantityChanged) changes.push('quantity');
    
    const narrative = `Field Changed: ${changes.join(', ')} |Explanation: ${priceJustification.justification_text}`;

    // Update the line item with new values
    setExtractedLineItems(prev => prev.map(item => 
      item.line_number === editingPriceItem.line_number 
        ? { 
            ...item, 
            unit_price: priceJustification.unit_price,
            quantity: priceJustification.quantity,
            RCV: priceJustification.unit_price * priceJustification.quantity,
            ACV: priceJustification.unit_price * priceJustification.quantity * (1 - (item.dep_percent || 0) / 100),
            narrative: narrative
          }
        : item
    ));
    
    setShowPriceEditModal(false);
    setEditingPriceItem(null);
    setPriceJustification({ unit_price: 0, quantity: 0, justification_text: '' });
  };

  const handlePriceCancel = () => {
    setShowPriceEditModal(false);
    setEditingPriceItem(null);
    setPriceJustification({ unit_price: 0, quantity: 0, justification_text: '' });
  };

  // Handle delete line item
  const handleDeleteLineItem = (item: any) => {
    if (!confirm(`Are you sure you want to delete "${item.description}"?`)) {
      return;
    }

    // Remove from the appropriate list
    if (ruleResults) {
      const updatedItems = ruleResults.line_items.filter((i: any) => i.line_number !== item.line_number);
      setRuleResults({
        ...ruleResults,
        line_items: updatedItems
      });
    } else {
      const updatedItems = extractedLineItems.filter(i => i.line_number !== item.line_number);
      setExtractedLineItems(updatedItems);
    }

    console.log('✅ Deleted line item:', item.description);
  };

  // Handle replace line item
  const handleReplaceItem = (item: any) => {
    setReplacingItem(item);
    setSelectedReplacementItem('');
    setShowReplaceModal(true);
  };

  const handleReplaceConfirm = () => {
    if (!selectedReplacementItem) {
      alert('Please select a replacement item');
      return;
    }

    const macroData = roofMasterMacro.get(selectedReplacementItem);
    if (!macroData) {
      alert(`Item "${selectedReplacementItem}" not found in Roof Master Macro`);
      return;
    }

    // Update the item
    const updatedItem = {
      ...replacingItem,
      description: selectedReplacementItem,
      unit_price: macroData.unit_price,
      unit: macroData.unit,
      RCV: macroData.unit_price * replacingItem.quantity,
      ACV: macroData.unit_price * replacingItem.quantity
    };

    // Update in the appropriate list
    if (ruleResults) {
      const updatedItems = ruleResults.line_items.map((i: any) => 
        i.line_number === replacingItem.line_number ? updatedItem : i
      );
      setRuleResults({
        ...ruleResults,
        line_items: updatedItems
      });
    } else {
      const updatedItems = extractedLineItems.map(i => 
        i.line_number === replacingItem.line_number ? updatedItem : i
      );
      setExtractedLineItems(updatedItems);
    }

    console.log('✅ Replaced line item:', replacingItem.description, '→', selectedReplacementItem);
    
    setShowReplaceModal(false);
    setReplacingItem(null);
    setSelectedReplacementItem('');
  };

  const handleReplaceCancel = () => {
    setShowReplaceModal(false);
    setReplacingItem(null);
    setSelectedReplacementItem('');
  };

  // Handle add new line item
  const handleAddNewLineItem = () => {
    if (!newLineItem.description) {
      alert('Please select an item description');
      return;
    }

    if (newLineItem.quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const macroData = roofMasterMacro.get(newLineItem.description);
    if (!macroData) {
      alert(`Item "${newLineItem.description}" not found in Roof Master Macro`);
      return;
    }

    const currentItems = ruleResults?.line_items || extractedLineItems;
    const maxLineNumber = Math.max(
      ...currentItems.map((item: any) => parseInt(item.line_number) || 0),
      0
    );

    const newItem = {
      line_number: String(maxLineNumber + 1),
      description: newLineItem.description,
      quantity: newLineItem.quantity,
      unit: macroData.unit,
      unit_price: macroData.unit_price,
      RCV: macroData.unit_price * newLineItem.quantity,
      age_life: '0/NA',
      condition: 'Avg.',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: macroData.unit_price * newLineItem.quantity,
      location_room: 'Roof',
      category: 'Manual Addition',
      page_number: Math.max(...currentItems.map((item: any) => item.page_number || 0), 1)
    };

    if (ruleResults) {
      setRuleResults({
        ...ruleResults,
        line_items: [...ruleResults.line_items, newItem]
      });
    } else {
      setExtractedLineItems([...extractedLineItems, newItem]);
    }

    console.log('✅ Added new line item:', newItem);

    setShowAddLineItemModal(false);
    setNewLineItem({ description: '', quantity: 0, unit: 'EA' });
  };

  // Generate PDF export
  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // Get current date for filename
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
      
      // Create PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add SPC branding header
      pdf.setFillColor(59, 130, 246); // Blue background
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      // SPC Logo/Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Smart Property Claims', 15, 15);
      
      // Subtitle
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Insurance Claim Estimate', 15, 20);
      
      // Date and claim info
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text(`Generated: ${currentDate}`, pageWidth - 50, 15);
      
      // Add line items table
      const lineItems = ruleResults?.line_items || extractedLineItems;
      let yPosition = 40;
      
      // Table headers
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Line', 15, yPosition);
      pdf.text('Description', 30, yPosition);
      pdf.text('Qty', 120, yPosition);
      pdf.text('Unit', 135, yPosition);
      pdf.text('Unit Price', 150, yPosition);
      pdf.text('RCV', 175, yPosition);
      
      yPosition += 5;
      
      // Draw header line
      pdf.line(15, yPosition, pageWidth - 15, yPosition);
      yPosition += 5;
      
      // Add line items
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      
      let totalRCV = 0;
      
      lineItems.forEach((item: any) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(item.line_number || '-', 15, yPosition);
        pdf.text(item.description.substring(0, 50), 30, yPosition);
        pdf.text((item.quantity || 0).toFixed(2), 120, yPosition);
        pdf.text(item.unit || '', 135, yPosition);
        pdf.text(`$${(item.unit_price || 0).toFixed(2)}`, 150, yPosition);
        pdf.text(`$${(item.RCV || 0).toFixed(2)}`, 175, yPosition);
        
        totalRCV += item.RCV || 0;
        yPosition += 5;
      });
      
      // Add totals
      yPosition += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(`Total RCV: $${totalRCV.toFixed(2)}`, pageWidth - 50, yPosition);
      
      // Add narratives section if available
      const narrativesWithLineNumbers = lineItems
        .map((item: any) => {
          const auditEntry = ruleResults?.audit_log?.find((log: any) => 
            String(log.line_number) === String(item.line_number) ||
            log.description === item.description
          );
          
          let narrative = null;
          if (item.narrative) {
            narrative = item.narrative;
          } else if (item.user_prompt_workflow) {
            narrative = `Added by user during ${item.user_prompt_step} step of the SPC workflow`;
          } else if (auditEntry) {
            if (auditEntry.rule_applied) {
              narrative = `Rule: ${auditEntry.rule_applied} |Field Changed: ${auditEntry.field} |Explanation: ${auditEntry.explanation}`;
            } else {
              narrative = `Field Changed: ${auditEntry.field} |Explanation: ${auditEntry.explanation}`;
            }
          }
          
          return {
            lineNumber: item.line_number,
            narrative: narrative
          };
        })
        .filter((item: any) => item.narrative);
      
      if (narrativesWithLineNumbers.length > 0) {
        yPosition += 20;
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('Estimate Notes & Narratives', 15, yPosition);
        yPosition += 10;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        
        narrativesWithLineNumbers.forEach((item: any) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          
          const narrativeText = `Line ${item.lineNumber}: ${item.narrative}`;
          const lines = pdf.splitTextToSize(narrativeText, pageWidth - 30);
          pdf.text(lines, 15, yPosition);
          yPosition += lines.length * 4 + 2;
        });
      }
      
      // Add footer
      const footerY = pageHeight - 10;
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('Generated by Smart Property Claims', pageWidth / 2, footerY, { align: 'center' });
      
      // Save PDF
      const fileName = `SPC_Claim_Estimate_${currentDate}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ PDF generated successfully:', fileName);
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading extracted claim data...</p>
        </div>
      </div>
    );
  }

  if (extractedLineItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-yellow-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Claim Data Available</h1>
            <p className="text-gray-600 mb-6">Please upload and process insurance claim documents first.</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-sm font-medium transition-colors"
            >
              Go to Upload Page
            </button>
          </div>

          {/* Debug Information Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🔍 Debug Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Debug Info */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">System Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">LocalStorage Data:</span>
                    <span className={debugInfo?.hasStoredData ? 'text-green-600' : 'text-red-600'}>
                      {debugInfo?.hasStoredData ? 'Found' : 'Not Found'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data Size:</span>
                    <span className="text-gray-900">{debugInfo?.storedDataLength || 0} bytes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check Time:</span>
                    <span className="text-gray-900">{debugInfo?.timestamp ? new Date(debugInfo.timestamp).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Claim Agent Response:</span>
                    <span className={debugInfo?.hasClaimAgentResponse ? 'text-green-600' : 'text-red-600'}>
                      {debugInfo?.hasClaimAgentResponse ? 'Found' : 'Not Found'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Line Items Count:</span>
                    <span className="text-gray-900">{debugInfo?.extractedLineItemsCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Error Details */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Error Details</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  {errorDetails ? (
                    <p className="text-red-800 text-sm">{errorDetails}</p>
                  ) : (
                    <p className="text-gray-600 text-sm">No specific error details available</p>
                  )}
                </div>
              </div>
            </div>

            {/* LocalStorage Data Preview */}
            {localStorageData && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">LocalStorage Data Preview</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify({
                      hasClaimAgentResponse: !!localStorageData.claimAgentResponse,
                      hasRoofAgentResponse: !!localStorageData.roofAgentResponse,
                      claimAgentResponseLength: localStorageData.claimAgentResponse?.response?.length || 0,
                      roofAgentResponseLength: localStorageData.roofAgentResponse?.response?.length || 0,
                      timestamp: localStorageData.timestamp
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Malformed JSON Preview */}
            {localStorageData?.claimAgentResponse?.response && debugInfo?.claimAgentError && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">🔍 Malformed JSON Analysis</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm text-red-800 mb-2">
                    <strong>JSON Error Location:</strong> Position 1440 (line 52, column 69)
                  </div>
                  <div className="text-xs text-gray-700 bg-white border rounded p-2 max-h-40 overflow-auto">
                    <pre>{localStorageData.claimAgentResponse.response.substring(1400, 1500)}</pre>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    <strong>Full Response Length:</strong> {localStorageData.claimAgentResponse.response.length} characters
                  </div>
                </div>
              </div>
            )}

            {/* Troubleshooting Steps */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-3">🔧 Troubleshooting Steps</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ol className="text-sm text-blue-800 space-y-2">
                  <li>1. Go back to the upload page and ensure both PDF files are uploaded</li>
                  <li>2. Wait for both OCR extraction and agent processing to complete</li>
                  <li>3. Check that the "Ready - View Extracted Claim" button is enabled</li>
                  <li>4. Click the button to process and store the data</li>
                  <li>5. If issues persist, check the browser console for detailed error messages</li>
                </ol>
              </div>
            </div>

            {/* Clear Data Button */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  localStorage.removeItem('extractedClaimData');
                  window.location.reload();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
              >
                Clear Stored Data & Reload
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-lg font-medium text-gray-900">Adjusted Insurance Estimate</h1>
                <p className="text-xs text-gray-500">SPC Claims Processing System</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Upload Roof Master Macro Button */}
              <label className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                isUploadingRMM
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-500'
              }`}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleRmmUpload}
                  disabled={isUploadingRMM}
                  className="hidden"
                />
                <Upload className="inline-block w-4 h-4 mr-2" />
                {isUploadingRMM ? 'Uploading...' : 'Upload Roof Master Macro'}
              </label>
              
              <button
                onClick={runRuleEngine}
                disabled={isRunningRules || !rawAgentData}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isRunningRules || !rawAgentData
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-700 text-white hover:bg-green-800 border border-green-600'
                }`}
              >
                {isRunningRules ? 'Processing...' : 'Python Rules Engine'}
              </button>
              
              <button
                onClick={runJavaScriptRuleEngine}
                disabled={isRunningJSRules || !rawAgentData}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isRunningJSRules || !rawAgentData
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-700 text-white hover:bg-blue-800 border border-blue-600'
                }`}
              >
                {isRunningJSRules ? 'Processing...' : 'JavaScript Rules Engine'}
              </button>
              <button 
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-300 text-sm font-medium transition-all duration-200"
              >
                New Estimate
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Roof Master Macro Upload Status */}
          {rmmUploadStatus && (
            <div className={`mb-6 p-4 rounded-lg ${
              rmmUploadStatus.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {rmmUploadStatus.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  ) : (
                    <FileText className="w-5 h-5 text-red-600 mr-3" />
                  )}
                  <div>
                    <h3 className={`font-semibold ${
                      rmmUploadStatus.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {rmmUploadStatus.success ? 'Success!' : 'Upload Failed'}
                    </h3>
                    <p className={`text-sm ${
                      rmmUploadStatus.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {rmmUploadStatus.message}
                      {rmmUploadStatus.itemCount && (
                        <span className="ml-2 font-medium">
                          ({rmmUploadStatus.itemCount} items loaded)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRmmUploadStatus(null)}
                  className={`text-sm font-medium ${
                    rmmUploadStatus.success 
                      ? 'text-green-600 hover:text-green-800' 
                      : 'text-red-600 hover:text-red-800'
                  }`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Adjusted Estimate Display */}
          {adjustmentAgentResult && showAdjustedEstimate && (
            <div className="mb-8 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
              {/* Header */}
              <div className="bg-slate-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1">AI-Adjusted Estimate</h2>
                    <p className="text-gray-300 text-sm">Professional adjustments applied using advanced AI analysis</p>
                  </div>
                  <button
                    onClick={() => setShowAdjustedEstimate(false)}
                    className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                  >
                    Hide Results
                  </button>
                </div>
              </div>

              {/* Delta Summary */}
              {adjustmentAgentResult.delta && (
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Adjustment Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-full">
                          <span className="text-lg">➕</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-xl font-bold text-green-600">
                            {adjustmentAgentResult.delta.added?.length || 0}
                          </div>
                          <div className="text-xs font-medium text-gray-600">Items Added</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <span className="text-lg">✏️</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-xl font-bold text-blue-600">
                            {adjustmentAgentResult.delta.updated?.length || 0}
                          </div>
                          <div className="text-xs font-medium text-gray-600">Items Updated</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-red-500">
                      <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-full">
                          <span className="text-lg">🗑️</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-xl font-bold text-red-600">
                            {adjustmentAgentResult.delta.removed?.length || 0}
                          </div>
                          <div className="text-xs font-medium text-gray-600">Items Removed</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modified Line Items Table */}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Adjusted Line Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Line</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit Price</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">RCV</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {adjustmentAgentResult.modified_estimate?.map((item: any, index: number) => {
                        // Check if this item was added (look for matching line_number or description in delta.added)
                        const isAdded = adjustmentAgentResult.delta?.added?.some((a: any) => 
                          (a.line_number === item.line_number) || 
                          (item.line_number === null && a.description === item.description)
                        );
                        
                        // Check if this item was updated (look for matching line_number in delta.updated)
                        const updateInfo = adjustmentAgentResult.delta?.updated?.find((u: any) => 
                          String(u.line_number) === String(item.line_number)
                        );
                        
                        // Check if this item was removed
                        const isRemoved = adjustmentAgentResult.delta?.removed?.some((r: any) => 
                          String(r.line_number) === String(item.line_number)
                        );
                        
                        const rowClass = isAdded ? 'bg-green-50 border-l-4 border-green-500' : 
                                        updateInfo ? 'bg-blue-50 border-l-4 border-blue-500' : 
                                        isRemoved ? 'bg-red-50 border-l-4 border-red-500' : 
                                        'hover:bg-gray-50';
                        
                        // Get the justification note
                        let justificationNote = '';
                        if (isAdded) {
                          const addedInfo = adjustmentAgentResult.delta.added.find((a: any) => 
                            (a.line_number === item.line_number) || 
                            (item.line_number === null && a.description === item.description)
                          );
                          justificationNote = addedInfo?.note || '';
                        } else if (updateInfo) {
                          justificationNote = updateInfo.note || '';
                        }
                        
                        return (
                          <tr key={index} className={rowClass}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.line_number || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-md">
                                <div className="font-medium mb-1">{item.description}</div>
                                {isAdded && (
                                  <div className="mt-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white">
                                      ✨ NEW ITEM
                                    </span>
                                  </div>
                                )}
                                {updateInfo && (
                                  <div className="mt-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                                      🔄 MODIFIED
                                    </span>
                                  </div>
                                )}
                                {justificationNote && (
                                  <div className="mt-2 p-2 bg-yellow-50 border-l-2 border-yellow-400 rounded text-xs text-gray-700">
                                    <span className="font-semibold text-yellow-800">Reason: </span>
                                    {justificationNote}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {updateInfo?.changes?.quantity ? (
                                <div className="space-y-1">
                                  <div className="font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded inline-block">
                                    {item.quantity?.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-500 line-through">
                                    Was: {updateInfo.changes.quantity.before?.toFixed(2)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-900">{item.quantity?.toFixed(2)}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {item.unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {updateInfo?.changes?.unit_cost ? (
                                <div className="space-y-1">
                                  <div className="font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded inline-block">
                                    {formatCurrency(item.unit_price || 0)}
                                  </div>
                                  <div className="text-xs text-gray-500 line-through">
                                    Was: {formatCurrency(updateInfo.changes.unit_cost.before || 0)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-900">{formatCurrency(item.unit_price || 0)}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {updateInfo?.changes?.rcv ? (
                                <div className="space-y-1">
                                  <div className="font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded inline-block">
                                    {formatCurrency(item.RCV || 0)}
                                  </div>
                                  <div className="text-xs text-gray-500 line-through">
                                    Was: {formatCurrency(updateInfo.changes.rcv.before || 0)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-900">{formatCurrency(item.RCV || 0)}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {(isAdded || updateInfo) && updateInfo?.changes && (
                                <button 
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-xs"
                                  onClick={() => {
                                    const changesText = Object.entries(updateInfo.changes)
                                      .map(([field, change]: [string, any]) => 
                                        `${field}: ${change.before} → ${change.after}`
                                      ).join('\n');
                                    alert(`Changes to Line ${item.line_number}:\n\n${changesText}\n\nReason: ${justificationNote}`);
                                  }}
                                >
                                  View All Changes
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr className="font-bold">
                        <td colSpan={5} className="px-6 py-4 text-right text-sm text-gray-700">
                          Totals:
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-blue-50">
                          {formatCurrency(adjustmentAgentResult.modified_estimate?.reduce((sum: number, item: any) => sum + (item.RCV || 0), 0) || 0)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Legend */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Color Guide</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-green-50 border-l-4 border-green-500 rounded mr-3 mt-1"></div>
                    <div>
                      <div className="text-gray-900 font-bold">Green Row</div>
                      <div className="text-gray-600">New line item added</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-50 border-l-4 border-blue-500 rounded mr-3 mt-1"></div>
                    <div>
                      <div className="text-gray-900 font-bold">Blue Row</div>
                      <div className="text-gray-600">Item modified/updated</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded mr-3 text-xs mt-1">Value</span>
                    <div>
                      <div className="text-gray-900 font-bold">Blue Badge</div>
                      <div className="text-gray-600">Changed value</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-yellow-50 border-l-2 border-yellow-400 rounded mr-3 mt-1"></div>
                    <div>
                      <div className="text-gray-900 font-bold">Yellow Box</div>
                      <div className="text-gray-600">Justification/reason</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-gray-50 border-l-2 border-gray-400 rounded mr-3 mt-1"></div>
                    <div>
                      <div className="text-gray-900 font-bold">Gray Box</div>
                      <div className="text-gray-600">Narrative/notes</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">💡 Tip:</span> Modified values show the new value prominently with the old value crossed out below. 
                    Justifications appear directly under item descriptions for easy reference.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* RMM Adjusted Claim Display */}
          {rmmAdjustedClaim && showRmmAdjustedClaim && (
            <div className="mb-8 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
              {/* Header */}
              <div className="bg-slate-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1">RMM Unit Cost Adjusted Claim</h2>
                    <p className="text-gray-300 text-sm">Prices updated based on Roof Master Macro database</p>
                  </div>
                  <button
                    onClick={() => setShowRmmAdjustedClaim(false)}
                    className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                  >
                    Hide Results
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Adjustment Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-indigo-500">
                    <div className="flex items-center">
                      <div className="p-2 bg-indigo-100 rounded-full">
                        <span className="text-lg">📝</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-xl font-bold text-indigo-600">
                          {rmmAdjustedClaim.updated_line_items?.length || 0}
                        </div>
                        <div className="text-xs font-medium text-gray-600">Total Line Items</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <span className="text-lg">✏️</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-xl font-bold text-purple-600">
                          {rmmAdjustedClaim.audit_log?.length || 0}
                        </div>
                        <div className="text-xs font-medium text-gray-600">Items Modified</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-pink-500">
                    <div className="flex items-center">
                      <div className="p-2 bg-pink-100 rounded-full">
                        <span className="text-lg">💎</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-xl font-bold text-pink-600">
                          {formatCurrency(rmmAdjustedClaim.updated_line_items?.reduce((sum: number, item: any) => sum + (item.RCV || 0), 0) || 0)}
                        </div>
                        <div className="text-xs font-medium text-gray-600">Total RCV</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modified Line Items Table */}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Adjusted Line Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Line</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit Price</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">RCV</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {rmmAdjustedClaim.updated_line_items?.map((item: any, index: number) => {
                        // Find if this item has an audit log entry
                        const auditEntry = rmmAdjustedClaim.audit_log?.find((log: any) => 
                          String(log.line_number) === String(item.line_number)
                        );
                        
                        // Filter out changes that we don't want to apply:
                        // 1. Depreciation changes where original was 0
                        // 2. Unit price changes that result in decreases
                        const validChanges = auditEntry?.fields_changed?.filter((change: any) => {
                          if (change.field === 'depreciation_amount') {
                            return change.before > 0; // Only count if original depreciation was > 0
                          }
                          if (change.field === 'unit_price') {
                            return change.after > change.before; // Only count if unit price increased
                          }
                          return true; // Count all other changes
                        }) || [];
                        
                        const rowClass = auditEntry && validChanges.length > 0 ? 'bg-purple-50 border-l-4 border-purple-500' : 'hover:bg-gray-50';
                        
                        return (
                          <tr key={index} className={rowClass}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.line_number || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-md">
                                <div className="font-medium mb-1">{item.description}</div>
                                {auditEntry && (
                                  <>
                                    {/* Only show RMM ADJUSTED badge if fields were actually changed (excluding depreciation changes from 0) */}
                                    {validChanges.length > 0 && (
                                      <div className="mt-2 flex items-center space-x-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white">
                                          💰 RMM ADJUSTED
                                        </span>
                                      </div>
                                    )}
                                    {/* Show match information only if there was a match AND changes were made */}
                                    {auditEntry.matched && validChanges.length > 0 && (
                                      <div className="mt-2 p-3 bg-amber-50 border-l-3 border-amber-500 rounded-lg text-xs">
                                        <div className="font-semibold text-amber-900 mb-1">🏷️ Matched Roof Master Macro Item:</div>
                                        <div className="text-gray-700 mb-2 italic">"{auditEntry.matched_macro_description}"</div>
                                        <div className="text-gray-600">
                                          <strong className="text-amber-800">Action:</strong> {auditEntry.action} | 
                                          <strong className="text-amber-800 ml-2">Changes:</strong> {validChanges.length} field(s)
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.quantity?.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {item.unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {(() => {
                                const unitPriceChange = auditEntry?.fields_changed?.find((c: any) => c.field === 'unit_price');
                                
                                if (auditEntry && unitPriceChange && unitPriceChange.after > unitPriceChange.before) {
                                  // Show adjustment only if unit price increased
                                  return (
                                    <div className="space-y-1">
                                      <div className="font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded inline-block">
                                        {formatCurrency(unitPriceChange.after)}
                                      </div>
                                      <div className="text-xs text-gray-500 line-through">
                                        Was: {formatCurrency(unitPriceChange.before)}
                                      </div>
                                    </div>
                                  );
                                } else {
                                  // Show original value (either no change or decrease was ignored)
                                  const displayPrice = unitPriceChange ? unitPriceChange.before : (item.unit_price || 0);
                                  return (
                                    <span className="text-gray-900">{formatCurrency(displayPrice)}</span>
                                  );
                                }
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {(() => {
                                const unitPriceChange = auditEntry?.fields_changed?.find((c: any) => c.field === 'unit_price');
                                const rcvChange = auditEntry?.fields_changed?.find((c: any) => c.field === 'RCV');
                                
                                // Use corrected unit price for RCV calculation
                                const correctedUnitPrice = unitPriceChange && unitPriceChange.after > unitPriceChange.before 
                                  ? unitPriceChange.after 
                                  : (unitPriceChange ? unitPriceChange.before : (item.unit_price || 0));
                                
                                const correctedRCV = (item.quantity || 0) * correctedUnitPrice;
                                
                                if (auditEntry && rcvChange && unitPriceChange && unitPriceChange.after > unitPriceChange.before) {
                                  return (
                                    <div className="space-y-1">
                                      <div className="font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded inline-block">
                                        {formatCurrency(correctedRCV)}
                                      </div>
                                      <div className="text-xs text-gray-500 line-through">
                                        Was: {formatCurrency(rcvChange.before)}
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <span className="text-gray-900">{formatCurrency(correctedRCV)}</span>
                                  );
                                }
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handlePriceEdit(item)}
                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                                title="Edit unit price"
                              >
                                ✏️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr className="font-bold">
                        <td colSpan={6} className="px-6 py-4 text-right text-sm text-gray-700">
                          Totals:
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-purple-50">
                          {formatCurrency(rmmAdjustedClaim.updated_line_items?.reduce((sum: number, item: any) => {
                            const auditEntry = rmmAdjustedClaim.audit_log?.find((log: any) => 
                              String(log.line_number) === String(item.line_number)
                            );
                            const unitPriceChange = auditEntry?.fields_changed?.find((c: any) => c.field === 'unit_price');
                            
                            // Use corrected unit price for RCV calculation
                            const correctedUnitPrice = unitPriceChange && unitPriceChange.after > unitPriceChange.before 
                              ? unitPriceChange.after 
                              : (unitPriceChange ? unitPriceChange.before : (item.unit_price || 0));
                            
                            const correctedRCV = (item.quantity || 0) * correctedUnitPrice;
                            return sum + correctedRCV;
                          }, 0) || 0)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Legend */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Color Guide</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-purple-50 border-l-4 border-purple-500 rounded mr-3 mt-1"></div>
                    <div>
                      <div className="text-gray-900 font-bold">Purple Row</div>
                      <div className="text-gray-600">Price updated from Roof Master Macro</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded mr-3 text-xs mt-1">Value</span>
                    <div>
                      <div className="text-gray-900 font-bold">Purple Badge</div>
                      <div className="text-gray-600">New value from RMM database</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-amber-50 border-l-2 border-amber-400 rounded mr-3 mt-1"></div>
                    <div>
                      <div className="text-gray-900 font-bold">Amber Box</div>
                      <div className="text-gray-600">Roof Master Macro explanation</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-xs text-gray-500 line-through mr-3 mt-1">Old Value</span>
                    <div>
                      <div className="text-gray-900 font-bold">Strikethrough</div>
                      <div className="text-gray-600">Original carrier value</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-sm text-indigo-900">
                    <span className="font-semibold">💡 Tip:</span> Modified values show the new RMM database price prominently with the original carrier price crossed out below. 
                    Each adjustment includes the Roof Master Macro explanation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Claim Waste Percentage Debug Window */}
          {claimWasteResult && (
            <div className="mb-8 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-slate-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-1">Insurance Claim Waste % Calculation</h2>
                    <p className="text-gray-300 text-sm">Agent ID: 68eae51c8d106b3b3abb37f8 | Calculated from claim line items</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                    <span className="text-white font-bold text-lg">Carrier Data</span>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500">
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <span className="text-3xl">📈</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-3xl font-bold text-purple-600">
                          {claimWasteResult.carrier_waste_percentage?.toFixed(2) || 'N/A'}%
                        </div>
                        <div className="text-sm font-medium text-gray-600">Carrier Waste %</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <span className="text-3xl">🔢</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-3xl font-bold text-blue-600">
                          {claimWasteResult.waste_squares?.toFixed(2) || 'N/A'}
                        </div>
                        <div className="text-sm font-medium text-gray-600">Waste Squares</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
                    <div className="flex items-center">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <span className="text-3xl">➕</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-3xl font-bold text-green-600">
                          {claimWasteResult.numerator_sum?.toFixed(2) || 'N/A'}
                        </div>
                        <div className="text-sm font-medium text-gray-600">Numerator Sum</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-orange-500">
                    <div className="flex items-center">
                      <div className="p-3 bg-orange-100 rounded-xl">
                        <span className="text-3xl">➖</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-3xl font-bold text-orange-600">
                          {claimWasteResult.denominator_sum?.toFixed(2) || 'N/A'}
                        </div>
                        <div className="text-sm font-medium text-gray-600">Denominator Sum</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Matched Lines Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Numerator Matched Lines */}
                  <div className="border-2 border-green-200 rounded-xl overflow-hidden">
                    <div className="bg-green-50 px-6 py-4 border-b-2 border-green-200">
                      <h3 className="text-lg font-bold text-green-900">➕ Numerator Matched Lines</h3>
                      <p className="text-sm text-green-700 mt-1">
                        {claimWasteResult.numerator_matched_lines?.length || 0} lines matched
                      </p>
                    </div>
                    <div className="p-4 bg-white max-h-96 overflow-auto">
                      {claimWasteResult.numerator_matched_lines?.map((line: any, index: number) => (
                        <div key={index} className="mb-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-green-900">Line {line.line_number}</span>
                            <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold">
                              Qty: {line.quantity}
                            </span>
                          </div>
                          <div className="text-sm text-gray-800 mb-2">{line.description}</div>
                          <div className="text-xs text-gray-600">
                            <div><strong>Match Type:</strong> {line.match_type}</div>
                            <div><strong>Target:</strong> {line.match_details?.matched_target}</div>
                          </div>
                        </div>
                      ))}
                      {(!claimWasteResult.numerator_matched_lines || claimWasteResult.numerator_matched_lines.length === 0) && (
                        <div className="text-center text-gray-500 py-8">No numerator lines matched</div>
                      )}
                    </div>
                  </div>

                  {/* Denominator Matched Lines */}
                  <div className="border-2 border-orange-200 rounded-xl overflow-hidden">
                    <div className="bg-orange-50 px-6 py-4 border-b-2 border-orange-200">
                      <h3 className="text-lg font-bold text-orange-900">➖ Denominator Matched Lines</h3>
                      <p className="text-sm text-orange-700 mt-1">
                        {claimWasteResult.denominator_matched_lines?.length || 0} lines matched
                      </p>
                    </div>
                    <div className="p-4 bg-white max-h-96 overflow-auto">
                      {claimWasteResult.denominator_matched_lines?.map((line: any, index: number) => (
                        <div key={index} className="mb-4 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-orange-900">Line {line.line_number}</span>
                            <span className="px-2 py-1 bg-orange-600 text-white rounded text-xs font-bold">
                              Qty: {line.quantity}
                            </span>
                          </div>
                          <div className="text-sm text-gray-800 mb-2">{line.description}</div>
                          <div className="text-xs text-gray-600">
                            <div><strong>Match Type:</strong> {line.match_type}</div>
                            <div><strong>Target:</strong> {line.match_details?.matched_target}</div>
                          </div>
                        </div>
                      ))}
                      {(!claimWasteResult.denominator_matched_lines || claimWasteResult.denominator_matched_lines.length === 0) && (
                        <div className="text-center text-gray-500 py-8">No denominator lines matched</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Calculation Explanation */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-blue-900 mb-3">📐 Calculation Formula</h3>
                  <div className="space-y-2 text-sm text-gray-800">
                    <div className="font-mono bg-white p-3 rounded border border-blue-200">
                      Carrier Waste % = ((Numerator Sum - Denominator Sum) / Denominator Sum) × 100
                    </div>
                    <div className="font-mono bg-white p-3 rounded border border-blue-200">
                      = (({claimWasteResult.numerator_sum?.toFixed(2)} - {claimWasteResult.denominator_sum?.toFixed(2)}) / {claimWasteResult.denominator_sum?.toFixed(2)}) × 100
                    </div>
                    <div className="font-mono bg-white p-3 rounded border border-blue-200 font-bold">
                      = {claimWasteResult.carrier_waste_percentage?.toFixed(2)}%
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                      <p className="text-sm text-yellow-900">
                        <strong>Note:</strong> Waste Squares = (Numerator Sum - Denominator Sum) = {claimWasteResult.waste_squares?.toFixed(2)} SQ
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Waste Percentage Debug Window */}
          {rawAgentData?.wastePercentResponse && (
            <div className="mb-8 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-slate-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-1">Waste Percentage Calculation</h2>
                    <p className="text-gray-300 text-sm">Agent ID: 68eae0638be660f19f9164ea</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                    <span className="text-white font-bold text-lg">Debug Data</span>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {(() => {
                    // Parse the waste percentage response
                    let wasteData = null;
                    try {
                      const responseStr = rawAgentData.wastePercentResponse.response;
                      console.log('Waste percent response:', responseStr);
                      
                      // Try to extract JSON from markdown code block
                      const jsonMatch = responseStr.match(/```json\s*\n([\s\S]*?)\n```/);
                      if (jsonMatch && jsonMatch[1]) {
                        wasteData = JSON.parse(jsonMatch[1]);
                      } else {
                        // Try to find a standalone JSON object
                        const jsonObjectMatch = responseStr.match(/\{[\s\S]*?\}/);
                        if (jsonObjectMatch) {
                          wasteData = JSON.parse(jsonObjectMatch[0]);
                        } else {
                          // Try direct parse
                          wasteData = JSON.parse(responseStr);
                        }
                      }
                    } catch (e) {
                      console.error('Failed to parse waste percentage data:', e);
                    }

                    if (wasteData) {
                      return (
                        <>
                          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-orange-500">
                            <div className="flex items-center">
                              <div className="p-3 bg-orange-100 rounded-xl">
                                <span className="text-3xl">📈</span>
                              </div>
                              <div className="ml-4">
                                <div className="text-3xl font-bold text-orange-600">
                                  {wasteData.waste_percent || 'N/A'}
                                </div>
                                <div className="text-sm font-medium text-gray-600">Waste Percentage</div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
                            <div className="flex items-center">
                              <div className="p-3 bg-blue-100 rounded-xl">
                                <span className="text-3xl">📐</span>
                              </div>
                              <div className="ml-4">
                                <div className="text-3xl font-bold text-blue-600">
                                  {wasteData.area_sqft || 'N/A'} sq ft
                                </div>
                                <div className="text-sm font-medium text-gray-600">Total Area</div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
                            <div className="flex items-center">
                              <div className="p-3 bg-green-100 rounded-xl">
                                <span className="text-3xl">🔢</span>
                              </div>
                              <div className="ml-4">
                                <div className="text-3xl font-bold text-green-600">
                                  {wasteData.squares || 'N/A'}
                                </div>
                                <div className="text-sm font-medium text-gray-600">Squares</div>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Raw Response */}
                <div className="border-2 border-orange-200 rounded-xl overflow-hidden">
                  <div className="bg-orange-50 px-6 py-4 border-b-2 border-orange-200">
                    <h3 className="text-lg font-bold text-orange-900">Raw Agent Response</h3>
                  </div>
                  <div className="p-6 bg-white">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-gray-700">
                        Full Response
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(rawAgentData.wastePercentResponse?.response || '');
                          alert('Waste percentage response copied to clipboard!');
                        }}
                        className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-auto">
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                        {rawAgentData.wastePercentResponse?.response || 'No response available'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <span className="text-2xl">📄</span>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">{extractedLineItems.length}</div>
                  <div className="text-sm font-medium text-gray-600">Line Items</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-xl">
                  <span className="text-2xl">🏠</span>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">{rawAgentData ? '✓' : '✗'}</div>
                  <div className="text-sm font-medium text-gray-600">Roof Data</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {extractedLineItems.length > 0 ? formatCurrency(extractedLineItems.reduce((sum, item) => sum + (item.RCV || 0), 0)) : '$0'}
                  </div>
                  <div className="text-sm font-medium text-gray-600">Total RCV</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <span className="text-2xl">⚡</span>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">{adjustmentAgentResult ? '✓' : '○'}</div>
                  <div className="text-sm font-medium text-gray-600">AI Processed</div>
                </div>
              </div>
            </div>
          </div>

          {/* SPC Adjustment Engine Results */}
          {showRuleResults && ruleResults && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8">
              <div className="bg-gradient-to-r from-green-700 to-green-800 px-8 py-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">SPC Adjustment Engine Results</h2>
                    <p className="text-green-200">
                      Automated adjustments based on roof measurements and line items
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRuleResults(false)}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                  >
                    Hide Results
                  </button>
                </div>
              </div>

              {/* Roof Variables Used */}
              <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📏 Roof Variables Used</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white rounded p-3">
                    <div className="font-semibold text-gray-700">Total Roof Area</div>
                    <div className="text-lg font-bold text-blue-600">
                      {extractedRoofMeasurements["Total Roof Area"]?.value || 
                       extractedRoofMeasurements.totalArea || 
                       extractedRoofMeasurements.netArea || 0} sq ft
                    </div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="font-semibold text-gray-700">Total Eaves Length</div>
                    <div className="text-lg font-bold text-blue-600">
                      {extractedRoofMeasurements["Total Eaves Length"]?.value || 
                       extractedRoofMeasurements.eaveLength || 0} ft
                    </div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="font-semibold text-gray-700">Total Rakes Length</div>
                    <div className="text-lg font-bold text-blue-600">
                      {extractedRoofMeasurements["Total Rakes Length"]?.value || 
                       extractedRoofMeasurements.rakeLength || 0} ft
                    </div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="font-semibold text-gray-700">Total Ridges/Hips</div>
                    <div className="text-lg font-bold text-blue-600">
                      {extractedRoofMeasurements["Total Ridges/Hips Length"]?.value || 
                       (extractedRoofMeasurements.ridgeLength || 0) + (extractedRoofMeasurements.hipLength || 0) || 0} ft
                    </div>
                  </div>
                </div>
              </div>

              {/* All Line Items */}
              {ruleResults.line_items && ruleResults.line_items.length > 0 && (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">📋 All Line Items</h3>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={generatePDF}
                        disabled={isGeneratingPDF}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium transition-all shadow-md flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" />
                        <span>{isGeneratingPDF ? 'Generating...' : 'Export PDF'}</span>
                      </button>
                      <button
                        onClick={() => setShowAddLineItemModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium transition-all shadow-md flex items-center space-x-2"
                      >
                        <span>➕</span>
                        <span>Add New Line Item</span>
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Line</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Qty</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit Price</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">RCV</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {ruleResults.line_items.map((item: any, index: number) => {
                          // Find ALL audit log entries for this item
                          // Try matching by line number first, then by description as fallback
                          const auditEntries = ruleResults.audit_log?.filter((log: any) => 
                            String(log.line_number) === String(item.line_number) ||
                            log.description === item.description
                          ) || [];
                          
                          // For backward compatibility, keep the first audit entry as the primary one
                          const auditEntry = auditEntries[0];
                          
                          // Debug logging for Python adjustments
                          if (ruleResults.audit_log && ruleResults.audit_log.length > 0 && !auditEntry) {
                            console.log('🔍 Debug: Item not matched with audit log:', {
                              itemLineNumber: item.line_number,
                              itemDescription: item.description,
                              auditLogEntries: ruleResults.audit_log.map((log: any) => ({
                                lineNumber: log.line_number,
                                description: log.description,
                                field: log.field,
                                rule: log.rule_applied
                              }))
                            });
                          }
                          
                          // Debug logging for narratives
                          if (item.narrative) {
                            console.log('🔍 Debug: Item has narrative:', {
                              lineNumber: item.line_number,
                              description: item.description,
                              narrative: item.narrative,
                              hasAuditEntry: !!auditEntry,
                              auditEntriesCount: auditEntries.length,
                              allAuditEntries: auditEntries.map((entry: any) => ({
                                field: entry.field,
                                before: entry.before,
                                after: entry.after,
                                action: entry.action
                              })),
                              hasUserPromptWorkflow: !!item.user_prompt_workflow
                            });
                          }
                          
                          // Determine color scheme based on type of change
                          const getColorScheme = (auditEntries: any[], item: any) => {
                            // Check for user prompt workflow items first (highest priority)
                            if (item.user_prompt_workflow) {
                              const stepColors = {
                                removal: {
                                  rowClass: 'bg-red-50 border-l-4 border-red-500',
                                  badgeColor: 'bg-red-600',
                                  badgeText: '👤 USER',
                                  boxClass: 'bg-red-50 border-l-3 border-red-500',
                                  boxTitle: '👤 User Added - Removal Step:',
                                  boxTitleColor: 'text-red-900',
                                  boxTextColor: 'text-red-800'
                                },
                                installation: {
                                  rowClass: 'bg-indigo-50 border-l-4 border-indigo-500',
                                  badgeColor: 'bg-indigo-600',
                                  badgeText: '👤 USER',
                                  boxClass: 'bg-indigo-50 border-l-3 border-indigo-500',
                                  boxTitle: '👤 User Added - Installation Step:',
                                  boxTitleColor: 'text-indigo-900',
                                  boxTextColor: 'text-indigo-800'
                                },
                                ridge_vent: {
                                  rowClass: 'bg-amber-50 border-l-4 border-amber-500',
                                  badgeColor: 'bg-amber-600',
                                  badgeText: '👤 USER',
                                  boxClass: 'bg-amber-50 border-l-3 border-amber-500',
                                  boxTitle: '👤 User Added - Ridge Vent Step:',
                                  boxTitleColor: 'text-amber-900',
                                  boxTextColor: 'text-amber-800'
                                },
                                chimney_cricket: {
                                  rowClass: 'bg-cyan-50 border-l-4 border-cyan-500',
                                  badgeColor: 'bg-cyan-600',
                                  badgeText: '👤 USER',
                                  boxClass: 'bg-cyan-50 border-l-3 border-cyan-500',
                                  boxTitle: '👤 User Added - Chimney Cricket Step:',
                                  boxTitleColor: 'text-cyan-900',
                                  boxTextColor: 'text-cyan-800'
                                },
                                additional_layers: {
                                  rowClass: 'bg-emerald-50 border-l-4 border-emerald-500',
                                  badgeColor: 'bg-emerald-600',
                                  badgeText: '👤 USER',
                                  boxClass: 'bg-emerald-50 border-l-3 border-emerald-500',
                                  boxTitle: '👤 User Added - Additional Layers Step:',
                                  boxTitleColor: 'text-emerald-900',
                                  boxTextColor: 'text-emerald-800'
                                },
                                permit: {
                                  rowClass: 'bg-blue-50 border-l-4 border-blue-500',
                                  badgeColor: 'bg-blue-600',
                                  badgeText: '👤 USER',
                                  boxClass: 'bg-blue-50 border-l-3 border-blue-500',
                                  boxTitle: '👤 User Added - Permit Step:',
                                  boxTitleColor: 'text-blue-900',
                                  boxTextColor: 'text-blue-800'
                                },
                                hidden_damages: {
                                  rowClass: 'bg-gray-50 border-l-4 border-gray-500',
                                  badgeColor: 'bg-gray-600',
                                  badgeText: '👤 USER',
                                  boxClass: 'bg-gray-50 border-l-3 border-gray-500',
                                  boxTitle: '👤 User Added - Hidden Damages Step:',
                                  boxTitleColor: 'text-gray-900',
                                  boxTextColor: 'text-gray-800'
                                },
                                roof_access: {
                                  rowClass: 'bg-orange-50 border-l-4 border-orange-500',
                                  badgeColor: 'bg-orange-600',
                                  badgeText: '👤 USER',
                                  boxClass: 'bg-orange-50 border-l-3 border-orange-500',
                                  boxTitle: '👤 User Added - Roof Access Step:',
                                  boxTitleColor: 'text-orange-900',
                                  boxTextColor: 'text-orange-800'
                                },
                                op: {
                                  rowClass: 'bg-purple-50 border-l-4 border-purple-500',
                                  badgeColor: 'bg-purple-600',
                                  badgeText: '👤 USER',
                                  boxClass: 'bg-purple-50 border-l-3 border-purple-500',
                                  boxTitle: '👤 User Added - O&P Step:',
                                  boxTitleColor: 'text-purple-900',
                                  boxTextColor: 'text-purple-800'
                                }
                              };
                              return stepColors[item.user_prompt_step as keyof typeof stepColors] || stepColors.removal;
                            }
                            
                            // Check audit log entries FIRST to determine automated adjustment types
                            if (auditEntries.length > 0) {
                              const primaryEntry = auditEntries[0];
                              const field = primaryEntry.field;
                              const rule = primaryEntry.rule_applied;
                              const action = primaryEntry.action;
                              
                              // New items (added)
                              if (action === 'added' || rule.includes('Missing Line Item') || rule.includes('Added missing')) {
                                return {
                                  rowClass: 'bg-purple-50 border-l-4 border-purple-500',
                                  badgeColor: 'bg-purple-600',
                                  badgeText: '🏷️ NEW',
                                  boxClass: 'bg-purple-50 border-l-3 border-purple-500',
                                  boxTitle: '📦 New Item Added:',
                                  boxTitleColor: 'text-purple-900',
                                  boxTextColor: 'text-purple-800'
                                };
                              }
                              
                              // Quantity changes
                              if (field === 'quantity') {
                                return {
                                  rowClass: 'bg-blue-50 border-l-4 border-blue-500',
                                  badgeColor: 'bg-blue-600',
                                  badgeText: '📏 QUANTITY',
                                  boxClass: 'bg-blue-50 border-l-3 border-blue-500',
                                  boxTitle: '📏 Quantity Adjustment:',
                                  boxTitleColor: 'text-blue-900',
                                  boxTextColor: 'text-blue-800'
                                };
                              }
                              
                              // Unit price changes
                              if (field === 'unit_price') {
                                return {
                                  rowClass: 'bg-green-50 border-l-4 border-green-500',
                                  badgeColor: 'bg-green-600',
                                  badgeText: '💰 PRICE',
                                  boxClass: 'bg-green-50 border-l-3 border-green-500',
                                  boxTitle: '💰 Price Adjustment:',
                                  boxTitleColor: 'text-green-900',
                                  boxTextColor: 'text-green-800'
                                };
                              }
                              
                              // Description changes (replacements)
                              if (field === 'description' || rule.includes('Line Item Replacements') || rule.includes('REPLACED')) {
                                return {
                                  rowClass: 'bg-orange-50 border-l-4 border-orange-500',
                                  badgeColor: 'bg-orange-600',
                                  badgeText: '🔄 REPLACED',
                                  boxClass: 'bg-orange-50 border-l-3 border-orange-500',
                                  boxTitle: '🔄 Item Replacement:',
                                  boxTitleColor: 'text-orange-900',
                                  boxTextColor: 'text-orange-800'
                                };
                              }
                              
                              // Default for other automated changes
                              return {
                                rowClass: 'bg-gray-50 border-l-4 border-gray-500',
                                badgeColor: 'bg-gray-600',
                                badgeText: '🏷️ OTHER',
                                boxClass: 'bg-gray-50 border-l-3 border-gray-500',
                                boxTitle: '📏 Rule Applied:',
                                boxTitleColor: 'text-gray-900',
                                boxTextColor: 'text-gray-800'
                              };
                            }
                            
                            // Check for custom narrative LAST (only for true manual adjustments without audit entries)
                            if (item.narrative && auditEntries.length === 0) {
                              return {
                                rowClass: 'bg-yellow-50 border-l-4 border-yellow-500',
                                badgeColor: 'bg-yellow-600',
                                badgeText: '✋ MANUAL',
                                boxClass: 'bg-yellow-50 border-l-3 border-yellow-500',
                                boxTitle: '✋ Manual Adjustment:',
                                boxTitleColor: 'text-yellow-900',
                                boxTextColor: 'text-yellow-800'
                              };
                            }
                            
                            return null;
                          };
                          
                          const colorScheme = getColorScheme(auditEntries, item);
                          const rowClass = colorScheme ? colorScheme.rowClass : 'hover:bg-gray-50';
                          
                          return (
                            <tr key={index} className={rowClass}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.line_number}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="max-w-md">
                                  <div className="font-medium mb-1">{item.description}</div>
                                  {(item.location_room && item.location_room !== 'unknown' && item.category && item.category !== 'unknown') && (
                                    <div className="text-xs text-gray-500">{item.location_room} • {item.category}</div>
                                  )}
                                  {colorScheme && (
                                    <>
                                      <div className="mt-2 flex items-center space-x-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${colorScheme.badgeColor} text-white`}>
                                          {colorScheme.badgeText}
                                        </span>
                                      </div>
                                      <div className={`mt-2 p-3 ${colorScheme.boxClass} rounded-lg text-xs`}>
                                        <div className={`font-semibold ${colorScheme.boxTitleColor} mb-1`}>{colorScheme.boxTitle}</div>
                                        {item.user_prompt_workflow ? (
                                          <div className="text-gray-700 mb-2">
                                            Added by user during {item.user_prompt_step} step of the SPC workflow
                                          </div>
                                        ) : auditEntries.length > 0 ? (
                                          <div className="text-gray-700 mb-2">
                                            {auditEntries.map((entry: any, idx: any) => (
                                              <div key={idx} className="mb-1">
                                                <strong className={colorScheme.boxTextColor}>Field Changed:</strong> {entry.field} | 
                                                <strong className={colorScheme.boxTextColor}> Explanation:</strong> {entry.explanation}
                                              </div>
                                            ))}
                                          </div>
                                        ) : item.narrative ? (
                                          <div className="text-gray-700 mb-2">
                                            {item.narrative}
                                          </div>
                                        ) : (
                                          <>
                                            <div className="text-gray-700 mb-2 italic">"{auditEntry?.rule_applied}"</div>
                                        <div className="text-gray-600">
                                              <strong className={colorScheme.boxTextColor}>Field Changed:</strong> {auditEntry?.field}
                                        </div>
                                          </>
                                        )}
                                      </div>
                                    </>
                                  )}
                                  
                                  {/* Show narrative even if no highlighting */}
                                  {!colorScheme && item.narrative && (
                                    <div className="mt-2 p-3 bg-gray-50 border-l-3 border-gray-400 rounded-lg text-xs">
                                      <div className="font-semibold text-gray-900 mb-1">📝 Note:</div>
                                      <div className="text-gray-700">{item.narrative}</div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {(() => {
                                  const quantityChange = auditEntries.find((entry: any) => entry.field === 'quantity');
                                  
                                  if (quantityChange && quantityChange.before !== quantityChange.after) {
                                    return (
                                      <div className="space-y-1">
                                        <div className={`font-bold ${colorScheme?.boxTextColor || 'text-blue-700'} bg-blue-100 px-2 py-1 rounded inline-block`}>
                                          {item.quantity?.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-gray-500 line-through">
                                          Was: {quantityChange.before?.toFixed(2)}
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <span className="text-gray-900">{item.quantity?.toFixed(2)}</span>
                                    );
                                  }
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {item.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {(() => {
                                  const priceChange = auditEntries.find((entry: any) => entry.field === 'unit_price');
                                  
                                  if (priceChange && priceChange.before !== priceChange.after) {
                                    return (
                                      <div className="space-y-1">
                                        <div className={`font-bold ${colorScheme?.boxTextColor || 'text-green-700'} bg-green-100 px-2 py-1 rounded inline-block`}>
                                          {formatCurrency(priceChange.after || item.unit_price || 0)}
                                        </div>
                                        <div className="text-xs text-gray-500 line-through">
                                          Was: {formatCurrency(priceChange.before || 0)}
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <span className="text-gray-900">{formatCurrency(item.unit_price || 0)}</span>
                                    );
                                  }
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(item.RCV || 0)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handlePriceEdit(item)}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                                    title="Edit unit price"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => handleReplaceItem(item)}
                                    className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
                                    title="Replace with item from Roof Master Macro"
                                  >
                                    🔄 Replace
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLineItem(item)}
                                    className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
                                    title="Delete line item"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr className="font-bold">
                          <td colSpan={6} className="px-6 py-4 text-right text-sm text-gray-700">
                            Totals:
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-green-50">
                            {formatCurrency(ruleResults.line_items.reduce((sum: number, item: any) => sum + (item.RCV || 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Color-Coded Legend</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white mr-3 mt-1">💰 PRICE</span>
                    <div>
                      <div className="text-gray-900 font-bold">Green Highlighted Rows</div>
                      <div className="text-gray-600">Unit price adjustments</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white mr-3 mt-1">📏 QUANTITY</span>
                    <div>
                      <div className="text-gray-900 font-bold">Blue Highlighted Rows</div>
                      <div className="text-gray-600">Quantity adjustments</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white mr-3 mt-1">🆕 NEW</span>
                    <div>
                      <div className="text-gray-900 font-bold">Purple Highlighted Rows</div>
                      <div className="text-gray-600">New items added</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-600 text-white mr-3 mt-1">🔄 REPLACED</span>
                    <div>
                      <div className="text-gray-900 font-bold">Orange Highlighted Rows</div>
                      <div className="text-gray-600">Item replacements</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-600 text-white mr-3 mt-1">✏️ MANUAL</span>
                    <div>
                      <div className="text-gray-900 font-bold">Yellow Highlighted Rows</div>
                      <div className="text-gray-600">Manually adjusted items</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-600 text-white mr-3 mt-1">OTHER</span>
                    <div>
                      <div className="text-gray-900 font-bold">Gray Highlighted Rows</div>
                      <div className="text-gray-600">Other adjustments</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white mr-3 mt-1">🔄 USER</span>
                    <div>
                      <div className="text-gray-900 font-bold">Red Highlighted Rows</div>
                      <div className="text-gray-600">User added - Removal step</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white mr-3 mt-1">🔄 USER</span>
                    <div>
                      <div className="text-gray-900 font-bold">Indigo Highlighted Rows</div>
                      <div className="text-gray-600">User added - Installation step</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-600 text-white mr-3 mt-1">🔄 USER</span>
                    <div>
                      <div className="text-gray-900 font-bold">Amber Highlighted Rows</div>
                      <div className="text-gray-600">User added - Ridge vent step</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-600 text-white mr-3 mt-1">🔄 USER</span>
                    <div>
                      <div className="text-gray-900 font-bold">Cyan Highlighted Rows</div>
                      <div className="text-gray-600">User added - Chimney cricket step</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white mr-3 mt-1">🔄 USER</span>
                    <div>
                      <div className="text-gray-900 font-bold">Emerald Highlighted Rows</div>
                      <div className="text-gray-600">User added - Additional layers step</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white mr-3 mt-1">🔄 USER</span>
                    <div>
                      <div className="text-gray-900 font-bold">Blue Highlighted Rows</div>
                      <div className="text-gray-600">User added - Permit step</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-600 text-white mr-3 mt-1">🔄 USER</span>
                    <div>
                      <div className="text-gray-900 font-bold">Gray Highlighted Rows</div>
                      <div className="text-gray-600">User added - Hidden damages step</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-600 text-white mr-3 mt-1">🔄 USER</span>
                    <div>
                      <div className="text-gray-900 font-bold">Orange Highlighted Rows</div>
                      <div className="text-gray-600">User added - Roof access step</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white mr-3 mt-1">🔄 USER</span>
                    <div>
                      <div className="text-gray-900 font-bold">Purple Highlighted Rows</div>
                      <div className="text-gray-600">User added - O&P step</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">🎨 Color Coding:</span> Each type of adjustment has its own color scheme for easy identification. 
                    Modified values show prominently with original values crossed out below. Narratives and explanations appear directly under each item description.
                  </p>
                </div>
              </div>

              {/* Combined Narratives Section */}
              {ruleResults && ruleResults.line_items && (
                <div className="bg-white border-t border-gray-200 px-8 py-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Estimate Notes & Narratives</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {(() => {
                        // Collect all narratives from line items
                        const allNarratives: string[] = [];
                        
                        ruleResults.line_items.forEach((item: any) => {
                          // Find all audit entries for this item
                          const auditEntries = ruleResults.audit_log?.filter((log: any) => 
                            String(log.line_number) === String(item.line_number) ||
                            log.description === item.description
                          ) || [];
                          
                          if (auditEntries.length > 0) {
                            // Add narratives from audit entries
                            auditEntries.forEach((entry: any) => {
                              if (entry.explanation) {
                                allNarratives.push(`${item.line_number}. Field Changed: ${entry.field} | Explanation: ${entry.explanation}`);
                              }
                            });
                          } else if (item.user_prompt_workflow) {
                            // Add user workflow narratives
                            allNarratives.push(`${item.line_number}. 👤 User Added - ${item.user_prompt_step} Step: Added by user during ${item.user_prompt_step} step of the SPC workflow`);
                          } else if (item.narrative) {
                            // Add custom narratives
                            allNarratives.push(`${item.line_number}. ${item.narrative}`);
                          }
                        });
                        
                        // Join all narratives into one paragraph
                        return allNarratives.length > 0 
                          ? allNarratives.join(' ')
                          : 'No adjustments or narratives available for this estimate.';
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Debug Output */}
              {ruleResults.debug_output && (
                <div className="px-8 pb-8">
                  <button
                    onClick={() => setShowPythonDebugOutput(!showPythonDebugOutput)}
                    className="flex items-center justify-between w-full text-left mb-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <h3 className="text-xl font-bold text-gray-900">🐛 SPC Adjustment Engine Debug Output</h3>
                    <span className={`transform transition-transform duration-200 ${showPythonDebugOutput ? 'rotate-180' : 'rotate-0'}`}>
                      ▼
                    </span>
                  </button>
                  
                  {showPythonDebugOutput && (
                    <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-x-auto">
                      <div className="mb-4">
                        <span className="text-yellow-400">Execution Time:</span> {new Date(ruleResults.debug_output.execution_time).toLocaleString()}
                      </div>
                      <div className="mb-4">
                        <span className="text-yellow-400">STDOUT:</span>
                        <pre className="mt-2 whitespace-pre-wrap">{ruleResults.debug_output.stdout}</pre>
                      </div>
                      {ruleResults.debug_output.stderr && (
                        <div>
                          <span className="text-red-400">STDERR:</span>
                          <pre className="mt-2 whitespace-pre-wrap text-red-400">{ruleResults.debug_output.stderr}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Python Execution Debug Window */}
          {ruleResults && (
            <div className="px-8 pb-8">
              <button
                onClick={() => setShowPythonExecutionDebug(!showPythonExecutionDebug)}
                className="flex items-center justify-between w-full text-left mb-4 p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
              >
                <h3 className="text-xl font-bold text-red-900">🐍 Python Execution Debug Information</h3>
                <span className={`transform transition-transform duration-200 ${showPythonExecutionDebug ? 'rotate-180' : 'rotate-0'}`}>
                  ▼
                </span>
              </button>
              
              {showPythonExecutionDebug && (
                <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-x-auto">
                  <div className="mb-4">
                    <span className="text-yellow-400">🔍 Debug Information:</span>
                    <div className="mt-2 space-y-2">
                      <div>
                        <span className="text-blue-400">Python Command Detection:</span>
                        <div className="ml-4 text-gray-300">
                          • Checking for 'python3' command availability<br/>
                          • Falling back to 'python' if python3 not found<br/>
                          • Using detected command for script execution
                        </div>
                      </div>
                      <div>
                        <span className="text-blue-400">Common Issues:</span>
                        <div className="ml-4 text-gray-300">
                          • ENOENT error: Python not found in PATH<br/>
                          • Permission denied: Script file not executable<br/>
                          • Timeout: Script taking longer than 30 seconds<br/>
                          • File not found: Script or input/output files missing
                        </div>
                      </div>
                      <div>
                        <span className="text-blue-400">Amplify Environment:</span>
                        <div className="ml-4 text-gray-300">
                          • Python installed via pyenv in preBuild phase<br/>
                          • PATH exported: $HOME/.pyenv/versions/3.9.6/bin<br/>
                          • Both 'python' and 'python3' should be available<br/>
                          • Check Amplify build logs for Python installation
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <span className="text-yellow-400">📋 Mock Response Details:</span>
                    <div className="mt-2 text-gray-300">
                      When Python execution fails, the system falls back to a mock response that:
                      <div className="ml-4 mt-2">
                        • Returns original line items unchanged<br/>
                        • Adds test narratives for debugging<br/>
                        • Creates audit log entries for testing<br/>
                        • Maintains data structure consistency
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-yellow-400">🔧 Troubleshooting Steps:</span>
                    <div className="mt-2 text-gray-300">
                      <div className="ml-4 space-y-1">
                        <div>1. Check Amplify build logs for Python installation</div>
                        <div>2. Verify Python PATH is correctly set</div>
                        <div>3. Ensure roof_adjustment_engine.py exists in project root</div>
                        <div>4. Check file permissions for Python script</div>
                        <div>5. Verify input/output file creation permissions</div>
                        <div>6. Review API route console logs for specific errors</div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-yellow-400">📊 Current Status:</span>
                    <div className="mt-2">
                      <div className="text-red-400">
                        ❌ Python execution is failing - using mock response
                      </div>
                      <div className="text-gray-300 mt-2">
                        This indicates that the Python script cannot be executed in the current environment.
                        Check the Amplify build logs and console output for specific error details.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Combined Workflow Results */}
          {showCombinedResults && combinedResults && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8">
              <div className="bg-gradient-to-r from-purple-700 to-purple-800 px-8 py-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">🚀 Combined Workflow Results</h2>
                    <p className="text-purple-200">
                      RMM Unit Cost Comparator + SPC Adjustment Engine combined processing
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCombinedResults(false)}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                  >
                    Hide Results
                  </button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Processing Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white rounded p-3 border-l-4 border-blue-500">
                    <div className="font-semibold text-gray-700">RMM Adjustments</div>
                    <div className="text-lg font-bold text-blue-600">
                      {combinedResults.summary.rmm_adjustments}
                    </div>
                  </div>
                  <div className="bg-white rounded p-3 border-l-4 border-green-500">
                    <div className="font-semibold text-gray-700">Python Adjustments</div>
                    <div className="text-lg font-bold text-green-600">
                      {combinedResults.summary.python_adjustments}
                    </div>
                  </div>
                  <div className="bg-white rounded p-3 border-l-4 border-purple-500">
                    <div className="font-semibold text-gray-700">Total Adjustments</div>
                    <div className="text-lg font-bold text-purple-600">
                      {combinedResults.summary.total_adjustments}
                    </div>
                  </div>
                  <div className="bg-white rounded p-3 border-l-4 border-gray-500">
                    <div className="font-semibold text-gray-700">Final Line Items</div>
                    <div className="text-lg font-bold text-gray-600">
                      {combinedResults.final_line_items?.length || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Line Items */}
              <div className="px-8 py-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">📋 Final Adjusted Line Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RCV</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {combinedResults.final_line_items?.map((item: any, index: number) => {
                        // Find audit entries for this item from both sources
                        const rmmAuditEntry = combinedResults.rmm_results?.audit_log?.find((log: any) => 
                          String(log.line_number) === String(item.line_number) ||
                          log.description === item.description
                        );
                        const pythonAuditEntry = combinedResults.python_results?.audit_log?.find((log: any) => 
                          String(log.line_number) === String(item.line_number) ||
                          log.description === item.description
                        );
                        
                        const hasAnyAudit = rmmAuditEntry || pythonAuditEntry;
                        const rowClass = hasAnyAudit ? 'bg-gradient-to-r from-blue-50 to-green-50 border-l-4 border-purple-500' : 'hover:bg-gray-50';
                        
                        return (
                          <tr key={index} className={rowClass}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.line_number}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-md">
                                <div className="font-medium mb-1">{item.description}</div>
                                {(item.location_room && item.location_room !== 'unknown' && item.category && item.category !== 'unknown') && (
                                  <div className="text-xs text-gray-500">{item.location_room} • {item.category}</div>
                                )}
                                {hasAnyAudit && (
                                  <div className="mt-2 flex items-center space-x-2">
                                    {rmmAuditEntry && (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                                        🔧 RMM ADJUSTED
                                      </span>
                                    )}
                                    {pythonAuditEntry && (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white">
                                        SPC ADJUSTED
                                      </span>
                                    )}
                                  </div>
                                )}
                                {rmmAuditEntry && (
                                  <div className="mt-2 p-3 bg-blue-50 border-l-3 border-blue-500 rounded-lg text-xs">
                                    <div className="font-semibold text-blue-900 mb-1">🔧 RMM Adjustment:</div>
                                    <div className="text-gray-700 mb-2 italic">"{rmmAuditEntry.explanation || 'Unit price adjusted'}"</div>
                                    <div className="text-gray-600">
                                      <strong className="text-blue-800">Field Changed:</strong> {rmmAuditEntry.field || 'unit_price'}
                                    </div>
                                  </div>
                                )}
                                {pythonAuditEntry && (
                                  <div className="mt-2 p-3 bg-amber-50 border-l-3 border-amber-500 rounded-lg text-xs">
                                    <div className="font-semibold text-amber-900 mb-1">SPC Rule:</div>
                                    <div className="text-gray-700 mb-2 italic">"{pythonAuditEntry.rule_applied}"</div>
                                    <div className="text-gray-600">
                                      <strong className="text-amber-800">Field Changed:</strong> {pythonAuditEntry.field} | 
                                      <strong className="text-amber-800 ml-2">Explanation:</strong> {pythonAuditEntry.explanation}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {(() => {
                                const quantityChange = pythonAuditEntry?.field === 'quantity';
                                
                                if (pythonAuditEntry && quantityChange) {
                                  return (
                                    <div className="space-y-1">
                                      <div className="font-bold text-green-700 bg-green-100 px-2 py-1 rounded inline-block">
                                        {item.quantity?.toFixed(2)}
                                      </div>
                                      <div className="text-xs text-gray-500 line-through">
                                        Was: {pythonAuditEntry.before?.toFixed(2)}
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <span className="text-gray-900">{item.quantity?.toFixed(2)}</span>
                                  );
                                }
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {item.unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {(() => {
                                const unitPriceChange = rmmAuditEntry?.fields_changed?.find((c: any) => c.field === 'unit_price');
                                
                                if (rmmAuditEntry && unitPriceChange && unitPriceChange.after > unitPriceChange.before) {
                                  return (
                                    <div className="space-y-1">
                                      <div className="font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded inline-block">
                                        {formatCurrency(unitPriceChange.after)}
                                      </div>
                                      <div className="text-xs text-gray-500 line-through">
                                        Was: {formatCurrency(unitPriceChange.before)}
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <span className="text-gray-900">{formatCurrency(item.unit_price || 0)}</span>
                                  );
                                }
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(item.RCV || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handlePriceEdit(item)}
                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                                title="Edit unit price"
                              >
                                ✏️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Legend */}
              <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Combined Workflow Legend</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white mr-3 mt-1">🔧 RMM</span>
                    <div>
                      <div className="text-gray-900 font-bold">Blue Highlighted Items</div>
                      <div className="text-gray-600">RMM Unit Cost Comparator adjusted unit prices</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white mr-3 mt-1">SPC</span>
                    <div>
                      <div className="text-gray-900 font-bold">Green Highlighted Items</div>
                      <div className="text-gray-600">SPC Adjustment Engine adjusted quantities</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-900">
                    <span className="font-semibold">🚀 Combined Workflow:</span> This shows the final result after both RMM unit price adjustments and Python rule-based quantity adjustments have been applied to your claim.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Debug Section - Moved below Original Line Items */}
          {rawAgentData && (
            <div className="mb-8">
              <details className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <summary className="bg-slate-800 px-6 py-4 cursor-pointer hover:bg-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-1">Debug Information</h2>
                      <p className="text-gray-300 text-sm">Click to view agent outputs and combined payload</p>
                    </div>
                    <span className="text-white text-3xl">▼</span>
                  </div>
                </summary>
                
                <div className="p-8 space-y-8">
                  {/* Claim Agent Output */}
                  <div className="border-2 border-blue-200 rounded-xl overflow-hidden">
                    <div className="bg-blue-50 px-6 py-4 border-b-2 border-blue-200">
                      <h3 className="text-xl font-bold text-blue-900">📄 Insurance Claim Agent Output</h3>
                      <p className="text-sm text-blue-700 mt-1">Agent ID: 68e559ebdc57add4679b89dd</p>
                    </div>
                    <div className="p-6 bg-white">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700">
                          Response Length: {rawAgentData.claimAgentResponse?.response?.length || 0} characters
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(rawAgentData.claimAgentResponse?.response || '');
                              alert('Claim agent response copied to clipboard!');
                            }}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                          >
                            📋 Copy
                          </button>
                          <button
                            onClick={() => {
                              const blob = new Blob([rawAgentData.claimAgentResponse?.response || ''], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'claim-agent-output.json';
                              a.click();
                            }}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            💾 Download
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                        <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                          {rawAgentData.claimAgentResponse?.response || 'No response available'}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Roof Report Agent Output */}
                  <div className="border-2 border-green-200 rounded-xl overflow-hidden">
                    <div className="bg-green-50 px-6 py-4 border-b-2 border-green-200">
                      <h3 className="text-xl font-bold text-green-900">🏠 Roof Report Agent Output</h3>
                      <p className="text-sm text-green-700 mt-1">Agent ID: 68e53a30a387fd7879a96bea</p>
                    </div>
                    <div className="p-6 bg-white">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700">
                          Response Length: {rawAgentData.roofAgentResponse?.response?.length || 0} characters
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(rawAgentData.roofAgentResponse?.response || '');
                              alert('Roof agent response copied to clipboard!');
                            }}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            📋 Copy
                          </button>
                          <button
                            onClick={() => {
                              const blob = new Blob([rawAgentData.roofAgentResponse?.response || ''], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'roof-agent-output.json';
                              a.click();
                            }}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            💾 Download
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                        <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                          {rawAgentData.roofAgentResponse?.response || 'No response available'}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Waste Percentage Agent Output */}
                  {rawAgentData.wastePercentResponse && (
                    <div className="border-2 border-orange-200 rounded-xl overflow-hidden">
                      <div className="bg-orange-50 px-6 py-4 border-b-2 border-orange-200">
                        <h3 className="text-xl font-bold text-orange-900">📊 Waste Percentage Agent Output</h3>
                        <p className="text-sm text-orange-700 mt-1">Agent ID: 68eae0638be660f19f9164ea</p>
                      </div>
                      <div className="p-6 bg-white">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-semibold text-gray-700">
                            Response Length: {rawAgentData.wastePercentResponse?.response?.length || 0} characters
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(rawAgentData.wastePercentResponse?.response || '');
                                alert('Waste percentage response copied to clipboard!');
                              }}
                              className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                            >
                              📋 Copy
                            </button>
                            <button
                              onClick={() => {
                                const blob = new Blob([rawAgentData.wastePercentResponse?.response || ''], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'waste-percent-output.json';
                                a.click();
                              }}
                              className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                            >
                              💾 Download
                            </button>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                          <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                            {rawAgentData.wastePercentResponse?.response || 'No response available'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Combined Payload Preview */}
                  <div className="border-2 border-purple-200 rounded-xl overflow-hidden">
                    <div className="bg-purple-50 px-6 py-4 border-b-2 border-purple-200">
                      <h3 className="text-xl font-bold text-purple-900">🔄 Combined Payload for Adjustment Agent</h3>
                      <p className="text-sm text-purple-700 mt-1">Agent ID: 68e92ded1945df86d876afc6 | This is what gets sent to the adjustment agent</p>
                    </div>
                    <div className="p-6 bg-white">
                      <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>📌 Note:</strong> The adjustment agent receives a combined message containing both the extracted line items (from claim agent) 
                          and the parsed roof measurements (from roof report agent).
                        </p>
                      </div>
                      
                      {/* Line Items Section */}
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-lg font-bold text-gray-900">Part 1: Extracted Line Items ({extractedLineItems.length} items)</h4>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(extractedLineItems, null, 2));
                              alert('Line items JSON copied to clipboard!');
                            }}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                          >
                            📋 Copy Line Items
                          </button>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 max-h-64 overflow-auto">
                          <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                            {JSON.stringify(extractedLineItems, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* Roof Measurements Section */}
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-lg font-bold text-gray-900">Part 2: Parsed Roof Measurements</h4>
                          <button
                            onClick={() => {
                              const roofResponseStr = rawAgentData.roofAgentResponse?.response;
                              if (roofResponseStr) {
                                let roofMeasurementsObj = null;
                                try {
                                  let rawContent = roofResponseStr;
                                  try {
                                    const outerJson = JSON.parse(roofResponseStr);
                                    if (outerJson && typeof outerJson === 'object' && 'response' in outerJson) {
                                      rawContent = outerJson.response;
                                    }
                                  } catch (e) {}
                                  const markdownMatch = rawContent.match(/```json\s*\n([\s\S]*?)\n```/);
                                  if (markdownMatch && markdownMatch[1]) {
                                    roofMeasurementsObj = JSON.parse(markdownMatch[1]);
                                  } else {
                                    const jsonMatch = rawContent.match(/(\{[\s\S]*?\})/);
                                    if (jsonMatch && jsonMatch[1]) {
                                      roofMeasurementsObj = JSON.parse(jsonMatch[1]);
                                    }
                                  }
                                } catch (e) {}
                                navigator.clipboard.writeText(JSON.stringify(roofMeasurementsObj, null, 2));
                                alert('Roof measurements JSON copied to clipboard!');
                              }
                            }}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            📋 Copy Roof Data
                          </button>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 max-h-64 overflow-auto">
                          <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                            {(() => {
                              const roofResponseStr = rawAgentData.roofAgentResponse?.response;
                              if (!roofResponseStr) return 'No roof measurements available';
                              
                              let roofMeasurementsObj = null;
                              try {
                                let rawContent = roofResponseStr;
                                try {
                                  const outerJson = JSON.parse(roofResponseStr);
                                  if (outerJson && typeof outerJson === 'object' && 'response' in outerJson) {
                                    rawContent = outerJson.response;
                                  }
                                } catch (e) {}
                                
                                const markdownMatch = rawContent.match(/```json\s*\n([\s\S]*?)\n```/);
                                if (markdownMatch && markdownMatch[1]) {
                                  roofMeasurementsObj = JSON.parse(markdownMatch[1]);
                                } else {
                                  const jsonMatch = rawContent.match(/(\{[\s\S]*?\})/);
                                  if (jsonMatch && jsonMatch[1]) {
                                    roofMeasurementsObj = JSON.parse(jsonMatch[1]);
                                  }
                                }
                              } catch (e) {
                                return 'Error parsing roof measurements: ' + e;
                              }
                              
                              return roofMeasurementsObj ? JSON.stringify(roofMeasurementsObj, null, 2) : 'Could not parse roof measurements';
                            })()}
                          </pre>
                        </div>
                      </div>

                      {/* Full Combined Payload */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-lg font-bold text-gray-900">Complete Combined Payload (as sent to agent)</h4>
                          <button
                            onClick={() => {
                              const roofResponseStr = rawAgentData.roofAgentResponse?.response;
                              let roofMeasurementsObj = null;
                              try {
                                let rawContent = roofResponseStr;
                                try {
                                  const outerJson = JSON.parse(roofResponseStr);
                                  if (outerJson && typeof outerJson === 'object' && 'response' in outerJson) {
                                    rawContent = outerJson.response;
                                  }
                                } catch (e) {}
                                const markdownMatch = rawContent.match(/```json\s*\n([\s\S]*?)\n```/);
                                if (markdownMatch && markdownMatch[1]) {
                                  roofMeasurementsObj = JSON.parse(markdownMatch[1]);
                                } else {
                                  const jsonMatch = rawContent.match(/(\{[\s\S]*?\})/);
                                  if (jsonMatch && jsonMatch[1]) {
                                    roofMeasurementsObj = JSON.parse(jsonMatch[1]);
                                  }
                                }
                              } catch (e) {}
                              const combinedPayload = JSON.stringify(extractedLineItems) + '\n\n' + JSON.stringify(roofMeasurementsObj);
                              navigator.clipboard.writeText(combinedPayload);
                              alert('Combined payload copied to clipboard!');
                            }}
                            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                          >
                            📋 Copy Full Payload
                          </button>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 max-h-64 overflow-auto">
                          <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                            {(() => {
                              const roofResponseStr = rawAgentData.roofAgentResponse?.response;
                              let roofMeasurementsObj = null;
                              try {
                                let rawContent = roofResponseStr;
                                try {
                                  const outerJson = JSON.parse(roofResponseStr);
                                  if (outerJson && typeof outerJson === 'object' && 'response' in outerJson) {
                                    rawContent = outerJson.response;
                                  }
                                } catch (e) {}
                                const markdownMatch = rawContent.match(/```json\s*\n([\s\S]*?)\n```/);
                                if (markdownMatch && markdownMatch[1]) {
                                  roofMeasurementsObj = JSON.parse(markdownMatch[1]);
                                } else {
                                  const jsonMatch = rawContent.match(/(\{[\s\S]*?\})/);
                                  if (jsonMatch && jsonMatch[1]) {
                                    roofMeasurementsObj = JSON.parse(jsonMatch[1]);
                                  }
                                }
                              } catch (e) {
                                return 'Error parsing combined payload: ' + e;
                              }
                              return JSON.stringify(extractedLineItems) + '\n\n' + JSON.stringify(roofMeasurementsObj);
                            })()}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Adjustment Agent Output (if available) */}
                  {adjustmentAgentResult && (
                    <div className="border-2 border-orange-200 rounded-xl overflow-hidden">
                      <div className="bg-orange-50 px-6 py-4 border-b-2 border-orange-200">
                        <h3 className="text-xl font-bold text-orange-900">⚡ Adjustment Agent Output</h3>
                        <p className="text-sm text-orange-700 mt-1">Agent ID: 68e92ded1945df86d876afc6</p>
                      </div>
                      <div className="p-6 bg-white">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-semibold text-gray-700">
                            Modified Items: {adjustmentAgentResult.modified_estimate?.length || 0}
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(adjustmentAgentResult, null, 2));
                                alert('Adjustment result copied to clipboard!');
                              }}
                              className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                            >
                              📋 Copy
                            </button>
                            <button
                              onClick={() => {
                                const blob = new Blob([JSON.stringify(adjustmentAgentResult, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'adjustment-agent-output.json';
                                a.click();
                              }}
                              className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                            >
                              💾 Download
                            </button>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                          <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                            {JSON.stringify(adjustmentAgentResult, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* Original Line Items */}
          {extractedLineItems.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-8 py-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">📋 Original Line Items</h2>
                    <p className="text-slate-200">
                      Extracted from insurance claim PDF using AI analysis
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{extractedLineItems.length}</div>
                    <div className="text-slate-200">Items</div>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Line</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit Price</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">RCV</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {extractedLineItems.map((item, index) => {
                        const hasQuickSwitch = quickSwitchOptions[item.description];
                        const isHovered = hoveredItem === index;
                        
                        return (
                        <tr 
                          key={index} 
                          className="hover:bg-gray-50"
                          onContextMenu={(e) => handleRightClick(e, index)}
                          onMouseEnter={() => setHoveredItem(index)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.line_number}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-xs relative">
                              <div className="font-medium">{item.description}</div>
                              <div className="text-xs text-gray-500 mt-1">{item.category} • {item.location_room}</div>
                              
                              {/* Quick Switch Hover Button */}
                              {hasQuickSwitch && isHovered && (
                                <button
                                  onClick={() => handleQuickSwitch(index, quickSwitchOptions[item.description])}
                                  className="absolute -right-2 top-0 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg transition-all duration-200 flex items-center gap-1 z-10"
                                  title={`Switch to: ${quickSwitchOptions[item.description]}`}
                                >
                                  <span>🔄</span>
                                  <span>Switch</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity?.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {item.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(item.unit_price || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(item.RCV || 0)}
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr className="font-bold">
                        <td colSpan={5} className="px-6 py-4 text-right text-sm text-gray-700">
                          Totals:
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-blue-50">
                          {formatCurrency(extractedLineItems.reduce((sum, item) => sum + (item.RCV || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Unified Workflow Modal */}
          {showUnifiedWorkflow && workflowData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="bg-purple-800 px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">Unified Workflow</h2>
                      <p className="text-gray-300 text-sm">Interactive decision-making based on line item analysis</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUnifiedWorkflow(false);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Progress Indicator */}
                <div className="px-6 py-4 bg-white border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Question {currentWorkflowStep + 1} of {workflowData.totalSteps}
                    </span>
                    <div className="flex space-x-2">
                      {workflowSteps.map((_, index) => (
                        <div
                          key={index}
                          className={`w-3 h-3 rounded-full ${
                            index <= currentWorkflowStep ? 'bg-purple-600' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {currentWorkflowStep === 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {workflowData.shingleRemoval.hasShingleRemoval ? '✅ Shingle Removal Found' : '⚠️ Missing Shingle Removal Items'}
                      </h3>
                      
                      {workflowData.shingleRemoval.hasShingleRemoval ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <p className="text-gray-700 mb-3">
                            <strong>Great! Shingle removal items found in estimate:</strong>
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            {workflowData.shingleRemoval.foundItems.map((item: any, index: number) => (
                              <li key={index} className="text-gray-700 font-medium">
                                {item.description}
                              </li>
                            ))}
                          </ul>
                          <p className="text-gray-600 text-sm mt-3">
                            This step is not needed. Click "Next" to continue with the workflow.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                          <p className="text-gray-700 mb-4">
                            No shingle removal items found in the estimate. Please select one of the following options and enter the quantity:
                          </p>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Shingle Removal Type *
                              </label>
                              <select
                                value={selectedShingleRemoval}
                                onChange={(e) => setSelectedShingleRemoval(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                              >
                                <option value="">-- Select a type --</option>
                                {shingleRemovalOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity (SQ) *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={shingleRemovalQuantity}
                                onChange={(e) => setShingleRemovalQuantity(e.target.value)}
                                placeholder="Enter quantity"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                              />
                            </div>

                            {selectedShingleRemoval && shingleRemovalQuantity && roofMasterMacro.get(selectedShingleRemoval) && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-2">Preview</h4>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <div className="text-gray-600">Unit Price:</div>
                                    <div className="font-semibold">
                                      ${roofMasterMacro.get(selectedShingleRemoval).unit_price.toFixed(2)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600">Quantity:</div>
                                    <div className="font-semibold">{shingleRemovalQuantity} SQ</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600">Total RCV:</div>
                                    <div className="font-semibold text-blue-700">
                                      ${(roofMasterMacro.get(selectedShingleRemoval).unit_price * parseFloat(shingleRemovalQuantity)).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {currentWorkflowStep === 1 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {workflowData.installationShingles.hasInstallationShingles ? '✅ Installation Shingles Found' : '⚠️ Missing Installation Shingles'}
                      </h3>
                      
                      {workflowData.installationShingles.hasInstallationShingles ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <p className="text-gray-700 mb-3">
                            <strong>Great! Installation shingle items found in estimate:</strong>
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            {workflowData.installationShingles.foundItems.map((item: any, index: number) => (
                              <li key={index} className="text-gray-700 font-medium">
                                {item.description}
                              </li>
                            ))}
                          </ul>
                          <p className="text-gray-600 text-sm mt-3">
                            This step is not needed. Click "Next" to continue with the workflow.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                          <p className="text-gray-700 mb-4">
                            No installation shingle items found in the estimate. Please select one of the following options and enter the quantity:
                          </p>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Installation Shingle Type *
                              </label>
                              <select
                                value={selectedInstallationShingle}
                                onChange={(e) => setSelectedInstallationShingle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                              >
                                <option value="">-- Select a type --</option>
                                {installationShingleOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity (SQ) *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={installationShingleQuantity}
                                onChange={(e) => setInstallationShingleQuantity(e.target.value)}
                                placeholder="Enter quantity"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                              />
                            </div>

                            {selectedInstallationShingle && installationShingleQuantity && roofMasterMacro.get(selectedInstallationShingle) && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-2">Preview</h4>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <div className="text-gray-600">Unit Price:</div>
                                    <div className="font-semibold">
                                      ${roofMasterMacro.get(selectedInstallationShingle).unit_price.toFixed(2)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600">Quantity:</div>
                                    <div className="font-semibold">{installationShingleQuantity} SQ</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600">Total RCV:</div>
                                    <div className="font-semibold text-blue-700">
                                      ${(roofMasterMacro.get(selectedInstallationShingle).unit_price * parseFloat(installationShingleQuantity)).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {currentWorkflowStep === 2 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {workflowData.hasRidgeVent ? '✅ Ridge Vent Found' : '⚠️ Missing Ridge Vent'}
                      </h3>
                      
                      {workflowData.hasRidgeVent ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <p className="text-gray-700 mb-3">
                            <strong>Great! Ridge vent items found in estimate.</strong>
                          </p>
                          <p className="text-gray-600 text-sm mt-3">
                            This step is not needed. Click "Next" to continue with the workflow.
                          </p>
                        </div>
                      ) : workflowData.ridgeLength > 0 ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                          <p className="text-gray-700 mb-4">
                            Neither "Continuous ridge vent shingle-over style" nor "Continuous ridge vent aluminum" is present, but ridges were detected ({workflowData.ridgeLength} ft). Please select a ridge vent type:
                          </p>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Ridge Vent Type *
                              </label>
                              <select
                                value={selectedRidgeVent}
                                onChange={(e) => setSelectedRidgeVent(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                              >
                                <option value="">-- Select a type --</option>
                                {ridgeVentOptions.map((option) => (
                                  <option key={option.macroName} value={option.displayName}>
                                    {option.displayName}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity (LF) *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={ridgeVentQuantity}
                                onChange={(e) => setRidgeVentQuantity(e.target.value)}
                                placeholder="Enter quantity"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                              />
                            </div>

                            {selectedRidgeVent && ridgeVentQuantity && (() => {
                              const selectedOption = ridgeVentOptions.find(option => option.displayName === selectedRidgeVent);
                              const macroData = selectedOption ? roofMasterMacro.get(selectedOption.macroName) : null;
                              return macroData ? (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <h4 className="font-semibold text-gray-900 mb-2">Preview</h4>
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <div className="text-gray-600">Unit Price:</div>
                                      <div className="font-semibold">
                                        ${macroData.unit_price.toFixed(2)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-gray-600">Quantity:</div>
                                      <div className="font-semibold">{ridgeVentQuantity} LF</div>
                                    </div>
                                    <div>
                                      <div className="text-gray-600">Total RCV:</div>
                                      <div className="font-semibold text-blue-700">
                                        ${(macroData.unit_price * parseFloat(ridgeVentQuantity)).toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                          <p className="text-gray-700">
                            No ridge length detected. Ridge vent is not needed for this estimate.
                          </p>
                          <p className="text-gray-600 text-sm mt-3">
                            Click "Next" to continue with the workflow.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {currentWorkflowStep === 3 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Step Flashing Check
                      </h3>
                      
                      {(() => {
                        const hasStepFlashing = checkStepFlashingPresent(workflowData.lineItems);
                        
                        if (!hasStepFlashing) {
                          return (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                              <p className="text-gray-700">
                                <strong>No step flashing present, proceed to next step in workflow.</strong>
                              </p>
                              <p className="text-gray-600 text-sm mt-3">
                                Click "Next" to continue.
                              </p>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                            <p className="text-gray-700 mb-4">
                              <strong>Step flashing is present in the estimate.</strong>
                            </p>
                            
                            {guttersPresent === null ? (
                              <div className="space-y-4">
                                <p className="text-gray-700">
                                  Are gutters also present?
                                </p>
                                <div className="flex space-x-4">
                                  <button
                                    onClick={() => setGuttersPresent(true)}
                                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-md"
                                  >
                                    Yes, Gutters Present
                                  </button>
                                  <button
                                    onClick={() => {
                                      setGuttersPresent(false);
                                      setCurrentWorkflowStep(4);
                                    }}
                                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors shadow-md"
                                  >
                                    No, No Gutters
                                  </button>
                                </div>
                              </div>
                            ) : guttersPresent ? (
                              <div className="space-y-4">
                                <p className="text-gray-700 mb-2">
                                  Please add "Flashing - kick-out diverter":
                                </p>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Number of Kick-out Diverters *
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={kickoutQuantity}
                                    onChange={(e) => setKickoutQuantity(e.target.value)}
                                    placeholder="Enter quantity"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                                  />
                                </div>

                                {kickoutQuantity && roofMasterMacro.get('Flashing - kick-out diverter') && (
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-gray-900 mb-2">Preview</h4>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <div className="text-gray-600">Unit Price:</div>
                                        <div className="font-semibold">
                                          ${roofMasterMacro.get('Flashing - kick-out diverter')!.unit_price.toFixed(2)}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-gray-600">Quantity:</div>
                                        <div className="font-semibold">{kickoutQuantity} EA</div>
                                      </div>
                                      <div>
                                        <div className="text-gray-600">Total RCV:</div>
                                        <div className="font-semibold text-blue-700">
                                          ${(roofMasterMacro.get('Flashing - kick-out diverter')!.unit_price * parseFloat(kickoutQuantity)).toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="flex justify-center mt-4">
                                  <button
                                    onClick={() => {
                                      if (kickoutQuantity) {
                                        handleAddKickoutDiverter(workflowData.lineItems);
                                      } else {
                                        alert('Please enter the number of kick-out diverters');
                                      }
                                    }}
                                    disabled={!kickoutQuantity}
                                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                                  >
                                    Add Kick-out Diverter
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {currentWorkflowStep === 4 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Shingle Depreciation Contest
                      </h3>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-4">
                          Do you want to contest the shingle depreciation?
                        </p>
                        
                        {contestShingleDepreciation === null ? (
                          <div className="flex space-x-4">
                            <button
                              onClick={() => setContestShingleDepreciation(true)}
                              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md"
                            >
                              Yes, Contest Depreciation
                            </button>
                            <button
                              onClick={() => {
                                setContestShingleDepreciation(false);
                                setCurrentWorkflowStep(5);
                              }}
                              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors shadow-md"
                            >
                              No, Skip (Optional)
                            </button>
                          </div>
                        ) : contestShingleDepreciation ? (
                          <div className="space-y-4">
                            <p className="text-gray-700 mb-2">
                              Please enter the shingle age in years:
                            </p>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Shingle Age (Years) *
                              </label>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                max="50"
                                value={shingleAge}
                                onChange={(e) => setShingleAge(e.target.value)}
                                placeholder="Enter age in years"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                              />
                            </div>

                            {shingleAge && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-2">Line Item Preview</h4>
                                <div className="text-sm space-y-2">
                                  <div className="text-gray-700">
                                    <span className="font-semibold">Description:</span> Contest Depreciation - narrative
                                  </div>
                                  <div className="text-gray-700">
                                    <span className="font-semibold">Note:</span> Shingles are {shingleAge} years old - contesting depreciation calculation
                                  </div>
                                  <div className="text-gray-600 mt-2 pt-2 border-t border-green-300">
                                    This line item will be added to document the depreciation contest based on the actual age of the shingles.
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex justify-center mt-4">
                              <button
                                onClick={() => {
                                  if (shingleAge) {
                                    handleAddDepreciationContest(workflowData.lineItems);
                                  } else {
                                    alert('Please enter the shingle age in years');
                                  }
                                }}
                                disabled={!shingleAge}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                Add Depreciation Contest
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {currentWorkflowStep === 5 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Valley Metal Check
                      </h3>
                      
                      {(() => {
                        const hasValleyMetal = checkValleyMetalPresent(workflowData.lineItems);
                        const totalValleysLength = extractedRoofMeasurements["Total Valleys Length"];
                        const valleyLengthValue = totalValleysLength?.value || (typeof totalValleysLength === 'number' ? totalValleysLength : 0);
                        
                        if (hasValleyMetal || valleyLengthValue === 0) {
                          return (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                              <p className="text-gray-700">
                                <strong>{hasValleyMetal ? 'Valley metal found in estimate.' : 'No valleys detected on this roof.'}</strong>
                              </p>
                              <p className="text-gray-600 text-sm mt-3">
                                Click "Next" to continue.
                              </p>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                            <p className="text-gray-700 mb-4">
                              <strong>Neither "Valley metal" nor "Valley metal - (W) profile" is present, but valleys were detected ({valleyLengthValue} ft).</strong>
                            </p>
                            
                            <div className="space-y-4">
                              <p className="text-gray-700">
                                What type of valleys are present?
                              </p>
                              
                              <div className="flex space-x-4">
                                <button
                                  onClick={() => setValleyType('open')}
                                  className={`px-6 py-3 rounded-lg font-medium transition-colors shadow-md ${
                                    valleyType === 'open'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
                                  }`}
                                >
                                  Open Valleys
                                </button>
                                <button
                                  onClick={() => setValleyType('closed')}
                                  className={`px-6 py-3 rounded-lg font-medium transition-colors shadow-md ${
                                    valleyType === 'closed'
                                      ? 'bg-green-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                                  }`}
                                >
                                  Closed Valleys
                                </button>
                              </div>

                              {valleyType && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                  <h4 className="font-semibold text-gray-900 mb-2">Line Item Preview</h4>
                                  <div className="text-sm space-y-2">
                                    {valleyType === 'open' ? (
                                      <>
                                        <div className="text-gray-700">
                                          <span className="font-semibold">Description:</span> Valley metal
                                        </div>
                                        <div className="text-gray-700">
                                          <span className="font-semibold">Quantity:</span> {(valleyLengthValue / 100).toFixed(2)} {roofMasterMacro.get('Valley metal')?.unit || 'LF'}
                                        </div>
                                        {roofMasterMacro.get('Valley metal') && (
                                          <>
                                            <div className="text-gray-700">
                                              <span className="font-semibold">Unit Price:</span> ${roofMasterMacro.get('Valley metal')!.unit_price.toFixed(2)}
                                            </div>
                                            <div className="text-gray-700">
                                              <span className="font-semibold">Total RCV:</span> ${(roofMasterMacro.get('Valley metal')!.unit_price * (valleyLengthValue / 100)).toFixed(2)}
                                            </div>
                                          </>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <div className="text-gray-700">
                                          <span className="font-semibold">Description:</span> Ice & water barrier
                                        </div>
                                        <div className="text-gray-700">
                                          <span className="font-semibold">Quantity:</span> {((valleyLengthValue * 3) / 100).toFixed(2)} {roofMasterMacro.get('Ice & water barrier')?.unit || 'SF'}
                                        </div>
                                        {roofMasterMacro.get('Ice & water barrier') && (
                                          <>
                                            <div className="text-gray-700">
                                              <span className="font-semibold">Unit Price:</span> ${roofMasterMacro.get('Ice & water barrier')!.unit_price.toFixed(2)}
                                            </div>
                                            <div className="text-gray-700">
                                              <span className="font-semibold">Total RCV:</span> ${(roofMasterMacro.get('Ice & water barrier')!.unit_price * ((valleyLengthValue * 3) / 100)).toFixed(2)}
                                            </div>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}

                              {valleyType && (
                                <div className="flex justify-center mt-4">
                                  <button
                                    onClick={() => handleAddValleyMetal(workflowData.lineItems)}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md"
                                  >
                                    Add Valley Item
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {currentWorkflowStep === 6 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {workflowData.hasOP ? '✅ O&P Found' : '⚠️ Missing O&P'}
                      </h3>
                      
                      {workflowData.hasOP ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <p className="text-gray-700 mb-3">
                            <strong>Great! O&P (Overhead & Profit) found in estimate.</strong>
                          </p>
                          <p className="text-gray-600 text-sm mt-3">
                            This step is not needed. Click "Next" to continue with the workflow.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                          <p className="text-gray-700 mb-4">
                            No O&P line item found in estimate. O&P is typically 20% of the total RCV.
                          </p>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-gray-900 mb-2">O&P Calculation</h4>
                            <div className="text-sm">
                              <div className="text-gray-600">Total RCV (excluding O&P):</div>
                              <div className="font-semibold">
                                ${workflowData.lineItems.reduce((sum: number, item: any) => sum + (item.RCV || 0), 0).toFixed(2)}
                              </div>
                              <div className="text-gray-600 mt-2">O&P Amount (20%):</div>
                              <div className="font-semibold text-blue-700">
                                ${(workflowData.lineItems.reduce((sum: number, item: any) => sum + (item.RCV || 0), 0) * 0.20).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-center">
                            <button
                              onClick={() => {
                                handleAddOP();
                                setCurrentWorkflowStep(currentWorkflowStep + 1);
                              }}
                              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md"
                            >
                              Add O&P?
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 7: Chimney Analysis */}
                  {currentWorkflowStep === 7 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Chimney Analysis Required</h3>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-4">
                          No chimney flashing items found in the estimate.
                        </p>
                        <p className="text-gray-700 mb-4">
                          Is there a chimney present on this roof?
                        </p>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                            Yes
                          </button>
                          <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors">
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 8: Additional Shingle Layers */}
                  {currentWorkflowStep === 8 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Shingle Layers</h3>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-4">
                          Are there additional layers of shingles present?
                        </p>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors">
                            Yes
                          </button>
                          <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors">
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 9: Building Stories Analysis */}
                  {currentWorkflowStep === 9 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Building Stories</h3>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-4">
                          How many stories does this building have?
                        </p>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors">
                            1
                          </button>
                          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors">
                            2
                          </button>
                          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors">
                            3+
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 10: Permit Analysis */}
                  {currentWorkflowStep === 10 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Permit Requirements</h3>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-4">
                          Is a permit missing from this estimate?
                        </p>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium transition-colors">
                            Yes
                          </button>
                          <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors">
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 11: Depreciation Contest */}
                  {currentWorkflowStep === 11 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Depreciation Contest</h3>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-4">
                          Do you want to contest the depreciation?
                        </p>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors">
                            Yes
                          </button>
                          <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors">
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 12: Hidden Damages */}
                  {currentWorkflowStep === 12 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Hidden Damages</h3>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-4">
                          Are there any hidden damages that need to be accounted for?
                        </p>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition-colors">
                            Yes
                          </button>
                          <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors">
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 11: Spaced Decking */}
                  {currentWorkflowStep === 10 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Spaced Decking</h3>
                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-4">
                          Is spaced decking present?
                        </p>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors">
                            Yes
                          </button>
                          <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors">
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 12: Roof Access Issues */}
                  {currentWorkflowStep === 11 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Roof Access Issues</h3>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-4">
                          Are there any roof access issues?
                        </p>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors">
                            Yes
                          </button>
                          <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors">
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 13: Skylights/Roof Windows */}
                  {currentWorkflowStep === 12 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Skylights/Roof Windows</h3>
                      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-4">
                          Are there skylights or roof windows present?
                        </p>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium transition-colors">
                            Yes
                          </button>
                          <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors">
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 16: Valley Metal Analysis */}
                  {currentWorkflowStep === 16 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Valley Metal Analysis</h3>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-4">
                          No valley metal items found, but valleys were detected.
                        </p>
                        <p className="text-gray-700 mb-4">
                          What type of valley construction?
                        </p>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors">
                            Open Valley
                          </button>
                          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors">
                            Closed Valley
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 17: Labor Calculation */}
                  {currentWorkflowStep === 17 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Labor Calculation</h3>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-4">
                          Labor calculation based on roof area:
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Calculations</h4>
                          <div className="text-sm space-y-2">
                            <div>
                              <span className="text-gray-600">Total Roof Area:</span>
                              <span className="font-semibold ml-2">
                                {workflowData.lineItems.reduce((sum: number, item: any) => sum + (item.RCV || 0), 0).toFixed(2)} sq ft
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Estimated Bundles:</span>
                              <span className="font-semibold ml-2">
                                {(workflowData.lineItems.reduce((sum: number, item: any) => sum + (item.RCV || 0), 0) * 3).toFixed(0)}
                              </span>
                            </div>
                            <div className="text-gray-600 text-xs mt-2">
                              Labor time will be calculated based on number of stories and bundles
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional steps beyond 15 */}
                  {currentWorkflowStep >= 15 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {workflowSteps[currentWorkflowStep]?.title || 'Additional Step'}
                      </h3>
                      <p className="text-gray-600">
                        {workflowSteps[currentWorkflowStep]?.description || 'This step is being processed.'}
                      </p>
                      <p className="text-sm text-gray-500 mt-4">
                        This step is not yet implemented in the unified workflow.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => {
                      setShowUnifiedWorkflow(false);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <div className="flex gap-3">
                    {/* Skip (Optional) Button - Available for all steps except the last one */}
                    {currentWorkflowStep < workflowData.totalSteps - 1 && (
                      <button
                        onClick={() => {
                          console.log(`⏭️ Skip (Optional)ping step ${currentWorkflowStep + 1}: ${workflowSteps[currentWorkflowStep].title}`);
                          setCurrentWorkflowStep(currentWorkflowStep + 1);
                        }}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium transition-colors"
                      >
                        Skip (Optional) Step
                      </button>
                    )}
                    
                    {currentWorkflowStep > 0 && (
                      <button
                        onClick={() => setCurrentWorkflowStep(currentWorkflowStep - 1)}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
                      >
                        ← Previous
                      </button>
                    )}
                    
                    {currentWorkflowStep < workflowData.totalSteps - 1 ? (
                      <button
                        onClick={() => {
                          // Handle adding items if needed
                          if (currentWorkflowStep === 0 && !workflowData.shingleRemoval.hasShingleRemoval && selectedShingleRemoval && shingleRemovalQuantity) {
                            handleAddShingleRemoval();
                            return;
                          }
                          if (currentWorkflowStep === 1 && !workflowData.installationShingles.hasInstallationShingles && selectedInstallationShingle && installationShingleQuantity) {
                            handleAddInstallationShingle();
                            return;
                          }
                          if (currentWorkflowStep === 2 && !workflowData.hasRidgeVent && workflowData.ridgeLength > 0 && selectedRidgeVent && ridgeVentQuantity) {
                            handleAddRidgeVent(workflowData.lineItems);
                            return;
                          }
                          // Step 3: Step Flashing check - just advance if no step flashing or if user said no gutters
                          if (currentWorkflowStep === 3) {
                            const hasStepFlashing = checkStepFlashingPresent(workflowData.lineItems);
                            if (hasStepFlashing && guttersPresent === null) {
                              // User hasn't answered gutters question yet
                              alert('Please answer whether gutters are present');
                              return;
                            }
                            if (hasStepFlashing && guttersPresent && !kickoutQuantity) {
                              // User said gutters present but hasn't entered quantity
                              alert('Please enter the number of kick-out diverters or click "Add Kick-out Diverter"');
                              return;
                            }
                          }
                          // Step 4: Shingle Depreciation - validate if user selected yes
                          if (currentWorkflowStep === 4) {
                            if (contestShingleDepreciation === null) {
                              alert('Please answer whether you want to contest shingle depreciation');
                              return;
                            }
                            if (contestShingleDepreciation && !shingleAge) {
                              alert('Please enter the shingle age in years or click "Add Depreciation Contest"');
                              return;
                            }
                            // If user wants to contest and has entered age, add the line item
                            if (contestShingleDepreciation && shingleAge) {
                              handleAddDepreciationContest(workflowData.lineItems);
                              return;
                            }
                          }
                          // Step 5: Valley Metal - validate if user selected valley type when needed
                          if (currentWorkflowStep === 5) {
                            const hasValleyMetal = checkValleyMetalPresent(workflowData.lineItems);
                            const totalValleysLength = extractedRoofMeasurements["Total Valleys Length"];
                            const valleyLengthValue = totalValleysLength?.value || (typeof totalValleysLength === 'number' ? totalValleysLength : 0);
                            
                            // Only need to validate if valleys exist and no valley metal is present
                            if (!hasValleyMetal && valleyLengthValue > 0) {
                              if (!valleyType) {
                                alert('Please select valley type (open or closed)');
                                return;
                              }
                              // If valley type is selected, add the item
                              handleAddValleyMetal(workflowData.lineItems);
                              return;
                            }
                          }
                          if (currentWorkflowStep === 6 && !workflowData.hasOP) {
                            handleAddOP();
                            return;
                          }
                          // For steps 7-17, just advance to next step
                          setCurrentWorkflowStep(currentWorkflowStep + 1);
                        }}
                        className="px-6 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 font-medium transition-colors"
                      >
                        Next →
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowUnifiedWorkflow(false);
                          // Workflow complete - no need to call continueUserPromptWorkflow
                        }}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Price Edit Modal */}
          {showPriceEditModal && editingPriceItem && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="bg-blue-800 px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">✏️ Edit Line Item</h2>
                      <p className="text-gray-300 text-sm">Line {editingPriceItem.line_number}: {editingPriceItem.description}</p>
                    </div>
                    <button
                      onClick={handlePriceCancel}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    {/* Current Values Display */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Current Price</div>
                        <div className="text-xl font-bold text-gray-900">
                          {formatCurrency(editingPriceItem.unit_price || 0)}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Current Quantity</div>
                        <div className="text-xl font-bold text-gray-900">
                          {(editingPriceItem.quantity || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* New Values Input */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Unit Price
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={priceJustification.unit_price}
                          onChange={(e) => setPriceJustification(prev => ({
                            ...prev,
                            unit_price: parseFloat(e.target.value) || 0
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Quantity
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={priceJustification.quantity}
                          onChange={(e) => setPriceJustification(prev => ({
                            ...prev,
                            quantity: parseFloat(e.target.value) || 0
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Justification Textarea */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Justification for Changes <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        placeholder="Explain why these changes are necessary..."
                        value={priceJustification.justification_text}
                        onChange={(e) => setPriceJustification(prev => ({
                          ...prev,
                          justification_text: e.target.value
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={4}
                        spellCheck={true}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        This justification will be recorded for audit purposes.
                      </div>
                    </div>

                    {/* Impact Preview */}
                    {(priceJustification.unit_price !== (editingPriceItem.unit_price || 0) || 
                      priceJustification.quantity !== (editingPriceItem.quantity || 0)) && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm font-medium text-blue-800 mb-2">Impact Preview</div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">New RCV:</div>
                            <div className="font-semibold text-blue-700">
                              {formatCurrency(priceJustification.unit_price * priceJustification.quantity)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">New ACV:</div>
                            <div className="font-semibold text-blue-700">
                              {formatCurrency(priceJustification.unit_price * priceJustification.quantity * (1 - (editingPriceItem.dep_percent || 0) / 100))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end space-x-3">
                  <button
                    onClick={handlePriceCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePriceSave}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Replace Line Item Modal */}
          {showReplaceModal && replacingItem && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                {/* Header */}
                <div className="bg-green-800 px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">🔄 Replace Line Item</h2>
                      <p className="text-gray-300 text-sm">Line {replacingItem.line_number}: {replacingItem.description}</p>
                    </div>
                    <button
                      onClick={handleReplaceCancel}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    {/* Current Item Display */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Current Item</div>
                      <div className="text-lg font-bold text-gray-900">
                        {replacingItem.description}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Qty: {replacingItem.quantity} {replacingItem.unit} @ {formatCurrency(replacingItem.unit_price)}
                      </div>
                    </div>

                    {/* Replacement Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Replacement Item from Roof Master Macro
                      </label>
                      <select
                        value={selectedReplacementItem}
                        onChange={(e) => setSelectedReplacementItem(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">-- Select an item --</option>
                        {Array.from(roofMasterMacro.keys()).sort().map((key) => (
                          <option key={key} value={key}>
                            {key}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Preview */}
                    {selectedReplacementItem && roofMasterMacro.get(selectedReplacementItem) && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="text-sm text-green-800 mb-1">New Item Preview</div>
                        <div className="text-lg font-bold text-gray-900">
                          {selectedReplacementItem}
                        </div>
                        <div className="text-sm text-gray-700 mt-2 space-y-1">
                          <div>Qty: {replacingItem.quantity} {roofMasterMacro.get(selectedReplacementItem)!.unit}</div>
                          <div>Unit Price: {formatCurrency(roofMasterMacro.get(selectedReplacementItem)!.unit_price)}</div>
                          <div>Total RCV: {formatCurrency(roofMasterMacro.get(selectedReplacementItem)!.unit_price * replacingItem.quantity)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end space-x-3">
                  <button
                    onClick={handleReplaceCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReplaceConfirm}
                    disabled={!selectedReplacementItem}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Replace Item
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add New Line Item Modal */}
          {showAddLineItemModal && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                {/* Header */}
                <div className="bg-green-800 px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">➕ Add New Line Item</h2>
                      <p className="text-gray-300 text-sm">Select item from Roof Master Macro</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAddLineItemModal(false);
                        setNewLineItem({ description: '', quantity: 0, unit: 'EA' });
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    {/* Item Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Item from Roof Master Macro *
                      </label>
                      <select
                        value={newLineItem.description}
                        onChange={(e) => setNewLineItem({ ...newLineItem, description: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">-- Select an item --</option>
                        {Array.from(roofMasterMacro.keys()).sort().map((key) => (
                          <option key={key} value={key}>
                            {key}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newLineItem.quantity || ''}
                        onChange={(e) => setNewLineItem({ ...newLineItem, quantity: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter quantity"
                      />
                    </div>

                    {/* Preview */}
                    {newLineItem.description && newLineItem.quantity > 0 && roofMasterMacro.get(newLineItem.description) && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="text-sm text-green-800 mb-1">Preview</div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <div><strong>Description:</strong> {newLineItem.description}</div>
                          <div><strong>Quantity:</strong> {newLineItem.quantity} {roofMasterMacro.get(newLineItem.description)!.unit}</div>
                          <div><strong>Unit Price:</strong> {formatCurrency(roofMasterMacro.get(newLineItem.description)!.unit_price)}</div>
                          <div><strong>Total RCV:</strong> {formatCurrency(roofMasterMacro.get(newLineItem.description)!.unit_price * newLineItem.quantity)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAddLineItemModal(false);
                      setNewLineItem({ description: '', quantity: 0, unit: 'EA' });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNewLineItem}
                    disabled={!newLineItem.description || newLineItem.quantity <= 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add Line Item
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Context Menu for Quick Switch */}
          {contextMenu && (
            <div
              className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50"
              style={{
                top: `${contextMenu.y}px`,
                left: `${contextMenu.x}px`,
              }}
            >
              <button
                onClick={() => {
                  const item = extractedLineItems[contextMenu.itemIndex];
                  const newDescription = quickSwitchOptions[item.description];
                  handleQuickSwitch(contextMenu.itemIndex, newDescription);
                }}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm flex items-center gap-2 transition-colors"
              >
                <span className="text-blue-600">🔄</span>
                <div>
                  <div className="font-medium text-gray-900">Quick Switch</div>
                  <div className="text-xs text-gray-500">
                    Switch to: {quickSwitchOptions[extractedLineItems[contextMenu.itemIndex].description]}
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Shingle Removal Modal - Hidden when using unified workflow */}
          {showShingleRemovalModal && !showUnifiedWorkflow && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className={`px-6 py-4 rounded-t-2xl ${foundShingleRemovalItems.length > 0 ? 'bg-green-600' : 'bg-orange-600'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">
                        {foundShingleRemovalItems.length > 0 ? '✅ Shingle Removal Found' : '⚠️ Shingle Removal Required'}
                      </h2>
                      <p className={`text-sm ${foundShingleRemovalItems.length > 0 ? 'text-green-100' : 'text-orange-100'}`}>
                        {foundShingleRemovalItems.length > 0 
                          ? `${foundShingleRemovalItems.length} shingle removal item(s) found in estimate`
                          : 'No shingle removal items found in estimate'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => setShowShingleRemovalModal(false)}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    {foundShingleRemovalItems.length > 0 ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-3">
                          <strong>Great! Shingle removal items found in estimate:</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {foundShingleRemovalItems.map((item, index) => (
                            <li key={index} className="text-gray-700 font-medium">
                              {item}
                            </li>
                          ))}
                        </ul>
                        <p className="text-gray-600 text-sm mt-3">
                          This step is not needed. Click "Proceed to Next" to continue with the workflow.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700">
                          The estimate must include at least one shingle removal line item. 
                          Please select one of the following options and enter the quantity:
                        </p>
                      </div>
                    )}

                    {/* Shingle Type Selection - Only show if no items found */}
                    {foundShingleRemovalItems.length === 0 && (
                      <>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Shingle Removal Type *
                          </label>
                          <select
                            value={selectedShingleRemoval}
                            onChange={(e) => setSelectedShingleRemoval(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                          >
                            <option value="">-- Select a type --</option>
                            {shingleRemovalOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity Input */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity (SQ) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={shingleRemovalQuantity}
                            onChange={(e) => setShingleRemovalQuantity(e.target.value)}
                            placeholder="Enter quantity"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                      </>
                    )}

                    {/* Price Preview - Only show if no items found and form is filled */}
                    {foundShingleRemovalItems.length === 0 && selectedShingleRemoval && shingleRemovalQuantity && roofMasterMacro.get(selectedShingleRemoval) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Preview</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Unit Price:</div>
                            <div className="font-semibold">
                              ${roofMasterMacro.get(selectedShingleRemoval).unit_price.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Quantity:</div>
                            <div className="font-semibold">{shingleRemovalQuantity} SQ</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Total RCV:</div>
                            <div className="font-semibold text-blue-700">
                              ${(roofMasterMacro.get(selectedShingleRemoval).unit_price * parseFloat(shingleRemovalQuantity)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => setShowShingleRemovalModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <div className="flex gap-3">
                    {foundShingleRemovalItems.length > 0 ? (
                      <button
                        onClick={() => {
                          setShowShingleRemovalModal(false);
                          setShingleRemovalSkipped(true); // Mark as completed
                          console.log('✅ Proceeding to next step - shingle removal items found');
                          console.log('Workflow would continue here - User Prompt Workflow removed');
                        }}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                      >
                        Proceed to Next
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setShowShingleRemovalModal(false);
                            setShingleRemovalSkipped(true);
                            console.log('⏭️ Skip (Optional)ping shingle removal - continuing workflow');
                            console.log('Workflow would continue here - User Prompt Workflow removed');
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
                        >
                          Skip (Optional) & Continue
                        </button>
                        <button
                          onClick={handleAddShingleRemoval}
                          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
                        >
                          Add to Estimate
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Installation Shingles Modal - Hidden when using unified workflow */}
          {showInstallationShinglesModal && !showUnifiedWorkflow && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className={`px-6 py-4 rounded-t-2xl ${foundInstallationShingleItems.length > 0 ? 'bg-green-600' : 'bg-orange-600'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">
                        {foundInstallationShingleItems.length > 0 ? '✅ Installation Shingles Found' : '⚠️ Installation Shingles Required'}
                      </h2>
                      <p className={`text-sm ${foundInstallationShingleItems.length > 0 ? 'text-green-100' : 'text-orange-100'}`}>
                        {foundInstallationShingleItems.length > 0 
                          ? `${foundInstallationShingleItems.length} installation shingle item(s) found in estimate`
                          : 'No installation shingle items found in estimate'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => setShowInstallationShinglesModal(false)}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    {foundInstallationShingleItems.length > 0 ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 mb-3">
                          <strong>Great! Installation shingle items found in estimate:</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {foundInstallationShingleItems.map((item, index) => (
                            <li key={index} className="text-gray-700 font-medium">
                              {item}
                            </li>
                          ))}
                        </ul>
                        <p className="text-gray-600 text-sm mt-3">
                          This step is not needed. Click "Proceed to Next" to continue with the workflow.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-700">
                          The estimate must include at least one installation shingle line item. 
                          Please select one of the following options and enter the quantity:
                        </p>
                      </div>
                    )}

                    {/* Installation Shingle Type Selection - Only show if no items found */}
                    {foundInstallationShingleItems.length === 0 && (
                      <>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Installation Shingle Type *
                          </label>
                          <select
                            value={selectedInstallationShingle}
                            onChange={(e) => setSelectedInstallationShingle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                          >
                            <option value="">-- Select a type --</option>
                            {installationShingleOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity Input */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity (SQ) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={installationShingleQuantity}
                            onChange={(e) => setInstallationShingleQuantity(e.target.value)}
                            placeholder="Enter quantity"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                      </>
                    )}

                    {/* Price Preview - Only show if no items found and form is filled */}
                    {foundInstallationShingleItems.length === 0 && selectedInstallationShingle && installationShingleQuantity && roofMasterMacro.get(selectedInstallationShingle) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Preview</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Unit Price:</div>
                            <div className="font-semibold">
                              ${roofMasterMacro.get(selectedInstallationShingle).unit_price.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Quantity:</div>
                            <div className="font-semibold">{installationShingleQuantity} SQ</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Total RCV:</div>
                            <div className="font-semibold text-blue-700">
                              ${(roofMasterMacro.get(selectedInstallationShingle).unit_price * parseFloat(installationShingleQuantity)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => setShowInstallationShinglesModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <div className="flex gap-3">
                    {foundInstallationShingleItems.length > 0 ? (
                      <button
                        onClick={() => {
                          setShowInstallationShinglesModal(false);
                          setInstallationShinglesSkipped(true); // Mark as completed
                          console.log('✅ Proceeding to next step - installation shingles found');
                          console.log('Workflow would continue here - User Prompt Workflow removed');
                        }}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                      >
                        Proceed to Next
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setShowInstallationShinglesModal(false);
                            setInstallationShinglesSkipped(true);
                            console.log('⏭️ Skip (Optional)ping installation shingles - continuing workflow');
                            console.log('Workflow would continue here - User Prompt Workflow removed');
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
                        >
                          Skip (Optional) & Continue
                        </button>
                        <button
                          onClick={handleAddInstallationShingle}
                          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
                        >
                          Add to Estimate
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* O&P Modal */}
          {showOPModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="bg-blue-600 px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">💰 O&P (Overhead & Profit) Required</h2>
                      <p className="text-blue-100 text-sm">No O&P line item found in estimate</p>
                    </div>
                    <button
                      onClick={() => setShowOPModal(false)}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700">
                        The estimate should include an O&P (Overhead & Profit) line item calculated at 20% of the total RCV.
                        Would you like to add O&P to this estimate?
                      </p>
                    </div>

                    {/* Current Estimate Totals */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Current Estimate Totals</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-700 font-medium">Total RCV:</div>
                          <div className="font-bold text-gray-900 text-lg">
                            ${extractedLineItems.reduce((sum, item) => sum + (item.RCV || 0), 0).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-700 font-medium">O&P Amount (20%):</div>
                          <div className="font-bold text-blue-700 text-lg">
                            ${(extractedLineItems.reduce((sum, item) => sum + (item.RCV || 0), 0) * 0.20).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => {
                      setShowOPModal(false);
                      setOPSkipped(true);
                      console.log('⏭️ Skip (Optional)ping O&P - continuing workflow');
                      console.log('Workflow would continue here - User Prompt Workflow removed');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Skip (Optional) & Continue
                  </button>
                  <button
                    onClick={() => handleAddOP()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Add O&P (20%)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ridge Vent Modal */}
          {showRidgeVentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="bg-green-600 px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">🏠 Ridge Vent (Optional)</h2>
                      <p className="text-green-100 text-sm">No ridge vent found but ridge length detected - adding one is optional</p>
                    </div>
                    <button
                      onClick={() => setShowRidgeVentModal(false)}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700">
                        The estimate should include a ridge vent since ridge length is detected. 
                        Please select a ridge vent type and enter the quantity:
                      </p>
                    </div>

                    {/* Ridge Length Info */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Ridge Length Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Total Ridge Length:</div>
                          <div className="font-semibold">
                            {extractedRoofMeasurements["Total Ridges/Hips Length"]?.value || 0} LF
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Calculated Quantity:</div>
                          <div className="font-semibold text-green-700">
                            {((extractedRoofMeasurements["Total Ridges/Hips Length"]?.value || 0) / 100).toFixed(2)} LF
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ridge Vent Type Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Ridge Vent Type *
                      </label>
                      <select
                        value={selectedRidgeVent}
                        onChange={(e) => setSelectedRidgeVent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">-- Select a type --</option>
                        {ridgeVentOptions.map((option) => (
                          <option key={option.macroName} value={option.displayName}>
                            {option.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Input */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity (LF) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ridgeVentQuantity}
                        onChange={(e) => setRidgeVentQuantity(e.target.value)}
                        placeholder="Enter quantity"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    {/* Price Preview */}
                    {selectedRidgeVent && ridgeVentQuantity && (() => {
                      const selectedOption = ridgeVentOptions.find(option => option.displayName === selectedRidgeVent);
                      const macroData = selectedOption ? roofMasterMacro.get(selectedOption.macroName) : null;
                      return macroData ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Preview</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600">Unit Price:</div>
                              <div className="font-semibold">
                                ${macroData.unit_price.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Quantity:</div>
                              <div className="font-semibold">{ridgeVentQuantity} LF</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Total RCV:</div>
                              <div className="font-semibold text-green-700">
                                ${(macroData.unit_price * parseFloat(ridgeVentQuantity)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => setShowRidgeVentModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowRidgeVentModal(false);
                        setRidgeVentSkipped(true);
                        console.log('⏭️ Skip (Optional)ping ridge vent - continuing workflow');
                        console.log('Workflow would continue here - User Prompt Workflow removed');
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
                    >
                      Skip (Optional) (Optional)
                    </button>
                    <button
                      onClick={() => handleAddRidgeVent(extractedLineItems)}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                    >
                      Add to Estimate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SPC Shingle Removal Modal */}
          {showSPCShingleRemovalModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-purple-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">⚠️ SPC Shingle Removal Required</h2>
                      <p className="text-purple-100 text-sm">
                        No shingle removal items found after SPC Adjustment Engine processing
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCShingleRemovalModal(false);
                        // Proceed to installation check even if closed via X button
                        setTimeout(() => {
                          checkInstallationItems(currentSPCLineItems);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-3">
                        <strong>Please select a shingle removal type and enter quantity:</strong>
                      </p>
                      <p className="text-gray-600 text-sm">
                        Choose one of the following removal line items to add to the estimate:
                      </p>
                    </div>

                    {/* Selection Dropdown */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Shingle Removal Type
                        </label>
                        <select
                          value={selectedSPCShingleRemoval}
                          onChange={(e) => setSelectedSPCShingleRemoval(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                        >
                          <option value="">Select removal type...</option>
                          {shingleRemovalOptions.map((option, index) => (
                            <option key={index} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity (SQ)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={spcShingleRemovalQuantity}
                          onChange={(e) => setSPCShingleRemovalQuantity(e.target.value)}
                          placeholder="Enter quantity in squares"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                        />
                      </div>

                      {/* Price Preview */}
                      {selectedSPCShingleRemoval && spcShingleRemovalQuantity && roofMasterMacro.get(selectedSPCShingleRemoval) && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Preview</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600">Unit Price:</div>
                              <div className="font-semibold text-purple-700">
                                ${roofMasterMacro.get(selectedSPCShingleRemoval).unit_price.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Quantity:</div>
                              <div className="font-semibold text-purple-700">{spcShingleRemovalQuantity} SQ</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Total RCV:</div>
                              <div className="font-semibold text-purple-700">
                                ${(roofMasterMacro.get(selectedSPCShingleRemoval).unit_price * parseFloat(spcShingleRemovalQuantity)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => {
                      setShowSPCShingleRemovalModal(false);
                      // Proceed to installation check even if canceled
                      setTimeout(() => {
                        checkInstallationItems(currentSPCLineItems);
                      }, 100);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSPCShingleRemoval}
                    disabled={!selectedSPCShingleRemoval || !spcShingleRemovalQuantity}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      selectedSPCShingleRemoval && spcShingleRemovalQuantity
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Add to SPC Estimate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Items Found Modal */}
          {showSPCItemsFoundModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-green-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">✅ Removal Line Items Found</h2>
                      <p className="text-green-100 text-sm">
                        Shingle removal items detected in the estimate
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCItemsFoundModal(false);
                        // Proceed to installation check even if closed via X button
                        setTimeout(() => {
                          checkInstallationItems(currentSPCLineItems);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-3">
                        <strong>Great! The following shingle removal items were found in your estimate:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-2">
                        {foundRemovalItems.map((item, index) => (
                          <li key={index} className="text-gray-700 font-medium">
                            <span className="text-green-700">•</span> {item.description}
                            {item.quantity && (
                              <span className="text-gray-600 ml-2">
                                (Qty: {item.quantity} {item.unit || 'SQ'})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-gray-600 text-sm mt-4">
                        No additional shingle removal items need to be added. You can continue with the next step in your workflow.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end">
                  <button
                    onClick={() => {
                      setShowSPCItemsFoundModal(false);
                      // Proceed to installation check after removal check is complete
                      setTimeout(() => {
                        checkInstallationItems(currentSPCLineItems);
                      }, 100);
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    Continue to Next Step
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Installation Modal */}
          {showSPCInstallationModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-blue-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">⚠️ SPC Installation Shingles Required</h2>
                      <p className="text-blue-100 text-sm">
                        No installation shingle items found after SPC Adjustment Engine processing
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCInstallationModal(false);
                        // Proceed to final step check even if closed via X button
                        setTimeout(() => {
                          checkSPCAddedItems(currentSPCLineItems);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-3">
                        <strong>Please select an installation shingle type and enter quantity:</strong>
                      </p>
                      <p className="text-gray-600 text-sm">
                        Choose one of the following installation line items to add to the estimate:
                      </p>
                    </div>

                    {/* Selection Dropdown */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Installation Shingle Type
                        </label>
                        <select
                          value={selectedSPCInstallation}
                          onChange={(e) => setSelectedSPCInstallation(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        >
                          <option value="">Select installation type...</option>
                          {installationShingleOptions.map((option, index) => (
                            <option key={index} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity (SQ)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={spcInstallationQuantity}
                          onChange={(e) => setSPCInstallationQuantity(e.target.value)}
                          placeholder="Enter quantity in squares"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        />
                      </div>

                      {/* Price Preview */}
                      {selectedSPCInstallation && spcInstallationQuantity && roofMasterMacro.get(selectedSPCInstallation) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Preview</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600">Unit Price:</div>
                              <div className="font-semibold">
                                ${roofMasterMacro.get(selectedSPCInstallation).unit_price.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Quantity:</div>
                              <div className="font-semibold">{spcInstallationQuantity} SQ</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Total RCV:</div>
                              <div className="font-semibold text-blue-700">
                                ${(roofMasterMacro.get(selectedSPCInstallation).unit_price * parseFloat(spcInstallationQuantity)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => {
                      setShowSPCInstallationModal(false);
                      // Proceed to final step check even if canceled
                      setTimeout(() => {
                        checkSPCAddedItems(currentSPCLineItems);
                      }, 100);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSPCInstallation}
                    disabled={!selectedSPCInstallation || !spcInstallationQuantity}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      selectedSPCInstallation && spcInstallationQuantity
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Add to SPC Estimate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Installation Found Modal */}
          {showSPCInstallationFoundModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-green-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">✅ Installation Line Items Found</h2>
                      <p className="text-green-100 text-sm">
                        Installation shingle items detected in the estimate
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCInstallationFoundModal(false);
                        // Proceed to final step check
                        setTimeout(() => {
                          checkSPCAddedItems(currentSPCLineItems);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-3">
                        <strong>Great! The following installation shingle items were found in your estimate:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-2">
                        {foundInstallationItems.map((item, index) => (
                          <li key={index} className="text-gray-700 font-medium">
                            <span className="text-green-700">•</span> {item.description}
                            {item.quantity && (
                              <span className="text-gray-600 ml-2">
                                (Qty: {item.quantity} {item.unit || 'SQ'})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-gray-600 text-sm mt-4">
                        No additional installation shingle items need to be added. The SPC Adjustment Engine workflow is now complete.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end">
                  <button
                    onClick={() => {
                      setShowSPCInstallationFoundModal(false);
                      // Proceed to final step check
                      setTimeout(() => {
                        checkSPCAddedItems(currentSPCLineItems);
                      }, 100);
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    Next step
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Ridge Vent Modal */}
          {showSPCRidgeVentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-orange-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">⚠️ Ridge Vent (Optional)</h2>
                      <p className="text-orange-100 text-sm">
                        No ridge vent items found but ridges detected in measurements - adding one is optional
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCRidgeVentModal(false);
                        // Proceed to final step even if closed via X button
                        setTimeout(() => {
                          setShowSPCFinalStepModal(true);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-3">
                        <strong>Please select a ridge vent type:</strong>
                      </p>
                      <p className="text-gray-600 text-sm mb-4">
                        Choose one of the following ridge vent types to add to the estimate:
                      </p>
                      
                      <div className="space-y-3">
                        {ridgeVentOptions.map((option, index) => (
                          <label key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="radio"
                              name="ridgeVentSelection"
                              value={option.displayName}
                              checked={selectedSPCRidgeVent === option.displayName}
                              onChange={(e) => setSelectedSPCRidgeVent(e.target.value)}
                              className="text-orange-600 focus:ring-orange-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{option.displayName}</div>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Show calculated quantity */}
                      {(() => {
                        const totalRidges = extractedRoofMeasurements["Total Line Lengths (Ridges)"];
                        const ridgesValue = totalRidges?.value || (typeof totalRidges === 'number' ? totalRidges : 0);
                        const calculatedQuantity = ridgesValue / 100;
                        
                        return calculatedQuantity > 0 && (
                          <div className="mt-4 p-3 bg-orange-100 border border-orange-200 rounded-lg">
                            <div className="text-sm text-gray-700">
                              <strong>Calculated Quantity:</strong> {calculatedQuantity.toFixed(3)} LF
                              <br />
                              <span className="text-gray-600">
                                (Based on Total Line Lengths (Ridges): {ridgesValue} LF ÷ 100)
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Price preview */}
                      {selectedSPCRidgeVent && (() => {
                        const selectedOption = ridgeVentOptions.find(option => option.displayName === selectedSPCRidgeVent);
                        const macroData = selectedOption ? roofMasterMacro.get(selectedOption.macroName) : null;
                        const totalRidges = extractedRoofMeasurements["Total Line Lengths (Ridges)"];
                        const ridgesValue = totalRidges?.value || (typeof totalRidges === 'number' ? totalRidges : 0);
                        const calculatedQuantity = ridgesValue / 100;
                        
                        return macroData && calculatedQuantity > 0 && (
                          <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="text-sm text-gray-600 mb-2">Price Preview:</div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-gray-600">Unit Price:</div>
                                <div className="font-semibold text-gray-900">${macroData.unit_price.toFixed(2)}/{macroData.unit}</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Total RCV:</div>
                                <div className="font-semibold text-orange-700">
                                  ${(macroData.unit_price * calculatedQuantity).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => {
                      setShowSPCRidgeVentModal(false);
                      // Proceed to chimney check even if canceled
                      setTimeout(() => {
                        checkChimneyFlashingItems(ruleResults?.line_items || []);
                      }, 100);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Skip (Optional)
                  </button>
                  <button
                    onClick={handleAddSPCRidgeVent}
                    disabled={!selectedSPCRidgeVent}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      selectedSPCRidgeVent
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Add Ridge Vent
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Ridge Vent Found Modal */}
          {showSPCRidgeVentFoundModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-green-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">✅ Ridge Vent Items Found</h2>
                      <p className="text-green-100 text-sm">
                        Ridge vent items detected in the estimate
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCRidgeVentFoundModal(false);
                        // Proceed to chimney check
                        setTimeout(() => {
                          checkChimneyFlashingItems(ruleResults?.line_items || []);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-3">
                        <strong>Great! The following ridge vent items were found in your estimate:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-2">
                        {foundRidgeVentItems.map((item, index) => (
                          <li key={index} className="text-gray-700 font-medium">
                            <span className="text-green-700">•</span> {item.description}
                            {item.quantity && (
                              <span className="text-gray-600 ml-2">
                                (Qty: {item.quantity} {item.unit || 'LF'})
                              </span>
                            )}
                            {item.RCV && (
                              <span className="text-green-600 ml-2 font-semibold">
                                - RCV: ${item.RCV.toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-gray-600 text-sm mt-4">
                        The SPC Adjustment Engine workflow is now complete.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end">
                  <button
                    onClick={() => {
                      setShowSPCRidgeVentFoundModal(false);
                      // Proceed to chimney check
                      setTimeout(() => {
                        checkChimneyFlashingItems(ruleResults?.line_items || []);
                      }, 100);
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    Next step
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Chimney Confirmation Modal */}
          {showSPCChimneyModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-blue-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">🏠 Chimney Check Required</h2>
                      <p className="text-blue-100 text-sm">
                        No chimney flashing items found - please confirm chimney presence
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCChimneyModal(false);
                        // Proceed to additional layers check if canceled
                        setTimeout(() => {
                          checkAdditionalLayersItems(ruleResults?.line_items || []);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-4">
                        <strong>No chimney flashing items were found in your estimate.</strong> Please confirm if there is a chimney present on the roof:
                      </p>
                      
                      {/* Chimney presence selection */}
                      <div className="space-y-3">
                        <p className="font-medium text-gray-700">Is there a chimney present?</p>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => {
                              setChimneyPresent(true);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              chimneyPresent === true
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => {
                              setChimneyPresent(false);
                              setShowSPCChimneyModal(false);
                              setTimeout(() => {
                                checkAdditionalLayersItems(ruleResults?.line_items || []);
                              }, 100);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              chimneyPresent === false
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* If chimney is present, show size options */}
                      {chimneyPresent === true && (
                        <div className="mt-6 space-y-4">
                          <p className="font-medium text-gray-700">Chimney size selection:</p>
                          
                          {/* Size options */}
                          <div className="space-y-3">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setChimneySize('small')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  chimneySize === 'small'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
                                }`}
                              >
                                Small (24" x 24")
                              </button>
                              <button
                                onClick={() => setChimneySize('medium')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  chimneySize === 'medium'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
                                }`}
                              >
                                Medium (32" x 36")
                              </button>
                              <button
                                onClick={() => setChimneySize('large')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  chimneySize === 'large'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
                                }`}
                              >
                                Large (32" x 60")
                              </button>
                            </div>
                          </div>

                          {/* Custom dimensions */}
                          <div className="mt-4">
                            <p className="font-medium text-gray-700 mb-3">Or enter custom dimensions:</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Length (parallel to ridge):
                                </label>
                                <input
                                  type="number"
                                  value={chimneyLength}
                                  onChange={(e) => setChimneyLength(e.target.value)}
                                  placeholder="e.g., 36"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Width (perpendicular to ridge):
                                </label>
                                <input
                                  type="number"
                                  value={chimneyWidth}
                                  onChange={(e) => setChimneyWidth(e.target.value)}
                                  placeholder="e.g., 48"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Logic preview */}
                          {(() => {
                            const length = parseFloat(chimneyLength);
                            const width = parseFloat(chimneyWidth);
                            const size = chimneySize;
                            
                            if (size === 'small' || length < 30) {
                              return (
                                <div className="mt-4 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                                  <div className="text-sm text-gray-600">
                                    <strong>No cricket needed</strong> - chimney is too small
                                  </div>
                                </div>
                              );
                            } else if (length > 30) {
                              const area = length * width;
                              let cricketType = '';
                              if (area < (32 * 60)) {
                                cricketType = 'Saddle or cricket - up to 25 SF';
                              } else {
                                cricketType = 'Saddle or cricket - 26 to 50 SF';
                              }
                              
                              return (
                                <div className="mt-4 p-3 bg-orange-100 border border-orange-200 rounded-lg">
                                  <div className="text-sm text-gray-700">
                                    <strong>Cricket needed:</strong> {cricketType}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Length: {length}" | Width: {width}" | Area: {area.toFixed(0)} SF
                                  </div>
                                </div>
                              );
                            }
                            
                            return null;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => {
                      setShowSPCChimneyModal(false);
                      // Proceed to additional layers check if canceled
                      setTimeout(() => {
                        checkAdditionalLayersItems(ruleResults?.line_items || []);
                      }, 100);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Skip (Optional)
                  </button>
                  <button
                    onClick={handleAddChimneyCricket}
                    disabled={chimneyPresent === null || (chimneyPresent === true && !chimneySize && (!chimneyLength || !chimneyWidth || parseFloat(chimneyLength) < 30 || parseFloat(chimneyWidth) < 1))}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      chimneyPresent === false || (chimneyPresent === true && (
                        chimneySize === 'small' || 
                        (chimneySize === '' && parseFloat(chimneyLength) < 30)
                      ))
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : chimneyPresent === true && (
                          chimneySize === 'medium' || chimneySize === 'large' || 
                          (parseFloat(chimneyLength) > 30 && parseFloat(chimneyWidth) > 0)
                        )
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {chimneyPresent === false ? 'Continue' : 
                     chimneyPresent === true && (chimneySize === 'small' || parseFloat(chimneyLength) < 30) ? 'Continue (No Cricket)' :
                     'Add Cricket & Continue'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Chimney Found Modal */}
          {showSPCChimneyFoundModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-green-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">✅ Chimney Flashing Items Found</h2>
                      <p className="text-green-100 text-sm">
                        Chimney flashing items detected in the estimate
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCChimneyFoundModal(false);
                        // Proceed to additional layers check
                        setTimeout(() => {
                          checkAdditionalLayersItems(ruleResults?.line_items || []);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-3">
                        <strong>Great! The following chimney flashing items were found in your estimate:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-2">
                        {foundChimneyItems.map((item, index) => (
                          <li key={index} className="text-gray-700 font-medium">
                            <span className="text-green-700">•</span> {item.description}
                            {item.quantity && (
                              <span className="text-gray-600 ml-2">
                                (Qty: {item.quantity} {item.unit || 'EA'})
                              </span>
                            )}
                            {item.RCV && (
                              <span className="text-green-600 ml-2 font-semibold">
                                - RCV: ${item.RCV.toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-gray-600 text-sm mt-4">
                        No additional chimney items need to be added. The SPC Adjustment Engine workflow is now complete.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end">
                  <button
                    onClick={() => {
                      setShowSPCChimneyFoundModal(false);
                      // Proceed to additional layers check
                      setTimeout(() => {
                        checkAdditionalLayersItems(ruleResults?.line_items || []);
                      }, 100);
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    Next step
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Additional Layers Confirmation Modal */}
          {showSPCAdditionalLayersModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-violet-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">🏠 Additional Layers Check Required</h2>
                      <p className="text-violet-100 text-sm">
                        No additional layers items found - please confirm if additional layers are present
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCAdditionalLayersModal(false);
                        // Proceed to permit check if canceled
                        setTimeout(() => {
                          checkPermitItems(ruleResults?.line_items || []);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-4">
                        <strong>No additional layers items were found in your estimate.</strong> Are additional layers present?
                      </p>
                      
                      {/* Additional layers presence selection */}
                      <div className="space-y-3">
                        <p className="font-medium text-gray-700">Are additional layers present?</p>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => {
                              setAdditionalLayersPresent(true);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              additionalLayersPresent === true
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => {
                              setAdditionalLayersPresent(false);
                              setShowSPCAdditionalLayersModal(false);
                              setTimeout(() => {
                                checkPermitItems(ruleResults?.line_items || []);
                              }, 100);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              additionalLayersPresent === false
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* If additional layers are present, show configuration options */}
                      {additionalLayersPresent === true && (
                        <div className="mt-6 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Layer Count:
                              </label>
                              <input
                                type="number"
                                value={layerCount}
                                onChange={(e) => setLayerCount(e.target.value)}
                                placeholder="e.g., 1"
                                min="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Layer Type:
                              </label>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setLayerType('3-tab')}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    layerType === '3-tab'
                                      ? 'bg-violet-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-violet-100'
                                  }`}
                                >
                                  3-tab
                                </button>
                                <button
                                  onClick={() => setLayerType('laminated')}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    layerType === 'laminated'
                                      ? 'bg-violet-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-violet-100'
                                  }`}
                                >
                                  laminated
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Coverage selection */}
                          <div className="mt-4">
                            <p className="font-medium text-gray-700 mb-3">Coverage:</p>
                            <div className="space-y-3">
                              <div className="flex items-center">
                                <input
                                  type="radio"
                                  id="coverage-entire"
                                  name="coverage"
                                  value="entire roof"
                                  checked={coverageType === 'entire roof'}
                                  onChange={(e) => {
                                    setCoverageType(e.target.value);
                                    setCoverageSquares('');
                                  }}
                                  className="mr-2"
                                />
                                <label htmlFor="coverage-entire" className="text-gray-700">
                                  Entire roof (uses Total Roof Area / 100)
                                </label>
                              </div>
                              <div className="flex items-center">
                                <input
                                  type="radio"
                                  id="coverage-squares"
                                  name="coverage"
                                  value="squares"
                                  checked={coverageType === 'squares' || coverageSquares !== ''}
                                  onChange={(e) => {
                                    setCoverageType('squares');
                                  }}
                                  className="mr-2"
                                />
                                <label htmlFor="coverage-squares" className="text-gray-700 mr-2">
                                  Specify squares (float):
                                </label>
                                <input
                                  type="number"
                                  value={coverageSquares}
                                  onChange={(e) => {
                                    setCoverageSquares(e.target.value);
                                    setCoverageType('squares');
                                  }}
                                  placeholder="e.g., 15.5"
                                  step="0.1"
                                  className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Preview */}
                          {(() => {
                            if (!layerType || (!coverageType && !coverageSquares)) return null;
                            
                            let itemDescription = '';
                            if (layerType === 'laminated') {
                              itemDescription = 'Add. layer of comp. shingles remove & disp. - Laminated';
                            } else if (layerType === '3-tab') {
                              itemDescription = 'Add. layer of comp. shingles remove & disp. - 3 tab';
                            }
                            
                            let quantity = 0;
                            if (coverageType === 'entire roof') {
                              const totalRoofArea = extractedRoofMeasurements["Total Roof Area"];
                              const roofAreaValue = totalRoofArea?.value || (typeof totalRoofArea === 'number' ? totalRoofArea : 0);
                              quantity = roofAreaValue / 100;
                            } else if (coverageSquares) {
                              quantity = parseFloat(coverageSquares);
                            }
                            
                            const macroData = itemDescription ? roofMasterMacro.get(itemDescription) : null;
                            
                            return quantity > 0 && macroData ? (
                              <div className="mt-4 p-3 bg-violet-100 border border-violet-200 rounded-lg">
                                <div className="text-sm text-gray-700">
                                  <strong>Will add:</strong> {itemDescription}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  Quantity: {quantity.toFixed(1)} SQ | Unit Price: ${macroData.unit_price.toFixed(2)} | Total RCV: ${(quantity * macroData.unit_price).toFixed(2)}
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => {
                      setShowSPCAdditionalLayersModal(false);
                      // Proceed to permit check if canceled
                      setTimeout(() => {
                        checkPermitItems(ruleResults?.line_items || []);
                      }, 100);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Skip (Optional)
                  </button>
                  <button
                    onClick={handleAddAdditionalLayers}
                    disabled={additionalLayersPresent === null || (additionalLayersPresent === true && (!layerType || (!coverageType && !coverageSquares)))}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      additionalLayersPresent === false || (additionalLayersPresent === true && layerType && (coverageType || coverageSquares))
                        ? 'bg-violet-600 text-white hover:bg-violet-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {additionalLayersPresent === false ? 'Continue' : 'Add Layer & Continue'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Additional Layers Found Modal */}
          {showSPCAdditionalLayersFoundModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-green-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">✅ Additional Layers Items Found</h2>
                      <p className="text-green-100 text-sm">
                        Additional layers items detected in the estimate
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCAdditionalLayersFoundModal(false);
                        // Proceed to permit check
                        setTimeout(() => {
                          checkPermitItems(ruleResults?.line_items || []);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-3">
                        <strong>Great! The following additional layers items were found in your estimate:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-2">
                        {foundAdditionalLayersItems.map((item, index) => (
                          <li key={index} className="text-gray-700 font-medium">
                            <span className="text-green-700">•</span> {item.description}
                            {item.quantity && (
                              <span className="text-gray-600 ml-2">
                                (Qty: {item.quantity} {item.unit || 'SQ'})
                              </span>
                            )}
                            {item.RCV && (
                              <span className="text-green-600 ml-2 font-semibold">
                                - RCV: ${item.RCV.toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-gray-600 text-sm mt-4">
                        No additional layers items need to be added. The SPC Adjustment Engine workflow is now complete.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end">
                  <button
                    onClick={() => {
                      setShowSPCAdditionalLayersFoundModal(false);
                      // Proceed to permit check
                      setTimeout(() => {
                        checkPermitItems(ruleResults?.line_items || []);
                      }, 100);
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    Next step
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Permit Confirmation Modal */}
          {showSPCPermitModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-slate-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">🏛️ Permit Check Required</h2>
                      <p className="text-slate-100 text-sm">
                        No permit items found - please confirm if permit is missing
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCPermitModal(false);
                        // Proceed to hidden damages check if canceled
                        setTimeout(() => {
                          checkHiddenDamages(ruleResults?.line_items || []);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-4">
                        <strong>No permit items were found in your estimate.</strong> Is permit missing?
                      </p>
                      
                      {/* Permit missing selection */}
                      <div className="space-y-3">
                        <p className="font-medium text-gray-700">Is permit missing?</p>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => {
                              setPermitMissing(true);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              permitMissing === true
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => {
                              setPermitMissing(false);
                              setShowSPCPermitModal(false);
                              setTimeout(() => {
                                checkHiddenDamages(ruleResults?.line_items || []);
                              }, 100);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              permitMissing === false
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* If permit is missing, show cost input */}
                      {permitMissing === true && (
                        <div className="mt-6 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Permit Cost (float):
                            </label>
                            <input
                              type="number"
                              value={permitCost}
                              onChange={(e) => setPermitCost(e.target.value)}
                              placeholder="e.g., 150.00"
                              step="0.01"
                              min="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-gray-900"
                            />
                          </div>

                          {/* Preview */}
                          {permitCost && parseFloat(permitCost) > 0 && (
                            <div className="mt-4 p-3 bg-slate-100 border border-slate-200 rounded-lg">
                              <div className="text-sm text-gray-700">
                                <strong>Will add:</strong> Permit
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Quantity: 1 EA | Unit Price: ${parseFloat(permitCost).toFixed(2)} | Total RCV: ${parseFloat(permitCost).toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => {
                      setShowSPCPermitModal(false);
                      // Proceed to hidden damages check if canceled
                      setTimeout(() => {
                        checkHiddenDamages(ruleResults?.line_items || []);
                      }, 100);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Skip (Optional)
                  </button>
                  <button
                    onClick={handleAddPermit}
                    disabled={permitMissing === null || (permitMissing === true && (!permitCost || parseFloat(permitCost) <= 0))}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      permitMissing === false || (permitMissing === true && permitCost && parseFloat(permitCost) > 0)
                        ? 'bg-slate-600 text-white hover:bg-slate-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {permitMissing === false ? 'Continue' : 'Add Permit & Continue'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Permit Found Modal */}
          {showSPCPermitFoundModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-green-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">✅ Permit Items Found</h2>
                      <p className="text-green-100 text-sm">
                        Permit items detected in the estimate
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCPermitFoundModal(false);
                        // Proceed to hidden damages check
                        setTimeout(() => {
                          checkHiddenDamages(ruleResults?.line_items || []);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-3">
                        <strong>Great! The following permit items were found in your estimate:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-2">
                        {foundPermitItems.map((item, index) => (
                          <li key={index} className="text-gray-700 font-medium">
                            <span className="text-green-700">•</span> {item.description}
                            {item.quantity && (
                              <span className="text-gray-600 ml-2">
                                (Qty: {item.quantity} {item.unit || 'EA'})
                              </span>
                            )}
                            {item.RCV && (
                              <span className="text-green-600 ml-2 font-semibold">
                                - RCV: ${item.RCV.toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-gray-600 text-sm mt-4">
                        No additional permit items need to be added. The SPC Adjustment Engine workflow is now complete.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end">
                  <button
                    onClick={() => {
                      setShowSPCPermitFoundModal(false);
                      // Proceed to hidden damages check
                      setTimeout(() => {
                        checkHiddenDamages(ruleResults?.line_items || []);
                      }, 100);
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    Next step
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Hidden Damages Modal */}
          {showSPCHiddenDamagesModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">🔍 Hidden Damages Entry</h2>
                      <p className="text-gray-100 text-sm">
                        Enter hidden damages cost and narrative description
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCHiddenDamagesModal(false);
                        // Proceed to roof access check if canceled
                        setTimeout(() => {
                          checkRoofAccessIssues(ruleResults?.line_items || []);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-4">
                        <strong>Please enter the hidden damages cost and provide a narrative description.</strong>
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Hidden Damages Cost (float):
                          </label>
                          <input
                            type="number"
                            value={hiddenDamagesCost}
                            onChange={(e) => setHiddenDamagesCost(e.target.value)}
                            placeholder="e.g., 1250.00"
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Narrative Description:
                          </label>
                          <textarea
                            value={hiddenDamagesNarrative}
                            onChange={(e) => setHiddenDamagesNarrative(e.target.value)}
                            placeholder="e.g., Additional damage found during roof inspection including..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
                          />
                        </div>

                        {/* Preview */}
                        {hiddenDamagesCost && parseFloat(hiddenDamagesCost) > 0 && hiddenDamagesNarrative.trim() && (
                          <div className="mt-4 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                            <div className="text-sm text-gray-700">
                              <strong>Will add:</strong> {hiddenDamagesNarrative}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Quantity: 1 EA | Unit Price: ${parseFloat(hiddenDamagesCost).toFixed(2)} | Total RCV: ${parseFloat(hiddenDamagesCost).toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => {
                      setShowSPCHiddenDamagesModal(false);
                      // Proceed to roof access check if canceled
                      setTimeout(() => {
                        checkRoofAccessIssues(ruleResults?.line_items || []);
                      }, 100);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Skip (Optional)
                  </button>
                  <button
                    onClick={handleAddHiddenDamages}
                    disabled={!hiddenDamagesCost || parseFloat(hiddenDamagesCost) <= 0 || !hiddenDamagesNarrative.trim()}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      hiddenDamagesCost && parseFloat(hiddenDamagesCost) > 0 && hiddenDamagesNarrative.trim()
                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Add Hidden Damages & Complete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Roof Access Issues Modal */}
          {showSPCRoofAccessModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-orange-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">🏗️ Roof Access Issues Check</h2>
                      <p className="text-orange-100 text-sm">
                        Check for roof access issues and calculate labor costs
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCRoofAccessModal(false);
                        // Proceed to O&P check if canceled
                        setTimeout(() => {
                          checkOPItems(ruleResults?.line_items || []);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <div className="space-y-4">
                        {/* Roof access issues selection */}
                        <div>
                          <p className="font-medium text-gray-700 mb-3">Are there roof access issues?</p>
                          <div className="flex space-x-4">
                            <button
                              onClick={() => {
                                setRoofAccessIssues(true);
                              }}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                roofAccessIssues === true
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => {
                                setRoofAccessIssues(false);
                                setShowSPCRoofAccessModal(false);
                                setTimeout(() => {
                                  checkOPItems(ruleResults?.line_items || []);
                                }, 100);
                              }}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                roofAccessIssues === false
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>

                        {/* If roof access issues exist, show additional inputs */}
                        {roofAccessIssues === true && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Type of Roof Access Issues (select all that apply): *
                              </label>
                              <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-300">
                                {[
                                  'Cracked/broken driveway',
                                  'Aggregate paver driveway',
                                  'Boomtruck can not reach',
                                  'Gate clearance issues',
                                  'Landscaping blocks equipment',
                                  'Other'
                                ].map((issueType) => (
                                  <label key={issueType} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                                    <input
                                      type="checkbox"
                                      checked={roofAccessIssueTypes.includes(issueType)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setRoofAccessIssueTypes([...roofAccessIssueTypes, issueType]);
                                        } else {
                                          setRoofAccessIssueTypes(roofAccessIssueTypes.filter(t => t !== issueType));
                                          // Clear other text if unchecking "Other"
                                          if (issueType === 'Other') {
                                            setOtherIssueText('');
                                          }
                                        }
                                      }}
                                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                      {issueType === 'Other' ? 'Other issue' : issueType}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Show text input if "Other" is selected */}
                            {roofAccessIssueTypes.includes('Other') && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Describe the other issue: *
                                </label>
                                <textarea
                                  value={otherIssueText}
                                  onChange={(e) => setOtherIssueText(e.target.value)}
                                  placeholder="Please describe the roof access issue..."
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Number of Stories:
                              </label>
                              <input
                                type="number"
                                value={numberOfStories}
                                onChange={(e) => setNumberOfStories(e.target.value)}
                                placeholder="e.g., 2"
                                min="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                              />
                            </div>

                            <div>
                              <p className="font-medium text-gray-700 mb-3">Does it prevent roofstocking delivery?</p>
                              <div className="flex space-x-4">
                                <button
                                  onClick={() => {
                                    setRoofstockingDelivery(true);
                                  }}
                                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    roofstockingDelivery === true
                                      ? 'bg-orange-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-orange-100'
                                  }`}
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => {
                                    setRoofstockingDelivery(false);
                                  }}
                                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    roofstockingDelivery === false
                                      ? 'bg-red-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                                  }`}
                                >
                                  No
                                </button>
                              </div>
                            </div>

                            {/* Preview calculations */}
                            {roofAccessIssueTypes.length > 0 && numberOfStories && roofstockingDelivery === true && (
                              <div className="mt-4 p-3 bg-orange-100 border border-orange-200 rounded-lg">
                                <div className="text-sm text-orange-800">
                                  <strong>Line item will include:</strong>
                                </div>
                                <div className="text-sm text-orange-700 mt-2 space-y-1">
                                  <div><strong>Issues:</strong> {roofAccessIssueTypes.map(type => 
                                    type === 'Other' ? otherIssueText : type
                                  ).join(', ')}</div>
                                  <div>• Bundles = Total Roof Area × 3</div>
                                  <div>• Labor time = (bundles × {parseInt(numberOfStories) === 1 ? '2.75' : '3.13'}) ÷ 60 hours</div>
                                  <div>• Labor cost = labor time × "Roofing - General Laborer - per hour" rate</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => {
                      setShowSPCRoofAccessModal(false);
                      // Proceed to O&P check if canceled
                      setTimeout(() => {
                        checkOPItems(ruleResults?.line_items || []);
                      }, 100);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Skip (Optional)
                  </button>
                  <button
                    onClick={handleAddRoofAccessLabor}
                    disabled={roofAccessIssues === null || (roofAccessIssues === true && (roofAccessIssueTypes.length === 0 || (roofAccessIssueTypes.includes('Other') && !otherIssueText) || !numberOfStories || roofstockingDelivery === null))}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      roofAccessIssues === false || (roofAccessIssues === true && roofAccessIssueTypes.length > 0 && (!roofAccessIssueTypes.includes('Other') || otherIssueText) && numberOfStories && roofstockingDelivery !== null)
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {roofAccessIssues === false ? 'Continue' : 'Process & Complete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC O&P Confirmation Modal */}
          {showSPCOPModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-purple-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">💰 O&P Check Required</h2>
                      <p className="text-purple-100 text-sm">
                        No O&P (Overhead and Profit) items found - prompt user to add
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCOPModal(false);
                        // Proceed to final step if canceled
                        setTimeout(() => {
                          setShowSPCFinalStepModal(true);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-4">
                        <strong>No O&P (Overhead and Profit) items were found in your estimate.</strong>
                      </p>
                      
                      <div className="space-y-4">
                        <p className="text-gray-700">
                          O&P will be calculated as 20% of the total RCV (excluding any existing O&P items).
                        </p>
                        
                        {/* Show calculation preview */}
                        {(() => {
                          const currentItems = ruleResults?.line_items || [];
                          const totalRCV = currentItems.reduce((sum: number, item: any) => {
                            // Exclude any existing O&P items from the calculation
                            if (item.description && (
                              item.description.toLowerCase().includes('o&p') ||
                              (item.description.toLowerCase().includes('overhead') && item.description.toLowerCase().includes('profit'))
                            )) {
                              return sum;
                            }
                            return sum + (item.RCV || 0);
                          }, 0);
                          const opAmount = totalRCV * 0.20;
                          
                          return (
                            <div className="mt-4 p-3 bg-purple-100 border border-purple-200 rounded-lg">
                              <div className="text-sm text-purple-800">
                                <strong>Will add:</strong> O&P (20% of total RCV)
                              </div>
                              <div className="text-sm text-purple-700 mt-1">
                                Total RCV: ${totalRCV.toFixed(2)} | O&P Amount: ${opAmount.toFixed(2)}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
                  <button
                    onClick={() => {
                      setShowSPCOPModal(false);
                      // Proceed to final step if canceled
                      setTimeout(() => {
                        setShowSPCFinalStepModal(true);
                      }, 100);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                  >
                    Skip (Optional)
                  </button>
                  <button
                    onClick={handleAddOP}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                  >
                    Add O&P (20%) & Complete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC O&P Found Modal */}
          {showSPCOPFoundModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-green-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">✅ O&P Items Found</h2>
                      <p className="text-green-100 text-sm">
                        O&P items detected in the estimate
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSPCOPFoundModal(false);
                        // Proceed to final step
                        setTimeout(() => {
                          setShowSPCFinalStepModal(true);
                        }, 100);
                      }}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-3">
                        <strong>Great! The following O&P items were found in your estimate:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-2">
                        {foundOPItems.map((item, index) => (
                          <li key={index} className="text-gray-700 font-medium">
                            <span className="text-green-700">•</span> {item.description}
                            {item.quantity && (
                              <span className="text-gray-600 ml-2">
                                (Qty: {item.quantity} {item.unit || 'EA'})
                              </span>
                            )}
                            {item.RCV && (
                              <span className="text-green-600 ml-2 font-semibold">
                                - RCV: ${item.RCV.toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-gray-600 text-sm mt-4">
                        No additional O&P items need to be added. The SPC Adjustment Engine workflow is now complete.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end">
                  <button
                    onClick={() => {
                      setShowSPCOPFoundModal(false);
                      // Proceed to final step
                      setTimeout(() => {
                        setShowSPCFinalStepModal(true);
                      }, 100);
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    Next step
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPC Final Step Modal */}
          {showSPCFinalStepModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl bg-purple-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">🎯 SPC Adjustment Engine Summary</h2>
                      <p className="text-purple-100 text-sm">
                        Items automatically added by the SPC Adjustment Engine
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSPCFinalStepModal(false)}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded text-sm hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 mb-3">
                        <strong>SPC Adjustment Engine automatically added the following items to your estimate:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-2">
                        {foundSPCAddedItems.map((item, index) => (
                          <li key={index} className="text-gray-700 font-medium">
                            <span className="text-purple-700">•</span> {item.description}
                            {item.quantity && (
                              <span className="text-gray-600 ml-2">
                                (Qty: {item.quantity} {item.unit || 'SQ'})
                              </span>
                            )}
                            {item.RCV && (
                              <span className="text-purple-600 ml-2 font-semibold">
                                - RCV: ${item.RCV.toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-gray-600 text-sm mt-4">
                        These items were added based on your roof measurements and the SPC business rules. The workflow is now complete.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end">
                  <button
                    onClick={() => setShowSPCFinalStepModal(false)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                  >
                    Finish Workflow
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function EstimatePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EstimatePageContent />
    </Suspense>
  );
}