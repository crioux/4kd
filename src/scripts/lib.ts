import {
	spawn as originalSpawn,
	SpawnOptionsWithoutStdio,
} from 'child_process';

import { lstat, mkdir, readdir, rmdir, unlink } from 'fs-extra';
import { join } from 'path';
import { IContext } from './definitions';

export interface ICleanDirectoryOptions {
	removeContentOnly?: boolean;
	skipDotFiles?: boolean;
}

export async function cleanDirectory(
	dirPath: string,
	options: ICleanDirectoryOptions = {}
): Promise<boolean> {
	const { removeContentOnly = false, skipDotFiles = false } = options;

	let files;

	try {
		files = await readdir(dirPath);
	} catch (e) {
		if (e.code === 'ENOENT') {
			if (removeContentOnly) {
				await mkdir(dirPath);
			}
			return true;
		}
		throw new Error(e);
	}

	let clean = true;

	if (files.length) {
		for (const fileName of files) {
			if (skipDotFiles && fileName[0] === '.') {
				clean = false;
				continue;
			}

			const filePath = join(dirPath, fileName);
			const fileStat = await lstat(filePath);
			const isDir = fileStat.isDirectory();

			if (isDir) {
				const suboptions: ICleanDirectoryOptions = {
					removeContentOnly: false,
					skipDotFiles,
				};
				const subdirclean = await cleanDirectory(filePath, suboptions);
				if (subdirclean) {
					await rmdir(dirPath);
				} else {
					clean = false;
				}
			} else {
				await unlink(filePath);
			}
		}
	}

	if (!removeContentOnly) {
		await rmdir(dirPath);
	}

	return clean;
}

export function emptyDirectories(context: IContext) {
	return Promise.all(
		[context.config.get('paths:build'), context.config.get('paths:dist')].map(
			(path) =>
				cleanDirectory(path, { removeContentOnly: true, skipDotFiles: true })
		)
	);
}

export function forEachMatch(
	regexp: RegExp,
	string: string,
	callback: (match: RegExpExecArray) => void
) {
	let match: RegExpExecArray | null = regexp.exec(string);
	while (match !== null) {
		callback(match);
		match = regexp.exec(string);
	}
}

export function spawn(
	command: string,
	args: readonly string[],
	options?: SpawnOptionsWithoutStdio
): Promise<void> {
	return new Promise((resolve, reject) => {
		console.log(`Executing ${command} ${args.join(' ')}`);
		const cp = originalSpawn(command, args, options);

		cp.stdout.on('data', (data) => {
			console.log(data.toString());
		});

		cp.stderr.on('data', (data) => {
			console.error(data.toString());
		});

		cp.on('close', (code, signal) => {
			if (code) {
				return reject(new Error(command + ' exited with code ' + code + '.'));
			} else if (signal) {
				return reject(
					new Error(command + ' was stopped by signal ' + signal + '.')
				);
			} else {
				return resolve();
			}
		});
	});
}
