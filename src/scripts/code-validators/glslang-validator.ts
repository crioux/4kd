import { writeFile } from 'fs-extra';
import { Provider } from 'nconf';
import { join } from 'path';

import { IShaderDefinition, ICodeValidator, IPass } from '../definitions';
import { spawn } from '../lib';

export class GLSLangValidatorCodeValidator implements ICodeValidator {
	private config: Provider;

	constructor(config: Provider) {
		this.config = config;
	}

	getDefaultConfig() {
		return {};
	}

	checkConfig() {
		this.config.required(['tools:glslangValidator']);
	}

  async validatePass(definition: IShaderDefinition, mode:number, passName: IPass, index:number): Promise<void> {
    const { variables } = definition;

    const buildDirectory: string = this.config.get('paths:build');
    const ext = mode==0?'vert':'frag';
    const input = join(buildDirectory, 'validate_p'+index+'.'+ext);
    
    console.log("Validing pass #" + index + " " + ext + " shader: "+input);

		const shaderLines = [];
		if(definition.prologCode) {
			shaderLines.push(definition.prologCode);	
		}
		shaderLines.push('// Uniform arrays', '');

		Object.keys(definition.uniformArrays).forEach((type) => {
			shaderLines.push(
				`uniform ${type} ${definition.uniformArrays[type].name}[${definition.uniformArrays[type].variables.length}];`
			);
		});

		const nonUniformVariables = variables.filter(
			(variable) => variable.active && variable.kind !== 'uniform'
		);

		shaderLines.push(
			'',
			'#pragma separator',
			'// Non-uniform global variables',
			''
		);

		nonUniformVariables.forEach((variable) => {
			shaderLines.push(variable.type + ' ' + variable.name + ';');
		});

		if (definition.attributesCode) {
			shaderLines.push(
				'',
				'#pragma separator',
				'// Attributes',
				'',
				definition.attributesCode
			);
		}

		if (definition.varyingsCode) {
			shaderLines.push(
				'',
				'#pragma separator',
				'// Varyings',
				'',
				definition.varyingsCode
			);
		}

		if (definition.outputsCode) {
			shaderLines.push(
				'',
				'#pragma separator',
				'// Outputs',
				'',
				definition.outputsCode
			);
		}

		shaderLines.push('', '#pragma separator', '', definition.commonCode);

    if (mode==0) {
      if(!passName.vertexCode) {
        throw new Error("vertex code shouldn't be null");
      }
      shaderLines.push(
        '',
        '#pragma separator',
        `// Pass ${index} vertex`,
        ''
      );
      shaderLines.push(passName.vertexCode);
    }

    if (mode==1) {
      if(!passName.fragmentCode) {
        throw new Error("fragment code shouldn't be null");
      }
      shaderLines.push(
        '',
        '#pragma separator',
        `// Pass ${index} fragment`,
        ''
      );
      shaderLines.push(passName.fragmentCode);
    }

		await writeFile(input, shaderLines.join('\n'));

		const glslangValidatorPath = this.config.get('tools:glslangValidator');

    const args = [
      input
    ];

    return spawn(glslangValidatorPath, args);
  }


	async validate(definition: IShaderDefinition) {
    
    let fail = false ;

    interface IPassElement {
      passName: IPass;
      index: number;
    };
    let passes : Array<IPassElement> = [];
    definition.passes.forEach((passName, index) => {
      passes.push({passName:passName, index:index})
    });

    for(const pass of passes) {
			if (pass.passName.vertexCode) {
        try {
          await this.validatePass(definition,0,pass.passName,pass.index);
        }
        catch(error) {
          fail = true;
        }
			}
			if (pass.passName.fragmentCode) {
        try {
          await this.validatePass(definition,1,pass.passName,pass.index);
        }
        catch(error) {
          fail = true;
        }
			}
		}

    if(fail) {
      console.log("Validation errors. Stopping.");
      process.exit(1)
    }
	}
}
