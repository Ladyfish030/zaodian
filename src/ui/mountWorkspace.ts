import type { DesignState } from '../design/designTypes';
import { getAssetCatalog, getRequestedAsset } from '../viewer/assetCatalog';

export function mountWorkspace(root: HTMLElement, state: DesignState): () => void {
  const assets = getAssetCatalog(), active = getRequestedAsset();
  root.innerHTML = `
    <a class="skip-link" href="#viewport">跳到模型视口</a>
    <header class="app-header">
      <a class="brand" href="./" aria-label="造点工作台首页"><span class="brand-mark">造</span><span>造点 <b>ZAODIAN</b></span></a>
      <label class="model-picker"><span class="project-dot"></span><span>选择模型</span><select aria-label="选择模型">${assets.map(asset => `<option value="${asset.id}" ${asset.id === active.id ? 'selected' : ''}>${asset.label}</option>`).join('')}</select></label>
      <span class="phase-pill">B4 · 独立换布</span>
    </header>
    <main class="workspace">
      <aside class="panel parts-panel" aria-labelledby="parts-title">
        <div class="panel-heading"><span class="eyebrow">01 / STRUCTURE</span><h1 id="parts-title">模型部件</h1><p>点击列表或模型，选择一块裁片。</p></div>
        <div class="empty-panel"><span class="empty-symbol" aria-hidden="true">▱</span><h2>部件尚未载入</h2><p>部件识别将在 B3 开放，这里将展示<br/>可独立配置的模型裁片。</p><span class="step-label">B3 开放部件选择</span></div>
        <div class="panel-foot"><span class="small-dot"></span>当前无选中部件</div>
      </aside>
      <section class="viewer" aria-labelledby="viewer-title">
        <div class="viewer-toolbar"><div><span class="eyebrow">WORKSPACE</span><h2 id="viewer-title">${active.label}工作台</h2></div><span class="viewer-status" role="status"><span></span>等待模型接入</span></div>
        <div class="viewport" id="viewport" tabindex="0" aria-label="三维模型视口">
          <div class="viewport-grid" aria-hidden="true"></div>
          <div class="viewport-placeholder"><div class="placeholder-icon" aria-hidden="true"><svg viewBox="0 0 80 80" fill="none"><path d="M22 31h36l5 37H17l5-37Z"/><path d="M30 32V22a10 10 0 0 1 20 0v10"/><path d="M22 42h36" stroke-dasharray="3 4"/></svg></div><span class="eyebrow">A SPACE FOR YOUR IDEAS</span><h3>让灵感，有形可见。</h3><p>工作台已就绪，等待接入模型。</p><span class="model-note">下一阶段 · GLB 模型查看器</span></div>
          <div class="viewport-corner"><span class="axis-mark" aria-hidden="true">Y ↑<br/>└ X</span><span>模型视口</span></div>
        </div>
        <div class="view-controls" aria-label="模型视角"><span>视角</span><div class="view-buttons">${['默认','正面','背面','左侧','右侧','重置'].map(label => '<button type="button" disabled title="B2 模型接入后可用">'+label+'</button>').join('')}</div><span class="control-note">点击选择 · 拖动旋转 · 滚轮缩放</span></div>
      </section>
      <aside class="panel materials-panel" aria-labelledby="materials-title">
        <div class="panel-heading"><span class="eyebrow">02 / MATERIAL</span><h2 id="materials-title">布料与质感</h2><p>为每一个部件，找到合适的触感。</p></div>
        <section class="selection-card" aria-label="当前选中部件"><span class="eyebrow">当前选中</span><h3 class="selected-label">请选择一个部件</h3><p class="selected-id">点击左侧列表或模型上的裁片</p><p class="selected-fabric">当前材质 · 模型默认</p><button type="button" disabled>取消选择</button><span class="selection-help">先选部件，再挑选喜欢的布料</span></section>
        <section class="fabric-library" aria-labelledby="fabric-title"><div class="fabric-heading"><h3 id="fabric-title">布料库</h3><span>9 种布料</span></div><p class="fabric-source">4 款照片参考 · 5 款测试素材</p><div class="fabric-grid"></div><p class="fabric-status" role="status" aria-live="polite">先选择一个部件，再选择布料。</p></section>
        <div class="material-action"><button type="button" disabled title="先选择一个部件">恢复默认材质</button><span>仅恢复选中部件或明确声明的联动组</span></div>
      </aside>
    </main>
    <footer class="app-footer"><span>ZAODIAN <span class="footer-divider">/</span> 造物，从一点开始。</span><span>网页 POC <span class="footer-divider">·</span> B4 独立换布</span></footer>
  `;
  root.dataset.phase = state.phase;
  return () => { root.replaceChildren(); delete root.dataset.phase; };
}
