const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
} = require("discord.js");
require('dotenv').config();

const client = new Client({
  intents: Object.values(GatewayIntentBits).reduce((a, b) => a | b),
});

client.on("ready", () => {
  console.log(`${client.user.tag} でログインしています。`);
});

client.on("messageCreate", async (msg) => {
  if (msg.content === "!てすと") {
    msg.reply("てすと!");
  }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const singleUseChannelName = "使い捨て";

  // 使い捨て取得
  const getSingleUseChannel = (vc) => {
    let singleUseChannel = null;
    // 鯖の全てのチャンネルにforeach
    vc.guild.channels.cache.forEach((ch) => {
      // 親(null含む)が同じでチャンネル名が使い捨てのものを検索
      if (ch.parent == vc.parent && ch.name == singleUseChannelName) {
        singleUseChannel = ch;
      }
    });
    return singleUseChannel;
  }

  // 接続時
  if (!oldState.channel || (newState.channel && oldState.channel != newState.channel)) {
    console.log("in")
    const such = getSingleUseChannel(newState.channel);
    // 使い捨てが既にある場合は権限を更新
    if (such) {
      such.permissionOverwrites.edit(newState.member, { ViewChannel: true });
    }
    // なければ新規作成
    else {
      const channelManager = newState.channel.parent ? newState.channel.parent.children : newState.guild.channels;
      // everyoneから非表示 接続者とdbotに表示
      channelManager.create({
        name: singleUseChannelName,
        permissionOverwrites: [
          {
            id: newState.guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: newState.guild.members.me,
            allow: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: newState.member,
            allow: [PermissionFlagsBits.ViewChannel],
          }
        ],
      })
    }
  }

  // 切断時
  if (!newState.channel || (oldState.channel && oldState.channel != newState.channel)) {
    const such = getSingleUseChannel(oldState.channel);
    if (oldState.channel.members.size > 0) {
      such.permissionOverwrites.edit(oldState.member, { ViewChannel: false });
    } else {
      such.delete();
    }
  }

  // guild.channels.create('チャンネル名'
});

client.login(
  process.env.DISCORD_TOKEN,
);

module.exports = client;