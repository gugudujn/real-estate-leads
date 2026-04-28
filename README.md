# Real Estate Leads

## Environment setup

OpenAI analysis is server-side only and always reads the API key from:

`process.env.OPENAI_API_KEY`

### Local development

1. Copy `.env.example` to `.env`
2. Set:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5.4-mini
```

3. Run:

```bash
npm run dev
```

`dotenv` loads `.env` locally for the server-side lead-analysis code. The API key is never exposed to the browser.

### Netlify

Set these environment variables in Netlify:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional

The deployed function and local development both use the same server-side access pattern:

`process.env.OPENAI_API_KEY`
