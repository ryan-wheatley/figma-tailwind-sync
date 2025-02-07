"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTailwindVariables = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
/**
 * Load environment variables from "env.local" at the root of the user's project.
 */
function loadEnv() {
    dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../env.local') });
    // If not found, fallback to loading from process.cwd()
    if (!process.env.FIGMA_API_TOKEN || !process.env.FIGMA_FILE_ID) {
        dotenv_1.default.config({ path: path_1.default.join(process.cwd(), 'env.local') });
    }
}
// Call it immediately so we always have env variables
loadEnv();
// Read configuration
const figmaToken = process.env.FIGMA_API_TOKEN;
const fileId = process.env.FIGMA_FILE_ID;
const tailwindConfigPath = process.env.TAILWIND_CONFIG_PATH || './tailwind.config.js';
// Ensure required values exist
if (!figmaToken || !fileId) {
    console.error('❌ Missing required environment variables.');
    console.error('Ensure you have a valid env.local file with:');
    console.error('FIGMA_API_TOKEN=your_figma_personal_access_token');
    console.error('FIGMA_FILE_ID=your_figma_file_id');
    process.exit(1);
}
/**
 * Convert RGBA (0-1 range) to hex (#rrggbb or #rrggbbaa).
 */
function rgbaToHex(r, g, b, a = 1) {
    const to255 = (val) => Math.round(val * 255);
    const rr = to255(r).toString(16).padStart(2, '0');
    const gg = to255(g).toString(16).padStart(2, '0');
    const bb = to255(b).toString(16).padStart(2, '0');
    const aa = to255(a).toString(16).padStart(2, '0');
    return a === 1 ? `#${rr}${gg}${bb}` : `#${rr}${gg}${bb}${aa}`;
}
/**
 * Recursively resolves a color variable (handles aliases).
 */
function resolveColor(variableId, variablesById, visited = new Set()) {
    if (visited.has(variableId)) {
        console.warn('[Warning] Circular alias detected:', variableId);
        return null;
    }
    visited.add(variableId);
    const variable = variablesById[variableId];
    if (!variable)
        return null;
    const modeIds = Object.keys(variable.valuesByMode || {});
    if (modeIds.length === 0)
        return null;
    const modeId = modeIds[0]; // Assume only one mode exists
    const modeValue = variable.valuesByMode[modeId];
    if (!modeValue)
        return null;
    return modeValue.type === 'VARIABLE_ALIAS'
        ? resolveColor(modeValue.id, variablesById, visited)
        : rgbaToHex(modeValue.r, modeValue.g, modeValue.b, modeValue.a);
}
/**
 * Main function: Fetch variables from Figma & update Tailwind config.
 */
function generateTailwindVariables() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🚀 Fetching variables from Figma...');
            const url = `https://api.figma.com/v1/files/${fileId}/variables`;
            const response = yield axios_1.default.get(url, {
                headers: { 'X-Figma-Token': figmaToken }
            });
            const { variables: figmaVariables = {} } = response.data;
            if (!Object.keys(figmaVariables).length) {
                console.log('⚠️ No variables found in this Figma file.');
                return;
            }
            const variablesById = figmaVariables;
            const tailwindColors = {};
            for (const variableId of Object.keys(variablesById)) {
                const variable = variablesById[variableId];
                if (variable.resolvedType !== 'COLOR')
                    continue;
                const name = variable.name; // Assuming kebab-case names in Figma
                const colorHex = resolveColor(variableId, variablesById);
                if (colorHex)
                    tailwindColors[name] = colorHex;
            }
            // Read existing Tailwind config
            let existingConfig = {};
            if (fs_1.default.existsSync(tailwindConfigPath)) {
                existingConfig = require(tailwindConfigPath);
            }
            existingConfig.theme = existingConfig.theme || {};
            existingConfig.theme.extend = existingConfig.theme.extend || {};
            existingConfig.theme.extend.colors = Object.assign(Object.assign({}, existingConfig.theme.extend.colors), tailwindColors);
            // Write the updated config
            fs_1.default.writeFileSync(tailwindConfigPath, `module.exports = ${JSON.stringify(existingConfig, null, 2)};\n`, 'utf-8');
            console.log('✅ Tailwind config updated with Figma variables!');
        }
        catch (err) {
            console.error('❌ Error:', err.message);
        }
    });
}
exports.generateTailwindVariables = generateTailwindVariables;
