import {
	spawn as originalSpawn,
	SpawnOptionsWithoutStdio,
} from 'child_process';

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
	const { promisify } = require('util');
	const path = require('path');
	const fs = require('fs');
	const readdirAsync = promisify(fs.readdir);
	const unlinkAsync = promisify(fs.unlink);
	const rmdirAsync = promisify(fs.rmdir);
	const lstatAsync = promisify(fs.lstat); // fs.lstat can detect symlinks, fs.stat can't

	let files;

	try {
		files = await readdirAsync(dirPath);
	} catch (e) {
		throw new Error(e);
	}

	let clean = true;

	if (files.length) {
		for (const fileName of files) {
			if (skipDotFiles && fileName[0] === '.') {
				clean = false;
				continue;
			}

			const filePath = path.join(dirPath, fileName);
			const fileStat = await lstatAsync(filePath);
			const isDir = fileStat.isDirectory();

			if (isDir) {
				const suboptions: ICleanDirectoryOptions = {
					removeContentOnly: false,
					skipDotFiles,
				};
				const subdirclean = await cleanDirectory(filePath, suboptions);
				if (subdirclean) {
					await rmdirAsync(dirPath);
				} else {
					clean = false;
				}
			} else {
				await unlinkAsync(filePath);
			}
		}
	}

	if (!removeContentOnly) {
		await rmdirAsync(dirPath);
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
