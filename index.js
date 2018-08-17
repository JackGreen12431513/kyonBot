const discord = require('discord.js');
const repeat = require('repeat');
const fs = require('fs')
var client = new discord.Client();
var statusPlay = 0;
const ytdl = require("ytdl-core");
const request = require("request");
const getYouTubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");

const userData = JSON.parse(fs.readFileSync("userData.json", "utf8"));
const guildData = JSON.parse(fs.readFileSync("joinedGuilds.json", "utf8"));

const conf = require('./config.json', 'utf8');

const token = conf.botToken;
const apiKey = conf.ytAPI;

client.login(token);

client.on('guildCreate', guild => {
    console.log(`Joined ${guild}`)
    if(!guildData[guild.id]) guildData[guild.id] = {
        guildPrefix: prefix,
        adminRole: ""
      }
      writeToGuildData();
      guild.owner.send("Woah! A new server?\n\nHey! Thanks for having me!\n\nRun `k!setAdmin <Admin Role>` to set the administrator role!")
})

client.on('ready', () => {
    client.user.setActivity("k!help")
    repeat(changePlaying());
})

var guilds = {};

client.on('message', message => {
    var guild = message.guild;
    var sender = message.author;

    if(message.guild === null) {

    }

    if (!guilds[message.guild.id]) {
        guilds[message.guild.id] = {
            queue: [],
            queueNames: [],
            isPlaying: false,
            dispatcher: null,
            voiceChannel: null,
            skipReq: 0,
            skippers: []
        };
    }

    if(!userData[sender.id]) userData[sender.id] = {
        partner: "",
        coins: 0,
        realName: sender.username,
        profileBio: "",
      }

      userData[sender.id].coins++;

      writeToUserData();

      const prefix = guildData[guild.id].guildPrefix;

    if (prefix != "k!") {
        if(message.content == "k!help") {
            var helpEmb = new discord.RichEmbed()
            .setTitle("Kyon Commands")
            .setDescription("Kyon is a multi use bot made by `Jack | Wasp Framework#7908`\nPrefix: `" + prefix + "`")
            .addField("📜 Basic Commands:", "`profile`", true)
            .addField("🎪 Fun Commands:", "`none`", true)
            .addField("💍 Roleplay Commads:", "`none`", true)
            .addField("🎵 Music Commands:", "`play` `queue`", true)
            .addField("🔨 Moderation Commands:", "`purge`", true)
            .addField("⚙ Settings:", "`prefix` `setAdmin`", true)
            message.channel.send(helpEmb)
        }
    } else {

    }

    if(message.author.equals(client.user) || !message.content.startsWith(prefix)) return;
    const member = message.member;	
    const mess = message.content.toLowerCase();
    const args = message.content.split(' ').slice(1).join(" ");

        if (mess.startsWith(prefix + "help")) {
        var helpEmb = new discord.RichEmbed()
        .setTitle("Kyon Commands")
        .setDescription("Kyon is a multi use bot made by `Jack | Wasp Framework#7908`\nPrefix: `" + prefix + "`")
        .addField("📜 Basic Commands:", "`profile`", true)
        .addField("🎪 Fun Commands:", "`none`", true)
        .addField("💍 Roleplay Commads:", "`marry` `divorce`", true)
        .addField("🎵 Music Commands:", "`play` `queue`", true)
        .addField("🔨 Moderation Commands:", "`purge`", true)
        .addField("⚙ Settings:", "`prefix` `setAdmin`", true)
        .setColor(0x06B4B5)
        message.channel.send(helpEmb)
        } else if (mess.startsWith(prefix + "ping")) {
        message.channel.send(`Bot ping: \`${Math.floor(client.ping)}ms\``)
        } else if (mess.startsWith(prefix + "purge")) {
        let purgeAmt = message.content.replace(prefix + "purge", "").replace(" ", "");
        console.log(purgeAmt);
        if (guildData[guild.id].adminRole == "") {
            message.changePlaying.send("Admin Role not set!")
        } else {
            if (message.member.roles.find('id', guildData[guild.id].adminRole)) {
                if (!isNaN(purgeAmt)) {
                    message.channel.bulkDelete(purgeAmt)
                } else {

                }
            } else {
                message.reply("you do not have the permissions to run this!");
            }
        }
    }  else if (mess.startsWith(prefix + "setAdmin")) {
        let mentionedAdminRole = message.mentions.roles.first().id;
        guildData[guild.id].adminRole = mentionedAdminRole;
        message.reply(`role ${"<@" + mentionedAdminRole + ">"} set to admin role!`);
        writeToGuildData();
    } else if (mess.startsWith(prefix + "prefix")) {
        let newPrefix = message.content.replace(prefix + "prefix", "").replace(" ", "");
        if (guildData[guild.id].adminRole == "") {
            message.changePlaying.send("Admin Role not set!")
        } else {
            if (message.member.roles.find('id', guildData[guild.id].adminRole)) {
                guildData[guild.id].guildPrefix = newPrefix;
                writeToGuildData();
                message.reply("prefix set to: " + newPrefix)
            } else {
                message.reply("you do not have the permissions to edit this!");
            }
        }
    } else if (mess.startsWith(prefix + "play")) {
        if (message.member.voiceChannel || guilds[message.guild.id].voiceChannel != null) {
            if (guilds[message.guild.id].queue.length > 0 || guilds[message.guild.id].isPlaying) {
                getID(args, function(id) {
                    add_to_queue(id, message);
                    fetchVideoInfo(id, function(err, videoInfo) {
                        if (err) throw new Error(err);
                        message.reply(" added to queue: **" + videoInfo.title + "**");
                        guilds[message.guild.id].queueNames.push(videoInfo.title);
                    });
                });
            } else {
                isPlaying = true;
                getID(args, function(id) {
                    guilds[message.guild.id].queue.push(id);
                    playMusic(id, message);
                    fetchVideoInfo(id, function(err, videoInfo) {
                        if (err) throw new Error(err);
                        guilds[message.guild.id].queueNames.push(videoInfo.title);
                        message.reply(" now playing: **" + videoInfo.title + "**");
                    });
                });
            }
        } else {
            message.reply(" you need to be in a voice channel!");
        }
    } else if (mess.startsWith(prefix + "queue")) {
        var message2 = "```";
        for (var i = 0; i < guilds[message.guild.id].queueNames.length; i++) {
            var temp = (i + 1) + ": " + guilds[message.guild.id].queueNames[i] + (i === 0 ? "**(Current Song)**" : "") + "\n";
            if ((message2 + temp).length <= 2000 - 3) {
                message2 += temp;
            } else {
                message2 += "```";
                message.channel.send(message2);
                message2 = "```";
            }
        }
        message2 += "```";
        message.channel.send(message2);
    } else if (mess.startsWith(prefix + "kill")) {
        if (message.member.roles.find('id', guildData[guild.id].adminRole)) {
            resetBot(message.channel, message.guild.id);
        } else {
            message.reply("you do not have the permissions to run this!");
        }
    } else if (mess.startsWith(prefix + "profile")) {
        let userProfile = message.mentions.members.first();
        if (userProfile == "" || userProfile == null) {
            message.reply("Please mention a user!")
        } else {
            if (userData[userProfile.id] != null) {
                if (userData[userProfile.id].partner != "") {
                    var profileEmb = new discord.RichEmbed()
                    .setTitle("Profile for " + userProfile.user.username)
                    .setDescription(`Bio: ${userData[userProfile.id].profileBio}`)
                    .addField("📜 Roles:", userProfile.roles.map(role => role.name).join(", "))
                    .addField("🕙 Joined Guild:", `User joined: ${userProfile.joinedAt}`)
                    .setThumbnail(userProfile.user.avatarURL)
                    .setColor(0x06B4B5)
                    message.channel.send(profileEmb)
                } else {
                    var profileEmb3 = new discord.RichEmbed()
                    .setTitle("Profile for " + userProfile.user.username)
                    .setDescription(`Bio: '${userData[userProfile.id].profileBio}'`)
                    .addField("📜Roles:", userProfile.roles.map(role => role.name).join(", "))
                    .addField("💍Relationship:", "Married to: no-one!")
                    .addField("🕙 Joined Guild:", `User joined: ${userProfile.joinedAt}`)
                    .setThumbnail(userProfile.user.avatarURL)
                    .setColor(0x06B4B5)
                    message.channel.send(profileEmb3)
                }
            } else {
                var profileEmb2 = new discord.RichEmbed()
                .setTitle("Profile for " + userProfile.user.username)
                .addField("Roles:", userProfile.roles.map(role => role.name).join(", "))
                .addField("Joined Guild:", `User joined: ${userProfile.joinedAt}`)
                .setThumbnail(userProfile.user.avatarURL)
                .setColor(0x06B4B5)
                message.channel.send(profileEmb2)
            }
        }

    }
})

function changePlaying() {
    console.dir(statusPlay);
        setInterval(function(){
            if (statusPlay > 0) {
                statusPlay -= 1;
                client.user.setActivity(`on ${client.guilds.size} server(s)`)
            } else {
                statusPlay += 1;
                client.user.setActivity("k!help")
            }
        }, 10000)
}

function writeToGuildData() {
    fs.writeFile('joinedGuilds.json', JSON.stringify(guildData), (err) => {
        if (err) console.log(err);
      })
}

function writeToUserData() {
    fs.writeFile('userData.json', JSON.stringify(userData), (err) => {
        if (err) console.log(err);
      })
}

function playMusic(id, message) {
    userVC = message.member.voiceChannel;



    userVC.join().then(function(connection) {
        stream = ytdl("https://www.youtube.com/watch?v=" + id, {
            filter: 'audioonly'
        });
        guilds[message.guild.id].skispReq = 0;
        guilds[message.guild.id].skippers = [];

        guilds[message.guild.id].dispatcher = connection.playStream(stream);
        guilds[message.guild.id].dispatcher.on('end', function() {
            guilds[message.guild.id].skipReq = 0;
            guilds[message.guild.id].skippers = [];
            guilds[message.guild.id].queue.shift();
            guilds[message.guild.id].queueNames.shift();
            if (guilds[message.guild.id].queue.length === 0) {
                guilds[message.guild.id].queue = [];
                guilds[message.guild.id].queueNames = [];
                guilds[message.guild.id].isfPlaying = false;
            } else {
                setTimeout(function() {
                    playMusic(guilds[message.guild.id].queue[0], message);
                }, 500);
            }
        });
    });
}

function getID(str, cb) {
    if (isYoutube(str)) {
        cb(getYouTubeID(str));
    } else {
        search_video(str, function(id) {
            cb(id);
        });
    }
}

function add_to_queue(strID, message) {
    if (isYoutube(strID)) {
        guilds[message.guild.id].queue.push(getYouTubeID(strID));
    } else {
        guilds[message.guild.id].queue.push(strID);
    }
}

function search_video(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + apiKey, function(error, response, body) {
        var json = JSON.parse(body);
        if (!json.items[0]) callback("3_-a9nVZYjk");
        else {
            callback(json.items[0].id.videoId);
        }
    });
}

function isYoutube(str) {
    return str.toLowerCase().indexOf("youtube.com") > -1;
}

function resetBot(channel, guildID) {
    guilds[guildID].queue.length = 0;
    channel.send('Resetting...')
    .then(msg => client.destroy())
    .then(() => client.login(token));
    channel.send('Bot Restarted!...')
    }

/*
git init
git status
git add . && git commit -m "Initial commit"
git log
heroku login
heroku create your-app-name
git remote add heroku https://git.heroku.com/your-app-name.git
git remote -v
git remote add origin https://github.com/JackGreen12431513/kyonBot
git remote -v
git push origin master
heroku local
git push heroku master
*/

