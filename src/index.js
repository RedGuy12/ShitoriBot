import dotenv from "dotenv";
import fetch from "axios";
import { escape } from "sqlstring";
import discordJs from "discord.js";
// set up process.env
dotenv.config();

// so Wiktionary won't ban us
fetch.defaults.headers.common["User-Agent"] =
	"Word Chain Discord Bot by Paul Reid // A Discord bot to enforce the rules of the Word Chain game // " +
	"https://github.com/RedGuy12/ShitoriBot";

//set up db stuffs
function sql(querySegments, ...variables) {
	return fetch({
		url: "https://paul-s-reid.com/web-dev/ShitoriBotApi-php/index.php",
		method: "post",
		data: {
			API_ACCESS_KEY: process.env.API_ACCESS_KEY,
			query: variables.reduce((accumulated, variable, index) => {
				return `${accumulated}${escape(variable)}${querySegments[index + 1]}`;
			}, querySegments[0]),
		},
	});
}

const Discord = new discordJs.Client();
Discord.on("ready", () => {
	console.log(`Connected to Discord`);
});

Discord.on("guildCreate", (guild) => {
	//guild.preferredLocale;
	guild.channels.cache.some(function (channel) {
		if (channel.type === "text" && guild.me.permissionsIn(channel).has("SEND_MESSAGES")) {
			channel.send("Hi! Thanks for the invite!\nTo set me up, type `@WordChainBot setup`.");
			return true;
		}
	});
});

Discord.on("message", async (msg) => {
	if (msg.content.toLowerCase() === "<@!823932474118635540> setup") {
		await msg.reply(
			"Create one channel for playing the game and another for talking about the game.\n" +
				"Would you like me to create them, or will you?",
		);
	}

	if (msg.channel.id === "823941849453821982") {
		var word = msg.content.toLowerCase();

		// don't allow whitespace
		if (/\s/.test(word)) {
			msg.delete();
			Discord.channels.cache
				.get("823941821695918121")
				.send(`${msg.author} - \`${word}\` is more than one word!`);
			return;
		}

		// use Wiktionary's API to determine if it is a word
		var response = await fetch({
			method: "get",
			url:
				"https://en.wiktionary.org/w/api.php?action=parse&summary=example&format=json&redirects=true&" +
				`page=${word}`,
		});
		if (response.data.error) {
			msg.delete();
			Discord.channels.cache
				.get("823941821695918121")
				.send(`${msg.author} - \`${word}\` is not a word!`);
			return;
		}

		// determine if it starts with the last letter of the previous word
		var lastWord = (
			await sql`SELECT \`word\` FROM \`word_chain_words\` ORDER BY \`index\` DESC LIMIT 1;`
		).data["0"];
		if (lastWord.word.slice(-1) !== word[0]) {
			msg.delete();
			Discord.channels.cache
				.get("823941821695918121")
				.send(
					`${msg.author} - \`${word}\` does not start with ${lastWord.word.slice(-1)}!`,
				);
			return;
		}

		// determine if it has been used before
		var used = (
			await sql`SELECT \`author\`, \`id\`, \`guild\` FROM \`word_chain_words\` WHERE \`word\`='${word}';`
		).data["0"];
		if (used !== "{") {
			// idk why this works but for some reason it does
			msg.delete();
			Discord.channels.cache
				.get("823941821695918121")
				.send(
					`${msg.author} - \`${word}\` has been used before by ${
						used.author
					}!\nSee https: //discord.com/channels/${
						Discord.channels.cache.get(used.channel).guild.id
					}/${used.channel}/${used.id}`,
				);
			return;
		}

		// all checks out, add to db
		await sql`INSERT INTO word_chain_words (word, author, id, guild) VALUES (${word}, ${msg.author.username}, ${msg.id}, ${msg.channel.guild.id});`;
	}
});

Discord.login(process.env.BOT_TOKEN);
