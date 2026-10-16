import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWithI18n from './AppWithI18n';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import { getStoredTheme } from './theme';

// Set before first render so the page never flashes the wrong palette.
document.documentElement.setAttribute('data-nw-theme', getStoredTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithI18n />
  </React.StrictMode>
);
