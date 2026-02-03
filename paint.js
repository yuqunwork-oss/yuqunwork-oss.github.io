class PaintBox {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.sizeInput = document.getElementById("sizeInput");
    this.drawPenSizeInput = document.getElementById("drawPenSizeInput");
    this.drawPenSize = parseInt(this.drawPenSizeInput.value) || 20;
    this.widthInput = document.getElementById("widthInput");
    this.colorInput = document.getElementById("colorInput");
    this.shapeSelect = document.getElementById("shapeSelect");
    this.shapeSelect.addEventListener("change", () => {
      this.currentShape = this.shapeSelect.value;
      this.firstPoint = null;
    });

    this.repaint = document.getElementById("btn-repaint"); // 清畫布、保留資料
    this.clearDataBtn = document.getElementById("btn-cleardata"); // 清畫布、清資料

    this.saveBtn = document.getElementById("saveBtn");
    this.saveBtn.addEventListener("click", () => this.saveData());

    this.drawPenBtn = document.getElementById("btn-drawPen");
    this.isDrawing = false;
    this.drawPenBtn.addEventListener("click", () => {
      this.currentShape = "drawPen";
      this.selected = null;
      this.firstPoint = null;
    });

    this.rdBtn = document.getElementById("rdBtn");
    this.rdBtn.addEventListener("click", () => this.loadData());
    this.size = parseInt(this.sizeInput.value) || 66;
    this.lineWidth = parseInt(this.widthInput.value) || 3;

    this.currentShape = null;
    this.firstPoint = null;
    this.objArry = [];

    this.selected = null; // 目前選取的物件
    this.handleSize = 8; // 四角小方塊尺寸
    this.hoverCorner = null; //有沒有碰到角落

    this._UIEvents();
    this._CanvasEvents();
    //onDo&&reDo
    this.objHistory = [];
    this.historyIndex = -1;
    this.onDoBtn = document.getElementById("onDo");
    this.reDoBtn = document.getElementById("reDo");
    this.onDoBtn.addEventListener("click", () => this._onDO());
    this.reDoBtn.addEventListener("click", () => this._reDo());
    this._saveHistory();
    //del
    this.delBtn = document.getElementById("btn-del");
    this.isDeleteMode = false;
    this.delBtn.addEventListener("click", () => {
      this.currentShape = "delete";
      this.isDeleteMode = true;
      this.selected = null;
    });
  }

  // 管理按鈕、輸入框
  _UIEvents() {
    this.sizeInput.addEventListener("input", () => {
      this.size = parseInt(this.sizeInput.value) || 40;
    });

    this.widthInput.addEventListener("input", () => {
      this.lineWidth = parseInt(this.widthInput.value) || 3;
    });

    this.repaint.addEventListener("click", () => {
      this.selected = null;
      this.redrawAll();
    });

    this.clearDataBtn.addEventListener("click", () => {
      this.clearCanvasAndData();
    });
    this.flipSelect = document.getElementById("flipCanvas");
    this.flipSelect.addEventListener("change", () => {
      const mode = this.flipSelect.value;
      this.flipCanvas(mode);
    });
  }

  //畫布監聽器=======================
  _CanvasEvents() {
    this.canvas.addEventListener("click", (evt) => this._onCanvasClick(evt));

    //  顯示滑鼠座標
    this.canvas.addEventListener("mousemove", (evt) => this._showCoords(evt));
    this.canvas.addEventListener("mouseleave", () => {
      document.getElementById("coord").textContent = "座標：(x, y)";
    });

    //  滑鼠按下：判斷準備拖曳或縮放
    this.canvas.addEventListener("mousedown", (evt) => {
      this.hasMoved = false;
      const { x, y } = this._getCanvasPos(evt);

      //  檢查是否有選取圖形
      if (this.selected) {
        const hs = this.handleSize;
        //線段
        if (this.selected.type === "rect") {
          const pts = {
            start: this.selected.start,
            end: this.selected.end,
          };
          for (const [key, pt] of Object.entries(pts)) {
            if (Math.abs(x - pt.x) < hs && Math.abs(y - pt.y) < hs) {
              this.activeCorner = key; // "start" 或 "end"
              this.startPos = { x, y };
              this.startObj = structuredClone(this.selected);
              return; // 抓到端點就進縮放模式
            }
          }
        }
        // 其他圖形
        else {
          const box = this._getBBox(this.selected);
          const corners = {
            TL: { x: box.minX, y: box.minY },
            TR: { x: box.maxX, y: box.minY },
            BL: { x: box.minX, y: box.maxY },
            BR: { x: box.maxX, y: box.maxY },
          };
          for (const [key, pt] of Object.entries(corners)) {
            if (Math.abs(x - pt.x) < hs && Math.abs(y - pt.y) < hs) {
              this.activeCorner = key;
              this.startPos = { x, y };
              this.startObj = structuredClone(this.selected);
              return;
            }
          }
        }
      }
      // 沒點到錨點檢查是否點在圖內進入拖曳模式
      if (this.selected && !this.activeCorner) {
        const box = this._getBBox(this.selected);
        if (x > box.minX && x < box.maxX && y > box.minY && y < box.maxY) {
          this.dragging = true;
          this.dragStart = { x, y };
          this.startObj = structuredClone(this.selected);
          return;
        }
      }
      //  檢查是否為繪筆模式
      if (this.currentShape === "drawPen") {
        this.isDrawing = true;
        this._drawPenAt(x, y);
      }
    });

    //  滑鼠移動：【執行】拖曳、縮放
    this.canvas.addEventListener("mousemove", (evt) => {
      const { x, y } = this._getCanvasPos(evt);
      // = 拖曳模式 =
      if (this.dragging && this.startObj) {
        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;

        if (
          this.selected.type === "circle" ||
          this.selected.type === "square"
        ) {
          this.selected.x = this.startObj.x + dx;
          this.selected.y = this.startObj.y + dy;
        } else if (this.selected.type === "rect") {
          this.selected.start.x = this.startObj.start.x + dx;
          this.selected.start.y = this.startObj.start.y + dy;
          this.selected.end.x = this.startObj.end.x + dx;
          this.selected.end.y = this.startObj.end.y + dy;
        }

        this.redrawAll();
        this.canvas.style.cursor = "move";
        return;
      }

      // = 縮放模式 =
      if (this.activeCorner && this.startPos && this.startObj) {
        this.hasMoved = true;
        const { x, y } = this._getCanvasPos(evt);
        //--------------滑鼠抓角（activeCorner）
        //--------------有記錄滑鼠起始點（startPos）
        //--------------知道是哪一個圖形（startObj）
        if (this.startObj.type === "rect") {
          let fixed, moving;
          if (this.activeCorner === "TL" || this.activeCorner === "start") {
            // 如果抓起點終點固定
            fixed = { ...this.startObj.end };
            moving = { x, y };
          } else if (
            this.activeCorner === "BR" ||
            this.activeCorner === "end"
          ) {
            fixed = { ...this.startObj.start };
            moving = { x, y };
          } else {
            // 沒點中端點（以防誤觸）
            return;
          }

          // 更新線段的新座標
          this.selected.start = { x: fixed.x, y: fixed.y };
          this.selected.end = { x: moving.x, y: moving.y };
        } else if (this.startObj.type === "square") {
          //四個角
          const half = this.startObj.size / 2;
          const left = this.startObj.x - half;
          const top = this.startObj.y - half;
          const right = this.startObj.x + half;
          const bottom = this.startObj.y + half;

          let fixed;
          if (this.activeCorner === "TL") fixed = { x: right, y: bottom };
          else if (this.activeCorner === "TR") fixed = { x: left, y: bottom };
          else if (this.activeCorner === "BL") fixed = { x: right, y: top };
          else fixed = { x: left, y: top }; // BR

          // 移動角
          const moving = { x, y };

          // 兩角的中間就是新的中心點，兩角的距離決定方形邊長。
          const center = {
            x: (fixed.x + moving.x) / 2,
            y: (fixed.y + moving.y) / 2,
          };
          const size = Math.max(
            Math.abs(moving.x - fixed.x),
            Math.abs(moving.y - fixed.y)
          );
          //回傳更新資料
          this.selected.x = center.x;
          this.selected.y = center.y;
          this.selected.size = size;
        } else if (this.startObj.type === "circle") {
          const r = this.startObj.size;
          const left = this.startObj.x - r;
          const top = this.startObj.y - r;
          const right = this.startObj.x + r;
          const bottom = this.startObj.y + r;
          //半徑兩角距離一半
          let fixed;
          if (this.activeCorner === "TL") fixed = { x: right, y: bottom };
          else if (this.activeCorner === "TR") fixed = { x: left, y: bottom };
          else if (this.activeCorner === "BL") fixed = { x: right, y: top };
          else fixed = { x: left, y: top }; // BR

          const moving = { x, y };

          const center = {
            x: (fixed.x + moving.x) / 2,
            y: (fixed.y + moving.y) / 2,
          };
          const newRadius =
            Math.max(
              Math.abs(moving.x - fixed.x),
              Math.abs(moving.y - fixed.y)
            ) / 2;

          this.selected.x = center.x;
          this.selected.y = center.y;
          this.selected.size = newRadius;
        }

        this.redrawAll();
        return;
      }

      //繪筆
      if (this.isDrawing && this.currentShape === "drawPen") {
        this._drawPenAt(x, y);
      }

      //滑鼠移動時偵測hover、改變游標
      if (this.selected) {
        const hs = this.handleSize;
        let foundCorner = null;

        // 線段端點偵測
        if (this.selected.type === "rect") {
          const pts = { start: this.selected.start, end: this.selected.end };
          // Object.entries取得這個物件的所有條目（entries）
          for (const [key, pt] of Object.entries(pts)) {
            if (Math.abs(x - pt.x) < hs && Math.abs(y - pt.y) < hs) {
              foundCorner = key; // "start" 或 "end"
              break;
            }
          }
        }
        // 圓形與方形的四角偵測
        else {
          const box = this._getBBox(this.selected);
          const corners = {
            TL: { x: box.minX, y: box.minY },
            TR: { x: box.maxX, y: box.minY },
            BL: { x: box.minX, y: box.maxY },
            BR: { x: box.maxX, y: box.maxY },
          };
          for (const [key, pt] of Object.entries(corners)) {
            if (Math.abs(x - pt.x) < hs && Math.abs(y - pt.y) < hs) {
              foundCorner = key;
              break;
            }
          }
        }

        //  如果 hover 狀態改變，就重繪
        if (foundCorner !== this.hoverCorner) {
          this.hoverCorner = foundCorner;
          this.redrawAll();
        }

        // 改變滑鼠樣式（重點：右上和左下角 → 左斜）
        if (foundCorner) {
          if (foundCorner === "TR" || foundCorner === "BL") {
            this.canvas.style.cursor = "nesw-resize"; // ↙↗ 左斜縮放
          } else {
            this.canvas.style.cursor = "nwse-resize"; // ↘↖ 右斜縮放
          }
        } else if (this.dragging) {
          this.canvas.style.cursor = "move"; // 拖曳中
        } else {
          this.canvas.style.cursor = "default"; // 預設
        }
      }
    });

    //  滑鼠放開：【重製】清理所有狀態
    this.canvas.addEventListener("mouseup", () => {
      this.activeCorner = null;
      this.dragging = false; //拖曳
      this.isDrawing = false; //繪筆
      this.startPos = null; //滑鼠起始點
      this.dragStart = null; //拖曳開始
      this.startObj = null; //選到圖形
      this._saveHistory(); //滑鼠放開時記錄狀態
    });

    this.drawPenSizeInput.addEventListener("input", () => {
      this.drawPenSize = parseInt(this.drawPenSizeInput.value) || 40;
    });
  }

  _showCoords(i) {
    const { x, y } = this._getCanvasPos(i);
    const coordText = document.getElementById("coord"); //找出座標文字
    coordText.textContent = `座標：(${Math.floor(x)}, ${Math.floor(y)})`;
  }
  //主程式!!!
  _onCanvasClick(evt) {
    if (this.hasMoved) return;
    const { x, y } = this._getCanvasPos(evt); //  提前取得 x,y

    if (this.currentShape === "delete" && this.isDeleteMode) {
      const hit = this.getFocus(x, y);
      if (hit) {
        const index = this.objArry.indexOf(hit);
        if (index !== -1) {
          this.objArry.splice(index, 1);
          this.redrawAll();
          this._saveHistory();
        }
      } else {
        alert("沒點到任何圖形。");
      }

      return; // 中止這次點擊事件
    }
    //// 只有不是 floodFill 時，才做命中檢測
    if (this.currentShape !== "floodFill") {
      const hit = this.getFocus(x, y);
      if (hit) {
        this.selected = hit;
        this.redrawAll();
        return;
      }
    }

    if (!this.currentShape) {
      alert("請先選擇圖案");
      return;
    }

    this.ctx.strokeStyle = this.colorInput.value;
    this.ctx.fillStyle = this.colorInput.value;

    if (this.currentShape === "circle") {
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.objArry.push({
        type: "circle",
        x,
        y,
        size: this.size,
        color: this.colorInput.value,
      });
      this._saveHistory();
      this.selected = null;
    } else if (this.currentShape === "square") {
      const left = x - this.size / 2;
      const top = y - this.size / 2;
      this.ctx.fillRect(left, top, this.size, this.size);
      this.objArry.push({
        type: "square",
        x,
        y,
        size: this.size,
        color: this.colorInput.value,
      });
      this._saveHistory();
      this.selected = null;
    } else if (this.currentShape === "rect") {
      if (!this.firstPoint) {
        this.firstPoint = { x, y }; // 第一次點
      } else {
        this.ctx.beginPath();
        this.ctx.moveTo(this.firstPoint.x, this.firstPoint.y);
        this.ctx.lineTo(x, y);
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.stroke();
        this.objArry.push({
          type: "rect",
          start: { ...this.firstPoint },
          end: { x, y },
          lineWidth: this.lineWidth,
          color: this.colorInput.value,
        });
        this._saveHistory();
        this.firstPoint = null; // 第二次點完後重置
        this.selected = null;
      }
    }

    console.log(this.objArry);
  }
  //繪筆
  _drawPenAt(x, y) {
    const penSize = this.drawPenSize;
    this.ctx.save();
    this.ctx.globalCompositeOperation = "source-over"; // 正常繪圖
    this.ctx.beginPath();
    this.ctx.arc(x, y, penSize / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.colorInput.value;
    this.ctx.fill();
    this.ctx.restore();

    this.objArry.push({
      type: "drawPen",
      x,
      y,
      size: penSize,
      color: this.colorInput.value,
    });
  }

  // 計算滑鼠座標
  _getCanvasPos(evt) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (evt.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  //刪畫布留資料
  clearCanvasOnly() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.firstPoint = null;
  }

  //刪畫布和資料
  clearCanvasAndData() {
    this.clearCanvasOnly();
    this.objArry = [];
    this.selected = null;
  }

  //重新繪製
  redrawAll() {
    this.clearCanvasOnly();
    for (let i = 0; i < this.objArry.length; i++) {
      const obj = this.objArry[i];

      if (obj.type === "circle") {
        this.ctx.fillStyle = obj.color;
        this.ctx.beginPath();
        this.ctx.arc(obj.x, obj.y, obj.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (obj.type === "square") {
        this.ctx.fillStyle = obj.color;
        this.ctx.fillRect(
          obj.x - obj.size / 2,
          obj.y - obj.size / 2,
          obj.size,
          obj.size
        );
      } else if (obj.type === "rect") {
        this.ctx.strokeStyle = obj.color;
        this.ctx.lineWidth = obj.lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(obj.start.x, obj.start.y);
        this.ctx.lineTo(obj.end.x, obj.end.y);
        this.ctx.stroke();
      } else if (obj.type === "drawPen") {
        this.ctx.fillStyle = obj.color;
        this.ctx.beginPath();
        this.ctx.arc(obj.x, obj.y, obj.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // 若有選取，畫四角小方塊＋外框
    if (this.selected) {
      this._drawHandles(this.selected);
    }
  }

  //偵測是否座標在圖內
  getFocus(x, y) {
    for (let i = this.objArry.length - 1; i >= 0; i--) {
      const obj = this.objArry[i];

      if (obj.type === "circle") {
        //滑鼠點距離小於半徑
        const dx = x - obj.x,
          dy = y - obj.y;
        if (Math.hypot(dx, dy) <= obj.size) return obj;
      } else if (obj.type === "square") {
        if (
          x >= obj.x - obj.size / 2 &&
          x <= obj.x + obj.size / 2 &&
          y >= obj.y - obj.size / 2 &&
          y <= obj.y + obj.size / 2
        ) {
          return obj;
        }
      } else if (obj.type === "rect") {
        const dist = this._pointToLineDistance(
          x,
          y,
          obj.start.x,
          obj.start.y,
          obj.end.x,
          obj.end.y
        );
        if (dist <= Math.max(6, (obj.lineWidth || 1) / 2 + 3)) return obj;
      }
    }
    return null;
  }

  // 點到線段的最短距離
  _pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1,
      B = py - y1,
      C = x2 - x1,
      D = y2 - y1;
    const len = C * C + D * D;
    let t = len ? (A * C + B * D) / len : 0;
    t = Math.max(0, Math.min(1, t));
    const xx = x1 + t * C,
      yy = y1 + t * D;
    return Math.hypot(px - xx, py - yy);
  }

  // 取得四個角外框
  _getBBox(obj) {
    if (obj.type === "circle") {
      const r = obj.size;
      return {
        minX: obj.x - r,
        minY: obj.y - r,
        maxX: obj.x + r,
        maxY: obj.y + r,
      };
    } else if (obj.type === "square") {
      return {
        minX: obj.x - obj.size / 2,
        minY: obj.y - obj.size / 2,
        maxX: obj.x + obj.size / 2,
        maxY: obj.y + obj.size / 2,
      };
    } else if (obj.type === "rect") {
      const minX = Math.min(obj.start.x, obj.end.x);
      const minY = Math.min(obj.start.y, obj.end.y);
      const maxX = Math.max(obj.start.x, obj.end.x);
      const maxY = Math.max(obj.start.y, obj.end.y);
      return { minX, minY, maxX, maxY };
    }
    return null;
  }

  // 畫四角小方塊（handles）＋ 虛線外框
  _drawHandles(obj) {
    const box = this._getBBox(obj);
    if (!box) return;

    const hs = this.handleSize;
    const half = hs / 2;

    this.ctx.save();

    if (obj.type === "rect") {
      const pts = { start: obj.start, end: obj.end };
      this.ctx.setLineDash([]);

      for (const [key, pt] of Object.entries(pts)) {
        const isHovered = key === this.hoverCorner; //  判斷是否被 hover
        this.ctx.fillStyle = isHovered ? "#00a2ff" : "#fff"; // hover 藍色
        this.ctx.strokeStyle = isHovered ? "#005b8a" : "#000";
        this.ctx.beginPath();
        this.ctx.rect(pt.x - half, pt.y - half, hs, hs);
        this.ctx.fill();
        this.ctx.stroke();
      }
    } else {
      // 其他圖形保持四角框 + 虛線框
      const corners = {
        TL: { x: box.minX, y: box.minY },
        TR: { x: box.maxX, y: box.minY },
        BL: { x: box.minX, y: box.maxY },
        BR: { x: box.maxX, y: box.maxY },
      };

      this.ctx.setLineDash([6, 4]);
      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(
        box.minX,
        box.minY,
        box.maxX - box.minX,
        box.maxY - box.minY
      );

      this.ctx.fillStyle = "#fff";
      this.ctx.strokeStyle = "#000";
      this.ctx.setLineDash([]);

      Object.entries(corners).forEach(([key, pt]) => {
        this.ctx.beginPath();

        // 判斷是否為目前 hover 的角
        const isHovered = key === this.hoverCorner;
        this.ctx.fillStyle = isHovered ? "#00a2ff" : "#fff"; // hover 亮藍色
        this.ctx.strokeStyle = isHovered ? "#005b8a" : "#000";

        this.ctx.rect(pt.x - half, pt.y - half, hs, hs);
        this.ctx.fill();
        this.ctx.stroke();
      });
    }

    this.ctx.restore();
  }
  //存檔案
  saveData() {
    const data = JSON.stringify(this.objArry); // 把目前圖形資料轉文字
    const blob = new Blob([data], { type: "application/json" }); // 建立檔案
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "myDrawing.json"; // 檔名
    a.click();
    URL.revokeObjectURL(url);
  }
  //讀檔案
  loadData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (Array.isArray(data)) {
            this.objArry = data; // 將檔案內容載入
            this.redrawAll(); // 重繪所有圖形
            alert("讀檔成功！");
          } else {
            alert("檔案格式錯誤，請確認是小畫家存的檔。");
          }
        } catch (err) {
          alert("讀檔錯誤：" + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
  flipCanvas(mode) {
    const temp = document.createElement("canvas");
    temp.width = this.canvas.width;
    temp.height = this.canvas.height;
    const tctx = temp.getContext("2d");

    // 把目前畫面暫存下來
    tctx.drawImage(this.canvas, 0, 0);

    // 清空畫布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (mode === "horizontalFlip") {
      // 水平翻轉
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(temp, -this.canvas.width, 0);
      this.ctx.restore();
    } else if (mode === "verticalFlip") {
      // 垂直翻轉
      this.ctx.save();
      this.ctx.scale(1, -1);
      this.ctx.drawImage(temp, 0, -this.canvas.height);
      this.ctx.restore();
    } else {
      this.redrawAll();
    }
  }

  _getCenter(obj) {
    if (obj.type === "circle") {
      return { x: obj.x, y: obj.y };
    } else if (obj.type === "square") {
      return { x: obj.x, y: obj.y };
    } else if (obj.type === "rect") {
      return {
        x: (obj.start.x + obj.end.x) / 2,
        y: (obj.start.y + obj.end.y) / 2,
      };
    }
  }
  //計算極值(右下)到中心距離
  _1ex2c(obj) {
    let len = 0;
    const box = this._getBBox(obj);
    const center = this._getCenter(obj);
    if (obj.type === "circle") {
      let C = { x: obj.x, y: obj.y };

      const BR = { x: box.maxX, y: box.maxY };
      len = Math.sqrt((BR.x - C.x) ** 2 + (BR.y - C.y) ** 2);
    }
    if (obj.type === "square") {
      const C = { x: obj.x, y: obj.y };
      const BR = { x: box.maxX, y: box.maxY };
      len = Math.sqrt((BR.x - C.x) ** 2 + (BR.y - C.y) ** 2);
    }
    if (obj.type === "rect") {
      const C = {
        x: (box.minX + box.maxX) / 2,
        y: (box.minY + box.maxY) / 2,
      };

      const BR = { x: box.maxX, y: box.maxY };
      len = Math.sqrt((BR.x - C.x) ** 2 + (BR.y - C.y) ** 2);
    }
    return len;
  }
  //算縮方比例
  _2ex2cScale(obj, newMousePos) {
    const len1 = this._1ex2c(obj); // 原始長度
    const center = this._getCenter(obj);
    const len2 = Math.sqrt(
      (newMousePos.x - center.x) ** 2 + (newMousePos.y - center.y) ** 2
    );
    return len2 / len1; // 放大比例
  }
  _saveHistory() {
    this.objHistory.push(structuredClone(this.objArry));
    this.historyIndex = this.objHistory.length - 1; //把指標指到最後
  }

  _onDO() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.objArry = structuredClone(this.objHistory[this.historyIndex]);
      this.selected = null;
      this.redrawAll();
    } else {
      alert("沒有上一步了");
    }
  }

  _reDo() {
    if (this.historyIndex < this.objHistory.length - 1) {
      this.historyIndex++;
      this.objArry = structuredClone(this.objHistory[this.historyIndex]);
      this.selected = null;
      this.redrawAll();
    } else {
      alert("沒有下一步了！");
    }
  }
}

// = 啟動 =
const canvas = document.getElementById("canvas");
const myPaintBox = new PaintBox(canvas);
