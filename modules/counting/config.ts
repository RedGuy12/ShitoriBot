import type { ChatInputCommandInteraction, GuildTextBasedChannel } from "discord.js";

import assert from "node:assert";

import { channelMention, hyperlink, messageLink, userMention } from "discord.js";

import constants from "../../common/constants.ts";
import { displayLogChannel } from "../../common/misc.ts";
import { Counting, stringifyNumber } from "./misc.ts";

export default async function configCounting(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
	newConfig: {
		base?: number;
		channel: GuildTextBasedChannel;
		enabled?: boolean;
		logs?: GuildTextBasedChannel;
		reset?: boolean;
		silent?: boolean;
		step?: number;
	},
): Promise<void> {
	assert(interaction.guild);

	const config = await Counting.findOneAndUpdate(
		{ channel: newConfig.channel.id },
		{ ...newConfig, channel: newConfig.channel.id, logs: newConfig.logs?.id },
		{ new: true, upsert: true, setDefaultsOnInsert: true },
	).exec();

	const lastLink =
		config.lastId && messageLink(config.channel, config.lastId, interaction.guild.id);
	await interaction.reply({
		embeds: [
			{
				title: "Counting Settings",
				color: constants.themeColor,
				description:
					`**Channel**: ${channelMention(config.channel)}\n` +
					`**Enabled**: ${constants.emojis.statuses[config.enabled ? "yes" : "no"]}\n\n` +
					`**Logs Channel**: ${await displayLogChannel(config, interaction.guild)}\n` +
					`**Base**: ${config.base.toLocaleString()}\n` +
					`**Step**: ${config.step.toLocaleString()}\n` +
					`**Reset on Invalid**: ${
						constants.emojis.statuses[config.reset ? "yes" : "no"]
					}\n\n` +
					`*Last Number: ${
						(lastLink ?
							hyperlink(stringifyNumber(config.lastNumber, config.base), lastLink)
						:	stringifyNumber(config.lastNumber, config.base)) +
						(config.lastAuthor ? ` by ${userMention(config.lastAuthor)}` : "")
					}*`,
			},
		],
	});
}
