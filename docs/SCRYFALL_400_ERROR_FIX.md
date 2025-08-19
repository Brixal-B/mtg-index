# Scryfall 400 Error Fix

## Problem

The application was encountering a **400 Bad Request** error when making requests to the Scryfall API:

```
Failed to load resource: the server responded with a status of 400 ()
Error searching cards: Error: HTTP error! status: 400
api.scryfall.com/cards/search?q=&page=1&format=json&order=usd&dir=desc
```

## Root Cause

The error was caused by **empty search queries** being sent to the Scryfall API. This happened in two scenarios:

### 1. **Initial Page Load**
```typescript
// In src/app/cards/page.tsx
useEffect(() => {
  performSearch('', { ...filters, sortBy: 'price', sortOrder: 'desc' }, 1, false);
}, []);
```

The cards page was calling `performSearch` with an empty string on initial load.

### 2. **Advanced Search with No Filters**
```typescript
// In src/lib/api/scryfall.ts
export async function advancedSearch(query: string = '', filters: AdvancedSearchFilters = {}) {
  let searchQuery = query; // Could be empty
  // ... filter processing ...
  return searchCards(searchQuery.trim(), options); // Could result in empty string
}
```

When no search query and no filters were applied, the function would pass an empty string to the Scryfall API.

### 3. **Scryfall API Requirements**
The Scryfall API **requires a valid search query** and does not accept empty strings (`q=`). This is documented behavior - the API needs at least some search criteria to return results.

## Solution

### ✅ **1. Default Search Query**
```typescript
// In src/lib/api/scryfall.ts
export async function searchCards(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  try {
    // Validate and clean the query
    const cleanQuery = query?.trim() || '';
    
    // If no query provided, use a default search that returns popular cards
    const searchQuery = cleanQuery || '*';
    
    // Build search query
    const searchParams = new URLSearchParams({
      q: searchQuery, // Now guaranteed to be non-empty
      page: page.toString(),
      format: 'json',
      order: order,
      dir: dir,
    });
```

**Key Changes:**
- ✅ **Query Validation**: Trim and validate input queries
- ✅ **Default Fallback**: Use `*` (wildcard) when no query provided
- ✅ **Scryfall Compatible**: `*` returns all cards, which is what we want for browsing

### ✅ **2. Advanced Search Fix**
```typescript
// In src/lib/api/scryfall.ts
export async function advancedSearch(query: string = '', filters: AdvancedSearchFilters = {}) {
  // ... filter processing ...
  
  const finalQuery = searchQuery.trim();
  // If no query and no filters, use default search
  const queryToUse = finalQuery || '*';
  return searchCards(queryToUse, options);
}
```

**Key Changes:**
- ✅ **Final Validation**: Check the complete query after filter processing
- ✅ **Fallback Logic**: Use wildcard when no criteria specified
- ✅ **Consistent Behavior**: Always pass valid queries to `searchCards`

### ✅ **3. Initial Load Fix**
```typescript
// In src/app/cards/page.tsx
useEffect(() => {
  // Load initial cards with a default search that shows popular/expensive cards
  performSearch('*', { ...filters, sortBy: 'price', sortOrder: 'desc' }, 1, false);
}, []);
```

**Key Changes:**
- ✅ **Explicit Wildcard**: Use `*` instead of empty string
- ✅ **Intentional Behavior**: Show popular/expensive cards on initial load
- ✅ **User Experience**: Immediate content instead of empty state

### ✅ **4. Enhanced Error Handling**
```typescript
// In src/lib/api/scryfall.ts
const response = await rateLimitedFetch(url);

if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  throw new Error(`Scryfall API error: ${response.status} - ${errorData.details || response.statusText}`);
}
```

**Key Changes:**
- ✅ **Detailed Errors**: Extract error details from Scryfall API responses
- ✅ **Better Debugging**: Include status codes and specific error messages
- ✅ **Graceful Fallbacks**: Handle cases where error response can't be parsed

## Results

### 🎉 **Before Fix**
```
❌ Error: HTTP error! status: 400
❌ Empty cards page on initial load
❌ Generic error messages
❌ Poor user experience
```

### 🎉 **After Fix**
```
✅ No more 400 errors
✅ Cards page loads with popular cards immediately
✅ Detailed error messages when issues occur
✅ Smooth user experience
✅ Scryfall API compliant requests
```

## Technical Details

### **Scryfall Search Syntax**
- `*` = **Wildcard search** (returns all cards)
- `q=` = **Empty query** (invalid, returns 400)
- `q=lightning` = **Text search** (returns matching cards)
- `q=type:creature` = **Filter search** (returns creatures)

### **Search Flow**
```
User Action → Query Processing → API Call → Results
     ↓              ↓              ↓         ↓
Empty query → '*' wildcard → Valid API → Popular cards
Text query → Validated → Search API → Matching cards
Filters only → Build query → Advanced API → Filtered cards
```

### **Error Prevention**
1. **Input Validation**: Always trim and validate queries
2. **Default Fallbacks**: Use wildcards for empty queries
3. **API Compliance**: Follow Scryfall API requirements
4. **Error Context**: Provide meaningful error messages

## Testing

### **Test Cases Covered**
✅ **Empty query search** - Now returns popular cards
✅ **Initial page load** - Shows expensive cards immediately
✅ **Advanced search with no filters** - Returns all cards
✅ **Text search** - Works as before
✅ **Filter-only search** - Builds proper query
✅ **Error scenarios** - Shows detailed error messages

### **User Experience**
✅ **Fast initial load** - No more waiting for user input
✅ **Immediate content** - Popular cards shown by default
✅ **Clear error messages** - When something goes wrong
✅ **Smooth interactions** - No unexpected 400 errors

## Prevention

### **Code Practices**
1. **Always validate API inputs** before sending requests
2. **Use meaningful defaults** instead of empty values
3. **Handle edge cases** explicitly in the code
4. **Test empty/null scenarios** during development
5. **Follow API documentation** requirements strictly

### **Monitoring**
- Monitor for 400 errors in production
- Track search success rates
- Log query patterns for optimization
- Alert on unusual error spikes

The fix ensures the MTG Index app provides a smooth, error-free browsing experience while maintaining full compatibility with the Scryfall API requirements.
