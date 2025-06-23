import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { createServer } from "../src/create-server.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Origin, Content-Type, Accept, X-Requested-With",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400"
};

// Netlify serverless function handler
export default async (req: Request) => {
  // Always add CORS headers to all responses
  const responseHeaders = { ...corsHeaders };

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: responseHeaders
    });
  }

  try {
    // Handle different HTTP methods
    if (req.method === "POST") {
      return handleMCPPost(req);
    } else if (req.method === "GET") {
      return handleMCPGet();
    } else if (req.method === "DELETE") {
      return handleMCPDelete();
    } else {
      return new Response("Method not allowed", { 
        status: 405,
        headers: responseHeaders
      });
    }
  } catch (error) {
    console.error("MCP error:", error);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      }),
      {
        status: 500,
        headers: { 
          ...responseHeaders,
          "Content-Type": "application/json" 
        }
      }
    );
  }
};

async function handleMCPPost(req: Request) {
  // Convert the Request object into a Node.js Request object
  const { req: nodeReq, res: nodeRes } = toReqRes(req);
  const { server } = createServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  const body = await req.json();
  await transport.handleRequest(nodeReq, nodeRes, body);

  nodeRes.on("close", () => {
    console.log("Request closed");
    transport.close();
    server.close();
  });

  const response = await toFetchResponse(nodeRes);
  // Add CORS headers to the response
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

function handleMCPGet() {
  console.log("Received GET MCP request");
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    }),
    {
      status: 405,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }
    }
  );
}

function handleMCPDelete() {
  console.log("Received DELETE MCP request");
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    }),
    {
      status: 405,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }
    }
  );
}

export const config = {
  path: "/mcp"
}; 