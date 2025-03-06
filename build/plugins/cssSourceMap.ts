// Reference: https://github.com/summernote/summernote/pull/4656
import autoprefixer from 'autoprefixer';
import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import type { Plugin } from 'vite';

/**
 * Vite does not support source map for css files.
 * So we will need this custom plugin is to generate source map for css files.
 */
export default function vitePostCSSSourceMap(): Plugin {
  return {
    name: 'vite-postcss-sourcemap',
    writeBundle(options, bundle) {
      const cssFiles = Object.keys(bundle).filter((fileName) =>
        fileName.endsWith('.css'),
      );

      cssFiles.forEach(async (cssFile) => {
        const filePath = path.resolve(options.dir!, cssFile);
        const css = fs.readFileSync(filePath, 'utf8');

        try {
          const result = await postcss([autoprefixer]).process(css, {
            from: cssFile,
            to: cssFile,
            map: { inline: false, annotation: true },
          });

          fs.writeFileSync(filePath, result.css);
          if (result.map) {
            fs.writeFileSync(`${filePath}.map`, result.map.toString());
          }

          console.log(`Generated source map for ${cssFile}`);
        } catch (error) {
          console.error(`Error processing ${cssFile}:`, error);
        }
      });
    },
  };
}
