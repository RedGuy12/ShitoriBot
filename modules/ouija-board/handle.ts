import type { AnyThreadChannel, Message } from "discord.js";

import { userMention } from "discord.js";
import { client, escapeAllMarkdown, stripMarkdown } from "strife.js";

import { Ouija, OuijaBoardConfig } from "./misc.ts";

export async function initOuija(thread: AnyThreadChannel, newlyCreated: boolean): Promise<void> {
	if (!newlyCreated || !thread.parent || !thread.ownerId) return;

	const config = await OuijaBoardConfig.findOne({ channel: thread.parent.id }).exec();
	if (!config?.enabled) return;

	await new Ouija({ channel: thread.id, owner: thread.ownerId }).save();
}

const BLANKS = new Set(["blank", "space", "tab"]);

export async function handleOujia(message: Message): Promise<void> {
	if (message.system || !message.channel.isThread() || !message.channel.parent) return;

	const ouija = await Ouija.findOne({ channel: message.channel.id }).exec();
	if (!ouija) return;

	if (message.id === message.channel.id) {
		await message.channel.send("The spirits are responding…");
		return;
	}

	if (message.author.id === client.user.id) return;

	if (ouija.lastUser === message.author.id || ouija.owner === message.author.id) {
		if (message.deletable) await message.delete();
		return;
	}

	const config = await OuijaBoardConfig.findOne({ channel: message.channel.parent.id }).exec();
	if (message.content === config?.complete) {
		if (ouija.answer === "" || ouija.answer.endsWith(" ")) {
			if (message.deletable) await message.delete();
			return;
		}

		await ouija.deleteOne();
		await message.channel.send(
			`## ${userMention(ouija.owner)} wants to know: __${escapeAllMarkdown(
				message.channel.name,
			)}__\n**The spirits have responded!**\n> ${ouija.answer}`,
		);
		return;
	}

	const character = BLANKS.has(message.content) ? " " : stripMarkdown(message.cleanContent);
	if (character.length !== 1) {
		if (message.deletable) await message.delete();
		return;
	}

	if (character === " " && (ouija.answer === "" || ouija.answer.endsWith(" "))) {
		if (message.deletable) await message.delete();
		return;
	}

	ouija.answer += character === " " ? character : message.cleanContent;
	ouija.lastUser = message.author.id;
	await ouija.save();
}
