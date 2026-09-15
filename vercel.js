{
  "version": 2,
  "builds": [
    { "src": "api/chat.js", "use": "@vercel/edge" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" }
  ]
}
