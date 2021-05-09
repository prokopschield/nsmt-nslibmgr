function semver (ver: string, type: 'M' | 'm' | 'p' | 'pM' | 'pm' | 'pp' | string): string {
	let [ maj, min, pat, pre ] = [ ...ver.split(/[^0-9]/g).map(a => +a), 0, 0, 0, 0 ];
	if (type.length == 2) {
		if (pre) ++pre; else {
			switch (type[1]) {
				case 'M': {
					++maj; ++pre;
					min = pat = 0;
					break;
				}
				case 'm': {
					++min; ++pre;
					pat = 0;
					break;
				}
				default: {
					++pat; ++pre;
				}
			}
		}
	} else switch(type[0]) {
		case 'M': {
			pre ? (min = pat = pre = 0) : (++maj, min = pat = pre = 0);
			break;
		}
		case 'm': {
			pre ? (pat = pre = 0) : (++min, pat = pre = 0);
			break;
		}
		default: {
			pre ? (pre = 0) : (++pat, pre = 0);
		}
	}
	return `${maj}.${min}.${pat}${pre ? ('-' + pre) : ''}`;
}

export default semver;
module.exports = semver;

Object.assign(semver, {
	default: semver,
	semver,
});
