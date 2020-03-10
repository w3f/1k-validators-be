import * as fs from 'fs';

export const wipe = (filepath: string) => {
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}
