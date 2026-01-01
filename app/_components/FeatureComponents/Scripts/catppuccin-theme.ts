import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export const catppuccinMocha: Extension = EditorView.theme({
  '&': {
    backgroundColor: '#1e1e2e',
    color: '#cdd6f4',
    fontSize: '14px',
    fontFamily: 'JetBrains Mono, monospace',
    border: '1px solid #45475a',
    borderRadius: '0',
  },
  '.cm-content': { caretColor: '#f5e0dc', padding: '12px' },
  '.cm-gutters': {
    backgroundColor: '#181825',
    color: '#6c7086',
    borderRight: '1px solid #45475a',
  },
}, { dark: true });

export const catppuccinLatte: Extension = EditorView.theme({
  '&': {
    backgroundColor: '#eff1f5',
    color: '#4c4f69',
    fontSize: '14px',
    fontFamily: 'JetBrains Mono, monospace',
    border: '1px solid #9ca0b0',
    borderRadius: '0',
  },
  '.cm-content': { caretColor: '#dc8a78', padding: '12px' },
  '.cm-gutters': {
    backgroundColor: '#e6e9ef',
    color: '#8c8fa1',
    borderRight: '1px solid #9ca0b0',
  },
}, { dark: false });
