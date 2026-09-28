import { render } from 'preact';
import { App } from './ui/App';
import { init } from './ui/store';
import './ui/tokens.css';
import './ui/app.css';

init();
render(<App />, document.getElementById('app')!);
