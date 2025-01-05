import type {
	InteractionResponse,
	Message,
	MessageContextMenuCommandInteraction,
	Snowflake,
} from "discord.js";

import assert from "node:assert";

import didYouMean, { ReturnTypeEnums, ThresholdTypeEnums } from "didyoumean2";
import { ChannelType, ComponentType, MessageType, TextInputStyle } from "discord.js";
import {
	client,
	getBaseChannel,
	GlobalUsersPattern,
	InvitesPattern,
	stripMarkdown,
} from "strife.js";

import constants from "../../common/constants.ts";
import { GlobalBotInvitesPattern, messageToText } from "../../util/discord.ts";
import { normalize } from "../../util/text.ts";
import { Chat, ChatConfig, ChatConsent } from "./misc.ts";

const chats = await Chat.find({}).lean();

export default async function sendChat(message: Message<true>): Promise<string | undefined> {
	if (
		message.author.id === client.user.id ||
		(!message.mentions.has(client.user) &&
			message.mentions.users.size > (message.mentions.has(message.author) ? 1 : 0))
	)
		return;

	const config = await ChatConfig.findOne({ guild: message.guild.id }).exec();
	if (message.channel.id !== config?.channel || !config.enabled) return;

	const prompt = stripMarkdown(normalize(messageToText(message, false))).replaceAll(
		GlobalUsersPattern,
		client.user.toString(),
	);

	const response = getResponse(0.9) ?? getResponse(0.75) ?? getResponse(0.45);
	if (!response) return;
	
	return response
		.replaceAll(client.user.toString(), message.author.toString())
		.replaceAll("<@0>", client.user.toString());

	function getResponse(threshold: number): string | undefined {
		const responses = didYouMean(
			prompt,
			chats.filter(
				(chat) =>
					chat.guild === message.guild.id &&
					chat.response !== prompt &&
					!removedResponses[message.guild.id]?.has(chat.response),
			),
			{
				matchPath: ["prompt"],
				returnType: ReturnTypeEnums.ALL_CLOSEST_MATCHES,
				thresholdType: ThresholdTypeEnums.SIMILARITY,
				threshold,
			},
		).toSorted(() => Math.random() - 0.5);
		return responses[0]?.response;
	}
}

const previousMessages: Record<Snowflake, Message> = {};
export async function learn(message: Message<true>): Promise<void> {
	const config = await ChatConfig.findOne({ guild: message.guild.id }).exec();
	if (!config?.enabled || message.channel.id === config.channel) return;

	const previous = previousMessages[message.channel.id];
	previousMessages[message.channel.id] = message;
	if (
		message.interactionMetadata ||
		[message.author.id, previous?.author.id].includes(client.user.id)
	)
		return;

	const consent = await ChatConsent.findOne({ user: message.author.id }).exec();
	if (!consent || !(consent.guilds.get(message.guild.id) ?? consent.default)) return;

	const baseChannel = getBaseChannel(message.channel);
	if (
		message.channel.type === ChannelType.PrivateThread ||
		!baseChannel ||
		baseChannel.isDMBased() ||
		!baseChannel.permissionsFor(baseChannel.guild.id)?.has("ViewChannel")
	)
		return;

	const response = messageToText(message, false)
		.replaceAll(message.author.toString(), "<@0>")
		.replaceAll(GlobalUsersPattern, client.user.toString());
	if (
		!response ||
		response.length > 500 ||
		response.split("\n").length > 5 ||
		response.match(InvitesPattern)?.length ||
		response.match(GlobalBotInvitesPattern)?.length
	)
		return;

	const reference =
		message.type === MessageType.Reply ?
			await message.fetchReference().catch(() => void 0)
		:	previous;
	const prompt =
		reference &&
		stripMarkdown(normalize(messageToText(reference, false).toLowerCase())).replaceAll(
			GlobalUsersPattern,
			client.user.toString(),
		);

	if (reference?.author.id === message.author.id || prompt === undefined || prompt === response)
		return;
	chats.push(await new Chat({ guild: message.guild.id, prompt, response }).save());
}

const removedResponses: Record<Snowflake, Set<string>> = {};
export async function removeResponse(
	interaction: MessageContextMenuCommandInteraction<"cached" | "raw">,
): Promise<InteractionResponse | undefined> {
	assert(interaction.guild);

	await interaction.showModal({
		title: "Confirm Permament Response Removal",
		customId: interaction.id,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						style: TextInputStyle.Short,
						label: "Please confirm to remove this response",
						required: true,
						customId: "confirm",
						placeholder: "Type anything in this box to confirm. This is irreversible.",
					},
				],
			},
		],
	});

	const modalInteraction = await interaction
		.awaitModalSubmit({
			time: constants.collectorTime,
			filter: (modalInteraction) => modalInteraction.customId === interaction.id,
		})
		.catch(() => void 0);

	if (!modalInteraction) return;
	await modalInteraction.deferReply({ ephemeral: true });

	const response = interaction.targetMessage.content
		.replaceAll(client.user.toString(), "<@0>")
		.replaceAll(interaction.targetMessage.author.toString(), client.user.toString());
	removedResponses[interaction.guild.id] ??= new Set();
	removedResponses[interaction.guild.id]?.add(response);

	const { deletedCount } = await Chat.deleteMany({
		guild: interaction.guild.id,
		response,
	}).exec();
	await modalInteraction.editReply(
		deletedCount ?
			`${constants.emojis.statuses.yes} Deleted ${deletedCount.toLocaleString()} prompts with that response.`
		:	`${constants.emojis.statuses.no} Could not find that as a response to any prompt.`,
	);
}
