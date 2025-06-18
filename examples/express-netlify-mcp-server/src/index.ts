import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import path from 'path';
import { descopeMcpAuthRouter, descopeMcpBearerAuth } from "@descope/mcp-express";
import { createMcpServerAndTransport } from "./create-server.js";

dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(cors({
  origin: true,
  methods: '*',
  allowedHeaders: 'Authorization, Origin, Content-Type, Accept, *',
}));
app.options("*", cors());

// Descope MCP Auth
app.use(descopeMcpAuthRouter());
app.use(["/mcp"], descopeMcpBearerAuth());

// Use shared MCP server and transport
const { server, transport } = createMcpServerAndTransport();

// MCP endpoint
app.post('/mcp', async (req: Request, res: Response) => {
  console.log('Received MCP request:', req.body);
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Server setup
const setupServer = async () => {
  try {
    await server.connect(transport);
    console.log('Server connected successfully');
  } catch (error) {
    console.error('Failed to set up the server:', error);
    throw error;
  }
};

// Start server
setupServer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });