'use strict';

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('mydb.db');
var fs = require('fs');
var path = require('path');

// Initialize database
db.serialize(function() {
    db.run("CREATE TABLE if not exists game_turns (player TEXT, r INT, c INT)");
    db.run("DELETE from game_turns");
});

// Create a server and listen on port 8000
var app = require('http').createServer(handler);
app.listen(8000);

function handler (request, response) {
    // Server static file from nodejs server
    var filePath = './public' + request.url;
    if (filePath == './public/')
    {
        filePath = './public/index.html';
    }
    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.png':
            contentType = 'image/png';
            break;      
        case '.jpg':
            contentType = 'image/jpg';
            break;
    }
    fs.readFile(filePath, function(error, content) {
        if (error) {
            if(error.code == 'ENOENT'){
                fs.readFile('./public/404.html', function(error, content) {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                });
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                response.end(); 
            }
        }
        else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });
}

// Assign socket.io to our server
var io = require('socket.io')(app);
io.set('origins', '*:*');

// Initialize variables
var player1 = undefined;
var player2 = undefined;
var turn = undefined; 
var winner = undefined;
var counter = 0;
var count=0;
var log = new Array();
var board = new Array();
board[0] = new Array();
board[1] = new Array();
board[2] = new Array();

// Initialize board
reset();

io.sockets.on('connection', function (socket) {
    /* 
    * By default the first person who connect to server is the first player and should start playing
    * Indicate player1 and player2 with symbol "x" and "o", respectively
    */
    if(player1 === undefined){
        socket.symbol = "x";
        player1 = socket;
        turn = "x";
        console.log(socket.id + " connected!");
    } else if(player2 === undefined) {
        socket.symbol = "o";
        player2 = socket;
        console.log(socket.id + " connected!");
    } else {
        // If 3'th player connect to server we got here, nothing happen!
    }
    var info = {symbol: socket.symbol};
    // Emit each player info such as symbol, name, etc
    socket.emit("info", JSON.stringify(info));
    
    socket.on('disconnect', function(){
       console.log("disconnected!"); 
    });

    socket.on('move', function(data){
        // Check for player moves on his turn
        if(socket.symbol != turn){
            return false;
        }

        // Server side checking for prevent overlap on movement
        if(
            board[data.row][data.col].symbol == "x" ||
            board[data.row][data.col].symbol == "o"
            ){
            return false;
        }

        // Change turn
        if(turn == "x"){
            turn = "o";
        } else {
            turn = "x";
        }
        board[data.row][data.col].symbol = socket.symbol;

        // Movement object to insert in database, log it and send it to players
        var movement = {
            row: data.row,
            col: data.col,
            symbol: socket.symbol
        }
        log[counter]=movement;
        db.run("INSERT into game_turns VALUES ('"+socket.symbol+"',"+data.row+","+data.col+")");
        io.emit('movement', JSON.stringify(movement));
        counter++;

        // Check for winning a player
        // Cols
        if(board[0][0].symbol == board[1][0].symbol){
            if(board[1][0].symbol == board[2][0].symbol){
                winner = board[0][0].symbol;
            }
        }
        if(board[0][1].symbol == board[1][1].symbol){
            if(board[1][1].symbol == board[2][1].symbol){
                winner = board[0][1].symbol;
            }
        }
        if(board[0][2].symbol == board[1][2].symbol){
            if(board[1][2].symbol == board[2][2].symbol){
                winner = board[0][2].symbol;
            }
        }
        // Rows
        if(board[0][0].symbol == board[0][1].symbol){
            if(board[0][0].symbol == board[0][2].symbol){
                winner = board[0][0].symbol;
            }
        }
        if(board[1][0].symbol == board[1][1].symbol){
            if(board[1][0].symbol == board[1][2].symbol){
                winner = board[1][0].symbol;
            }
        }
        if(board[2][0].symbol == board[2][1].symbol){
            if(board[2][0].symbol == board[2][2].symbol){
                winner = board[2][0].symbol;
            }
        }
        // Diagonal
        if(board[0][0].symbol == board[1][1].symbol){
            if(board[0][0].symbol == board[2][2].symbol){
                winner = board[0][0].symbol;
            }
        }
        if(board[0][2].symbol == board[1][1].symbol){
            if(board[0][2].symbol == board[2][0].symbol){
                winner = board[0][2].symbol;
            }
        }
        if(winner){
            io.emit("finished", winner);
        } else if(counter == 9){
            io.emit("finished", "");
        }

    });
    // Repeat movement
    socket.on('repeat', function(){
        socket.emit("reset");
        count = 0;
        emitResult(socket);
    });
    // Reset the board
    socket.on('reset', function(){
       reset();
    });
});

/* 
* Repeat movement one per second and emit it to player
* @param socket
*/
function emitResult(socket){
    setTimeout(function(){
        socket.emit("repeat", JSON.stringify(log[count]));
        if(count<log.length-1){
            emitResult(socket);    
            count++;
        }
    }, 1000);
}
/* 
* Reset board
*/
function reset(){
    for(var i=0;i<3;i++){
        for(var j=0;j<3;j++){
            board[i][j] = new Array();
            board[i][j].symbol=Math.random();
        }    
    }
    player1 = undefined;
    player2 = undefined;
    turn = "x";
    winner = undefined;
    counter = 0;
    count=0;
    io.emit("reset");
}