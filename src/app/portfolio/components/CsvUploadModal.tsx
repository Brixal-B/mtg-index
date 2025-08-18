'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { MTGCard, PortfolioCard } from '@/lib/types';
import { batchLookupCards } from '@/lib/api/scryfall';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardsImported: (cards: PortfolioCard[]) => void;
}

interface CardSphereEntry {
  name: string;
  set?: string;
  scryfallId?: string;  // Add Scryfall ID support
  quantity: number;
  condition: PortfolioCard['condition'];
  foil: boolean;
  purchasePrice: number;
  purchaseDate: string;
  notes?: string;
}

interface ImportResult {
  name: string;
  set?: string;
  quantity: number;
  condition: string;
  foil: boolean;
  purchasePrice: number;
  purchaseDate: string;
  notes?: string;
  card: MTGCard | null;
  error?: string;
  status: 'success' | 'error' | 'pending';
}

export function CsvUploadModal({ isOpen, onClose, onCardsImported }: CsvUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResults([]);
    }
  };

  const parseCardSphereCSV = (csvContent: string): CardSphereEntry[] => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Parse CSV with proper quote handling
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
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
      return result;
    };
    
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    
    // Debug: Log headers
    console.log('CSV Headers:', headers);
    
    // Map common CardSphere CSV headers
    const headerMap: Record<string, string> = {
      'name': 'name',
      'card name': 'name',
      'card_name': 'name',
      'set': 'set',
      'set code': 'set',
      'set_code': 'set',
      'edition': 'set',
      'quantity': 'quantity',
      'count': 'quantity',  // CardSphere uses 'Count' for quantity
      'qty': 'quantity',
      'condition': 'condition',
      'foil': 'foil',
      'is foil': 'foil',
      'is_foil': 'foil',
      'price': 'purchasePrice',
      'purchase price': 'purchasePrice',
      'purchase_price': 'purchasePrice',
      'cost': 'purchasePrice',
      'date': 'purchaseDate',
      'purchase date': 'purchaseDate',
      'purchase_date': 'purchaseDate',
      'acquired date': 'purchaseDate',
      'last modified': 'purchaseDate',  // CardSphere uses 'Last Modified'
      'notes': 'notes',
      'comment': 'notes',
      'comments': 'notes',
      'tags': 'notes',  // CardSphere uses 'Tags' which we can map to notes
      'scryfall id': 'scryfallId',  // CardSphere includes Scryfall ID - use this!
      'scryfall_id': 'scryfallId'
    };

    const entries: CardSphereEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const entry: any = {};

      // Debug: Log first row
      if (i === 1) {
        console.log('First row values:', values);
        console.log('Values length:', values.length);
      }

      headers.forEach((header, index) => {
        const mappedField = headerMap[header];
        if (mappedField && values[index] && values[index] !== '') {
          entry[mappedField] = values[index];
          
          // Debug: Log Scryfall ID mapping
          if (i === 1 && mappedField === 'scryfallId') {
            console.log(`Mapped Scryfall ID: header="${header}", index=${index}, value="${values[index]}"`);
          }
        }
      });

      if (entry.name) {
        entries.push({
          name: entry.name,
          set: entry.set || undefined,
          scryfallId: entry.scryfallId || undefined,  // Include Scryfall ID
          quantity: parseInt(entry.quantity) || 1,
          condition: mapCondition(entry.condition) || 'near_mint',
          foil: parseFoil(entry.foil),
          purchasePrice: parseFloat(entry.purchasePrice) || 0,
          purchaseDate: entry.purchaseDate || new Date().toISOString().split('T')[0],
          notes: entry.notes || undefined
        });
      }
    }

    return entries;
  };

  const mapCondition = (condition: string): PortfolioCard['condition'] => {
    const conditionLower = condition?.toLowerCase() || '';
    if (conditionLower.includes('mint') && !conditionLower.includes('near')) return 'mint';
    if (conditionLower.includes('near mint') || conditionLower.includes('nm')) return 'near_mint';
    if (conditionLower.includes('excellent') || conditionLower.includes('ex')) return 'excellent';
    if (conditionLower.includes('good') || conditionLower.includes('gd')) return 'good';
    if (conditionLower.includes('light') || conditionLower.includes('lp')) return 'light_played';
    if (conditionLower.includes('played') || conditionLower.includes('pl')) return 'played';
    if (conditionLower.includes('poor') || conditionLower.includes('po')) return 'poor';
    return 'near_mint';
  };

  const parseFoil = (foil: string): boolean => {
    const foilLower = foil?.toLowerCase() || '';
    return foilLower === 'true' || foilLower === 'yes' || foilLower === '1' || foilLower === 'foil';
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);

    try {
      const csvContent = await file.text();
      const entries = parseCardSphereCSV(csvContent);
      
      if (entries.length === 0) {
        throw new Error('No valid card entries found in CSV file');
      }

      // Initialize results
      const initialResults: ImportResult[] = entries.map(entry => ({
        ...entry,
        card: null,
        status: 'pending' as const
      }));
      setResults(initialResults);

      // Batch lookup cards from Scryfall
      const lookupEntries = entries.map(entry => ({
        name: entry.name,
        set: entry.set,
        scryfallId: entry.scryfallId  // Include Scryfall ID for direct lookup
      }));

      const lookupResults = await batchLookupCards(lookupEntries);
      
      // Update results with lookup data
      const finalResults: ImportResult[] = entries.map((entry, index) => {
        const lookupResult = lookupResults[index];
        return {
          ...entry,
          card: lookupResult.card,
          error: lookupResult.error,
          status: lookupResult.card ? 'success' : 'error'
        };
      });

      setResults(finalResults);
      setProgress(100);
      
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert(error instanceof Error ? error.message : 'Error importing CSV file');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = () => {
    const successfulImports = results.filter(result => result.status === 'success' && result.card);
    
    const portfolioCards: PortfolioCard[] = successfulImports.map(result => {
      const card = result.card!;
      
      // Use Scryfall price as purchase price - prioritize foil price if card is foil
      let purchasePrice = 0;
      if (result.foil && card.prices.usdFoil) {
        purchasePrice = card.prices.usdFoil;
      } else if (card.prices.usd) {
        purchasePrice = card.prices.usd;
      } else if (card.prices.eur) {
        purchasePrice = card.prices.eur;
      }

      return {
        cardId: card.id,
        card: card,
        quantity: result.quantity,
        purchasePrice: purchasePrice, // Use fetched Scryfall price as purchase price
        purchaseDate: result.purchaseDate,
        condition: mapCondition(result.condition),
        foil: result.foil,
        notes: result.notes
      };
    });

    onCardsImported(portfolioCards);
    onClose();
  };

  const downloadSampleCSV = () => {
    const sampleCSV = `name,set,quantity,condition,foil,scryfall_id,purchase_price,purchase_date,notes
Lightning Bolt,lea,4,near_mint,false,24c3d451-6e59-470c-a6b8-f2fb7a00b0c3,25.00,2024-01-15,Alpha version
Black Lotus,lea,1,excellent,false,bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd,15000.00,2024-01-10,Power Nine
Tarmogoyf,fut,2,mint,true,69daba76-96e8-4bcc-ab79-2da3829d4df0,120.00,2024-01-20,Future Sight foil`;

    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cardsphere_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Import CardSphere CSV</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* File Upload */}
          {!file && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="border-2 border-dashed border-border rounded-lg p-8">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Upload CardSphere CSV File
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Select a CSV file exported from CardSphere or similar format
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Choose File
                  </button>
                </div>
              </div>

              <div className="bg-accent rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">Expected CSV Format:</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Your CSV should include columns for: name, set (optional), quantity, condition, foil. 
                  If your CSV includes a "Scryfall ID" column (like CardSphere exports), that will be used for more accurate card matching. 
                  Purchase prices will be automatically fetched from Scryfall's current market prices.
                </p>
                <button
                  onClick={downloadSampleCSV}
                  className="flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Sample CSV</span>
                </button>
              </div>
            </div>
          )}

          {/* File Selected */}
          {file && !importing && results.length === 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-foreground">
                <FileText className="h-5 w-5" />
                <span>Selected: {file.name}</span>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleImport}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Import Cards
                </button>
                <button
                  onClick={() => setFile(null)}
                  className="border border-border px-4 py-2 rounded-lg hover:bg-accent transition-colors"
                >
                  Choose Different File
                </button>
              </div>
            </div>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-foreground mb-2">Importing Cards...</h3>
                <p className="text-muted-foreground">Looking up cards in Scryfall database</p>
              </div>
              <div className="w-full bg-accent rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && !importing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">Import Results</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{successCount} successful</span>
                  </span>
                  {errorCount > 0 && (
                    <span className="flex items-center space-x-1 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{errorCount} failed</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-accent border-b border-border">
                    <tr>
                      <th className="text-left p-2">Card Name</th>
                      <th className="text-left p-2">Set</th>
                      <th className="text-left p-2">Qty</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="p-2">{result.name}</td>
                        <td className="p-2">{result.set || '-'}</td>
                        <td className="p-2">{result.quantity}</td>
                        <td className="p-2">
                          {result.status === 'success' ? (
                            <span className="flex items-center space-x-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span>Found</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-red-600" title={result.error}>
                              <AlertTriangle className="h-4 w-4" />
                              <span>Not found</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {successCount > 0 && (
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="border border-border px-4 py-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Import {successCount} Cards
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}