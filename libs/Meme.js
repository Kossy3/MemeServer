const DB = require("./DB.js");
const Battle = require("./Battle.js");
const Player = require("./Player.js");
const db = new DB();

class Meme {

  constructor() {
    this.players = new Set();
  }

  start(io) {
    io.on('connection', async (socket) => {
      let player = new Player(socket);
      this.players.add(player);
      // S: sess_idあげるからログインしろ
      socket.emit("login", player.sess_id);
      console.log(`/Socket Connected socket.id = ${socket.id}`);

      // C: sess_idでログインしたよ
      socket.once('login', async (txt) => {
        if (player.data) {
          // S: ログインしてるね
          console.log(`/Socket Login \n  sess_id = ${player.sess_id}\n  data = ${JSON.stringify(player.data)}\n`);
        } else {
          // S: うそついてんじゃねぇよ
          socket.emit("error", "login failed");
          console.log(`/Socket LoginFailed \n  sess_id = ${player.sess_id}\n  data = ${JSON.stringify(player.data)}\n`);
          return;
        }

        // C: 対戦相手募集しといて
        socket.on('invite', async (txt) => {
          // ゲーム中の募集は拒否
          if (!player.inGame) {
            player.inviting = true;
            io.emit("invite", player.sess_id);
          }
        });

        // C: sess_idの人と対戦したい
        socket.on('accept', (sess_id) => {
          // ゲーム中の参加は拒否
          if (!player.inGame) {
            const enemy = this.getPlayerBySessId(sess_id);
            if (enemy && enemy.inviting) {
              enemy.inviting = false;
              console.log(`/Socket Start ${player.sess_id} >> ${sess_id}`);
              let battle = new Battle(io, player, enemy);
              battle.start();
            } else {
              console.log(`/Socket StartFailed ${player.sess_id} >> ${sess_id}`);
            }
          }
        });

        // C: 名前変更したい
        socket.on('name', (name) => {
          // 10文字まで
          player.data.name = name.substr(0, 10);
          db.set(player.id, player.data);
          // S：現在の名前だよ
          player.socket.emit("name", player.data.name);
          console.log(`/Socket Name Changed ${player.data.name}`);
        });
        
        // C: 達人めぇれぇ変更したい
        socket.on('setSpAct', (type) => {
          player.setSpAct(type);
          db.set(player.id, player.data);
          // S：現在のめぇれぇ一覧だよ
          player.socket.emit("spAct", player.data.spAct);
          console.log(`/Socket SpAct Changed ${player.data.name}`);
        });

        // C: めぇれぇ
        socket.on("act", (type) => {
          // ゲーム中以外は受理しない
          if (player.selecting && player.setAct(type)) {
            player.socket.emit("selected", type);
          } else {
            player.socket.emit("txt", "error");
          }
        });
      })
      
      socket.on('disconnect', () => {
        console.log(`/Socket Disconnected socket.id = ${socket.id} `);
        this.players.delete(player);
        
        player.online = false;
      });
    });
  }

  getPlayerBySessId(sess_id) {
    let result = null;
    this.players.forEach((player) => {
      if (player.sess_id == sess_id) {
        result = player;
      }
    })
    return result;
  }

}
module.exports = Meme;