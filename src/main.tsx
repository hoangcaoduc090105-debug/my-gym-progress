import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Chỉ 2 subset cần cho tiếng Việt (vietnamese + latin) × 4 độ đậm = 8 tệp woff2; bỏ latin-ext.
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-700.css';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/latin-700.css';
import './index.css';
import { App } from './app/App';
import { applyTheme, watchSystemTheme } from './lib/theme';

applyTheme();
watchSystemTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
