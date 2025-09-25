# Quantum Physics Prototype

This project is built with [Vite](https://vitejs.dev/) and React. The production bundle must be generated before you deploy it to a static host; otherwise the browser receives the raw JSX sources and refuses to execute them because of the `text/jsx` MIME type.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The optimized assets are written to the `dist/` directory. Serve that directory (for example with `npm run preview`) or publish it via GitHub Pages.

## GitHub Pages deployment

A GitHub Actions workflow is included in `.github/workflows/deploy.yml`. To enable automated deployments:

1. Push the project to GitHub.
2. In the repository settings, enable GitHub Pages and select **GitHub Actions** as the source.
3. Every push to the `work` branch builds the project and publishes the contents of `dist/` to Pages.

This workflow ensures that the compiled JavaScript bundle is served with the correct MIME type, eliminating the "Expected a JavaScript-or-Wasm module" error.
