# ResumeIQ — AI Resume Analyzer

A portfolio-ready AI Resume Analyzer built as a zero-build static web app with a Cloudflare Pages Function.

## Features

- PDF resume upload
- Browser-side PDF text extraction with PDF.js
- Optional target job title and job description
- AI-powered resume score
- ATS, skills, and impact scores
- Strengths and skills-to-improve
- Actionable resume recommendations
- Interview question generation
- Gemini API key kept server-side in Cloudflare Pages Secrets

## Stack

- HTML, CSS, JavaScript
- PDF.js
- Cloudflare Pages + Pages Functions
- Google Gemini API

## Deploy to Cloudflare Pages

1. Connect this GitHub repository to Cloudflare Pages.
2. No build command is required.
3. Use the project root as the output directory.
4. In Settings → Variables and Secrets, add:
   - GEMINI_API_KEY = your Google Gemini API key
   - Optional GEMINI_MODEL = gemini-3.6-flash
5. Redeploy.

Never put the Gemini API key inside app.js or commit it to GitHub.

## Local development

Cloudflare Pages Functions require Wrangler for local development:

    npx wrangler pages dev .

Then open the local URL shown by Wrangler.

## Security notes

The browser extracts text locally and sends only the extracted text to /api/analyze. The Gemini API key is read only from the Cloudflare server-side environment.

For production use, add authentication, rate limiting, logging controls, and a privacy policy before accepting sensitive resumes at scale.

## License

MIT