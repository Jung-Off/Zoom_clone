import http from "http";
import express from "express";
import { Server } from "socket.io";
// import SocketIo from "socket.io";
import { SocketAddress } from "net";
import { instrument } from "@socket.io/admin-ui";

// import WebSocket from "ws";



const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
// public file은 frontend에서 구동되는 코드
app.get("/", (req, res) => res.render("home"));
// console.log("hello");

//catch all url
app.get("/*", (req, res) => res.redirect("/"));
 
const handleListen = () => console.log(`Listening on http://localhost:3000`);
// app.listen(3000, handleListen);

// http에 access  http위에 websocket 서버
// 굳이 두게 만들 일 없어
const httpServer = http.createServer(app);
// const wsServer = SocketIo(httpServer); // socketio 설치
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
    },
});

instrument(wsServer, {
    auth: false
});

// http://localhost:3000/socket.io/socket.io.js
// 여러가지를 준다
// socketIO가 websocket의 부가기능이 아니다
// socketIO는 재연결 같은 부가기능이 있다.
// 너가 socketIO를 서버에 설치한 것 처럼 clinet에도 socketIO를 설치해야한다.

// 과거에는 back-end에 아무것도 설치할 필요가 없었다.
// 브라우저가 제공하는 websocket API를 사용하면 되었으니까
// 브라우저가 주는 websocket은 socketIO와 호환이 안됌!
// socketIO가 더 많은 기능을 주기 때문!
// 그래서 socket IO를 브라우저에 설치를 해야돼

// 그래서 위와 같은 URL을 준거고, front-end에서는 이걸 쉽게 import가능

// websocket api는 브라우저에 있어서 가볍고
// front, back에 soketio 설치!

function publicRooms() {
    const {sockets:{ adapter : { sids, rooms }, }, } = wsServer;
    // const sids = wsServer.sockets.adapter.sids;
    // const rooms = wsServer.sockets.adapter.rooms;
    const publicRooms = [];
    rooms.forEach((_, key) => {
        if (sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    });
    return publicRooms;
}

function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

//backend connection에서 받을 준비!
wsServer.on("connection", socket => {
    socket["nickname"] ="Anony"
    socket.onAny((event) => {
        console.log(wsServer.sockets.adapter);
        console.log(`Socket Event:${event}`);
    });
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName);
        done();
        //하나의 소켓에만
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        // setTimeout(() => {
        //     done("hello form the backend");
        //     // 여기서 코드를 실행하는 것이 아니고
        //     // frontend의 실행버튼 눌러주는 것!
        // }, 5000);

        //all 소켓에게
        wsServer.sockets.emit("room_change", publicRooms());
    });
    socket.on("disconnecting", () => {
        socket.rooms.forEach(room =>
            socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1)
        );
    });
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
    });
         
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    });
    socket.on("nickname", nickname => socket["nickname"] = nickname);
});
// web socket
// const wss = new WebSocket.Server( { server });

// const sockets = [];
// wss.on("connection", (socket) => {
//     // console.log(socket); // server.js의 socket은 연결된 브라우저
//     sockets.push(socket);
//     socket["nickname"] = "Anonymous"
//     console.log("Connected to Browser ✅");
//     socket.on("close", () => console.log("Disonnected from Broswer ❌"));
//     socket.on("message", (msg) => {
//         const message = JSON.parse(msg);
//         switch (message.type) {
//             case "new_message":
//                 sockets.forEach(aSocket => aSocket.send(`${socket.nickname} : ${message.payload}`));
//             case "nickname":
//                 socket["nickname"] = message.payload;
//                 // console.log(message.payload);
//         }
//     });
//         // console.log(parsed, message.toString());
// });
    // socket.send("hello!!!");

httpServer.listen(3000, handleListen);