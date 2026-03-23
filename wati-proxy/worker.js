// Cloudflare Worker — WATI API CORS Proxy
// Forwards requests to WATI API and adds CORS headers so Airtable Interface Extensions can call it.

const ALLOWED_ORIGIN = '*'; // In production, restrict to your Airtable domain

export default {
    async fetch(request) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        const url = new URL(request.url);

        // The target WATI URL is passed as a query parameter: ?url=<encoded_wati_url>
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) {
            return new Response(JSON.stringify({error: 'Missing ?url= parameter'}), {
                status: 400,
                headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            });
        }

        try {
            // Forward the request to WATI
            const headers = new Headers();
            // Copy relevant headers from the original request
            if (request.headers.get('Authorization')) {
                headers.set('Authorization', request.headers.get('Authorization'));
            }
            if (request.headers.get('Content-Type')) {
                headers.set('Content-Type', request.headers.get('Content-Type'));
            }

            const proxyResponse = await fetch(targetUrl, {
                method: request.method,
                headers: headers,
                body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
            });

            // Return the response with CORS headers
            const responseHeaders = new Headers(proxyResponse.headers);
            responseHeaders.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
            responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

            return new Response(proxyResponse.body, {
                status: proxyResponse.status,
                statusText: proxyResponse.statusText,
                headers: responseHeaders,
            });
        } catch (err) {
            return new Response(JSON.stringify({error: err.message}), {
                status: 502,
                headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            });
        }
    },
};
