import protobufjs from "protobufjs"

protobufjs.parse.defaults.keepCase = true;

const {
	nested: {
		pywidevine_license_protocol: {
			ProtocolVersion,
			ClientIdentification,
			LicenseRequest,
			SignedMessage,
			LicenseType,
			License,
			WidevinePsshData
		}
	}
} = protobufjs.loadSync("./widevine/license_protocol.proto");

export {
	ProtocolVersion,
	ClientIdentification,
	LicenseRequest,
	SignedMessage,
	LicenseType,
	License,
	WidevinePsshData
};