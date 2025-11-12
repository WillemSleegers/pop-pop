import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

const svgPath = join(publicDir, 'icon.svg');

// Generate icons at different sizes
const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-icon.png', size: 180 },
];

async function generateIcons() {
  for (const { name, size } of sizes) {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(join(publicDir, name));

    console.log(`Generated ${name}`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
