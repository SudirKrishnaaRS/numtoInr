# Rupees in Words

Converts an amount into words in the Indian numbering system (thousand, lakh, crore, paise), ready to copy onto a cheque or invoice. React + Tailwind, built with Vite. Everything runs in the browser; history and preferences live in `localStorage`.

## Run locally

```bash
npm install
npm run dev
```

`npm test` runs the conversion tests. `npm run build` writes the static site to `dist/`.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository on the `main` branch.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes `dist/`.

The Vite `base` path is derived from the repository name automatically, so a project site at `https://<user>.github.io/<repo>/` and a user site at `https://<user>.github.io/` both work.
