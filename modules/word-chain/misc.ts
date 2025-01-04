import mongoose from "mongoose";

export const WordChainConfig = mongoose.model(
	"WordChainConfig",
	new mongoose.Schema({
		channel: { type: String, required: true },
		enabled: { type: Boolean, default: true },
		language: { type: String, default: "en" },
		logs: String,
		phrases: { type: Boolean, default: false }, // TODO: DB transfer reminder - enable for guild 774935082909433876
		silent: { type: Boolean, default: false },
	}),
);
export const Word = mongoose.model(
	"Word",
	new mongoose.Schema(
		{
			channel: { type: String, required: true },
			author: { type: String, required: true },
			id: { type: String, required: true },
			word: { type: String, required: true },
		},
		{ timestamps: true },
	),
);

export const wikiSearchOptions = { keys: ["code", "name", "localname"] };

export function formatLanguageName(identifier: Language): string;
export function formatLanguageName(identifier: string): string | undefined;
export function formatLanguageName(identifier: Language | string): string | undefined {
	const { name, localname } =
		typeof identifier === "object" ? identifier : (languages[identifier] ?? {});
	if (!name) return;

	return localname && name !== localname ? `${name} (${localname})` : name;
}

const languageIndex = await fetch(
	`https://en.wiktionary.org/w/api.php?${new URLSearchParams({
		format: "json",
		action: "expandtemplates",
		text: "{{#invoke:JSON data|export_languages|TWO_LETTER|1}}",
		prop: "wikitext",
	})}`,
)
	.then((response) => response.text())
	.then((text) => {
		try {
			const response = JSON.parse(text) as WiktionaryExpandtemplatesResult | WiktionaryError;
			if ("error" in response)
				throw new ReferenceError("Error calling `expandtemplates` API", {
					cause: response,
				});
			return JSON.parse(response.expandtemplates.wikitext) as Record<string, string>;
		} catch (error) {
			throw new AggregateError([error], "Error parsing `expandtemplates` API result", {
				cause: text,
			});
		}
	});
const languageList = Object.entries(languageIndex).map(([code, name]): [string, Language] => [
	code,
	{
		code,
		name,
		localname: new Intl.DisplayNames(code, { type: "language", fallback: "none" }).of(code),
	},
]);
export const languages = Object.fromEntries(languageList);

export async function isWord(word: string, language: Language): Promise<boolean> {
	const response = await fetch(
		`https://en.wiktionary.org/w/api.php?${new URLSearchParams({
			format: "json",
			action: "parse",
			page: word,
			prop: ["categories", "sections"].join("|"),
			redirects: true.toString(),
		})}`,
	)
		.then((response) => response.text())
		.then((text) => {
			try {
				return JSON.parse(text) as WiktionaryParseResult | WiktionaryError;
			} catch (error) {
				throw new AggregateError([error], "Error parsing `parse` API result", {
					cause: text,
				});
			}
		});

	if ("error" in response) return false;
	if (
		response.parse.categories.some(
			(category) => category["*"] === `${language.name} misspellings`,
		)
	)
		return false;
	return response.parse.sections.some(
		(section) => section.level === "2" && section.line === language.name,
	);
}

export type Category = { "sortkey": string; "hidden"?: ""; "*": string };
export type CategoryMember = { pageid: number; ns: number; title: string };
export type Language = { code: string; name: string; localname?: string };
export type Redirect = { from: string; to: string };
export type Section = {
	toclevel: number;
	level: `${number}`;
	line: string;
	number: string;
	index: `${number}`;
	fromtitle: string;
	byteoffset: number;
	anchor: string;
	linkAnchor: string;
};

export type WiktionaryExpandtemplatesResult = { expandtemplates: { wikitext: string } };
export type WiktionaryParseResult = {
	parse: {
		title: string;
		pageid: number;
		redirects: Redirect[];
		categories: Category[];
		sections: Section[];
		showtoc?: "";
	};
};
export type WiktionaryQueryCategorymembersResult = {
	batchcomplete?: "";
	limits: { categorymembers: number };
	query: { categorymembers: CategoryMember[] };
};
export type WiktionaryError = {
	error: { "code": string; "info": string; "*": string };
	servedby: string;
};
