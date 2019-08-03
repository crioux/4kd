import { stat } from 'fs-extra';
import * as notifier from 'node-notifier';
import { dirname, resolve } from 'path';

import { Config } from './config';
import { spawn } from './lib';

export class Monitor {
	private config: Config;
	private size: number = -1;

	constructor(config: Config) {
		this.config = config;
	}

	async run(callback: () => Promise<void>) {
		try {
			const startTime = Date.now();

			await callback();

			const endTime = Date.now();

			console.log('Build successful.');
			console.log(
				'Build duration: %s seconds.',
				((endTime - startTime) * 1e-3).toFixed(1)
			);
			console.log('Demo size: %d bytes.', this.size);
		} catch (err) {
			console.error('Build failed.');
			console.error(err);

			if (this.config.get('notify')) {
				notifier.notify({
					message: err.toString(),
					title: 'Build failed.',
				});
			}
		}
	}

	async notifySuccess() {
		const exePath = this.config.get('paths:exe');

		const stats = await stat(exePath);
		this.size = stats.size;

		if (this.config.get('notify')) {
			notifier.notify({
				message: this.size + ' bytes.',
				title: 'Build successful.',
				wait: true,
			});

			notifier.on('click', () => {
				spawn(resolve(exePath), [], {
					cwd: dirname(exePath),
				});
			});
		}
	}
}