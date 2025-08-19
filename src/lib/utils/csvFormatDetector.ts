import { PortfolioCard } from '@/lib/types';

export interface CsvEntry {
  name: string;
  set?: string;
  scryfallId?: string;
  quantity: number;
  condition: PortfolioCard['condition'];
  foil: boolean;
  purchasePrice: number;
  purchaseDate: string;
  notes?: string;
}

export interface FormatDetectionResult {
  format: 'cardsphere' | 'moxfield' | 'archidekt' | 'mtga' | 'unknown';
  confidence: number;
  detected_columns: string[];
  sample_data?: any;
}

export interface CsvParseResult {
  entries: CsvEntry[];
  format: FormatDetectionResult;
  errors: string[];
  warnings: string[];
}

// Format-specific column mappings and patterns
const FORMAT_PATTERNS = {
  cardsphere: {
    required_columns: ['name', 'quantity'],
    typical_columns: ['card name', 'set', 'quantity', 'condition', 'foil', 'price', 'purchase_price'],
    unique_indicators: ['cardsphere', 'card_name', 'purchase_price'],
  },
  moxfield: {
    required_columns: ['name', 'count'],
    typical_columns: ['name', 'count', 'set', 'collector number', 'condition', 'foil', 'alter', 'proxy'],
    unique_indicators: ['count', 'collector number', 'alter', 'proxy', 'moxfield'],
  },
  archidekt: {
    required_columns: ['card', 'qty'],
    typical_columns: ['card', 'qty', 'set', 'category', 'tags', 'price', 'foil'],
    unique_indicators: ['archidekt', 'category', 'tags', 'qty', 'card'],
  },
  mtga: {
    required_columns: ['card name'],
    typical_columns: ['card name', 'set name', 'quantity owned', 'quantity purchased'],
    unique_indicators: ['quantity owned', 'quantity purchased', 'set name', 'arena'],
  },
};

/**
 * Detect CSV format based on headers and data patterns
 */
export function detectCsvFormat(csvContent: string): FormatDetectionResult {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return {
      format: 'unknown',
      confidence: 0,
      detected_columns: []
    };
  }

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  const firstDataRow = lines.length > 1 ? parseCsvLine(lines[1]) : [];

  const formatScores: Record<string, number> = {
    cardsphere: 0,
    moxfield: 0,
    archidekt: 0,
    mtga: 0
  };

  // Score each format based on column presence
  Object.entries(FORMAT_PATTERNS).forEach(([format, pattern]) => {
    let score = 0;

    // Check for required columns
    const requiredMatches = pattern.required_columns.filter(req => 
      headers.some(header => header.includes(req.toLowerCase()))
    );
    score += requiredMatches.length * 3; // Higher weight for required columns

    // Check for typical columns
    const typicalMatches = pattern.typical_columns.filter(typ => 
      headers.some(header => header.includes(typ.toLowerCase()))
    );
    score += typicalMatches.length;

    // Check for unique indicators
    const uniqueMatches = pattern.unique_indicators.filter(ind => 
      headers.some(header => header.includes(ind.toLowerCase())) ||
      csvContent.toLowerCase().includes(ind.toLowerCase())
    );
    score += uniqueMatches.length * 5; // Highest weight for unique indicators

    formatScores[format] = score;
  });

  // Find the format with the highest score
  const detectedFormat = Object.entries(formatScores).reduce((a, b) => 
    a[1] > b[1] ? a : b
  )[0] as keyof typeof FORMAT_PATTERNS;

  const confidence = Math.min(formatScores[detectedFormat] / 10, 1); // Normalize to 0-1

  return {
    format: confidence > 0.3 ? detectedFormat : 'unknown',
    confidence,
    detected_columns: headers,
    sample_data: firstDataRow
  };
}

/**
 * Parse CSV line handling quoted values and commas
 */
function parseCsvLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, ''));
}

/**
 * Parse CSV content with automatic format detection
 */
export function parseEnhancedCsv(csvContent: string): CsvParseResult {
  const format = detectCsvFormat(csvContent);
  const errors: string[] = [];
  const warnings: string[] = [];
  
  let entries: CsvEntry[] = [];

  try {
    switch (format.format) {
      case 'cardsphere':
        entries = parseCardSphereCsv(csvContent, errors, warnings);
        break;
      case 'moxfield':
        entries = parseMoxfieldCsv(csvContent, errors, warnings);
        break;
      case 'archidekt':
        entries = parseArchidektCsv(csvContent, errors, warnings);
        break;
      case 'mtga':
        entries = parseMtgaCsv(csvContent, errors, warnings);
        break;
      default:
        // Try generic parsing
        entries = parseGenericCsv(csvContent, errors, warnings);
        warnings.push('Unknown CSV format detected. Using generic parser.');
    }
  } catch (error) {
    errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    entries,
    format,
    errors,
    warnings
  };
}

/**
 * CardSphere CSV parser
 */
function parseCardSphereCsv(csvContent: string, errors: string[], warnings: string[]): CsvEntry[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  
  const columnMap = createColumnMap(headers, {
    name: ['name', 'card name', 'card_name'],
    set: ['set', 'set code', 'set_code', 'edition'],
    quantity: ['quantity', 'qty', 'count'],
    condition: ['condition'],
    foil: ['foil', 'is foil', 'is_foil'],
    purchasePrice: ['price', 'purchase price', 'purchase_price', 'cost'],
    purchaseDate: ['date', 'purchase date', 'purchase_date', 'acquired date'],
    notes: ['notes', 'comment', 'comments']
  });

  return parseEntriesWithMap(lines.slice(1), headers, columnMap, errors, warnings);
}

/**
 * Moxfield CSV parser
 */
function parseMoxfieldCsv(csvContent: string, errors: string[], warnings: string[]): CsvEntry[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  
  const columnMap = createColumnMap(headers, {
    name: ['name', 'card name'],
    set: ['set', 'set code'],
    quantity: ['count', 'quantity'],
    condition: ['condition'],
    foil: ['foil'],
    notes: ['tags', 'notes']
  });

  // Moxfield doesn't typically include purchase prices, so default to 0
  warnings.push('Moxfield CSV detected: Purchase prices not available, defaulting to $0.00');

  return parseEntriesWithMap(lines.slice(1), headers, columnMap, errors, warnings);
}

/**
 * Archidekt CSV parser
 */
function parseArchidektCsv(csvContent: string, errors: string[], warnings: string[]): CsvEntry[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  
  const columnMap = createColumnMap(headers, {
    name: ['card', 'name'],
    set: ['set'],
    quantity: ['qty', 'quantity'],
    condition: ['condition'],
    foil: ['foil'],
    purchasePrice: ['price'],
    notes: ['category', 'tags', 'notes']
  });

  return parseEntriesWithMap(lines.slice(1), headers, columnMap, errors, warnings);
}

/**
 * MTGA CSV parser
 */
function parseMtgaCsv(csvContent: string, errors: string[], warnings: string[]): CsvEntry[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  
  const columnMap = createColumnMap(headers, {
    name: ['card name', 'name'],
    set: ['set name', 'set'],
    quantity: ['quantity owned', 'quantity', 'count'],
    notes: ['set name'] // Use set name as notes since MTGA doesn't have conditions
  });

  warnings.push('MTGA CSV detected: Conditions and purchase prices not available');

  return parseEntriesWithMap(lines.slice(1), headers, columnMap, errors, warnings);
}

/**
 * Generic CSV parser for unknown formats
 */
function parseGenericCsv(csvContent: string, errors: string[], warnings: string[]): CsvEntry[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  
  // Try to map columns based on common patterns
  const columnMap = createColumnMap(headers, {
    name: ['name', 'card', 'card name', 'title'],
    set: ['set', 'edition', 'expansion'],
    quantity: ['quantity', 'qty', 'count', 'amount'],
    condition: ['condition', 'grade'],
    foil: ['foil', 'finish'],
    purchasePrice: ['price', 'cost', 'value'],
    purchaseDate: ['date', 'purchased'],
    notes: ['notes', 'comment', 'description']
  });

  return parseEntriesWithMap(lines.slice(1), headers, columnMap, errors, warnings);
}

/**
 * Create a column mapping from headers to expected fields
 */
function createColumnMap(headers: string[], patterns: Record<string, string[]>): Record<string, number> {
  const map: Record<string, number> = {};
  
  Object.entries(patterns).forEach(([field, possibleNames]) => {
    const index = headers.findIndex(header => 
      possibleNames.some(name => header.includes(name))
    );
    if (index !== -1) {
      map[field] = index;
    }
  });
  
  return map;
}

/**
 * Parse entries using the column mapping
 */
function parseEntriesWithMap(
  dataLines: string[], 
  headers: string[], 
  columnMap: Record<string, number>,
  errors: string[], 
  warnings: string[]
): CsvEntry[] {
  const entries: CsvEntry[] = [];

  dataLines.forEach((line, lineIndex) => {
    const values = parseCsvLine(line);
    
    try {
      const entry = parseEntry(values, columnMap, lineIndex + 2); // +2 for header and 0-indexing
      if (entry) {
        entries.push(entry);
      }
    } catch (error) {
      errors.push(`Line ${lineIndex + 2}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  });

  return entries;
}

/**
 * Parse a single entry from CSV values
 */
function parseEntry(values: string[], columnMap: Record<string, number>, lineNumber: number): CsvEntry | null {
  const name = values[columnMap.name]?.trim();
  
  if (!name) {
    return null; // Skip entries without names
  }

  const quantity = parseInt(values[columnMap.quantity] || '1') || 1;
  const condition = mapCondition(values[columnMap.condition] || '');
  const foil = parseFoil(values[columnMap.foil] || '');
  const purchasePrice = parseFloat(values[columnMap.purchasePrice] || '0') || 0;
  const purchaseDate = values[columnMap.purchaseDate] || new Date().toISOString().split('T')[0];
  const set = values[columnMap.set]?.trim();
  const notes = values[columnMap.notes]?.trim();

  return {
    name,
    set: set || undefined,
    quantity,
    condition,
    foil,
    purchasePrice,
    purchaseDate,
    notes: notes || undefined
  };
}

/**
 * Map condition string to standardized condition
 */
function mapCondition(condition: string): PortfolioCard['condition'] {
  const conditionLower = condition?.toLowerCase() || '';
  if (conditionLower.includes('mint') && !conditionLower.includes('near')) return 'mint';
  if (conditionLower.includes('near mint') || conditionLower.includes('nm')) return 'near_mint';
  if (conditionLower.includes('excellent') || conditionLower.includes('ex')) return 'excellent';
  if (conditionLower.includes('good') || conditionLower.includes('gd')) return 'good';
  if (conditionLower.includes('light') || conditionLower.includes('lp')) return 'light_played';
  if (conditionLower.includes('played') || conditionLower.includes('pl')) return 'played';
  if (conditionLower.includes('poor') || conditionLower.includes('po')) return 'poor';
  return 'near_mint';
}

/**
 * Parse foil indicator
 */
function parseFoil(foil: string): boolean {
  const foilLower = foil?.toLowerCase() || '';
  return foilLower === 'true' || foilLower === 'yes' || foilLower === '1' || 
         foilLower === 'foil' || foilLower === 'y';
}

/**
 * Generate sample CSV files for different formats
 */
export function generateSampleCsv(format: 'cardsphere' | 'moxfield' | 'archidekt' | 'mtga'): string {
  const samples = {
    cardsphere: `name,set,quantity,condition,foil,purchase_price,purchase_date,notes
Lightning Bolt,lea,4,near_mint,false,25.00,2024-01-15,Alpha version
Black Lotus,lea,1,excellent,false,15000.00,2024-01-10,Power Nine
Tarmogoyf,fut,2,mint,true,120.00,2024-01-20,Future Sight foil`,

    moxfield: `name,count,set,collector number,condition,foil,alter,proxy
Lightning Bolt,4,LEA,161,NM,false,false,false
Black Lotus,1,LEA,232,EX,false,false,false
Tarmogoyf,2,FUT,153,NM,true,false,false`,

    archidekt: `card,qty,set,category,tags,price,foil
Lightning Bolt,4,LEA,Instant,burn;red,25.00,false
Black Lotus,1,LEA,Artifact,ramp;mana,15000.00,false
Tarmogoyf,2,FUT,Creature,beater;green,120.00,true`,

    mtga: `card name,set name,quantity owned,quantity purchased
Lightning Bolt,Limited Edition Alpha,4,4
Black Lotus,Limited Edition Alpha,1,1
Tarmogoyf,Future Sight,2,2`
  };

  return samples[format];
}

