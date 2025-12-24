# Environment Setup

This project uses environment variables to securely store API keys and other sensitive configuration.

## Setup Instructions

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Get your OpenRouter API key:**
   - Visit [openrouter.ai/keys](https://openrouter.ai/keys)
   - Create a new API key
   - Copy the key

3. **Add your API key to `.env`:**
   ```
   EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
   ```

4. **Restart your development server:**
   ```bash
   npx expo start -c
   ```

## Important Security Notes

- **Never commit `.env` files** to version control
- The `.env` file is already in `.gitignore` to prevent accidental commits
- Only commit `.env.example` with placeholder values
- If you accidentally expose an API key, immediately:
  1. Revoke it at [openrouter.ai/keys](https://openrouter.ai/keys)
  2. Create a new key
  3. Update your `.env` file

## Environment Variables

- `EXPO_PUBLIC_OPENROUTER_API_KEY` - Your OpenRouter API key for AI transcription and analysis
