import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';

/**
 * Load environment variables from "env.local" at the root of the user's project.
 */
function loadEnv() {
  dotenv.config({ path: path.resolve(__dirname, '../../env.local') });

  // If not found, fallback to loading from process.cwd()
  if (!process.env.FIGMA_API_TOKEN || !process.env.FIGMA_FILE_ID) {
    dotenv.config({ path: path.join(process.cwd(), 'env.local') });
  }
}

loadEnv();

const figmaToken = process.env.FIGMA_API_TOKEN;
const fileId = process.env.FIGMA_FILE_ID;
const tailwindConfigPath = process.env.TAILWIND_CONFIG_PATH || './tailwind.config.js';

if (!figmaToken || !fileId) {
  console.log(chalk.red('❌ Missing required environment variables.'));
  console.log(chalk.yellow('⚠️ Ensure you have a valid env.local file with:'));
  console.log(chalk.cyan('FIGMA_API_TOKEN=your_figma_personal_access_token'));
  console.log(chalk.cyan('FIGMA_FILE_ID=your_figma_file_id'));
  process.exit(1);
}

/**
 * Convert RGBA (0-1 range) to hex (#rrggbb or #rrggbbaa).
 */
function rgbaToHex(r: number, g: number, b: number, a: number = 1): string {
  const to255 = (val: number) => Math.round(val * 255);
  const rr = to255(r).toString(16).padStart(2, '0');
  const gg = to255(g).toString(16).padStart(2, '0');
  const bb = to255(b).toString(16).padStart(2, '0');
  const aa = to255(a).toString(16).padStart(2, '0');

  return a === 1 ? `#${rr}${gg}${bb}` : `#${rr}${gg}${bb}${aa}`;
}

/**
 * Recursively resolves a color variable (handles aliases).
 */
function resolveColor(variableId: string, variablesById: Record<string, any>, visited: Set<string> = new Set()): string | null {
  if (visited.has(variableId)) {
    console.log(chalk.yellow('[Warning] Circular alias detected:'), chalk.cyan(variableId));
    return null;
  }
  visited.add(variableId);

  const variable = variablesById[variableId];
  if (!variable) return null;

  const modeIds = Object.keys(variable.valuesByMode || {});
  if (modeIds.length === 0) return null;

  const modeId = modeIds[0]; // Assume only one mode exists
  const modeValue = variable.valuesByMode[modeId];
  if (!modeValue) return null;

  return modeValue.type === 'VARIABLE_ALIAS'
    ? resolveColor(modeValue.id, variablesById, visited)
    : rgbaToHex(modeValue.r, modeValue.g, modeValue.b, modeValue.a);
}

/**
 * Main function: Fetch variables from Figma & update Tailwind config.
 */
export async function generateTailwindVariables(): Promise<void> {
  try {
    console.log(chalk.blue('🚀 Fetching variables from Figma...'));
    const url = `https://api.figma.com/v1/files/${fileId}/variables/local`;
    const response = await axios.get(url, {
      headers: { 'X-Figma-Token': figmaToken }
    });

    const { variables: figmaVariables = {} } = response.data;
    if (!Object.keys(figmaVariables).length) {
      console.log(chalk.yellow('⚠️ No variables found in this Figma file.'));
      return;
    }

    const variablesById = figmaVariables as Record<string, any>;
    const tailwindColors: Record<string, string> = {};

    for (const variableId of Object.keys(variablesById)) {
      const variable = variablesById[variableId];
      if (variable.resolvedType !== 'COLOR') continue;

      const name = variable.name; // Assuming kebab-case names in Figma
      const colorHex = resolveColor(variableId, variablesById);
      if (colorHex) {
        tailwindColors[name] = colorHex;
        console.log(chalk.green(`✔️  Added color: ${chalk.cyan(name)}`));
      }
    }

    let existingConfig: any = {};
    if (fs.existsSync(tailwindConfigPath)) {
      existingConfig = require(tailwindConfigPath);
    }

    existingConfig.theme = existingConfig.theme || {};
    existingConfig.theme.extend = existingConfig.theme.extend || {};
    existingConfig.theme.extend.colors = {
      ...existingConfig.theme.extend.colors,
      ...tailwindColors
    };

    fs.writeFileSync(
      tailwindConfigPath,
      `module.exports = ${JSON.stringify(existingConfig, null, 2)};\n`,
      'utf-8'
    );

    console.log(chalk.green.bold('✅ Tailwind config updated with Figma variables!'));
  } catch (err: any) {
    console.log(chalk.red('❌ Error:'), chalk.yellow(err.message));
  }
}
