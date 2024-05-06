const crypto = require('crypto');
const DB = require("./DB.js");
const db = new DB();

class Player {
  constructor(socket) {
    this.socket = socket;
    this.inGame = false;
    this.inviting = false;
    this.selecting = false;
    // DBのid
    this.id = "";
    // マッチング用公開id
    this.sess_id = this.generateId();
    this.act = "";
    // スパイに潜入されているか
    this.spy = false;
    // わいろを受け取ったか
    this.wairo = false;
    this.success = false;
    this.online = true;
    this.meme = 0;
    this.life = 3;
    this.data = null;
    this.turn = 0;
    this.types = ["call", "atk", "dfn", "spAtk", "dxAtk", "heso", "dbAtk", "ult", "spy", "spDfn", "wairo"]
  }

  initTurn() {
    this.turn++;
    this.act = ""
    this.selecting = true;
  }

  // 現在の状態を取得
  getInfo() {
    return {
      act: this.act,
      success: this.success,
      meme: this.meme,
      life: this.life,
      wairo: this.wairo
    }
  }

  // sessIDのランダム生成
  generateId() {
    return crypto.createHash("sha1").update(this.socket.id).digest('hex');
  }

  // めぇれぇのindexを取得
  getTypeIndex() {
    if (this.act == "") {
      return 0;
    }
    return this.types.indexOf(this.act);
  }

  // めぇれぇの実行
  onAct(enemy) {
    this.selecting = false;
    let myIndex = this.getTypeIndex();
    let enemyIndex = enemy.getTypeIndex();
    const A = this.life;
    // 縦軸は敵 横軸は自分　-1 負け    
    // バナナはんてい
    let f = [
      [0, -1, 0, -1, -1, 0, -1, -A, 0, 0, 0],
      [0, 0, 0, -1, -1, 0, -1, -A, 0, -1, 0],
      [0, 0, 0, -1, -1, 0, 0, -A, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, -A, 0, 0, 0],
      [-1, -1, -1, -1, -1, -1, -1, -A, -1, -1, -1],
      [1, 0, 1, 0, 0, 1, 0, -A, 1, 0, 1],
      [0, 0, 0, -1, -1, 0, 0, -A, 0, -1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, -1, 0, -1, -1, 0, -1, -A, 0, 0, 0],
      [0, 0, 0, -1, -1, 0, 0, -A, 0, 0, 0],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
    ];
    // 行動成功判定
    let s = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
      [1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1],
      [1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0],
      [1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];
    
    this.life += f[myIndex][enemyIndex];
    let success = s[myIndex][enemyIndex] == 1;
    if (enemy.act == "spy") {
      this.spy = true;
    }
    if (this.act == "wairo" && s[enemyIndex][myIndex] == 0) {
      switch (enemy.act) {
        case "atk":
          this.meme++;
          break;
        case "spAtk":
          this.meme+=3;
          break;
        case "dxAtk":
          this.meme++;
          break;
        case "dbAtk":
          this.meme+=2;
          break;
        case "ult":
          this.meme+=10;
          break;
      }   
    }
    if (enemy.act == "wairo" && !success) {
      this.wairo = true;
    }
    this.success = success;
  }

  // 使用可能なめぇれぇを取得
  getAct() {
    let acts = ["call"]
    if (this.meme >= 1) {
      acts.push("atk");
      if (!this.spy) {
        acts.push("dfn");
      }
    }
    if (this.meme >= 3) {
      acts.push("spAtk");
    }
    if (this.data.spAct.includes("dxAtk") && this.life >= 2 && this.meme >= 1) {
      acts.push("dxAtk");
    }
    if (this.data.spAct.includes("heso") && this.meme >= 2) {
      acts.push("heso");
    }
    if (this.data.spAct.includes("dbAtk") && this.meme >= 2) {
      acts.push("dbAtk");
    }
    if (this.data.spAct.includes("ult") && this.meme >= 10) {
      acts.push("ult");
    }
    if (this.data.spAct.includes("spy") && this.meme >= 1) {
      acts.push("spy");
    }
    if (this.data.spAct.includes("spDfn") && this.meme >= 1) {
      acts.push("spDfn");
    }
    if (this.data.spAct.includes("wairo") && this.life >= 2 && this.meme >= 1) {
      acts.push("wairo");
    }
    this.spy = false;
    this.wairo = false;
    return acts;
  }

  startGame() {
    this.inGame = true;
    this.act = "";
    this.meme = 1;
    this.life = 3;
  }
  
  endGame() {
    this.inGame = false;
  }

  // めぇれぇを決定
  setAct(type) {
    if (this.act != "") {
      return false;
    }
    switch (type) {
      case "call":
        this.meme++;
        this.act = type;
        break;
      case "atk":
        if (this.meme >= 1) {
          this.meme--;
          this.act = type;
        }
        break;
      case "dfn":
        if (this.meme >= 1) {
          this.act = type;
        }
        break;
      case "spAtk":
        if (this.meme >= 3) {
          this.meme -= 3;
          this.act = type;
        }
        break;
      case "dxAtk":
        if (this.meme >= 1 && this.life >= 2) {
          this.meme -= 1;
          this.act = type;
        }
        break;
      case "heso":
        if (this.meme >= 2) {
          this.meme -= 2;
          this.act = type;
        }
        break;
      case "dbAtk":
        if (this.meme >= 2) {
          this.meme -= 2;
          this.act = type;
        }
        break;
      case "ult":
        if (this.meme >= 10) {
          this.meme -= 10;
          this.act = type;
        }
        break;
      case "spy":
        if (this.meme >= 1) {
          this.meme -= 1;
          this.act = type;
        }
        break;
      case "spDfn":
        if (this.meme >= 1) {
          this.meme -= 1;
          this.act = type;
        }
        break;
      case "wairo":
        if (this.meme >= 1) {
          this.meme -= 1;
          this.act = type;
        }
        break;
    }
    return this.act != "";
  }

  setSpAct(type) { // たつじんめぇれぇの設定
    const index = this.getTypeIndex(type);
    if (this.types.indexOf(type) >= 4) {
      this.data.spAct.push(type);
      if (this.data.spAct.length > 2) {
        this.data.spAct.splice(0, 1);
      }
    }
  }

  addWin() {
    // 6ターン未満(くっしょん+とつげき×3回未満)　は無効試合
    if (this.turn >= 6) {
      this.data.win++;
      db.set(this.id, this.data);
    }
  }
}
module.exports = Player;