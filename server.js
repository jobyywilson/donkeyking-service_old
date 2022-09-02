const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
var CryptoJS = require("crypto-js");

const { v4: uuidV4 } = require('uuid')
const port = process.env.PORT || 3000
const roomListDetails = {}
app.get('/', (req, res) => {
  console.log('Request 1')
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  console.log('Request 2')
  res.render('room', { roomId: req.params.room })
})
io.on('connection', socket => {
  socket.on('join-room', (roomId, userId, nickName,secretId) => {
    socket.join(roomId)
    let room_details = roomListDetails[roomId]
    if(!room_details){
      room_details = {}
    }
    room_details[userId] = {}
    room_details[userId]['secretId'] = secretId
    roomListDetails[roomId] = room_details
    console.log('User order ' + Object.keys(io.sockets.adapter.rooms[roomId].sockets).length)
    let orderNo = Object.keys(io.sockets.adapter.rooms[roomId].sockets).length;
    let userInfo = {'userId':userId,'nickName':nickName,'orderNo':orderNo}
    socket.to(roomId).broadcast.emit('user-connected', userInfo)
    console.log(socket.adapter.rooms[roomId])
    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId,nickName,orderNo)
    })
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
    for (let user of userInfo ) {
      let cardStr = suffledCardList[index].toString()
      let room_details = roomListDetails[roomId]
      let secretId = room_details[user.userId]['secretId']
      deck["cardInfo"][user.userId]=  CryptoJS.AES.encrypt(cardStr, secretId).toString();
      deck["orderInfo"][user.userId] = index
      deck["playersInfo"].push({"nickName":user.nickName,"index":index,"noOfCards":suffledCardList[index].length,"userId":user.userId})
      index++;
    }
    console.log(deck)
    io.in(roomId).emit('start', deck)
  })
})

server.listen(port)
