const Player = require("./Player.js")


class Battle {
  constructor(io, p1, p2) {
    this.io = io;
    this.p1 = p1;
    this.p2 = p2;
  }

  start() {
    this.p1.startGame();
    this.p2.startGame();
    this.p1.socket.emit("start", this.p2.data);
    this.p2.socket.emit("start", this.p1.data);
    setTimeout(this.loop.bind(this), 2000);
  }

  // めぇれぇ選択
  loop() {
    let players = [this.p1, this.p2];
    players.forEach((player) => {
      player.initTurn();
      player.socket.emit("select", player.getAct());
    });
    setTimeout(this.judge.bind(this), 10000);
  }

  // めぇれぇ処理
  judge() {
    let p1res = {}
    let p2res = {}
    this.p1.onAct(this.p2);
    this.p2.onAct(this.p1);
    p1res.player = this.p1.getInfo();
    p2res.player = this.p2.getInfo();
    p1res.enemy = this.p2.getInfo();
    p2res.enemy = this.p1.getInfo();
    p1res.wairo = (this.p2.act == "wairo") && !p1res.success;
    p2res.wairo = (this.p1.act == "wairo") && !p2res.success;

    let winner;
    // call atk dfn
    if (this.p1.online && this.p2.online) {
      if (this.p1.life == 0) {
        winner = 1;
      } else if (this.p2.life == 0) {
        winner = 0;
      } else {
        winner = 2;
      }
    } else if (this.p1.online) {
      winner = 0;
    } else {
      winner = 1;
    }
    
    p1res.end = true;
    p2res.end = true;
    switch (winner) {
      case 0:
        p1res.message = "win";
        this.p1.addWin();
        p2res.message = "lose";
        break;
      case 1:
        p1res.message = "lose";
        p2res.message = "win";
        this.p2.addWin();
        break;
      case 2:
        p1res.message = "draw";
        p2res.message = "draw";
        p1res.end = false;
        p2res.end = false;
        break;
    }
    this.p1.socket.emit("result", p1res);
    this.p2.socket.emit("result", p2res);
    if (winner == 2) {
      setTimeout(this.loop.bind(this), 2000);
    } else {
      this.p1.endGame();
      this.p2.endGame();
    }

  }
}
module.exports = Battle;