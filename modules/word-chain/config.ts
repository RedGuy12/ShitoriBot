import type {
	ApplicationCommandOptionChoiceData,
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	GuildTextBasedChannel,
} from "discord.js";

import assert from "node:assert";

import { channelMention, hyperlink, messageLink, userMention } from "discord.js";
import { matchSorter } from "match-sorter";

import constants from "../../common/constants.ts";
import { displayLogChannel } from "../../common/misc.ts";
import { formatLanguageName, languages, wikiSearchOptions, Word, WordChainConfig } from "./misc.ts";

export default async function configWordChain(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
	newConfig: {
		channel: GuildTextBasedChannel;
		enabled?: boolean;
		logs?: GuildTextBasedChannel;
		language?: string;
		phrases?: boolean;
		silent?: boolean;
	},
): Promise<void> {
	assert(interaction.guild);

	const config = await WordChainConfig.findOneAndUpdate(
		{ channel: newConfig.channel.id },
		{ ...newConfig, channel: newConfig.channel.id, logs: newConfig.logs?.id },
		{ new: true, upsert: true, setDefaultsOnInsert: true },
	).exec();

	const latest = await Word.findOne({ channel: config.channel }).sort({ createdAt: -1 }).exec();
	await interaction.reply({
		embeds: [
			{
				title: "Word Chain Settings",
				color: constants.themeColor,
				description:
					`**Channel**: ${channelMention(config.channel)}\n` +
					`**Enabled**: ${constants.emojis.statuses[config.enabled ? "yes" : "no"]}\n\n` +
					`**Logs Channel**: ${await displayLogChannel(config, interaction.guild)}\n` +
					`**Phrases**: ${constants.emojis.statuses[config.phrases ? "yes" : "no"]}\n` +
					`**Language**: ${
						formatLanguageName(config.language) ||
						`${constants.emojis.statuses.no} *Unknown language!*`
					}${
						latest ?
							`\n\n*Last Word: ${hyperlink(
								latest.word,
								messageLink(config.channel, latest.id, interaction.guild.id),
							)} by ${userMention(latest.author)}*`
						:	""
					}`,
			},
		],
	});
}
export function autocompleteLanguage(
	interaction: AutocompleteInteraction<"cached" | "raw">,
): ApplicationCommandOptionChoiceData<string>[] {
	return matchSorter(
		Object.values(languages),
		interaction.options.getString("language") ?? "",
		wikiSearchOptions,
	).map((language) => ({ name: formatLanguageName(language), value: language.code }));
}
