# figma-tailwind-sync

A Node.js package that automatically syncs color variables from your Figma design system to your Tailwind CSS configuration. This tool helps maintain design consistency between Figma and your codebase by automatically updating your Tailwind color palette.

## Features

- 🎨 Syncs Figma color variables to Tailwind CSS
- 🔄 Handles variable aliases and nested color definitions
- 🎯 Preserves existing Tailwind configuration
- ⚡ Simple CLI interface
- 🔐 Secure environment variable configuration

## Installation

```bash
npm install figma-tailwind-sync
```

## Setup

1. Create a `env.local` file in your project root with the following variables:

```env
FIGMA_API_TOKEN=your_figma_personal_access_token
FIGMA_FILE_ID=your_figma_file_id
TAILWIND_CONFIG_PATH=./tailwind.config.js  # Optional, defaults to ./tailwind.config.js
```

To get these values:
- **FIGMA_API_TOKEN**: Generate a personal access token in Figma (Account Settings → Personal access tokens)
- **FIGMA_FILE_ID**: Get this from your Figma file URL: `figma.com/file/YOUR_FILE_ID/`

## Usage

### CLI

Run the sync command:

```bash
npx figma-tailwind-sync
```

### Programmatic Usage

```javascript
import { generateTailwindVariables } from 'figma-tailwind-sync';

// Call the function
await generateTailwindVariables();
```

## How It Works

1. Fetches color variables from your Figma file using the Figma API
2. Resolves any color aliases to their final values
3. Converts Figma's RGBA colors to hex format
4. Updates your Tailwind configuration file while preserving existing settings
5. Adds the colors under `theme.extend.colors` to avoid overriding Tailwind's defaults

## Output Format

Colors are added to your Tailwind config using the same names as in Figma. For example:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'primary': '#0066FF',
        'secondary': '#4D4D4D',
        // ... other colors from Figma
      }
    }
  }
}
```

## Error Handling

The tool includes helpful error messages for common issues:
- Missing environment variables
- Invalid Figma API token
- Inaccessible Figma file
- Circular color aliases
- File system errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

Ryan Wheatley

## Support

If you encounter any issues or have questions, please open an issue on the [GitHub repository](https://github.com/ryan-wheatley/figma-tailwind-sync).
