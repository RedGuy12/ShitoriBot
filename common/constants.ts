import type { Snowflake } from "discord.js";

const env =
	process.argv.some((file) => file.endsWith(".test.js")) ? "testing"
	: process.env.NODE_ENV === "production" ? "production"
	: "development";

export default {
	collectorTime: 45_000,

	channels: {
		logs: "897639265696112670",
	},

	emojis: {
		message: {
			add: "<:emoji:938441019278635038>",
			boost: "<:emoji:938441038756986931>",
			call: "<:emoji:1202779913975894058>",
			checkmark: "<:emoji:1307192889226559580>",
			edit: "<:emoji:938441054716297277>",
			error: "<:emoji:949439327413358602>",
			fail: "<:emoji:1048464674892558396>",
			forward: "<:emoji:1307195472573632532>",
			live: "<:emoji:1202777724519845918>",
			pin: "<:emoji:1202777778345218048>",
			poll: "<:emoji:1307193974410182767>",
			raisedHand: "<:emoji:1202777719461646406>",
			remove: "<:emoji:947707131879104554>",
			reply: "<:emoji:1202777780077469708>",
			sad: "<:emoji:1307190290234478682>",
			speaker: "<:emoji:1202777720971464704>",
			stage: "<:emoji:1202777723001380936>",
			subscription: "<:emoji:1202777717439987722>",
			success: "<:emoji:1048464639056420885>",
			thread: "<:emoji:1202777726478450730>",
			warning: "<:emoji:1048466347039928370>",
		},

		misc: {
			loading: "<a:emoji:949436374174560276>",
		},

		statuses: { no: "<:emoji:1016127863273037935>", yes: "<:emoji:1016127835217334322>" },
	} satisfies Record<string, Record<string, `<${"a" | ""}:emoji:${Snowflake}>`>>,

	env,

	testingServer: "823941138653773868",
	themeColor: 0x00_00_00, // TODO

	users: {
		bot: "823932474118635540",
	},
} as const;
