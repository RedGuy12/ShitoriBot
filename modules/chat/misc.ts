import mongoose from "mongoose";

export const ChatConfig = mongoose.model(
	"ChatConfig",
	new mongoose.Schema({
		guild: { type: String, required: true },
		channel: String,
		enabled: { type: Boolean, default: false },
	}),
);

export const Chat = mongoose.model(
	"Chat",
	new mongoose.Schema({
		guild: { type: String, required: true },
		prompt: String,
		response: { type: String, required: true },
	}),
);
export const ChatConsent = mongoose.model(
	"ChatConsent",
	new mongoose.Schema({
		user: { type: String, required: true },
		default: { type: Boolean, default: false },
		guilds: { type: Map, of: Boolean, default: {} },
	}),
);
