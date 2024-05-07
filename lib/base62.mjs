// https://gist.github.com/CatsMiaow/b479e96d5613dbd4711ab6d768b3eea0

export default class Base62 {
	constructor() {
		this.base = BigInt(62);
		this.charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
	}

	encode(integer) {
		if(Number(integer) === 0) {
			return "0";
		}

		let num = BigInt(integer);
		let str = [];

		while (num > 0) {
			str = [this.charset[Number(num % this.base)], ...str];
			num = num / this.base;
		}

		return str.join("");
	}

	decodeToBigint(str) {
		return str.split("").reverse().reduce(
			(prev, char, i) =>
				prev + (BigInt(this.charset.indexOf(char)) * (this.base ** BigInt(i))),
			BigInt(0));
	}

	decode(str) {
		return this.decodeToBigint(str).toString();
	}
}
