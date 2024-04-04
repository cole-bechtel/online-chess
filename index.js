const WebSocket = require('ws');

let games = {}
let clients = [];
let publicGames = [];

function createCode(length){
    let options = '0123456789'.split('')
    let code = ''
    do{
        code = ''
        for(let i = 0; i < length; i++){
            code += options[Math.floor(Math.random() * options.length)];
        }
    } while(Object.keys(games).indexOf(code) !== -1)

    return code;
}

wss.on('listening', () => {
    console.log('WebSocket server is listening on port 8080');
});

wss.on('connection', ws => {
    console.log('New client connected!');
    clients.push(ws);
    let message = {
        type: 'public-games',
        games: publicGames
    };
    
    ws.send(JSON.stringify(message));

    ws.on('message', msg => {
        let content = JSON.parse(msg);

        if(content.type === 'create-private-request'){
            let gameCode = createCode(5);
            games[gameCode] = {}
            games[gameCode]['players'] = [ws]
            games[gameCode]['available'] = true;
            games[gameCode]['type'] = 'private'; 
            let message = {
                type: 'private-code',
                code: gameCode
            };
            ws.send(JSON.stringify(message));
        }

        else if(content.type === 'create-public-request'){
            let gameCode = createCode(5);
            games[gameCode] = {}
            games[gameCode]['players'] = [ws]
            games[gameCode]['available'] = true;
            games[gameCode]['type'] = 'public'; 
            games[gameCode]['name'] = content.name;
            let message = {
                type: 'create-public-success',
                code: gameCode
            };
            ws.send(JSON.stringify(message));
            publicGames.push([gameCode, content.name]);
            for(let client of clients){
                if(client !== ws){
                    let message = {
                        type: 'new-public',
                        value: [gameCode, content.name]
                    };
                    client.send(JSON.stringify(message));
                }
            }
        }

        else if(content.type === 'private-join-request' ){
            let code = content.code;
            if(Object.keys(games).indexOf(code) !== -1){
                if(games[code]['available'] && games[code]['type'] === 'private'){
                    games[code]['players'].push(ws);
                    let rand = Math.random();
                    let message = {
                        type: 'private-join-success',
                        color: rand > 0.5 ? 'white' : 'black'
                    };
                    ws.send(JSON.stringify(message));

                    message.color = message.color === 'black' ? 'white' : 'black';
                    games[code]['players'][0].send(JSON.stringify(message));
                    games[code]['available'] = false;
                }
                else{
                    let message = {
                        type: 'private-join-failure'
                    };
                    ws.send(JSON.stringify(message));
                }
            }
        }

        else if(content.type === 'get-public-games'){
            let available = [];
            for(let [key, values] of Object.entries(games)){
                if(values.available && values.type === 'public'){
                    available.push([key, values.name]);
                }
            }

            let message = {
                type: 'public-games',
                games: available
            };

            ws.send(JSON.stringify(message));
        }

        else if(content.type === 'join-public-request'){
            let code = content.code;
            if(games[code]['available']){
                games[code]['players'].push(ws);
                let rand = Math.random();
                    let message = {
                        type: 'private-join-success',
                        color: rand > 0.5 ? 'white' : 'black'
                    };
                    ws.send(JSON.stringify(message));

                    message.color = message.color === 'black' ? 'white' : 'black';
                    games[code]['players'][0].send(JSON.stringify(message));
                    games[code]['available'] = false;
                for(let client of clients){
                    let message = {
                        type: 'kill-public',
                        value: code
                    };
                    client.send(JSON.stringify(message));
                } 
                let ind = publicGames.indexOf([code, games[code]['name']])
                publicGames.splice(ind, 1);
            }
        }

        else if(content.type === 'move'){
            try{
                if(ws === games[content.code]['players'][0]){
                    games[content.code]['players'][1].send(JSON.stringify(content));
                }
                else{
                    games[content.code]['players'][0].send(JSON.stringify(content));
                }
            }
            catch{
                console.log("ignored error");
            }
        }

        else if(content.type === 'checkmate'){
            let code = content.code;
            let message = {
                type: 'checkmate'
            }
            for(let client of games[code]['players']){
                if(client !== ws){
                    client.send(JSON.stringify(message));
                }
            }
        }

        else if(content.type === 'kill-game' && games[content.code] !== undefined){
            let code = content.code;
            if(games[code]['type'] === 'public'){
                for(let client of clients){
                    let message = {
                        type: 'kill-public',
                        value: code
                    };
                    client.send(JSON.stringify(message));
                }
                let ind = publicGames.indexOf([code, games[code]['name']])
                publicGames.splice(ind, 1);
            }
            delete games[code];
        }

        else if(content.type === 'resignation'){
            console.log('Player resigned!')
            for(let [code, values] of Object.entries(games)){
                let ind = values['players'].indexOf(ws)
                if(ind !== -1){
                    let message = {
                        type: 'opponent-resigned'
                    };
                    if(ind === 0){
                        values['players'][1].send(JSON.stringify(message));
                    }
                    else{
                        values['players'][0].send(JSON.stringify(message));
                    }   
                }
            }
        }
    });
    ws.on('close', () => {
        for(let [code, values] of Object.entries(games)){
            let ind = values['players'].indexOf(ws)
            if(ind !== -1 && !values['available']){
                let message = {
                    type: 'opponent-left'
                };
                if(ind === 0){
                    values['players'][1].send(JSON.stringify(message));
                }
                else{
                    values['players'][0].send(JSON.stringify(message));
                }   
            }
        }
        let ind = clients.indexOf(ws);
        clients.splice(ind, 1);
    });
});
