# YeGPT

A parody Kanye West AI chatbot UI — ask it anything and get an answer delivered with maximum confidence, questionable humility, and 808s.

> Built for entertainment. YeGPT is a parody chatbot inspired by internet meme culture and pop culture. Responses are fictional and comedic, and do not represent Kanye West's real opinions or actions.

## Stack

- [Next.js 13](https://nextjs.org/) (Pages Router)
- [React 18](https://react.dev/)
- [Axios](https://axios-http.com/) for talking to the YeGPT backend
- [react-cookie](https://www.npmjs.com/package/react-cookie) + `localStorage` for persisting chat history
- Font Awesome (icons) + [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) (type)

The frontend is a static chat client — all "AI" responses come from a hosted backend (`https://ye-gpt-backend.vercel.app/bot`), not from any code in this repo.

## Features

- Glassmorphism chat UI with animated gradient background
- Welcome screen with clickable suggestion prompts when there's no chat history yet
- Rotating Kanye-flavored loading captions ("Thinking in 808s...", "Calling Mike Dean...") while waiting on a response
- Rotating placeholder prompts in the input field
- Randomized in-character error messages if the request fails
- Chat history persisted across refreshes via cookies/localStorage

## Getting Started

Install dependencies:

```bash
npm install
# or
yarn
```

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to use the chatbot. No environment variables or local backend are required — the app calls the hosted YeGPT backend directly.

## Project Structure

- `pages/index.js` — the chat UI and all client logic
- `pages/_app.js` — global app wrapper
- `styles/globals.css` — all chat UI styling
- `yegpt-ui.md` — source copy for the Kanye-flavored UI text (prompts, loading messages, errors, etc.)

## Other Scripts

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint    # lint with eslint-config-next
```

## Deploy

The easiest way to deploy is via [Vercel](https://vercel.com/new), the creators of Next.js. See the [Next.js deployment docs](https://nextjs.org/docs/deployment) for details.
