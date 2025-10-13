// Debug script to check localStorage data structure
console.log('=== DEBUGGING ROOF DATA EXTRACTION ===');

// Get data from localStorage
const rawAgentData = JSON.parse(localStorage.getItem('extractedClaimData') || '{}');

console.log('1. Raw Agent Data Keys:', Object.keys(rawAgentData));

if (rawAgentData.roofAgentResponse) {
  console.log('2. Roof Agent Response Keys:', Object.keys(rawAgentData.roofAgentResponse));
  
  if (rawAgentData.roofAgentResponse.extractedData) {
    console.log('3. Extracted Data Keys:', Object.keys(rawAgentData.roofAgentResponse.extractedData));
    
    if (rawAgentData.roofAgentResponse.extractedData.roofMeasurements) {
      console.log('4. Roof Measurements Keys:', Object.keys(rawAgentData.roofAgentResponse.extractedData.roofMeasurements));
      console.log('5. Roof Measurements Values:', rawAgentData.roofAgentResponse.extractedData.roofMeasurements);
      
      // Check for specific fields
      const rm = rawAgentData.roofAgentResponse.extractedData.roofMeasurements;
      console.log('6. Total Ridges/Hips Length:', rm["Total Ridges/Hips Length"]);
      console.log('7. ridgeLength:', rm.ridgeLength);
      console.log('8. hipLength:', rm.hipLength);
      console.log('9. Total Roof Area:', rm["Total Roof Area"]);
      console.log('10. totalArea:', rm.totalArea);
    }
  }
  
  // Also check the response text
  if (rawAgentData.roofAgentResponse.response) {
    console.log('11. Response Text Length:', rawAgentData.roofAgentResponse.response.length);
    console.log('12. Response Text Sample (first 500 chars):', rawAgentData.roofAgentResponse.response.substring(0, 500));
    
    // Look for specific patterns
    const responseText = rawAgentData.roofAgentResponse.response;
    const ridgesHipsMatch = responseText.match(/"Total Ridges\/Hips Length"[:\s]*\{[^}]*"value"[:\s]*(\d+(?:\.\d+)?)/i);
    const ridgesMatch = responseText.match(/"Total Line Lengths \(Ridges\)"[:\s]*\{[^}]*"value"[:\s]*(\d+(?:\.\d+)?)/i);
    const hipsMatch = responseText.match(/"Total Line Lengths \(Hips\)"[:\s]*\{[^}]*"value"[:\s]*(\d+(?:\.\d+)?)/i);
    
    console.log('13. Ridges/Hips Length Match:', ridgesHipsMatch);
    console.log('14. Ridges Length Match:', ridgesMatch);
    console.log('15. Hips Length Match:', hipsMatch);
  }
} else {
  console.log('❌ No roofAgentResponse found in localStorage');
}

console.log('=== END DEBUG ===');
