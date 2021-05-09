import fs from 'fs';

class GitIgnore {
	
	entries: string[] = (
		fs.existsSync('.gitignore')
		? fs.readFileSync('.gitignore', 'utf8').split(/[\r\n]+/g)
		: ['']
	)

	add (entry: string) {
		this.remove(entry.replace(/[\/]+$/g, ''));
		this.entries.push(entry);
		this.write();
	}

	remove (entry: string) {
		this.entries = this.entries.filter((a: string) => (a !== entry) && (a !== `${entry}/`));
		this.write();
	}

	write () {
		let a: string[] = [];
		for (const untrimmed_entry of this.entries) {
			const entry = untrimmed_entry.trim();
			if (entry && !a.includes(entry) && !entry.startsWith('#')) {
				a.push(entry);
			}
		}
		this.entries = a.sort((a, b) => (a.toLowerCase() < b.toLowerCase()) ? -1 : 1);
		fs.writeFileSync('.gitignore', this.entries.join('\n') + '\n');
	}

}

const gitignore = new GitIgnore;

export default gitignore;
module.exports = gitignore;

Object.assign(gitignore, {
	default: gitignore,
	gitignore,
});
