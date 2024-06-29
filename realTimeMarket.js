const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
    ws.on('message', message => {
        console.log('Received message:', message);
        // Process buy/sell/trade orders here
    });

    // Simulated stock data update
    setInterval(() => {
        ws.send(JSON.stringify({ stock: 'Stock 1', price: Math.random() * 100 }));
    }, 1000);
});

module.exports = wss;