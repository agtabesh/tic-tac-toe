var url = 'http://localhost';
socket = io(url + ':8000');

$(document).ready(function(){
	$("td").on("click", "a.empty", function(){
		var row = $(this).attr("data-row");
		var col = $(this).attr("data-col");
		socket.emit('move', {
			row: row,
			col: col
		});
	});
	$(".repeat").on("click", function(){
		socket.emit('repeat');
	});
	$(".reset").on("click", function(){
		socket.emit('reset');
	});
});
socket.on("repeat", function(data){
	data = JSON.parse(data);
	$('.place' + data.row + '-' + data.col).addClass(data.symbol);
});

socket.on("reset", function(data){
	$('.x').removeClass('x');
	$('.o').removeClass('o');
	$('td a').addClass('empty');
	$('td').removeClass('disabled');
});

socket.on("info", function(data){
	data = JSON.parse(data);
	$(".info img").attr("src", data.symbol + ".png");
});

socket.on("finished", function(data){
	if(data){
		alert(data.toUpperCase(data.symbol) + " wins!");
	} else {
		alert("Finished!");
	}
});
socket.on("movement", function(data){
	data = JSON.parse(data);
	$('.place' + data.row + '-' + data.col).addClass(data.symbol).addClass("disabled");
	$('.place' + data.row + '-' + data.col).find("a").removeClass("empty");
});
