/**
 * Utility functions for testing Unicode handling in card names
 */

// Sample MTG card names with various Unicode characters
export const UNICODE_TEST_CARDS = [
  'Æther Vial',
  'Dæmonic Tutor', 
  'Lim-Dûl the Necromancer',
  'Jötun Grunt',
  'Phyrexian Negátor',
  'Séance',
  'Loxodon Warhammer', // Normal ASCII
  'Lim-Dûl\'s Vault',
  'Sköll, Wolf of Chaos',
  'Tiamat', // Normal
  'Æon Chronicler',
  'Dúnedain Rangers',
  'Gríma Wormtongue',
];

/**
 * Test Unicode encoding/decoding with MTG card names
 */
export function testUnicodeEncoding(): boolean {
  console.log('Testing Unicode encoding with MTG card names...');
  
  let allPassed = true;
  
  for (const cardName of UNICODE_TEST_CARDS) {
    try {
      // Test Method 1: TextEncoder/TextDecoder
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(cardName);
      
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      
      const encoded = btoa(binaryString);
      
      // Decode
      const decodedBinary = atob(encoded);
      const decodedUint8Array = new Uint8Array(decodedBinary.length);
      for (let i = 0; i < decodedBinary.length; i++) {
        decodedUint8Array[i] = decodedBinary.charCodeAt(i);
      }
      
      const decoder = new TextDecoder();
      const decoded = decoder.decode(decodedUint8Array);
      
      if (decoded === cardName) {
        console.log(`✅ ${cardName} - TextEncoder method passed`);
      } else {
        console.error(`❌ ${cardName} - TextEncoder method failed: "${decoded}" !== "${cardName}"`);
        allPassed = false;
      }
    } catch (error) {
      console.error(`❌ ${cardName} - TextEncoder method error:`, error);
      
      // Test fallback method
      try {
        const escaped = cardName.replace(/[\u0080-\uFFFF]/g, (match) => {
          return '\\u' + ('0000' + match.charCodeAt(0).toString(16)).substr(-4);
        });
        
        const encoded = btoa(escaped);
        const decoded = atob(encoded);
        
        const unescaped = decoded.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
        
        if (unescaped === cardName) {
          console.log(`✅ ${cardName} - Escape method passed (fallback)`);
        } else {
          console.error(`❌ ${cardName} - Escape method failed: "${unescaped}" !== "${cardName}"`);
          allPassed = false;
        }
      } catch (fallbackError) {
        console.error(`❌ ${cardName} - Both methods failed:`, fallbackError);
        allPassed = false;
      }
    }
  }
  
  console.log(`Unicode encoding test ${allPassed ? 'PASSED' : 'FAILED'}`);
  return allPassed;
}

/**
 * Test compression/decompression with sample card data
 */
export function testCardDataCompression() {
  const sampleCardData = UNICODE_TEST_CARDS.map((name, index) => ({
    uuid: `test-uuid-${index}`,
    name: name,
    setCode: 'TST',
    number: (index + 1).toString(),
    rarity: 'common',
    identifiers: {
      scryfallId: `scryfall-${index}`,
    }
  }));

  console.log('Testing card data compression with Unicode names...');
  
  try {
    // Simulate the compression process
    const jsonString = JSON.stringify(sampleCardData);
    console.log(`Original size: ${jsonString.length} characters`);
    
    // Test if any card names would cause issues
    const problematicCards = sampleCardData.filter(card => {
      try {
        btoa(card.name);
        return false;
      } catch (error) {
        return true;
      }
    });
    
    if (problematicCards.length > 0) {
      console.log('Cards that would cause btoa() issues:');
      problematicCards.forEach(card => {
        console.log(`  - ${card.name}`);
      });
    } else {
      console.log('✅ All card names are compatible with basic btoa()');
    }
    
    return problematicCards.length === 0;
  } catch (error) {
    console.error('Card data compression test failed:', error);
    return false;
  }
}

/**
 * Run all Unicode tests
 */
export function runAllUnicodeTests(): boolean {
  console.log('='.repeat(50));
  console.log('Running Unicode Compatibility Tests');
  console.log('='.repeat(50));
  
  const encodingTest = testUnicodeEncoding();
  const compressionTest = testCardDataCompression();
  
  const allPassed = encodingTest && compressionTest;
  
  console.log('='.repeat(50));
  console.log(`Overall result: ${allPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log('='.repeat(50));
  
  return allPassed;
}
