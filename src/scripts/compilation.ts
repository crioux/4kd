import { join, sep } from 'path';

import { IContext, IDemoDefinition } from './definitions';
import { spawn } from './lib';

export const compile = async (
	context: IContext,
	demo: IDemoDefinition
): Promise<void> => {
	const { config } = context;
	const { compilation } = demo;
	const buildDirectory: string = config.get('paths:build');
	const demoDirectory: string = config.get('directory');

	let outArgs = ['/OUT:' + config.get('paths:exe')];

	for (const obj in compilation.asm.sources) {
		if (!compilation.asm.sources.hasOwnProperty(obj)) {
			continue;
		}
		const asmSource = compilation.asm.sources[obj];
		let args = compilation.asm.nasmArgs;

		if (asmSource.includes) {
			args = args.concat(asmSource.includes);
		}

		args = args.concat([
			'-f',
			'win32',
			'-i',
			buildDirectory + sep,
			'-i',
			demoDirectory + sep,
			'-o',
			obj,
			asmSource.source,
		]);

		await spawn(config.get('tools:nasm'), args);
	}

	for (const obj in compilation.cpp.sources) {
		if (!compilation.cpp.sources.hasOwnProperty(obj)) {
			continue;
		}
		const cppSource = compilation.cpp.sources[obj];

		let args = compilation.cpp.clArgs;

		if (cppSource.includes) {
			args = args.concat(cppSource.includes.map(filename => '/I' + filename));
		}

		args = args
			.concat(config.get('cl:args'))
			.concat([
				'/I' + join(config.get('tools:glew'), 'include'),
				'/FA',
				'/Fa' + obj + '.asm',
				'/c',
				'/Fo' + obj,
			])
			.concat(config.get('debug') ? ['/Zi', '/Fd' + buildDirectory + sep] : [])
			.concat([cppSource.source]);

		await spawn('cl', args);
	}

	outArgs = outArgs
		.concat(Object.keys(compilation.asm.sources))
		.concat(Object.keys(compilation.cpp.sources));

	return config.get('debug')
		? spawn(
				'link',
				compilation.linkArgs
					.concat(config.get('link:args'))
					.concat(['/DEBUG', '/INCREMENTAL:NO'])
					.concat([
						join(
							config.get('tools:glew'),
							'lib',
							'Release',
							'Win32',
							'glew32s.lib'
						),
					])
					.concat(outArgs)
		  )
		: spawn(
				config.get('tools:crinkler'),
				compilation.crinklerArgs
					.concat(config.get('crinkler:args'))
					.concat(['/REPORT:' + join(buildDirectory, 'stats.html')])
					.concat(outArgs)
		  );
};
