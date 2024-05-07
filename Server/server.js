const http = require("http");
const path = require("path");
const fs = require("fs");

//Conexiones:
const connections = [];
const conexionsSockets = {};
const list = [];

const server = http.createServer((req, res)=>{
    let filePath = path.join(__dirname, req.url);

    if (req.url === "/register" && req.method === "POST") {
        handleRegister(req, res);
        return;
    }

    if (req.url === "/login" && req.method === "POST") {
        handleLogin(req, res);
        return;
    }

    fs.access(filePath,fs.constants.F_OK,(error)=>{
        if(error){
            res.write("recurs inexistent ")
            res.end();
            return;
        }
        fs.readFile(filePath, (error, data)=>{
            if(error){
                res.write("mo s 'ha pogut llegir el recurs ")
                res.end();
                return;
            }
            res.write(data);
            res.end();
            return;
        })
        
    })

})
server.on("request", function (req, res) {
    // Permitir solicitudes desde cualquier origen
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Configurar cabeceras necesarias para las solicitudes POST
    res.setHeader("Access-Control-Allow-Methods", "POST");

    // Configurar cabeceras para permitir ciertos tipos de contenido
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
    }
});  


server.listen(8089, ()=>{
    console.log("Server iniciat a 8089")
})


// En el manejo de la solicitud "/register":
function handleRegister(req, res) {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk.toString();
    });
    req.on("end", () => {
        try {
            const user = JSON.parse(body);

            const usersFilePath = path.join(__dirname, "arxiu.json");
            const usersData = fs.readFileSync(usersFilePath, "utf8");
            let users = JSON.parse(usersData);  

            const existingUser = users.find((u) => u.nick === user.nick);
            if (existingUser) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "El usuario ya existe" }));
                console.log("El usuario ya existe");
                return;
            }

            users.push(user);
            fs.writeFileSync(usersFilePath, JSON.stringify(users));

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: "Usuario registrado correctamente" }));
            console.log("Usuario registrado correctamente:", user);
            nick = user.nick
            list.push(nick);
            sendMessageToAllClients(user.nick , " se ha conectado", list);
        } catch (error) {
            console.error("Error al procesar la solicitud de registro:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Error interno del servidor" }));
        }
    });
}

// En el manejo de la solicitud "/login":
function handleLogin(req, res) {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk.toString();
    });
    req.on("end", () => {
        try {
            const user = JSON.parse(body);

            const usersFilePath = path.join(__dirname, "arxiu.json");
            const usersData = fs.readFileSync(usersFilePath, "utf8");
            let users = JSON.parse(usersData);  

            const existingUser = users.find((u) => u.nick === user.nick);
            if (!existingUser || existingUser.pass !== user.pass) {
                res.writeHead(401, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Credenciales inválidas" }));
                console.log("Credenciales inválidas");
                return "Credenciales inválidas";
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: "Inicio de sesión exitoso" }));
            console.log("Inicio de sesión exitoso:", user);
            nick = user.nick
            list.push(nick);
            sendMessageToAllClients(user.nick, " se ha conectado", list);
        } catch (error) {
            console.error("Error al procesar la solicitud de inicio de sesión:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Error interno del servidor" }));
        }
    });
}


function sendMessageToAllClients(nick, message, list) {
    connections.forEach(connection => {
        connection.send(JSON.stringify({ type: "broadcast", data: { nick, message } }));
        connection.send(JSON.stringify({type: "list", data: list}))
    });
    console.log(list);
}
function sendMessagePrivate(nick, message, desti) {
    conexionsSockets[desti].send(JSON.stringify({type: "private", data: {nick, message, desti}}))
    conexionsSockets[nick].send(JSON.stringify({type: "private", data: {nick, message, desti}}))
    console.log(nick, message, desti);
}


const WebSocketServer = require("websocket").server
const ws_server = new WebSocketServer({httpServer:server,autoAcceptConnections:false});

ws_server.on("request", (request) => {
    const connexio = request.accept(null, request.origin);
    connexio.nick = ""; // Inicializar la propiedad nick en la conexión WebSocket
    // Configurar encabezados CORS para las conexiones WebSocket
    connexio.socket.setNoDelay(true); // Configurar sin demora
    connexio.socket.setTimeout(3600000); // 1 hora de tiempo de espera

    // Permitir solicitudes desde cualquier origen
    connexio.socket.setHeader("Access-Control-Allow-Origin", "*");

    // Configurar cabeceras necesarias para las solicitudes POST
    connexio.socket.setHeader("Access-Control-Allow-Methods", "POST");

    // Configurar cabeceras para permitir ciertos tipos de contenido
    connexio.socket.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Enviar respuesta de aprobación
    connexio.socket.writeHead(200);
    connexio.socket.end();
    connexio.on("message", (msg) => {
        console.log("Mensaje recibido:", msg.utf8Data);

        try {
            const msg_json = JSON.parse(msg.utf8Data);
             if (msg_json && msg_json.type === "user_disconnected") {
                const nick = msg_json.data.nick;
                const message = msg_json.data.message;
                console.log("Usuario desconectado:", nick);
                sendMessageToAllClients(nick, message, list); 
            } else if (msg_json && msg_json.type === "send_all") {
                const sender = msg_json.data.nick;
                const message =msg_json.data.message;
                console.log("Mensaje enviado a todos:", message);
                sendMessageToAllClients(sender, message, list);
            }  else if (msg_json && msg_json.type === "send_private") {
                const sender = msg_json.data.nick;
                const message =msg_json.data.message;
                const desti = msg_json.data.destination;
                console.log("Mensaje enviado a " + desti + ":", message);
                sendMessagePrivate(sender, message, desti);
            } else if(msg_json && msg_json.type === "get_user_list"){
                connexio.send(JSON.stringify({type: "list", data: list}))
            }else if(msg_json && msg_json.type === "challenge"){
                const nick = msg_json.data.nick;
                const message =msg_json.data.message;
                const desti = msg_json.data.destination;
                conexionsSockets[desti].send(JSON.stringify({type: "challenge", data: {nick, message, desti}}))
                conexionsSockets[nick].send(JSON.stringify({type: "challenge", data: {nick, message, desti}}))
                console.log(message);
            }else if(msg_json && msg_json.type === "start_challenge"){
                const nick = msg_json.data.nick;
                const message =msg_json.data.message;
                const desti = msg_json.data.destination;
                conexionsSockets[desti].send(JSON.stringify({type: "start_challenge", data: {nick, message, desti}}))
                conexionsSockets[nick].send(JSON.stringify({type: "start_challenge", data: {nick, message, desti}}))
                console.log(message);
            }else if(msg_json && msg_json.type === "coordinates"){
                const nick = msg_json.data.nick;
                const desti = msg_json.data.destination;
                const coorderX = msg_json.data.coorderX;
                const coorderY = msg_json.data.coorderY;
                conexionsSockets[desti].send(JSON.stringify({type: "coordinates", data: {nick, desti, coorderX, coorderY}}))
                conexionsSockets[nick].send(JSON.stringify({type: "coordinates", data: {nick, desti, coorderX, coorderY}}))
                console.log(nick + "a marcado en " + coorderY+coorderX);
            }else if(msg_json && msg_json.type === "drop"){
                const nick = msg_json.data.nick;
                const desti = msg_json.data.destination;
                conexionsSockets[desti].send(JSON.stringify({type: "drop", data: {nick, desti}}))
                conexionsSockets[nick].send(JSON.stringify({type: "drop", data: {nick, desti}}))
                console.log(nick + "se ha rendido");
            }else {
                console.error("Mensaje recibido no válido:", msg.utf8Data);
            }
            const nick = msg_json.data.nick;
            console.log(nick);
            conexionsSockets[nick] = connexio;
            connexio.nick = nick;
        } catch (error) {
            console.error("Error al analizar el mensaje:", error);
        }
    });

    connexio.on("close", () => {
        console.log("Conexión cerrada por", connexio.nick || "un usuario desconocido");
        // console.log(connections.indexOf(connexio));
        // console.log(conexionsSockets);
        if (connexio.nick) {
            const disconnectedUser = connexio.nick;
            connections.splice(connections.indexOf(connexio), 1);
            delete conexionsSockets[disconnectedUser];
            const id = list.indexOf(disconnectedUser);
            if (id !== -1) {
                list.splice(id, 1);
            }
            sendMessageToAllClients(disconnectedUser, ` se ha desconectado`, list);
        }
    });
    connections.push(connexio);
});