// モジュール
const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const Meme = require("./libs/Meme.js");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const DB = require("./libs/DB.js");
const Dbot = require("./libs/dbot.js");


const db = new DB();

const socketOptions = {
  cors: {
    origin: function (origin, fn) {
      const isTarget =
        ["https://kossy3.github.io"].indexOf(origin) >= 0 ||
        origin !== undefined;
      return isTarget ? fn(null, origin) : fn("error invalid domain");
    },
    credentials: true,
  },
};

const app = express();
const server = http.Server(app);
const io = socketio(server, socketOptions);

// 定数
const PORT = 3000;
const KEY = "player_id"; // ログイン用

const meme = new Meme();
meme.start(io);

const allowCrossDomain = function (req, res, next) {
  if (req.headers.origin == "https://kossy3.github.io") {
    res.header("Access-Control-Allow-Origin", "https://kossy3.github.io");
  } else if (req.headers.origin == "http://127.0.0.1:5500") {
    res.header("Access-Control-Allow-Origin", "http://127.0.0.1:5500");
  }
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", true);
  // intercept OPTIONS method
  if ("OPTIONS" === req.method) {
    res.sendStatus(200);
  } else {
    next();
  }
};

app.use(express.static("public"));
app.use(cookieParser());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);
app.use(bodyParser.json());
app.use(allowCrossDomain);

// 新規アカウント作成
const createNew = async () => {
  const original = `meme:${Math.random()}`;
  const player_id = crypto.createHash("sha1").update(original).digest("hex");
  const playerData = {
    name: "めぇめぇ#" + btoa(player_id).substr(0, 3),
    win: 0,
    spAct: [],
  };
  await db.set(player_id, playerData);
  console.log(
    `/sess CreateNew ${player_id}\n data=${JSON.stringify(playerData)} `,
  );
  return { id: player_id, data: playerData };
};

// cookieのidからdbのデータを取得し，sess_idと連携させる
app.post("/sess", async (req, res) => {
  const player = meme.getPlayerBySessId(req.body.sess_id);

  // そもそもsess_idが偽の場合
  if (!player) {
    console.log(
      `/sess AccessDenied body=${req.body}  \n  sess_id=${req.body.sess_id}`,
    );
    res.json({});
    return;
  }

  if (req.cookies[KEY]) {
    // cookieがあればDBからアカウントを取得
    player.id = req.cookies[KEY];
    const playerData = await db.get(player.id);

    if (playerData) {
      player.data = playerData;
    } else {
      // cookieが偽
      console.log(
        `/sess AccessDenied cookies=${JSON.stringify(req.cookies)}\n  sess_id=${req.body.sess_id}`,
      );
      res.cookie(KEY, "delete", {
        maxAge: 1, // ミリ秒
        httpOnly: true,
        sameSite: "None",
        secure: true,
      });
      res.json({});
      return;
    }
  } else {
    // cookieがなければ新規アカウント作成
    console.log(
      `/sess FirstAccess cookies=${JSON.stringify(req.cookies)}\n  sess_id=${req.body.sess_id}`,
    );
    const newPlayer = await createNew();
    player.id = newPlayer.id;
    player.data = newPlayer.data;
  }

  res.cookie(KEY, player.id, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // ミリ秒
    httpOnly: true,
    sameSite: "None",
    secure: true,
  });
  res.json(player.data);
});
server.listen(PORT, () => console.log("Starting Server"));
