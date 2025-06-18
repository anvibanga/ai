"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const mcp_express_1 = require("@descope/mcp-express");
const create_server_js_1 = require("./create-server.js");
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
const app = (0, express_1.default)();
// Middleware setup
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(process.cwd(), 'public')));
app.use((0, cors_1.default)({
    origin: true,
    methods: '*',
    allowedHeaders: 'Authorization, Origin, Content-Type, Accept, *',
}));
app.options("*", (0, cors_1.default)());
// Descope MCP Auth
app.use((0, mcp_express_1.descopeMcpAuthRouter)());
app.use(["/mcp"], (0, mcp_express_1.descopeMcpBearerAuth)());
// Use shared MCP server and transport
const { server, transport } = (0, create_server_js_1.createMcpServerAndTransport)();
// MCP endpoint
app.post('/mcp', async (req, res) => {
    console.log('Received MCP request:', req.body);
    try {
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
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
    }
    catch (error) {
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
