import { Handler } from '@netlify/functions';
import { createMcpServerAndTransport } from '../../src/create-server.js';

const { server, transport } = createMcpServerAndTransport();

// Netlify handler for MCP HTTP streaming
const handler: Handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed.'
        },
        id: null
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // Parse JSON body
  let body: any;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
        },
        id: null,
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // Create mock req/res objects for the transport
  const req = {
    method: event.httpMethod,
    headers: event.headers,
    body,
    url: event.rawUrl || event.path,
  } as any;

  let responseBody = '';
  let statusCode = 200;
  let headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // Create a mock res object to capture streaming output
  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    write: (chunk: any) => {
      responseBody += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    },
    end: (chunk?: any) => {
      if (chunk) res.write(chunk);
    },
    headersSent: false,
  } as any;

  try {
    await server.connect(transport); // Ensure server is connected (idempotent)
    await transport.handleRequest(req, res, body);
    return {
      statusCode,
      body: responseBody,
      headers,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

export { handler }; 