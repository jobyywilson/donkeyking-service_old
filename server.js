const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server, {
  cors: {
    origins: ["https://donkeyking.xyz","http://localhost:3000"]
  }
});
var CryptoJS = require("crypto-js");

const { v4: uuidV4 } = require('uuid')
const port = process.env.PORT || 3000
const roomListDetails = {}

io.on('connection', socket => {
  socket.on('rejoin-room', (roomId, peerId, nickName,secretId,userId) => {
    console.log(roomId, peerId, nickName,secretId)
    let room_details = roomListDetails[roomId]
    let userInfoMem = room_details['userInfo'][userId]
    if(userInfoMem){
      let secretIdMemory = room_details['userInfo'][userId]['secretId']
      if(secretIdMemory != secretId){
        socket.emit('user-error','UnAuthorized');
        return;
      }
    }else{
      socket.emit('user-error','UnAuthorized');
      return;
    }
    
    // if userId is not null then user is trying to rejoin a room
    if(room_details && room_details['isGameStarted']){
      let userInfo = room_details['userInfo']
      if(userInfo[userId]){
        let userReconnectInfo = {'peerId':peerId,'nickName':nickName,'userId':userId}
        socket.to(roomId).broadcast.emit('user-reconnected', userReconnectInfo)
      }else{
        socket.emit('user-error','Game already started')
      }
      return;
    }
  })
  socket.on('join-room', (roomId, peerId, nickName,secretId) => {
    let room_details = roomListDetails[roomId]

    socket.join(roomId)
    if(!room_details){
      room_details = {}
      room_details['userInfo'] = {}
    }
    let userId = uuidV4()
    room_details['userInfo'][userId] = {}
    room_details['userInfo'][userId]['secretId'] = secretId
    roomListDetails[roomId] = room_details

    let userInfo = {'peerId':peerId,'nickName':nickName,'userId':userId}
    io.in(roomId).emit('user-connected', userInfo)
    //socket.to(roomId).broadcast.emit('user-connected', userInfo)
    console.log(socket.adapter.rooms[roomId])
    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', peerId,userId,roomId)
    })
  })
  socket.on('stop-game', (roomId) => {
    roomListDetails[roomId] = null
  })
  socket.on('start-game', (roomId,userInfo) => {
    let cards=["AC","AD","AH","AS","2C","2D","2H","2S","3C","3D","3H","3S","4C","4D","4H","4S","5C","5D","5H","5S","6C","6D","6H","6S","7C","7D","7H","7S","8C","8D","8H","8S","9C","9D","9H","9S","10C","10D","10H","10S","JC","JD","JH","JS","QC","QD","QH","QS","KC","KD","KH","KS"]
    //let cards=["AC","2C","3S","AD","2D","3H"]

    let shuffledCards = cards.sort(function(){return 0.5-Math.random()})
    let clients_in_the_room = io.sockets.adapter.rooms[roomId].sockets; 
    let suffledCardList = []
    let chunkSize = cards.length/Object.keys(clients_in_the_room).length;
    for (let i = 0; i < shuffledCards.length; i += chunkSize) {
      let chunk = shuffledCards.slice(i, i + chunkSize);
      suffledCardList.push(chunk)
  }
    let index = 0;
    let deck ={}
    deck["cardInfo"]= {}
    deck["orderInfo"]= {}
    deck["playersInfo"]= []
    let roomUserInfo= roomListDetails[roomId]['userInfo']
    for (let user of userInfo ) {
      let cardStr = suffledCardList[index].toString()
      
      let secretId = roomUserInfo[user.userId]['secretId']
      deck["cardInfo"][user.userId]=  CryptoJS.AES.encrypt(cardStr, secretId).toString();
      deck["orderInfo"][user.userId] = index
      deck["playersInfo"].push({"nickName":user.nickName,"index":index,"noOfCards":suffledCardList[index].length,"peerId":user.peerId,"userId":user.userId})
      index++;
    }
    console.log(deck)
    roomListDetails[roomId]['isGameStarted'] = true
    io.in(roomId).emit('start', deck)
  })
})

server.listen(port)
