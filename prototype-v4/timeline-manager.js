/**
 * Multi-Track Timeline Editor Manager for Riki Scene
 * CapCut / Premiere style interactive video editor component.
 */

class TimelineManager {
  constructor() {
    this.pxPerSec = 60; // Pixels per second (zoom factor)
    this.currentTime = 0; // Current playhead time in seconds
    this.totalDuration = 0;
    this.selectedSceneIndex = 0;
    this.isDraggingPlayhead = false;
    this.isResizingScene = false;
    this.resizingSceneIndex = -1;
    this.resizeStartX = 0;
    this.resizeStartDuration = 0;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.section = document.getElementById("timelineEditorSection");
    this.viewport = document.getElementById("tlTracksViewport");
    this.ruler = document.getElementById("tlRuler");
    this.playhead = document.getElementById("tlPlayhead");
    this.videoTrack = document.getElementById("tlVideoTrack");
    this.audioTrack = document.getElementById("tlAudioTrack");
    this.textTrack = document.getElementById("tlTextTrack");
    this.timecodeDisplay = document.getElementById("tlTimecodeDisplay");
    this.zoomSlider = document.getElementById("tlZoomSlider");
    this.splitBtn = document.getElementById("tlSplitBtn");
    this.deleteBtn = document.getElementById("tlDeleteBtn");
    this.duplicateBtn = document.getElementById("tlDuplicateBtn");
    this.addSceneBtn = document.getElementById("tlAddSceneBtn");
    this.playPauseBtn = document.getElementById("tlPlayPauseBtn");
    this.stepBackBtn = document.getElementById("tlStepBackBtn");
    this.stepFwdBtn = document.getElementById("tlStepFwdBtn");
    this.collapseBtn = document.getElementById("tlCollapseBtn");
  }

  bindEvents() {
    if (!this.viewport) return;

    // Zoom slider
    if (this.zoomSlider) {
      this.zoomSlider.addEventListener("input", (e) => {
        this.pxPerSec = parseFloat(e.target.value) || 60;
        this.renderTimeline();
      });
    }

    // Playhead drag
    if (this.playhead) {
      this.playhead.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.isDraggingPlayhead = true;
        document.body.style.cursor = "ew-resize";
      });
    }

    // Viewport click/drag to position playhead
    this.viewport.addEventListener("mousedown", (e) => {
      if (e.target.closest(".scene-block__handle")) return;
      const rect = this.viewport.getBoundingClientRect();
      const clickX = e.clientX - rect.left + this.viewport.scrollLeft;
      const time = Math.max(0, clickX / this.pxPerSec);
      this.seekTo(time);

      if (e.target.closest("#tlRuler") || e.target === this.viewport) {
        this.isDraggingPlayhead = true;
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (this.isDraggingPlayhead) {
        const rect = this.viewport.getBoundingClientRect();
        const clickX = e.clientX - rect.left + this.viewport.scrollLeft;
        const time = Math.max(0, clickX / this.pxPerSec);
        this.seekTo(time);
      } else if (this.isResizingScene && this.resizingSceneIndex >= 0) {
        const deltaX = e.clientX - this.resizeStartX;
        const deltaSec = deltaX / this.pxPerSec;
        const newDur = Math.max(1, Math.round((this.resizeStartDuration + deltaSec) * 10) / 10);
        
        if (typeof window.updateSceneDuration === "function") {
          window.updateSceneDuration(this.resizingSceneIndex, newDur);
        }
      }
    });

    document.addEventListener("mouseup", () => {
      if (this.isDraggingPlayhead) {
        this.isDraggingPlayhead = false;
        document.body.style.cursor = "";
      }
      if (this.isResizingScene) {
        this.isResizingScene = false;
        this.resizingSceneIndex = -1;
        document.body.style.cursor = "";
      }
    });

    // Toolbar Buttons
    if (this.splitBtn) {
      this.splitBtn.addEventListener("click", () => this.splitSceneAtPlayhead());
    }
    if (this.deleteBtn) {
      this.deleteBtn.addEventListener("click", () => this.deleteSelectedScene());
    }
    if (this.duplicateBtn) {
      this.duplicateBtn.addEventListener("click", () => this.duplicateSelectedScene());
    }
    if (this.addSceneBtn) {
      this.addSceneBtn.addEventListener("click", () => this.addNewScene());
    }
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener("click", () => {
        if (typeof window.togglePlayPause === "function") {
          window.togglePlayPause();
        }
      });
    }
    if (this.stepBackBtn) {
      this.stepBackBtn.addEventListener("click", () => this.seekTo(Math.max(0, this.currentTime - 1)));
    }
    if (this.stepFwdBtn) {
      this.stepFwdBtn.addEventListener("click", () => this.seekTo(Math.min(this.totalDuration, this.currentTime + 1)));
    }
    if (this.collapseBtn) {
      this.collapseBtn.addEventListener("click", () => {
        this.section.classList.toggle("collapsed");
      });
    }
  }

  formatTime(sec) {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  seekTo(sec) {
    this.currentTime = Math.min(this.totalDuration || 60, Math.max(0, sec));
    this.updatePlayheadPosition();
    if (typeof window.onTimelineSeek === "function") {
      window.onTimelineSeek(this.currentTime);
    }
  }

  updatePlayheadPosition() {
    if (!this.playhead) return;
    const posX = this.currentTime * this.pxPerSec;
    this.playhead.style.transform = `translateX(${posX}px)`;
    if (this.timecodeDisplay) {
      this.timecodeDisplay.textContent = `${this.formatTime(this.currentTime)} / ${this.formatTime(this.totalDuration)}`;
    }
  }

  renderTimeline(scenesData = []) {
    if (!this.viewport) return;

    if (!scenesData || scenesData.length === 0) {
      if (typeof window.getTimelineScenes === "function") {
        scenesData = window.getTimelineScenes();
      }
    }

    let accumTime = 0;
    const processedScenes = (scenesData || []).map((sc, idx) => {
      const dur = sc.duration || 3;
      const start = accumTime;
      accumTime += dur;
      return { ...sc, index: idx, start, duration: dur, end: accumTime };
    });

    this.totalDuration = accumTime || 10;
    const totalWidthPx = Math.max(this.viewport.clientWidth, (this.totalDuration + 5) * this.pxPerSec);

    // Set viewport width
    this.ruler.style.width = `${totalWidthPx}px`;
    this.videoTrack.style.width = `${totalWidthPx}px`;
    this.audioTrack.style.width = `${totalWidthPx}px`;
    this.textTrack.style.width = `${totalWidthPx}px`;

    // 1. Render Time Ruler Ticks
    this.renderRuler(totalWidthPx);

    // 2. Render Video Track Blocks
    this.renderVideoTrack(processedScenes);

    // 3. Render Audio Track Blocks
    this.renderAudioTrack(processedScenes);

    // 4. Render Text Track Blocks
    this.renderTextTrack(processedScenes);

    this.updatePlayheadPosition();
  }

  renderRuler(totalWidthPx) {
    this.ruler.innerHTML = "";
    const secStep = this.pxPerSec >= 80 ? 1 : (this.pxPerSec >= 40 ? 2 : 5);
    const totalSecs = Math.ceil(totalWidthPx / this.pxPerSec);

    for (let s = 0; s <= totalSecs; s += secStep) {
      const tick = document.createElement("div");
      tick.className = "ruler-tick";
      tick.style.left = `${s * this.pxPerSec}px`;

      const label = document.createElement("span");
      label.className = "ruler-tick__label";
      label.textContent = this.formatTime(s);

      tick.appendChild(label);
      this.ruler.appendChild(tick);
    }
  }

  renderVideoTrack(scenes) {
    this.videoTrack.innerHTML = "";
    scenes.forEach((sc) => {
      const block = document.createElement("div");
      const isSelected = sc.index === this.selectedSceneIndex;
      block.className = `scene-block scene-block--video ${isSelected ? 'selected' : ''}`;
      block.style.left = `${sc.start * this.pxPerSec}px`;
      block.style.width = `${sc.duration * this.pxPerSec}px`;
      block.dataset.sceneIndex = sc.index;

      const leftImgHtml = sc.leftImage ? `<img src="${sc.leftImage}" class="scene-block__thumb" />` : `<div class="scene-block__thumb-placeholder">Trái</div>`;
      const rightImgHtml = sc.rightImage ? `<img src="${sc.rightImage}" class="scene-block__thumb" />` : `<div class="scene-block__thumb-placeholder">Phải</div>`;

      block.innerHTML = `
        <div class="scene-block__header">
          <span class="scene-block__title">Cảnh ${sc.index + 1} (${sc.duration}s)</span>
        </div>
        <div class="scene-block__thumbs">
          ${leftImgHtml}
          ${rightImgHtml}
        </div>
        <div class="scene-block__handle scene-block__handle--right" title="Kéo để chỉnh thời lượng"></div>
      `;

      block.addEventListener("click", (e) => {
        if (e.target.closest(".scene-block__handle")) return;
        this.selectedSceneIndex = sc.index;
        this.renderTimeline(scenes);
        if (typeof window.onSceneSelected === "function") {
          window.onSceneSelected(sc.index);
        }
      });

      const handleRight = block.querySelector(".scene-block__handle--right");
      if (handleRight) {
        handleRight.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          this.isResizingScene = true;
          this.resizingSceneIndex = sc.index;
          this.resizeStartX = e.clientX;
          this.resizeStartDuration = sc.duration;
          document.body.style.cursor = "ew-resize";
        });
      }

      this.videoTrack.appendChild(block);
    });
  }

  renderAudioTrack(scenes) {
    this.audioTrack.innerHTML = "";
    scenes.forEach((sc) => {
      const block = document.createElement("div");
      block.className = "scene-block scene-block--audio";
      block.style.left = `${sc.start * this.pxPerSec}px`;
      block.style.width = `${sc.duration * this.pxPerSec}px`;

      const canvas = document.createElement("canvas");
      canvas.className = "scene-block__waveform";
      canvas.width = Math.max(10, Math.floor(sc.duration * this.pxPerSec));
      canvas.height = 36;
      this.drawWaveformPlaceholder(canvas);

      block.appendChild(canvas);
      this.audioTrack.appendChild(block);
    });
  }

  drawWaveformPlaceholder(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(58, 198, 198, 0.4)";
    const barWidth = 3;
    const gap = 2;
    const numBars = Math.floor(w / (barWidth + gap));

    for (let i = 0; i < numBars; i++) {
      const barHeight = Math.sin(i * 0.3) * (h / 3) + (h / 2.5) + (Math.random() * 4);
      const x = i * (barWidth + gap);
      const y = (h - barHeight) / 2;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  renderTextTrack(scenes) {
    this.textTrack.innerHTML = "";
    scenes.forEach((sc) => {
      const block = document.createElement("div");
      block.className = "scene-block scene-block--text";
      block.style.left = `${sc.start * this.pxPerSec}px`;
      block.style.width = `${sc.duration * this.pxPerSec}px`;

      const textSnippet = (sc.text || "").replace(/\[.*?\]/g, "").trim();

      block.innerHTML = `
        <span class="scene-block__text-label" title="${textSnippet}">${textSnippet || "Văn bản cảnh " + (sc.index + 1)}</span>
      `;
      this.textTrack.appendChild(block);
    });
  }

  splitSceneAtPlayhead() {
    if (typeof window.splitSceneAtTime === "function") {
      window.splitSceneAtTime(this.currentTime);
    }
  }

  deleteSelectedScene() {
    if (typeof window.deleteScene === "function") {
      window.deleteScene(this.selectedSceneIndex);
    }
  }

  duplicateSelectedScene() {
    if (typeof window.duplicateScene === "function") {
      window.duplicateScene(this.selectedSceneIndex);
    }
  }

  addNewScene() {
    if (typeof window.addNewScene === "function") {
      window.addNewScene();
    }
  }
}

// Instantiate globally
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (!window.timelineManager) window.timelineManager = new TimelineManager();
  });
} else {
  window.timelineManager = new TimelineManager();
}
