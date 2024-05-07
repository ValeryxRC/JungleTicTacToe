let socket;
const connectedUsers = new Set();
let x = "";
let o = "";

document.getElementById("btn_register").addEventListener("click", registerUser);
document.getElementById("btn_login").addEventListener("click", loginUser);
document.getElementById("sendAllButton").addEventListener("click", sendAll);
const inp_nick = document.getElementById("nick");
const inp_pass = document.getElementById("pass");
const inp_msg = document.getElementById("messageInput");
const userCont = document.getElementById("cont_users");

function startConexion() {
    if (socket) {
        socket.onclose = () => {
            console.log("Conexión WebSocket cerrada");
        };
    }
    socket = new WebSocket("ws://server-iota-taupe.vercel.app");
    socket.onopen = () => {
        console.log("Conexión WebSocket establecida");
    };
}

function registerUser() {
    let user = { nick: inp_nick.value, pass: inp_pass.value };
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
    };
    const url = 'https://server-iota-taupe.vercel.app/register';
    return fetch(url, options)
        .then(response => {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                return response.text();
            }
        })
        .then(data => {
            console.log(data);
            if (data.error) {
                error("El usuario ya existe");
            }
            if (data.message) {
                if (socket) {
                    const closeMessage = {
                        type: "user_disconnected",
                        data: {
                            nick: socket.nick, 
                            message: "¡Se ha desconectado del chat!"
                        }
                    };
                    addMessageToChat(closeMessage.data.nick, closeMessage.data.message);
                    socket.send(JSON.stringify(closeMessage));
                    socket.close();
                }
                startWebSocket(user.nick);
            } else {
                console.error(data.error);
            }
        })
        .catch(error => {
            console.error('Error en la solicitud de registro:', error);
        });
}

function loginUser() {
    let user = { nick: inp_nick.value, pass: inp_pass.value };
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
    };
    const url = 'https://server-iota-taupe.vercel.app/login';
    return fetch(url, options)
        .then(response => {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                return response.text();
            }
        })
        .then(data => {
            console.log(data);
            if (data.error) {
                error("Credenciales Invalidas");
            }
            if (data.message) {
                if (socket) {
                    const closeMessage = {
                        type: "user_disconnected",
                        data: {
                            nick: socket.nick, 
                            message: "¡Se ha desconectado del chat!"
                        }
                    };
                    addMessageToChat(closeMessage.data.nick, closeMessage.data.message);
                    socket.send(JSON.stringify(closeMessage));
                    socket.close();
                }
                startWebSocket(user.nick);
            } else {
                console.error(data.error);
            }
        })
        .catch(error => {
            console.error('Error en la solicitud de inicio de sesión:', error);
        });
}

function startWebSocket(nick) {
    
    socket = new WebSocket("ws://server-iota-taupe.vercel.app");
    socket.nick = nick;
    socket.onopen = () => {
        console.log("Conexión WebSocket establecida");
        const ws_message = {
            type: "user_connected",
            data: {
                nick: nick,
                message: " se ha conectado"
            }
        };
        addMessageToChat(ws_message.data.nick, ws_message.data.message);
        socket.send(JSON.stringify(ws_message));
        const userListMessage = {
            type: "get_user_list",
            data:{
                nick: nick
            }
        };
        socket.send(JSON.stringify(userListMessage));
    };
    socket.onmessage = (event) => {
        console.log("Mensaje recibido del servidor:", event.data);
        try {
            const msg = JSON.parse(event.data);
            document.getElementById("dropMensaje").innerHTML = "";
            if (msg.type === "broadcast" && msg.data && msg.data.message) {
                const nick = msg.data.nick;
                const message = msg.data.message;
                addMessageToChat(nick, message);
                
            }
            if (msg.type === "private" && msg.data && msg.data.message) {
                const nick = msg.data.nick;
                const message = msg.data.message;
                const destination = msg.data.desti;
                addMessageToChatPrivate(nick, message,destination);
            }
            if (msg.type === "list" && msg.data) {
                const userList = msg.data;
                listUsersConnect(userList);
            }
            if (msg.type === "challenge" && msg.data) {
                const nick = msg.data.nick;
                const message = msg.data.message;
                const destination = msg.data.desti
                if(socket.nick == destination){
                    $('#confirmationModal').modal('show');
                    const modalBody = document.getElementById("message_challenge");
                    modalBody.innerHTML = `${nick} te ha desafiado a un juego`;
                    document.getElementById("Aceptar").addEventListener("click", function(){
                        const start_challenge = {
                            type: "start_challenge",
                            data: {
                                nick: socket.nick, 
                                message: socket.nick + " ha aceptado el desafio a" + nick,
                                destination: nick
                            }
                        };
                        socket.send(JSON.stringify(start_challenge));
                    })
                }
            }   
            if (msg.type === "start_challenge" && msg.data) {
                const nick = msg.data.nick;
                const message = msg.data.message;
                const destination = msg.data.desti
                document.getElementById("turno").innerHTML = "WAIT YOUR TURN";
                document.getElementById("ticTacToeModal").destino= destination;
                x = nick;
                o = destination;
                if(socket.nick == destination){
                    $('#ticTacToeModal').modal('show');
                    document.getElementById("turno").innerHTML = "YOUR TURN";
                    document.getElementById("ticTacToeModal").destino= nick;
                }
            }      
            if (msg.type === "coordinates" && msg.data) {
                const nick = msg.data.nick;
                const desti = msg.data.desti;
                const coorderX = msg.data.coorderX;
                const coorderY = msg.data.coorderY;
                let id = coorderY+coorderX;
                const div = document.getElementById(id);
                div.setAttribute("use", "true");
                div.turn = nick;
                if(nick == socket.nick){
                    if(x == nick)div.style.backgroundImage = "url('assets/x.png')";
                    else div.style.backgroundImage = "url('assets/cero.jpg')";
                    if(checkWinner()){
                        $('#ticTacToeModal').modal('hide');
                        mensajeGanador(nick);
                    }
                    document.getElementById("turno").innerHTML = "WAI YOUR TURN";
                }else{
                    if(x == nick)div.style.backgroundImage = "url('assets/x.png')";
                    else div.style.backgroundImage = "url('assets/cero.jpg')";
                    if(checkWinner()){
                        $('#ticTacToeModal').modal('hide');
                        mensajeGanador(nick);
                    }
                        document.getElementById("turno").innerHTML = "YOUR TURN";
                }
            }
            if (msg.type === "drop" && msg.data) {
                const nick = msg.data.nick;
                const destination = msg.data.desti
                $('#ticTacToeModal').modal('hide');
                document.getElementById("dropMensaje").innerHTML = nick + " quit the game!"
                mensajeGanador(destination);
            }        
        } catch (error) {
            console.error("Error al analizar el mensaje:", error);
        }
    };
    
    socket.onclose = () => {
        console.log("Conexión WebSocket cerrada");
    };
    
    
}

function addMessageToChat(nick, message) {
    closeAllModals();
    const chatContainer = document.getElementById("chat_contein");
    const newMessageDiv = document.createElement("div");
    const newMessageHeader = document.createElement("h4");
    const newMessageParagraph = document.createElement("p");
    const color = getColorForNick(nick);
    if (message.includes("se ha desconectado") || message.includes(" se ha conectado")) {
        newMessageDiv.classList.add("msg_center");
    }
    if (nick === socket.nick){
        newMessageDiv.classList.add("you");
        newMessageHeader.innerHTML = `<h4 style="color:${color}">Tu</h4>`;
    }else newMessageHeader.innerHTML = `<h4 style="color:${color}">${nick}</h4>`;
    newMessageParagraph.textContent = message;
    newMessageDiv.appendChild(newMessageHeader);
    newMessageDiv.appendChild(newMessageParagraph);
    chatContainer.appendChild(newMessageDiv);
}


function sendAll(){
    const sendToAll = {
        type: "send_all",
        data: {
            nick: socket.nick, 
            message: inp_msg.value
        }
    };
    socket.send(JSON.stringify(sendToAll));
}

function getColorForNick(nick) {
    const hues = [0, 60, 120, 180, 240, 300, 30, 90, 150, 210, 270, 330]; 
    const hueStep = 360 / hues.length;
    const hash = hashCode(nick);
    const hueIndex = Math.abs(hash) % hues.length;
    const hueVariation = Math.random() * 30 - 15;
    const hue = (hues[hueIndex] + hueVariation + 360) % 360; 
    return `hsl(${hue}, 100%, 50%)`;
}

function hashCode(str) {
    let hash = 0;
    if (str.length === 0) {
        return hash;
    }
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash);
}

function scrollDown() {
    var chat = $('#block_chat');
    chat.scrollTop(chat.prop("scrollHeight"));
}

$(document).ready(function() {
    scrollDown();
});

$('#block_chat').on('DOMNodeInserted', function() {
    scrollDown();
});


function listUsersConnect(names) {
    const container = document.getElementById("cont_users");
     container.innerHTML = "";
     document.getElementById("chats-private").innerHTML="";
    names.forEach(name => {
        if (name != socket.nick){
            const div = document.createElement("div");
            const h4 = document.createElement("h4");
            const startChatButton = document.createElement("button");
            const challengeButton = document.createElement("button");
            startChatButton.classList.add("btn-primary");
            startChatButton.classList.add("btn");
            challengeButton.classList.add("btn-success");
            challengeButton.classList.add("btn");
            h4.innerHTML = name;
            startChatButton.textContent = "Iniciar Chat";
            startChatButton.setAttribute("data-bs-toggle", "modal");
            startChatButton.setAttribute("data-bs-target", "#messageModal_"+name);
            challengeButton.textContent = "Desafiar";
            div.classList.add("user-container");
            div.appendChild(h4);
            div.appendChild(startChatButton);
            div.appendChild(challengeButton);
            container.appendChild(div);
            challengeButton.addEventListener("click", function(){
                challenge(name);
            });
            createModal(name);
        }
        
    });
}
$(document).ready(function () {
    $('#Rechazar').on('click', function () {
        $('#confirmationModal').modal('hide');
    });
    $('#Aceptar').on('click', function () {
        $('#confirmationModal').modal('hide');
        $('#ticTacToeModal').modal('show'); 
        $('#ticTacToeModal').on('hidden.bs.modal', function () {
            $('body').removeClass('modal-open'); 
            $('.modal-backdrop').remove();
        });
    });
});




function privatechat(name){

    const input = document.getElementById(`messageInputModal_${name}`).value;
    sendPrivateMesagge(name, input);
}


function sendPrivateMesagge(name, message){
    const sendPrivate = {
        type: "send_private",
        data: {
            nick: socket.nick, 
            message: message, 
            destination: name
        }
    };
    socket.send(JSON.stringify(sendPrivate));
}

function addMessageToChatPrivate(nick, message,destination) {
    let chatContaine = ""
    if(socket.nick != nick){
        chatContainer = document.getElementById(`chat_containM_${nick}`);
    }else{
        chatContainer = document.getElementById(`chat_containM_${destination}`);
    }
    const newMessageDiv = document.createElement("div");
    const newMessageHeader = document.createElement("h4");
    const newMessageParagraph = document.createElement("p");
    if (nick === socket.nick){
        newMessageDiv.classList.add("you");
        newMessageHeader.innerHTML = `<h4 style="color:green">Tu</h4>`;
    }else newMessageHeader.innerHTML = `<h4 style="color:blue">${nick}</h4>`;
    newMessageParagraph.textContent = message;
    newMessageDiv.appendChild(newMessageHeader);
    newMessageDiv.appendChild(newMessageParagraph);
    chatContainer.appendChild(newMessageDiv);
}

function createModal(name) {
    const modalId = `messageModal_${name}`;
    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.setAttribute("tabindex", "-1");
    modal.id = modalId;
    const modalDialog = document.createElement("div");
    modalDialog.classList.add("modal-dialog");
    const modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");
    const modalHeader = document.createElement("div");
    modalHeader.classList.add("modal-header");
    const modalTitle = document.createElement("h5");
    modalTitle.classList.add("modal-title");
    modalTitle.id = "titleUser";
    modalTitle.textContent = "SEND MESSAGE TO " + name;
    modalHeader.appendChild(modalTitle);
    modalContent.appendChild(modalHeader);
    const modalBody = document.createElement("div");
    modalBody.classList.add("modal-body");
    const blockChat = document.createElement("div");
    blockChat.id = "block_chat";
    const chatContainer = document.createElement("div");
    chatContainer.id = `chat_containM_${name}`;
    blockChat.appendChild(chatContainer);
    const messageInput = document.createElement("input");
    messageInput.type = "text";
    messageInput.id = `messageInputModal_${name}`;
    messageInput.placeholder = "SEND MESSAGE";
    const sendButton = document.createElement("button");
    sendButton.classList.add("btn", "btn-success");
    sendButton.id = "sendButtonModal";
    sendButton.textContent = "SEND";
    modalBody.appendChild(blockChat);
    modalBody.appendChild(messageInput);
    modalBody.appendChild(sendButton);
    modalContent.appendChild(modalBody);
    const modalFooter = document.createElement("div");
    modalFooter.classList.add("modal-footer");
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.classList.add("btn", "btn-danger");
    closeButton.setAttribute("data-bs-dismiss", "modal");
    closeButton.textContent = "CLOSE";
    modalFooter.appendChild(closeButton);
    modalContent.appendChild(modalFooter);
    modalDialog.appendChild(modalContent);
    modal.appendChild(modalDialog);
    document.getElementById("chats-private").appendChild(modal);
    sendButton.addEventListener("click", function() {
        privatechat(name);
    });

    return modal;
}
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
    });
}

function challenge(name){
    const challenge = {
        type: "challenge",
        data: {
            nick: socket.nick, 
            message: socket.nick + " ha desafiado a " + name,
            destination: name
        }
    };
    socket.send(JSON.stringify(challenge));
}
function sendGeographicalCoordinates(name, coorderY, coorderX){
    const geographical = {
        type: "coordinates",
        data: {
            nick: socket.nick, 
            coorderY: coorderY,
            coorderX: coorderX,
            destination: name
        }
    };
    socket.send(JSON.stringify(geographical));
}

function enviarPosicion(y,x){
    const turn = document.getElementById("turno");
    const desti = document.getElementById("ticTacToeModal").destino;
    let id = y+x;
    const div = document.getElementById(id).getAttribute("use");
    if (turn.innerHTML == "YOUR TURN" && div == "false") {
        sendGeographicalCoordinates(desti,y, x)
    }
}

function checkWinner() {
    const rows = [
        ['aa', 'ab', 'ac'],
        ['ba', 'bb', 'bc'], 
        ['ca', 'cb', 'cc'],
        ['aa', 'ba', 'ca'], 
        ['ab', 'bb', 'cb'], 
        ['ac', 'bc', 'cc'], 
        ['aa', 'bb', 'cc'],
        ['ac', 'bb', 'ca'] 
    ];
    for (let i = 0; i < rows.length; i++) {
        const [a, b, c] = rows[i];
        const divA = document.getElementById(a);
        const divB = document.getElementById(b);
        const divC = document.getElementById(c);
        const valueA = divA.style.backgroundImage;
        const valueB = divB.style.backgroundImage;
        const valueC = divC.style.backgroundImage;
        if (valueA !== '' && valueA === valueB && valueB === valueC) {
            console.log("ganador: " + divA.turn );
            return true;
        }
    }
    return false;
}

function mensajeGanador(name) {
    document.getElementById("ganadorMensaje").innerHTML = `¡El usuario ${name} ha ganado!`;
    if(socket.nick == name)document.getElementById("back").style.backgroundColor = "forestgreen";
    else document.getElementById("back").style.backgroundColor = "firebrick";
    $('#ganadorModal').modal('show');
    setTimeout(function () {$('#ganadorModal').modal('hide');reiniciarTablero();}, 2000);
}

function reiniciarTablero() {
    $('.c').each(function() {
        $(this).css('background-image', '');
        $(this).attr('use', 'false');
        $(this).turn = "";
    });
}
function drop(){
    let name =document.getElementById("ticTacToeModal").destino;
    const drop = {
        type: "drop",
        data: {
            nick: socket.nick, 
            destination: name
        }
    };
    socket.send(JSON.stringify(drop));
}

function error(message) {
    closeAllModals();
    const chatContainer = document.getElementById("chat_contein");
    const newMessageDiv = document.createElement("div");
    const newMessageHeader = document.createElement("h4");
    const newMessageParagraph = document.createElement("p");
    newMessageParagraph.style.color = "red";
    newMessageParagraph.style.textAlign = "center";
    if (message.includes("se ha desconectado") || message.includes(" se ha conectado")) newMessageDiv.classList.add("msg_center");
    newMessageParagraph.textContent = message;
    newMessageDiv.appendChild(newMessageHeader);
    newMessageDiv.appendChild(newMessageParagraph);
    chatContainer.appendChild(newMessageDiv);
}
