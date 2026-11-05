import '../ui/styles.css';
import { REVISION } from 'three';
import { createDesignState } from '../design/designState';
import { getViewerConfig } from '../viewer/viewerConfig';
import { mountWorkspace } from '../ui/mountWorkspace';
import { connectViewer } from '../ui/connectViewer';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('找不到应用挂载节点 #app');
const state = createDesignState();
const unmount = mountWorkspace(root, state);
const disconnect = connectViewer(root, state);
if (getViewerConfig().debug) console.info('[ZAODIAN B4]', { threeRevision: REVISION, state });
if (import.meta.hot) import.meta.hot.dispose(() => { disconnect(); unmount(); });
