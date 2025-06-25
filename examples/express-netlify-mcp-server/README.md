# Express MCP Server with Stateless Streamable HTTP Transport and Descope MCP Auth SDK

![Descope Banner](https://github.com/descope/.github/assets/32936811/d904d37e-e3fa-4331-9f10-2880bb708f64)

## Introduction

This example shows how to add auth to a Streamable HTTP MCP Server using Descope's MCP Auth SDK (Express) and deploy it to Netlify. It handles fetching weather-related data.

## Deployment

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/anvibanga/ai&create_from_path=examples/express-netlify-mcp-server)

You can connect to the server using the [Cloudflare Playground](https://playground.ai.cloudflare.com/), [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) or any other MCP client. Be sure to include the `/mcp` path in the connection URL.

## Features

- Real-time weather data streaming
- Secure authentication using Descope
- MCP Authorization Compliant

## Requirements

Before proceeding, make sure you have the following:

- [Node.js](https://nodejs.org/) (version 18 or later)
- A valid Descope [Project ID](https://app.descope.com/settings/project) and [Management Key](https://app.descope.com/settings/company/managementkeys)
- The Descope Inbound Apps feature enabled
- Git installed

## Running the Server

First, add the environment variables in a `.env` file at the root:

```bash
DESCOPE_PROJECT_ID=      # Your Descope project ID
DESCOPE_MANAGEMENT_KEY=  # Your Descope management key
SERVER_URL=             # The URL where your server is hosted
```

Then, install dependencies:

```bash
npm i
```

Finally, run the server:

```bash
npm run dev
```

The server will start on port 3000 (or the port specified in your environment variables).

## API Endpoints

- `GET /mcp`: Handles incoming messages for the MCP protocol

## Authentication

The server uses Descope for authentication. All MCP endpoints except the authentication router require a valid bearer token.


![Netlify Examples](https://github.com/netlify/examples/assets/5865/4145aa2f-b915-404f-af02-deacee24f7bf)

# MCP example Netlify Express

**View this demo site**: https://mcp-example-express.netlify.app/

[![Netlify Status](https://api.netlify.com/api/v1/badges/f15f03f9-55d8-4adc-97d5-f6e085141610/deploy-status)](https://app.netlify.com/sites/mcp-example-express/deploys)



## About this example site

This site shows a very a basic example of developing and running serverless MCP using Netlify Functions. It includes links to a deployed serverless function and an example of accessing the function using a customized URL.

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Docs: Netlify Functions](https://docs.netlify.com/functions/overview/?utm_campaign=dx-examples&utm_source=example-site&utm_medium=web&utm_content=example-mcp-express)
- [Agent Experience (AX)](https://agentexperience.ax?utm_source=express-mcp-guide&utm_medium=web&utm_content=example-mcp-express)

Importantly, because of how Express handles mapping routes, ensure you set the `netlify.toml` redirects to the correct path. In this example we have the following to ensure <domain>/mcp catches all of the requests to this server:

```toml
[[redirects]]
  force = true
  from = "/mcp"
  status = 200
  to = "/.netlify/functions/express-mcp-server"
```



## Speedily deploy your own version

Deploy your own version of this example site, by clicking the Deploy to Netlify Button below. This will automatically:

- Clone a copy of this example from the examples repo to your own GitHub account
- Create a new project in your [Netlify account](https://app.netlify.com/?utm_medium=social&utm_source=github&utm_campaign=devex-ph&utm_content=devex-examples), linked to your new repo
- Create an automated deployment pipeline to watch for changes on your repo
- Build and deploy your new site
- This repo can then be used to iterate on locally using `netlify dev`

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/netlify/examples/&create_from_path=examples/mcp/express-mcp&utm_campaign=dx-examples)


## Install and run the examples locally

You can clone this entire examples repo to explore this and other examples, and to run them locally.

```shell

# 1. Clone the examples repository to your local development environment
git clone git@github.com:netlify/examples

# 2. Move into the project directory for this example
cd examples/mcp/express-mcp

# 3. Install the Netlify CLI to let you locally serve your site using Netlify's features
npm i -g netlify-cli

# 4. Serve your site using Netlify Dev to get local serverless functions
netlify dev

# 5. While the site is running locally, open a separate terminal tab to run the MCP inspector or client you desire
npx @modelcontextprotocol/inspector npx mcp-remote@next http://localhost:8888/mcp

```


