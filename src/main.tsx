import { render } from 'preact';
import { App } from './ui/App';
import { init } from './ui/store';
import './ui/styles.css';

init();
render(<App />, document.getElementById('app')!);
