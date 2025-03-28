# Promixel - ASCII Portfolio Generator

A pixel art generation tool that uses RetroDiffusion API to create stunning pixel art images.

## Setup Instructions

1. Clone this repository
2. Install dependencies: `npm install`
3. Create a `.env.local` file in the root directory with your RetroDiffusion API key and Auth token:
   ```
   NEXT_PUBLIC_RETRODIFFUSION_API_KEY=rdpk-your-actual-api-key-here
   NEXT_PUBLIC_RETRODIFFUSION_AUTH_TOKEN=your-aws-cognito-jwt-token
   ```
   Make sure to use the raw API key string, without any formatting or quotes.
4. Run the development server: `npm run dev`
5. Open http://localhost:3000 in your browser

## API Integration

This application calls the RetroDiffusion API directly from the client side. The API key is stored in the `.env.local` file with the `NEXT_PUBLIC_` prefix to make it available to client-side code.

The API expected format is:
- Endpoint: `https://api.retrodiffusion.ai/inferences?input=...`
- Headers:
  - `X-RD-Token` should be your API key string (starts with "rdpk-")
  - `Authorization` should be a Bearer token for AWS Cognito authentication
- Payload: JSON encoded as a URL parameter

### About the Auth Token

The Authorization Bearer token is a JWT from AWS Cognito that RetroDiffusion uses for authentication. This token expires, so for production use, you would need to implement Cognito authentication to get fresh tokens, or contact RetroDiffusion for API documentation about obtaining tokens. For demo purposes, the provided token should work in the short term.

## Features

- Generate pixel art images from text prompts
- Download generated images
- View recent generations
- Responsive design for mobile and desktop 