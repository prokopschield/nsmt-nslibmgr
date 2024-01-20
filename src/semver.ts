export function semver(
	ver: string,
	type: "M" | "m" | "p" | "pM" | "pm" | "pp" | string
): string {
	let [maj, min, pat, pre] = [
		...ver.split(/[^0-9]/g).map((a) => +a),
		0,
		0,
		0,
		0,
	];
	if (type.length == 2) {
		if (pre) {
			if (
				type === "pp" ||
				(type === "pm" && !pat) ||
				(type === "pM" && !pat && !min)
			) {
				++pre;
			} else if (type === "pm") {
				++min;
				pre = 1;
				pat = 0;
			} else {
				++maj;
				pre = 1;
				pat = min = 0;
			}
		} else {
			switch (type[1]) {
				case "M": {
					++maj;
					++pre;
					min = pat = 0;
					break;
				}
				case "m": {
					++min;
					++pre;
					pat = 0;
					break;
				}
				default: {
					++pat;
					++pre;
				}
			}
		}
	} else
		switch (type[0]) {
			case "M": {
				if (pre && !pat && !min) {
					min = pat = pre = 0;
				} else {
					++maj, (min = pat = pre = 0);
				}
				break;
			}
			case "m": {
				if (pre && !pat) {
					pat = pre = 0;
				} else {
					++min, (pat = pre = 0);
				}
				break;
			}
			default: {
				pre ? (pre = 0) : (++pat, (pre = 0));
			}
		}
	return `${maj}.${min}.${pat}${pre ? "-" + pre : ""}`;
}

export default semver;
module.exports = semver;

Object.assign(semver, {
	default: semver,
	semver,
});
