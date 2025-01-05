import mongoose from "mongoose";

export const OuijaBoardConfig = mongoose.model(
	"OuijaBoardConfig",
	new mongoose.Schema({
		channel: { type: String, required: true },
		enabled: { type: Boolean, default: true },
		complete: { type: String, default: "goodbye" },
	}),
);

export const Ouija = mongoose.model(
	"Ouija",
	new mongoose.Schema({
		channel: { type: String, required: true },
		answer: { type: String, default: "" },
		owner: { type: String, required: true },
		lastUser: String,
	}),
);
