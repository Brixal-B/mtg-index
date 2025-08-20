import { NextRequest } from 'next/server';
import { proxyScryfallRequest, scryfallProxyConfigs } from '@/lib/api/scryfallProxy';

// Required for static export
export const dynamic = 'force-static';
export const revalidate = 300; // Revalidate every 5 minutes

export async function GET(request: NextRequest) {
  return proxyScryfallRequest(request, scryfallProxyConfigs.search);
}
