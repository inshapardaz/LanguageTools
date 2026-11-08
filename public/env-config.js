// Runtime environment config. Left empty for local development (src/config.ts falls back to
// VITE_* vars / localhost defaults). In the Docker image this file is regenerated at container
// startup from the API_URL / MAIN_SITE / NODE_ENV (and the app links LIBRARIES_URL / LIBRARY_EDITOR_URL /
// DICTIONARY_URL) environment variables.
window.__ENV__ = {};
