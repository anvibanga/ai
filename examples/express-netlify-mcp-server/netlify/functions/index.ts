import { Handler } from '@netlify/functions';
import serverless from 'serverless-http';
import { app } from '../../src/index.js';

const serverlessHandler = serverless(app);

export const handler: Handler = async (event, context) => {
  const result = await serverlessHandler(event, context) as any;
  return {
    ...result,
    statusCode: result.statusCode || 200
  };
}; 