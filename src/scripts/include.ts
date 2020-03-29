import { readFile } from 'fs-extra';
import { join, dirname, normalize } from 'path';

const re_include_quotes = /#include\s*"([^"]*)"/;
const re_include_brackets = /#include\s*"([^<]*)>/;

async function processAllIncludes(currentFile: string, include_stack: Array<string>): Promise<string>
{
  let filedata = await readFile(currentFile,'utf8');
  let offset = 0
  while(true) {
    let filedataslice = filedata.slice(offset);
    let match = filedataslice.match(re_include_quotes);
    if(!match) {
      match = filedataslice.match(re_include_brackets);
      if(!match) {
        break;
      }
    }
    
    // process match, replace in string, and 
    let includefile = match[1];
    let includepath = normalize(join(dirname(currentFile), includefile));
    let replace_point = match.index;
    if(replace_point===undefined) {
      throw TypeError("invalid match index");    
    }
    let replace_length = match[0].length;
    
    // suboptimal but we don't support ifdef, treat like #pragma once everywhere
    let replace_string = ""
    if(!include_stack.includes(includepath)) {
      // replace includes in includes
      include_stack.push(currentFile) 
      replace_string = await processAllIncludes(includepath, include_stack)
      include_stack.pop()
    }
    
    filedata = filedata.slice(0, offset + replace_point) + replace_string + filedata.slice(offset + replace_point + replace_length);
    offset = offset + replace_point + replace_string.length
  }

  return filedata
}

export async function processIncludes(currentFile: string): Promise<string>
{
  return processAllIncludes(currentFile, []);
}