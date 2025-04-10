# AR Q&A Client

A React and Three.js based mobile-compatible web application for uploading question images and getting answers.

## Features

- Capture images using device camera
- Upload images from gallery
- 3D background using Three.js
- Mobile-responsive design
- Real-time image processing and answer display

## Prerequisites

- Node.js 16.x or higher
- npm or yarn

## Setup

1. Install dependencies:
```bash
npm install
# or and 
yarn
```

2. Start the development server:
```bash
npm run dev
# or
yarn dev
```

3. Open the application in your browser:
- Local: http://localhost:5173
- Network: http://[your-ip]:5173

## API Integration

The application expects a backend server running at the same host with an `/ask` endpoint that accepts POST requests with multipart/form-data containing an image file. The response should be in the format:

```json
{
  "status": "success" | "error",
  "answer": "string"
}
```

## Technologies Used

- React
- Three.js (@react-three/fiber)
- TypeScript
- Tailwind CSS
- Vite
- Axios

## Development

To build for production:

```bash
npm run build
# or
yarn build
```

## License

MIT
