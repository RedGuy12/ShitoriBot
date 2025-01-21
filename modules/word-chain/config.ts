import type {
	ApplicationCommandOptionChoiceData,
	AutocompleteInteraction,
	ButtonInteraction,
	ChatInputCommandInteraction,
	GuildTextBasedChannel,
	ModalSubmitInteraction,
	Snowflake,
} from "discord.js";

import assert from "node:assert";

import {
	ButtonStyle,
	channelMention,
	ComponentType,
	hyperlink,
	messageLink,
	PermissionFlagsBits,
	TextInputStyle,
	userMention,
} from "discord.js";
import { matchSorter } from "match-sorter";
import { client } from "strife.js";

import constants from "../../common/constants.ts";
import { displayLogChannel } from "../../common/misc.ts";
import { assertSendable } from "../../util/discord.ts";
import { normalize } from "../../util/text.ts";
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
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						customId: `${config.channel},${interaction.user.id}_setLastLetter`,
						label: "Set Last Letter",
						style: ButtonStyle.Primary,
					},
				],
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

export async function promptLastLetter(
	interaction: ButtonInteraction,
	data: Snowflake,
): Promise<void> {
	const [channelId, userId] = data.split(",");
	if (interaction.user.id !== userId) return;
	await interaction.showModal({
		title: "Set Last Letter",
		customId: `${channelId}_setLastLetter`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						customId: "letter",
						label: "Last Letter",
						style: TextInputStyle.Short,
						required: true,
					},
				],
			},
		],
	});
}

export async function setLastLetter(
	interaction: ModalSubmitInteraction,
	channelId: string,
): Promise<void> {
	const config = await WordChainConfig.findOne({ channel: channelId }).exec();
	if (!config) {
		await interaction.reply({
			ephemeral: true,
			content: `${
				constants.emojis.statuses.no
			} Could not find a Word Chain configuration for ${channelMention(channelId)}!`,
		});
		return;
	}

	const letter = normalize(interaction.fields.getTextInputValue("letter")).toUpperCase();

	const channel = await interaction.guild?.channels
		.fetch(channelId)
		.then((channel) => channel && assertSendable(channel));
	const message = channel && (await channel.send(letter));
	if (channel?.permissionsFor(client.user)?.has(PermissionFlagsBits.AddReactions))
		await message?.react("👍");

	await config
		.updateOne({ lastLetter: letter, lastAuthor: interaction.user.id, lastId: null })
		.exec();
	await interaction.reply(
		`${constants.emojis.statuses.yes} Set the last letter in ${channelMention(
			channelId,
		)} to ${letter}!`,
	);
}
