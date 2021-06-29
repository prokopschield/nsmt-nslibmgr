import prompts from 'prompts';

// Do no change this.
const NAME = 'NAME';

export async function selector(
	question: string,
	options: {
		[returned_value: string]: string;
	}
): Promise<string> {
	return prompts([
		{
			type: 'select',
			name: NAME,
			message: question,
			choices: Object.entries(options).map(([value, title]) => ({
				value,
				title,
			})),
		},
	]).then((a) => a.NAME);
}

export default selector;
module.exports = selector;

Object.assign(selector, {
	default: selector,
	selector,
});
