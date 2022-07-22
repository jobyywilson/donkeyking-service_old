const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')


app.get('/', (req, res) => {
  console.log('Request 1')
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  console.log('Request 2')
  res.render('room', { roomId: req.params.room })
})
io.on('connection', socket => {
  socket.on('join-room', (roomId, userId, nickName) => {
    socket.join(roomId)
    console.log('User order ' + Object.keys(io.sockets.adapter.rooms[roomId].sockets).length)
    let orderNo = Object.keys(io.sockets.adapter.rooms[roomId].sockets).length;
    socket.to(roomId).broadcast.emit('user-connected', userId,nickName,orderNo)
    console.log(socket.adapter.rooms[roomId])
    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId,nickName,orderNo)
    })
  })
  socket.on('start-game', (roomId,userIds) => {
    let cards=["AC","2C","3C","4C","5C","6C","7C","8C","9C","JC","QC","KC","AD","2D","3D","4D","5D","6D","7D","8D","9D","JD","QD","KD","AH","AH","2H","3H","4H","5H","6H","7H","8H","9H","JH","QH","KH","AS","AS","2S","3S","4S","5S","6S","7S","8S","9S","JS","QS","KS"]
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
    for (let id of userIds ) {
      deck["cardInfo"][id.userId]= suffledCardList[index]
      deck["orderInfo"][id.userId] = index
      deck["playersInfo"].push({"nickName":id.nickName,"index":index,"noOfCards":suffledCardList[index].length,"userId":id.userId})
      index++;
    }
    console.log(deck)
    io.in(roomId).emit('start', deck)
  })
})

server.listen(3000)