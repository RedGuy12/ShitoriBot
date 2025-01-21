import type { Guild, Snowflake } from "discord.js";
import type { SendableChannel } from "strife.js";

import { assertSendable } from "../util/discord.ts";
import constants from "./constants.ts";

export async function displayLogChannel(
	config: { channel: Snowflake; logs?: Snowflake | null; silent?: boolean },
	guild: Guild,
): Promise<
	| `<#${Snowflake}>`
	| `<@${Snowflake}>`
	| `${typeof constants.emojis.statuses.no} __Unknown log channel!__`
	| "*silent*"
> {
	const channel = await getLogChannel(config, guild);
	if (channel) return channel.toString();
	if (channel === false)
		return `${constants.emojis.statuses.no} __Unknown log channel!__` as const;
	return "*silent*" as const;
}
export async function getLogChannel(
	config: { channel: Snowflake; logs?: Snowflake | null; silent?: boolean },
	guild: Guild,
): Promise<SendableChannel | false | undefined> {
	if (config.silent) return;
	const logs = await guild.channels.fetch(config.logs ?? config.channel).catch(() => void 0);
	return (logs && assertSendable(logs)) ?? false;
}
