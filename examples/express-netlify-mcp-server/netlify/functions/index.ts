import { Context } from '@netlify/functions';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "../../src/create-server.js";
import type { HandlerEvent, HandlerResponse } from '@netlify/functions';

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

const { server } = createServer();

export default async function handler(
  event: HandlerEvent,
  context: Context
): Promise<HandlerResponse> {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Max-Age': '86400',
      },
    };
  }

  if (!server.isConnected) {
    await server.connect(transport);
  }

  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      // Create mock req/res objects
      const req = {
        method: event.httpMethod,
        headers: event.headers,
        body
      };

      let responseBody = '';
      const res = {
        setHeader: () => {},
        write: (chunk: string) => {
          responseBody += chunk;
        },
        end: () => {}
      };

      await transport.handleRequest(req as any, res as any, body);

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Content-Type': 'application/json',
        },
        body: responseBody
      };
    }

    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed',
        },
        id: null,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      }),
    };
  }
}

export const config = {
  path: "/mcp"
}; 