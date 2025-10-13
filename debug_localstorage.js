// Simple test to check localStorage data
console.log('=== LOCALSTORAGE DEBUG ===');

// Get all localStorage keys
const allKeys = Object.keys(localStorage);
console.log('All localStorage keys:', allKeys);

// Get the extracted claim data
const extractedData = localStorage.getItem('extractedClaimData');
console.log('extractedClaimData exists:', !!extractedData);

if (extractedData) {
  const parsed = JSON.parse(extractedData);
  console.log('Parsed data keys:', Object.keys(parsed));
  
  if (parsed.roofAgentResponse) {
    console.log('roofAgentResponse exists:', !!parsed.roofAgentResponse);
    console.log('roofAgentResponse keys:', Object.keys(parsed.roofAgentResponse));
    
    if (parsed.roofAgentResponse.extractedData) {
      console.log('extractedData exists:', !!parsed.roofAgentResponse.extractedData);
      console.log('extractedData keys:', Object.keys(parsed.roofAgentResponse.extractedData));
      
      if (parsed.roofAgentResponse.extractedData.roofMeasurements) {
        console.log('roofMeasurements exists:', !!parsed.roofAgentResponse.extractedData.roofMeasurements);
        console.log('roofMeasurements keys:', Object.keys(parsed.roofAgentResponse.extractedData.roofMeasurements));
        console.log('roofMeasurements values:', parsed.roofAgentResponse.extractedData.roofMeasurements);
      }
    }
    
    // Also check the response text
    if (parsed.roofAgentResponse.response) {
      console.log('Response text length:', parsed.roofAgentResponse.response.length);
      console.log('Response text sample (first 1000 chars):', parsed.roofAgentResponse.response.substring(0, 1000));
    }
  }
} else {
  console.log('❌ No extractedClaimData found in localStorage');
}

console.log('=== END LOCALSTORAGE DEBUG ===');
