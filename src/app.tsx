import { createRoot } from 'react-dom/client';
import Root from './components/root';

import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/photo_mapper.css';

const root = createRoot(document.getElementById('root'));
root.render(<Root />);
