import type { ChatInputCommandInteraction, ForumChannel, MediaChannel } from "discord.js";

import assert from "node:assert";

import { channelMention, inlineCode } from "discord.js";

import constants from "../../common/constants.ts";
import { OuijaBoardConfig } from "./misc.ts";

export default async function configOuijaBoard(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
	newConfig: {
		channel: ForumChannel | MediaChannel;
		enabled?: boolean;
		complete?: string;
	},
): Promise<void> {
	assert(interaction.guild);

	const config = await OuijaBoardConfig.findOneAndUpdate(
		{ channel: newConfig.channel.id },
		{
			...newConfig,
			channel: newConfig.channel.id,
			// eslint-disable-next-line unicorn/string-content
			complete: newConfig.complete?.replaceAll("`", "'"),
		},
		{ new: true, upsert: true, setDefaultsOnInsert: true },
	).exec();

	await interaction.reply({
		embeds: [
			{
				title: "Ouija Board Settings",
				color: constants.themeColor,
				description:
					`**Enabled**: ${constants.emojis.statuses[config.enabled ? "yes" : "no"]}\n` +
					`**Channel**: ${channelMention(config.channel)}\n` +
					`**Completion Message**: ${inlineCode(config.complete)}`,
			},
		],
	});
}
