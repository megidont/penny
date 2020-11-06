/*jshint esversion: 8*/
var Discord = require('discord.js');
var auth = require('./auth.json');
var fs = require('fs');
var customChannels;
try{

	customChannels = require('./channels.json');

}catch(e){

	customChannels = {};

}

var bot = new Discord.Client();

var ciel = false;

var channelName = "general";

var events = {

	MESSAGE_REACTION_ADD: 'messageReactionAdd',
	MESSAGE_REACTION_REMOVE: 'messageReactionRemove'

};

bot.once('ready', function(evt){

	console.log("Connected as " + bot.user.username + " (" + bot.user.id + ")");

	if(ciel == false){

		bot.user.setActivity("the part she needs to play.", {type: "PLAYING" });

	}else{

		bot.user.setActivity(null);

	}

});

bot.on('message', function(message){

	var at = "<@" + bot.user.id + ">";
	var nickat = "<@!" + bot.user.id + ">";

	if(message.content.startsWith(at) || message.content.startsWith(nickat)){

		if(message.guild == null){

			if(ciel == true){

				message.channel.send("<@" + message.author.id + ">, this is not a server.");

			}else{

				message.channel.send("<@" + message.author.id + ">, this is not a server!");

			}

			return;

		}

		var perms = message.member? message.member.permissions : new Map();

		var a = message.content.toLowerCase().split(" ");
		var server = message.guild;
		var mess;
		var submess = "";
		var makechannel = false;

		if(a.length >= 3 && a[1] == "usechannel"){

			for(var i = 2; i < a.length; i++){

				if(i == 2){

					if(a[i].match(/<#\d\d\d\d\d\d\d\d\d\d\d\d\d\d\d\d\d\d>/i) == null){

						submess += a[i];

					}else{

						var chanid = a[i].match(/\d\d\d\d\d\d\d\d\d\d\d\d\d\d\d\d\d\d/);
						submess = server.channels.cache.get(chanid[0]).name;
						break;

					}

				}else{

					submess += "-" + a[i];

				}

			}


			if(submess.length > 100 || submess.length < 2){

				if(ciel == true){

					mess = "<@" + message.author.id + ">, the requested channel name is too long or too short.";

				}else{

					mess = "<@" + message.author.id + ">, that channel name is too long or short.";

				}

				return;

			}else{

				if(perms.size == 0){

					message.channel.send("<@" + message.author.id + ">, for some reason I couldn't find your permissions. You may want to talk to my author about this - it's a bit of a pesky bug!");
					return;

				}else if(!perms.has("MANAGE_GUILD") || !perms.has("MANAGE_CHANNELS")){

					if(ciel == true){

						message.channel.send("<@" + message.author.id + ">, you are not authorized to do that.");

					}else{

						message.channel.send("<@" + message.author.id + ">, you don't have permission to do that!");

					}
					return;

				}

				if(ciel == true){

					mess = "<@" + message.author.id + ">, pins will go in that channel.";

				}else{

					mess = "<@" + message.author.id + ">, I'll send pins to that channel!";

				}
				makechannel = true;

			}


		}else{

			if(ciel == true){

				mess = "<@" + message.author.id + ">, I only listen for the command \"<@" + bot.user.id + "> usechannel [channelname].\"";

			}else{

				mess = "<@" + message.author.id + ">, please say \"<@" + bot.user.id + "> usechannel [channelname]\" to change pin channel!";

			}

		}

		message.channel.send(mess);

		if(makechannel == true){

			customChannels[message.guild.id] = submess;
			fs.writeFile('./channels.json', JSON.stringify(customChannels), 'utf8', function (err){if(err != null){console.log(err);}});

			var locchannelName = submess;

			if(server.channels.cache.find(channel => channel.name == locchannelName) == undefined && (server.roles.cache.find(role => role.name === "Community Pins") != undefined)){
				server.createChannel(locchannelName, {

					type: 'text',

					permissionOverwrites: [{

						id: server.defaultRole.id,
						deny: ['SEND_MESSAGES', 'MANAGE_MESSAGES']

					}, {

						id: server.roles.cache.find(role => role.name === "Community Pins").id,
						allow: ['SEND_MESSAGES', 'MANAGE_MESSAGES']

					}]

				});

			}

		}

	}

});

bot.on('raw', async event => {


	if(!events.hasOwnProperty(event.t)){

		return;

	}

	var { d: data } = event;

	if(data.guild_id == undefined){

		return;

	}

	var locchannelName = channelName;

	if(customChannels[data.guild_id]){

		locchannelName = customChannels[data.guild_id];

	}

	var channel = bot.channels.cache.get(data.channel_id) || await user.createDM();

/*	if(channel.name == locchannelName){

		return;

	}*/

	if(channel.messages.cache.has(data.message_id)){

		return;

	}

	var user = bot.users.cache.get(data.user_id);

	var message = await channel.messages.fetch(data.message_id);

	var emojiKey = data.emoji.id ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;

	var reaction = message.reactions.cache.get(emojiKey);

	if(!reaction){

		var emoji = new Discord.Emoji(bot.guilds.cache.get(data.guild_id), data.emoji);
		reaction = new Discord.MessageReaction(message, emoji, 1, data.user_id == bot.user.id);

	}

	bot.emit(events[event.t], reaction, user);

});

bot.on('guildCreate', function(guild){

	if(guild.channels.cache.find(channel => channel.name == "general") != undefined){

		if(ciel == true){

			guild.channels.cache.find(channel => channel.name == "general")
				.send("Please use \"<@" + bot.user.id + "> usechannel [channelname]\" to specify a channel for pins.");

		}else{

			guild.channels.cache.find(channel => channel.name == "general")
				.send("Hello! Please use \"<@" + bot.user.id + "> usechannel [channelname]\" to specify a channel for pins.");

		}


	}

});

bot.on('messageReactionAdd', function(messageReaction){


	var emoji = messageReaction.emoji.identifier;
	var server = messageReaction.message.guild;
	var locchannelName = channelName;

	if(customChannels[server.id]){

		locchannelName = customChannels[server.id];

	}

	if(emoji == "%F0%9F%93%8C"){

		messageReaction.message.react(messageReaction.emoji);

		if(messageReaction.count > 1){

			return;

		}

		if(server.channels.cache.find(channel => channel.name == locchannelName) == undefined && (server.roles.cache.find(role => role.name === "Community Pins") != undefined)){
			server.createChannel(locchannelName, {

				type: 'text',

				permissionOverwrites: [{

					id: server.defaultRole.id,
					deny: ['SEND_MESSAGES', 'MANAGE_MESSAGES']

				}, {

					id: server.roles.cache.find(role => role.name === "Community Pins").id,
					allow: ['SEND_MESSAGES', 'MANAGE_MESSAGES']

				}]

			});

		}

		var goodName = messageReaction.message.member ? (messageReaction.message.member.nickname ? messageReaction.message.member.nickname : messageReaction.message.author.username) : "Unable to determine nickname";
		var color = messageReaction.message.member? messageReaction.message.member.displayColor : 0;
		color = color == 0? 0x882299 : color;

		var dlTitle = false;
		var dlURL = false;
		var dlImage = false;
		var newMessage = null;

		var msginfo = goodName + " - "
			+ (messageReaction.message.channel? "#" + messageReaction.message.channel.name : "");

		var postlink = messageReaction.message.channel? ("http://discordapp.com/channels/"
			+ (messageReaction.message.guild? messageReaction.message.guild.id : "@me")
			+ "/" + messageReaction.message.channel.id + "/"
			+ messageReaction.message.id) : "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

		if(messageReaction.message.attachments.first() != undefined){

			var filename = messageReaction.message.attachments.first().filename;
			var tempfilenamepart = filename.split('.');
			var ext = tempfilenamepart[tempfilenamepart.length - 1].toLowerCase();
			var spaceFileName = filename.replace(/_/g, " ");

			if(ext == "png" || ext == "jpg" || ext == "jpeg" || ext == "gif"){

					dlTitle = "[Click to download the file that " + goodName + " sent with the original message! (" + spaceFileName + ")]";
					dlURL = messageReaction.message.attachments.first().url;
					dlImage = messageReaction.message.attachments.first().url;

			}else{

					dlTitle = "[Click to download the file that " + goodName + " sent with the original message! (" + spaceFileName + ")]";
					dlURL = messageReaction.message.attachments.first().url;

			}

		}
		if(messageReaction.message.embeds[0] != undefined){

			let embed = messageReaction.message.embeds[0];

			if(dlTitle || embed.title){

				newMessage = new Discord.MessageEmbed(embed)
					.setTitle(dlTitle? dlTitle : (embed.title? embed.title : undefined))
					.setURL(dlURL? dlURL : embed.url)
					.setImage(dlImage? dlImage : (embed.image? embed.image.url : null))
					.setAuthor(goodName, messageReaction.message.author.avatarURL, embed.url? embed.url : (embed.author? (embed.author.url? embed.author.url : (dlURL? postlink : postlink)) : postlink ))
					.setColor(color)
					.setTimestamp(messageReaction.message.editedTimestamp? messageReaction.message.editedTimestamp : messageReaction.message.createdTimestamp)
					.setFooter(msginfo);

			}else{

				newMessage = new Discord.MessageEmbed(embed)
					.setURL(dlURL? dlURL : embed.url)
					.setImage(dlImage? dlImage : (embed.image? embed.image.url : null))
					.setAuthor(goodName, messageReaction.message.author.avatarURL, embed.url? embed.url : (embed.author? (embed.author.url? embed.author.url : (dlURL? postlink : postlink)) : postlink ))
					.setColor(color)
					.setTimestamp(messageReaction.message.editedTimestamp? messageReaction.message.editedTimestamp : messageReaction.message.createdTimestamp)
					.setFooter(msginfo);

			}

		}else{


			if(dlTitle){
				newMessage = new Discord.MessageEmbed()
					.setColor(color)
					.setTitle(dlTitle)
					.setURL(dlURL)
					.setImage(dlImage? dlImage : null)
					.setAuthor(goodName, messageReaction.message.author.avatarURL, postlink)
					.setDescription(messageReaction.message.content)
					.setTimestamp(messageReaction.message.editedTimestamp? messageReaction.message.editedTimestamp : messageReaction.message.createdTimestamp)
					.setFooter(msginfo);

			}else{

				newMessage = new Discord.MessageEmbed()
					.setColor(color)
					.setURL(postlink)
					.setAuthor(goodName, messageReaction.message.author.avatarURL, postlink)
					.setDescription(messageReaction.message.content)
					.setTimestamp(messageReaction.message.editedTimestamp? messageReaction.message.editedTimestamp : messageReaction.message.createdTimestamp)
					.setFooter(msginfo);

			}

		}

		if(server.channels.cache.find(channel => channel.name == locchannelName) != undefined){

			server.channels.cache.find(channel => channel.name == locchannelName).send({embed: newMessage == null? new Discord.MessageEmbed().setDescription("whoops") : newMessage});

		}

	}

});

bot.login(auth.token);
