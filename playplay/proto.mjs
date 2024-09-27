import protobufjs from "protobufjs";

protobufjs.parse.defaults.keepCase = true;

const {
	PlayPlayLicenseRequest,
	Interactivity,
	ContentType,
	PlayPlayLicenseResponse
} = protobufjs.loadSync("./playplay/playplay.proto");

export {
	PlayPlayLicenseRequest,
	Interactivity,
	ContentType,
	PlayPlayLicenseResponse
};