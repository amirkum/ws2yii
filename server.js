const http = require('http');
const url = require('url');
const dotenv = require('dotenv');
const express = require('express');
const WebSocket = require('ws');
const fetch = require('node-fetch');

const result = dotenv.config();
if (result.error) {
    throw result.error;
}
const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 3000;
const secretKey = process.env.SECRET_KEY;
const app = express();

app.use(express.json());
const httpServer = http.createServer(app);

const wsServer = new WebSocket.Server({ server: httpServer });
wsServer.on('connection', async (ws, request) => {
    const query = url.parse(request.url, true).query;
    console.log(query);

    try {
        const response = await fetch('/auth', {
            method: 'POST',
            body: JSON.stringify({
                apiKey: query.apiKey,
                token: query.token
            }),
            headers: { 'Content-Type': 'application/json' },
        });
        if (response.status === 200) {
            const body = await response.json();
            console.log(body);
            ws.userId = body.userId;
            ws.send("Hello!");
        } else {
            ws.send('Отказано в доступе!');
            ws.close();
        }
    } catch (error) {
        ws.send('Отказано в доступе!');
        ws.close();
        console.error(error);
    }
});

app.post('/send', (request, response) => {
    const body = request.body;
    console.log(body);
    if (body.secretKey === secretKey) {
        response.status(200);
        if (body.broadcast) {
            wsServer.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(body.message);
                }
            });
        } else {
            for (client of wsServer.clients) {
                if (client.userId == body.userId && client.readyState === WebSocket.OPEN) {
                    client.send(body.message);
                    break;
                }
            }
        }
    } else {
        response.status(401);
    }

    response.end();
});

httpServer.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
